// Shared logic for Aurora prototype (browser + node)
export const MODEL_ID = "onnx-community/Qwen2.5-1.5B-Instruct";
export const SYSTEM = `Eres Aurora, asistente educativa en español para familias hispanas en Estados Unidos. Temas: seguro de vida con beneficios en vida (proteger y pagar la hipoteca, dejar todo pagado, cobrar en vida si hay una enfermedad grave), seguro de gastos finales, y una herramienta de uso libre para redactar la última voluntad.
Datos correctos que debes usar:
- Seguro de vida: si la persona fallece, la aseguradora paga un beneficio (dinero) a sus beneficiarios, que pueden usarlo para pagar la hipoteca, deudas y gastos, y así dejar la casa y todo pagado.
- Beneficios en vida (living benefits): algunas pólizas permiten adelantar parte del beneficio EN VIDA si te diagnostican una enfermedad grave, crónica o terminal (por ejemplo cáncer, infarto o derrame), para pagar la hipoteca, tratamientos o gastos del hogar mientras sigues vivo. Las condiciones dependen de cada póliza.
- Seguro de gastos finales: póliza de vida entera de monto pequeño que ayuda a la familia a pagar el funeral, la cremación o el entierro, deudas médicas y otros gastos al fallecer. Suele tener solicitud sencilla.
- El seguro tiene un costo (prima mensual); solo la herramienta de última voluntad es de uso libre.
- Tú eres Aurora, una asistente virtual educativa, no un agente licenciado.
Reglas estrictas:
- Responde en español, breve (máximo 5 oraciones), claro y amable.
- Solo información educativa general. Nunca des precios, cotizaciones ni montos de primas. Nunca recomiendes una póliza o compañía específica. Para eso ofrece conectar con un agente licenciado.
- Nunca menciones compañías de seguros por nombre.
- Nunca prometas aprobación garantizada; la aprobación depende de la evaluación de la aseguradora.
- Di siempre "última voluntad", nunca la otra palabra.
- No pidas detalles de salud.
- No inventes números de licencia, direcciones ni datos del agente.`;

const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export const CONSENT_Q = "¿Quieres que un agente licenciado te llame para ayudarte con eso? Si me das tu permiso, te pediré tu nombre, teléfono y el mejor horario para llamarte. (Responde «sí» o «no».)";
export const PRIVACY = "Nota de privacidad: solo usamos tus datos para devolverte la llamada; no los vendemos. Por favor no compartas aquí información médica.";

