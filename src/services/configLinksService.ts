import { LessonPlanState, initialLessonPlanState } from "../types/lessonPlan";

export interface PlanilhasLinksConfig {
  recuperacaoDiagnostica?: string;
  socioemocionais?: string;
  metodologias?: string;
  avaliacao?: string;
  referencias?: string;
  disciplinas?: Record<string, string>;
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
  const disciplinasObj = config?.planilhas?.disciplinas || (config as any)?.disciplinas;
  if (!disciplinasObj) return null;

  const url = disciplinasObj[nomeDisciplina];
  if (url && url.trim()) {
    localStorage.setItem(STORAGE_KEYS.CURRICULO, url.trim());
    window.dispatchEvent(new Event("storage_links_updated"));
    return url.trim();
  }
  return null;
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
