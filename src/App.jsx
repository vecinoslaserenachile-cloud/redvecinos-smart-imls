import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import FiscalizacionForm from './modules/fiscalizacion/components/FiscalizacionForm.jsx';

function Home() {
    return (
        <div className="home-screen">
            <h1>Portal Smart Comuna - La Serena</h1>
            <p>Bienvenido al sistema integrado municipal.</p>

            <div className="nav-grid">
                <Link to="/fiscalizacion" className="nav-card">
                    <h3>Fiscalización Comercial Proactiva</h3>
                    <p>Reporte de Irregularidades en recintos privados</p>
                </Link>
                {/* Aquí irían otros módulos del ecosistema Smart City */}
                <div className="nav-card disabled">
                    <h3>Smart Citizens</h3>
                    <p>Portal Georreferenciado y Radio Digital</p>
                </div>
                <div className="nav-card disabled">
                    <h3>Smart Administration</h3>
                    <p>Gestión Interna e E-learning</p>
                </div>
            </div>
        </div>
    );
}

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/fiscalizacion" element={<FiscalizacionForm />} />
            </Routes>
        </Router>
    );
}

export default App;
