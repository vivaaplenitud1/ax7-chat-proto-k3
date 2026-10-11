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
- Si la pregunta no trata de seguros de vida, gastos finales, beneficios en vida, hipoteca o última voluntad, responde solo: "Solo puedo ayudarte con preguntas sobre seguro de vida, gastos finales y última voluntad. ¿Quieres preguntarme algo de eso o hablar con un agente?"
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

  if (/testament/.test(t)) return "Aquí lo llamamos «última voluntad». Es el documento donde indicas cómo quieres que se repartan tus bienes y quién cuidará de tus asuntos. Tenemos una herramienta de uso libre para redactar e imprimir tu última voluntad paso a paso. Los requisitos de firma y de testigos varían según el estado. Para dudas legales específicas, consulta con un abogado.";
  if (/(precio|cuanto (cuesta|cobra|sale|vale|pagaria|pago)|cotiza|prima|mensualidad|costo del seguro|cuanto es)/.test(t)) { state.step = "consent";
    return "No puedo dar precios ni cotizaciones: el costo depende de tu edad, tu salud y el tipo de cobertura, y lo calcula un agente licenciado. " + CONSENT_Q; }
  if (/(cual (poliza|compania|aseguradora|seguro) (me )?(recomiendas|es mejor|conviene)|que (poliza|compania|aseguradora) (me )?(recomiendas|conviene)|recomiendame|mejor compania|mejor aseguradora)/.test(t)) { state.step = "consent";
    return "No recomiendo pólizas ni compañías específicas, porque la mejor opción depende de tu situación personal. Un agente licenciado puede revisarla contigo. " + CONSENT_Q; }
  if (/(garantiza|me aprueban|me aprobaran|seguro que me aprueb|aprobacion segura)/.test(t))
    return "No puedo prometer aprobación: cada aseguradora evalúa la solicitud. Hay opciones pensadas para distintas situaciones de salud, y un agente licenciado puede explicarte cuáles podrían aplicar. ¿Quieres que te contacte uno?";
  if (/(gratis|gratuito|sin costo|free)/.test(t)) return "El seguro de vida y el de gastos finales tienen un costo mensual (prima), que calcula un agente licenciado según tu caso. Lo que sí es de uso libre es nuestra herramienta para redactar tu última voluntad. ¿Quieres que un agente te explique tus opciones?";
  if (/(quien eres|que eres|eres (un|una) )/.test(t)) return "Soy Aurora, una asistente virtual educativa. Te explico de forma sencilla el seguro de vida con beneficios en vida, el seguro de gastos finales y la última voluntad. No soy agente licenciada: para precios o recomendaciones te conecto con uno.";
  if (/(agente|llamen|llamar|contactar|hablar con alguien)/.test(t) && !/(cambiar de agente)/.test(t)) { state.step = "consent"; return CONSENT_Q; }
  return null;
}

