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
 * Cria a sessão e gera a resposta do Gemini para distribuir a coluna da planilha nas datas do cronograma
 */
export async function conversarComGeminiCronograma(params: {
  apiKey: string;
  colunaEscolhida: ColunaCurriculoOpcao;
  aulasCurriculo: AulaCurriculoItem[];
  semanas: SemanaCronogramaInfo[];
  plano: LessonPlanState;
  historicoMensagens: { role: "user" | "model"; parts: { text: string }[] }[];
  mensagemUsuario: string;
}): Promise<{ respostaTexto: string; cronogramaFormatado?: string }> {
  const {
    apiKey,
    colunaEscolhida,
    aulasCurriculo,
    semanas,
    plano,
    historicoMensagens,
    mensagemUsuario,
  } = params;

  if (!apiKey) {
    throw new Error("Chave da API do Gemini não configurada.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // 1. Extrair os valores da coluna selecionada
  const itensColuna = aulasCurriculo
    .map((a) => {
      let val = "";
      if (colunaEscolhida === "conteudo") val = a.conteudo;
      else if (colunaEscolhida === "aprendizagemEssencial") val = a.aprendizagemEssencial;
      else if (colunaEscolhida === "habilidades") val = a.habilidades;
      else if (colunaEscolhida === "objetivos") val = a.objetivos;
      else if (colunaEscolhida === "descritorSaresp") val = a.descritorSaresp;
      return `Aula ${a.aula}: ${val}`;
    })
    .filter((v) => !v.endsWith(": "))
    .slice(0, 45); // Garante limite seguro de tokens

  // 2. Extrair semanas e feriados
  const semanasResumo = semanas.map((s) => {
    const feriadoStr = s.feriadosNaSemana.length > 0 ? ` [FERIADO/EVENTO: ${s.feriadosNaSemana.join(", ")}]` : "";
    return `${s.mes} | ${s.rotulo}${feriadoStr}`;
  });

  const systemInstruction = `
Você é um assistente pedagógico especialista em planejamento escolar paulista (SEDUC-SP / BNCC) e integração de cronogramas para o Guia Bimestral.

O professor está organizando o Cronograma Escolar do:
- Ano Escolar: ${plano.anoEscolar || "Ensino Fundamental"}
- Bimestre: ${plano.bimestre || "1º Bimestre"}
- Componente Curricular: ${plano.componenteCurricular || "Matemática"}
- Carga de aulas semanais calculadas: ${plano.aulasPrevistas || "Conforme grade"}

DADOS EXTRAÍDOS DA PLANILHA OFICIAL DE OBJETOS DE CONHECIMENTO (Coluna escolhida: "${colunaEscolhida}"):
${itensColuna.join("\n")}

CALENDÁRIO DE SEMANAS (Segunda a Sexta) E FERIADOS DO BIMESTRE:
${semanasResumo.join("\n")}

REGRAS OBRIGATÓRIAS:
1. Associe harmoniosamente os conteúdos/itens da coluna escolhida às semanas do bimestre.
2. NUNCA coloque número de aulas nem referências do tipo "(referente às Aulas nº X)", "Aulas 1 e 2", etc. Coloque DIRETO a descrição da atividade/conteúdo.
3. Em semanas com FERIADOS ou eventos (ex: Carnaval, Reunião Pedagógica), reserve parte das aulas para revisão, nivelamento ou projetos leves, citando o feriado entre colchetes.
4. Nas semanas finais de cada mês ou do bimestre, preveja momentos de avaliação, recuperação diagnóstica e fechamento de médias.
5. Responda amigavelmente ao professor, explicando como organizou o cronograma e atendendo a qualquer pedido específico de alteração que ele fizer.
6. Sempre que sugerir ou atualizar o cronograma, forneça o bloco do cronograma formatado dentro da tag <CRONOGRAMA> ... </CRONOGRAMA>, obedecendo estritamente ao seguinte formato por mês (sem número de semana, começando direto na data):

<CRONOGRAMA>
MÊS:
DD/MM a DD/MM: Atividade ou conteúdo associado.
DD/MM a DD/MM: [DD/MM - Feriado] Atividade ou conteúdo associado.
</CRONOGRAMA>
`;

  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction,
      temperature: 0.7,
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
    let limpo = match[1].trim();
    // Remove qualquer menção residual a números de aula gerada pela IA:
    // ex: "(referente às Aulas nº 1 a 4)", "(aulas 1 a 4)", "(Aulas 1 e 2)", etc.
    limpo = limpo
      .replace(/\s*\((?:referente\s+às\s+)?aulas?\s*(?:nº|n[oº])?\s*[\d\s,e\-aà]+\)/gi, "")
      .replace(/\s*-\s*aulas?\s*(?:nº|n[oº])?\s*[\d\s,e\-aà]+/gi, "")
      .replace(/\s+aulas?\s*(?:nº|n[oº])?\s*[\d\s,e\-aà]+:/gi, ":");

    cronogramaFormatado = limpo;
  }

  return {
    respostaTexto,
    cronogramaFormatado,
  };
}
