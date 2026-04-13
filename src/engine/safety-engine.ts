import type {
  AnalysisInput,
  AnalysisResult,
  RiskLevel,
  Confidence,
  Language,
  Category,
  Flag,
} from '../types';

// --- Text utilities ---

function normalizedText(value: string | undefined): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

// --- Situation detection ---

interface Situation {
  text: string;
  snakeMentioned: boolean;
  biteMentioned: boolean;
  snakeBite: boolean;
  breathing: boolean;
  severe: boolean;
}

const SNAKE_TERMS = ['cobra', 'serpente', 'serpiente', 'snake', 'jararaca', 'cascavel', 'surucucu', 'coral'];
const BITE_TERMS = ['picad', 'mordid', 'mordeu', 'bite', 'bitten', 'sting', 'picadura', 'mordedura'];
const BREATHING_TERMS = ['falta de ar', 'respirar', 'respiracao', 'breathing', 'breathe', 'dificultad para respirar'];
const SEVERE_TERMS = ['desmai', 'inconsciente', 'confus', 'convuls', 'choque', 'shock', 'paralis', 'paralysis'];

export function detectSituation(input: AnalysisInput): Situation {
  const text = normalizedText(`${input.category} ${input.question} ${input.flags.join(' ')}`);
  const flags = input.flags;

  const snakeMentioned = input.category === 'snake' || hasAny(text, SNAKE_TERMS);
  const biteMentioned = flags.includes('bite') || hasAny(text, BITE_TERMS);
  const breathing = flags.includes('breathing') || hasAny(text, BREATHING_TERMS);
  const severe = hasAny(text, SEVERE_TERMS);

  return {
    text,
    snakeMentioned,
    biteMentioned,
    snakeBite: snakeMentioned && biteMentioned,
    breathing,
    severe,
  };
}

// --- Defaults per category ---

interface DefaultGuidance {
  doNow: string[];
  avoid: string[];
  needMore: string[];
}

