/**
 * Middleware IA - Estructura Backend (Node.js / Express base)
 * Ruta: /api/fiscalizacion/procesar-reporte
 * 
 * Función: Recibir el reporte, evaluarlo mediante la API de Google Gemini,
 * y clasificar la urgencia en "Alto", "Medio", "Bajo", centrándose en
 * evaluar el riesgo para la vida de los clientes en el recinto.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
// import { db } from '../../firebase/adminApp'; // Tu inicialización de Firebase Admin

// Inicializar SDK de Google Gemini
// NOTA: Configura process.env.GEMINI_API_KEY en tu entorno seguro
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const procesarReporteFiscalizacion = async (req, res) => {
    try {
        const {
            idReporte,
            categoriaRiesgo,
            descripcionCiudadano,
            transcripcionAudio,
            recintoComercial,
            fotosUrls // Si decides enviar las fotos al modelo de visión
        } = req.body;

        if (!idReporte || !categoriaRiesgo) {
            return res.status(400).json({ error: 'Faltan datos críticos del reporte.' });
        }

        // 1. Preparar el Prompt para la IA (Gemini)
        // Se instruye a la IA como experto prevencionista para proteger la vida en recintos comerciales.
        const prompt = `
      Eres un Prevencionista de Riesgos experto en recintos privados de alto flujo (malls, supermercados) para la Ilustre Municipalidad de La Serena.
      Has recibido el siguiente reporte de irregularidad:
      
      - Recinto Comercial: ${recintoComercial || 'No especificado'}
      - Categoría Principal: ${categoriaRiesgo}
      - Descripción del Ciudadano: ${descripcionCiudadano || 'Sin descripción'}
      - Transcripción de Audio In Situ: ${transcripcionAudio || 'Sin audio'}
      
      Tu tarea es evaluar el riesgo inminente para la vida y seguridad de los clientes en este recinto, y clasificar el "Nivel de Urgencia".
      Tus únicas opciones válidas para el Nivel de Urgencia son: "Alto", "Medio", o "Bajo".
      
      Debes devolver exclusivamente un objeto JSON válido con la siguiente estructura:
      {
        "nivelUrgencia": "[Alto/Medio/Bajo]",
        "justificacionRiesgo": "[Breve justificación de máximo 3 líneas]",
        "derivadoA": "[A quién notificar en el Centro de Gestión o Autoridad (ej: Inspectores, Seremi, Prevencionistas)]"
      }
    `;

        // 2. Ejecutar Inferencia usando Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        let iaResponseText = result.response.text();

        // Limpieza de formato markdown (ej. \`\`\`json) en caso de que Gemini lo agregue
        iaResponseText = iaResponseText.replace(/```json/g, '').replace(/```/g, '').trim();

        // Parsear respuesta generada por la IA
        const evaluacionIA = JSON.parse(iaResponseText);

        // 3. Actualizar el documento en Firestore
        // await db.collection('reportes_comerciales').doc(idReporte).update({
        //   evaluacionIA: {
        //     procesado: true,
        //     nivelUrgencia: evaluacionIA.nivelUrgencia,
        //     justificacionRiesgo: evaluacionIA.justificacionRiesgo,
        //     derivadoA: evaluacionIA.derivadoA,
        //     fechaEvaluacion: new Date().toISOString()
        //   }
        // });

        // 4. Retornar éxito
        return res.status(200).json({
            success: true,
            mensaje: 'El reporte ha sido procesado por el Motor de Inteligencia del Centro de Gestión.',
            evaluacion: evaluacionIA
        });

    } catch (error) {
        console.error('Error procesando reporte mediante IA:', error);
        return res.status(500).json({
            error: 'Error interno en el MiddleWare de Inteligencia Artificial.'
        });
    }
};
