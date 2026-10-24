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
  componente: string;       // ex: "MATEMÁTICA"
  linkMaterial?: string;    // CMSP
  linkDrive?: string;       // Drive
  abaOrigem: string;        // ex: "7A-1B"
}

// Cache em memória do workbook completo baixado para não fazer requisições repetidas
let cachedWorkbook: XLSX.WorkBook | null = null;
let isFetchingWorkbook = false;

/**
 * Baixa e armazena em cache o XLSX completo da planilha caso configurada
 */
export async function getGoogleWorkbook(customUrl?: string): Promise<XLSX.WorkBook | null> {
  if (cachedWorkbook) {
    return cachedWorkbook;
  }

  const url = customUrl || GOOGLE_SHEET_XLSX_URL;
  if (!url) {
    return null;
  }

  // Tenta baixar via fetch
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao conectar à planilha. Status: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  cachedWorkbook = XLSX.read(arrayBuffer, { type: "array" });
  return cachedWorkbook;
}


/**
 * Retorna todos os nomes de abas existentes na planilha
 */
export async function getSheetNames(): Promise<string[]> {
  const wb = await getGoogleWorkbook();
  return wb ? wb.SheetNames : [];
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
 * Carrega e extrai os descritores de uma aba específica, filtrando pelo Componente Curricular
 */
export async function carregarDescritoresDaAba(
  abaNome: string,
  componenteFiltro?: string
): Promise<DescritorHabilidade[]> {
  const wb = await getGoogleWorkbook();
  if (!wb) return [];
  const ws = wb.Sheets[abaNome];
  if (!ws) return [];


  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const descritores: DescritorHabilidade[] = [];

  const compFiltroNorm = componenteFiltro ? normalizarTexto(componenteFiltro) : "";

  rawRows.forEach((row, idx) => {
    if (!row || row.length < 3) return;

    const ano = String(row[0] || "").trim();
    const taxaRaw = String(row[1] || "").trim();
    const taxa = formatarPorcentagem2Casas(taxaRaw);
    const descricao = String(row[2] || "").trim();
    const componente = String(row[3] || "").trim();
    const linkCMSP = String(row[4] || "").trim();
    const linkDrive = String(row[5] || "").trim();

    if (!descricao || descricao.toLowerCase() === "descritor") return;

    // Se houver componente configurado, filtra (ex: "Matemática" bate com "MATEMÁTICA")
    if (compFiltroNorm && componente) {
      const rowCompNorm = normalizarTexto(componente);
      // Confere se um contém o outro (ex: "matematica" em "matematica", "lingua portuguesa" em "portuguesa")
      const matches =
        rowCompNorm.includes(compFiltroNorm) ||
        compFiltroNorm.includes(rowCompNorm) ||
        (compFiltroNorm.includes("portugues") && rowCompNorm.includes("portugues")) ||
        (compFiltroNorm.includes("matemat") && rowCompNorm.includes("matemat")) ||
        (compFiltroNorm.includes("cienc") && rowCompNorm.includes("cienc")) ||
        (compFiltroNorm.includes("ingl") && rowCompNorm.includes("ingl")) ||
        (compFiltroNorm.includes("hist") && rowCompNorm.includes("hist")) ||
        (compFiltroNorm.includes("geog") && rowCompNorm.includes("geog")) ||
        (compFiltroNorm.includes("tecnolog") && rowCompNorm.includes("tecnolog"));

      if (!matches) {
        return;
      }
    }

    descritores.push({
      id: `${abaNome}_${idx}`,
      anoEscolar: ano,
      taxaAcerto: taxa,
      descricao: descricao,
      componente: componente,
      linkMaterial: linkCMSP,
      linkDrive: linkDrive,
      abaOrigem: abaNome,
    });
  });

  return descritores;
}
