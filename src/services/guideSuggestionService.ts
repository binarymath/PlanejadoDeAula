import { LessonPlanState } from "../types/lessonPlan";
import { STORAGE_KEYS, aplicarDisciplinaSelecionada } from "./configLinksService";
import {
  getSheetNames,
  obterTurmaHistoricaAlvo,
  obterSufixoBimestreRecuperacao,
  carregarDescritoresDaAba,
  padronizarNomeTurma,
  formatarPorcentagem2Casas,
  extrairValorPorcentagem,
} from "./googleSheetsService";
import {
  obterAulasCurriculo,
  agruparPorAprendizagemEssencial,
  formatarLinhaAprendizagemEssencial,
  AulaCurriculoItem,
} from "./curriculumService";
import { CINCO_GRANDES_BLOCOS_SOCIOEMOCIONAIS } from "../config/competenciasSocioemocionaisBNCC";
import {
  obterSemanasEstruturadas,
  gerarCronogramaPorDatas,
} from "../utils/scheduleHelper";
import { ColunaCurriculoOpcao } from "./geminiScheduleService";
import { carregarMetodologiasAtivas, MetodologiaAtivaItem } from "./methodologyService";
import { fetchAvaliacaoPlanilha, AVALIACOES_PADRAO } from "./evaluationService";
import { fetchReferenciasPlanilha, REFERENCIAS_PADRAO } from "./referencesService";

export type ModoPreenchimentoGuia = "apenas_vazios" | "substituir_tudo";
export type RegraDiagnosticoOpcao = "top2" | "top3" | "top5" | "abaixo50";

export interface SecoesSelecionadasGuia {
  diagnostico: boolean;
  conteudos: boolean;
  socioemocional: boolean;
  cronograma: boolean;
  metodologia: boolean;
  avaliacao: boolean;
  referencias: boolean;
}

export interface OpcoesSugestaoGuia {
  modoPreenchimento: ModoPreenchimentoGuia;
  regraDiagnostico: RegraDiagnosticoOpcao;
  colunaCronograma: ColunaCurriculoOpcao;
  quantidadeMetodologias: 3 | 5;
  secoes: SecoesSelecionadasGuia;
}

export interface ResumoSecaoGerada {
  idAba: string;
  titulo: string;
  campo: keyof LessonPlanState;
  aplicado: boolean;
  preservado: boolean;
  resumo: string;
  aviso?: string;
}

export interface ResultadoSugestaoGuia {
  camposAtualizados: Partial<LessonPlanState>;
  relatorio: ResumoSecaoGerada[];
}

export const OPCOES_SUGESTAO_PADRAO: OpcoesSugestaoGuia = {
  modoPreenchimento: "substituir_tudo",
  regraDiagnostico: "top2",
  colunaCronograma: "conteudo",
  quantidadeMetodologias: 3,
  secoes: {
    diagnostico: true,
    conteudos: true,
    socioemocional: true,
    cronograma: true,
    metodologia: true,
    avaliacao: true,
    referencias: true,
  },
};

function formatarNomeSalaDaAba(aba: string): string {
  const match = aba.match(/^(\d)\s*([A-Za-z])/);
  if (match) return `${match[1]}${match[2].toUpperCase()}`;
  return aba.replace(/[-–].*$/, "").trim().toUpperCase();
}

/**
 * 2. Gera texto para Diagnóstico / Aprendizagens Não Consolidadas
 * Por padrão apresenta apenas as 2 aprendizagens com menor aproveitamento.
 */
