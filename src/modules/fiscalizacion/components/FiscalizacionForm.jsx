import React, { useState, useEffect, useRef } from 'react';
import './FiscalizacionForm.css'; // Asumiendo que tendrás un archivo CSS para los estilos 'glow flash'
import { dbCollection, addDoc, serverTimestamp, storage, ref, uploadString, uploadBytes, getDownloadURL, db } from '../../../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { evaluarRiesgoConGemini } from '../../../middleware/geminiHook';

export default function FiscalizacionForm() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [step, setStep] = useState(1); // 1: Bienvenida, 2: Formulario, 3: Éxito
    const [formData, setFormData] = useState({
        categoria: '',
        descripcion: '',
        latitud: null,
        longitud: null,
        fotos: [],
        notaVoz: null,
    });

    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const [audioChunks, setAudioChunks] = useState([]);
    const [isRecording, setIsRecording] = useState(false);

    // Widget de tiempo (Día de la semana, Fecha completa, Año y Hora exacta con segundos)
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatDateTime = (date) => {
        const optionsDate = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        const datePart = date.toLocaleDateString('es-CL', optionsDate);
        const timePart = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return `${datePart.charAt(0).toUpperCase() + datePart.slice(1)} | ${timePart}`;
    };

    // Solicitar Permisos Nativos (Cámara, Micrófono, Geolocalización)
    const requestPermissionsAndLocation = async () => {
        try {
            // 1. Geolocalización
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setFormData(prev => ({ ...prev, latitud: position.coords.latitude, longitud: position.coords.longitude }));
                    },
                    (error) => console.error("Error geolocalización:", error),
                    { enableHighAccuracy: true }
                );
            }

            // 2. Cámara (Preparar stream para previsualizar/capturar)
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error("Error solicitando permisos multimedia:", error);
            alert("Para utilizar todas las funciones, por favor otorgue los permisos de cámara, micrófono y ubicación.");
        }
    };

    const handleStartReport = () => {
        requestPermissionsAndLocation();
        setStep(2);
    };

    // Lógica de grabación de audio
    const toggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        } else {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                setAudioChunks(prev => [...prev, event.data]);
            };
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                setFormData(prev => ({ ...prev, notaVoz: audioBlob }));
                setAudioChunks([]);
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        }
    };

    // Capturar Foto desde la cámara
    const takePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setFormData(prev => ({ ...prev, fotos: [...prev.fotos, dataUrl] }));
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const submitReport = async (e) => {
        e.preventDefault();

        if (!formData.latitud || !formData.longitud) {
            alert("No podemos enviar el reporte sin su ubicación GPS activa.");
            return;
        }

        setIsSubmitting(true);

        try {
            const fotosUrls = [];
            let audioUrl = null;

            // 1. Subir Fotografías a Firebase Storage
            if (formData.fotos.length > 0) {
                for (let i = 0; i < formData.fotos.length; i++) {
                    const fotoRef = ref(storage, `evidencia_comercial/fotos/${Date.now()}_${i}.jpg`);
                    await uploadString(fotoRef, formData.fotos[i], 'data_url');
                    const url = await getDownloadURL(fotoRef);
                    fotosUrls.push(url);
                }
            }

            // 2. Subir Nota de Voz a Firebase Storage
            if (formData.notaVoz) {
                const audioRef = ref(storage, `evidencia_comercial/audios/${Date.now()}.webm`);
                await uploadBytes(audioRef, formData.notaVoz);
                audioUrl = await getDownloadURL(audioRef);
            }

            // 3. Crear el Documento en Firestore 
            const nuevoReporte = {
                fechaCreacion: serverTimestamp(),
                estado: "Pendiente",
                ubicacion: {
                    latitud: formData.latitud,
                    longitud: formData.longitud,
                    direccionAproximada: "Recinto Comercial No Especificado"
                },
                categoriaRiesgo: formData.categoria,
                descripcionCiudadano: formData.descripcion,
                evidencia: {
                    fotografias: fotosUrls,
                    notaDeVoz: audioUrl
                },
                evaluacionIA: {
                    procesado: false, // Será procesado por Gemini en el backend/hook posteriormente
                }
            };

            const docRef = await addDoc(dbCollection, nuevoReporte);
            console.log("Reporte Fiscalización Guardado con ID: ", docRef.id);

            // Disparar Evaluación de IA (Asigna Urgencia y Derivación)
            const evaluacionIA = await evaluarRiesgoConGemini(nuevoReporte);

            // Actualizar documento base con el resultado de la IA
            if (evaluacionIA && evaluacionIA.procesado) {
                await updateDoc(doc(db, "reportes_comerciales", docRef.id), {
                    "evaluacionIA": evaluacionIA
                });
                console.log("Evaluación IA Adjuntada Exitosamente:", evaluacionIA);
            }

            // 4. Detener streams activos de la cámara para no consumir batería
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }

            // Disparar mensaje final de éxito solo si no hubo errores bloqueantes
            setStep(3);
        } catch (error) {
            console.error("Error crítico procesando el reporte hacia Firebase:", error);
            alert("Hubo un error seguro al transmitir su reporte. Por favor inténtelo de nuevo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fiscalizacion-container mobile-first glow-flash-theme">
            {/* Header Institucional Fijo */}
            <header className="institucional-header">
                <div className="logos-container">
                    <img src={`${import.meta.env.BASE_URL}logo_municipio.png`} alt="Ilustre Municipalidad de La Serena" className="logo" />
                    <img src={`${import.meta.env.BASE_URL}logo_innovacion.png`} alt="Innovación Smart City" className="logo" />
                </div>
                <div className="time-widget">
                    {formatDateTime(currentTime)}
                </div>
            </header>

            {/* Flujo de la Aplicación */}
            <main className="content-area">
                {step === 1 && (
                    <div className="welcome-step glow-card">
                        <h1 className="glow-text">Red Vecinos Smart</h1>
                        <p className="exact-message">
                            "Bienvenido a la Red Vecinos Smart. La Ilustre Municipalidad de La Serena valora su compromiso proactivo.
                            Esta herramienta está diseñada exclusivamente para fiscalizar y proteger la seguridad en recintos comerciales
                            de alto flujo. Sus ojos son vitales para prevenir riesgos y cuidar a nuestra comunidad.
                            ¿Qué irregularidad desea reportar hoy?"
                        </p>
                        <button className="btn-primary glow-button" onClick={handleStartReport}>
                            Iniciar Reporte de Irregularidad
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <form className="report-form glow-card" onSubmit={submitReport}>
                        <h2 className="glow-text">Nueva Alerta de Seguridad</h2>

                        <div className="form-group">
                            <label>Categoría de Riesgo Comercial</label>
                            <select
                                required
                                value={formData.categoria}
                                onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                            >
                                <option value="">Seleccione una opción...</option>
                                <option value="vias_evacuacion">Vías de evacuación bloqueadas</option>
                                <option value="aforo_excedido">Aforo excedido</option>
                                <option value="falta_seguridad">Falta de personal de seguridad</option>
                                <option value="extintor_vencido">Extintores vencidos o inaccesibles</option>
                                <option value="problemas_electricos">Problemas eléctricos a la vista y cables en mal estado o defectuosos peligrosos</option>
                                <option value="otro">Otro riesgo inminente</option>
                            </select>
                        </div>

                        <div className="form-group multimedia-group">
                            <label>Evidencia In Situ (Cámara Abierta)</label>
                            <div className="camera-viewfinder">
                                <video ref={videoRef} autoPlay playsInline muted></video>
                            </div>
                            <div className="multimedia-controls">
                                <button type="button" className="btn-action capture-btn" onClick={takePhoto}>
                                    📸 Capturar Foto
                                </button>
                                <button type="button" className={`btn-action audio-btn ${isRecording ? 'recording' : ''}`} onClick={toggleRecording}>
                                    {isRecording ? '⏹ Detener Grabación' : '🎤 Grabar Nota de Voz'}
                                </button>
                            </div>
                            <div className="evidence-preview">
                                {formData.fotos.length > 0 && <span className="badge">{formData.fotos.length} fotos adjuntadas</span>}
                                {formData.notaVoz && <span className="badge">1 Audio adjuntado</span>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Detalles descriptivos (Opcional)</label>
                            <textarea
                                rows="3"
                                placeholder="Ej. Pasillo 3 bloqueado por cajas..."
                                value={formData.descripcion}
                                onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                            ></textarea>
                        </div>

                        <button type="submit" className="btn-success glow-button" disabled={isSubmitting}>
                            {isSubmitting ? 'Enviando Alerta Segura...' : 'Enviar Alerta Oficial'}
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <div className="success-step glow-card">
                        <h2 className="glow-text text-success">✔ Completado</h2>
                        <p className="exact-message">
                            "¡Reporte Oficial Recibido Exitosamente! Muchas gracias por su valiosa colaboración.
                            La Ilustre Municipalidad de La Serena ha registrado su alerta y la evidencia adjunta de manera segura.
                            Nuestro Centro de Gestión y la Inteligencia Artificial ya están procesando la información para derivarla a
                            las autoridades correspondientes. Juntos construimos una ciudad más segura."
                        </p>
                        <button className="btn-secondary" onClick={() => setStep(1)}>
                            Volver al inicio
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