export function defaultsFor(input: AnalysisInput): DefaultGuidance {
  const lang = input.language;
  const category = input.category;
  const situation = detectSituation(input);

  const common: Record<Language, DefaultGuidance> = {
    pt: {
      doNow: ['Observe de distancia.', 'Tire fotos melhores em boa luz.', 'Compare com guia local ou especialista.'],
      avoid: ['Nao toque sem necessidade.', 'Nao consuma nada desconhecido.', 'Nao use a foto como unica confirmacao.'],
      needMore: ['Local onde encontrou.', 'Tamanho aproximado.', 'Fotos de detalhes importantes.'],
    },
    es: {
      doNow: ['Observe desde distancia.', 'Tome mejores fotos con buena luz.', 'Compare con una guia local o especialista.'],
      avoid: ['No toque sin necesidad.', 'No consuma nada desconocido.', 'No use la foto como unica confirmacion.'],
      needMore: ['Lugar donde fue encontrado.', 'Tamano aproximado.', 'Fotos de detalles importantes.'],
    },
    en: {
      doNow: ['Observe from a distance.', 'Take better photos in good light.', 'Compare with a local guide or specialist.'],
      avoid: ['Do not touch unnecessarily.', 'Do not consume unknown items.', 'Do not use the photo as the only confirmation.'],
      needMore: ['Location found.', 'Approximate size.', 'Photos of important details.'],
    },
  };

  const plant: Record<Language, DefaultGuidance> = {
    pt: {
      doNow: ['Nao consuma a planta.', 'Fotografe folha, caule, flor e fruto se houver.', 'Confirme com guia local, botanico ou base regional.'],
      avoid: ['Nao prove.', 'Nao use para cha, tempero ou remedio.', 'Nao encoste em olhos ou boca depois de tocar.'],
      needMore: ['Foto da folha por cima e por baixo.', 'Foto do caule.', 'Flor ou fruto, se existir.', 'Local e tipo de ambiente.'],
    },
    es: {
      doNow: ['No consuma la planta.', 'Fotografie hoja, tallo, flor y fruto si hay.', 'Confirme con guia local, botanico o base regional.'],
      avoid: ['No pruebe.', 'No use para te, condimento o remedio.', 'No toque ojos o boca despues de manipular.'],
      needMore: ['Foto de la hoja por arriba y abajo.', 'Foto del tallo.', 'Flor o fruto, si existe.', 'Lugar y tipo de ambiente.'],
    },
    en: {
      doNow: ['Do not consume the plant.', 'Photograph leaf, stem, flower, and fruit if present.', 'Confirm with a local guide, botanist, or regional database.'],
      avoid: ['Do not taste it.', 'Do not use it for tea, seasoning, or medicine.', 'Do not touch eyes or mouth after handling.'],
      needMore: ['Photo of the leaf top and underside.', 'Photo of the stem.', 'Flower or fruit, if present.', 'Location and habitat type.'],
    },
  };

  const snake: Record<Language, DefaultGuidance> = {
    pt: {
      doNow: ['Afaste-se devagar.', 'Mantenha pelo menos alguns metros de distancia.', 'Se houve mordida, procure atendimento urgente.'],
      avoid: ['Nao tente capturar.', 'Nao mate nem manipule.', 'Nao corte, chupe veneno ou use torniquete.'],
      needMore: ['Foto a distancia segura.', 'Local e horario.', 'Se houve mordida, sintomas e horario.'],
    },
    es: {
      doNow: ['Alejese despacio.', 'Mantenga varios metros de distancia.', 'Si hubo mordida, busque atencion urgente.'],
      avoid: ['No intente capturar.', 'No mate ni manipule.', 'No corte, succione veneno ni use torniquete.'],
      needMore: ['Foto desde distancia segura.', 'Lugar y hora.', 'Si hubo mordida, sintomas y hora.'],
    },
    en: {
      doNow: ['Move away slowly.', 'Keep several meters of distance.', 'If there was a bite, seek urgent care.'],
      avoid: ['Do not try to capture it.', 'Do not kill or handle it.', 'Do not cut, suck venom, or use a tourniquet.'],
      needMore: ['Photo from a safe distance.', 'Location and time.', 'If bitten, symptoms and time.'],
    },
  };

  if (category === 'plant' || category === 'mushroom') return plant[lang];
  if (category === 'snake' || situation.snakeMentioned) return snake[lang];
  return common[lang];
}

// --- Critical rules (bypass AI completely) ---

