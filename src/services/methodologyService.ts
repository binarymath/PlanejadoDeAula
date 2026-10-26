import { obterPlanilha, linhasDaAba } from "./sheetCache";
import metodologiasLocais from "../config/metodologias_ativas.json";

export const METODOLOGIAS_SHEET_ID = "";
export const METODOLOGIAS_XLSX_URL = METODOLOGIAS_SHEET_ID
  ? `https://docs.google.com/spreadsheets/d/${METODOLOGIAS_SHEET_ID}/export?format=xlsx`
  : "";

export interface MetodologiaAtivaItem {
  id: string;
  categoriaReferencia: string; // Ex: "Aula Nota 10 (Teach Like a Champion)"
  autorReferencia: string;     // Ex: "Doug Lemov"
  metodologiaAtiva: string;    // Ex: "Sem Escapatória / Sem Saída (No Opt Out)"
  definicaoDescricao: string;  // Ex: "Sequência instrucional que começa..."
  exemploPratico: string;      // Ex: "Quando um estudante disser..."
  modalidadeRecomendada: string; // Coluna I (ou Col F): "Individual", "Toda a Turma", "Em Grupo", etc.
}


export async function carregarMetodologiasAtivas(customUrl?: string): Promise<MetodologiaAtivaItem[]> {
  const rawUrl = (customUrl || METODOLOGIAS_XLSX_URL).trim();
  let targetUrl = rawUrl;
  const match = rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    targetUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`;
  }

  try {
    if (targetUrl) {
      const planilha = await obterPlanilha(targetUrl);
      const rows = linhasDaAba(planilha, planilha.sheetNames[0]);
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