async function sugerirDiagnostico(
  data: LessonPlanState,
  regra: RegraDiagnosticoOpcao
): Promise<{ texto: string; resumo: string; aviso?: string }> {
  const urlAtual = (localStorage.getItem(STORAGE_KEYS.DIAGNOSTICO) || "").trim();
  const urlAnterior = (localStorage.getItem(STORAGE_KEYS.DIAGNOSTICO_ANTERIOR) || "").trim();

  const turmasCadastradas = Array.from(
    new Set(
      (data.turmas || [])
        .map((t) => padronizarNomeTurma(t.nome))
        .filter((n) => n.length > 0)
    )
  );
  if (turmasCadastradas.length === 0 && data.anoEscolar) {
    const tFallback = padronizarNomeTurma(data.anoEscolar);
    if (tFallback) turmasCadastradas.push(tFallback);
  }

  const isPrimeiroBimestre = (data.bimestre || "").includes("1");
  const sufixoBim = obterSufixoBimestreRecuperacao(data.bimestre);

  if (!urlAtual && !urlAnterior) {
    const turmasStr = turmasCadastradas.length > 0 ? turmasCadastradas.join(", ") : data.anoEscolar || "Turma";
    const textoFallback = isPrimeiroBimestre
      ? `• [${turmasStr}: Sondagem Inicial]: Retomada e diagnóstico das duas aprendizagens essenciais com menor aproveitamento do ano anterior para nivelamento da turma.`
      : `• [${turmasStr}: Recuperação Contínua]: Retomada das duas habilidades essenciais com menor índice de aproveitamento no bimestre anterior.`;
    return {
      texto: textoFallback,
      resumo: "Texto orientador de sondagem inserido (nenhuma planilha diagnóstica conectada).",
      aviso: "Conecte a planilha de Diagnóstico na Aba 2 para puxar as 2 aprendizagens com menor aproveitamento de cada turma.",
    };
  }

  try {
    const [abasAtuais, abasAnteriores] = await Promise.all([
      urlAtual ? getSheetNames(urlAtual).catch(() => [] as string[]) : Promise.resolve([] as string[]),
      urlAnterior ? getSheetNames(urlAnterior).catch(() => [] as string[]) : Promise.resolve([] as string[]),
    ]);

    const mapaAgrupado = new Map<string, { sala: string; taxa: string; valorNum: number }[]>();
    let totalTurmasComDados = 0;

    for (const turmaNome of turmasCadastradas) {
      const infoHist = obterTurmaHistoricaAlvo(turmaNome, data.bimestre);
      // No 1º bimestre, prioriza a planilha anterior (ou atual) buscando a coorte histórica
      const usarAnteriorPrimeiro = isPrimeiroBimestre && abasAnteriores.length > 0;
      const listaFontes: { url: string; abas: string[] }[] = usarAnteriorPrimeiro
        ? [
            { url: urlAnterior, abas: abasAnteriores },
            { url: urlAtual, abas: abasAtuais },
          ]
        : [
            { url: urlAtual, abas: abasAtuais },
            { url: urlAnterior, abas: abasAnteriores },
          ];

      let abaEncontrada = "";
      let urlEncontrada = "";

      for (const fonte of listaFontes) {
        if (!fonte.url || fonte.abas.length === 0) continue;
        const alvosSala = [infoHist.turmaHistorica, infoHist.turmaAtual].filter(Boolean);

        for (const alvo of alvosSala) {
          const matchExato =
            fonte.abas.find(
              (a) => formatarNomeSalaDaAba(a) === alvo && a.toUpperCase().includes(sufixoBim)
            ) || fonte.abas.find((a) => formatarNomeSalaDaAba(a) === alvo);
          if (matchExato) {
            abaEncontrada = matchExato;
            urlEncontrada = fonte.url;
            break;
          }
        }
        if (abaEncontrada) break;
      }

      if (!abaEncontrada || !urlEncontrada) continue;

      // carregarDescritoresDaAba já retorna ordenado da menor taxa de acerto para a maior
      const descritores = await carregarDescritoresDaAba(
        abaEncontrada,
        data.componenteCurricular,
        urlEncontrada
      );

      if (descritores.length === 0) continue;
      totalTurmasComDados++;

      let selecionados = descritores;
      if (regra === "top2") {
        selecionados = descritores.slice(0, 2);
      } else if (regra === "top3") {
        selecionados = descritores.slice(0, 3);
      } else if (regra === "top5") {
        selecionados = descritores.slice(0, 5);
      } else if (regra === "abaixo50") {
        const abaixo = descritores.filter((d) => extrairValorPorcentagem(d.taxaAcerto) < 50);
        selecionados = abaixo.length > 0 ? abaixo : descritores.slice(0, 2);
      }

      const salaRotulo = formatarNomeSalaDaAba(abaEncontrada);
      selecionados.forEach((item) => {
        const taxaFmt = formatarPorcentagem2Casas(item.taxaAcerto);
        const valorNum = extrairValorPorcentagem(item.taxaAcerto);
        const listaSalas = mapaAgrupado.get(item.descricao) || [];
        const idx = listaSalas.findIndex((t) => t.sala === salaRotulo);
        if (idx >= 0) {
          listaSalas[idx].taxa = taxaFmt;
          listaSalas[idx].valorNum = valorNum;
        } else {
          listaSalas.push({ sala: salaRotulo, taxa: taxaFmt, valorNum });
        }
        mapaAgrupado.set(item.descricao, listaSalas);
      });
    }

    if (mapaAgrupado.size === 0) {
      const turmasStr = turmasCadastradas.join(", ") || "Turma";
      return {
        texto: `• [${turmasStr}: Sondagem Diagnóstica]: Acompanhamento e recomposição das 2 habilidades prioritárias de menor aproveitamento em ${data.componenteCurricular || "componente"}.`,
        resumo: "Texto padrão de recomposição inserido (sem descritores específicos para a turma/disciplina na planilha).",
        aviso: "Você pode selecionar ou ajustar os descritores diretamente na Aba 2.",
      };
    }

    // Mantém todas as habilidades selecionadas de cada sala (2 por sala):
    // - Se duas ou mais turmas erraram a mesma habilidade, elas já estão unificadas na mesma entrada (conta como uma linha agrupada).
    // - Se erraram habilidades diferentes, mantém uma linha para a habilidade de cada sala.
    const entradasOrdenadas = Array.from(mapaAgrupado.entries()).sort((a, b) => {
      const mediaA = a[1].reduce((acc, cur) => acc + cur.valorNum, 0) / a[1].length;
      const mediaB = b[1].reduce((acc, cur) => acc + cur.valorNum, 0) / b[1].length;
      return mediaA - mediaB;
    });

    const linhas: string[] = [];
    entradasOrdenadas.forEach(([desc, turmas]) => {
      turmas.sort((a, b) => a.sala.localeCompare(b.sala, "pt-BR"));
      const headerSalas = turmas.map((t) => `${t.sala}: ${t.taxa}`).join(" | ");
      linhas.push(`• [${headerSalas}]: ${desc}`);
    });

    return {
      texto: linhas.join("\n"),
      resumo: `${entradasOrdenadas.length} aprendizagem(ns) consolidada(s) a partir das 2 de menor acerto de cada uma das ${totalTurmasComDados} turma(s).`,
    };
  } catch (err) {
    console.warn("Erro ao sugerir diagnóstico:", err);
    return {
      texto: `• [${data.anoEscolar || "Turmas"}: Sondagem e Nivelamento]: Recomposição das 2 aprendizagens essenciais de menor aproveitamento.`,
      resumo: "Texto base de recomposição inserido.",
      aviso: "Verifique a conexão da planilha na Aba 2 se desejar listar taxas por habilidade.",
    };
  }
}

