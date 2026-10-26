import React, { useState, useEffect } from "react";
import { CalendarRange, CalendarSync, Sparkles, WandSparkles, RotateCcw, CheckCircle2, X, Plus, Trash2, GripVertical, AlertTriangle } from "lucide-react";
import { LessonPlanState } from "../../types/lessonPlan";
import {
  gerarCronogramaPorDatas,
  obterSemanasEstruturadas,
  SemanaCronogramaInfo,
} from "../../utils/scheduleHelper";
import {
  obterAulasCurriculo,
  AulaCurriculoItem,
} from "../../services/curriculumService";
import { ColunaCurriculoOpcao } from "../../services/geminiScheduleService";
import { GeminiScheduleAssistant } from "../common/GeminiScheduleAssistant";

const STORAGE_CURRICULO_URL_KEY = "planejador_url_planilha_curriculo";

interface SemanaRascunho extends SemanaCronogramaInfo {
  atividades: string;
  itemSelecionado: string;
  atividadeManual: string;
}

interface TransferenciaConteudoPendente {
  item: string;
  semanasOrigem: number[];
  semanaDestino: number;
}

interface CartaoArrastado {
  semanaOrigem: number;
  cartaoOrigem: number;
}

interface ScheduleModuleProps {
  data: LessonPlanState;
  onChange: (field: keyof LessonPlanState, value: string) => void;
  fullWidth?: boolean;
}

