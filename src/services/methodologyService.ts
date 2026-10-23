import * as XLSX from "xlsx";
import metodologiasLocais from "../config/metodologias_ativas.json";

export const METODOLOGIAS_SHEET_ID = "119__yTf8XwVuvv3lFbu67RcsklH5ZJkNo_7jkDOr_Fk";
export const METODOLOGIAS_XLSX_URL = `https://docs.google.com/spreadsheets/d/${METODOLOGIAS_SHEET_ID}/export?format=xlsx`;

export interface MetodologiaAtivaItem {
  id: string;
  categoriaReferencia: string; // Ex: "Aula Nota 10 (Teach Like a Champion)"
  autorReferencia: string;     // Ex: "Doug Lemov"
  metodologiaAtiva: string;    // Ex: "Sem Escapatória / Sem Saída (No Opt Out)"
  definicaoDescricao: string;  // Ex: "Sequência instrucional que começa..."
  exemploPratico: string;      // Ex: "Quando um estudante disser..."
  modalidadeRecomendada: string; // Coluna I (ou Col F): "Individual", "Toda a Turma", "Em Grupo", etc.
}

let cachedMetodologiasWorkbook: XLSX.WorkBook | null = null;

export async function carregarMetodologiasAtivas(): Promise<MetodologiaAtivaItem[]> {
  try {
    if (!cachedMetodologiasWorkbook) {
      const resp = await fetch(METODOLOGIAS_XLSX_URL);
      if (resp.ok) {
        const ab = await resp.arrayBuffer();
        cachedMetodologiasWorkbook = XLSX.read(ab, { type: "array" });
      }
    }

    if (cachedMetodologiasWorkbook) {
      const sheetName = cachedMetodologiasWorkbook.SheetNames[0];
      const ws = cachedMetodologiasWorkbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      const itens: MetodologiaAtivaItem[] = [];

      rows.slice(1).forEach((r, idx) => {
        if (r[2] || r[0]) {
          const modalidade = String(r[5] || r[8] || "Individual").trim();
          itens.push({
            id: `met_${idx + 1}`,
            categoriaReferencia: String(r[0] || "").trim(),
            autorReferencia: String(r[1] || "").trim(),
            metodologiaAtiva: String(r[2] || "").trim(),
            definicaoDescricao: String(r[3] || "").trim(),
            exemploPratico: String(r[4] || "").trim(),
            modalidadeRecomendada: modalidade || "Individual",
          });
        }
      });

      if (itens.length > 0) return itens;
    }
  } catch (err) {
    console.warn("Utilizando catálogo local de metodologias ativas:", err);
  }

  return (metodologiasLocais as MetodologiaAtivaItem[]).map((m) => ({
    ...m,
    modalidadeRecomendada: m.modalidadeRecomendada || "Individual",
  }));
}