/**
 * 3. Gera texto para Unidades Temáticas e Objetos de Conhecimento + retorna aulas carregadas
 * Traz todas as AEs do bimestre, incluindo combinadas no formato [AE1/AE2]: ...
 */
async function sugerirConteudosECurriculo(
  data: LessonPlanState
): Promise<{
  texto: string;
  resumo: string;
  aviso?: string;
  aulas: AulaCurriculoItem[];
}> {
  if (data.componenteCurricular) {
    aplicarDisciplinaSelecionada(data.componenteCurricular);
  }
  const urlCurriculo = (localStorage.getItem(STORAGE_KEYS.CURRICULO) || "").trim();
  const anoAtivo =
    data.anoEscolar ||
    (data.turmas && data.turmas.length > 0 && data.turmas[0].nome ? data.turmas[0].nome : "6º Ano");
  const bimestreAtivo = data.bimestre || "1º Bimestre";

  try {
    // Tenta carregar da planilha conectada; se não houver URL conectada e a disciplina for Matemática (ou compatível com o catálogo local), carrega do catálogo local
    let aulas = await obterAulasCurriculo(
      anoAtivo,
      bimestreAtivo,
      urlCurriculo,
      data.componenteCurricular
    );

    if (aulas.length === 0 && (!data.componenteCurricular || /matem[aá]tica/i.test(data.componenteCurricular))) {
      aulas = await obterAulasCurriculo(anoAtivo, bimestreAtivo, "local", "");
    }

    if (aulas.length > 0) {
      const gruposAE = agruparPorAprendizagemEssencial(aulas);
      if (gruposAE.length > 0) {
        const linhas = gruposAE
          .map((g) => formatarLinhaAprendizagemEssencial(g.aprendizagemEssencial))
          .filter(Boolean);

        return {
          texto: linhas.join("\n"),
          resumo: `Todas as ${gruposAE.length} Aprendizagens Essenciais (incluindo compostas como [AE1/AE2]) de ${aulas.length} aulas foram incluídas.`,
          aulas,
        };
      }

      // Caso a planilha tenha aulas mas sem coluna de Aprendizagem Essencial preenchida
      const conteudosUnicos = Array.from(
        new Set(aulas.map((a) => a.conteudo.trim()).filter(Boolean))
      );
      const linhasConteudo = conteudosUnicos.map((c, idx) => `• [AE${idx + 1}]: ${c}`);
      return {
        texto: linhasConteudo.join("\n"),
        resumo: `${conteudosUnicos.length} objetos de conhecimento extraídos da planilha (${aulas.length} aulas).`,
        aulas,
      };
    }
  } catch (err: any) {
    console.warn("Aviso ao buscar currículo para sugestão:", err);
  }

  return {
    texto: `• [AE1]: Desenvolvimento das habilidades estruturantes e objetos de conhecimento de ${data.componenteCurricular || "disciplina"} previstos no Currículo Paulista para o ${bimestreAtivo} (${anoAtivo}).`,
    resumo: "Texto base curricular inserido (planilha de escopo-sequência ainda não conectada).",
    aviso: "Na Aba 3 (Conteúdos), conecte a planilha de Currículo para listar todas as Aprendizagens Essenciais oficiais.",
    aulas: [],
  };
}

