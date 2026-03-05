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
        direccion: '',
        empresa: '',
        sucursal: '', // Opcional
        fechaIncidente: new Date().toISOString().split('T')[0], // Hoy por defecto
        horaIncidente: new Date().toTimeString().slice(0, 5), // Hora actual por defecto
        fotos: [],
        notaVoz: null,
    });

    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const [audioChunks, setAudioChunks] = useState([]);
    const [isRecording, setIsRecording] = useState(false);

    // Limpieza al desmontar el componente (Para soltar la cámara si el usuario cierra la app)
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => {
            clearInterval(timer);
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
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
            alert("Estimado ciudadano: La Ilustre Municipalidad de La Serena requiere obligatoriamente su autorización para acceder a la cámara, micrófono y ubicación. Esto garantiza la seguridad institucional y la validación de la evidencia in situ al generar un reporte.");
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

            // Función auxiliar para forzar timeout en promesas que se quedan colgadas (como el error de CORS silently blocked)
            const withTimeout = (promise, ms = 15000) => {
                let timer;
                const timeoutPromise = new Promise((_, reject) => {
                    timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
                });
                return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
            };

            // 1. Subir Fotografías a Firebase Storage
            if (formData.fotos.length > 0) {
                for (let i = 0; i < formData.fotos.length; i++) {
                    const fotoRef = ref(storage, `evidencia_comercial/fotos/${Date.now()}_${i}.jpg`);
                    await withTimeout(uploadString(fotoRef, formData.fotos[i], 'data_url'));
                    const url = await getDownloadURL(fotoRef);
                    fotosUrls.push(url);
                }
            }

            // 2. Subir Nota de Voz a Firebase Storage
            if (formData.notaVoz) {
                const audioRef = ref(storage, `evidencia_comercial/audios/${Date.now()}.webm`);
                await withTimeout(uploadBytes(audioRef, formData.notaVoz));
                audioUrl = await getDownloadURL(audioRef);
            }

            // 3. Crear el Documento en Firestore 
            const nuevoReporte = {
                fechaCreacion: serverTimestamp(),
                estado: "Pendiente",
                ubicacion: {
                    latitud: formData.latitud,
                    longitud: formData.longitud,
                    direccionFormato: formData.direccion,
                    empresaAfectada: formData.empresa,
                    sucursalOLocal: formData.sucursal || "No especificada"
                },
                detallesIncidente: {
                    fecha: formData.fechaIncidente,
                    hora: formData.horaIncidente
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

            // Disparar mensaje final de éxito
            setStep(3);
        } catch (error) {
            console.error("Error crítico procesando el reporte hacia Firebase:", error);

            // Firebase tira un error cuando maxUploadRetryTime se agota, o cuando hay bloqueo directo de CORS.
            const isCorsOrTimeout =
                error.message === 'TIMEOUT' ||
                (error.code && error.code.includes('storage/retry-limit-exceeded')) ||
                (error.message && error.message.includes('retry time')) ||
                (error.code && error.code.includes('storage/unauthorized'));

            if (isCorsOrTimeout) {
                alert("Tiempo de espera agotado. Firebase Storage está bloqueando la subida por seguridad (Falta configurar regla CORS en la consola). El reporte no fue enviado.");
            } else {
                alert(`Hubo un error seguro al transmitir su reporte: ${error.message || 'Inténtelo de nuevo.'}`);
            }
        } finally {
            setIsSubmitting(false);
            // APAGAR CÁMARA SIEMPRE: Ya sea éxito o fallo (CORS), liberamos el hardware de Windows/Android 
            // para que no arroje "Device in use" en el próximo intento.
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        }
    };

    return (
        <div className="fiscalizacion-container mobile-first glow-flash-theme">
            {/* Header Institucional Fijo */}
            <header className="institucional-header">
                <div className="logos-container">
                    <img src="/logo_municipio.png" alt="Ilustre Municipalidad de La Serena" className="logo" />
                    <img src="/logo_innovacion.png" alt="Innovación Smart City" className="logo" />
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

                        <div className="form-group">
                            <label>Lugar exacto / Dirección</label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: Av. Balmaceda 3242"
                                value={formData.direccion}
                                onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                                className="form-control"
                            />
                        </div>

                        <div className="form-group">
                            <label>Empresa / Cadena / Entidad</label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: Supermercado Líder, Mall Plaza..."
                                value={formData.empresa}
                                onChange={e => setFormData({ ...formData, empresa: e.target.value })}
                                className="form-control"
                            />
                        </div>

                        <div className="form-group">
                            <label>Sucursal o Local (Opcional)</label>
                            <input
                                type="text"
                                placeholder="Ej: Local 204, Patio de Comidas"
                                value={formData.sucursal}
                                onChange={e => setFormData({ ...formData, sucursal: e.target.value })}
                                className="form-control"
                            />
                        </div>

                        <div className="form-group row-group">
                            <div className="half-group">
                                <label>Fecha del Incidente</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.fechaIncidente}
                                    onChange={e => setFormData({ ...formData, fechaIncidente: e.target.value })}
                                    className="form-control"
                                />
                            </div>
                            <div className="half-group">
                                <label>Hora Aproximada</label>
                                <input
                                    type="time"
                                    required
                                    value={formData.horaIncidente}
                                    onChange={e => setFormData({ ...formData, horaIncidente: e.target.value })}
                                    className="form-control"
                                />
                            </div>
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
