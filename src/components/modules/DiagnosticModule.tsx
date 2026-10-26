import React, { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Sparkles,
  Layers,
  Filter,
  CheckSquare,
  Square,
  ExternalLink,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  Eye,
  GitCompare,
  Target,
  ShieldAlert,
} from "lucide-react";
import { LessonPlanState } from "../../types/lessonPlan";
import { getBimesterTitles } from "../../utils/bimesterHelper";
import {
  DescritorHabilidade,
  getSheetNames,
  extrairNivelEscolar,
  extrairLetraTurma,
  obterSufixoBimestreRecuperacao,
  obterTurmaHistoricaAlvo,
  InfoTurmaHistorica,
  filtrarAbasPorNivel,
  carregarDescritoresDaAba,
  formatarPorcentagem2Casas,
  extrairValorPorcentagem,
  padronizarNomeTurma,
  normalizarGoogleSheetsXlsxUrl,
} from "../../services/googleSheetsService";
import { STORAGE_KEYS } from "../../services/configLinksService";
import { Link, CheckCircle2 } from "lucide-react";

const STORAGE_DIAGNOSTIC_URL_KEY = "planejador_url_planilha_diagnostico";

interface DiagnosticModuleProps {
  data: LessonPlanState;
  onChange: (field: keyof LessonPlanState, value: string) => void;
}

