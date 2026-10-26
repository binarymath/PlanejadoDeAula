import React, { useState, useEffect } from "react";
import {
  Zap,
  Layers,
  Search,
  CheckSquare,
  Square,
  Eye,
  ChevronDown,
  ChevronUp,
  Users,
  User,
  GraduationCap,
  Link,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { LessonPlanState } from "../../types/lessonPlan";
import {
  carregarMetodologiasAtivas,
  MetodologiaAtivaItem,
} from "../../services/methodologyService";

import { MethodologyDetailModal } from "../common/MethodologyDetailModal";

const STORAGE_KEY_URL_METODOLOGIAS = "planejador_url_planilha_metodologias";

interface MethodologyModuleProps {
  data: LessonPlanState;
  onChange: (field: keyof LessonPlanState, value: string) => void;
}

export const MethodologyModule: React.FC<MethodologyModuleProps> = ({
  data,
  onChange,
}) => {
  const [metodologias, setMetodologias] = useState<MetodologiaAtivaItem[]>([]);
  const [selecionadasNomes, setSelecionadasNomes] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState<string>("");
  const [modalidadeFiltro, setModalidadeFiltro] = useState<string>("TODAS");
  const [autorFiltro, setAutorFiltro] = useState<string>("TODOS");
  const [livroFiltro, setLivroFiltro] = useState<string>("TODOS");
  const [itemVisualizando, setItemVisualizando] = useState<MetodologiaAtivaItem | null>(null);
  const [painelAberto, setPainelAberto] = useState<boolean>(true);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [urlPlanilha, setUrlPlanilha] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_URL_METODOLOGIAS) || "";
  });
  const [planilhaConectada, setPlanilhaConectada] = useState<boolean>(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  const conectarPlanilha = async (urlParaConectar?: string) => {
    const urlAlvo = (urlParaConectar !== undefined ? urlParaConectar : urlPlanilha).trim();
    if (!urlAlvo) {
      setMetodologias([]);
      setPlanilhaConectada(false);
      setErroMsg("Insira o link da planilha de metodologias ativas para conectar.");
      return;
    }

    setCarregando(true);
    setErroMsg(null);
    try {
      const items = await carregarMetodologiasAtivas(urlAlvo);
      if (!items || items.length === 0) {
        throw new Error("Nenhuma metodologia ativa encontrada na planilha informada.");
      }
      setMetodologias(items);
      setPlanilhaConectada(true);
      localStorage.setItem(STORAGE_KEY_URL_METODOLOGIAS, urlAlvo);

      // Identifica as já presentes no texto
      const textoAtual = data.metodologiaAtiva || "";
      const marcadas = new Set<string>();
      items.forEach((m) => {
        if (textoAtual.includes(m.metodologiaAtiva) || textoAtual.includes(`[${m.metodologiaAtiva}]`)) {
          marcadas.add(m.metodologiaAtiva);
        }
      });
      setSelecionadasNomes(marcadas);
    } catch (err: any) {
      setPlanilhaConectada(false);
      setErroMsg(err.message || "Erro ao conectar e processar planilha.");
    } finally {
      setCarregando(false);
    }
  };

  // Se já havia URL salva no localStorage, conecta automaticamente
  useEffect(() => {
    const salva = localStorage.getItem(STORAGE_KEY_URL_METODOLOGIAS);
    if (salva) {
      conectarPlanilha(salva);
    }
  }, []);

  // Lista de modalidades encontradas para o filtro rápido
  const modalidadesDisponiveis = [
    "TODAS",
    ...Array.from(new Set(metodologias.map((m) => m.modalidadeRecomendada).filter(Boolean))),
  ];

  // Lista de autores disponíveis para o filtro rápido
  const autoresDisponiveis = [
    "TODOS",
    ...Array.from(new Set(metodologias.map((m) => m.autorReferencia?.trim()).filter(Boolean))).sort(),
  ];

  // Lista de livros / obras de referência disponíveis para o filtro rápido
  const livrosDisponiveis = [
    "TODOS",
    ...Array.from(new Set(metodologias.map((m) => m.categoriaReferencia?.trim()).filter(Boolean))).sort(),
  ];

  // Itens filtrados pela busca e pelos filtros de modalidade, autor e livro
  const itensFiltrados = metodologias.filter((m) => {
    const matchMod = modalidadeFiltro === "TODAS" || m.modalidadeRecomendada === modalidadeFiltro;
    const matchAutor = autorFiltro === "TODOS" || m.autorReferencia?.trim() === autorFiltro;
    const matchLivro = livroFiltro === "TODOS" || m.categoriaReferencia?.trim() === livroFiltro;

    const termo = busca.toLowerCase();
    const matchBusca =
      !termo ||
      m.metodologiaAtiva.toLowerCase().includes(termo) ||
      m.categoriaReferencia.toLowerCase().includes(termo) ||
      m.autorReferencia.toLowerCase().includes(termo) ||
      m.definicaoDescricao.toLowerCase().includes(termo) ||
      m.modalidadeRecomendada.toLowerCase().includes(termo);

    return matchMod && matchAutor && matchLivro && matchBusca;
  });

  // Agrupamento dos itens por Modalidade Recomendada (Coluna de Modalidade)
  const itensAgrupadosPorModalidade = itensFiltrados.reduce<Record<string, MetodologiaAtivaItem[]>>(
    (acc, item) => {
      const grupo = item.modalidadeRecomendada || "Individual / Geral";
      if (!acc[grupo]) acc[grupo] = [];
      acc[grupo].push(item);
      return acc;
    },
    {}
  );

  // Formata a lista de metodologias para o padrão oficial do DOCX
  const formatarParaTexto = (nomes: Set<string>): string => {
    const linhas: string[] = [];
    metodologias.forEach((m) => {
      if (nomes.has(m.metodologiaAtiva)) {
        linhas.push(`• [${m.metodologiaAtiva}]: ${m.definicaoDescricao}`);
      }
    });
    return linhas.join("\n\n");
  };

  // Alterna uma metodologia
  const handleToggleMetodologia = (item: MetodologiaAtivaItem) => {
    const novos = new Set(selecionadasNomes);
    if (novos.has(item.metodologiaAtiva)) {
      novos.delete(item.metodologiaAtiva);
    } else {
      novos.add(item.metodologiaAtiva);
    }
    setSelecionadasNomes(novos);
    onChange("metodologiaAtiva", formatarParaTexto(novos));
  };

  // Desmarcar todas
  const handleClearAll = () => {
    setSelecionadasNomes(new Set());
    onChange("metodologiaAtiva", "");
  };

  // Ícone representativo da modalidade
  const getModalidadeIcon = (mod: string) => {
    const m = mod.toLowerCase();
    if (m.includes("turma")) return <GraduationCap className="w-3.5 h-3.5 text-blue-600" />;
    if (m.includes("grupo") || m.includes("dupla")) return <Users className="w-3.5 h-3.5 text-sky-600" />;
    return <User className="w-3.5 h-3.5 text-blue-500" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">6. Metodologias Ativas e Técnicas de Ensino</h2>
            <p className="text-xs text-slate-500">
              Agrupadas por modalidade recomendada (a quem se destina: Individual, Toda a Turma, Duplas ou Grupos)
            </p>
          </div>
        </div>
      </div>

      {/* Painel do Seletor Integrado com a Planilha Oficial em Tons de Azul */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Banco de Metodologias Ativas ({metodologias.length} técnicas catalogadas)</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-medium text-[11px]">
              {selecionadasNomes.size} selecionada{selecionadasNomes.size !== 1 ? "s" : ""}
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

        {/* Barra de Conexão com a Planilha */}
        <div className="px-4 py-3 bg-white border-b border-slate-200 space-y-2">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Link className="w-3.5 h-3.5 text-blue-600" />
            Link da Planilha Google (Metodologias Ativas):
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
                placeholder="Cole aqui o link da planilha de metodologias (ex: https://docs.google.com/spreadsheets/d/...)"
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
              />
            </div>

            <button
              type="button"
              onClick={() => conectarPlanilha()}
              disabled={carregando}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold rounded text-xs transition-colors whitespace-nowrap shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${carregando ? "animate-spin" : ""}`} />
              <span>{carregando ? "Conectando..." : planilhaConectada ? "Atualizar Planilha" : "Conectar Planilha"}</span>
            </button>
          </div>

          {planilhaConectada && (
            <div className="flex items-center gap-1.5 text-sky-600 text-[11px] font-medium pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Planilha de metodologias conectada ({metodologias.length} técnicas catalogadas).</span>
            </div>
          )}

          {erroMsg && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              {erroMsg}
            </p>
          )}
        </div>

        {painelAberto && planilhaConectada && (
          <div className="p-4 space-y-4">
            {/* Barra de Filtro e Busca */}
            <div className="space-y-2.5">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
                <div className="flex-1 relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar metodologia, autor, livro ou descrição..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {selecionadasNomes.size > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-500 rounded-lg text-[11px] font-semibold transition-colors flex-shrink-0 self-start md:self-auto"
                  >
                    Desmarcar Todas ({selecionadasNomes.size})
                  </button>
                )}
              </div>

              {/* Linha de Filtros Dinâmicos (Destinatário, Autor e Livro) */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                {/* Filtro por Destinatário / Modalidade */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 shadow-2xs">
                  <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">Destinatário:</span>
                  <select
                    value={modalidadeFiltro}
                    onChange={(e) => setModalidadeFiltro(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[140px] truncate"
                  >
                    {modalidadesDisponiveis.map((m) => (
                      <option key={m} value={m}>
                        {m === "TODAS" ? "Todos os Destinatários" : m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por Autor */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 shadow-2xs">
                  <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">Autor:</span>
                  <select
                    value={autorFiltro}
                    onChange={(e) => setAutorFiltro(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[170px] truncate"
                  >
                    {autoresDisponiveis.map((a) => (
                      <option key={a} value={a}>
                        {a === "TODOS" ? "Todos os Autores" : a}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por Livro / Obra */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 shadow-2xs flex-1 min-w-[200px]">
                  <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">Livro / Obra:</span>
                  <select
                    value={livroFiltro}
                    onChange={(e) => setLivroFiltro(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer w-full truncate"
                  >
                    {livrosDisponiveis.map((l) => (
                      <option key={l} value={l}>
                        {l === "TODOS" ? "Todos os Livros" : l}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reset rápido de filtros se algum estiver ativo */}
                {(modalidadeFiltro !== "TODAS" || autorFiltro !== "TODOS" || livroFiltro !== "TODOS" || busca) && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalidadeFiltro("TODAS");
                      setAutorFiltro("TODOS");
                      setLivroFiltro("TODOS");
                      setBusca("");
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline px-1 py-0.5 whitespace-nowrap"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            </div>

            {/* Lista Agrupada por Modalidade Recomendada (A quem se destina) */}
            <div className="max-h-96 overflow-y-auto space-y-4 pr-1">
              {Object.keys(itensAgrupadosPorModalidade).map((modalidadeNome) => {
                const itensDoGrupo = itensAgrupadosPorModalidade[modalidadeNome];
                return (
                  <div key={modalidadeNome} className="space-y-2">
                    {/* Cabeçalho do Grupo de Modalidade */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-100/70 rounded-md border border-sky-200 sticky top-0 z-10 backdrop-blur-xs">
                      {getModalidadeIcon(modalidadeNome)}
                      <span className="text-xs font-bold text-slate-800">
                        A quem se destina: {modalidadeNome}
                      </span>
                      <span className="text-[10px] bg-white px-2 py-0.2 rounded-full font-semibold text-slate-600 ml-auto border border-slate-200">
                        {itensDoGrupo.length} técnica{itensDoGrupo.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Cards das Metodologias do Grupo */}
                    <div className="space-y-1.5 pl-1">
                      {itensDoGrupo.map((item) => {
                        const isChecked = selecionadasNomes.has(item.metodologiaAtiva);
                        return (
                          <div
                            key={item.id}
                            className={`flex items-start gap-2.5 p-3 rounded-lg transition-colors border ${
                              isChecked
                                ? "bg-sky-50/80 border-sky-300 ring-1 ring-sky-200"
                                : "bg-white hover:bg-slate-50 border-slate-200"
                            }`}
                          >
                            {/* Botão de Checkbox */}
                            <button
                              type="button"
                              onClick={() => handleToggleMetodologia(item)}
                              className="mt-0.5 text-blue-600 flex-shrink-0"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </button>

                            {/* Informações da Técnica */}
                            <div
                              onClick={() => handleToggleMetodologia(item)}
                              className="flex-1 min-w-0 cursor-pointer"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setItemVisualizando(item);
                                  }}
                                  className="text-xs font-bold text-slate-900 hover:text-blue-700 hover:underline leading-snug text-left transition-colors cursor-pointer"
                                  title="Clique para ver o card completo"
                                >
                                  {item.metodologiaAtiva}
                                </button>
                                {item.categoriaReferencia && (
                                  <span className="text-[10px] font-medium bg-blue-100/70 text-blue-800 px-1.5 py-0.2 rounded">
                                    {item.categoriaReferencia}
                                  </span>
                                )}
                                {item.autorReferencia && (
                                  <span className="text-[10px] text-slate-400">
                                    • {item.autorReferencia}
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                                {item.definicaoDescricao}
                              </p>
                            </div>

                            {/* Botão "Ver Card Completo" para Leitura Fluida de Todas as Colunas */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemVisualizando(item);
                              }}
                              title="Ver informações detalhadas de todas as colunas"
                              className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-100/70 rounded-md transition-colors flex items-center gap-1 text-[11px] font-semibold flex-shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Ver Card</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {itensFiltrados.length === 0 && !carregando && (
                <p className="text-xs text-slate-400 text-center py-6">
                  Nenhuma metodologia encontrada para o filtro informado.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Caixa de Texto que migra para o DOCX */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
          Texto de Metodologias Ativas:
        </label>
        <textarea
          rows={8}
          value={data.metodologiaAtiva}
          onChange={(e) => onChange("metodologiaAtiva", e.target.value)}
          placeholder="Selecione as metodologias ativas acima para preencher automaticamente ou digite aqui..."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm leading-relaxed"
        />
        <p className="text-[11px] text-slate-400 mt-1">
          Dica: Os itens marcados preenchem automaticamente este campo com a técnica e a descrição da habilidade. Você pode editar ou acrescentar intervenções práticas livremente.
        </p>
      </div>

      {/* Modal Card com Leitura Fluida de Todas as Colunas */}
      <MethodologyDetailModal
        item={itemVisualizando}
        isOpen={Boolean(itemVisualizando)}
        onClose={() => setItemVisualizando(null)}
        onSelectToggle={(it) => handleToggleMetodologia(it)}
        isSelected={itemVisualizando ? selecionadasNomes.has(itemVisualizando.metodologiaAtiva) : false}
      />
    </div>
  );
};
