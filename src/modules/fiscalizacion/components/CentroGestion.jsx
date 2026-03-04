import React, { useState } from 'react';
import './CentroGestion.css';
import { Link } from 'react-router-dom';

export default function CentroGestion() {
    const [reportes] = useState([
        {
            id: "REP-001",
            fecha: new Date().toLocaleString(),
            categoria: "Vías de evacuación bloqueadas",
            descripcion: "Pasillo 3 bloqueado por cajas de mercadería",
            urgencia: "Alto",
            estado: "Pendiente",
            fotos: 1,
            audio: true
        },
        {
            id: "REP-002",
            fecha: new Date().toLocaleString(),
            categoria: "Problemas eléctricos a la vista",
            descripcion: "Cables expuestos cerca del área de congelados",
            urgencia: "Medio",
            estado: "En Revisión",
            fotos: 2,
            audio: false
        }
    ]);

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
                                {reportes.map(rep => (
                                    <tr key={rep.id}>
                                        <td>{rep.id}</td>
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
