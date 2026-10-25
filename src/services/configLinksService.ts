import { LessonPlanState, initialLessonPlanState } from "../types/lessonPlan";
import { urlParaBase64 } from "../utils/imageHelper";
import { limparNomeComponente, normalizarTexto } from "./googleSheetsService";

export interface PlanilhasLinksConfig {
  recuperacaoDiagnostica?: string;
  recuperacaoDiagnosticaAnterior?: string;
  socioemocionais?: string;
  metodologias?: string;
  avaliacao?: string;
  referencias?: string;
  disciplinas?: Record<string, string>;
}

export interface DisciplinaFundida {
  nome: string;              // Nome oficial ou limpo de exibição
  chaveCanonica: string;     // Chave normalizada para comparação
  origemPlanilhaOficial: boolean;
  origemSistema: boolean;
  urlCurriculo?: string;     // URL da planilha de currículo vinculada se houver
  chaveSistemaOriginal?: string; // Chave original que está no JSON se for diferente
}

/**
 * Estrutura Unificada e Sem Redundâncias (Opção A)
 * - 'planilhas': reúne todos os links gerais e a relação de disciplinas/conteúdos.
 * - 'planejamento': dados pedagógicos e cadastrais do plano de aula atual.
 * - A chave de API do Gemini NUNCA é incluída por motivos de segurança e privacidade.
 */
export interface BackupCompletoPlanejadorJSON {
  planilhas: PlanilhasLinksConfig;
  planejamento: LessonPlanState;
}

export const STORAGE_KEYS = {
  CONFIG_JSON: "planejador_configuracao_links_json",
  DADOS_AULA: "planejador_aula_dados_v1",
  DIAGNOSTICO: "planejador_url_planilha_diagnostico",
  DIAGNOSTICO_ANTERIOR: "planejador_url_planilha_diagnostico_anterior",
  CURRICULO: "planejador_url_planilha_curriculo",
  SOCIOEMOCIONAL: "planejador_url_planilha_socioemocional",
  METODOLOGIAS: "planejador_url_planilha_metodologias",
  AVALIACAO: "planejador_url_planilha_avaliacao",
  REFERENCIAS: "planejador_url_planilha_referencias",
};

/**
 * Lê a configuração JSON salva
 */
export function obterConfiguracaoLinks(): BackupCompletoPlanejadorJSON | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG_JSON);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Erro ao ler JSON de backup:", e);
    return null;
  }
}

/**
 * Funde disciplinas da planilha oficial com as salvas no sistema JSON em uma lista única consolidada
 */
