export interface PlanilhasGeraisConfig {
  recuperacaoDiagnostica?: string;
  socioemocionais?: string;
  metodologias?: string;
  avaliacao?: string;
  referencias?: string;
}

export interface ConfiguracaoLinksJSON {
  versao?: string;
  descricao?: string;
  planilhasGerais?: PlanilhasGeraisConfig;
  disciplinas?: Record<string, string>;
}

export const STORAGE_KEYS = {
  CONFIG_JSON: "planejador_configuracao_links_json",
  DIAGNOSTICO: "planejador_url_planilha_diagnostico",
  CURRICULO: "planejador_url_planilha_curriculo",
  SOCIOEMOCIONAL: "planejador_url_planilha_socioemocional",
  METODOLOGIAS: "planejador_url_planilha_metodologias",
  AVALIACAO: "planejador_url_planilha_avaliacao",
  REFERENCIAS: "planejador_url_planilha_referencias",
};

/**
 * Obtém a configuração JSON salva no localStorage
 */
export function obterConfiguracaoLinks(): ConfiguracaoLinksJSON | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG_JSON);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Erro ao ler configuração JSON de links:", e);
    return null;
  }
}

/**
 * Retorna a lista de nomes das disciplinas cadastradas no JSON
 */
export function obterDisciplinasCadastradas(): string[] {
  const config = obterConfiguracaoLinks();
  if (!config || !config.disciplinas) return [];
  return Object.keys(config.disciplinas).filter((d) => d.trim().length > 0);
}

/**
 * Aplica a planilha de uma disciplina ao localStorage
 */
export function aplicarDisciplinaSelecionada(nomeDisciplina: string): string | null {
  const config = obterConfiguracaoLinks();
  if (!config || !config.disciplinas) return null;

  const url = config.disciplinas[nomeDisciplina];
  if (url && url.trim()) {
    localStorage.setItem(STORAGE_KEYS.CURRICULO, url.trim());
    window.dispatchEvent(new Event("storage_links_updated"));
    return url.trim();
  }
  return null;
}

/**
 * Salva e sincroniza a configuração completa JSON no localStorage
 */
export function salvarConfiguracaoLinks(config: ConfiguracaoLinksJSON, disciplinaAtual?: string): void {
  localStorage.setItem(STORAGE_KEYS.CONFIG_JSON, JSON.stringify(config, null, 2));

  // Aplica planilhas gerais se existirem
  if (config.planilhasGerais) {
    if (config.planilhasGerais.recuperacaoDiagnostica) {
      localStorage.setItem(STORAGE_KEYS.DIAGNOSTICO, config.planilhasGerais.recuperacaoDiagnostica.trim());
    }
    if (config.planilhasGerais.socioemocionais) {
      localStorage.setItem(STORAGE_KEYS.SOCIOEMOCIONAL, config.planilhasGerais.socioemocionais.trim());
    }
    if (config.planilhasGerais.metodologias) {
      localStorage.setItem(STORAGE_KEYS.METODOLOGIAS, config.planilhasGerais.metodologias.trim());
    }
    if (config.planilhasGerais.avaliacao) {
      localStorage.setItem(STORAGE_KEYS.AVALIACAO, config.planilhasGerais.avaliacao.trim());
    }
    if (config.planilhasGerais.referencias) {
      localStorage.setItem(STORAGE_KEYS.REFERENCIAS, config.planilhasGerais.referencias.trim());
    }
  }

  // Se houver uma disciplina atual ou a primeira disciplina, sincroniza o currículo
  if (config.disciplinas) {
    const disciplinasLista = Object.keys(config.disciplinas);
    let discAlvo = disciplinaAtual && config.disciplinas[disciplinaAtual] ? disciplinaAtual : disciplinasLista[0];
    if (discAlvo && config.disciplinas[discAlvo]) {
      localStorage.setItem(STORAGE_KEYS.CURRICULO, config.disciplinas[discAlvo].trim());
    }
  }

  // Dispara evento para os componentes reagirem sem precisar dar F5
  window.dispatchEvent(new Event("storage_links_updated"));
}

/**
 * Gera um objeto modelo JSON contendo os links atuais do localStorage
 */
export function gerarModeloConfiguracaoAtual(disciplinaAtual?: string): ConfiguracaoLinksJSON {
  const configSalva = obterConfiguracaoLinks();

  const discNome = disciplinaAtual?.trim() || "Matemática";
  const disciplinasObj: Record<string, string> = configSalva?.disciplinas || {
    [discNome]: localStorage.getItem(STORAGE_KEYS.CURRICULO) || "",
  };

  return {
    versao: "1.0",
    descricao: "Configuração de links das planilhas do professor para o Planejador de Aula",
    planilhasGerais: {
      recuperacaoDiagnostica: localStorage.getItem(STORAGE_KEYS.DIAGNOSTICO) || "",
      socioemocionais: localStorage.getItem(STORAGE_KEYS.SOCIOEMOCIONAL) || "",
      metodologias: localStorage.getItem(STORAGE_KEYS.METODOLOGIAS) || "",
      avaliacao: localStorage.getItem(STORAGE_KEYS.AVALIACAO) || "",
      referencias: localStorage.getItem(STORAGE_KEYS.REFERENCIAS) || "",
    },
    disciplinas: disciplinasObj,
  };
}