// Topical fallbacks (after FAQ matching)
export function routeTopic(text, state) {
  const t = norm(text);
  if (/(beneficios? en vida|living benefit|cobrar en vida|usar el seguro en vida|en vida si me enfermo|enfermedad grave|cancer|infarto|derrame)/.test(t)) return "Los beneficios en vida permiten adelantar parte del dinero de tu seguro de vida MIENTRAS SIGUES VIVO, si te diagnostican una enfermedad grave, crónica o terminal (por ejemplo cáncer, infarto o derrame). Ese dinero puedes usarlo para pagar la hipoteca, tratamientos o los gastos de la casa. Las condiciones y montos dependen de cada póliza. Si quieres saber qué opciones aplican a tu caso, un agente licenciado te lo explica. ¿Quieres que te contacte uno?";
  if (/hipoteca|casa pagada|dejar (todo|la casa) pagad/.test(t)) return "Si falleces, el seguro de vida paga un beneficio a tus beneficiarios, y ellos pueden usarlo para liquidar la hipoteca y otras deudas: tu familia se queda con la casa y sin cargas. Con beneficios en vida, además, algunas pólizas te permiten usar parte del dinero en vida si te enfermas gravemente, para seguir pagando la casa. ¿Quieres que un agente licenciado te explique las opciones?";
  if (/gastos finales/.test(t) && /(que (es|cubre)|para que sirve|como funciona)/.test(t)) return "El seguro de gastos finales es una póliza de vida entera de monto pequeño que ayuda a tu familia a pagar el funeral, la cremación o el entierro, deudas médicas y otros gastos cuando falleces, para que no tengan que endeudarse. Suele tener una solicitud sencilla. ¿Quieres saber algo más?";
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

// Preset questions: fixed answers, no model
export const FAQ = [
 {id:"bv",k:["beneficios? en vida","living benefit","cobrar en vida","adelant"],q:"¿Qué son los beneficios en vida?", a:"Son una función de algunas pólizas de seguro de vida que te permite adelantar parte del dinero del seguro MIENTRAS SIGUES VIVO, si te diagnostican una enfermedad que califique: grave, crónica o terminal (por ejemplo, ciertos casos de cáncer, infarto o derrame).\n\nEse dinero lo puedes usar para lo que necesites: la hipoteca, tratamientos o los gastos de la casa. Lo que se adelanta se descuenta del beneficio que recibirán tus beneficiarios. Qué enfermedades califican y cuánto se puede adelantar depende de cada póliza."},
 {id:"hip",k:["hipoteca","casa pagada","protege(r)? (mi|la) casa"],q:"¿Cómo protege mi hipoteca?", a:"Si falleces, el seguro de vida paga un beneficio a las personas que elegiste, y ellas pueden usarlo para pagar la hipoteca y otras deudas. Así tu familia puede quedarse en la casa sin esa carga.\n\nSi la póliza tiene beneficios en vida, además podrías adelantar parte del dinero si te enfermas gravemente, para seguir pagando la casa mientras te recuperas. El monto de cobertura se escoge según lo que debes y lo que quieres dejar protegido."},
 {id:"enf",k:["enfermedad grave","me enfermo","cancer","infarto","derrame","diagnostic"],q:"¿Qué pasa si me da una enfermedad grave?", a:"Si tu póliza incluye beneficios en vida y el diagnóstico cumple las condiciones de la póliza, puedes pedir un adelanto de parte del beneficio en vida. Ese dinero te ayuda con gastos médicos, la hipoteca o los gastos diarios mientras no puedes trabajar.\n\nNo todas las pólizas los incluyen, y las condiciones cambian de una a otra. Por eso conviene revisarlo con un agente licenciado antes de contratar."},
 {id:"gf",k:["gastos finales","funeral","entierro","cremacion"],q:"¿Qué cubre el seguro de gastos finales?", a:"Es un seguro de vida entera de monto pequeño. Cuando la persona fallece, paga un beneficio en dinero a sus beneficiarios, que lo pueden usar para el funeral, la cremación o el entierro, deudas médicas y otras cuentas pendientes.\n\nNormalmente la cobertura no vence mientras se paguen las primas, y la solicitud suele ser sencilla. Algunas pólizas tienen un periodo de espera al inicio antes de pagar el beneficio completo."},
 {id:"term",k:["termino","vida entera","temporal","termino y vida"],q:"¿Qué diferencia hay entre seguro a término y de vida entera?", a:"• A término: te cubre por un periodo fijo (por ejemplo 10, 20 o 30 años). Suele costar menos al inicio, pero si el plazo termina y sigues vivo, la cobertura se acaba.\n\n• Vida entera: te cubre toda la vida mientras pagues, la prima normalmente no sube y acumula un valor en efectivo con el tiempo. Suele costar más que un término por la misma cobertura.\n\nCuál conviene depende de para qué lo necesitas y por cuánto tiempo."},
 {id:"uv",k:["ultima voluntad","testament","repartir mis bienes","herencia"],q:"¿Cómo hago mi última voluntad?", a:"La última voluntad es el documento donde dices cómo quieres que se repartan tus bienes y quién se encargará de tus asuntos.\n\nPuedes redactarla e imprimirla paso a paso con esta herramienta de uso libre: https://usa-ultima-voluntad.lovable.app/\n\nPara que sea válida hay que firmarla como pide la ley, y los requisitos de firma y testigos varían según el estado. Si tu caso es complicado, consulta con un abogado."},
 {id:"cal",k:["calific","problemas de salud","diabet","presion alta","enfermo .*asegur","me aceptan","me dan el seguro"],q:"¿Puedo calificar si tengo problemas de salud?", a:"Muchas personas con problemas de salud logran algún tipo de cobertura: hay pólizas con preguntas de salud sencillas y otras pensadas para distintas situaciones. Pero no podemos prometer aprobación: cada aseguradora evalúa la solicitud por su cuenta.\n\nUn agente licenciado puede revisar contigo qué opciones podrían aplicar. Por favor no escribas aquí detalles médicos."},
 {id:"precio",k:[],q:"¿Cuánto cuesta?", a:"No damos precios aquí porque el costo depende de tu edad, tu salud, si fumas, el tipo de seguro y el monto de cobertura. Un agente licenciado lo calcula para tu caso sin compromiso.", agent:true},
 {id:"benef",k:["quien es el beneficiario","que es (un|el) beneficiario","elegir (al|el|a mi) beneficiario","elijo (al|el|a mi) beneficiario"],q:"¿Quién es el beneficiario y cómo lo elijo?", a:"El beneficiario es la persona (o personas) que recibe el dinero del seguro cuando el asegurado fallece. Lo eliges tú al hacer la solicitud y normalmente puedes cambiarlo después.\n\nPuedes nombrar a varios y repartir porcentajes, y también un beneficiario de respaldo por si el principal ya no está. Conviene mantenerlo al día después de un matrimonio, divorcio o nacimiento."},
];

// Extra fixed FAQs (only for typed questions)
export const EXTRA = [
 {id:"espera",k:["periodo de espera","tiempo de espera","cuanto tiempo .*(espera|pagar|cubr)","desde cuando (me )?cubre","dos anos","2 anos","beneficio graduado"],a:"Algunas pólizas, sobre todo las de solicitud muy sencilla, tienen un periodo de espera al inicio (con frecuencia de alrededor de dos años). Si la persona fallece por causas naturales durante ese tiempo, la póliza puede devolver las primas pagadas, a veces con un interés, en lugar del beneficio completo. Muchas veces las muertes por accidente se cubren desde el principio.\n\nOtras pólizas cubren el beneficio completo desde el primer día si la persona califica. Las condiciones exactas están en cada póliza."},
 {id:"valor",k:["valor en efectivo","valor efectivo","cash value","ahorro","prestamo .*poliza","retirar dinero"],a:"El valor en efectivo es una parte del dinero que van acumulando las pólizas permanentes, como la de vida entera, con el paso del tiempo. Las pólizas a término normalmente no lo tienen.\n\nEn muchas pólizas puedes pedir un préstamo sobre ese valor o, si cancelas la póliza, recibir una parte. Lo que no se devuelva de un préstamo se descuenta del beneficio. Crece despacio, sobre todo en los primeros años, y las reglas dependen de cada póliza."},
 {id:"riders",k:["rider","clausula adicional","beneficios adicionales","coberturas adicionales","anexo","que se le puede agregar"],a:"Los «riders» o cláusulas adicionales son extras que se agregan a una póliza para ampliar lo que cubre. Algunos ejemplos comunes: beneficios en vida por enfermedad grave, crónica o terminal; muerte accidental; cobertura para hijos; o exención de primas si quedas incapacitado.\n\nNo todas las pólizas los ofrecen, algunos tienen un costo extra y cada uno tiene sus condiciones. Un agente licenciado puede explicarte cuáles existen para tu caso."},
 {id:"monto",k:["cuanta cobertura","cuanto seguro (necesito|debo)","que monto","cuanto (dinero )?(necesito|debo) (asegurar|cubrir)","cuanto me conviene","monto de cobertura","de cuanto"],a:"Una forma sencilla de pensarlo es sumar lo que tu familia tendría que pagar si faltas: la hipoteca, otras deudas, los gastos del funeral y algunos años de los gastos del hogar o de los estudios de tus hijos. Luego se resta lo que ya tienes (ahorros u otros seguros).\n\nEl resultado da una idea del monto. También debes escoger una cobertura cuya prima puedas pagar con comodidad a largo plazo. Un agente licenciado puede hacer ese cálculo contigo."},
 {id:"varias",k:["mas de una poliza","varias polizas","dos polizas","otra poliza","otro seguro","ya tengo (un )?seguro"],a:"Sí, en general una persona puede tener más de una póliza de seguro de vida, por ejemplo una del trabajo y otra personal, o una de término y otra de gastos finales. Las aseguradoras suelen preguntar qué otras pólizas tienes y revisan que el total tenga sentido con tus ingresos y necesidades.\n\nOjo: el seguro del trabajo normalmente se pierde o cambia si dejas ese empleo."},
 {id:"dejar",k:["dejo de pagar","deja de pagar","no pago","no puedo pagar","atrasarme","atraso","periodo de gracia","cancelar (la|mi) poliza","se cancela"],a:"Casi todas las pólizas tienen un periodo de gracia (con frecuencia de unos 30 días) para pagar una prima atrasada sin perder la cobertura. Si no se paga en ese tiempo, la póliza puede caducar.\n\nEn las pólizas de vida entera, el valor en efectivo acumulado a veces puede usarse para mantenerla activa o para quedarte con una cobertura menor. Algunas pólizas caducadas pueden reactivarse bajo ciertas condiciones. Si te cuesta pagar, habla con tu agente antes de dejar de pagar."},
 {id:"cambio",k:["cambi[oa]r? (al |el |de |mi )?beneficiario","cambio (al |el |de |mi )?beneficiario","cambio de beneficiario","quitar (a un|al) beneficiario","agregar (un|otro) beneficiario"],a:"En la mayoría de las pólizas el dueño puede cambiar el beneficiario cuando quiera, llenando un formulario de la aseguradora. La excepción es el beneficiario «irrevocable», que solo se puede cambiar con su consentimiento.\n\nConviene revisarlo después de un matrimonio, divorcio, nacimiento o fallecimiento. Si nombras a un menor de edad, pueden aplicar reglas especiales, así que vale la pena preguntarle al agente."},
 {id:"pmi",k:["pmi.{0,40}","seguro de vida.{0,10}pmi","seguro hipotecario","seguro de la hipoteca","seguro del banco","mortgage insurance","seguro de proteccion hipotecaria"],a:"Son cosas distintas:\n\n• El PMI (seguro hipotecario privado) protege al BANCO si dejas de pagar el préstamo; no le paga nada a tu familia.\n\n• Un seguro de vida para proteger la hipoteca paga el beneficio a TUS beneficiarios si falleces, y ellos deciden cómo usarlo (por ejemplo, para liquidar la casa). Algunos incluyen beneficios en vida por enfermedad grave.\n\nUn agente licenciado puede explicarte qué opciones existen para tu caso."},
 {id:"tipos",k:["cronica","terminal","diferencia .*enfermedad","tipos de enfermedad"],a:"En los beneficios en vida se suelen usar tres categorías:\n\n• Enfermedad grave (crítica): un diagnóstico serio que esté en la lista de la póliza, como ciertos casos de cáncer, infarto o derrame.\n\n• Enfermedad crónica: cuando la persona ya no puede hacer sola algunas actividades básicas del día a día (como bañarse o vestirse) o tiene un deterioro cognitivo severo.\n\n• Enfermedad terminal: cuando un médico certifica una expectativa de vida corta (por ejemplo, 12 a 24 meses, según la póliza).\n\nLas definiciones exactas y los montos dependen de cada póliza."},
 {id:"edad",k:["edad","hasta que edad","muy (viejo|mayor)","tengo \\d+ anos","limite de edad","anos puedo"],a:"Cada aseguradora fija sus propios límites de edad. En general, los seguros a término se ofrecen más a adultos jóvenes y de mediana edad, y los seguros de gastos finales suelen estar pensados para personas mayores, con frecuencia hasta los 80 u 85 años según la compañía.\n\nMientras más joven y sano solicitas, más opciones sueles tener. Un agente licenciado puede decirte qué opciones existen para tu edad."},
 {id:"examen",k:["examen medico","examen de sangre","analisis","sin examen","me hacen examen","tengo que ir al medico","pruebas medicas"],a:"Depende del tipo de póliza. Muchas pólizas de gastos finales y algunas de vida no piden examen médico: solo hacen preguntas de salud en la solicitud y pueden revisar registros médicos o de recetas. Otras, sobre todo las de montos más altos, pueden pedir un examen sencillo (presión, análisis de sangre u orina).\n\nEs importante contestar las preguntas con la verdad, porque los datos incorrectos pueden causar problemas al momento de cobrar."},
 {id:"reclamo",k:["como se cobra","como cobran","reclamo","reclamacion","como paga","cuando paga","cuanto (tiempo )?tardan en pagar","certificado de defuncion","cobrar el seguro"],a:"Cuando el asegurado fallece, el beneficiario avisa a la aseguradora y presenta un formulario de reclamo junto con una copia del certificado de defunción. Después de revisar el reclamo, la aseguradora paga el beneficio, normalmente en un solo pago y en muchos casos en pocas semanas.\n\nEn general ese dinero no paga impuestos federales sobre la renta. Por eso conviene que tu familia sepa que la póliza existe y dónde está."},
 {id:"uvseg",k:["(ultima voluntad|testament).*(seguro|poliza)","(seguro|poliza).*(ultima voluntad|testament)","necesito las dos","reemplaza"],a:"Son cosas distintas que se complementan:\n\n• La última voluntad indica cómo quieres repartir tus bienes y quién se encarga de tus asuntos. No da dinero por sí sola.\n\n• El seguro de vida paga dinero directamente a los beneficiarios que nombraste en la póliza, normalmente sin pasar por la sucesión. Lo que diga la última voluntad no cambia a esos beneficiarios.\n\nPor eso conviene tener los dos y mantenerlos de acuerdo. Los requisitos de firma y testigos de la última voluntad varían según el estado."},
 {id:"impuestos",k:["impuesto","taxes","irs","declarar"],a:"En general, el beneficio por fallecimiento de un seguro de vida que reciben los beneficiarios no paga impuestos federales sobre la renta. Hay excepciones, por ejemplo con los intereses si el pago se hace en cuotas, o en herencias muy grandes.\n\nPara tu caso específico, lo mejor es consultar con un contador o asesor de impuestos."},
 {id:"suicidio",k:["suicid","no paga el seguro","no pagan","cuando no paga","exclusion","exclusiones"],a:"Las pólizas tienen algunas exclusiones. Por ejemplo, durante los primeros dos años suelen existir la cláusula de suicidio y el periodo de impugnación, en el que la aseguradora puede revisar si la solicitud tuvo datos falsos.\n\nPor eso es muy importante contestar todas las preguntas de la solicitud con la verdad. Las exclusiones exactas están escritas en cada póliza."},
 {id:"hijos",k:["hijos","nietos","ninos","menor de edad"],a:"Muchas familias usan el seguro de vida para que sus hijos tengan con qué vivir y estudiar si uno de los padres falta. También existen pólizas o cláusulas que cubren a los hijos.\n\nSi el beneficiario es menor de edad, normalmente no puede recibir el dinero directamente: suele necesitarse un tutor o un fideicomiso. Un agente licenciado, o un abogado para la parte legal, puede orientarte."},
 {id:"padres",k:["mis padres","mi mama","mi papa","asegurar a (mi|un) familiar","asegurar a otra persona"],a:"Sí, se puede comprar un seguro sobre la vida de un familiar, como tu mamá o tu papá, si tienes un interés asegurable (por ejemplo, porque te tocaría pagar sus gastos finales). Normalmente la persona asegurada tiene que saberlo, dar su consentimiento y firmar la solicitud.\n\nUn agente licenciado puede explicarte cómo hacerlo."}
];

// Keyword matcher over presets + extras. Returns {entry, preset:boolean} or null.
export function match(text) {
  const t = norm(text); let best = null, bs = 0;
  for (const [list, preset] of [[FAQ, true], [EXTRA, false]]) for (const e of list) {
    let sc = 0; for (const k of e.k) if (new RegExp(k).test(t)) sc += k.length;
    if (sc > bs) { bs = sc; best = { entry: e, preset }; }
  }
  return best;
}
// Which preset id a safety route answer corresponds to
export function presetForRoute(text) {
  const t = norm(text);
  if (/testament/.test(t)) return "uv";
  if (/(precio|cuanto (cuesta|cobra|sale|vale|pagaria|pago)|cotiza|prima|mensualidad|costo del seguro|cuanto es)/.test(t)) return "precio";
  return null;
}
export const FALLBACK = "Esa pregunta no la puedo contestar bien desde aquí. Un agente licenciado puede ayudarte con gusto. " + CONSENT_Q;
