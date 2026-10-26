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
  aulas: { numero: number; conteudo: string }[];
  conteudos: string[];
  habilidades: string[];
  descritoresSaresp: string[];
}

function normalizarNomeAba(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function encontrarAbaDisciplina(nomesAbas: string[], disciplina: string): string | undefined {
  const disciplinaNormalizada = normalizarNomeAba(disciplina);
  if (!disciplinaNormalizada) return undefined;

  return nomesAbas.find((nome) => normalizarNomeAba(nome) === disciplinaNormalizada)
    || nomesAbas.find((nome) => {
      const nomeNormalizado = normalizarNomeAba(nome);
      return nomeNormalizado && (
        nomeNormalizado.includes(disciplinaNormalizada)
        || disciplinaNormalizada.includes(nomeNormalizado)
      );
    });
}

function correspondeAnoEscolar(anoLinha: string, anoSelecionado: string): boolean {
  if (!anoLinha || !anoSelecionado) return true;
  const numeroLinha = anoLinha.match(/[6-9]/)?.[0];
  const numeroSelecionado = anoSelecionado.match(/[6-9]/)?.[0];
  return !numeroLinha || !numeroSelecionado || numeroLinha === numeroSelecionado;
}

function normalizarUrlPlanilha(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const publicado = parsedUrl.pathname.match(/\/spreadsheets\/d\/e\/([^/]+)\/(?:pub|pubhtml)/);
    if (publicado) {
      return `${parsedUrl.origin}/spreadsheets/d/e/${publicado[1]}/pub?output=xlsx`;
    }

    const planilha = parsedUrl.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
    if (planilha) {
      return `${parsedUrl.origin}/spreadsheets/d/${planilha[1]}/export?format=xlsx`;
    }
  } catch {
    return url;
  }

  return url;
}


/**
 * Obtém todas as aulas do ano e bimestre informados,
 * primeiro tentando a planilha online caso configurada (com fallback instantâneo no catálogo local).
 */
export async function obterAulasCurriculo(
  anoTexto: string,
  bimestreTexto: string,
  customUrl?: string,
  componenteCurricular?: string
): Promise<AulaCurriculoItem[]> {
  // 1. Detectar o ano escolar
  const anoNorm = anoTexto || "";
  let abaAno = "6º Ano";
  if (anoNorm.includes("7")) abaAno = "7º Ano";
  else if (anoNorm.includes("8")) abaAno = "8º Ano";
  else if (anoNorm.includes("9")) abaAno = "9º Ano";

  // 2. Detectar o bimestre
  const bimNorm = bimestreTexto || "1º Bimestre";
  const bimNumero = bimNorm.match(/([1234])/)?.[1] || "1";
  const bimEsperado = `${bimNumero}º Bimestre`;

  const rawUrl = (customUrl || CURRICULO_XLSX_URL).trim();
  const targetUrl = normalizarUrlPlanilha(rawUrl);

  // Tenta carregar da planilha remota se uma URL válida for configurada (cache compartilhado)
  let planilha: PlanilhaParseada | null = null;
  let erroLeitura: unknown;
  try {
    if (targetUrl) {
      planilha = await obterPlanilha(targetUrl);
    }
  } catch (err) {
    erroLeitura = err instanceof TypeError && /fetch/i.test(err.message)
      ? new Error("Falha ao buscar a planilha. Verifique se o link está acessível sem login e se a planilha foi compartilhada ou publicada na Web.")
      : err;
    console.warn("Erro ao ler planilha de currículo:", err);
  }

  if (planilha) {
    const abaDisciplina = componenteCurricular
      ? encontrarAbaDisciplina(planilha.sheetNames, componenteCurricular)
      : undefined;

    if (componenteCurricular && !abaDisciplina) {
      throw new Error(
        `Não foi encontrada uma aba para a disciplina "${componenteCurricular}". Abas disponíveis: ${planilha.sheetNames.join(", ")}.`
      );
    }

    const sheetName = abaDisciplina || abaAno;
    const rows = planilha.sheets[sheetName];
    if (rows) {
      const itens: AulaCurriculoItem[] = [];
      rows.slice(1).forEach((r, idx) => {
        const [ano, bim, aula, conteudo, objetivos, habs, ae, descritor] = r;
        const anoRow = String(ano || "").trim();
        const bimRow = String(bim || "").trim();
        if (
          correspondeAnoEscolar(anoRow, anoNorm)
          && bimRow.includes(`${bimNumero}º`)
        ) {
          itens.push({
            id: `${sheetName}_${idx + 1}`,
            anoEscolar: anoRow || abaAno,
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

      // A aba remota selecionada é a fonte da disciplina; não substitua dados vazios por Matemática local.
      return [];
    }
  }

  if (componenteCurricular && erroLeitura) {
    throw erroLeitura;
  }

  // Sem uma leitura válida da aba da disciplina, não use o catálogo local exclusivo de Matemática.
  if (componenteCurricular) {
    return [];
  }

  // Se não foi informada ou conectada nenhuma planilha, não traz dados pré-definidos
  if (!targetUrl) {
    return [];
  }

  // Fallback nos dados locais catalogados somente se o usuário estava tentando ler uma planilha existente
  const localAba = (curriculoLocal as Record<string, AulaCurriculoItem[]>)[abaAno] || [];
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
        aulas: [],
        conteudos: [],
        habilidades: [],
        descritoresSaresp: [],
      });
    }

    const g = gruposMap.get(ae)!;
    g.aulasCount += 1;
    g.aulas.push({ numero: item.aula, conteudo: item.conteudo });
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
