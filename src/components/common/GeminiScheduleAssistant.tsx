import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Send,
  CheckCircle2,
  Bot,
  User,
  RefreshCw,
  Columns,
  Check,
  CalendarDays,
  Target,
  CheckSquare,
  Square,
} from "lucide-react";
import {
  ColunaCurriculoOpcao,
  COLUNAS_CURRICULO_DISPONIVEIS,
  ChatMensagem,
  MarcoAvaliacaoConfig,
  TipoAvaliacaoOficial,
  detectarOuSugerirMarcoAvaliacao,
  obterGeminiApiKey,
  conversarComGeminiCronograma,
} from "../../services/geminiScheduleService";
import { AulaCurriculoItem } from "../../services/curriculumService";
import { SemanaCronogramaInfo } from "../../utils/scheduleHelper";
import { LessonPlanState } from "../../types/lessonPlan";

interface GeminiScheduleAssistantProps {
  plano: LessonPlanState;
  aulasCurriculo: AulaCurriculoItem[];
  semanas: SemanaCronogramaInfo[];
  colunaEscolhida: ColunaCurriculoOpcao;
  onColunaChange: (coluna: ColunaCurriculoOpcao) => void;
  onAplicarCronograma: (cronograma: string) => void;
}

export const GeminiScheduleAssistant: React.FC<GeminiScheduleAssistantProps> = ({
  plano,
  aulasCurriculo,
  semanas,
  colunaEscolhida,
  onColunaChange,
  onAplicarCronograma,
}) => {
  const [apiKey, setApiKey] = useState<string>(() => obterGeminiApiKey());
  const [mensagens, setMensagens] = useState<ChatMensagem[]>([]);
  const [inputTexto, setInputTexto] = useState<string>("");
  const [carregando, setCarregando] = useState<boolean>(false);
  const [copiadoSucesso, setCopiadoSucesso] = useState<boolean>(false);

  // Configuração do Marco Avaliativo (Prova Paulista / SARESP)
  const [marcoAvaliacao, setMarcoAvaliacao] = useState<MarcoAvaliacaoConfig>(() =>
    detectarOuSugerirMarcoAvaliacao(plano, semanas)
  );

  // Atualiza sugestão de marco quando mudam as semanas ou o bimestre
  useEffect(() => {
    setMarcoAvaliacao(detectarOuSugerirMarcoAvaliacao(plano, semanas));
  }, [plano.bimestre, plano.dataInicioBimestre, plano.dataFimBimestre, semanas.length]);

  useEffect(() => {
    const atualizar = () => {
      setApiKey(obterGeminiApiKey());
    };
    window.addEventListener("storage", atualizar);
    window.addEventListener("focus", atualizar);
    return () => {
      window.removeEventListener("storage", atualizar);
      window.removeEventListener("focus", atualizar);
    };
  }, []);

  // Cálculo do ritmo sugerido até a semana da avaliação
  const resumoRitmo = useMemo(() => {
    if (!marcoAvaliacao.ativo || semanas.length === 0) return null;
    const semanasAteProva = Math.max(1, marcoAvaliacao.indiceSemanaLimite);
    const totalAulas = aulasCurriculo.length;
    const mediaPorSemana =
      totalAulas > 0 ? Math.ceil(totalAulas / semanasAteProva) : 0;
    const semanasPosProva = Math.max(
      0,
      semanas.length - 1 - marcoAvaliacao.indiceSemanaLimite
    );

    return {
      semanasAteProva,
      totalAulas,
      mediaPorSemana,
      semanasPosProva,
      semanaAlvo: semanas[marcoAvaliacao.indiceSemanaLimite],
    };
  }, [marcoAvaliacao, semanas, aulasCurriculo.length]);

  // Enviar mensagem para o Gemini
  const handleEnviarMensagem = async (textoPersonalizado?: string) => {
    const textoParaEnviar = (textoPersonalizado || inputTexto).trim();
    if (!textoParaEnviar || carregando) return;

    if (!apiKey) {
      alert(
        "Por favor, configure sua Chave de API do Gemini no botão 'API Gemini' no topo da página."
      );
      return;
    }

    const agora = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const userMsg: ChatMensagem = {
      id: Date.now().toString(),
      role: "user",
      texto: textoParaEnviar,
      dataHora: agora,
    };

    setMensagens((prev) => [...prev, userMsg]);
    setInputTexto("");
    setCarregando(true);

    const historico = mensagens.map((m) => ({
      role: m.role,
      parts: [{ text: m.texto }],
    }));

    try {
      const res = await conversarComGeminiCronograma({
        apiKey,
        colunaEscolhida,
        aulasCurriculo,
        semanas,
        plano,
        historicoMensagens: historico,
        mensagemUsuario: textoParaEnviar,
        marcoAvaliacao,
      });

      const modelMsg: ChatMensagem = {
        id: (Date.now() + 1).toString(),
        role: "model",
        texto: res.respostaTexto
          .replace(/<CRONOGRAMA>[\s\S]*?<\/CRONOGRAMA>/gi, "")
          .trim(),
        dataHora: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        cronogramaGerado: res.cronogramaFormatado,
      };

      setMensagens((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error("Erro no chat com o Gemini:", err);
      const erroMsg: ChatMensagem = {
        id: (Date.now() + 1).toString(),
        role: "model",
        texto: `Não foi possível gerar a resposta. Verifique sua chave de API ou conexão: ${
          err.message || err
        }`,
        dataHora: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMensagens((prev) => [...prev, erroMsg]);
    } finally {
      setCarregando(false);
    }
  };

  // Sugestão automática considerando o fechamento do conteúdo até a Prova Paulista / SARESP
  const handleSugerirCronogramaCompleto = () => {
    const colunaConfig = COLUNAS_CURRICULO_DISPONIVEIS.find(
      (c) => c.id === colunaEscolhida
    );
    const nomeColuna = colunaConfig?.label || colunaEscolhida;

    if (marcoAvaliacao.ativo && resumoRitmo?.semanaAlvo) {
      const prompt = `Elabore o cronograma completo distribuindo todas as ${aulasCurriculo.length} aulas da coluna "${nomeColuna}" de modo que 100% do conteúdo seja concluído até a semana de ${resumoRitmo.semanaAlvo.rotulo} (data da ${marcoAvaliacao.tipoAvaliacao})${
        marcoAvaliacao.incluirRevisaoVespera
          ? ", incluindo revisão geral dos descritores na véspera da avaliação"
          : ""
      }, e reserve as semanas posteriores para devolutiva, recuperação contínua e fechamento bimestral.`;
      handleEnviarMensagem(prompt);
    } else {
      const prompt = `Por favor, elabore uma sugestão de cronograma distribuindo todas as aulas da coluna "${nomeColuna}" da planilha ao longo das semanas de aula do bimestre, considerando feriados e prevendo momentos para avaliações e nivelamento.`;
      handleEnviarMensagem(prompt);
    }
  };

  const sugestoesRapidas = useMemo(() => {
    const rotuloAlvo =
      resumoRitmo?.semanaAlvo?.rotulo || "a semana da avaliação";
    const tipo = marcoAvaliacao.tipoAvaliacao;
    return [
      `Conclua 100% das aulas até ${rotuloAlvo} (${tipo}) com revisão antes da prova`,
      `Foque nos descritores mais cobrados na ${tipo} e reserve o pós-prova para recuperação`,
      `Adapte as semanas com feriado sem atrasar o conteúdo previsto para a ${tipo}`,
    ];
  }, [resumoRitmo, marcoAvaliacao.tipoAvaliacao]);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
      {/* Barra de Título Discreta */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Assistente de IA • Planejamento do Cronograma
            </h3>
            <p className="text-xs text-slate-500">
              Distribuição inteligente contemplando 100% do conteúdo até as avaliações oficiais (Prova Paulista / SARESP)
            </p>
          </div>
        </div>

        {/* Status da IA */}
        <div className="flex items-center gap-2">
          {apiKey ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-sky-700 rounded-lg text-xs font-semibold">
              <Check className="w-3.5 h-3.5 stroke-[3] text-sky-600" />
              <span>IA Pronta</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-medium">
              <span>Configure a Chave API Gemini no topo da página</span>
            </div>
          )}
        </div>
      </div>

      {/* Painel de Planejamento Reverso para Avaliações Oficiais (Prova Paulista / SARESP) */}
      {semanas.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setMarcoAvaliacao((prev) => ({ ...prev, ativo: !prev.ativo }))
                }
                className="text-sky-600 flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer"
              >
                {marcoAvaliacao.ativo ? (
                  <CheckSquare className="w-4 h-4 text-sky-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <Target className="w-4 h-4 text-sky-600" />
                <span className="uppercase tracking-wide">
                  Garantir Todo o Conteúdo até a Avaliação Oficial (Prova Paulista / SARESP)
                </span>
              </button>
            </div>

            {marcoAvaliacao.detectadoDoCalendario && (
              <span className="text-[11px] font-semibold px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-md">
                ✔ Detectado dos Eventos da Identificação
              </span>
            )}
          </div>

          {marcoAvaliacao.ativo && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* 1. Avaliação Oficial Alvo */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Avaliação Principal do Bimestre:
                  </label>
                  <select
                    value={marcoAvaliacao.tipoAvaliacao}
                    onChange={(e) =>
                      setMarcoAvaliacao((prev) => ({
                        ...prev,
                        tipoAvaliacao: e.target.value as TipoAvaliacaoOficial,
                      }))
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Prova Paulista">Prova Paulista</option>
                    <option value="SARESP">SARESP</option>
                    <option value="Prova Paulista e SARESP">
                      Prova Paulista e SARESP
                    </option>
                  </select>
                </div>

                {/* 2. Semana Limite da Avaliação */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Semana Prevista da Avaliação:
                  </label>
                  <select
                    value={marcoAvaliacao.indiceSemanaLimite}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      setMarcoAvaliacao((prev) => ({
                        ...prev,
                        indiceSemanaLimite: idx,
                        rotuloSemanaLimite: semanas[idx]?.rotulo || "",
                        detectadoDoCalendario: false,
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    {semanas.map((sem, idx) => (
                      <option key={`${sem.rotulo}-${idx}`} value={idx}>
                        Semana {idx + 1}: {sem.rotulo} ({sem.mes})
                        {idx === semanas.length - 3
                          ? " • Sugerida"
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Opção de Revisão de Véspera */}
                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setMarcoAvaliacao((prev) => ({
                        ...prev,
                        incluirRevisaoVespera: !prev.incluirRevisaoVespera,
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-700 font-medium flex items-center gap-2 transition-colors text-left"
                  >
                    {marcoAvaliacao.incluirRevisaoVespera ? (
                      <CheckSquare className="w-4 h-4 text-sky-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">
                      Incluir revisão na véspera
                    </span>
                  </button>
                </div>
              </div>

              {/* Diagnóstico de Ritmo Sugerido ao Professor */}
              {resumoRitmo && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      •{" "}
                      <strong className="text-slate-800">
                        Fase 1 (Pré-Prova):
                      </strong>{" "}
                      {resumoRitmo.semanasAteProva} semana(s) para concluir{" "}
                      {resumoRitmo.totalAulas > 0
                        ? `as ${resumoRitmo.totalAulas} aulas (~${resumoRitmo.mediaPorSemana} aulas/semana)`
                        : "100% dos conteúdos"}
                    </span>
                    <span>
                      •{" "}
                      <strong className="text-slate-800">
                        Fase 2 ({resumoRitmo.semanaAlvo?.rotulo}):
                      </strong>{" "}
                      Aplicação da {marcoAvaliacao.tipoAvaliacao}
                    </span>
                    <span>
                      •{" "}
                      <strong className="text-slate-800">
                        Fase 3 (Pós-Prova):
                      </strong>{" "}
                      {resumoRitmo.semanasPosProva} semana(s) para devolutiva e recuperação
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Seletor da Coluna da Planilha de Objetos de Conhecimento */}
      {aulasCurriculo.length > 0 ? (
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Columns className="w-4 h-4 text-sky-600" />
            <span>
              Escolha a coluna da planilha de Objetos de Conhecimento para o cronograma:
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {COLUNAS_CURRICULO_DISPONIVEIS.map((col) => {
              const isSelected = colunaEscolhida === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => onColunaChange(col.id)}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                    isSelected
                      ? "bg-sky-50 border-sky-500 ring-1 ring-sky-500 text-sky-950 font-semibold"
                      : "bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{col.label}</span>
                    {isSelected && (
                      <span className="text-[10px] bg-sky-600 text-white px-1.5 py-0.2 rounded font-bold">
                        Ativa
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-normal mt-0.5 line-clamp-1">
                    {col.descricao}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Botão de Sugestão com 1 Clique */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 mt-2">
            <span className="text-[11px] text-slate-500">
              {aulasCurriculo.length} aulas cadastradas • {semanas.length} semanas letivas
              {marcoAvaliacao.ativo && resumoRitmo?.semanaAlvo
                ? ` • Fechamento até ${resumoRitmo.semanaAlvo.rotulo} (${marcoAvaliacao.tipoAvaliacao})`
                : ""}
            </span>

            <button
              type="button"
              disabled={carregando}
              onClick={handleSugerirCronogramaCompleto}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {carregando ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>
                {marcoAvaliacao.ativo
                  ? `Sugerir Cronograma até a ${marcoAvaliacao.tipoAvaliacao}`
                  : "Sugerir Cronograma Completo com IA"}
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Conecte a planilha de Currículo na Seção 3 para usar as aulas oficiais ou clique ao lado para gerar com base nas datas do bimestre.
          </span>
          <button
            type="button"
            disabled={carregando || semanas.length === 0}
            onClick={handleSugerirCronogramaCompleto}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              Sugerir Cronograma até a {marcoAvaliacao.tipoAvaliacao}
            </span>
          </button>
        </div>
      )}

      {/* Diálogo Pedagógico com Gemini */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-sky-600" />
            <span>Conversa Pedagógica com o Gemini</span>
          </div>
          {mensagens.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setMensagens([]);
              }}
              className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold"
            >
              Limpar conversa
            </button>
          )}
        </div>

        {/* Mensagens do Chat */}
        <div className="p-4 max-h-96 overflow-y-auto space-y-3.5 bg-slate-50/30">
          {mensagens.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs space-y-3">
              <div className="w-10 h-10 mx-auto rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">
                  Planejamento alinhado à {marcoAvaliacao.tipoAvaliacao}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  Clique em uma das sugestões abaixo para organizar suas aulas garantindo todo o conteúdo antes da avaliação:
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 pt-1 max-w-2xl mx-auto">
                {sugestoesRapidas.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={!apiKey || carregando}
                    onClick={() => handleEnviarMensagem(sug)}
                    className="text-xs bg-white hover:bg-sky-50 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-sky-300 transition-colors shadow-2xs text-left cursor-pointer"
                  >
                    💡 {sug}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            mensagens.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "model" && (
                  <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-2xl p-4 text-xs leading-relaxed space-y-2.5 shadow-2xs ${
                    msg.role === "user"
                      ? "bg-sky-600 text-white rounded-br-xs font-medium"
                      : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs"
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">
                    {msg.texto}
                  </p>

                  {/* Card de Visualização do Cronograma Formatado */}
                  {msg.cronogramaGerado && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mt-2 space-y-2.5 text-slate-900">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                        <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <CalendarDays className="w-4 h-4 text-sky-600" />
                          Cronograma Organizado por Mês e Datas
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            onAplicarCronograma(msg.cronogramaGerado!);
                            setCopiadoSucesso(true);
                            setTimeout(() => setCopiadoSucesso(false), 3000);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          {copiadoSucesso ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Aplicado com Sucesso!</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Aplicar ao Cronograma Abaixo</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="bg-white rounded-lg p-3 border border-slate-200 max-h-56 overflow-y-auto">
                        <pre className="font-mono text-[11px] whitespace-pre-wrap text-slate-800 leading-relaxed font-normal">
                          {msg.cronogramaGerado}
                        </pre>
                      </div>
                    </div>
                  )}

                  <span
                    className={`block text-[10px] ${
                      msg.role === "user"
                        ? "text-sky-200 text-right"
                        : "text-slate-400"
                    }`}
                  >
                    {msg.dataHora}
                  </span>
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-2xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {carregando && (
            <div className="flex items-center gap-2.5 text-xs text-sky-700 bg-sky-50 p-3 rounded-xl border border-sky-200 max-w-md">
              <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
              <span>
                O Gemini está organizando as aulas para fechar o conteúdo até a{" "}
                {marcoAvaliacao.tipoAvaliacao}...
              </span>
            </div>
          )}
        </div>

        {/* Input de Mensagem */}
        <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
          <input
            type="text"
            value={inputTexto}
            disabled={carregando || !apiKey}
            onChange={(e) => setInputTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEnviarMensagem()}
            placeholder={
              apiKey
                ? `Instrua o Gemini (ex: antecipe as aulas de geometria para antes da ${marcoAvaliacao.tipoAvaliacao})...`
                : "Configure sua chave de API Gemini no topo da página para conversar..."
            }
            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all"
          />
          <button
            type="button"
            disabled={carregando || !inputTexto.trim() || !apiKey}
            onClick={() => handleEnviarMensagem()}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
