import * as XLSX from "xlsx";

export const GOOGLE_SHEET_ID = "";
export const GOOGLE_SHEET_XLSX_URL = GOOGLE_SHEET_ID
  ? `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=xlsx`
  : "";

export interface DescritorHabilidade {
  id: string;
  anoEscolar: string;       // ex: "7° ANO"
  taxaAcerto: string;       // ex: "81,8%"
  descricao: string;        // ex: "Inferir os termos ausentes..."
  componente: string;       // ex: "MATEMÁTICA" (Coluna D)
  linkMaterial?: string;    // Material de Referência (Coluna E)
  linkQuestao?: string;     // Questão de Referência (Coluna F)
  linkDrive?: string;       // Alias retrocompatível para linkQuestao
  abaOrigem: string;        // ex: "7A-1B"
}

/**
 * Converte links comuns do Google Sheets (/edit, /view, etc.) para endpoint de exportação XLSX
 */
export function normalizarGoogleSheetsXlsxUrl(rawUrl: string): string {
  if (!rawUrl || !rawUrl.trim()) return "";
  const trimmed = rawUrl.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`;
  }
  return trimmed;
}

// Cache em memória de workbooks por URL normalizada para suportar múltiplas planilhas simultâneas
const workbookCache = new Map<string, XLSX.WorkBook>();

/**
 * Baixa e armazena em cache o XLSX completo da planilha caso configurada
 */
export async function getGoogleWorkbook(customUrl?: string): Promise<XLSX.WorkBook | null> {
  const targetUrl = normalizarGoogleSheetsXlsxUrl(customUrl || GOOGLE_SHEET_XLSX_URL);
  if (!targetUrl) {
    return null;
  }

  if (workbookCache.has(targetUrl)) {
    return workbookCache.get(targetUrl)!;
  }

  // Tenta baixar via fetch
  const response = await fetch(targetUrl);
  if (!response.ok) {
    throw new Error(`Falha ao conectar à planilha. Status: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  workbookCache.set(targetUrl, wb);
  return wb;
}

/**
 * Retorna todos os nomes de abas existentes na planilha
 */
export async function getSheetNames(customUrl?: string): Promise<string[]> {
  const wb = await getGoogleWorkbook(customUrl);
  return wb ? wb.SheetNames : [];
}



/**
 * Converte qualquer formato de porcentagem ou número para valor numérico float (ex: "8,70%" -> 8.7, 0.087 -> 8.7)
 */
export function extrairValorPorcentagem(valor: string | number): number {
  if (valor === undefined || valor === null) return 0;
  const str = String(valor).trim();
  if (!str) return 0;

  if (str.includes("%")) {
    const num = parseFloat(str.replace("%", "").replace(",", "."));
    return isNaN(num) ? 0 : num;
  }

  const num = parseFloat(str.replace(",", "."));
  if (isNaN(num)) return 0;

  // Se for decimal entre 0 e 1 (ex: 0.0869565...)
  if (num > 0 && num <= 1) {
    return num * 100;
  }
  return num;
}

/**
 * Converte qualquer valor numérico ou decimal (ex: 0.086956..., "87,9%", "0.1")
 * em porcentagem brasileira com exatamente duas casas decimais (ex: "8,70%", "87,90%")
 */
export function formatarPorcentagem2Casas(valor: string | number): string {
  if (valor === undefined || valor === null) return "0,00%";
  const str = String(valor).trim();
  if (!str) return "0,00%";

  // Se já tiver símbolo de %, limpa e converte
  if (str.includes("%")) {
    const num = parseFloat(str.replace("%", "").replace(",", "."));
    if (!isNaN(num)) {
      return `${num.toFixed(2).replace(".", ",")}%`;
    }
    return str;
  }

  const num = parseFloat(str.replace(",", "."));
  if (isNaN(num)) return str;

  // Se for decimal entre 0 e 1 (ex: 0.0869565...), multiplica por 100
  if (num > 0 && num <= 1) {
    const perc = num * 100;
    return `${perc.toFixed(2).replace(".", ",")}%`;
  }

  // Se já for na escala 0-100 (ex: 8.79 ou 87.9)
  return `${num.toFixed(2).replace(".", ",")}%`;
}