export function criticalRuleResult(input: AnalysisInput): AnalysisResult | null {
  const lang = input.language;
  const situation = detectSituation(input);

  if (situation.snakeBite) {
    const protocols: Record<Language, Omit<AnalysisResult, 'source'>> = {
      pt: {
        risk: 'emergency',
        confidence: 'high',
        likelyIdentification: 'picada ou mordida de cobra relatada',
        summary: 'Trate como emergencia. A prioridade e levar a pessoa para atendimento medico o mais rapido possivel, nao identificar a cobra.',
        doNow: [
          'Afaste a pessoa da cobra e mantenha-a calma, sentada ou deitada.',
          'Acione ajuda se houver sinal: Brasil 192 SAMU ou 193 Bombeiros.',
          'Remova aneis, relogios e roupas apertadas perto da picada.',
          'Lave com agua e sabao, cubra com pano limpo e transporte para atendimento.',
        ],
        avoid: [
          'Nao corte o local e nao chupe o veneno.',
          'Nao use torniquete, gelo, choque eletrico, alcool ou remedio caseiro.',
          'Nao tente capturar ou matar a cobra.',
          'Nao espere aparecerem sintomas graves para procurar ajuda.',
        ],
        needMore: [
          'Horario aproximado da picada.',
          'Local da picada e evolucao do inchaco.',
          'Sintomas: dor, nausea, tontura, falta de ar, sangramento ou fraqueza.',
          'Foto da cobra apenas se for de distancia segura e sem atrasar o socorro.',
        ],
      },
      es: {
        risk: 'emergency',
        confidence: 'high',
        likelyIdentification: 'mordida o picadura de serpiente reportada',
        summary: 'Tratelo como emergencia. La prioridad es llevar a la persona a atencion medica lo antes posible, no identificar la serpiente.',
        doNow: [
          'Aleje a la persona de la serpiente y mantengala tranquila, sentada o acostada.',
          'Llame al servicio local de emergencia si hay senal.',
          'Quite anillos, relojes y ropa apretada cerca de la mordida.',
          'Lave con agua y jabon, cubra con tela limpia y busque atencion.',
        ],
        avoid: [
          'No corte la zona ni succione veneno.',
          'No use torniquete, hielo, choque electrico, alcohol o remedios caseros.',
          'No intente capturar o matar la serpiente.',
          'No espere sintomas graves para buscar ayuda.',
        ],
        needMore: [
          'Hora aproximada de la mordida.',
          'Lugar de la mordida y evolucion de la hinchazon.',
          'Sintomas: dolor, nausea, mareo, dificultad para respirar, sangrado o debilidad.',
          'Foto de la serpiente solo desde distancia segura y sin retrasar ayuda.',
        ],
      },
      en: {
        risk: 'emergency',
        confidence: 'high',
        likelyIdentification: 'reported snake bite',
        summary: 'Treat this as an emergency. The priority is getting medical care as soon as possible, not identifying the snake.',
        doNow: [
          'Move the person away from the snake and keep them calm, sitting or lying down.',
          'Call local emergency services if there is signal.',
          'Remove rings, watches, and tight clothing near the bite.',
          'Wash with soap and water, cover with a clean dry cloth, and transport for care.',
        ],
        avoid: [
          'Do not cut the wound or suck venom.',
          'Do not use a tourniquet, ice, electric shock, alcohol, or home remedies.',
          'Do not try to capture or kill the snake.',
          'Do not wait for severe symptoms before seeking help.',
        ],
        needMore: [
          'Approximate time of the bite.',
          'Bite location and swelling progression.',
          'Symptoms: pain, nausea, dizziness, trouble breathing, bleeding, or weakness.',
          'Photo of the snake only from a safe distance and without delaying care.',
        ],
      },
    };
    return { source: 'offline_safety_protocol', ...protocols[lang] };
  }

  if (situation.breathing || situation.severe) {
    const defaults = defaultsFor(input);
    const summaries: Record<Language, string> = {
      pt: 'Trate como emergencia e busque ajuda urgente.',
      es: 'Tratelo como emergencia y busque ayuda urgente.',
      en: 'Treat this as an emergency and seek urgent help.',
    };
    const ids: Record<Language, string> = {
      pt: 'sintoma grave relatado',
      es: 'sintoma grave reportado',
      en: 'severe symptom reported',
    };
    return {
      source: 'offline_safety_protocol',
      risk: 'emergency',
      confidence: 'high',
      likelyIdentification: ids[lang],
      summary: summaries[lang],
      ...defaults,
    };
  }

  return null;
}

// --- Fallback result (when model fails or is unavailable) ---

