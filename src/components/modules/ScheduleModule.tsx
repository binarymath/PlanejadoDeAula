import React, { useState, useEffect } from "react";
import { CalendarRange, CalendarSync, Sparkles, WandSparkles, RotateCcw, CheckCircle2 } from "lucide-react";
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
}

interface ScheduleModuleProps {
  data: LessonPlanState;
  onChange: (field: keyof LessonPlanState, value: string) => void;
}

export const ScheduleModule: React.FC<ScheduleModuleProps> = ({
  data,
  onChange,
}) => {
  const [aulasCurriculo, setAulasCurriculo] = useState<AulaCurriculoItem[]>([]);
  const [colunaEscolhida, setColunaEscolhida] = useState<ColunaCurriculoOpcao>("conteudo");
  const [rascunhoSemanas, setRascunhoSemanas] = useState<SemanaRascunho[]>([]);
  const [mensagemRascunho, setMensagemRascunho] = useState("");

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

  const prepararSemanasVazias = () => {
    if (semanasEstruturadas.length === 0) {
      setMensagemRascunho("Informe as datas de início e fim do bimestre na Identificação para montar as semanas.");
      setRascunhoSemanas([]);
      return;
    }
    setRascunhoSemanas(semanasEstruturadas.map((semana) => ({
      ...semana,
      atividades: semana.feriadosNaSemana.join("\n"),
      itemSelecionado: "",
    })));
    setMensagemRascunho("Semanas preparadas. Preencha cada campo e aplique quando estiver pronto.");
  };

  const distribuirConteudos = () => {
    if (semanasEstruturadas.length === 0) {
      prepararSemanasVazias();
      return;
    }

    const itens = aulasCurriculo
      .map((aula) => obterTextoAula(aula).trim())
      .filter(Boolean);
    if (itens.length === 0) {
      setMensagemRascunho("Não há itens preenchidos nessa coluna. Você pode preparar semanas vazias e escrever manualmente.");
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
      atividades: [semana.feriadosNaSemana.join("\n"), itensPorSemana[index].join("; ")]
        .filter(Boolean)
        .join("\n"),
      itemSelecionado: "",
    })));
    setMensagemRascunho(`${itens.length} itens distribuídos em ${semanasEstruturadas.length} semanas. Revise e edite antes de aplicar.`);
  };

  const atualizarSemanaRascunho = (indice: number, atividades: string) => {
    setRascunhoSemanas((atuais) => atuais.map((semana, index) =>
      index === indice ? { ...semana, atividades } : semana
    ));
  };

  const atualizarItemSelecionado = (indice: number, itemSelecionado: string) => {
    setRascunhoSemanas((atuais) => atuais.map((semana, index) =>
      index === indice ? { ...semana, itemSelecionado } : semana
    ));
  };

  const adicionarItemNaSemana = (indice: number) => {
    const semana = rascunhoSemanas[indice];
    if (!semana || semana.itemSelecionado === "") return;
    const aula = aulasCurriculo[Number(semana.itemSelecionado)];
    const item = aula ? obterTextoAula(aula).trim() : "";
    if (!item) return;

    const atividades = semana.atividades.trim();
    atualizarSemanaRascunho(indice, atividades ? `${atividades}\n${item}` : item);
    atualizarItemSelecionado(indice, "");
  };

  const aplicarRascunho = () => {
    if (rascunhoSemanas.length === 0) return;
    if (
      data.cronograma.trim()
      && !window.confirm("O cronograma atual será substituído pelo rascunho. Deseja continuar?")
    ) return;

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
    onChange("cronograma", texto);
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
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

        <button
          type="button"
          onClick={handleGerarPorDatas}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all shadow-xs"
        >
          <CalendarSync className="w-4 h-4" />
          <span>Gerar Apenas Datas (Seg a Sex)</span>
        </button>
      </div>

      <section className="border border-emerald-200 bg-emerald-50/40 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Montagem guiada sem IA</h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Distribua os conteúdos pelas semanas ou prepare espaços vazios para preencher manualmente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={distribuirConteudos}
              disabled={semanasEstruturadas.length === 0 || aulasCurriculo.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-md"
            >
              <WandSparkles className="w-4 h-4" />
              Distribuir conteúdos
            </button>
            <button
              type="button"
              onClick={prepararSemanasVazias}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md"
            >
              <CalendarSync className="w-4 h-4" />
              Preparar semanas vazias
            </button>
          </div>
        </div>

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
          <p role="status" className="px-4 py-2 text-xs text-emerald-900 bg-emerald-50 border-b border-emerald-100">
            {mensagemRascunho}
          </p>
        )}

        {rascunhoSemanas.length > 0 && (
          <div className="bg-white">
            <div className="max-h-[34rem] overflow-y-auto divide-y divide-slate-200">
              {rascunhoSemanas.map((semana, indice) => (
                <div key={`${semana.rotulo}-${indice}`} className="px-4 py-3 grid grid-cols-1 md:grid-cols-[12rem_minmax(0,1fr)] gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-500 uppercase">{semana.mes}</p>
                    <p className="text-xs font-semibold text-slate-800">{semana.rotulo}</p>
                    <p className="text-[11px] text-slate-500">
                      {semana.diasLetivos} dias letivos
                    </p>
                    {semana.aulasPorTurma.length > 0 && (
                      <div className="pt-1 space-y-0.5" aria-label="Carga prevista por turma, apenas para consulta">
                        <p className="text-[10px] font-semibold text-slate-500">Aulas previstas · consulta</p>
                        {semana.aulasPorTurma.map((turma, turmaIndice) => (
                          <p key={`${turma.nome}-${turmaIndice}`} className="text-[11px] text-slate-600">
                            {turma.nome}: {turma.quantidade} {turma.quantidade === 1 ? "aula" : "aulas"}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {aulasCurriculo.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={semana.itemSelecionado}
                          onChange={(event) => atualizarItemSelecionado(indice, event.target.value)}
                          aria-label={`Selecionar conteúdo para ${semana.rotulo}`}
                          className="min-w-0 flex-1 px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-[11px] text-slate-600"
                        >
                          <option value="">Adicionar conteúdo da planilha...</option>
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
                          className="px-2.5 py-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 text-[11px] font-semibold rounded-md"
                        >
                          Adicionar
                        </button>
                      </div>
                    )}
                    <textarea
                      rows={semana.atividades.length > 120 ? 3 : 2}
                      value={semana.atividades}
                      onChange={(event) => atualizarSemanaRascunho(indice, event.target.value)}
                      aria-label={`Atividades da semana ${semana.rotulo}`}
                      placeholder="Eventos e atividades desta semana. Edite ou acrescente conteúdos..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-y"
                    />
                  </div>
                </div>
              ))}
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                Aplicar ao cronograma
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Assistente Gemini com Escolha da Coluna da Planilha de Objetos de Conhecimento */}
      <GeminiScheduleAssistant
        plano={data}
        aulasCurriculo={aulasCurriculo}
        semanas={semanasEstruturadas}
        colunaEscolhida={colunaEscolhida}
        onColunaChange={setColunaEscolhida}
        onAplicarCronograma={handleAplicarDoGemini}
      />

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