/**
 * 4. Gera texto para Competências Socioemocionais:
 * Sorteia randomicamente UMA macrocompetência (evitando repetir a atual ao repreencher)
 */
function sugerirSocioemocionais(textoAtual?: string): { texto: string; resumo: string } {
  const todosBlocos = [...CINCO_GRANDES_BLOCOS_SOCIOEMOCIONAIS];
  const candidatos =
    textoAtual && textoAtual.trim()
      ? todosBlocos.filter(
          (b) => !textoAtual.toLowerCase().includes(b.nome.toLowerCase())
        )
      : todosBlocos;

  const pool = candidatos.length > 0 ? candidatos : todosBlocos;
  const indiceAleatorio = Math.floor(Math.random() * pool.length);
  const bloco = pool[indiceAleatorio] || todosBlocos[0];

  const habs = bloco.habilidades.map((h) => h.nome).join(", ");
  const linha = `• [${bloco.nome}]: ${habs}`;

  return {
    texto: linha,
    resumo: `1 competência socioemocional sorteada (${bloco.nome}).`,
  };
}

/**
 * 5. Gera texto para o Cronograma por Mês e Datas:
 * Traz os números de cada aula naquela semana (ex: "Aula 1: ...", "Aula 2: ...") e inclui TODAS as aulas.
 */
