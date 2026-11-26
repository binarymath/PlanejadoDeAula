import React, { useState, useEffect } from "react";
import {
  WandSparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  CheckSquare,
  Square,
  Sliders,
  Printer,
  Sparkles,
} from "lucide-react";
import { LessonPlanState } from "../../types/lessonPlan";
import {
  OpcoesSugestaoGuia,
  OPCOES_SUGESTAO_PADRAO,
  ResumoSecaoGerada,
  SecoesSelecionadasGuia,
  gerarSugestaoGuiaCompleto,
} from "../../services/guideSuggestionService";
import { ColunaCurriculoOpcao } from "../../services/geminiScheduleService";

interface GuideSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: LessonPlanState;
  onApplyBatch: (campos: Partial<LessonPlanState>) => void;
  onNavigateTab?: (tabId: string) => void;
  onOpenPreview?: () => void;
  initialReport?: ResumoSecaoGerada[] | null;
}

export const GuideSuggestionModal: React.FC<GuideSuggestionModalProps> = ({
  isOpen,
  onClose,
  data,
  onApplyBatch,
  onNavigateTab,
  onOpenPreview,
  initialReport = null,
}) => {
  const [opcoes, setOpcoes] = useState<OpcoesSugestaoGuia>(OPCOES_SUGESTAO_PADRAO);
  const [gerando, setGerando] = useState<boolean>(false);
  const [relatorioGerado, setRelatorioGerado] = useState<ResumoSecaoGerada[] | null>(initialReport);

  // Detecta se já há seções preenchidas para sugerir o modo inteligente
  const secoesJaPreenchidas = [
    data.aprendizagensNaoConsolidadas,
    data.objetosConhecimento,
    data.competenciasSocioemocionais,
    data.cronograma,
    data.metodologiaAtiva,
    data.criterioAvaliacao,
    data.referenciasApoio,
  ].filter((val) => val && val.trim().length > 0).length;

  useEffect(() => {
    if (isOpen) {
      setRelatorioGerado(initialReport);
      setGerando(false);
    }
  }, [isOpen, initialReport]);

  if (!isOpen) return null;

  const toggleSecao = (chave: keyof SecoesSelecionadasGuia) => {
    setOpcoes((prev) => ({
      ...prev,
      secoes: {
        ...prev.secoes,
        [chave]: !prev.secoes[chave],
      },
    }));
  };

  const handleGerarGuia = async () => {
    try {
      setGerando(true);
      const resultado = await gerarSugestaoGuiaCompleto(data, opcoes);
      onApplyBatch(resultado.camposAtualizados);
      setRelatorioGerado(resultado.relatorio);
    } catch (error) {
      console.error("Erro ao gerar sugestão completa do guia:", error);
      alert("Ocorreu um erro ao montar a sugestão do guia. Tente novamente.");
    } finally {
      setGerando(false);
    }
  };

  const listaSecoesConfig: {
    chave: keyof SecoesSelecionadasGuia;
    titulo: string;
    descricao: string;
    jaPreenchido: boolean;
  }[] = [
    {
      chave: "diagnostico",
      titulo: "2. Diagnóstico e Recomposição",
      descricao: "Apenas as 2 aprendizagens com menor aproveitamento na planilha",
      jaPreenchido: Boolean(data.aprendizagensNaoConsolidadas?.trim()),
    },
    {
      chave: "conteudos",
      titulo: "3. Unidades Temáticas e Conteúdos",
      descricao: "Todas as AEs do bimestre (incluindo compostas como [AE1/AE2])",
      jaPreenchido: Boolean(data.objetosConhecimento?.trim()),
    },
    {
      chave: "socioemocional",
      titulo: "4. Competências Socioemocionais",
      descricao: "Apenas 1 macrocompetência socioemocional prioritária para o bimestre",
      jaPreenchido: Boolean(data.competenciasSocioemocionais?.trim()),
    },
    {
      chave: "cronograma",
      titulo: "5. Cronograma por Mês e Datas",
      descricao: "Todas as aulas numeradas (Aula 1, Aula 2...) distribuídas nas semanas",
      jaPreenchido: Boolean(data.cronograma?.trim()),
    },
    {
      chave: "metodologia",
      titulo: "6. Metodologias Ativas",
      descricao: "Seleção equilibrada de técnicas (Turma, Grupos/Duplas e Individual)",
      jaPreenchido: Boolean(data.metodologiaAtiva?.trim()),
    },
    {
      chave: "avaliacao",
      titulo: "7. Critérios de Avaliação",
      descricao: "Composição oficial 100% (Prova Paulista, Avaliação Interna, Tarefas e Engajamento)",
      jaPreenchido: Boolean(data.criterioAvaliacao?.trim()),
    },
    {
      chave: "referencias",
      titulo: "8. Referências Bibliográficas",
      descricao: "Catálogo oficial homologado (Currículo Paulista, BNCC, CMSP e Repositório)",
      jaPreenchido: Boolean(data.referenciasApoio?.trim()),
    },
  ];

  const totalSecoesMarcadas = Object.values(opcoes.secoes).filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 print:hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !gerando) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-100 text-sky-700 rounded-lg">
              <WandSparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {relatorioGerado
                  ? "Guia Bimestral Preenchido"
                  : "Sugerir e Preencher Guia Completo"}
              </h3>
              <p className="text-xs text-slate-500">
                {relatorioGerado
                  ? "Todas as seções foram atualizadas. Revise ou ajuste qualquer aba abaixo."
                  : "Configure como deseja preencher as seções do guia."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={gerando}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {!relatorioGerado ? (
            <>
              {/* Resumo do Contexto da Identificação */}
              <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-sky-700 block">
                    Parâmetros Base da Identificação
                  </span>
                  <p className="text-slate-800 font-semibold">
                    {data.componenteCurricular || "Disciplina não informada"} •{" "}
                    {data.bimestre || "Bimestre não selecionado"} • Turmas:{" "}
                    {data.anoEscolar || "A definir"}
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-white border border-sky-200 text-sky-800 rounded-lg font-bold text-[11px]">
                  {data.aulasPrevistas || "Cálculo automático de aulas"}
                </span>
              </div>

              {/* Modo de Preenchimento (Substituir vs Apenas Vazios) */}
              {secoesJaPreenchidas > 0 && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Identificamos que {secoesJaPreenchidas} seção(ões) já possui(em) texto preenchido. Como deseja proceder?
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setOpcoes((prev) => ({ ...prev, modoPreenchimento: "substituir_tudo" }))
                      }
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                        opcoes.modoPreenchimento === "substituir_tudo"
                          ? "bg-white border-sky-500 ring-2 ring-sky-500/20 font-bold text-slate-900"
                          : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <span className="block">Substituir e Gerar Guia Novo</span>
                      <span className="text-[10px] font-normal text-slate-500">
                        Recria todas as seções marcadas abaixo com a sugestão atualizada.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setOpcoes((prev) => ({ ...prev, modoPreenchimento: "apenas_vazios" }))
                      }
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                        opcoes.modoPreenchimento === "apenas_vazios"
                          ? "bg-white border-sky-500 ring-2 ring-sky-500/20 font-bold text-slate-900"
                          : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <span className="block">Preencher Apenas Seções em Branco</span>
                      <span className="text-[10px] font-normal text-slate-500">
                        Preserva o que você já escreveu e preenche só o que falta.
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Ajustes Rápidos da Sugestão */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Critérios Rápidos da Sugestão</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Diagnóstico (Aba 2):
                    </label>
                    <select
                      value={opcoes.regraDiagnostico}
                      onChange={(e) =>
                        setOpcoes((prev) => ({
                          ...prev,
                          regraDiagnostico: e.target.value as OpcoesSugestaoGuia["regraDiagnostico"],
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="top2">2 com menor aproveitamento (Padrão)</option>
                      <option value="top3">3 com menor aproveitamento</option>
                      <option value="top5">5 com menor aproveitamento</option>
                      <option value="abaixo50">Todas abaixo de 50% de acerto</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Cronograma Semanal (Aba 5):
                    </label>
                    <select
                      value={opcoes.colunaCronograma}
                      onChange={(e) =>
                        setOpcoes((prev) => ({
                          ...prev,
                          colunaCronograma: e.target.value as ColunaCurriculoOpcao,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="conteudo">Distribuir Conteúdo da Aula</option>
                      <option value="aprendizagemEssencial">Distribuir Aprendizagem Essencial</option>
                      <option value="habilidades">Distribuir Habilidades</option>
                      <option value="objetivos">Distribuir Objetivos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Metodologias Ativas (Aba 6):
                    </label>
                    <select
                      value={opcoes.quantidadeMetodologias}
                      onChange={(e) =>
                        setOpcoes((prev) => ({
                          ...prev,
                          quantidadeMetodologias: Number(e.target.value) as 3 | 5,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      <option value={3}>3 técnicas variadas (Recomendado)</option>
                      <option value={5}>5 técnicas variadas</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Checklist das Seções que serão preenchidas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase">
                    Seções do Guia a Preencher ({totalSecoesMarcadas} de 7):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setOpcoes((prev) => ({
                          ...prev,
                          secoes: {
                            diagnostico: true,
                            conteudos: true,
                            socioemocional: true,
                            cronograma: true,
                            metodologia: true,
                            avaliacao: true,
                            referencias: true,
                          },
                        }))
                      }
                      className="text-[11px] text-sky-600 hover:underline font-semibold"
                    >
                      Marcar Todas
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {listaSecoesConfig.map((sec) => {
                    const marcada = opcoes.secoes[sec.chave];
                    return (
                      <div
                        key={sec.chave}
                        onClick={() => toggleSecao(sec.chave)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                          marcada
                            ? "bg-sky-50/60 border-sky-300"
                            : "bg-white border-slate-200 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <button
                          type="button"
                          className="mt-0.5 text-sky-600 shrink-0"
                        >
                          {marcada ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {sec.titulo}
                            </span>
                            {sec.jaPreenchido && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded font-semibold shrink-0">
                                Já tem texto
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                            {sec.descricao}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* TELA PÓS-GERAÇÃO: Resumo seção por seção com botões de ajuste direto */
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-emerald-950 text-sm">
                    Todo o Guia Bimestral foi montado e sincronizado com as abas!
                  </p>
                  <p className="text-emerald-800 leading-relaxed">
                    Os checkboxes, cartões do cronograma semanal e critérios já estão marcados em cada página. Se achar que algum ponto merece ajuste, clique em{" "}
                    <strong>Ajustar na Aba →</strong> abaixo ou navegue pelo menu lateral.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {relatorioGerado.map((item) => (
                  <div
                    key={item.idAba}
                    className="p-3.5 bg-white hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {item.titulo}
                        </span>
                        {item.aplicado ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-100 text-sky-800 rounded-full">
                            Preenchido
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                            Preservado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">{item.resumo}</p>
                      {item.aviso && (
                        <p className="text-[11px] text-amber-700 font-medium">
                          💡 {item.aviso}
                        </p>
                      )}
                    </div>

                    {onNavigateTab && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateTab(item.idAba);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-300 rounded-lg text-xs font-semibold transition-colors shrink-0 self-start sm:self-center"
                      >
                        <span>Ajustar na Aba</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {!relatorioGerado ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={gerando}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleGerarGuia}
                disabled={gerando || totalSecoesMarcadas === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                {gerando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Montando Guia Bimestral...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Preencher Guia Completo Agora</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {onOpenPreview ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPreview();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:border-sky-500 hover:bg-sky-50 text-slate-700 hover:text-sky-700 rounded-lg text-xs font-bold transition-colors"
                >
                  <Printer className="w-4 h-4 text-sky-600" />
                  <span>Ver Pré-visualização do Guia</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateTab("diagnostico");
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    <span>Revisar a partir da Aba 2</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Concluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