export const ScheduleModule: React.FC<ScheduleModuleProps> = ({
  data,
  onChange,
  fullWidth = false,
}) => {
  const [aulasCurriculo, setAulasCurriculo] = useState<AulaCurriculoItem[]>([]);
  const [colunaEscolhida, setColunaEscolhida] = useState<ColunaCurriculoOpcao>("conteudo");
  const [modoCronograma, setModoCronograma] = useState<"manual" | "ia">("manual");
  const [rascunhoSemanas, setRascunhoSemanas] = useState<SemanaRascunho[]>([]);
  const [mensagemRascunho, setMensagemRascunho] = useState("");
  const [transferenciaPendente, setTransferenciaPendente] = useState<TransferenciaConteudoPendente | null>(null);
  const [cartaoArrastado, setCartaoArrastado] = useState<CartaoArrastado | null>(null);
  const [confirmarSubstituicaoAberto, setConfirmarSubstituicaoAberto] = useState(false);

  // Ano e bimestre ativos
  const anoAtivo = data.anoEscolar || (data.turmas && data.turmas.length > 0 && data.turmas[0].nome ? data.turmas[0].nome : "");
  const bimestreAtivo = data.bimestre || "";

  // Carrega as aulas da aba correspondente da planilha de Objetos de Conhecimento se houver URL conectada
  useEffect(() => {
    let ativo = true;
    const carregarAulas = async () => {
      const urlCurriculo = localStorage.getItem(STORAGE_CURRICULO_URL_KEY) || "";
      if (!urlCurriculo || !data.componenteCurricular.trim()) {
        setAulasCurriculo([]);
        return;
      }

      try {
        const aulas = await obterAulasCurriculo(
          anoAtivo,
          bimestreAtivo,
          urlCurriculo,
          data.componenteCurricular
        );
        if (ativo) setAulasCurriculo(aulas);
      } catch (error) {
        console.error("Erro ao carregar aulas do currículo:", error);
        if (ativo) setAulasCurriculo([]);
      }
    };

    carregarAulas();
    window.addEventListener("storage_links_updated", carregarAulas);
    window.addEventListener("storage", carregarAulas);
    return () => {
      ativo = false;
      window.removeEventListener("storage_links_updated", carregarAulas);
      window.removeEventListener("storage", carregarAulas);
    };
  }, [anoAtivo, bimestreAtivo, data.componenteCurricular]);

  // Semanas calculadas
  const semanasEstruturadas = obterSemanasEstruturadas(
    data.dataInicioBimestre,
    data.dataFimBimestre,
    data.feriadosExcecoes || [],
    data.turmas || []
  );

  const obterTextoAula = (aula: AulaCurriculoItem): string => {
    switch (colunaEscolhida) {
      case "aprendizagemEssencial": return aula.aprendizagemEssencial;
      case "habilidades": return aula.habilidades;
      case "objetivos": return aula.objetivos;
      case "descritorSaresp": return aula.descritorSaresp;
      default: return aula.conteudo;
    }
  };

  const obterCartoes = (atividades: string): string[] => atividades
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  const salvarCartoes = (semanaIndice: number, cartoes: string[]) => {
    setRascunhoSemanas((atuais) => atuais.map((semana, indice) =>
      indice === semanaIndice ? { ...semana, atividades: cartoes.join("\n") } : semana
    ));
  };

  const textoContemItem = (texto: string, item: string): boolean => {
    return texto.split("\n").some((linha) => {
      const linhaLimpa = linha.trim();
      return linhaLimpa === item || linhaLimpa.split(";").some((parte) => parte.trim() === item);
    });
  };

  const removerItemDoTexto = (texto: string, item: string): string => {
    return texto
      .split("\n")
      .map((linha) => {
        if (linha.trim() === item) return "";
        return linha
          .split(";")
          .map((parte) => parte.trim())
          .filter((parte) => parte !== item)
          .join("; ");
      })
      .filter((linha) => linha.trim())
      .join("\n");
  };

  useEffect(() => {
    if (rascunhoSemanas.length > 0 || semanasEstruturadas.length === 0) return;
    setRascunhoSemanas(semanasEstruturadas.map((semana) => ({
      ...semana,
      atividades: semana.feriadosNaSemana.join("\n"),
      itemSelecionado: "",
      atividadeManual: "",
    })));
    setMensagemRascunho("Semanas prontas. Arraste os cartões ou adicione atividades manualmente.");
  }, [semanasEstruturadas, rascunhoSemanas.length]);

  const distribuirConteudos = () => {
    if (semanasEstruturadas.length === 0) {
      setMensagemRascunho("Informe as datas de início e fim do bimestre na Identificação para montar as semanas.");
      return;
    }

    const itens = aulasCurriculo
      .map((aula) => obterTextoAula(aula).trim())
      .filter(Boolean);
    if (itens.length === 0) {
      setMensagemRascunho("Não há itens preenchidos nessa coluna. Adicione atividades manualmente nas semanas abertas.");
      return;
    }

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

    itens.forEach((item, index) => {
      const ponto = ((index + 0.5) / itens.length) * capacidadeTotal;
      const indiceSemana = limites.findIndex((limite) => ponto < limite);
      itensPorSemana[Math.max(indiceSemana, 0)].push(item);
    });

    setRascunhoSemanas(semanasEstruturadas.map((semana, index) => ({
      ...semana,
      atividades: [semana.feriadosNaSemana.join("\n"), itensPorSemana[index].join("\n")]
        .filter(Boolean)
        .join("\n"),
      itemSelecionado: "",
      atividadeManual: "",
    })));
    setMensagemRascunho(`${itens.length} itens distribuídos em ${semanasEstruturadas.length} semanas. Revise e edite antes de aplicar.`);
  };

  const atualizarItemSelecionado = (indice: number, itemSelecionado: string) => {
    setRascunhoSemanas((atuais) => atuais.map((semana, index) =>
      index === indice ? { ...semana, itemSelecionado } : semana
    ));
  };

  const atualizarAtividadeManual = (indice: number, atividadeManual: string) => {
    setRascunhoSemanas((atuais) => atuais.map((semana, semanaIndice) =>
      semanaIndice === indice ? { ...semana, atividadeManual } : semana
    ));
  };

  const atualizarCartao = (semanaIndice: number, cartaoIndice: number, texto: string) => {
    const cartoes = obterCartoes(rascunhoSemanas[semanaIndice]?.atividades || "");
    cartoes[cartaoIndice] = texto;
    salvarCartoes(semanaIndice, cartoes);
  };

  const removerCartao = (semanaIndice: number, cartaoIndice: number) => {
    const cartoes = obterCartoes(rascunhoSemanas[semanaIndice]?.atividades || "");
    cartoes.splice(cartaoIndice, 1);
    salvarCartoes(semanaIndice, cartoes);
  };

  const moverCartao = (semanaOrigem: number, cartaoOrigem: number, semanaDestino: number) => {
    if (semanaOrigem === semanaDestino) return;
    const cartoesOrigem = obterCartoes(rascunhoSemanas[semanaOrigem]?.atividades || "");
    const [cartao] = cartoesOrigem.splice(cartaoOrigem, 1);
    if (!cartao) return;
    const cartoesDestino = obterCartoes(rascunhoSemanas[semanaDestino]?.atividades || "");
    cartoesDestino.push(cartao);
    setRascunhoSemanas((atuais) => atuais.map((semana, indice) => {
      if (indice === semanaOrigem) return { ...semana, atividades: cartoesOrigem.join("\n") };
      if (indice === semanaDestino) return { ...semana, atividades: cartoesDestino.join("\n") };
      return semana;
    }));
    setMensagemRascunho(`Cartão movido para ${rascunhoSemanas[semanaDestino]?.rotulo}.`);
  };

  const adicionarAtividadeManual = (semanaIndice: number) => {
    const semana = rascunhoSemanas[semanaIndice];
    const atividade = semana?.atividadeManual.trim();
    if (!semana || !atividade) return;
    const cartoes = obterCartoes(semana.atividades);
    cartoes.push(atividade);
    setRascunhoSemanas((atuais) => atuais.map((item, indice) =>
      indice === semanaIndice
        ? { ...item, atividades: cartoes.join("\n"), atividadeManual: "" }
        : item
    ));
  };

  const adicionarItemNaSemana = (indice: number) => {
    const semana = rascunhoSemanas[indice];
    if (!semana || semana.itemSelecionado === "") return;
    const aula = aulasCurriculo[Number(semana.itemSelecionado)];
    const item = aula ? obterTextoAula(aula).trim() : "";
    if (!item) return;

    if (textoContemItem(semana.atividades, item)) {
      setMensagemRascunho(`Esse conteúdo já está nesta semana (${semana.rotulo}). Ele não foi duplicado.`);
      atualizarItemSelecionado(indice, "");
      return;
    }

    const semanasAnteriores = rascunhoSemanas
      .map((semanaExistente, semanaIndice) => ({ semanaExistente, semanaIndice }))
      .filter(({ semanaExistente, semanaIndice }) =>
        semanaIndice !== indice && textoContemItem(semanaExistente.atividades, item)
      );

    if (semanasAnteriores.length > 0) {
      const semanasOrigem = semanasAnteriores.map(({ semanaIndice }) => semanaIndice);
      const destinosDisponiveis = rascunhoSemanas
        .map((_, semanaIndice) => semanaIndice)
        .filter((semanaIndice) => !semanasOrigem.includes(semanaIndice));

      if (destinosDisponiveis.length === 0) {
        setMensagemRascunho("Esse conteúdo já está em todas as semanas disponíveis.");
        return;
      }

      const semanaDestino = destinosDisponiveis.includes(indice) ? indice : destinosDisponiveis[0];
      setTransferenciaPendente({ item, semanasOrigem, semanaDestino });
      return;
    }

    salvarCartoes(indice, [...obterCartoes(semana.atividades), item]);
    atualizarItemSelecionado(indice, "");
    setMensagemRascunho(`Conteúdo adicionado à semana ${semana.rotulo}.`);
  };

  const atualizarDestinoTransferencia = (semanaDestino: number) => {
    setTransferenciaPendente((atual) => atual ? { ...atual, semanaDestino } : atual);
  };

  const confirmarTransferencia = () => {
    if (!transferenciaPendente) return;
    const { item, semanasOrigem, semanaDestino } = transferenciaPendente;
    const semanaAlvo = rascunhoSemanas[semanaDestino];
    if (!semanaAlvo) return;

    setRascunhoSemanas((atuais) => atuais.map((semanaAtual, semanaIndice) => {
      if (semanasOrigem.includes(semanaIndice)) {
        return { ...semanaAtual, atividades: removerItemDoTexto(semanaAtual.atividades, item) };
      }
      if (semanaIndice === semanaDestino) {
        const atividades = semanaAtual.atividades.trim();
        return { ...semanaAtual, atividades: atividades ? `${atividades}\n${item}` : item };
      }
      return semanaAtual;
    }));
    atualizarItemSelecionado(semanaDestino, "");
    setMensagemRascunho(`Conteúdo movido para ${semanaAlvo.rotulo}.`);
    setTransferenciaPendente(null);
  };

  const montarTextoRascunho = () => {
    const meses = new Map<string, SemanaRascunho[]>();
    rascunhoSemanas.forEach((semana) => {
      if (!meses.has(semana.mes)) meses.set(semana.mes, []);
      meses.get(semana.mes)!.push(semana);
    });
    const texto = Array.from(meses.entries()).map(([mes, semanas]) => {
      const linhas = semanas.map((semana) => {
        return `${semana.rotulo}: ${semana.atividades.trim()}`;
      });
      return `${mes}:\n${linhas.join("\n")}`;
    }).join("\n\n");
    return texto;
  };

  const aplicarRascunho = () => {
    if (rascunhoSemanas.length === 0) return;
    if (data.cronograma.trim()) {
      setConfirmarSubstituicaoAberto(true);
      return;
    }
    confirmarAplicacaoRascunho();
  };

  const confirmarAplicacaoRascunho = () => {
    const texto = montarTextoRascunho();
    onChange("cronograma", texto);
    setConfirmarSubstituicaoAberto(false);
    setMensagemRascunho("Cronograma aplicado ao planejamento.");
  };

  const handleGerarPorDatas = () => {
    const cronogramaGerado = gerarCronogramaPorDatas(
      data.dataInicioBimestre,
      data.dataFimBimestre,
      data.feriadosExcecoes || []
    );
    onChange("cronograma", cronogramaGerado);
  };

  const handleAplicarDoGemini = (cronogramaTexto: string) => {
    onChange("cronograma", cronogramaTexto);
  };

  return (
    <div className={fullWidth
      ? "min-h-[calc(100vh-4rem)] w-full bg-white p-2 sm:p-4 space-y-4"
      : "bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6"
    }>
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <CalendarRange className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">5. Cronograma por Mês e Datas</h2>
            <p className="text-xs text-slate-500">
              Distribuição organizada por mês e semana, associada com a planilha de Objetos de Conhecimento
            </p>
          </div>
        </div>

      </div>

      <div className="flex justify-end">
        <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-lg" role="group" aria-label="Modo de montagem do cronograma">
          <button
            type="button"
            onClick={() => setModoCronograma("manual")}
            aria-pressed={modoCronograma === "manual"}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
              modoCronograma === "manual"
                ? "bg-white text-sky-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            Manual
          </button>
          <button
            type="button"
            onClick={() => setModoCronograma("ia")}
            aria-pressed={modoCronograma === "ia"}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
              modoCronograma === "ia"
                ? "bg-white text-sky-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Com IA
          </button>
        </div>
      </div>

      {modoCronograma === "manual" && <section className="border border-sky-200 bg-sky-50/40 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-sky-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Montagem guiada sem IA</h3>
              <p className="text-xs text-slate-600 mt-0.5">
              Distribua os conteúdos pelas semanas ou adicione atividades manualmente nos cartões.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGerarPorDatas}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md"
            >
              <CalendarSync className="w-4 h-4" />
              Gerar datas
            </button>
            <button
              type="button"
              onClick={distribuirConteudos}
              disabled={semanasEstruturadas.length === 0 || aulasCurriculo.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-md"
            >
              <WandSparkles className="w-4 h-4" />
              Distribuir conteúdos
            </button>
          </div>
        </div>

        {semanasEstruturadas.length === 0 && (
          <p className="px-4 py-3 text-xs text-slate-600 bg-white border-b border-slate-100">
            Configure as datas de início e fim do bimestre na Identificação para abrir automaticamente as colunas semanais.
          </p>
        )}

        {aulasCurriculo.length > 0 && (
          <div className="px-4 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center gap-3">
            <label htmlFor="coluna-cronograma-manual" className="text-xs font-semibold text-slate-700">
              Conteúdo a distribuir
            </label>
            <select
              id="coluna-cronograma-manual"
              value={colunaEscolhida}
              onChange={(event) => setColunaEscolhida(event.target.value as ColunaCurriculoOpcao)}
              className="max-w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white text-xs text-slate-800"
            >
              <option value="conteudo">Conteúdo da aula</option>
              <option value="aprendizagemEssencial">Aprendizagem essencial</option>
              <option value="habilidades">Habilidades</option>
              <option value="objetivos">Objetivos de aprendizagem</option>
              <option value="descritorSaresp">Descritor SARESP</option>
            </select>
            <span className="text-[11px] text-slate-500">
              {semanasEstruturadas.length} semanas letivas no período
            </span>
          </div>
        )}

        {mensagemRascunho && (
          <p role="status" className="px-4 py-2 text-xs text-sky-900 bg-sky-50 border-b border-sky-100">
            {mensagemRascunho}
          </p>
        )}

        {rascunhoSemanas.length > 0 && (
          <div className="bg-white">
            <div className="p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 items-start gap-3">
                {rascunhoSemanas.map((semana, indice) => {
                  const cartoes = obterCartoes(semana.atividades);
                  return (
                    <section
                      key={`${semana.rotulo}-${indice}`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (cartaoArrastado) {
                          moverCartao(cartaoArrastado.semanaOrigem, cartaoArrastado.cartaoOrigem, indice);
                        }
                        setCartaoArrastado(null);
                      }}
                      aria-label={`${semana.mes}, ${semana.rotulo}`}
                      className={`min-w-0 w-full rounded-lg border bg-slate-50 flex flex-col transition-colors ${
                        cartaoArrastado && cartaoArrastado.semanaOrigem !== indice
                          ? "border-sky-500 ring-2 ring-sky-100"
                          : "border-slate-200"
                      }`}
                    >
                      <header className="p-3 border-b border-slate-200 bg-white rounded-t-lg">
                        <p className="text-[10px] font-bold uppercase text-slate-500">{semana.mes}</p>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{semana.rotulo}</h4>
                          <span className="text-[10px] text-slate-500 whitespace-nowrap">{cartoes.length} cartões</span>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">{semana.diasLetivos} dias letivos</p>
                        {semana.aulasPorTurma.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5" aria-label="Aulas previstas por turma, consulta">
                            {semana.aulasPorTurma.map((turma, turmaIndice) => (
                              <span key={`${turma.nome}-${turmaIndice}`} className="text-[10px] text-slate-500">
                                {turma.nome}: {turma.quantidade} aulas
                              </span>
                            ))}
                          </div>
                        )}
                      </header>

                      <div className="p-2 space-y-2 flex-1">
                        {cartoes.map((cartao, cartaoIndice) => (
                          <article
                            key={`${indice}-${cartaoIndice}`}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move";
                              setCartaoArrastado({ semanaOrigem: indice, cartaoOrigem: cartaoIndice });
                            }}
                            onDragEnd={() => setCartaoArrastado(null)}
                            className={`p-2.5 bg-white border border-slate-200 rounded-md shadow-sm space-y-2 ${
                              cartaoArrastado?.semanaOrigem === indice && cartaoArrastado.cartaoOrigem === cartaoIndice
                                ? "opacity-40"
                                : ""
                            }`}
                          >
                            <div className="flex items-start gap-1.5">
                              <GripVertical className="w-4 h-4 mt-1 text-slate-400 shrink-0 cursor-grab" aria-hidden="true" />
                              <textarea
                                ref={(element) => {
                                  if (element) {
                                    element.style.height = "auto";
                                    element.style.height = `${element.scrollHeight}px`;
                                  }
                                }}
                                rows={2}
                                value={cartao}
                                onChange={(event) => {
                                  event.currentTarget.style.height = "auto";
                                  event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
                                  atualizarCartao(indice, cartaoIndice, event.target.value);
                                }}
                                aria-label={`Editar cartão ${cartaoIndice + 1} da semana ${semana.rotulo}`}
                                className="min-w-0 flex-1 min-h-16 resize-none overflow-hidden text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-600 rounded"
                              />
                              <button
                                type="button"
                                onClick={() => removerCartao(indice, cartaoIndice)}
                                aria-label={`Remover cartão da semana ${semana.rotulo}`}
                                title="Remover cartão"
                                className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {rascunhoSemanas.length > 1 && (
                              <select
                                value=""
                                onChange={(event) => {
                                  if (event.target.value !== "") {
                                    moverCartao(indice, cartaoIndice, Number(event.target.value));
                                  }
                                }}
                                aria-label={`Mover cartão da semana ${semana.rotulo}`}
                                className="w-full px-2 py-1 border border-slate-200 rounded bg-slate-50 text-[10px] text-slate-600"
                              >
                                <option value="">Mover para outra semana...</option>
                                {rascunhoSemanas.map((destino, destinoIndice) => destinoIndice !== indice && (
                                  <option key={`${destino.rotulo}-${destinoIndice}`} value={destinoIndice}>
                                    {destino.mes} · {destino.rotulo}
                                  </option>
                                ))}
                              </select>
                            )}
                          </article>
                        ))}
                        {cartoes.length === 0 && (
                          <p className="px-2 py-5 text-center text-[11px] text-slate-400">
                            Arraste um cartão para esta semana ou adicione um conteúdo.
                          </p>
                        )}
                      </div>

                      <footer className="p-2 border-t border-slate-200 bg-white rounded-b-lg space-y-2">
                        {aulasCurriculo.length > 0 && (
                          <div className="flex gap-1.5">
                            <select
                              value={semana.itemSelecionado}
                              onChange={(event) => atualizarItemSelecionado(indice, event.target.value)}
                              aria-label={`Selecionar conteúdo para ${semana.rotulo}`}
                              className="min-w-0 flex-1 px-2 py-1.5 border border-slate-200 rounded bg-white text-[10px] text-slate-600"
                            >
                              <option value="">Conteúdo da planilha...</option>
                              {aulasCurriculo.map((aula, aulaIndice) => {
                                const texto = obterTextoAula(aula).trim();
                                return texto ? (
                                  <option key={`${aula.id}-${aulaIndice}`} value={aulaIndice}>
                                    Aula {aula.aula}: {texto}
                                  </option>
                                ) : null;
                              })}
                            </select>
                            <button
                              type="button"
                              onClick={() => adicionarItemNaSemana(indice)}
                              disabled={semana.itemSelecionado === ""}
                              aria-label={`Adicionar conteúdo à semana ${semana.rotulo}`}
                              className="p-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 rounded"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={semana.atividadeManual}
                            onChange={(event) => atualizarAtividadeManual(indice, event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                adicionarAtividadeManual(indice);
                              }
                            }}
                            aria-label={`Nova atividade para ${semana.rotulo}`}
                            placeholder="Adicionar atividade..."
                            className="min-w-0 flex-1 px-2 py-1.5 border border-slate-200 rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-sky-600"
                          />
                          <button
                            type="button"
                            onClick={() => adicionarAtividadeManual(indice)}
                            disabled={!semana.atividadeManual.trim()}
                            aria-label={`Adicionar atividade manual à semana ${semana.rotulo}`}
                            className="p-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 rounded"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </footer>
                    </section>
                  );
                })}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2">
              <button
                type="button"
                onClick={distribuirConteudos}
                disabled={aulasCurriculo.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold rounded-md"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Redistribuir
              </button>
              <button
                type="button"
                onClick={aplicarRascunho}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold rounded-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                Aplicar ao cronograma
              </button>
            </div>
          </div>
        )}
      </section>}

      {transferenciaPendente && (
        <div
          className="fixed inset-0 z-[120] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setTransferenciaPendente(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="transferencia-conteudo-titulo"
            className="w-[80vw] h-[80vh] max-w-none max-h-none bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            <header className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
              <div>
                <h2 id="transferencia-conteudo-titulo" className="text-base font-bold text-slate-900">
                  Conteúdo já adicionado
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Escolha a semana de destino. Ao confirmar, o item será removido das semanas atuais e incluído na escolhida.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTransferenciaPendente(null)}
                aria-label="Fechar transferência"
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="p-5 sm:p-7 flex-1 overflow-y-auto space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-900">Já aparece nestas datas:</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {transferenciaPendente.semanasOrigem.map((indice) => (
                    <li key={indice} className="px-2.5 py-1 bg-white border border-amber-200 rounded-md text-xs text-amber-900">
                      {rascunhoSemanas[indice]?.rotulo}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="max-w-2xl space-y-2">
                <label htmlFor="destino-transferencia-conteudo" className="block text-sm font-semibold text-slate-800">
                  Semana de destino
                </label>
                <select
                  id="destino-transferencia-conteudo"
                  value={transferenciaPendente.semanaDestino}
                  onChange={(event) => atualizarDestinoTransferencia(Number(event.target.value))}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
                >
                  {rascunhoSemanas.map((semana, indice) => (
                    !transferenciaPendente.semanasOrigem.includes(indice) && (
                      <option key={`${semana.rotulo}-${indice}`} value={indice}>
                        {semana.mes} · {semana.rotulo}
                      </option>
                    )
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">Conteúdo que será movido</p>
                <p className="max-h-48 overflow-y-auto p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {transferenciaPendente.item}
                </p>
              </div>
            </div>

            <footer className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setTransferenciaPendente(null)}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarTransferencia}
                className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold rounded-md"
              >
                Remover da origem e mover
              </button>
            </footer>
          </section>
        </div>
      )}

      {confirmarSubstituicaoAberto && (
        <div
          className="fixed inset-0 z-[130] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmarSubstituicaoAberto(false);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmar-substituicao-cronograma-titulo"
            aria-describedby="confirmar-substituicao-cronograma-descricao"
            className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <header className="px-5 py-4 bg-sky-50 border-b border-sky-100 flex items-start gap-3">
              <div className="p-2 bg-sky-100 text-sky-700 rounded-lg shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 id="confirmar-substituicao-cronograma-titulo" className="text-sm font-bold text-slate-900">
                  Substituir o cronograma atual?
                </h2>
                <p id="confirmar-substituicao-cronograma-descricao" className="mt-1 text-xs leading-relaxed text-slate-600">
                  O cronograma existente será trocado pelo conteúdo organizado no quadro semanal. Essa ação não pode ser desfeita automaticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmarSubstituicaoAberto(false)}
                aria-label="Fechar confirmação"
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </header>
            <footer className="px-5 py-3 bg-white flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmarSubstituicaoAberto(false)}
                className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAplicacaoRascunho}
                className="px-3.5 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold rounded-md"
              >
                Substituir cronograma
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* Assistente Gemini com Escolha da Coluna da Planilha de Objetos de Conhecimento */}
      {modoCronograma === "ia" && <GeminiScheduleAssistant
        plano={data}
        aulasCurriculo={aulasCurriculo}
        semanas={semanasEstruturadas}
        colunaEscolhida={colunaEscolhida}
        onColunaChange={setColunaEscolhida}
        onAplicarCronograma={handleAplicarDoGemini}
      />}

      {/* Caixa de Texto do Cronograma para DOCX */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-slate-600 uppercase">
            Detalhamento do Cronograma:
          </label>

          <span className="text-[11px] text-slate-400">
            Formato oficial: agrupado por Mês, iniciando direto na data (sem número de semana)
          </span>
        </div>

        <textarea
          rows={14}
          value={data.cronograma}
          onChange={(e) => onChange("cronograma", e.target.value)}
          placeholder="Digite o cronograma detalhado de aulas ou utilize o assistente acima para gerar automaticamente..."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm leading-relaxed font-mono text-xs"
        />
        <p className="text-[11px] text-slate-400 mt-1">
          Revise e edite as atividades por semana no construtor acima antes de aplicar. O assistente Gemini é opcional.
        </p>
      </div>
    </div>
  );
};