function sugerirCronograma(
  data: LessonPlanState,
  aulasCurriculo: AulaCurriculoItem[],
  colunaEscolhida: ColunaCurriculoOpcao
): { texto: string; resumo: string; aviso?: string } {
  const semanasEstruturadas = obterSemanasEstruturadas(
    data.dataInicioBimestre,
    data.dataFimBimestre,
    data.feriadosExcecoes || [],
    data.turmas || []
  );

  if (semanasEstruturadas.length === 0) {
    return {
      texto: gerarCronogramaPorDatas(
        data.dataInicioBimestre,
        data.dataFimBimestre,
        data.feriadosExcecoes || []
      ),
      resumo: "Datas de início e fim do bimestre pendentes na Identificação.",
      aviso: "Defina as datas do bimestre na Identificação para distribuir as aulas nas semanas.",
    };
  }

  const obterTextoAula = (aula: AulaCurriculoItem): string => {
    switch (colunaEscolhida) {
      case "aprendizagemEssencial":
        return aula.aprendizagemEssencial;
      case "habilidades":
        return aula.habilidades;
      case "objetivos":
        return aula.objetivos;
      case "descritorSaresp":
        return aula.descritorSaresp;
      default:
        return aula.conteudo;
    }
  };

  // Monta todos os itens numerados ("Aula 1: ...", "Aula 2: ...", etc.) sem omitir nenhuma aula
  const itensNumerados = aulasCurriculo
    .map((aula, idx) => {
      const numAula = aula.aula || idx + 1;
      const textoBase = (obterTextoAula(aula) || aula.conteudo || "").trim();
      if (!textoBase) return "";
      return /^Aula\s+\d+\s*:/i.test(textoBase)
        ? textoBase
        : `Aula ${numAula}: ${textoBase}`;
    })
    .filter(Boolean);

  if (itensNumerados.length > 0) {
    const pesos = semanasEstruturadas.map((semana) => semana.aulasPrevistas);
    const pesoTotal = pesos.reduce((total, peso) => total + peso, 0);
    const pesosDistribuicao = pesoTotal > 0 ? pesos : pesos.map(() => 1);
    const capacidadeTotal = pesosDistribuicao.reduce((total, peso) => total + peso, 0);
    const itensPorSemana = semanasEstruturadas.map(() => [] as string[]);
    let acumulado = 0;
    const limites = pesosDistribuicao.map((peso) => {
      acumulado += peso;
      return acumulado;
    });

    // Inclui TODAS as aulas sequencialmente (Aula 1, Aula 2, ..., Aula N) sem descartar duplicatas de título
    itensNumerados.forEach((item, index) => {
      const ponto = ((index + 0.5) / itensNumerados.length) * capacidadeTotal;
      const indiceSemana = limites.findIndex((limite) => ponto < limite);
      const alvo = Math.max(indiceSemana, 0);
      itensPorSemana[alvo].push(item);
    });

    const meses = new Map<string, string[]>();
    semanasEstruturadas.forEach((semana, index) => {
      if (!meses.has(semana.mes)) meses.set(semana.mes, []);
      const atividades = [
        ...semana.feriadosNaSemana,
        ...itensPorSemana[index],
      ]
        .filter(Boolean)
        .join("\n");
      meses.get(semana.mes)!.push(`${semana.rotulo}: ${atividades}`);
    });

    const texto = Array.from(meses.entries())
      .map(([mes, linhas]) => `${mes}:\n${linhas.join("\n")}`)
      .join("\n\n");

    return {
      texto,
      resumo: `Todas as ${itensNumerados.length} aulas numeradas (Aula 1 a Aula ${itensNumerados.length}) distribuídas em ${semanasEstruturadas.length} semanas.`,
    };
  }

  // Fallback quando não há planilha de currículo conectada: numera as aulas previstas semana a semana (Aula 1, Aula 2...)
  const meses = new Map<string, string[]>();
  let contadorAula = 1;

  semanasEstruturadas.forEach((semana) => {
    if (!meses.has(semana.mes)) meses.set(semana.mes, []);
    const qtdAulasNaSemana = Math.max(1, Math.round(semana.aulasPrevistas || 2));
    const aulasDaSemana: string[] = [];

    for (let i = 0; i < qtdAulasNaSemana; i++) {
      aulasDaSemana.push(
        `Aula ${contadorAula}: Desenvolvimento dos objetos de conhecimento do ${data.bimestre || "bimestre"}`
      );
      contadorAula++;
    }

    const partes = [...semana.feriadosNaSemana, ...aulasDaSemana].filter(Boolean);
    meses.get(semana.mes)!.push(`${semana.rotulo}: ${partes.join("\n")}`);
  });

  const texto = Array.from(meses.entries())
    .map(([mes, linhas]) => `${mes}:\n${linhas.join("\n")}`)
    .join("\n\n");

  return {
    texto,
    resumo: `${contadorAula - 1} aulas numeradas distribuídas em ${semanasEstruturadas.length} semanas.`,
    aviso: "Conecte a planilha de Currículo na Aba 3 para trazer os títulos oficiais de cada aula numerada.",
  };
}

