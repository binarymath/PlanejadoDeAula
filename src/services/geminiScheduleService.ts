import { GoogleGenAI } from "@google/genai";
import { AulaCurriculoItem } from "./curriculumService";
import { SemanaCronogramaInfo } from "../utils/scheduleHelper";
import { LessonPlanState } from "../types/lessonPlan";

export type ColunaCurriculoOpcao =
  | "conteudo"
  | "aprendizagemEssencial"
  | "habilidades"
  | "objetivos"
  | "descritorSaresp";

export interface ColunaCurriculoConfig {
  id: ColunaCurriculoOpcao;
  label: string;
  descricao: string;
}

export const COLUNAS_CURRICULO_DISPONIVEIS: ColunaCurriculoConfig[] = [
  {
    id: "conteudo",
    label: "Conteúdo da Aula",
    descricao: "Tópicos de aula específicos (ex: 'Procedimentos de adição com números naturais').",
  },
  {
    id: "aprendizagemEssencial",
    label: "Aprendizagem Essencial",
    descricao: "Macro-habilidade formativa (ex: '[AE1]: Compor e decompor números naturais...').",
  },
  {
    id: "habilidades",
    label: "Habilidades (BNCC/Currículo)",
    descricao: "Códigos oficiais das habilidades (ex: 'EF06MA01, EF06MA02').",
  },
  {
    id: "objetivos",
    label: "Objetivos de Aprendizagem",
    descricao: "Detalhamento das metas de aprendizagem de cada aula.",
  },
  {
    id: "descritorSaresp",
    label: "Descritor SARESP",
    descricao: "Foco avaliativo das avaliações externas.",
  },
];

export type TipoAvaliacaoOficial =
  | "Prova Paulista"
  | "SARESP"
  | "Prova Paulista e SARESP";

export interface MarcoAvaliacaoConfig {
  ativo: boolean;
  tipoAvaliacao: TipoAvaliacaoOficial;
  indiceSemanaLimite: number;
  rotuloSemanaLimite: string;
  incluirRevisaoVespera: boolean;
  detectadoDoCalendario?: boolean;
  eventoDetectadoMotivo?: string;
}

export interface ChatMensagem {
  id: string;
  role: "user" | "model";
  texto: string;
  dataHora: string;
  cronogramaGerado?: string;
}

const LOCAL_STORAGE_KEY = "planejador_gemini_api_key";

export function obterGeminiApiKey(): string {
  return (
    localStorage.getItem(LOCAL_STORAGE_KEY) ||
    ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) ||
    ""
  );
}