/**
 * Normaliza o texto removendo acentos e espaços extras para comparações confiáveis
 */
export function normalizarTexto(texto: string): string {
  if (!texto) return "";
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Detecta o nível escolar (ex: "6", "7", "8", "9") a partir do texto do ano ou das turmas
 */
export function extrairNivelEscolar(textoAnoOuTurma: string): string | null {
  if (!textoAnoOuTurma) return null;
  const match = textoAnoOuTurma.match(/([6789])(?:º|°|\^|\s*ano|\s*a|\s*b|\s*c|\s*d)?/i);
  return match ? match[1] : null;
}

/**
 * Detecta a letra da turma (ex: "A", "B", "C", "D")
 */
export function extrairLetraTurma(textoTurma: string): string | null {
  if (!textoTurma) return null;
  const match = textoTurma.match(/[6789][º°\^]?\s*(?:ano)?\s*([a-dA-D])/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Padroniza o nome da turma para o formato compacto e oficial (ex: "6º Ano A", "6º A", "6 - A" -> "6A")
 */
export function padronizarNomeTurma(nomeTurma: string): string {
  if (!nomeTurma) return "";
  const limpo = nomeTurma.trim();

  // Se já for formato "6A", "7B", "8C", etc.
  const matchCompacto = limpo.match(/^([1-9])\s*([A-Za-z])$/i);
  if (matchCompacto) {
    return `${matchCompacto[1]}${matchCompacto[2].toUpperCase()}`;
  }

  // Detecta nível (1 a 9) e letra (A-Z) em formatos como "6º Ano A", "6° ano B", "6ºA", "Turma 6A", "6 - A"
  const matchGeral = limpo.match(/([1-9])\s*(?:º|°|\^|\s*ano)?\s*[-–]?\s*([A-Za-z])/i);
  if (matchGeral) {
    return `${matchGeral[1]}${matchGeral[2].toUpperCase()}`;
  }

  return limpo.toUpperCase();
}

/**
 * Extrai todas as turmas únicas identificadas nas abas da planilha de diagnóstico (ex: "6A-1B" -> "6A")
 */
export async function obterTurmasDaPlanilhaDiagnostico(
  customUrl?: string
): Promise<string[]> {
  const wb = await getGoogleWorkbook(customUrl);
  if (!wb || !wb.SheetNames) return [];

  const turmasSet = new Set<string>();

  wb.SheetNames.forEach((aba) => {
    // Abas seguem padrão como "6A-1B", "7B-2B", "8C", "9A", etc.
    const match = aba.match(/^([1-9][A-Za-z])/);
    if (match) {
      turmasSet.add(match[1].toUpperCase());
    }
  });

  return Array.from(turmasSet).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/**
 * Informações de mapeamento da turma diagnóstica
 */
export interface InfoTurmaHistorica {
  turmaAtual: string;            // ex: "7A"
  turmaHistorica: string;        // ex: "6A" no 1º Bimestre; "7A" nos demais
  nivelHistorico: string | null; // ex: "6"
  isFundamental1: boolean;       // true se for 6º ano no 1º bimestre (transição)
  motivoAviso?: string;          // Mensagem pedagógica quando não há dados (6º ano)
}

/**
 * Calcula a turma e nível histórico alvo:
 * - No 1º Bimestre:
 *   - 7º Ano (ex: 7A) -> busca o 6º Ano (6A), pois os alunos estavam no 6º ano no ano anterior
 *   - 8º Ano (ex: 8A) -> busca o 7º Ano (7A)
 *   - 9º Ano (ex: 9A) -> busca o 8º Ano (8A)
 *   - 6º Ano (ex: 6A) -> os alunos vieram do 5º Ano (Fundamental I) e não há dados na planilha dos Anos Finais
 * - Nos 2º, 3º e 4º Bimestres:
 *   - Mantém a mesma turma (6A busca 6A, 7A busca 7A) para recuperação contínua do bimestre anterior
 */
export function obterTurmaHistoricaAlvo(
  turmaAtualPadronizada: string,
  bimestreAtual: string
): InfoTurmaHistorica {
  const t = (turmaAtualPadronizada || "").trim().toUpperCase();
  const b = bimestreAtual || "1º Bimestre";
  const isPrimeiroBimestre = b.includes("1");

  if (!isPrimeiroBimestre) {
    return {
      turmaAtual: t,
      turmaHistorica: t,
      nivelHistorico: extrairNivelEscolar(t),
      isFundamental1: false,
    };
  }

  // 1º Bimestre: Coorte histórica dos alunos no ano letivo anterior
  const nivel = extrairNivelEscolar(t); // ex: "7", "6"
  const letra = extrairLetraTurma(t) || "A";

  if (nivel === "6") {
    // 6º Ano: no ano anterior estavam no 5º Ano (Fundamental I)
    return {
      turmaAtual: t,
      turmaHistorica: `5${letra}`,
      nivelHistorico: "5",
      isFundamental1: true,
      motivoAviso: `Os estudantes do ${t || "6º Ano"} ingressaram recentemente no Ensino Fundamental II (Anos Finais) vindos do 5º Ano (Fundamental I). Como a planilha diagnóstica da escola contempla turmas do 6º ao 9º ano, não há dados históricos do 5º Ano cadastrados. Realize uma sondagem diagnóstica inicial em sala de aula e anote os descritores diretamente no campo de texto abaixo.`,
    };
  }

  if (nivel && parseInt(nivel, 10) > 6) {
    const nivelAnterior = String(parseInt(nivel, 10) - 1);
    const turmaAnterior = `${nivelAnterior}${letra}`;
    return {
      turmaAtual: t,
      turmaHistorica: turmaAnterior,
      nivelHistorico: nivelAnterior,
      isFundamental1: false,
    };
  }

  return {
    turmaAtual: t,
    turmaHistorica: t,
    nivelHistorico: nivel,
    isFundamental1: false,
  };
}

/**
 * Identifica qual bimestre da planilha buscar para recuperação:
 * - Se o plano for do 1º Bimestre -> busca "1B" (diagnóstico)
 * - Se o plano for do 2º Bimestre -> busca "1B"
 * - Se o plano for do 3º Bimestre -> busca "2B"
 * - Se o plano for do 4º Bimestre -> busca "3B"
 */
export function obterSufixoBimestreRecuperacao(bimestreAtual: string): string {
  const b = bimestreAtual || "";
  if (b.includes("2")) return "1B";
  if (b.includes("3")) return "2B";
  if (b.includes("4")) return "3B";
  // 1º Bimestre: busca a avaliação diagnóstica inicial (1B)
  return "1B";
}

/**
 * Filtra as abas da planilha restringindo pelo nível escolar detectado (ex: "7")
 */
export function filtrarAbasPorNivel(todasAbas: string[], nivel: string | null): string[] {
  if (!nivel) return todasAbas;
  return todasAbas.filter((aba) => aba.startsWith(nivel));
}

/**
 * Limpa códigos e sufixos numéricos do nome do componente (ex: "Matemática - 2700" -> "Matemática")
 */
export function limparNomeComponente(nome: string): string {
  if (!nome) return "";
  return nome
    .replace(/\s*[-–]\s*\d+\s*$/, "") // remove sufixo como "- 2700" ou "- 2800"
    .replace(/\s*\(\s*\d+\s*\)\s*$/, "") // remove sufixo como "(2700)"
    .trim();
}

/**
 * Extrai todas as disciplinas únicas presentes na coluna D (índice 3) de uma aba ou de todas as abas
 */
export async function obterDisciplinasDaPlanilhaDiagnostico(
  abaNome?: string,
  customUrl?: string
): Promise<string[]> {
  const wb = await getGoogleWorkbook(customUrl);
  if (!wb) return [];

  const disciplinasSet = new Set<string>();
  const abasParaVarredura = abaNome && wb.Sheets[abaNome] ? [abaNome] : wb.SheetNames;

  abasParaVarredura.forEach((aba) => {
    const ws = wb.Sheets[aba];
    if (!ws) return;
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    rawRows.forEach((row) => {
      if (!row || row.length < 4) return;
      const compBruto = String(row[3] || "").trim(); // Coluna D (índice 3)
      const comp = limparNomeComponente(compBruto);
      if (
        comp &&
        comp.toLowerCase() !== "componente" &&
        comp.toLowerCase() !== "disciplina" &&
        comp.toLowerCase() !== "matéria" &&
        comp.length < 50
      ) {
        disciplinasSet.add(comp);
      }
    });
  });

  return Array.from(disciplinasSet).sort();
}

/**
 * Carrega e extrai os descritores de uma aba específica, filtrando pelo Componente Curricular (Coluna D)
 */
export async function carregarDescritoresDaAba(
  abaNome: string,
  componenteFiltro?: string,
  customUrl?: string
): Promise<DescritorHabilidade[]> {
  const wb = await getGoogleWorkbook(customUrl);
  if (!wb) return [];
  const ws = wb.Sheets[abaNome];
  if (!ws) return [];

  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const descritores: DescritorHabilidade[] = [];

  const compFiltroNorm = componenteFiltro ? normalizarTexto(limparNomeComponente(componenteFiltro)) : "";

  rawRows.forEach((row, idx) => {
    if (!row || row.length < 3) return;

    const ano = String(row[0] || "").trim();
    const taxaRaw = String(row[1] || "").trim();
    const taxa = formatarPorcentagem2Casas(taxaRaw);
    const descricao = String(row[2] || "").trim();
    const componenteBruto = String(row[3] || "").trim(); // Coluna D (Componente Curricular)
    const componenteLimpo = limparNomeComponente(componenteBruto);
    const linkMaterial = String(row[4] || "").trim();    // Coluna E (Material)
    const linkQuestao = String(row[5] || "").trim();     // Coluna F (Questão)

    if (!descricao || descricao.toLowerCase() === "descritor") return;

    // Se houver componente configurado e for diferente de vazio/"todos", filtra
    if (compFiltroNorm && componenteBruto) {
      const rowCompNorm = normalizarTexto(componenteLimpo);
      // Confere igualdade direta ou abrangência
      const matches =
        rowCompNorm === compFiltroNorm ||
        rowCompNorm.includes(compFiltroNorm) ||
        compFiltroNorm.includes(rowCompNorm) ||
        (compFiltroNorm.includes("portugues") && rowCompNorm.includes("portugues")) ||
        (compFiltroNorm.includes("matemat") && rowCompNorm.includes("matemat")) ||
        (compFiltroNorm.includes("cienc") && rowCompNorm.includes("cienc")) ||
        (compFiltroNorm.includes("ingl") && rowCompNorm.includes("ingl")) ||
        (compFiltroNorm.includes("hist") && rowCompNorm.includes("hist")) ||
        (compFiltroNorm.includes("geog") && rowCompNorm.includes("geog")) ||
        (compFiltroNorm.includes("tecnolog") && rowCompNorm.includes("tecnolog")) ||
        (compFiltroNorm.includes("arte") && rowCompNorm.includes("arte")) ||
        (compFiltroNorm.includes("educacao fisica") && rowCompNorm.includes("fisica"));

      if (!matches) {
        return;
      }
    }

    descritores.push({
      id: `${abaNome}_${idx}`,
      anoEscolar: ano,
      taxaAcerto: taxa,
      descricao: descricao,
      componente: componenteLimpo,
      linkMaterial: linkMaterial,
      linkQuestao: linkQuestao,
      linkDrive: linkQuestao, // retrocompatibilidade
      abaOrigem: abaNome,
    });
  });

  // Ordena sempre em ordem crescente da menor porcentagem para a maior
  return descritores.sort((a, b) => {
    const valA = extrairValorPorcentagem(a.taxaAcerto);
    const valB = extrairValorPorcentagem(b.taxaAcerto);
    return valA - valB;
  });
}

