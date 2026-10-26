import { obterPlanilha, linhasDaAba, linhasParaObjetos } from "./sheetCache";

/**
 * Utilitário para buscar e ler dados de uma planilha (CSV, XLSX, Google Sheets)
 * @param url Endereço da planilha (URL da web ou caminho local /public)
 * @param sheetTab Nome opcional da aba
 * @param forcar Ignora o cache e baixa a versão mais recente
 */
export async function fetchSpreadsheetData(
  url: string,
  sheetTab?: string,
  forcar = false
): Promise<Record<string, any>[]> {
  if (!url || !url.trim()) {
    throw new Error("Nenhum endereço de planilha informado.");
  }

  const cleanUrl = url.trim();

  // Caso seja Google Sheets publicado ou link direto (cache compartilhado + Web Worker)
  const planilha = await obterPlanilha(cleanUrl, { forcar });

  const targetSheetName = sheetTab && planilha.sheetNames.includes(sheetTab)
    ? sheetTab
    : planilha.sheetNames[0];

  if (!targetSheetName || !planilha.sheets[targetSheetName]) {
    return [];
  }

  // Converte a aba em lista de objetos JSON
  return linhasParaObjetos(linhasDaAba(planilha, targetSheetName));
}

/**
 * Converte linhas de uma planilha em texto formatado para o campo
 */
export function formatRowsToText(rows: Record<string, any>[], preferredColumns?: string[]): string {
  if (!rows || rows.length === 0) return "";

  return rows.map((row) => {
    if (preferredColumns && preferredColumns.length > 0) {
      return preferredColumns
        .map((col) => row[col])
        .filter(Boolean)
        .join(" - ");
    }
    // Caso geral: junta os valores não vazios das colunas
    return Object.values(row).filter((v) => String(v).trim().length > 0).join(" | ");
  }).filter((line) => line.trim().length > 0).join("\n");
}
