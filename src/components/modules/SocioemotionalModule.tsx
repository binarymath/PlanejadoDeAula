import React, { useState, useEffect } from "react";
import {
  HeartHandshake,
  CheckSquare,
  Square,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Link,
  RefreshCw,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";
import { LessonPlanState } from "../../types/lessonPlan";
import {
  CINCO_GRANDES_BLOCOS_SOCIOEMOCIONAIS,
  MacrocompetenciaSocioemocional,
} from "../../config/competenciasSocioemocionaisBNCC";

const STORAGE_KEY_URL_SOCIOEMOCIONAL = "planejador_url_planilha_socioemocional";

interface SocioemotionalModuleProps {
  data: LessonPlanState;
  onChange: (field: keyof LessonPlanState, value: string) => void;
}

export const SocioemotionalModule: React.FC<SocioemotionalModuleProps> = ({
  data,
  onChange,
}) => {
  const [blocosSelecionados, setBlocosSelecionados] = useState<Set<string>>(new Set());
  const [painelAberto, setPainelAberto] = useState<boolean>(true);
  const [modalBloco, setModalBloco] = useState<MacrocompetenciaSocioemocional | null>(null);
  const [urlPlanilha, setUrlPlanilha] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_URL_SOCIOEMOCIONAL) || "";
  });
  const [planilhaConectada, setPlanilhaConectada] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  const conectarPlanilha = (urlParaConectar?: string) => {
    const urlAlvo = (urlParaConectar !== undefined ? urlParaConectar : urlPlanilha).trim();
    if (!urlAlvo) {
      setPlanilhaConectada(false);
      setErroMsg("Insira o link da planilha de competências socioemocionais para conectar.");
      return;
    }

    setLoading(true);
    setErroMsg(null);
    try {
      localStorage.setItem(STORAGE_KEY_URL_SOCIOEMOCIONAL, urlAlvo);
      setPlanilhaConectada(true);
    } catch (err: any) {
      setPlanilhaConectada(false);
      setErroMsg(err.message || "Erro ao conectar planilha.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const salva = localStorage.getItem(STORAGE_KEY_URL_SOCIOEMOCIONAL);
    if (salva) {
      conectarPlanilha(salva);
    }
  }, []);

  // Formata os blocos selecionados sem repetir o nome do bloco:
  // Exemplo: • [Autogestão]: Foco, Organização, Determinação, Persistência e Responsabilidade.
  const formatarParaTexto = (selecionados: Set<string>): string => {
    const linhas: string[] = [];

    CINCO_GRANDES_BLOCOS_SOCIOEMOCIONAIS.forEach((bloco) => {
      if (selecionados.has(bloco.id)) {
        const habs = bloco.habilidades.map((h) => h.nome).join(", ");
        linhas.push(`• [${bloco.nome}]: ${habs}`);
      }
    });

    return linhas.join("\n");
  };

  // Alterna o checkbox do bloco
  const handleToggleBloco = (bloco: MacrocompetenciaSocioemocional) => {
    const novos = new Set(blocosSelecionados);
    if (novos.has(bloco.id)) {
      novos.delete(bloco.id);
    } else {
      novos.add(bloco.id);
    }
    setBlocosSelecionados(novos);
    onChange("competenciasSocioemocionais", formatarParaTexto(novos));
  };

  // Marcar todos os 5 blocos
  const handleSelectAll = () => {
    const novos = new Set(CINCO_GRANDES_BLOCOS_SOCIOEMOCIONAIS.map((b) => b.id));
    setBlocosSelecionados(novos);
    onChange("competenciasSocioemocionais", formatarParaTexto(novos));
  };

  // Desmarcar todos
  const handleClearAll = () => {
    setBlocosSelecionados(new Set());
    onChange("competenciasSocioemocionais", "");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              4. Competências Socioemocionais
            </h2>
            <p className="text-xs text-slate-500">
              Os 5 Grandes Blocos de Competências Socioemocionais (SEDUC-SP / Instituto Ayrton Senna)
            </p>
          </div>
        </div>
      </div>

      {/* Painel do Seletor dos 5 Grandes Blocos com visual em tons de azul */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span>Os 5 Grandes Blocos de Competências Socioemocionais</span>
            <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-medium text-[11px]">
              {blocosSelecionados.size} de 5 selecionados
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPainelAberto(!painelAberto)}
              className="text-slate-500 hover:text-slate-700 text-xs font-medium flex items-center gap-1"
            >
              <span>{painelAberto ? "Recolher" : "Expandir"}</span>
              {painelAberto ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Barra de Conexão com a Planilha de Competências Socioemocionais */}
        <div className="px-4 py-3 bg-white border-b border-slate-200 space-y-2">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Link className="w-3.5 h-3.5 text-sky-600" />
            Link da Planilha Google (Competências Socioemocionais):
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
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
                placeholder="Cole aqui o link da planilha de competências socioemocionais (ex: https://docs.google.com/spreadsheets/d/...)"
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono text-[11px]"
              />
            </div>

            <button
              type="button"
              onClick={() => conectarPlanilha()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 text-white font-semibold rounded text-xs transition-colors whitespace-nowrap shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Conectando..." : planilhaConectada ? "Atualizar Planilha" : "Conectar Planilha"}</span>
            </button>
          </div>

          {planilhaConectada && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-[11px] font-medium pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Planilha de competências socioemocionais conectada com sucesso.</span>
            </div>
          )}

          {erroMsg && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              {erroMsg}
            </p>
          )}
        </div>

        {painelAberto && planilhaConectada && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Selecione os blocos prioritários para este bimestre:
              </span>

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
                  onClick={handleClearAll}
                  className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-500 rounded text-[11px] font-semibold transition-colors"
                >
                  Desmarcar
                </button>
              </div>
            </div>

            {/* Lista dos 5 Grandes Blocos com Checkboxes */}
            <div className="space-y-2.5">
              {CINCO_GRANDES_BLOCOS_SOCIOEMOCIONAIS.map((bloco) => {
                const isChecked = blocosSelecionados.has(bloco.id);
                return (
                  <div
                    key={bloco.id}
                    onClick={() => handleToggleBloco(bloco)}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-sky-50/80 border border-sky-200"
                        : "hover:bg-slate-100/70 border border-transparent"
                    }`}
                  >
                    <button
                      type="button"
                      className="mt-0.5 text-sky-600 flex-shrink-0"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalBloco(bloco);
                          }}
                          className="text-xs font-bold text-sky-800 hover:text-sky-600 hover:underline flex items-center gap-1.5 transition-colors text-left group"
                          title="Clique para ver explicação detalhada"
                        >
                          <span>{bloco.nome}</span>
                          <Info className="w-3.5 h-3.5 text-sky-500 group-hover:scale-110 transition-transform flex-shrink-0" />
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {bloco.descricaoCurta}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[10px] font-semibold text-sky-700">Dimensões:</span>
                        {bloco.habilidades.map((h, i) => (
                          <span
                            key={i}
                            title={h.definicao}
                            className="text-[10px] bg-white border border-sky-200/80 text-sky-900 font-medium px-1.5 py-0.5 rounded shadow-2xs"
                          >
                            {h.nome}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes da Competência Socioemocional */}
      {modalBloco && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 print:hidden"
          onClick={() => setModalBloco(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Modal */}
            <div className="bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                  <HeartHandshake className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-sky-200">
                    Competência Socioemocional
                  </span>
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {modalBloco.nome}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalBloco(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/25 text-white/90 hover:text-white transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Definição Geral */}
              <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-4">
                <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  Conceito Geral
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {modalBloco.descricaoCurta}
                </p>
              </div>

              {/* Dimensões / Habilidades Específicas */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  Dimensões e Atitudes Observáveis ({modalBloco.habilidades.length})
                </h4>
                <div className="space-y-2.5">
                  {modalBloco.habilidades.map((hab, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-sky-300 hover:shadow-xs transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                          {index + 1}
                        </span>
                        <h5 className="text-xs font-bold text-slate-900">
                          {hab.nome}
                        </h5>
                      </div>
                      <p className="text-xs text-slate-600 pl-7 leading-relaxed">
                        {hab.definicao}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dica Pedagógica */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-500 leading-relaxed">
                <span className="font-semibold text-slate-700">Como aplicar no planejamento: </span>
                Mobilize essas dimensões durante as atividades em sala (trabalho em equipe, prazos, resolução de problemas ou debates), promovendo a reflexão e o protagonismo dos estudantes.
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  handleToggleBloco(modalBloco);
                }}
                className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                  blocosSelecionados.has(modalBloco.id)
                    ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                    : "bg-sky-600 text-white hover:bg-sky-700 shadow-xs"
                }`}
              >
                {blocosSelecionados.has(modalBloco.id) ? (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Remover da Seleção</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Selecionar no Planejamento</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalBloco(null)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Caixa de Texto que migra para o DOCX */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
          Competências Socioemocionais:
        </label>
        <textarea
          rows={6}
          value={data.competenciasSocioemocionais}
          onChange={(e) => onChange("competenciasSocioemocionais", e.target.value)}
          placeholder="Selecione os blocos acima para preencher automaticamente ou digite aqui..."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all text-sm leading-relaxed"
        />
        <p className="text-[11px] text-slate-400 mt-1">
          Dica: Os blocos marcados acima preenchem este campo com o nome do bloco e suas dimensões sem repetição. Você pode editar ou acrescentar ações práticas livremente.
        </p>
      </div>
    </div>
  );
};
