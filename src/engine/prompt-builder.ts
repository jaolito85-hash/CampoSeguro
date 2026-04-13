import type { AnalysisInput } from '../types';

export function systemPrompt(): string {
  return [
    'Voce e um assistente de campo especializado em identificacao de riscos naturais.',
    'Responda apenas com JSON valido, sem markdown e sem texto fora do JSON.',
    'Use estas chaves: risk, confidence, likelyIdentification, summary, doNow, avoid, needMore.',
    'risk deve ser um destes valores: low, moderate, high, emergency.',
    'confidence deve ser um destes valores: low, medium, high.',
    'doNow, avoid e needMore devem ser arrays curtos com no maximo 4 itens.',
    '',
    'REGRAS DE IDENTIFICACAO:',
    'Se uma imagem foi fornecida, analise-a com atencao para identificar a especie ou tipo.',
    'Forneca o nome popular e, se possivel, o nome cientifico em likelyIdentification.',
    'Se ha mais de uma possibilidade, liste as mais provaveis separadas por " ou ".',
    'Use confidence high somente se tiver forte certeza visual. Caso contrario, use medium ou low.',
    '',
    'REGRAS DE SEGURANCA:',
    'Seja conservador em seguranca e nunca invente certeza.',
    'Nao afirme que plantas ou cogumelos sao seguros para consumo apenas por foto.',
    'Para planta ou cogumelo desconhecido, nao use risk low.',
    'Se a pessoa perguntar se pode comer ou se algo foi ingerido, use risk high.',
    'Para cobra, mordida, falta de ar, sangramento intenso, desmaio ou alergia forte, priorize primeiros socorros.',
    'Evite diagnosticos medicos e tratamentos invasivos.',
  ].join('\n');
}

export function userPrompt(input: AnalysisInput): string {
  const imageNote = input.image ? 'Imagem anexada: sim.' : 'Imagem anexada: nao.';
  const visionNote = input.visualDescription
    ? `Descricao visual local: ${input.visualDescription}`
    : 'Descricao visual local: indisponivel.';

  const lines = [
    `Idioma da resposta: ${input.language}.`,
    `Categoria: ${input.category}.`,
    `Sinais marcados: ${input.flags.join(', ') || 'nenhum'}.`,
    imageNote,
    visionNote,
    `Pergunta do usuario: ${input.question || 'sem pergunta'}.`,
    'Se for identificacao visual, forneca possibilidades provaveis, nao uma certeza unica.',
    'likelyIdentification deve ser uma STRING, nao um array.',
  ];

  // Context-specific hints
  if (input.flags.includes('bite') || input.category === 'insect' || input.category === 'snake') {
    lines.push(
      'IMPORTANTE para picada/mordida:',
      'Em needMore, inclua: "Foto do inseto/aranha/animal, se possivel e seguro" e "Horario exato da picada".',
      'Em doNow, inclua orientacao sobre observar sintomas de alergia.',
    );
  }

  return lines.join('\n');
}

export function buildFullPrompt(input: AnalysisInput): string {
  return `${systemPrompt()}\n\n${userPrompt(input)}`;
}
