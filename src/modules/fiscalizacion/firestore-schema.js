/**
 * Estructura de Base de Datos - Firebase Firestore
 * Módulo: Fiscalización Comercial Proactiva
 * 
 * Colección Principal: 'reportes_comerciales'
 * Subcolecciones (opcional, para historial): 'evaluaciones_ia'
 */

const schemaFiscalizacionComercial = {
  // Colección: 'reportes_comerciales'
  // ID del Documento: Auto-generado por Firestore
  reportes_comerciales: {
    // 1. Metadatos del Reporte
    idReporte: "string (auto_id)",
    fechaCreacion: "timestamp",     // Fecha y hora exacta de creación
    estado: "string",               // "Pendiente", "En Revisión", "Resuelto"
    
    // 2. Información del Usuario (Ciudadano)
    usuario: {
      idUsuario: "string (uid de Auth)", // Referencia al usuario logueado o anónimo
      nombre: "string",                  // Opcional
      telefono: "string"                 // Opcional, para contacto de emergencia
    },

    // 3. Georreferenciación (Obligatorio)
    ubicacion: {
      latitud: "number",
      longitud: "number",
      direccionAproximada: "string",
      recintoComercial: "string"        // Ej: "Mall Plaza La Serena", "Supermercado Lider"
    },

    // 4. Detalles de la Irregularidad (Enfocado en comercios)
    // Categorías de riesgo enfocadas exclusivamente en comercios de alto flujo
    categoriaRiesgo: "string",          // Ej: "Vías de evacuación bloqueadas", "Aforo excedido", "Falta de seguridad", "Extintor vencido"
    descripcionCiudadano: "string",     // Texto escrito por el usuario
    
    // 5. Evidencia Multimedia
    evidencia: {
      fotografias: ["string (URLs de Firebase Storage)"],
      notaDeVoz: "string (URL de Firebase Storage)",
      transcripcionAudio: "string"      // Texto generado por IA a partir del audio
    },

    // 6. Evaluación de Inteligencia Artificial (Middleware Gemini)
    evaluacionIA: {
      procesado: "boolean",             // true/false
      nivelUrgencia: "string",          // "Alto", "Medio", "Bajo" (Decidido por Gemini)
      justificacionRiesgo: "string",    // Argumentación de la IA para la urgencia
      derivadoA: "string"               // Ej: "Prevencionistas Centro de Gestión", "Autoridad Sanitaria"
    }
  }
};

export default schemaFiscalizacionComercial;