// Pre-routing: deterministic answers for rule-sensitive intents
export function route(text, state) {
  const t = norm(text);
  if (state.step === "consent") {
    if (/^\s*(si|sí|claro|ok|dale|de acuerdo|bueno)\b/.test(t)) { state.step = "name"; return "¡Gracias! " + PRIVACY + "\n\n¿Cuál es tu nombre?"; }
    state.step = null; return "Está bien, sin problema. Puedes seguir preguntándome lo que quieras.";
  }
  if (state.step === "name") { state.lead.name = text.trim(); state.step = "phone"; return `Gracias, ${state.lead.name}. ¿A qué número de teléfono te podemos llamar?`; }
  if (state.step === "phone") {
    if ((text.match(/\d/g) || []).length < 10) return "Ese número parece incompleto. ¿Me lo escribes con código de área (10 dígitos)?";
    state.lead.phone = text.trim(); state.step = "time"; return "¿Cuál es el mejor día y horario para llamarte?";
  }
  if (state.step === "time") { state.lead.time = text.trim(); state.step = null; state.done = true;
    return `Listo. Un agente licenciado te llamará en el horario que indicaste (${state.lead.time}). (Prototipo: estos datos no se envían a ningún lado.)`; }

  if (/testament/.test(t)) return "Aquí lo llamamos «última voluntad». Es el documento donde indicas cómo quieres que se repartan tus bienes y quién cuidará de tus asuntos. Tenemos una herramienta de uso libre para redactar e imprimir tu última voluntad paso a paso. En Florida, por ejemplo, la ley pide firmarla ante dos testigos. Para dudas legales específicas, consulta con un abogado.";
  if (/(precio|cuanto (cuesta|cobra|sale|vale|pagaria|pago)|cotiza|prima|mensualidad|costo del seguro|cuanto es)/.test(t)) { state.step = "consent";
    return "No puedo dar precios ni cotizaciones: el costo depende de tu edad, tu salud y el tipo de cobertura, y lo calcula un agente licenciado. " + CONSENT_Q; }
  if (/(cual (poliza|compania|aseguradora|seguro) (me )?(recomiendas|es mejor|conviene)|que (poliza|compania|aseguradora) (me )?(recomiendas|conviene)|recomiendame|mejor compania|mejor aseguradora)/.test(t)) { state.step = "consent";
    return "No recomiendo pólizas ni compañías específicas, porque la mejor opción depende de tu situación personal. Un agente licenciado puede revisarla contigo. " + CONSENT_Q; }
  if (/(garantiza|me aprueban|me aprobaran|seguro que me aprueb|aprobacion segura)/.test(t))
    return "No puedo prometer aprobación: cada aseguradora evalúa la solicitud. Hay opciones pensadas para distintas situaciones de salud, y un agente licenciado puede explicarte cuáles podrían aplicar. ¿Quieres que te contacte uno?";
  if (/(gratis|gratuito|sin costo|free)/.test(t)) return "El seguro de vida y el de gastos finales tienen un costo mensual (prima), que calcula un agente licenciado según tu caso. Lo que sí es de uso libre es nuestra herramienta para redactar tu última voluntad. ¿Quieres que un agente te explique tus opciones?";
  if (/(quien eres|que eres|eres (un|una) )/.test(t)) return "Soy Aurora, una asistente virtual educativa. Te explico de forma sencilla el seguro de vida con beneficios en vida, el seguro de gastos finales y la última voluntad. No soy agente licenciada: para precios o recomendaciones te conecto con uno.";
  if (/(beneficios? en vida|living benefit|cobrar en vida|usar el seguro en vida|en vida si me enfermo|enfermedad grave|cancer|infarto|derrame)/.test(t)) return "Los beneficios en vida permiten adelantar parte del dinero de tu seguro de vida MIENTRAS SIGUES VIVO, si te diagnostican una enfermedad grave, crónica o terminal (por ejemplo cáncer, infarto o derrame). Ese dinero puedes usarlo para pagar la hipoteca, tratamientos o los gastos de la casa. Las condiciones y montos dependen de cada póliza. Si quieres saber qué opciones aplican a tu caso, un agente licenciado te lo explica. ¿Quieres que te contacte uno?";
  if (/hipoteca|casa pagada|dejar (todo|la casa) pagad/.test(t)) return "Si falleces, el seguro de vida paga un beneficio a tus beneficiarios, y ellos pueden usarlo para liquidar la hipoteca y otras deudas: tu familia se queda con la casa y sin cargas. Con beneficios en vida, además, algunas pólizas te permiten usar parte del dinero en vida si te enfermas gravemente, para seguir pagando la casa. ¿Quieres que un agente licenciado te explique las opciones?";
  if (/gastos finales/.test(t) && /(que (es|cubre)|para que sirve|como funciona)/.test(t)) return "El seguro de gastos finales es una póliza de vida entera de monto pequeño que ayuda a tu familia a pagar el funeral, la cremación o el entierro, deudas médicas y otros gastos cuando falleces, para que no tengan que endeudarse. Suele tener una solicitud sencilla. ¿Quieres saber algo más?";
  if (/(agente|llamen|llamar|contactar|hablar con alguien)/.test(t)) { state.step = "consent"; return CONSENT_Q; }
  return null;
}

// Post-filter on model output
export function sanitize(s) {
  let o = s;
  o = o.replace(/testamentos?/gi, "última voluntad");
  o = o.replace(/\$\s?\d[\d.,]*/g, "[el agente te dará el monto]");
  o = o.replace(/(seguros?|p[oó]lizas?|cobertura)([^.]{0,30})\bgratis\b/gi, "$1$2");
  o = o.replace(/\b(es )?gratuit[oa]s?\b/gi, "tiene costo");
  o = o.replace(/\bgratis\b/gi, "sin costo de uso");
  o = o.replace(/aprobaci[oó]n garantizada|garantizad[oa]s?/gi, "sujeto a evaluación");
  o = o.replace(/\b(Inteligencia Artificial|IA)\b/g, "asistente");
  o = o.replace(/\b(Mutual of Omaha|Aetna|Transamerica|Lincoln|Prudential|MetLife|AIG|Gerber|Colonial Penn|Globe Life|Foresters|Americo|Royal Neighbors|Corebridge|Banner|Protective|John Hancock|New York Life|Northwestern|State Farm|Allstate)\b[^.]*\.?/gi, "");
  return o.trim();
}
