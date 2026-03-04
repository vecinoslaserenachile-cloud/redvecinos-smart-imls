import React, { useState, useEffect } from 'react';
import './CentroGestion.css';
import { Link } from 'react-router-dom';
import { dbCollection } from '../../../firebaseConfig';
import { onSnapshot, query, orderBy } from 'firebase/firestore';

export default function CentroGestion() {
    const [reportes, setReportes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Escuchar la base de datos en tiempo real, ordenando por fecha más reciente
        const q = query(dbCollection, orderBy("fechaCreacion", "desc"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const liveData = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                liveData.push({
                    id: doc.id,
                    fecha: data.fechaCreacion ? data.fechaCreacion.toDate().toLocaleString('es-CL') : 'Pendiente...',
                    categoria: data.categoriaRiesgo,
                    descripcion: data.descripcionCiudadano,
                    urgencia: data.evaluacionIA && data.evaluacionIA.procesado ? data.evaluacionIA.nivelUrgencia : 'Evaluando',
                    estado: data.estado,
                    fotos: data.evidencia && data.evidencia.fotografias ? data.evidencia.fotografias.length : 0,
                    audio: !!(data.evidencia && data.evidencia.notaDeVoz),
                    rawIA: data.evaluacionIA
                });
            });
            setReportes(liveData);
            setLoading(false);
        }, (error) => {
            console.error("Error cargando panel de control:", error);
            setLoading(false);
        });

        // Desconectar el listener cuando se cierre el componente
        return () => unsubscribe();
    }, []);

    // Calcular métricas
    const reportesEvaluados = reportes.filter(r => r.urgencia !== 'Evaluando').length;

    return (
        <div className="centro-gestion-container glow-flash-theme">
            <header className="institucional-header">
                <div className="logos-container">
                    <img src={`${import.meta.env.BASE_URL}logo_municipio.png`} alt="Ilustre Municipalidad de La Serena" className="logo" />
                    <img src={`${import.meta.env.BASE_URL}logo_innovacion.png`} alt="Innovación Smart City" className="logo" />
                </div>
                <div className="header-title">
                    <h1 className="glow-text">Centro de Gestión</h1>
                    <p className="exact-message">Panel de Administración - Fiscalización de Comercios y RRHH</p>
                </div>
                <Link to="/" className="btn-secondary back-btn">Volver al Inicio</Link>
            </header>

            <main className="dashboard-content">
                <div className="stats-container">
                    <div className="stat-card">
                        <h3 className="glow-text">Alertas Activas</h3>
                        <span className="stat-number glow-danger">{reportes.length}</span>
                    </div>
                    <div className="stat-card">
                        <h3 className="glow-text">Evaluadas por IA</h3>
                        <span className="stat-number glow-success">{reportes.length}</span>
                    </div>
                </div>

                <div className="reports-table-container glow-card">
                    <h2 className="glow-text">Alertas Recientes</h2>
                    <div className="table-responsive">
                        <table className="reports-table">
                            <thead>
                                <tr>
                                    <th>ID Alerta</th>
                                    <th>Fecha y Hora</th>
                                    <th>Categoría de Riesgo</th>
                                    <th>Nivel IA</th>
                                    <th>Evidencia Adjunta</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr><td colSpan="6" style={{ textAlign: "center" }}>Sincronizando Plataforma Central...</td></tr>
                                )}
                                {!loading && reportes.length === 0 && (
                                    <tr><td colSpan="6" style={{ textAlign: "center" }}>No hay alertas registradas por los ciudadanos.</td></tr>
                                )}
                                {reportes.map(rep => (
                                    <tr key={rep.id}>
                                        <td>{rep.id.substring(0, 8)}...</td>
                                        <td>{rep.fecha}</td>
                                        <td className="categoria-cell">{rep.categoria}</td>
                                        <td>
                                            <span className={`badge urgencia-${rep.urgencia.toLowerCase()}`}>{rep.urgencia}</span>
                                        </td>
                                        <td className="evidencia-cell">
                                            {rep.fotos > 0 && <span>📸 {rep.fotos}</span>}
                                            {rep.audio && <span> / 🎤 Voz</span>}
                                        </td>
                                        <td>
                                            <button className="btn-action view-btn">Ver Detalles</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