/**
 * 6. Gera texto para Metodologias Ativas (sorteadas randomicamente a cada clique)
 */
async function sugerirMetodologias(
  quantidade: 3 | 5,
  textoAtual?: string
): Promise<{ texto: string; resumo: string }> {
  const urlMetodologias = (localStorage.getItem(STORAGE_KEYS.METODOLOGIAS) || "").trim();
  const catalogo = await carregarMetodologiasAtivas(urlMetodologias);

  // Embaralha o catálogo (Fisher-Yates) para seleção randômica
  const embaralhar = (lista: MetodologiaAtivaItem[]): MetodologiaAtivaItem[] => {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  };

  // Prioriza técnicas diferentes das que já estavam no texto atual para renovar ao repreencher
  const naoUsadas =
    textoAtual && textoAtual.trim()
      ? catalogo.filter((m) => !textoAtual.includes(m.metodologiaAtiva))
      : catalogo;

  const poolPrincipal = embaralhar(naoUsadas.length >= quantidade ? naoUsadas : catalogo);
  const selecionadas: MetodologiaAtivaItem[] = [];

  for (const item of poolPrincipal) {
    if (selecionadas.length >= quantidade) break;
    if (!selecionadas.some((s) => s.metodologiaAtiva === item.metodologiaAtiva)) {
      selecionadas.push(item);
    }
  }

  const linhas = selecionadas.map(
    (m) => `• [${m.metodologiaAtiva}]: ${m.definicaoDescricao}`
  );

  return {
    texto: linhas.join("\n\n"),
    resumo: `${selecionadas.length} técnicas sorteadas (${selecionadas.map((s) => s.metodologiaAtiva.split("/")[0].trim()).join(", ")}).`,
  };
}

/**
 * 7. Gera texto para Critérios de Avaliação (compatível com os cards da Aba 7)
 */
async function sugerirAvaliacao(): Promise<{ texto: string; resumo: string }> {
  const urlAvaliacao = (localStorage.getItem(STORAGE_KEYS.AVALIACAO) || "").trim();
  let criterios = AVALIACOES_PADRAO;
  if (urlAvaliacao) {
    const carregados = await fetchAvaliacaoPlanilha(urlAvaliacao);
    if (carregados && carregados.length > 0) {
      criterios = carregados;
    }
  }

  const linhas = criterios.map(
    (c) => `• [${c.criterio}] (${c.peso}): ${c.descricao || "Instrumento avaliativo bimestral."}`
  );
  linhas.push(
    "• [Recuperação Contínua]: Atividades paralelas de retomada das habilidades essenciais ao longo de todo o bimestre."
  );

  return {
    texto: linhas.join("\n\n"),
    resumo: `${criterios.length} critérios oficiais aplicados (${criterios.map((c) => `${c.criterio} ${c.peso}`).join(", ")}) + Recuperação Contínua.`,
  };
}

/**
 * 8. Gera texto para Referências Bibliográficas (compatível com os cards da Aba 8)
 */