export const DiagnosticModule: React.FC<DiagnosticModuleProps> = ({
  data,
  onChange,
}) => {
  const bimesterTitles = getBimesterTitles(data.bimestre);

  // 1. Planilha do Ano Atual / Vigente
  const [urlPlanilha, setUrlPlanilha] = useState<string>(() => {
    return localStorage.getItem(STORAGE_DIAGNOSTIC_URL_KEY) || "";
  });
  const [planilhaConectada, setPlanilhaConectada] = useState<boolean>(false);
  const [conectandoPlanilha, setConectandoPlanilha] = useState<boolean>(false);

  // 2. Planilha do Ano Anterior / Histórico (para comparação e coorte)
  const [urlPlanilhaAnterior, setUrlPlanilhaAnterior] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.DIAGNOSTICO_ANTERIOR) || "";
  });
  const [planilhaAnteriorConectada, setPlanilhaAnteriorConectada] = useState<boolean>(false);
  const [conectandoPlanilhaAnterior, setConectandoPlanilhaAnterior] = useState<boolean>(false);
  const [todasAbasAnterior, setTodasAbasAnterior] = useState<string[]>([]);

  // Estados de controle das abas da planilha
  const [todasAbas, setTodasAbas] = useState<string[]>([]);
  const [abaSelecionada, setAbaSelecionada] = useState<string>("");
  const [descritores, setDescritores] = useState<DescritorHabilidade[]>([]);
  const [descritoresAnterior, setDescritoresAnterior] = useState<DescritorHabilidade[]>([]);
  const [modoExibicaoDescritores, setModoExibicaoDescritores] = useState<"atual" | "anterior" | "comparacao">("atual");
  const [carregandoAnterior, setCarregandoAnterior] = useState<boolean>(false);
  const [selecionadosIds, setSelecionadosIds] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState<boolean>(false);
  const [erroMsg, setErroMsg] = useState<string>("");
  const [painelAberto, setPainelAberto] = useState<boolean>(true);

  // Estados para Prevenção Pedagógica Histórica do 6º Ano
  const [painelPrevencaoAberto, setPainelPrevencaoAberto] = useState<boolean>(false);
  const [habilidadesPrevencao, setHabilidadesPrevencao] = useState<DescritorHabilidade[]>([]);
  const [carregandoPrevencao, setCarregandoPrevencao] = useState<boolean>(false);

  // Função para conectar e listar abas da planilha do ano atual
  const handleConectarPlanilha = async (urlParaConectar?: string) => {
    const url = (urlParaConectar ?? urlPlanilha).trim();
    if (!url) {
      setErroMsg("Por favor, cole o link da sua planilha do Google Sheets.");
      setPlanilhaConectada(false);
      setTodasAbas([]);
      setAbaSelecionada("");
      setDescritores([]);
      return;
    }

    try {
      setConectandoPlanilha(true);
      setErroMsg("");
      const abas = await getSheetNames(url);
      if (!abas || abas.length === 0) {
        throw new Error("Nenhuma aba encontrada. Certifique-se de que a planilha está pública para leitura ('Qualquer pessoa com o link').");
      }
      setTodasAbas(abas);
      setPlanilhaConectada(true);
      localStorage.setItem(STORAGE_DIAGNOSTIC_URL_KEY, url);
    } catch (err: any) {
      console.error("Erro ao conectar à planilha:", err);
      setErroMsg(err.message || "Falha ao carregar abas da planilha. Verifique as permissões de compartilhamento.");
      setPlanilhaConectada(false);
      setTodasAbas([]);
      setAbaSelecionada("");
      setDescritores([]);
    } finally {
      setConectandoPlanilha(false);
    }
  };

  // Função para conectar e listar abas da planilha do ano anterior
  const handleConectarPlanilhaAnterior = async (urlParaConectar?: string) => {
    const url = (urlParaConectar ?? urlPlanilhaAnterior).trim();
    if (!url) {
      setPlanilhaAnteriorConectada(false);
      setTodasAbasAnterior([]);
      localStorage.removeItem(STORAGE_KEYS.DIAGNOSTICO_ANTERIOR);
      return;
    }

    try {
      setConectandoPlanilhaAnterior(true);
      const abas = await getSheetNames(url);
      if (!abas || abas.length === 0) {
        throw new Error("Nenhuma aba encontrada na planilha do ano anterior.");
      }
      setTodasAbasAnterior(abas);
      setPlanilhaAnteriorConectada(true);
      localStorage.setItem(STORAGE_KEYS.DIAGNOSTICO_ANTERIOR, url);
    } catch (err: any) {
      console.warn("Falha ao conectar à planilha do ano anterior:", err);
      setPlanilhaAnteriorConectada(false);
      setTodasAbasAnterior([]);
    } finally {
      setConectandoPlanilhaAnterior(false);
    }
  };

  // Se já havia URLs salvas anteriormente, tenta conectar ao carregar
  useEffect(() => {
    if (urlPlanilha.trim()) {
      handleConectarPlanilha(urlPlanilha.trim());
    }
    if (urlPlanilhaAnterior.trim()) {
      handleConectarPlanilhaAnterior(urlPlanilhaAnterior.trim());
    }
  }, []);

  // Extrai nome compacto da sala a partir do nome da aba (ex: "7A-1B" -> "7A", "6A" -> "6A")
  const formatarNomeSala = (aba: string) => {
    const match = aba.match(/^(\d)\s*([A-Za-z])/);
    if (match) return `${match[1]}${match[2].toUpperCase()}`;
    return aba.replace(/[-–].*$/, "").trim().toUpperCase();
  };

  // 1. Identifica as turmas cadastradas na Seção de Identificação (ex: ["6A", "6B"])
  const turmasIdentificadas = useMemo(() => {
    const lista = (data.turmas && data.turmas.length > 0 ? data.turmas : [])
      .map((t) => padronizarNomeTurma(t.nome))
      .filter((n) => n.length > 0);
    return Array.from(new Set(lista));
  }, [data.turmas]);

  // Primeira turma ativa de referência (com fallback para data.anoEscolar se a turma ainda não tiver sido preenchida)
  const primeiraTurma = useMemo(() => {
    if (turmasIdentificadas.length > 0) return turmasIdentificadas[0];
    if (data.anoEscolar) return padronizarNomeTurma(data.anoEscolar);
    return "";
  }, [turmasIdentificadas, data.anoEscolar]);

  // 2. Mapeamento histórico: no 1º Bimestre, 7A trabalha com os dados do 6A do ano anterior; 6A veio do 5º ano
  const infoHistorica = useMemo<InfoTurmaHistorica>(() => {
    return obterTurmaHistoricaAlvo(primeiraTurma, data.bimestre);
  }, [primeiraTurma, data.bimestre]);

  // Nível escolar detectado da turma alvo
  const nivelAlvoDetectado = infoHistorica.nivelHistorico || extrairNivelEscolar(data.anoEscolar);

  // 3. Restringe as abas da planilha estritamente à turma diagnóstica necessária:
  // Se a planilha atual estiver sem abas ou não conectada, utiliza as abas da planilha do ano anterior!
  const isPrimeiroBimestre = (data.bimestre || "").includes("1");

  const abasDisponiveis = useMemo(() => {
    // No 1º bimestre:
    // - Modo "atual": a turma analisada é a coorte dos alunos no ano anterior (ex: se 7A, analisa 6A)
    //   Buscamos preferencialmente na planilha anterior (ou atual se conectada).
    // - Modo "anterior": analisa a mesma turma do ano anterior (ex: 7A no ano anterior)
    //   Buscamos na planilha anterior (ou atual).
    // - Modo "comparação": permite visualizar ambas.
    let turmaAlvoFormatada = infoHistorica.turmaHistorica;
    let abasOrigem = todasAbas.length > 0 ? todasAbas : todasAbasAnterior;

    if (isPrimeiroBimestre) {
      if (modoExibicaoDescritores === "anterior") {
        turmaAlvoFormatada = primeiraTurma; // Ex: "7A"
        abasOrigem = todasAbasAnterior.length > 0 ? todasAbasAnterior : todasAbas;
      } else if (modoExibicaoDescritores === "atual") {
        turmaAlvoFormatada = infoHistorica.turmaHistorica; // Ex: "6A"
        abasOrigem = todasAbasAnterior.length > 0 ? todasAbasAnterior : todasAbas;
      } else {
        // "comparação": prioriza a turma da série atual (ex: 7A) se existir, ou a turma histórica (6A)
        turmaAlvoFormatada = primeiraTurma || infoHistorica.turmaHistorica;
        abasOrigem = todasAbas.length > 0 ? todasAbas : todasAbasAnterior;
      }
    }

    if (abasOrigem.length === 0) return [];

    // Se estiver no 1º Bimestre e for 6º Ano (ex: 6A) no modo "atual", a turma alvo é o 5A (Fundamental I)
    if (isPrimeiroBimestre && modoExibicaoDescritores === "atual" && infoHistorica.isFundamental1) {
      const abas5Ano = abasOrigem.filter((aba) => {
        const salaDaAba = formatarNomeSala(aba);
        return salaDaAba.startsWith("5");
      });
      if (abas5Ano.length > 0) return abas5Ano;
      
      // Se não há 5º ano, exibe as abas do 6º ano da planilha anterior para consulta preventiva
      const abas6Ano = abasOrigem.filter((aba) => {
        const salaDaAba = formatarNomeSala(aba);
        return salaDaAba.startsWith("6");
      });
      return abas6Ano;
    }

    if (turmaAlvoFormatada) {
      const filtradas = abasOrigem.filter((aba) => {
        const salaDaAba = formatarNomeSala(aba);
        return salaDaAba === turmaAlvoFormatada;
      });
      if (filtradas.length > 0) return filtradas;
    }

    // Fallback apenas se nenhuma turma foi cadastrada na identificação: filtra pelo nível escolar
    if (nivelAlvoDetectado) {
      const filtradasNivel = filtrarAbasPorNivel(abasOrigem, nivelAlvoDetectado);
      if (filtradasNivel.length > 0) return filtradasNivel;
    }

    return abasOrigem;
  }, [
    todasAbas,
    todasAbasAnterior,
    infoHistorica.turmaHistorica,
    infoHistorica.isFundamental1,
    nivelAlvoDetectado,
    isPrimeiroBimestre,
    modoExibicaoDescritores,
    primeiraTurma,
  ]);

  // Função para formatar o rótulo limpo do seletor: ex: "6A - 1º Bimestre"
  const formatarRotuloAba = (aba: string) => {
    const sala = formatarNomeSala(aba);
    const matchBim = aba.match(/[-–]\s*([1-4])\s*[Bb]/i);
    let bimStr = data.bimestre || "1º Bimestre";
    if (matchBim) {
      bimStr = `${matchBim[1]}º Bimestre`;
    }
    return `${sala} - ${bimStr}`;
  };

  // 4. Tenta encontrar a aba ideal para a turma e bimestre
  useEffect(() => {
    const algumaPlanilhaConectada = planilhaConectada || planilhaAnteriorConectada;
    if (algumaPlanilhaConectada && abasDisponiveis.length > 0) {
      const sufixoBim = obterSufixoBimestreRecuperacao(data.bimestre);
      const turmaAlvo = isPrimeiroBimestre
        ? (modoExibicaoDescritores === "anterior" ? primeiraTurma : infoHistorica.turmaHistorica)
        : infoHistorica.turmaHistorica;

      const abaEncontrada =
        (turmaAlvo &&
          abasDisponiveis.find((a) => {
            const sala = formatarNomeSala(a);
            return sala === turmaAlvo && a.toUpperCase().includes(sufixoBim);
          })) ||
        (turmaAlvo &&
          abasDisponiveis.find((a) => formatarNomeSala(a) === turmaAlvo)) ||
        abasDisponiveis.find((a) => a.toUpperCase().includes(sufixoBim)) ||
        abasDisponiveis[0];

      if (abaEncontrada && abaEncontrada !== abaSelecionada) {
        setAbaSelecionada(abaEncontrada);
      }
    } else if (!algumaPlanilhaConectada) {
      setAbaSelecionada("");
      setDescritores([]);
      setDescritoresAnterior([]);
    }
  }, [
    planilhaConectada,
    planilhaAnteriorConectada,
    abasDisponiveis,
    data.bimestre,
    infoHistorica.turmaHistorica,
    isPrimeiroBimestre,
    modoExibicaoDescritores,
    primeiraTurma,
  ]);

  // 4. Carrega os descritores ao selecionar a aba ou mudar o componente curricular
  // Se estiver no 1º bimestre e analisando o Atual (ex: 7A analisando o 6A do ano anterior),
  // se a aba pertencer à planilha anterior ou atual, utiliza a URL correspondente!
  useEffect(() => {
    if (!abaSelecionada) {
      setDescritores([]);
      return;
    }

    // Identifica qual planilha contém a abaSelecionada:
    // 1. Se estiver na planilha atual
    let urlParaCarregar = "";
    if (planilhaConectada && todasAbas.includes(abaSelecionada)) {
      urlParaCarregar = urlPlanilha.trim();
    } else if (planilhaAnteriorConectada && todasAbasAnterior.includes(abaSelecionada)) {
      // Se a aba estiver na planilha do ano anterior (ex: aba do 6A para analisar o 7A no 1º bimestre)
      urlParaCarregar = urlPlanilhaAnterior.trim();
    } else if (planilhaConectada && urlPlanilha.trim()) {
      urlParaCarregar = urlPlanilha.trim();
    } else if (planilhaAnteriorConectada && urlPlanilhaAnterior.trim()) {
      urlParaCarregar = urlPlanilhaAnterior.trim();
    }

    if (!urlParaCarregar) {
      setDescritores([]);
      return;
    }

    let ativo = true;
    setCarregando(true);
    setErroMsg("");

    carregarDescritoresDaAba(abaSelecionada, data.componenteCurricular, urlParaCarregar)
      .then((items) => {
        if (!ativo) return;
        setDescritores(items);

        // Identifica quais itens DESTA SALA ESPECÍFICA já estão presentes no texto
        const salaFormatada = formatarNomeSala(abaSelecionada);
        const mapa = parsearDescritoresDoTexto(data.aprendizagensNaoConsolidadas || "");
        const novosSelecionados = new Set<string>();

        items.forEach((item) => {
          const turmas = mapa.get(item.descricao);
          if (turmas && turmas.some((t) => t.sala === salaFormatada)) {
            novosSelecionados.add(item.id);
          }
        });

        // Se for uma sala nova sem itens salvos, os quadrinhos iniciam em branco!
        setSelecionadosIds(novosSelecionados);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [planilhaConectada, planilhaAnteriorConectada, todasAbas, todasAbasAnterior, abaSelecionada, data.componenteCurricular, urlPlanilha, urlPlanilhaAnterior]);

  // 4.1 Carrega descritores da Planilha do Ano Anterior para a mesma turma/período (ou na planilha atual se não houver 2ª planilha)
  useEffect(() => {
    if (!abaSelecionada) {
      setDescritoresAnterior([]);
      return;
    }

    const urlFonteAnterior = planilhaAnteriorConectada && urlPlanilhaAnterior.trim()
      ? urlPlanilhaAnterior.trim()
      : (planilhaConectada && urlPlanilha.trim() ? urlPlanilha.trim() : "");

    const abasFonteAnterior = planilhaAnteriorConectada && todasAbasAnterior.length > 0
      ? todasAbasAnterior
      : todasAbas;

    if (!urlFonteAnterior || abasFonteAnterior.length === 0) {
      setDescritoresAnterior([]);
      return;
    }

    const isPrimeiroBimestre = (data.bimestre || "").includes("1");
    // No 1º bimestre:
    // O modo "Anterior" deve analisar a mesma turma escolar do ano anterior (ex: se selecionou 6A correspondente ao 7A, busca o 7A do ano anterior; ou se a aba já for 7A, busca 7A)
    // Para identificar qual é a turma escolar de referência: primeiraTurma (ex: "7A") ou o nível atual
    const turmaAnoAnteriorAlvo = isPrimeiroBimestre && primeiraTurma
      ? primeiraTurma
      : formatarNomeSala(abaSelecionada);

    const matchBim = abaSelecionada.match(/[-–]\s*([1-4])\s*[Bb]/i);
    const sufixoBim = matchBim ? matchBim[1].toUpperCase() + "B" : obterSufixoBimestreRecuperacao(data.bimestre);

    // Busca a turma do ano anterior (ex: 7A no ano anterior)
    const abaCorrespondenteAnterior =
      abasFonteAnterior.find((a) => formatarNomeSala(a) === turmaAnoAnteriorAlvo && a.toUpperCase().includes(sufixoBim)) ||
      abasFonteAnterior.find((a) => formatarNomeSala(a) === turmaAnoAnteriorAlvo) ||
      "";

    if (!abaCorrespondenteAnterior) {
      setDescritoresAnterior([]);
      return;
    }

    let ativo = true;
    setCarregandoAnterior(true);
    carregarDescritoresDaAba(abaCorrespondenteAnterior, data.componenteCurricular, urlFonteAnterior)
      .then((items) => {
        if (!ativo) return;
        setDescritoresAnterior(items);
      })
      .catch((err) => {
        console.warn("Falha ao carregar descritores do ano anterior:", err);
      })
      .finally(() => {
        if (ativo) setCarregandoAnterior(false);
      });

    return () => {
      ativo = false;
    };
  }, [
    abaSelecionada,
    primeiraTurma,
    planilhaAnteriorConectada,
    urlPlanilhaAnterior,
    todasAbasAnterior,
    planilhaConectada,
    urlPlanilha,
    todasAbas,
    data.componenteCurricular,
    data.bimestre,
  ]);

  // 5. Carrega habilidades históricas do 6º Ano para prevenção pedagógica (quando painel de prevenção for aberto)
  useEffect(() => {
    if (!planilhaConectada || !infoHistorica.isFundamental1 || !painelPrevencaoAberto) {
      return;
    }

    // Procura abas do 6º ano: prioriza na planilha do ano anterior (se conectada) ou na planilha atual
    const urlParaBuscar = planilhaAnteriorConectada && urlPlanilhaAnterior.trim()
      ? urlPlanilhaAnterior.trim()
      : urlPlanilha.trim();

    const abasDisponiveisBusca = planilhaAnteriorConectada && todasAbasAnterior.length > 0
      ? todasAbasAnterior
      : todasAbas;

    const aba6Ano =
      abasDisponiveisBusca.find((a) => formatarNomeSala(a).startsWith("6") && a.toUpperCase().includes("1B")) ||
      abasDisponiveisBusca.find((a) => formatarNomeSala(a).startsWith("6")) ||
      "";

    if (!aba6Ano) {
      setHabilidadesPrevencao([]);
      return;
    }

    let ativo = true;
    setCarregandoPrevencao(true);
    carregarDescritoresDaAba(aba6Ano, data.componenteCurricular, urlParaBuscar)
      .then((items) => {
        if (!ativo) return;
        // Ordena da menor taxa de acerto para a maior e pega as principais habilidades críticas
        const ordenadas = items.sort(
          (a, b) => extrairValorPorcentagem(a.taxaAcerto) - extrairValorPorcentagem(b.taxaAcerto)
        );
        setHabilidadesPrevencao(ordenadas);
      })
      .catch((err) => {
        console.warn("Falha ao carregar habilidades de prevenção do 6º ano:", err);
      })
      .finally(() => {
        if (ativo) setCarregandoPrevencao(false);
      });

    return () => {
      ativo = false;
    };
  }, [planilhaConectada, infoHistorica.isFundamental1, painelPrevencaoAberto, todasAbas, data.componenteCurricular, urlPlanilha]);


  // Estrutura interna para armazenar as seleções: mapa de descritor -> Map<sala, taxa>
  // Para manter compatibilidade com o campo de texto livre e permitir sincronização bidirecional,
  // fornecemos funções utilitárias de parse e formatação do texto.

  // Analisa o texto atual para saber quais salas têm determinado descritor marcado
  const parsearDescritoresDoTexto = (texto: string) => {
    // Mapa: descricao -> array de { sala, taxa }
    const mapa = new Map<string, { sala: string; taxa: string }[]>();
    if (!texto) return mapa;

    const linhas = texto.split("\n");
    linhas.forEach((l) => {
      const linha = l.trim();
      if (!linha) return;

      // Formato agrupado: • [6A: 10,00% | 6C: 8,70%]: Descrição... ou [6º A: 10,00%]
      const matchAgrupado = linha.match(/^•?\s*\[(.*?)\]:\s*(.*)$/);
      if (matchAgrupado) {
        const blocoSalas = matchAgrupado[1];
        const desc = matchAgrupado[2].trim();
        const pares = blocoSalas.split("|");
        const list: { sala: string; taxa: string }[] = [];
        pares.forEach((p) => {
          // ex: "6A: 10,00%" ou "6º A: 10,00%" ou "6A - 10,00%"
          const mPar = p.match(/([^:\-]+)[:\-]\s*([0-9.,]+%?)/);
          if (mPar) {
            const salaRaw = mPar[1].trim();
            const salaPadrao = padronizarNomeTurma(salaRaw);
            list.push({ sala: salaPadrao, taxa: formatarPorcentagem2Casas(mPar[2].trim()) });
          }
        });
        if (list.length > 0) {
          mapa.set(desc, list);
          return;
        }
      }

      // Formato legado: • [Acerto: 10,00% | Sala: 6º A] Descrição
      const matchLegado = linha.match(/^•?\s*\[Acerto:\s*([^|\]]+)\s*\|\s*Sala:\s*([^\]]+)\]\s*(.*)$/i);
      if (matchLegado) {
        const taxa = formatarPorcentagem2Casas(matchLegado[1].trim());
        const sala = padronizarNomeTurma(matchLegado[2].trim());
        const desc = matchLegado[3].trim();
        const existing = mapa.get(desc) || [];
        existing.push({ sala, taxa });
        mapa.set(desc, existing);
        return;
      }
    });

    return mapa;
  };

  // Reconstrói o texto agrupando por descritor
  const formatarMapaParaTexto = (mapa: Map<string, { sala: string; taxa: string }[]>): string => {
    const linhas: string[] = [];
    mapa.forEach((turmas, desc) => {
      if (turmas.length === 0) return;
      // Ordena as turmas por nome (ex: 6º A antes de 6º B)
      turmas.sort((a, b) => a.sala.localeCompare(b.sala, "pt-BR"));
      // Formato: • [6º A: 10,00% | 6º B: 19,44%]: Descrição
      const headerSalas = turmas.map((t) => `${t.sala}: ${t.taxa}`).join(" | ");
      linhas.push(`• [${headerSalas}]: ${desc}`);
    });
    return linhas.join("\n");
  };

  // Alterna o checkbox de um descritor e atualiza a caixa de texto
  const handleToggleDescritor = (item: DescritorHabilidade) => {
    const novosIds = new Set(selecionadosIds);
    const salaFormatada = formatarNomeSala(item.abaOrigem);
    const taxaFmt = formatarPorcentagem2Casas(item.taxaAcerto);
    const mapa = parsearDescritoresDoTexto(data.aprendizagensNaoConsolidadas || "");

    if (novosIds.has(item.id)) {
      novosIds.delete(item.id);
      // Remove a sala deste descritor
      const turmas = mapa.get(item.descricao) || [];
      const turmasFiltradas = turmas.filter((t) => t.sala !== salaFormatada);
      if (turmasFiltradas.length > 0) {
        mapa.set(item.descricao, turmasFiltradas);
      } else {
        mapa.delete(item.descricao);
      }
    } else {
      novosIds.add(item.id);
      const turmas = mapa.get(item.descricao) || [];
      // Se já existia, atualiza taxa; se não, adiciona
      const idx = turmas.findIndex((t) => t.sala === salaFormatada);
      if (idx >= 0) {
        turmas[idx].taxa = taxaFmt;
      } else {
        turmas.push({ sala: salaFormatada, taxa: taxaFmt });
      }
      mapa.set(item.descricao, turmas);
    }

    setSelecionadosIds(novosIds);
    onChange("aprendizagensNaoConsolidadas", formatarMapaParaTexto(mapa));
  };

  // Selecionar todos os descritores filtrados da sala atual
  const handleSelectAll = () => {
    const novosIds = new Set(selecionadosIds);
    const salaFormatada = formatarNomeSala(abaSelecionada);
    const mapa = parsearDescritoresDoTexto(data.aprendizagensNaoConsolidadas || "");

    descritores.forEach((item) => {
      novosIds.add(item.id);
      const taxaFmt = formatarPorcentagem2Casas(item.taxaAcerto);
      const turmas = mapa.get(item.descricao) || [];
      const idx = turmas.findIndex((t) => t.sala === salaFormatada);
      if (idx >= 0) {
        turmas[idx].taxa = taxaFmt;
      } else {
        turmas.push({ sala: salaFormatada, taxa: taxaFmt });
      }
      mapa.set(item.descricao, turmas);
    });

    setSelecionadosIds(novosIds);
    onChange("aprendizagensNaoConsolidadas", formatarMapaParaTexto(mapa));
  };

  // Limpar seleção apenas da sala atual
  const handleClearSelection = () => {
    const salaFormatada = formatarNomeSala(abaSelecionada);
    const mapa = parsearDescritoresDoTexto(data.aprendizagensNaoConsolidadas || "");

    mapa.forEach((turmas, desc) => {
      const rest = turmas.filter((t) => t.sala !== salaFormatada);
      if (rest.length > 0) {
        mapa.set(desc, rest);
      } else {
        mapa.delete(desc);
      }
    });

    setSelecionadosIds(new Set());
    onChange("aprendizagensNaoConsolidadas", formatarMapaParaTexto(mapa));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {bimesterTitles.tituloRecuperacao}
            </h2>
            <p className="text-xs text-slate-500">
              Habilidades diagnósticas não consolidadas puxadas da planilha oficial por turma e componente
            </p>
          </div>
        </div>
      </div>

      {/* PAINEL DISCRETO DE SINCRONIZAÇÃO COM A PLANILHA */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Layers className="w-4 h-4 text-amber-600" />
            <span>
              Planilha de Diagnóstico • {nivelAlvoDetectado ? `${nivelAlvoDetectado}º Ano` : "Todos os Níveis"}
            </span>
            {data.componenteCurricular && (
              <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-medium text-[11px]">
                Disciplina: {data.componenteCurricular}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setPainelAberto(!painelAberto)}
            className="text-slate-500 hover:text-slate-700 text-xs font-medium flex items-center gap-1"
          >
            <span>{painelAberto ? "Recolher" : "Expandir"}</span>
            {painelAberto ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {painelAberto && (
          <div className="p-4 space-y-4">
            {/* Campos para o Professor Inserir os Links das Duas Planilhas (Ano Atual e Ano Anterior) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {/* 1. Planilha do Ano Atual */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span>
                    <span>1. Planilha do Ano Atual (Vigente):</span>
                  </label>
                  {planilhaConectada && (
                    <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                      Conectada ({todasAbas.length} abas)
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Link className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={urlPlanilha}
                      onChange={(e) => {
                        setUrlPlanilha(e.target.value);
                        if (planilhaConectada) setPlanilhaConectada(false);
                      }}
                      placeholder="Cole o link da planilha do ano atual (Google Sheets)"
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-[11px]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleConectarPlanilha()}
                    disabled={conectandoPlanilha}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-400 text-white font-semibold rounded-lg text-xs transition-colors whitespace-nowrap shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${conectandoPlanilha ? "animate-spin" : ""}`} />
                    <span>{conectandoPlanilha ? "..." : planilhaConectada ? "Atualizar" : "Conectar"}</span>
                  </button>
                </div>
              </div>

              {/* 2. Planilha do Ano Anterior (Para Comparação) */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                    <span>2. Planilha do Ano Anterior (Histórico / Comparação):</span>
                  </label>
                  {planilhaAnteriorConectada && (
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      Conectada ({todasAbasAnterior.length} abas)
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Link className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={urlPlanilhaAnterior}
                      onChange={(e) => {
                        setUrlPlanilhaAnterior(e.target.value);
                        if (planilhaAnteriorConectada) setPlanilhaAnteriorConectada(false);
                      }}
                      placeholder="Cole o link da planilha do ano anterior (Google Sheets)"
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-[11px]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleConectarPlanilhaAnterior()}
                    disabled={conectandoPlanilhaAnterior}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold rounded-lg text-xs transition-colors whitespace-nowrap shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${conectandoPlanilhaAnterior ? "animate-spin" : ""}`} />
                    <span>{conectandoPlanilhaAnterior ? "..." : planilhaAnteriorConectada ? "Atualizar" : "Conectar"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* AVISO PEDAGÓGICO: 6º Ano no 1º Bimestre (Transição do Fundamental I / Sem dados do 5A) */}
            {infoHistorica.isFundamental1 && (
              <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-xl space-y-2.5 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg flex-shrink-0 mt-0.5">
                    <Info className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-amber-900">
                      Atenção Pedagógica: Turma de 6º Ano no 1º Bimestre (Transição Fundamental I)
                    </h4>
                    <p className="text-xs text-amber-800 leading-relaxed mt-1">
                      {infoHistorica.motivoAviso}
                    </p>
                    <div className="mt-2 p-2 bg-white/80 rounded-lg border border-amber-200/80 text-[11px] text-amber-900">
                      <strong>Orientação para o planejamento:</strong> Utilize o campo de texto livre abaixo (<em>"Texto de Aprendizagens Não Consolidadas"</em>) para descrever as habilidades prioritárias observadas nas semanas de acolhimento e nivelamento inicial dos estudantes.
                    </div>
                  </div>
                </div>

                {/* BOTÃO E PAINEL DE PREVENÇÃO PEDAGÓGICA HISTÓRICA */}
                <div className="pt-1 border-t border-amber-200/70">
                  <button
                    type="button"
                    onClick={() => setPainelPrevencaoAberto(!painelPrevencaoAberto)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>
                      {painelPrevencaoAberto
                        ? "Ocultar Habilidades Críticas Históricas do 6º Ano"
                        : "🎯 Consultar Habilidades Críticas do 6º Ano no Ano Anterior (Prevenção Pedagógica)"}
                    </span>
                    {painelPrevencaoAberto ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {painelPrevencaoAberto && (
                    <div className="mt-2.5 p-3 bg-white border border-amber-300 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                          <ShieldAlert className="w-4 h-4 text-amber-600" />
                          <span>
                            Dificuldades Históricas do 6º Ano no 1º Bimestre ({data.componenteCurricular || "Disciplina"})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Ordenado pelas menores taxas de acerto
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        Estas foram as habilidades com menores conceitos e acertos no 6º ano da escola. Você pode reforçá-las preventivamente para evitar defasagens na turma atual:
                      </p>

                      {carregandoPrevencao ? (
                        <div className="flex items-center gap-2 text-xs text-amber-700 py-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Carregando dados históricos do 6º ano...</span>
                        </div>
                      ) : habilidadesPrevencao.length > 0 ? (
                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                          {habilidadesPrevencao.slice(0, 10).map((hab) => {
                            const isAdded = (data.aprendizagensNaoConsolidadas || "").includes(
                              hab.descricao
                            );

                            const handleAdicionarFocoPreventivo = () => {
                              const turmaNome = primeiraTurma || "6A";
                              const linha = `• [${turmaNome} (Ação Preventiva - Histórico 6º Ano: ${hab.taxaAcerto})]: ${hab.descricao}`;
                              const textoAtual = (data.aprendizagensNaoConsolidadas || "").trim();
                              if (textoAtual.includes(hab.descricao)) return;
                              const novoTexto = textoAtual ? `${textoAtual}\n${linha}` : linha;
                              onChange("aprendizagensNaoConsolidadas", novoTexto);
                            };

                            return (
                              <div
                                key={hab.id}
                                className="flex items-start gap-2.5 p-2 rounded hover:bg-slate-50 transition-colors pt-2"
                              >
                                <span className="font-bold text-[11px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 flex-shrink-0 mt-0.5">
                                  {hab.taxaAcerto}
                                </span>

                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-800 leading-snug">
                                    {hab.descricao}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {hab.linkMaterial && (
                                    <a
                                      href={hab.linkMaterial}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Material de Apoio (Coluna E)"
                                      className="p-1 text-amber-700 hover:text-amber-900 bg-amber-50 rounded border border-amber-200"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  {hab.linkQuestao && (
                                    <a
                                      href={hab.linkQuestao}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Questão de Referência (Coluna F)"
                                      className="p-1 text-sky-700 hover:text-sky-900 bg-sky-50 rounded border border-sky-200"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </a>
                                  )}

                                  <button
                                    type="button"
                                    onClick={handleAdicionarFocoPreventivo}
                                    disabled={isAdded}
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                                      isAdded
                                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-default"
                                        : "bg-sky-600 hover:bg-sky-700 text-white shadow-2xs"
                                    }`}
                                  >
                                    {isAdded ? "Adicionado" : "+ Foco Preventivo"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic py-1">
                          Nenhum dado histórico encontrado para o 6º ano nesta planilha.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mensagem de Erro */}
            {erroMsg && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {erroMsg}
              </p>
            )}

            {/* Seletor de Turma/Aba e Ações só aparecem DEPOIS de conectar ao menos uma planilha e se houver abas disponíveis */}
            {(planilhaConectada || planilhaAnteriorConectada) ? (
              abasDisponiveis.length > 0 ? (
                <div className="space-y-3 pt-1 border-t border-slate-200/60">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-600 font-semibold">Turma / Período:</span>
                        <select
                          value={abaSelecionada}
                          onChange={(e) => setAbaSelecionada(e.target.value)}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        >
                          {abasDisponiveis.map((aba) => (
                            <option key={aba} value={aba}>
                              {formatarRotuloAba(aba)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Botões discretos com fundo branco ao lado do seletor: Atual, Anterior, Comparação */}
                      <div className="inline-flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setModoExibicaoDescritores("atual")}
                          className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                            modoExibicaoDescritores === "atual"
                              ? "bg-amber-50 text-amber-800 font-bold border border-amber-300 shadow-2xs"
                              : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                          }`}
                        >
                          Atual
                        </button>
                        <button
                          type="button"
                          onClick={() => setModoExibicaoDescritores("anterior")}
                          className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                            modoExibicaoDescritores === "anterior"
                              ? "bg-sky-50 text-sky-800 font-bold border border-sky-300 shadow-2xs"
                              : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                          }`}
                        >
                          Anterior
                        </button>
                        <button
                          type="button"
                          onClick={() => setModoExibicaoDescritores("comparacao")}
                          className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                            modoExibicaoDescritores === "comparacao"
                              ? "bg-slate-100 text-slate-900 font-bold border border-slate-400 shadow-2xs"
                              : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                          }`}
                        >
                          Comparação
                        </button>
                      </div>
                    </div>

                    {(modoExibicaoDescritores === "anterior" ? descritoresAnterior : descritores).length > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSelectAll}
                          className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-[11px] font-semibold transition-colors"
                        >
                          Marcar Todos
                        </button>
                        <button
                          type="button"
                          onClick={handleClearSelection}
                          className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-500 rounded text-[11px] font-semibold transition-colors"
                        >
                          Desmarcar
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Estado de Carregamento */}
                  {(carregando || (modoExibicaoDescritores !== "atual" && carregandoAnterior)) && (
                    <div className="flex items-center gap-2 text-xs text-amber-700 py-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        Carregando descritores{" "}
                        {modoExibicaoDescritores === "anterior"
                          ? "do ano anterior..."
                          : modoExibicaoDescritores === "comparacao"
                          ? "atuais e do ano anterior..."
                          : `da aba ${abaSelecionada}...`}
                      </span>
                    </div>
                  )}
                </div>
              ) : null
            ) : (
              !conectandoPlanilha && !conectandoPlanilhaAnterior && !erroMsg && (
                <p className="text-xs text-slate-500 italic py-1">
                  Cole o link da sua planilha acima e clique em <strong>Conectar Planilha</strong> para carregar as salas e habilidades disponíveis.
                </p>
              )
            )}


            {/* LISTA COMPACTA DE DESCRITORES COM CHECKBOX */}
            {!carregando && (
              (() => {
                // Garante que ambas as listas estejam ordenadas da menor taxa de acerto para a maior
                const listaAtualOrdenada = descritores
                  .slice()
                  .sort((a, b) => extrairValorPorcentagem(a.taxaAcerto) - extrairValorPorcentagem(b.taxaAcerto));

                const listaAnteriorOrdenada = descritoresAnterior
                  .slice()
                  .sort((a, b) => extrairValorPorcentagem(a.taxaAcerto) - extrairValorPorcentagem(b.taxaAcerto));

                const temDadosAmbosAnos = listaAtualOrdenada.length > 0 && listaAnteriorOrdenada.length > 0;

                let listaParaExibir: DescritorHabilidade[] = [];
                if (modoExibicaoDescritores === "atual") {
                  listaParaExibir = listaAtualOrdenada;
                } else if (modoExibicaoDescritores === "anterior") {
                  listaParaExibir = listaAnteriorOrdenada;
                } else {
                  // Modo Comparação: se houver lista atual, usa a lista atual;
                  // se o 1º bimestre atual ainda não tiver dados, usa a lista anterior como referência para comparação
                  listaParaExibir = listaAtualOrdenada.length > 0 ? listaAtualOrdenada : listaAnteriorOrdenada;
                }

                // Normalizador consistente: minúsculas, sem acentos, sem pontuações, espaços simples
                const normalizarChave = (txt: string) => {
                  if (!txt) return "";
                  return txt
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9]/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
                };

                // Extrai código de habilidade oficial (ex: "EF07MA01", "EF06MA04" ou "D01") de forma estrita
                const extrairCodigoHabilidade = (txt: string) => {
                  if (!txt) return null;
                  const m = txt.match(/\b([A-Z]{2}\d{2}[A-Z]{2}\d{2}|D\d{2,3})\b/i);
                  return m ? m[1].toUpperCase() : null;
                };

                // Mapeia descritores do ano anterior:
                // 1. Por código de habilidade único (se presente e não ambíguo)
                const mapaPorCodigo = new Map<string, DescritorHabilidade>();
                const codigosDuplicados = new Set<string>();

                // 2. Por descrição normalizada
                const mapaPorChave = new Map<string, DescritorHabilidade>();
                // 3. Por descrição pura trim
                const mapaTextoPuro = new Map<string, DescritorHabilidade>();

                listaAnteriorOrdenada.forEach((d) => {
                  const textoLimpo = (d.descricao || "").trim();
                  if (textoLimpo) {
                    mapaTextoPuro.set(textoLimpo, d);
                  }

                  const chave = normalizarChave(d.descricao);
                  if (chave) {
                    mapaPorChave.set(chave, d);
                  }

                  const cod = extrairCodigoHabilidade(d.descricao);
                  if (cod) {
                    if (mapaPorCodigo.has(cod)) {
                      codigosDuplicados.add(cod);
                    } else {
                      mapaPorCodigo.set(cod, d);
                    }
                  }
                });

                // Remove códigos ambíguos para evitar correspondências falsas
                codigosDuplicados.forEach((cod) => mapaPorCodigo.delete(cod));

                // Função auxiliar para encontrar o descritor correspondente do ano anterior:
                // No modo comparação, ambos começam ordenados do menor para o maior percentual (posição 0 com 0, 1 com 1, etc.)
                const buscarCorrespondenteAnterior = (
                  itemAtual: DescritorHabilidade,
                  indiceOrdenado: number
                ): DescritorHabilidade | undefined => {
                  // Se o índice ordinal estiver dentro dos limites da lista anterior ordenada,
                  // alinha exatamente na mesma posição de menor para maior (1º menor com 1º menor, etc.)
                  if (indiceOrdenado >= 0 && indiceOrdenado < listaAnteriorOrdenada.length) {
                    return listaAnteriorOrdenada[indiceOrdenado];
                  }

                  const textoAtual = (itemAtual.descricao || "").trim();
                  if (mapaTextoPuro.has(textoAtual)) {
                    return mapaTextoPuro.get(textoAtual);
                  }

                  const chaveAtual = normalizarChave(textoAtual);
                  if (chaveAtual && mapaPorChave.has(chaveAtual)) {
                    return mapaPorChave.get(chaveAtual);
                  }

                  return undefined;
                };

                if (listaParaExibir.length === 0) {
                  if (modoExibicaoDescritores === "anterior") {
                    return (
                      <p className="text-xs text-slate-500 italic py-2">
                        {planilhaAnteriorConectada
                          ? "Nenhum descritor correspondente encontrado para esta turma na planilha do ano anterior."
                          : "Conecte a 'Planilha do Ano Anterior' no painel acima para visualizar os descritores do ano anterior."}
                      </p>
                    );
                  }
                  return null;
                }

                return (
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                    {listaParaExibir.map((item, index) => {
                        const isChecked = selecionadosIds.has(item.id);
                        const itemAnterior = buscarCorrespondenteAnterior(item, index);

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleToggleDescritor(item)}
                            className={`flex items-start gap-2.5 p-2 rounded cursor-pointer transition-colors ${
                              isChecked
                                ? "bg-amber-50/70 border border-amber-200/80"
                                : "hover:bg-slate-100/70 border border-transparent"
                            }`}
                          >
                            <button
                              type="button"
                              className="mt-0.5 text-amber-600 flex-shrink-0"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-800 leading-snug">
                                {item.descricao}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px]">
                                {modoExibicaoDescritores === "atual" && (
                                  <span className="font-semibold text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded">
                                    {item.taxaAcerto} acerto
                                  </span>
                                )}

                                {modoExibicaoDescritores === "anterior" && (
                                  <span className="font-bold text-white bg-sky-600 px-2 py-0.5 rounded shadow-2xs">
                                    Anterior: {item.taxaAcerto}
                                  </span>
                                )}

                                {modoExibicaoDescritores === "comparacao" && (
                                  <div className="flex items-center gap-1.5">
                                    {/* Targeta Laranja para o Atual */}
                                    {temDadosAmbosAnos ? (
                                      <span className="font-bold text-white bg-amber-500 px-2 py-0.5 rounded shadow-2xs">
                                        Atual: {item.taxaAcerto}
                                      </span>
                                    ) : listaAtualOrdenada.length > 0 ? (
                                      <span className="font-bold text-white bg-amber-500 px-2 py-0.5 rounded shadow-2xs">
                                        Atual: {item.taxaAcerto}
                                      </span>
                                    ) : (
                                      <span className="font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-[10px]" title="Aguardando aplicação ou tabulação dos dados da turma deste ano">
                                        Atual: Aguardando
                                      </span>
                                    )}

                                    {/* Targeta Azul para o Anterior */}
                                    {temDadosAmbosAnos ? (
                                      itemAnterior ? (
                                        <span className="font-bold text-white bg-sky-600 px-2 py-0.5 rounded shadow-2xs" title={`Correspondência anterior: ${itemAnterior.taxaAcerto}`}>
                                          Anterior: {itemAnterior.taxaAcerto}
                                        </span>
                                      ) : (
                                        <span className="font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded text-[9px]">
                                          Anterior: Aguardando
                                        </span>
                                      )
                                    ) : listaAnteriorOrdenada.length > 0 ? (
                                      <span className="font-bold text-white bg-sky-600 px-2 py-0.5 rounded shadow-2xs" title={`Histórico do ano anterior: ${item.taxaAcerto}`}>
                                        Anterior: {item.taxaAcerto}
                                      </span>
                                    ) : (
                                      <span className="font-bold text-sky-900 bg-sky-100 border border-sky-300 px-2 py-0.5 rounded text-[10px]">
                                        Anterior: Aguardando
                                      </span>
                                    )}
                                  </div>
                                )}

                                <span className="text-slate-500 font-medium">{item.componente}</span>
                              </div>
                            </div>

                            {/* Botões com o símbolo do Olho para visualizar Material (Coluna E) e Questão (Coluna F) */}
                            <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                              {/* Coluna E: Material */}
                              {item.linkMaterial ? (
                                <a
                                  href={item.linkMaterial}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Visualizar Material Pedagógico (Coluna E)"
                                  className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/90 px-2 py-0.5 rounded border border-amber-200 transition-all shadow-2xs hover:shadow-xs"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Material</span>
                                </a>
                              ) : (
                                <span
                                  title="Sem Material Pedagógico (Coluna E)"
                                  className="flex items-center gap-1 text-[11px] text-slate-300 px-1 py-0.5 opacity-40 cursor-not-allowed"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Material</span>
                                </span>
                              )}

                              {/* Coluna F: Questão */}
                              {item.linkQuestao ? (
                                <a
                                  href={item.linkQuestao}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Visualizar Questão de Referência (Coluna F)"
                                  className="flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100/90 px-2 py-0.5 rounded border border-sky-200 transition-all shadow-2xs hover:shadow-xs"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Questão</span>
                                </a>
                              ) : (
                                <span
                                  title="Sem Questão cadastrada (Coluna F)"
                                  className="flex items-center gap-1 text-[11px] text-slate-300 px-1 py-0.5 opacity-40 cursor-not-allowed"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Questão</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })()
            )}

            {!carregando && descritores.length === 0 && !erroMsg && !infoHistorica.isFundamental1 && abasDisponiveis.length > 0 && (
              <p className="text-xs text-slate-500 italic py-2">
                Nenhum descritor encontrado nesta aba para o componente curricular selecionado (
                {data.componenteCurricular || "não definido"}).
              </p>
            )}
          </div>
        )}
      </div>

      {/* Caixa de Texto que migra para o DOCX */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
          Texto de Aprendizagens Não Consolidadas:
        </label>
        <textarea
          rows={8}
          value={data.aprendizagensNaoConsolidadas}
          onChange={(e) => onChange("aprendizagensNaoConsolidadas", e.target.value)}
          placeholder="Selecione os descritores nos checkboxes acima ou digite aqui..."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all text-sm leading-relaxed"
        />
        <p className="text-[11px] text-slate-400 mt-1">
          Dica: Os descritores marcados nos checkboxes acima alimentam este campo automaticamente, permitindo que você adicione anotações ou edite o texto livremente.
        </p>
      </div>
    </div>
  );
};
