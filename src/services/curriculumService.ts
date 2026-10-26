import { obterPlanilha, PlanilhaParseada } from "./sheetCache";
import curriculoLocal from "../config/curriculo_matematica.json";

export const CURRICULO_SHEET_ID = "";
export const CURRICULO_XLSX_URL = CURRICULO_SHEET_ID
  ? `https://docs.google.com/spreadsheets/d/${CURRICULO_SHEET_ID}/export?format=xlsx`
  : "";

export interface AulaCurriculoItem {
  id: string;
  anoEscolar: string;
  bimestre: string;
  aula: number;
  conteudo: string;
  objetivos: string;
  habilidades: string;
  aprendizagemEssencial: string;
  descritorSaresp: string;
}

export interface GrupoAprendizagemEssencial {
  id: string;
  aprendizagemEssencial: string;
  aulasCount: number;
  conteudos: string[];
  habilidades: string[];
  descritoresSaresp: string[];
}


/**
 * Obtém todas as aulas do ano e bimestre informados,
 * primeiro tentando a planilha online caso configurada (com fallback instantâneo no catálogo local).
 */
export async function obterAulasCurriculo(
  anoTexto: string,
  bimestreTexto: string,
  customUrl?: string
): Promise<AulaCurriculoItem[]> {
  // 1. Detectar o ano escolar
  const anoNorm = anoTexto || "";
  let sheetName = "6º Ano";
  if (anoNorm.includes("7")) sheetName = "7º Ano";
  else if (anoNorm.includes("8")) sheetName = "8º Ano";
  else if (anoNorm.includes("9")) sheetName = "9º Ano";

  // 2. Detectar o bimestre
  const bimNorm = bimestreTexto || "1º Bimestre";
  const bimNumero = bimNorm.match(/([1234])/)?.[1] || "1";
  const bimEsperado = `${bimNumero}º Bimestre`;

  const rawUrl = (customUrl || CURRICULO_XLSX_URL).trim();
  let targetUrl = rawUrl;
  const match = rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    targetUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`;
  }

  // Tenta carregar da planilha remota se uma URL válida for configurada (cache compartilhado)
  let planilha: PlanilhaParseada | null = null;
  try {
    if (targetUrl) {
      planilha = await obterPlanilha(targetUrl);
    }

    if (planilha && planilha.sheets[sheetName]) {
      const rows: any[][] = planilha.sheets[sheetName];
      const itens: AulaCurriculoItem[] = [];
      rows.slice(1).forEach((r, idx) => {
        const [ano, bim, aula, conteudo, objetivos, habs, ae, descritor] = r;
        const bimRow = String(bim || "").trim();
        if (bimRow.includes(`${bimNumero}º`)) {
          itens.push({
            id: `${sheetName}_${idx + 1}`,
            anoEscolar: String(ano || sheetName).trim(),
            bimestre: bimRow,
            aula: Number(aula) || idx + 1,
            conteudo: String(conteudo || "").trim(),
            objetivos: String(objetivos || "").trim(),
            habilidades: String(habs || "").trim(),
            aprendizagemEssencial: String(ae || "").trim(),
            descritorSaresp: String(descritor || "").trim(),
          });
        }
      });
      if (itens.length > 0) return itens;
    }
  } catch (err) {
    console.warn("Erro ao ler planilha de currículo:", err);
  }

  // Se não foi informada ou conectada nenhuma planilha, não traz dados pré-definidos
  if (!targetUrl) {
    return [];
  }

  // Fallback nos dados locais catalogados somente se o usuário estava tentando ler uma planilha existente
  const localAba = (curriculoLocal as Record<string, AulaCurriculoItem[]>)[sheetName] || [];
  return localAba.filter((item) => item.bimestre.includes(`${bimNumero}º`));
}

/**
 * Agrupa as aulas por Aprendizagem Essencial (AE)
 */
export function agruparPorAprendizagemEssencial(
  aulas: AulaCurriculoItem[]
): GrupoAprendizagemEssencial[] {
  const gruposMap = new Map<string, GrupoAprendizagemEssencial>();

  aulas.forEach((item) => {
    const ae = item.aprendizagemEssencial.trim();
    if (!ae) return;

    if (!gruposMap.has(ae)) {
      gruposMap.set(ae, {
        id: ae,
        aprendizagemEssencial: ae,
        aulasCount: 0,
        conteudos: [],
        habilidades: [],
        descritoresSaresp: [],
      });
    }

    const g = gruposMap.get(ae)!;
    g.aulasCount += 1;
    if (item.conteudo && !g.conteudos.includes(item.conteudo)) {
      g.conteudos.push(item.conteudo);
    }
    if (item.habilidades) {
      item.habilidades.split(",").forEach((h) => {
        const hClean = h.trim();
        if (hClean && !g.habilidades.includes(hClean)) {
          g.habilidades.push(hClean);
        }
      });
    }
    if (item.descritorSaresp) {
      item.descritorSaresp.split("/").forEach((d) => {
        const dClean = d.trim();
        if (dClean && !g.descritoresSaresp.includes(dClean)) {
          g.descritoresSaresp.push(dClean);
        }
      });
    }
  });

  return Array.from(gruposMap.values());
}