async function sugerirReferencias(): Promise<{ texto: string; resumo: string }> {
  const urlReferencias = (localStorage.getItem(STORAGE_KEYS.REFERENCIAS) || "").trim();
  const referencias = urlReferencias
    ? await fetchReferenciasPlanilha(urlReferencias)
    : REFERENCIAS_PADRAO;

  const linhas = referencias.map((r) =>
    r.url
      ? `• [${r.titulo}]: ${r.categoria} - ${r.orgao} (${r.url})`
      : `• [${r.titulo}]: ${r.categoria} - ${r.orgao}`
  );

  return {
    texto: linhas.join("\n\n"),
    resumo: `${referencias.length} fontes oficiais homologadas inseridas (SEDUC-SP, BNCC, CMSP e Currículo Paulista).`,
  };
}

/**
 * Função Principal: Orquestra a geração completa do Guia Bimestral a partir da Página Inicial
 */
export async function gerarSugestaoGuiaCompleto(
  data: LessonPlanState,
  opcoes: OpcoesSugestaoGuia = OPCOES_SUGESTAO_PADRAO
): Promise<ResultadoSugestaoGuia> {
  const camposAtualizados: Partial<LessonPlanState> = {};
  const relatorio: ResumoSecaoGerada[] = [];

  const devePreencher = (secaoAtiva: boolean, valorAtual: string): boolean => {
    if (!secaoAtiva) return false;
    if (opcoes.modoPreenchimento === "apenas_vazios" && valorAtual && valorAtual.trim().length > 0) {
      return false;
    }
    return true;
  };

  // Executa buscas independentes em paralelo para máxima velocidade
  const precisaCurriculo =
    devePreencher(opcoes.secoes.conteudos, data.objetosConhecimento) ||
    devePreencher(opcoes.secoes.cronograma, data.cronograma);

  const [
    diagResult,
    curriculoResult,
    metodologiasResult,
    avaliacaoResult,
    referenciasResult,
  ] = await Promise.all([
    devePreencher(opcoes.secoes.diagnostico, data.aprendizagensNaoConsolidadas)
      ? sugerirDiagnostico(data, opcoes.regraDiagnostico)
      : Promise.resolve(null),
    precisaCurriculo
      ? sugerirConteudosECurriculo(data)
      : Promise.resolve(null),
    devePreencher(opcoes.secoes.metodologia, data.metodologiaAtiva)
      ? sugerirMetodologias(opcoes.quantidadeMetodologias, data.metodologiaAtiva)
      : Promise.resolve(null),
    devePreencher(opcoes.secoes.avaliacao, data.criterioAvaliacao)
      ? sugerirAvaliacao()
      : Promise.resolve(null),
    devePreencher(opcoes.secoes.referencias, data.referenciasApoio)
      ? sugerirReferencias()
      : Promise.resolve(null),
  ]);

  // 2. Diagnóstico
  if (opcoes.secoes.diagnostico) {
    if (diagResult) {
      camposAtualizados.aprendizagensNaoConsolidadas = diagResult.texto;
      relatorio.push({
        idAba: "diagnostico",
        titulo: "2. Diagnóstico e Recomposição",
        campo: "aprendizagensNaoConsolidadas",
        aplicado: true,
        preservado: false,
        resumo: diagResult.resumo,
        aviso: diagResult.aviso,
      });
    } else {
      relatorio.push({
        idAba: "diagnostico",
        titulo: "2. Diagnóstico e Recomposição",
        campo: "aprendizagensNaoConsolidadas",
        aplicado: false,
        preservado: true,
        resumo: "Conteúdo existente mantido sem alterações.",
      });
    }
  }

  // 3. Conteúdos / Unidades Temáticas
  if (opcoes.secoes.conteudos) {
    if (
      devePreencher(opcoes.secoes.conteudos, data.objetosConhecimento) &&
      curriculoResult
    ) {
      camposAtualizados.objetosConhecimento = curriculoResult.texto;
      relatorio.push({
        idAba: "conteudos",
        titulo: "3. Unidades Temáticas e Conteúdos",
        campo: "objetosConhecimento",
        aplicado: true,
        preservado: false,
        resumo: curriculoResult.resumo,
        aviso: curriculoResult.aviso,
      });
    } else {
      relatorio.push({
        idAba: "conteudos",
        titulo: "3. Unidades Temáticas e Conteúdos",
        campo: "objetosConhecimento",
        aplicado: false,
        preservado: true,
        resumo: "Conteúdo existente mantido sem alterações.",
      });
    }
  }

  // 4. Competências Socioemocionais
  if (opcoes.secoes.socioemocional) {
    if (devePreencher(opcoes.secoes.socioemocional, data.competenciasSocioemocionais)) {
      const socioResult = sugerirSocioemocionais(data.competenciasSocioemocionais);
      camposAtualizados.competenciasSocioemocionais = socioResult.texto;
      relatorio.push({
        idAba: "socioemocional",
        titulo: "4. Competências Socioemocionais",
        campo: "competenciasSocioemocionais",
        aplicado: true,
        preservado: false,
        resumo: socioResult.resumo,
      });
    } else {
      relatorio.push({
        idAba: "socioemocional",
        titulo: "4. Competências Socioemocionais",
        campo: "competenciasSocioemocionais",
        aplicado: false,
        preservado: true,
        resumo: "Conteúdo existente mantido sem alterações.",
      });
    }
  }

  // 5. Cronograma
  if (opcoes.secoes.cronograma) {
    if (devePreencher(opcoes.secoes.cronograma, data.cronograma)) {
      const cronoResult = sugerirCronograma(
        data,
        curriculoResult?.aulas || [],
        opcoes.colunaCronograma
      );
      camposAtualizados.cronograma = cronoResult.texto;
      relatorio.push({
        idAba: "cronograma",
        titulo: "5. Cronograma por Mês e Datas",
        campo: "cronograma",
        aplicado: true,
        preservado: false,
        resumo: cronoResult.resumo,
        aviso: cronoResult.aviso,
      });
    } else {
      relatorio.push({
        idAba: "cronograma",
        titulo: "5. Cronograma por Mês e Datas",
        campo: "cronograma",
        aplicado: false,
        preservado: true,
        resumo: "Conteúdo existente mantido sem alterações.",
      });
    }
  }

  // 6. Metodologias Ativas
  if (opcoes.secoes.metodologia) {
    if (metodologiasResult) {
      camposAtualizados.metodologiaAtiva = metodologiasResult.texto;
      relatorio.push({
        idAba: "metodologia",
        titulo: "6. Metodologias Ativas",
        campo: "metodologiaAtiva",
        aplicado: true,
        preservado: false,
        resumo: metodologiasResult.resumo,
      });
    } else {
      relatorio.push({
        idAba: "metodologia",
        titulo: "6. Metodologias Ativas",
        campo: "metodologiaAtiva",
        aplicado: false,
        preservado: true,
        resumo: "Conteúdo existente mantido sem alterações.",
      });
    }
  }

  // 7. Avaliação
  if (opcoes.secoes.avaliacao) {
    if (avaliacaoResult) {
      camposAtualizados.criterioAvaliacao = avaliacaoResult.texto;
      relatorio.push({
        idAba: "avaliacao",
        titulo: "7. Critérios de Avaliação",
        campo: "criterioAvaliacao",
        aplicado: true,
        preservado: false,
        resumo: avaliacaoResult.resumo,
      });
    } else {
      relatorio.push({
        idAba: "avaliacao",
        titulo: "7. Critérios de Avaliação",
        campo: "criterioAvaliacao",
        aplicado: false,
        preservado: true,
        resumo: "Conteúdo existente mantido sem alterações.",
      });
    }
  }

  // 8. Referências
  if (opcoes.secoes.referencias) {
    if (referenciasResult) {
      camposAtualizados.referenciasApoio = referenciasResult.texto;
      relatorio.push({
        idAba: "referencias",
        titulo: "8. Referências Bibliográficas",
        campo: "referenciasApoio",
        aplicado: true,
        preservado: false,
        resumo: referenciasResult.resumo,
      });
    } else {
      relatorio.push({
        idAba: "referencias",
        titulo: "8. Referências Bibliográficas",
        campo: "referenciasApoio",
        aplicado: false,
        preservado: true,
        resumo: "Conteúdo existente mantido sem alterações.",
      });
    }
  }

  return {
    camposAtualizados,
    relatorio,
  };
}