export function fundirDisciplinas(
  disciplinasPlanilha: string[],
  disciplinasSistema: string[]
): DisciplinaFundida[] {
  const mapa = new Map<string, DisciplinaFundida>();
  const config = obterConfiguracaoLinks();
  const discObj: Record<string, string> =
    (config?.planilhas?.disciplinas as Record<string, string>) ||
    ((config as any)?.disciplinas as Record<string, string>) ||
    {};

  // 1. Processa disciplinas da Planilha Oficial (prioridade de nomenclatura)
  disciplinasPlanilha.forEach((nomeBruto) => {
    const nomeLimpo = limparNomeComponente(nomeBruto);
    if (!nomeLimpo) return;
    const chave = normalizarTexto(nomeLimpo);
    mapa.set(chave, {
      nome: nomeLimpo,
      chaveCanonica: chave,
      origemPlanilhaOficial: true,
      origemSistema: false,
    });
  });

  // 2. Funde as disciplinas salvas no Sistema (JSON)
  disciplinasSistema.forEach((nomeSistema) => {
    const nomeLimpo = limparNomeComponente(nomeSistema);
    if (!nomeLimpo) return;
    const chave = normalizarTexto(nomeLimpo);
    const url = discObj[nomeSistema] || discObj[nomeLimpo] || "";

    const existente = mapa.get(chave);
    if (existente) {
      // Já existia na planilha oficial: apenas marca como presente no sistema e associa a URL da planilha
      existente.origemSistema = true;
      if (url) existente.urlCurriculo = url;
      existente.chaveSistemaOriginal = nomeSistema;
    } else {
      // Não existia na planilha oficial: adiciona como disciplina salva no sistema
      mapa.set(chave, {
        nome: nomeLimpo,
        chaveCanonica: chave,
        origemPlanilhaOficial: false,
        origemSistema: true,
        urlCurriculo: url,
        chaveSistemaOriginal: nomeSistema,
      });
    }
  });

  // Retorna em ordem alfabética
  return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/**
 * Retorna os nomes das disciplinas cadastradas em 'planilhas.disciplinas'
 */
export function obterDisciplinasCadastradas(): string[] {
  const config = obterConfiguracaoLinks();
  const disciplinasObj = config?.planilhas?.disciplinas || (config as any)?.disciplinas;
  if (!disciplinasObj) return [];
  return Object.keys(disciplinasObj).filter((d) => d.trim().length > 0);
}

/**
 * Aplica a planilha de uma disciplina específica no localStorage
 */
export function aplicarDisciplinaSelecionada(nomeDisciplina: string): string | null {
  const config = obterConfiguracaoLinks();
  const disciplinasObj: Record<string, string> =
    (config?.planilhas?.disciplinas as Record<string, string>) ||
    ((config as any)?.disciplinas as Record<string, string>) ||
    {};

  // Busca exata ou por correspondência canônica (limpa códigos como - 2700)
  let url = disciplinasObj[nomeDisciplina];
  if (!url) {
    const chaveAlvo = normalizarTexto(limparNomeComponente(nomeDisciplina));
    for (const [k, v] of Object.entries(disciplinasObj)) {
      if (normalizarTexto(limparNomeComponente(k)) === chaveAlvo) {
        url = v;
        break;
      }
    }
  }

  if (url && url.trim()) {
    localStorage.setItem(STORAGE_KEYS.CURRICULO, url.trim());
    window.dispatchEvent(new Event("storage_links_updated"));
    return url.trim();
  }
  return null;
}

/**
 * Cadastra uma nova disciplina no arquivo de configuração do sistema
 */
export function cadastrarNovaDisciplina(nomeDisciplina: string, urlPlanilhaCurriculo?: string): void {
  const nomeLimpo = limparNomeComponente(nomeDisciplina.trim());
  if (!nomeLimpo) return;

  const configAtual = obterConfiguracaoLinks() || {
    planilhas: {
      recuperacaoDiagnostica: localStorage.getItem(STORAGE_KEYS.DIAGNOSTICO) || "",
      socioemocionais: localStorage.getItem(STORAGE_KEYS.SOCIOEMOCIONAL) || "",
      metodologias: localStorage.getItem(STORAGE_KEYS.METODOLOGIAS) || "",
      avaliacao: localStorage.getItem(STORAGE_KEYS.AVALIACAO) || "",
      referencias: localStorage.getItem(STORAGE_KEYS.REFERENCIAS) || "",
      disciplinas: {},
    },
    planejamento: {} as any,
  };

  if (!configAtual.planilhas) {
    configAtual.planilhas = {};
  }
  const discMap: Record<string, string> = (configAtual.planilhas.disciplinas as Record<string, string>) || {};
  if (!discMap[nomeLimpo]) {
    discMap[nomeLimpo] = urlPlanilhaCurriculo?.trim() || "";
  }
  configAtual.planilhas.disciplinas = discMap;

  localStorage.setItem(STORAGE_KEYS.CONFIG_JSON, JSON.stringify(configAtual, null, 2));
  window.dispatchEvent(new Event("storage_links_updated"));
}

/**
 * Remove uma disciplina do arquivo de configuração do sistema
 */
export function removerDisciplinaCadastrada(nomeDisciplina: string): void {
  const nomeLimpo = limparNomeComponente(nomeDisciplina.trim());
  if (!nomeLimpo) return;

  const configAtual = obterConfiguracaoLinks();
  if (!configAtual || !configAtual.planilhas || !configAtual.planilhas.disciplinas) return;

  const discMap: Record<string, string> = { ...(configAtual.planilhas.disciplinas as Record<string, string>) };
  const chaveAlvo = normalizarTexto(nomeLimpo);

  // Remove todas as chaves que correspondam ao nome normalizado (ex: "Matemática", "Matemática - 2700")
  for (const k of Object.keys(discMap)) {
    if (normalizarTexto(limparNomeComponente(k)) === chaveAlvo) {
      delete discMap[k];
    }
  }

  configAtual.planilhas.disciplinas = discMap;

  localStorage.setItem(STORAGE_KEYS.CONFIG_JSON, JSON.stringify(configAtual, null, 2));
  window.dispatchEvent(new Event("storage_links_updated"));
}


/**
 * Gera o backup no padrão Opção A (sem redundâncias)
 */
export function gerarBackupCompleto(dadosAtuais: LessonPlanState): BackupCompletoPlanejadorJSON {
  const configSalva = obterConfiguracaoLinks();
  const discNome = dadosAtuais.componenteCurricular?.trim() || "Matemática";

  const disciplinasSalvas =
    configSalva?.planilhas?.disciplinas ||
    (configSalva as any)?.disciplinas ||
    {
      [discNome]: localStorage.getItem(STORAGE_KEYS.CURRICULO) || "",
    };

  return {
    planilhas: {
      recuperacaoDiagnostica: localStorage.getItem(STORAGE_KEYS.DIAGNOSTICO) || "",
      recuperacaoDiagnosticaAnterior: localStorage.getItem(STORAGE_KEYS.DIAGNOSTICO_ANTERIOR) || "",
      socioemocionais: localStorage.getItem(STORAGE_KEYS.SOCIOEMOCIONAL) || "",
      metodologias: localStorage.getItem(STORAGE_KEYS.METODOLOGIAS) || "",
      avaliacao: localStorage.getItem(STORAGE_KEYS.AVALIACAO) || "",
      referencias: localStorage.getItem(STORAGE_KEYS.REFERENCIAS) || "",
      disciplinas: disciplinasSalvas,
    },
    planejamento: dadosAtuais,
  };
}

/**
 * Salva e restaura o backup no sistema
 */
export function restaurarBackupCompleto(
  backup: any,
  onRestaurarDados?: (novosDados: LessonPlanState) => void
): { sucesso: boolean; mensagem: string } {
  if (!backup || typeof backup !== "object") {
    throw new Error("Arquivo ou texto JSON inválido.");
  }

  // 1. Salva a configuração JSON
  localStorage.setItem(STORAGE_KEYS.CONFIG_JSON, JSON.stringify(backup, null, 2));

  // 2. Extrai e salva links de planilhas
  const planilhas = backup.planilhas || backup.planilhasGerais;
  if (planilhas) {
    if (planilhas.recuperacaoDiagnostica) {
      localStorage.setItem(STORAGE_KEYS.DIAGNOSTICO, planilhas.recuperacaoDiagnostica.trim());
    }
    if (planilhas.recuperacaoDiagnosticaAnterior) {
      localStorage.setItem(STORAGE_KEYS.DIAGNOSTICO_ANTERIOR, planilhas.recuperacaoDiagnosticaAnterior.trim());
    }
    if (planilhas.socioemocionais) {
      localStorage.setItem(STORAGE_KEYS.SOCIOEMOCIONAL, planilhas.socioemocionais.trim());
    }
    if (planilhas.metodologias) {
      localStorage.setItem(STORAGE_KEYS.METODOLOGIAS, planilhas.metodologias.trim());
    }
    if (planilhas.avaliacao) {
      localStorage.setItem(STORAGE_KEYS.AVALIACAO, planilhas.avaliacao.trim());
    }
    if (planilhas.referencias) {
      localStorage.setItem(STORAGE_KEYS.REFERENCIAS, planilhas.referencias.trim());
    }
  }

  // 3. Disciplinas e planilha de currículo
  const disciplinasObj = planilhas?.disciplinas || backup.disciplinas;
  let disciplinaAtiva = "";
  if (backup.planejamento && backup.planejamento.componenteCurricular) {
    disciplinaAtiva = backup.planejamento.componenteCurricular;
  }

  if (disciplinasObj) {
    const listaDiscs = Object.keys(disciplinasObj);
    const alvo = disciplinaAtiva && disciplinasObj[disciplinaAtiva] ? disciplinaAtiva : listaDiscs[0];
    if (alvo && disciplinasObj[alvo]) {
      localStorage.setItem(STORAGE_KEYS.CURRICULO, disciplinasObj[alvo].trim());
    }
  }

  // 4. Restaura dados pedagógicos do planejamento se presentes
  let restaurouPlanejamento = false;
  if (backup.planejamento && typeof backup.planejamento === "object") {
    const dadosCombinados: LessonPlanState = {
      ...initialLessonPlanState,
      ...backup.planejamento,
    };

    // Se o backup tiver logoEscolaUrl mas o logoEscolaBase64 estiver vazio, converte assincronamente em background
    if (dadosCombinados.logoEscolaUrl && !dadosCombinados.logoEscolaBase64) {
      urlParaBase64(dadosCombinados.logoEscolaUrl)
        .then((b64) => {
          if (b64) {
            dadosCombinados.logoEscolaBase64 = b64;
            localStorage.setItem(STORAGE_KEYS.DADOS_AULA, JSON.stringify(dadosCombinados));
            if (onRestaurarDados) onRestaurarDados({ ...dadosCombinados });
          }
        })
        .catch((e) => console.warn("Não foi possível carregar imagem do logo restaurada por URL:", e));
    }

    localStorage.setItem(STORAGE_KEYS.DADOS_AULA, JSON.stringify(dadosCombinados));
    if (onRestaurarDados) {
      onRestaurarDados(dadosCombinados);
    }
    restaurouPlanejamento = true;
  }

  // 5. Dispara evento global para que todas as abas e seletor atualizem instantaneamente
  window.dispatchEvent(new Event("storage_links_updated"));

  return {
    sucesso: true,
    mensagem: restaurouPlanejamento
      ? "Backup completo restaurado! Todos os dados pedagógicos, disciplinas e links foram sincronizados. ✔"
      : "Configuração de links e disciplinas sincronizada com sucesso! ✔",
  };
}
