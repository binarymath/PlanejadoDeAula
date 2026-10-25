import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Sparkles,
  Layers,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Link,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { LessonPlanState } from "../../types/lessonPlan";
import { getBimesterTitles } from "../../utils/bimesterHelper";
import {
  GrupoAprendizagemEssencial,
  obterAulasCurriculo,
  agruparPorAprendizagemEssencial,
} from "../../services/curriculumService";

const STORAGE_CURRICULO_URL_KEY = "planejador_url_planilha_curriculo";

interface ThematicUnitModuleProps {
  data: LessonPlanState;
  onChange: (field: keyof LessonPlanState, value: string) => void;
}

export const ThematicUnitModule: React.FC<ThematicUnitModuleProps> = ({
  data,
  onChange,
}) => {
  const bimesterTitles = getBimesterTitles(data.bimestre);

  // Link da planilha do professor
  const [urlPlanilha, setUrlPlanilha] = useState<string>(() => {
    return localStorage.getItem(STORAGE_CURRICULO_URL_KEY) || "";
  });
  const [planilhaConectada, setPlanilhaConectada] = useState<boolean>(false);
  const [conectandoPlanilha, setConectandoPlanilha] = useState<boolean>(false);
  const [erroMsg, setErroMsg] = useState<string>("");

  const [gruposAE, setGruposAE] = useState<GrupoAprendizagemEssencial[]>([]);
  const [selecionadasAE, setSelecionadasAE] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState<boolean>(false);
  const [painelAberto, setPainelAberto] = useState<boolean>(true);

  // Ano e bimestre selecionados
  const anoEscolarAtivo =
    data.anoEscolar || (data.turmas && data.turmas.length > 0 && data.turmas[0].nome ? data.turmas[0].nome : "");
  const bimestreAtivo = data.bimestre || "";

  const handleConectarPlanilha = async (urlParaConectar?: string) => {
    const url = (urlParaConectar ?? urlPlanilha).trim();
    if (!url) {
      setErroMsg("Por favor, cole o link da sua planilha de Currículo/Conteúdos.");
      setPlanilhaConectada(false);
      setGruposAE([]);
      return;
    }

    try {
      setConectandoPlanilha(true);
      setErroMsg("");
      const aulas = await obterAulasCurriculo(anoEscolarAtivo, bimestreAtivo, url);
      const grupos = agruparPorAprendizagemEssencial(aulas);
      setGruposAE(grupos);
      setPlanilhaConectada(true);
      localStorage.setItem(STORAGE_CURRICULO_URL_KEY, url);
    } catch (err: any) {
      console.error("Erro ao conectar planilha de currículo:", err);
      setErroMsg(err.message || "Não foi possível carregar a planilha. Verifique as permissões de compartilhamento.");
      setPlanilhaConectada(false);
      setGruposAE([]);
    } finally {
      setConectandoPlanilha(false);
    }
  };

  useEffect(() => {
    if (urlPlanilha.trim()) {
      handleConectarPlanilha(urlPlanilha.trim());
    }
  }, [anoEscolarAtivo, bimestreAtivo]);

  // Ouvir atualizações de links (ex: via modal JSON ou troca de disciplina)
  useEffect(() => {
    const handleStorageChange = () => {
      const novaUrl = localStorage.getItem(STORAGE_CURRICULO_URL_KEY) || "";
      if (novaUrl !== urlPlanilha) {
        setUrlPlanilha(novaUrl);
        if (novaUrl.trim()) {
          handleConectarPlanilha(novaUrl.trim());
        } else {
          setPlanilhaConectada(false);
          setGruposAE([]);
        }
      }
    };
    window.addEventListener("storage_links_updated", handleStorageChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage_links_updated", handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [urlPlanilha, anoEscolarAtivo, bimestreAtivo]);



  // Sincroniza AEs selecionadas com o texto atual
  useEffect(() => {
    const textoAtual = data.objetosConhecimento || "";
    const novosIds = new Set<string>();
    gruposAE.forEach((g) => {
      // Verifica se a string bruta da AE está presente
      if (textoAtual.includes(g.aprendizagemEssencial)) {
        novosIds.add(g.id);
        return;
      }
      // Verifica se o formato gerado [AE...]: título está presente
      const matchAE = g.aprendizagemEssencial.match(/^(AE\s*\d+)\s*[-–:]\s*(.*)$/i);
      if (matchAE) {
        const tag = `[${matchAE[1].toUpperCase()}]:`;
        const titulo = matchAE[2].trim();
        if (textoAtual.includes(tag) && (titulo === "" || textoAtual.includes(titulo))) {
          novosIds.add(g.id);
          return;
        }
      } else {
        const titulo = g.aprendizagemEssencial.trim();
        if (titulo && textoAtual.includes(titulo)) {
          novosIds.add(g.id);
        }
      }
    });
    setSelecionadasAE(novosIds);
  }, [gruposAE, data.objetosConhecimento]);

  // Formata o conjunto de AEs selecionadas para o padrão exato solicitado: [AE1]: (Título)
  const formatarGruposParaTexto = (selecionados: Set<string>): string => {
    const linhas: string[] = [];

    gruposAE.forEach((g) => {
      if (selecionados.has(g.id)) {
        // Extrai código e título (ex: "AE1 - Compor e decompor..." -> "[AE1]: Compor e decompor...")
        const matchAE = g.aprendizagemEssencial.match(/^(AE\s*\d+)\s*[-–:]\s*(.*)$/i);
        if (matchAE) {
          linhas.push(`• [${matchAE[1].toUpperCase()}]: ${matchAE[2].trim()}`);
        } else {
          linhas.push(`• [AE]: ${g.aprendizagemEssencial.trim()}`);
        }
      }
    });

    return linhas.join("\n");
  };

  // Alterna uma AE no checkbox
  const handleToggleAE = (grupo: GrupoAprendizagemEssencial) => {
    const novos = new Set(selecionadasAE);
    if (novos.has(grupo.id)) {
      novos.delete(grupo.id);
    } else {
      novos.add(grupo.id);
    }
    setSelecionadasAE(novos);
    onChange("objetosConhecimento", formatarGruposParaTexto(novos));
  };

  // Marcar todas as AEs do bimestre
  const handleSelectAll = () => {
    const novos = new Set(gruposAE.map((g) => g.id));
    setSelecionadasAE(novos);
    onChange("objetosConhecimento", formatarGruposParaTexto(novos));
  };

  // Desmarcar todas
  const handleClearAll = () => {
    setSelecionadasAE(new Set());
    onChange("objetosConhecimento", "");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {bimesterTitles.tituloConteudos}
            </h2>
            <p className="text-xs text-slate-500">
              Aprendizagens Essenciais, Objetos de Conhecimento e Habilidades do Currículo Oficial
            </p>
          </div>
        </div>
      </div>

      {/* Painel Integrado da Planilha de Currículo */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>
              Currículo Oficial{anoEscolarAtivo ? ` • ${anoEscolarAtivo}` : ""}{bimestreAtivo ? ` (${bimestreAtivo})` : ""}
            </span>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-medium text-[11px]">
              {gruposAE.length} Aprendizagens Essenciais
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

        {painelAberto && (
          <div className="p-4 space-y-4">
            {/* Campo para o Professor Inserir o Link da Planilha do Google */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Link da Planilha Google (Currículo / Objetos de Conhecimento):
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
                    placeholder="Cole aqui o link da planilha de currículo (ex: https://docs.google.com/spreadsheets/d/...)"
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-[11px]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleConectarPlanilha()}
                  disabled={conectandoPlanilha}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold rounded text-xs transition-colors whitespace-nowrap shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${conectandoPlanilha ? "animate-spin" : ""}`} />
                  <span>{conectandoPlanilha ? "Conectando..." : planilhaConectada ? "Atualizar Planilha" : "Conectar Planilha"}</span>
                </button>
              </div>

              {planilhaConectada && (
                <div className="flex items-center gap-1.5 text-emerald-600 text-[11px] font-medium pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Planilha de currículo conectada ({gruposAE.length} aprendizagens identificadas).</span>
                </div>
              )}
            </div>

            {/* Mensagem de Erro */}
            {erroMsg && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {erroMsg}
              </p>
            )}

            {planilhaConectada ? (
              <div className="space-y-3 pt-1 border-t border-slate-200/60">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Selecione as Aprendizagens Essenciais previstas para este bimestre:
                  </span>

                  {gruposAE.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-[11px] font-semibold transition-colors"
                      >
                        Marcar Todas
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-500 rounded text-[11px] font-semibold transition-colors"
                      >
                        Desmarcar
                      </button>
                    </div>
                  )}
                </div>

                {carregando && (
                  <div className="flex items-center gap-2 text-xs text-indigo-700 py-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Carregando Aprendizagens Essenciais do currículo...</span>
                  </div>
                )}
              </div>
            ) : (
              !conectandoPlanilha && !erroMsg && (
                <p className="text-xs text-slate-500 italic py-1">
                  Cole o link da sua planilha de currículo acima e clique em <strong>Conectar Planilha</strong> para selecionar as aprendizagens e objetos de conhecimento.
                </p>
              )
            )}


            {!carregando && gruposAE.length > 0 && (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                {gruposAE.map((g) => {
                  const isChecked = selecionadasAE.has(g.id);
                  return (
                    <div
                      key={g.id}
                      onClick={() => handleToggleAE(g)}
                      className={`flex items-start gap-2.5 p-3 rounded-lg cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-indigo-50/70 border border-indigo-200/80"
                          : "hover:bg-slate-100/70 border border-transparent"
                      }`}
                    >
                      <button
                        type="button"
                        className="mt-0.5 text-indigo-600 flex-shrink-0"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 leading-snug">
                          {g.aprendizagemEssencial}
                        </p>

                        <div className="mt-1.5 space-y-1 text-[11px] text-slate-500">
                          {g.habilidades.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              <span className="font-medium text-slate-600">Habilidades:</span>
                              {g.habilidades.map((h, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.2 bg-slate-200/70 text-slate-700 rounded text-[10px]"
                                >
                                  {h}
                                </span>
                              ))}
                            </div>
                          )}

                          {g.conteudos.length > 0 && (
                            <p className="line-clamp-2">
                              <span className="font-medium text-slate-600">Objetos: </span>
                              {g.conteudos.slice(0, 4).join(", ")}
                              {g.conteudos.length > 4 ? "..." : ""}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                            <span className="font-semibold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.2 rounded">
                              {g.aulasCount} aulas planejadas
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Caixa de Texto que migra para o DOCX */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
          Unidades Temáticas e Objetos de Conhecimento:
        </label>
        <textarea
          rows={9}
          value={data.objetosConhecimento}
          onChange={(e) => onChange("objetosConhecimento", e.target.value)}
          placeholder="Selecione as Aprendizagens Essenciais acima para preencher automaticamente ou digite aqui..."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-sm leading-relaxed"
        />
        <p className="text-[11px] text-slate-400 mt-1">
          Dica: Os itens marcados acima preenchem este campo com a Aprendizagem Essencial, Habilidades associadas, Objetos de Conhecimento e contagem de aulas sugerida. Você pode personalizar ou editar livremente.
        </p>
      </div>
    </div>
  );
};