export function salvarGeminiApiKey(chave: string) {
  if (chave) {
    localStorage.setItem(LOCAL_STORAGE_KEY, chave.trim());
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}

/**
 * Detecta automaticamente se há Prova Paulista ou SARESP nos eventos das semanas
 * ou sugere a semana ideal (antepenúltima/penúltima semana do bimestre).
 */
export function detectarOuSugerirMarcoAvaliacao(
  plano: LessonPlanState,
  semanas: SemanaCronogramaInfo[]
): MarcoAvaliacaoConfig {
  const isQuartoBimestre = (plano.bimestre || "").includes("4");
  const tipoSugerido: TipoAvaliacaoOficial = isQuartoBimestre
    ? "Prova Paulista e SARESP"
    : "Prova Paulista";

  if (semanas.length === 0) {
    return {
      ativo: true,
      tipoAvaliacao: tipoSugerido,
      indiceSemanaLimite: 0,
      rotuloSemanaLimite: "",
      incluirRevisaoVespera: true,
    };
  }

  // 1. Verifica se alguma semana já possui um evento com "Prova Paulista", "SARESP" ou "Avaliação Externa"
  for (let i = 0; i < semanas.length; i++) {
    const sem = semanas[i];
    const evtMatch = sem.feriadosNaSemana.find((f) =>
      /prova\s*paulista|saresp|simulado|avalia[cç][aã]o\s*externa/i.test(f)
    );
    if (evtMatch) {
      let tipoDetectado: TipoAvaliacaoOficial = tipoSugerido;
      const temPP = /prova\s*paulista/i.test(evtMatch);
      const temSaresp = /saresp/i.test(evtMatch);
      if (temPP && temSaresp) tipoDetectado = "Prova Paulista e SARESP";
      else if (temSaresp) tipoDetectado = "SARESP";
      else if (temPP) tipoDetectado = "Prova Paulista";

      return {
        ativo: true,
        tipoAvaliacao: tipoDetectado,
        indiceSemanaLimite: i,
        rotuloSemanaLimite: sem.rotulo,
        incluirRevisaoVespera: true,
        detectadoDoCalendario: true,
        eventoDetectadoMotivo: evtMatch,
      };
    }
  }

  // 2. Caso não esteja nos eventos, sugere a antepenúltima semana (se houver >= 5 semanas) ou penúltima semana
  const indiceSugerido =
    semanas.length >= 5
      ? semanas.length - 3
      : Math.max(0, semanas.length - 2);

  return {
    ativo: true,
    tipoAvaliacao: tipoSugerido,
    indiceSemanaLimite: indiceSugerido,
    rotuloSemanaLimite: semanas[indiceSugerido]?.rotulo || "",
    incluirRevisaoVespera: true,
    detectadoDoCalendario: false,
  };
}

/**
 * Cria a sessão e gera a resposta do Gemini para distribuir a coluna da planilha nas datas do cronograma,
 * contemplando o Planejamento Reverso em 3 fases até a data das avaliações oficiais (Prova Paulista / SARESP).
 */
export async function conversarComGeminiCronograma(params: {
  apiKey: string;
  colunaEscolhida: ColunaCurriculoOpcao;
  aulasCurriculo: AulaCurriculoItem[];
  semanas: SemanaCronogramaInfo[];
  plano: LessonPlanState;
  historicoMensagens: { role: "user" | "model"; parts: { text: string }[] }[];
  mensagemUsuario: string;
  marcoAvaliacao?: MarcoAvaliacaoConfig;
}): Promise<{ respostaTexto: string; cronogramaFormatado?: string }> {
  const {
    apiKey,
    colunaEscolhida,
    aulasCurriculo,
    semanas,
    plano,
    historicoMensagens,
    mensagemUsuario,
    marcoAvaliacao,
  } = params;

  if (!apiKey) {
    throw new Error("Chave da API do Gemini não configurada.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // 1. Extrair os valores da coluna selecionada mantendo a numeração de TODAS as aulas
  const itensColuna = aulasCurriculo
    .map((a, idx) => {
      let val = "";
      if (colunaEscolhida === "conteudo") val = a.conteudo;
      else if (colunaEscolhida === "aprendizagemEssencial") val = a.aprendizagemEssencial;
      else if (colunaEscolhida === "habilidades") val = a.habilidades;
      else if (colunaEscolhida === "objetivos") val = a.objetivos;
      else if (colunaEscolhida === "descritorSaresp") val = a.descritorSaresp;
      const numAula = a.aula || idx + 1;
      return `Aula ${numAula}: ${(val || a.conteudo || "").trim()}`;
    })
    .filter((v) => !v.endsWith(": "))
    .slice(0, 60);

  // 2. Organiza as semanas por fase caso o marco de avaliação esteja ativo
  const usarMarco = Boolean(
    marcoAvaliacao &&
      marcoAvaliacao.ativo &&
      semanas.length > 0 &&
      marcoAvaliacao.indiceSemanaLimite >= 0 &&
      marcoAvaliacao.indiceSemanaLimite < semanas.length
  );

  const formatarLinhaSemana = (s: SemanaCronogramaInfo, idx: number): string => {
    const feriadoStr =
      s.feriadosNaSemana.length > 0
        ? ` [FERIADO/EVENTO: ${s.feriadosNaSemana.join(", ")}]`
        : "";
    return `Semana ${idx + 1} (${s.mes} | ${s.rotulo} | ${s.diasLetivos} dias letivos)${feriadoStr}`;
  };

  let blocoCalendarioPrompt = "";
  let blocoRegrasMarcoPrompt = "";

  if (usarMarco && marcoAvaliacao) {
    const idxLimite = marcoAvaliacao.indiceSemanaLimite;
    const semanasPre = semanas.slice(0, idxLimite);
    const semanaProva = semanas[idxLimite];
    const semanasPos = semanas.slice(idxLimite + 1);

    blocoCalendarioPrompt = `
CALENDÁRIO DIVIDIDO EM 3 FASES PARA PLANEJAMENTO REVERSO (${marcoAvaliacao.tipoAvaliacao.toUpperCase()}):

FASE 1 - SEMANAS ANTERIORES À AVALIAÇÃO (${semanasPre.length} semana(s)):
${semanasPre.length > 0 ? semanasPre.map((s, i) => formatarLinhaSemana(s, i)).join("\n") : "(A avaliação ocorre logo na primeira semana selecionada)"}

FASE 2 - SEMANA DE APLICAÇÃO DA AVALIAÇÃO OFICIAL (${marcoAvaliacao.tipoAvaliacao}):
${formatarLinhaSemana(semanaProva, idxLimite)}

FASE 3 - SEMANAS PÓS-AVALIAÇÃO (${semanasPos.length} semana(s) finais do bimestre):
${semanasPos.length > 0 ? semanasPos.map((s, i) => formatarLinhaSemana(s, idxLimite + 1 + i)).join("\n") : "(Nenhuma semana posterior à avaliação)"}
`;

    blocoRegrasMarcoPrompt = `
DIRETRIZ CRÍTICA DE PLANEJAMENTO REVERSO (${marcoAvaliacao.tipoAvaliacao.toUpperCase()}):
- O professor precisa que 100% dos conteúdos e aulas da planilha (Aula 1 até Aula ${itensColuna.length}) sejam integralmente contemplados ANTES ou ATÉ o início da semana da avaliação (${semanaProva.rotulo} - ${marcoAvaliacao.tipoAvaliacao}).
- NENHUMA aula inédita da matriz curricular deve ficar atrasada para depois da semana ${semanaProva.rotulo}, garantindo que os estudantes façam a ${marcoAvaliacao.tipoAvaliacao} tendo visto todo o conteúdo exigido.
${
  marcoAvaliacao.incluirRevisaoVespera
    ? `- Inclua na véspera/início da semana da avaliação uma atividade de "Revisão Geral e Sistematização de Descritores para a ${marcoAvaliacao.tipoAvaliacao}".`
    : ""
}
- Na semana ${semanaProva.rotulo}, registre explicitamente a aplicação da [${marcoAvaliacao.tipoAvaliacao}].
- Nas semanas da FASE 3 (após ${semanaProva.rotulo}), programe: Devolutiva pedagógica e análise das questões críticas da ${marcoAvaliacao.tipoAvaliacao}, Recuperação Contínua Intensiva das habilidades defasadas, Avaliação Interna e fechamento bimestral.
`;
  } else {
    const semanasResumo = semanas.map((s, i) => formatarLinhaSemana(s, i));
    blocoCalendarioPrompt = `
CALENDÁRIO DE SEMANAS (Segunda a Sexta) E FERIADOS DO BIMESTRE:
${semanasResumo.join("\n")}
`;
  }

  const systemInstruction = `
Você é um assistente pedagógico especialista em planejamento escolar paulista (SEDUC-SP / Currículo Paulista / BNCC) e elaboração de cronogramas para o Guia Bimestral.

O professor está organizando o Cronograma Escolar do:
- Ano Escolar: ${plano.anoEscolar || "Ensino Fundamental"}
- Bimestre: ${plano.bimestre || "1º Bimestre"}
- Componente Curricular: ${plano.componenteCurricular || "Matemática"}
- Carga de aulas semanais calculadas: ${plano.aulasPrevistas || "Conforme grade"}

DADOS EXTRAÍDOS DA PLANILHA OFICIAL DE OBJETOS DE CONHECIMENTO (Coluna escolhida: "${colunaEscolhida}" - Total de ${itensColuna.length} aulas):
${itensColuna.join("\n")}

${blocoCalendarioPrompt}
${blocoRegrasMarcoPrompt}

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO:
1. Inclua TODAS as aulas da planilha mantendo o número de cada aula (ex: "Aula 1: ...", "Aula 2: ...").
2. Em semanas com mais de uma aula, coloque a primeira aula na MESMA linha da data após os dois-pontos e as demais aulas daquela mesma semana em linhas abaixo (ou separadas de forma clara), sempre iniciando a semana com "DD/MM a DD/MM: ".
3. Em semanas com FERIADOS ou eventos (ex: Carnaval, Reunião Pedagógica), cite o evento e adapte a carga daquela semana.
4. Responda amigavelmente ao professor explicando o ritmo adotado para garantir todo o conteúdo até a avaliação oficial (${marcoAvaliacao?.tipoAvaliacao || "Prova Paulista / SARESP"}).
5. Sempre que sugerir ou atualizar o cronograma, forneça o bloco completo dentro da tag <CRONOGRAMA> ... </CRONOGRAMA>, obedecendo estritamente ao formato oficial por mês (iniciando na mesma linha da data):

<CRONOGRAMA>
MÊS:
DD/MM a DD/MM: Aula 1: Conteúdo...
Aula 2: Conteúdo...
DD/MM a DD/MM: [DD/MM - Feriado] Aula 3: Conteúdo...
</CRONOGRAMA>
`;

  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction,
      temperature: 0.5,
    },
    history: historicoMensagens,
  });

  const response = await chat.sendMessage({
    message: mensagemUsuario,
  });

  const respostaTexto = response.text || "";

  // Extrai o bloco <CRONOGRAMA>...</CRONOGRAMA> se existir
  let cronogramaFormatado: string | undefined = undefined;
  const match = respostaTexto.match(/<CRONOGRAMA>([\s\S]*?)<\/CRONOGRAMA>/i);
  if (match) {
    cronogramaFormatado = match[1].trim();
  }

  return {
    respostaTexto,
    cronogramaFormatado,
  };
}