export function fallbackResult(input: AnalysisInput): AnalysisResult {
  const lang = input.language;
  const messages: Record<Language, { summary: string; doNow: string[]; avoid: string[]; needMore: string[] }> = {
    pt: {
      summary: 'Nao foi possivel obter uma identificacao confiavel do modelo. Use uma triagem conservadora.',
      doNow: ['Mantenha distancia e evite tocar.', 'Tire fotos melhores em boa luz.', 'Compare com guia local ou especialista.'],
      avoid: ['Nao consuma.', 'Nao manipule sem necessidade.', 'Nao use a foto como unica confirmacao.'],
      needMore: ['Foto de perto.', 'Local onde encontrou.', 'Tamanho aproximado.', 'Folhas, flores, frutos ou marcas visiveis.'],
    },
    es: {
      summary: 'No fue posible obtener una identificacion confiable del modelo. Use una evaluacion conservadora.',
      doNow: ['Mantenga distancia y evite tocar.', 'Tome mejores fotos con buena luz.', 'Compare con guia local o especialista.'],
      avoid: ['No consuma.', 'No manipule sin necesidad.', 'No use la foto como unica confirmacion.'],
      needMore: ['Foto cercana.', 'Lugar donde fue encontrado.', 'Tamano aproximado.', 'Hojas, flores, frutos o marcas visibles.'],
    },
    en: {
      summary: 'The model could not provide a reliable identification. Use a conservative triage.',
      doNow: ['Keep distance and avoid touching.', 'Take better photos in good light.', 'Compare with a local guide or specialist.'],
      avoid: ['Do not consume it.', 'Do not handle it unnecessarily.', 'Do not use the photo as the only confirmation.'],
      needMore: ['Close photo.', 'Location found.', 'Approximate size.', 'Leaves, flowers, fruit, or visible markings.'],
    },
  };

  return {
    source: 'offline_safety_fallback',
    risk: 'moderate',
    confidence: 'low',
    likelyIdentification: 'uncertain',
    visualDescription: input.visualDescription || '',
    ...messages[lang],
  };
}

// --- List utilities ---

function asList(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) return value.filter(Boolean).slice(0, 4).map(String);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return fallback;
}

function mergeDefaults(items: string[], fallback: string[]): string[] {
  const seen = new Set(items.map((i) => i.toLowerCase()));
  const merged = [...items].slice(0, 4);
  for (const item of fallback) {
    if (merged.length >= 4) break;
    if (!seen.has(item.toLowerCase())) merged.push(item);
  }
  return merged;
}

// --- Normalize model output with safety rules ---

