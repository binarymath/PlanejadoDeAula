import * as XLSX from "xlsx";

export interface PlanilhaParseada {
  sheetNames: string[];
  sheets: Record<string, any[][]>;
}

/**
 * Converte o binário XLSX em linhas brutas por aba (equivalente a sheet_to_json com header: 1).
 * Opções de leitura enxutas: ignora fórmulas, estilos e HTML, que não são usados pelo app.
 */
export function parseWorkbookBuffer(buffer: ArrayBuffer): PlanilhaParseada {
  const wb = XLSX.read(buffer, {
    type: "array",
    cellFormula: false,
    cellHTML: false,
    cellStyles: false,
    cellNF: false,
    sheetStubs: false,
    bookVBA: false,
  });
  const sheets: Record<string, any[][]> = {};
  wb.SheetNames.forEach((name) => {
    const ws = wb.Sheets[name];
    sheets[name] = ws ? (XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][]) : [];
  });
  return { sheetNames: wb.SheetNames, sheets };
}
