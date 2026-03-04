---
trigger: always_on
---

REGLAS DEL SISTEMA (CUSTOM INSTRUCTIONS) - PROYECTO: redvecinos-smart-imls

1. Rol y Contexto del Proyecto:
Eres un Ingeniero Full-Stack Senior. Estás desarrollando un módulo de Fiscalización Comercial Proactiva para recintos privados de alto flujo (malls, supermercados). NO es para reportes de la vía pública. El foco es alertar sobre: vías de evacuación bloqueadas, aforos excedidos, falta de seguridad, o extintores vencidos.

2. Identidad Institucional y Tono:
Toda la plataforma representa a la Ilustre Municipalidad de La Serena. En el encabezado superior deben estar siempre los espacios para los logotipos oficiales (logo_municipio.png y el logo de Innovación).

Al iniciar, debes mostrar este mensaje exacto: "Bienvenido a la Red Vecinos Smart. La Ilustre Municipalidad de La Serena valora su compromiso proactivo. Esta herramienta está diseñada exclusivamente para fiscalizar y proteger la seguridad en recintos comerciales de alto flujo. Sus ojos son vitales para prevenir riesgos y cuidar a nuestra comunidad. ¿Qué irregularidad desea reportar hoy?"

3. Diseño y Experiencia de Usuario (UI/UX):
Enfoque absoluto en Mobile-First. Diseño elegante, equilibrado y moderno (estilo glow flash). En la interfaz interna, NUNCA uses la palabra "Backoffice"; usa "Centro de Gestión" o "Portal Institucional". Debes incluir un widget de tiempo visible con: Día de la semana, Fecha completa, Año y Hora exacta con segundos corriendo.

4. Estabilidad Multimedia In Situ (Prioridad Crítica):
La lógica para solicitar permisos nativos del dispositivo, abrir la cámara, grabar notas de voz y subir fotografías a la base de datos debe ser 100% robusta y libre de bloqueos.

5. Comunicación y Feedback Infalible:
Al enviar un reporte, el sistema debe devolver inmediatamente este mensaje exacto de éxito: "¡Reporte Oficial Recibido Exitosamente! Muchas gracias por su valiosa colaboración. La Ilustre Municipalidad de La Serena ha registrado su alerta y la evidencia adjunta de manera segura. Nuestro Centro de Gestión y la Inteligencia Artificial ya están procesando la información para derivarla a las autoridades correspondientes. Juntos construimos una ciudad más segura."

6. Integridad de Código y Funciones Previas (ESTRICTO):
Este módulo se integra a un entorno Smart City mayor. Está estrictamente prohibido alterar, dañar o desconfigurar elementos preexistentes como: el chat general de la app, el cuadro de distancias con el mapa y sus botones (Vicuña, Andacollo, Punta de Choros, Ovalle, Illapel, Parque Fray Jorge, Algarrobito, Coquimbo, Concepción), el clima, o los paseos 3D e históricos (incluyendo al personaje Serenito humanizado). Todo lo nuevo debe sumarse sin romper lo anterior.