export function normalizedResult(input: AnalysisInput, raw: Record<string, unknown>, fromCloud = false): AnalysisResult {
  const defaults = defaultsFor(input);
  const validRisks: RiskLevel[] = ['low', 'moderate', 'high', 'emergency'];
  const validConf: Confidence[] = ['low', 'medium', 'high'];

  const result: AnalysisResult = {
    source: 'gemma_local',
    risk: validRisks.includes(raw.risk as RiskLevel) ? (raw.risk as RiskLevel) : 'moderate',
    confidence: validConf.includes(raw.confidence as Confidence) ? (raw.confidence as Confidence) : 'low',
    likelyIdentification: Array.isArray(raw.likelyIdentification)
      ? raw.likelyIdentification.join(' ou ')
      : String(raw.likelyIdentification || 'uncertain'),
    visualDescription: input.visualDescription || '',
    summary: String(raw.summary || ''),
    doNow: asList(raw.doNow, defaults.doNow),
    avoid: asList(raw.avoid, defaults.avoid),
    needMore: asList(raw.needMore, defaults.needMore),
  };

  const question = normalizedText(input.question);
  const flags = input.flags;
  const category = input.category;
  const situation = detectSituation(input);
  const asksFood = hasAny(question, ['comer', 'comest', 'eat', 'edible']);

  // Plants/mushrooms without image
  if (!input.image && (category === 'plant' || category === 'mushroom')) {
    result.confidence = 'low';
    const msgs: Record<Language, { id: string; summary: string }> = {
      pt: { id: 'incerta sem imagem', summary: 'Uma identificacao confiavel de planta exige imagem clara e mais contexto. Trate como desconhecida.' },
      es: { id: 'incierta sin imagen', summary: 'Una identificacion confiable de planta requiere una imagen clara y mas contexto. Tratela como desconocida.' },
      en: { id: 'uncertain without image', summary: 'A reliable plant identification requires a clear image and more context. Treat it as unknown.' },
    };
    const m = msgs[input.language];
    result.likelyIdentification = m.id;
    result.summary = m.summary;
  }

  // Plants/mushrooms: never allow low risk
  if ((category === 'plant' || category === 'mushroom') && result.risk === 'low') {
    result.risk = asksFood || category === 'mushroom' ? 'high' : 'moderate';
  }

  // Plants/mushrooms: force cautious identification (only for offline/local model)
  if (!fromCloud && (category === 'plant' || category === 'mushroom')) {
    if (result.confidence !== 'high') {
      const msgs: Record<Language, { id: string; summary: string }> = {
        pt: {
          id: 'sem identificacao confiavel de especie com este modelo leve',
          summary: 'O modelo offline leve nao atingiu alta confianca para identificar a especie. Trate a planta como desconhecida e use isto apenas como triagem de seguranca.',
        },
        es: {
          id: 'sin identificacion confiable de especie con este modelo ligero',
          summary: 'El modelo offline ligero no alcanzo alta confianza para identificar la especie. Trate la planta como desconocida y use esto solo como evaluacion de seguridad.',
        },
        en: {
          id: 'no reliable species identification with this lightweight model',
          summary: 'The lightweight offline model did not reach high confidence for species identification. Treat the plant as unknown and use this only as safety triage.',
        },
      };
      const m = msgs[input.language];
      result.likelyIdentification = m.id;
      result.summary = m.summary;
      result.doNow = defaults.doNow;
      result.needMore = defaults.needMore;
    }
  }

  // Food questions → high risk
  if (asksFood || flags.includes('ate')) {
    result.risk = 'high';
  }

  // Snake mentioned → at least high
  if (situation.snakeMentioned && result.risk === 'low') {
    result.risk = 'high';
  }

  // Snake bite → emergency
  if (situation.snakeBite) {
    result.risk = 'emergency';
    result.confidence = 'high';
  }

  // Breathing / severe → emergency
  if (flags.includes('breathing') || situation.breathing || situation.severe) {
    result.risk = 'emergency';
  }

  // Plants/mushrooms: always include "do not consume"
  if (category === 'plant' || category === 'mushroom') {
    const consumeCheck = result.avoid.some((i) => i.toLowerCase().includes('consum'));
    if (!consumeCheck) {
      const msg: Record<Language, string> = {
        pt: 'Nao consuma.',
        es: 'No lo consuma.',
        en: 'Do not consume it.',
      };
      result.avoid.unshift(msg[input.language]);
    }
  }

  // Bites/stings: always suggest photo of creature and time
  if (situation.biteMentioned || flags.includes('bite') || category === 'insect') {
    const biteNeedMore: Record<Language, string[]> = {
      pt: ['Foto do inseto/aranha/animal, se possivel e seguro.', 'Horario exato da picada.', 'Evolucao dos sintomas (inchaco, dor, vermelhidao).'],
      es: ['Foto del insecto/arana/animal, si es posible y seguro.', 'Hora exacta de la picadura.', 'Evolucion de sintomas (hinchazon, dolor, enrojecimiento).'],
      en: ['Photo of the insect/spider/animal, if safe to do so.', 'Exact time of the bite/sting.', 'Symptom progression (swelling, pain, redness).'],
    };
    const biteDoNow: Record<Language, string> = {
      pt: 'Observe sinais de alergia: inchaco no rosto, falta de ar, tontura.',
      es: 'Observe signos de alergia: hinchazon facial, dificultad para respirar, mareo.',
      en: 'Watch for allergy signs: facial swelling, breathing difficulty, dizziness.',
    };
    // Add allergy warning to doNow
    if (!result.doNow.some((i) => i.toLowerCase().includes('alergia') || i.toLowerCase().includes('allergy'))) {
      result.doNow.push(biteDoNow[input.language]);
    }
    // Add creature photo + time to needMore
    for (const item of biteNeedMore[input.language]) {
      if (!result.needMore.some((i) => i.toLowerCase().includes(item.slice(0, 15).toLowerCase()))) {
        result.needMore.push(item);
      }
    }
  }

  // Merge with defaults
  result.doNow = mergeDefaults(result.doNow, defaults.doNow);
  result.avoid = mergeDefaults(result.avoid, defaults.avoid);
  result.needMore = mergeDefaults(result.needMore, defaults.needMore);

  return result;
}
