import { GoogleGenAI } from "@google/genai";
import { obterGeminiApiKey } from "./geminiScheduleService";
import { LessonPlanState } from "../types/lessonPlan";

export interface QuestaoAvaliacao {
  numero: number;
  nivel: 1 | 2 | 3 | 4;
  nivelRotulo: string; // "Nível 1 - Apoio (Muita Dificuldade)", "Nível 2 - Básico/Intermediário", etc.
  habilidadeOuDescritor: string;
  enunciado: string;
  tipo: "multipla_escolha" | "discursiva";
  alternativas?: {
    letra: "A" | "B" | "C" | "D";
    texto: string;
  }[];
  respostaEsperadaOuGabarito: string; // Ex: "Alternativa B" ou resposta esperada para discursiva
  justificativaPedagogica: string;    // Análise pedagógica do acerto e dos distratores
}

export interface AvaliacaoDiagnosticaGerada {
  titulo: string;
  componenteCurricular: string;
  anoEscolar: string;
  questoes: QuestaoAvaliacao[];
  orientacoesGerais: string;
}

/**
 * Gera 10 questões em dificuldade gradual para retomada diagnóstica com Gemini
 */
export async function gerarSugestaoAvaliacaoGradual(params: {
  apiKey?: string;
  plano: LessonPlanState;
  aprendizagensNaoConsolidadas: string;
  instrucoesPersonalizadas?: string;
}): Promise<AvaliacaoDiagnosticaGerada> {
  const chave = (params.apiKey || obterGeminiApiKey()).trim();
  if (!chave) {
    throw new Error("Chave da API do Gemini não configurada. Por favor, insira sua chave da API do Google Gemini.");
  }

  const { plano, aprendizagensNaoConsolidadas, instrucoesPersonalizadas } = params;

  if (!aprendizagensNaoConsolidadas.trim()) {
    throw new Error("Nenhuma aprendizagem não consolidada foi selecionada ou preenchida para gerar a avaliação.");
  }

  const ai = new GoogleGenAI({ apiKey: chave });

  const systemInstruction = `
Você é um especialista em avaliação pedagógica diagnóstica, psicometria educacional e recomposição de aprendizagens alinhado às diretrizes paulistas (SEDUC-SP, SARESP e BNCC).

Seu objetivo é elaborar uma AVALIAÇÃO DIAGNÓSTICA DE RETOMADA contendo ESTRITAMENTE 10 QUESTÕES em escala de DIFICULDADE GRADUAL, cobrindo as Aprendizagens Essenciais não consolidadas identificadas pelo professor.

INFORMAÇÕES DA TURMA:
- Ano Escolar: ${plano.anoEscolar || "Ensino Fundamental"}
- Componente Curricular: ${plano.componenteCurricular || "Geral"}
- Bimestre: ${plano.bimestre || "Bimestre Corrente"}

APRENDIZAGENS ESSENCIAIS NÃO CONSOLIDADAS / DESCRITORES A RETOMAR:
${aprendizagensNaoConsolidadas}

${instrucoesPersonalizadas ? `INSTRUÇÕES ADICIONAIS DO PROFESSOR:\n${instrucoesPersonalizadas}\n` : ""}

ESTRUTURA OBRIGATÓRIA DA DIFICULDADE DAS 10 QUESTÕES:
1. QUESTÕES 1 A 3 -> NÍVEL 1 (APOIO / MUITA DIFICULDADE):
   - Foco: Reconhecer, identificar termos, vocabulário básico, leitura direta de informação evidente ou cálculo direto com suporte visual/exemplos. Distratores fáceis de descartar.
2. QUESTÕES 4 A 6 -> NÍVEL 2 (INTERMEDIÁRIO / EM DESENVOLVIMENTO):
   - Foco: Compreensão de regras simples, aplicação em contexto cotidiano curto, interpretação de tabelas/gráficos simples ou etapas sequenciais guiadas.
3. QUESTÕES 7 A 8 -> NÍVEL 3 (ADEQUADO / ESPERADO):
   - Foco: Resolução autônoma de problemas da habilidade, análise de situações com múltiplos dados, inferência de sentido ou deduções lógicas da matéria.
4. QUESTÕES 9 A 10 -> NÍVEL 4 (AVANÇADO / DOMÍNIO DO CONTEÚDO):
   - Foco: Raciocínio crítico, síntese, resolução de situações complexas, justificativa reflexiva ou conexão interdisciplinar/generalização conceitual.

FORMATO DE RESPOSTA OBRIGATÓRIO:
Você DEVE responder EXCLUSIVAMENTE em formato JSON VÁLIDO (sem comentários, sem crases extras ou texto fora do JSON).
O JSON deve ter rigorosamente a seguinte estrutura:

{
  "titulo": "Avaliação Diagnóstica de Retomada e Nivelamento",
  "componenteCurricular": "${plano.componenteCurricular || "Geral"}",
  "anoEscolar": "${plano.anoEscolar || "Ensino Fundamental"}",
  "orientacoesGerais": "Breve orientação pedagógica ao professor sobre a aplicação desta avaliação para diagnóstico dos diferentes níveis da sala.",
  "questoes": [
    {
      "numero": 1,
      "nivel": 1,
      "nivelRotulo": "Nível 1 - Apoio (Muita Dificuldade)",
      "habilidadeOuDescritor": "Descrição da habilidade trabalhada nesta questão",
      "enunciado": "Texto claro do enunciado da questão...",
      "tipo": "multipla_escolha",
      "alternativas": [
        { "letra": "A", "texto": "Texto alternativa A" },
        { "letra": "B", "texto": "Texto alternativa B" },
        { "letra": "C", "texto": "Texto alternativa C" },
        { "letra": "D", "texto": "Texto alternativa D" }
      ],
      "respostaEsperadaOuGabarito": "Alternativa A",
      "justificativaPedagogica": "Explicação pedagógica do porquê a alternativa A é correta e qual equívoco conceitual os distratores B, C e D revelam."
    }
    ... (repetir até a questão 10)
  ]
}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [{ text: "Gere agora a avaliação diagnóstica estruturada de 10 questões graduais em JSON conforme as instruções." }],
      },
    ],
    config: {
      systemInstruction,
      temperature: 0.6,
      responseMimeType: "application/json",
    },
  });

  const textoResposta = response.text || "";
  if (!textoResposta.trim()) {
    throw new Error("O Gemini não retornou dados para a avaliação.");
  }

  try {
    const parsed: AvaliacaoDiagnosticaGerada = JSON.parse(textoResposta);
    if (!parsed.questoes || !Array.isArray(parsed.questoes) || parsed.questoes.length === 0) {
      throw new Error("Formato de questões inválido retornado pelo Gemini.");
    }
    return parsed;
  } catch (err: any) {
    console.error("Erro ao analisar JSON retornado pelo Gemini:", textoResposta);
    throw new Error("Falha ao processar as questões geradas: " + (err.message || "JSON inválido"));
  }
}
