import { getVertexAI, getGenerativeModel } from "firebase/vertexai";
import { app } from "./firebaseConfig"; // Ensure you export 'app' from firebaseConfig.js

// Initialize Vertex AI (Serverless Gemini on Firebase)
// Documentación: https://firebase.google.com/docs/vertex-ai
const vertexAI = getVertexAI(app);
const model = getGenerativeModel(vertexAI, { model: "gemini-1.5-flash" });

/**
 * Función que toma los datos crudos del reporte del ciudadano y usa Gemini 
 * para evaluar el nivel de riesgo en recintos comerciales de alta afluencia.
 * @param {Object} reporteData - Datos del formulario (categoría, descripción, fotos, etc)
 * @returns {Promise<Object>} - Resultado de la IA con nivel de urgencia y justificación
 */
export const evaluarRiesgoConGemini = async (reporteData) => {
    try {
        const promptContext = `
            Eres un experto analista de riesgos para la Ilustre Municipalidad de La Serena.
            Tu deber es evaluar alertas ciudadanas sobre irregularidades en recintos comerciales privados
            con alto flujo de personas (malls, supermercados, etc.).
            
            Analiza el siguiente reporte y clasifica su urgencia.
            
            Datos del Reporte:
            - Categoría reportada: ${reporteData.categoriaRiesgo}
            - Descripción del ciudadano: ${reporteData.descripcionCiudadano || 'No especificada'}
            - Cantidad de fotos adjuntas: ${reporteData.evidencia.fotografias.length}
            - Tiene nota de voz adjunta: ${reporteData.evidencia.notaDeVoz ? 'Sí' : 'No'}
            
            Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura exacta:
            {
                "nivelUrgencia": "[Alto/Medio/Bajo]",
                "justificacionRiesgo": "[Justificación breve de por qué se asignó esa urgencia, basada en riesgo vital o pánico]",
                "derivadoA": "[Carabineros / Bomberos / Inspección Municipal / Administración del Recinto]"
            }
        `;

        const result = await model.generateContent(promptContext);
        const responseText = result.response.text();

        // Limpiar el texto si Gemini responde con bloques de markdown json
        const cleanJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonResult = JSON.parse(cleanJsonString);

        return {
            procesado: true,
            fechaProcesamiento: new Date(),
            ...jsonResult
        };

    } catch (error) {
        console.error("Error crítico en la evaluación con Gemini AI:", error);
        return {
            procesado: false,
            error: "No se pudo procesar la IA en este momento."
        };
    }
};
