import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { LessonPlanState } from "../../types/lessonPlan";
import { getBimesterTitles } from "../../utils/bimesterHelper";
import {
  DescritorHabilidade,
  getSheetNames,
  extrairNivelEscolar,
  extrairLetraTurma,
  obterSufixoBimestreRecuperacao,
  filtrarAbasPorNivel,
  carregarDescritoresDaAba,
  formatarPorcentagem2Casas,
  normalizarGoogleSheetsXlsxUrl,
} from "../../services/googleSheetsService";
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

  // Endereço da planilha fornecida pelo professor
  const [urlPlanilha, setUrlPlanilha] = useState<string>(() => {
    return localStorage.getItem(STORAGE_DIAGNOSTIC_URL_KEY) || "";
  });
  const [planilhaConectada, setPlanilhaConectada] = useState<boolean>(false);
  const [conectandoPlanilha, setConectandoPlanilha] = useState<boolean>(false);

  // Estados de controle das abas da planilha
  const [todasAbas, setTodasAbas] = useState<string[]>([]);
  const [abaSelecionada, setAbaSelecionada] = useState<string>("");
  const [descritores, setDescritores] = useState<DescritorHabilidade[]>([]);
  const [selecionadosIds, setSelecionadosIds] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState<boolean>(false);
  const [erroMsg, setErroMsg] = useState<string>("");
  const [painelAberto, setPainelAberto] = useState<boolean>(true);


  // Função para conectar e listar abas da planilha do professor
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

  // Se já havia uma URL salva anteriormente, tenta conectar ao carregar
  useEffect(() => {
    if (urlPlanilha.trim()) {
      handleConectarPlanilha(urlPlanilha.trim());
    }
  }, []);

  // Ouvir atualizações de links (ex: via modal JSON)
  useEffect(() => {
    const handleStorageChange = () => {
      const novaUrl = localStorage.getItem(STORAGE_DIAGNOSTIC_URL_KEY) || "";
      if (novaUrl !== urlPlanilha) {
        setUrlPlanilha(novaUrl);
        if (novaUrl.trim()) {
          handleConectarPlanilha(novaUrl.trim());
        } else {
          setPlanilhaConectada(false);
          setTodasAbas([]);
          setAbaSelecionada("");
          setDescritores([]);
        }
      }
    };
    window.addEventListener("storage_links_updated", handleStorageChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage_links_updated", handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [urlPlanilha]);

  // 1. Identifica o nível a partir do Ano Escolar / Turmas
  const nivelDetectado =
    extrairNivelEscolar(data.anoEscolar) ||
    (data.turmas && data.turmas.length > 0
      ? extrairNivelEscolar(data.turmas[0].nome)
      : null);

  // 2. Restringe as abas permitidas estritamente ao nível do professor
  const abasDoNivel = filtrarAbasPorNivel(todasAbas, nivelDetectado);

  // 3. Tenta encontrar a aba ideal para a turma e bimestre
  useEffect(() => {
    if (planilhaConectada && abasDoNivel.length > 0) {
      const sufixoBim = obterSufixoBimestreRecuperacao(data.bimestre); // ex: "1B", "2B", "3B"
      const primeiraTurma =
        data.turmas && data.turmas.length > 0 ? data.turmas[0].nome : data.anoEscolar;
      const letraTurma = extrairLetraTurma(primeiraTurma) || "A";

      // Padrão de busca: ex "7A-1B"
      const nomeAbaEsperada = nivelDetectado ? `${nivelDetectado}${letraTurma}-${sufixoBim}` : "";
      const abaEncontrada =
        (nomeAbaEsperada && abasDoNivel.find((a) => a.toUpperCase() === nomeAbaEsperada.toUpperCase())) ||
        abasDoNivel.find((a) => a.includes(sufixoBim)) ||
        abasDoNivel[0];

      if (abaEncontrada && abaEncontrada !== abaSelecionada) {
        setAbaSelecionada(abaEncontrada);
      }
    } else if (!planilhaConectada) {
      setAbaSelecionada("");
      setDescritores([]);
    }
  }, [planilhaConectada, nivelDetectado, data.bimestre, data.anoEscolar, data.turmas, todasAbas]);

  // 4. Carrega os descritores ao selecionar a aba ou mudar o componente curricular
  useEffect(() => {
    if (!planilhaConectada || !abaSelecionada) {
      setDescritores([]);
      return;
    }

    let ativo = true;
    setCarregando(true);
    setErroMsg("");

    carregarDescritoresDaAba(abaSelecionada, data.componenteCurricular, urlPlanilha)
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
      .catch((err) => {
        if (!ativo) return;
        console.error("Erro ao carregar aba da planilha:", err);
        setErroMsg("Não foi possível carregar os descritores desta aba no momento.");
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [planilhaConectada, abaSelecionada, data.componenteCurricular, urlPlanilha]);


  // Extrai nome amigável da sala a partir do nome da aba (ex: "7A-1B" -> "7º A")
  const formatarNomeSala = (aba: string) => {
    const match = aba.match(/^(\d)([A-Za-z])/);
    if (match) return `${match[1]}º ${match[2].toUpperCase()}`;
    return aba;
  };

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

      // Formato agrupado: • [6º A: 10,00% | 6º C: 8,70%]: Descrição...
      // ou • [6º A - 10,00% | 6º C - 8,70%]: Descrição...
      const matchAgrupado = linha.match(/^•?\s*\[(.*?)\]:\s*(.*)$/);
      if (matchAgrupado) {
        const blocoSalas = matchAgrupado[1];
        const desc = matchAgrupado[2].trim();
        const pares = blocoSalas.split("|");
        const list: { sala: string; taxa: string }[] = [];
        pares.forEach((p) => {
          // ex: "6º A: 10,00%" ou "6º A - 10,00%" ou "Acerto: 10,00% | Sala: 6º A"
          const mPar = p.match(/([^:\-]+)[:\-]\s*([0-9.,]+%?)/);
          if (mPar) {
            list.push({ sala: mPar[1].trim(), taxa: formatarPorcentagem2Casas(mPar[2].trim()) });
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
        const sala = matchLegado[2].trim();
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
              Planilha de Diagnóstico • {nivelDetectado ? `${nivelDetectado}º Ano` : "Todos os Níveis"}
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
            {/* Campo para o Professor Inserir o Link da Planilha do Google */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Link da Planilha Google (Habilidades Diagnósticas):
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
                    placeholder="Cole aqui o link da planilha (ex: https://docs.google.com/spreadsheets/d/...)"
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-[11px]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleConectarPlanilha()}
                  disabled={conectandoPlanilha}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-400 text-white font-semibold rounded text-xs transition-colors whitespace-nowrap shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${conectandoPlanilha ? "animate-spin" : ""}`} />
                  <span>{conectandoPlanilha ? "Conectando..." : planilhaConectada ? "Atualizar Planilha" : "Conectar Planilha"}</span>
                </button>
              </div>

              {planilhaConectada && (
                <div className="flex items-center gap-1.5 text-emerald-600 text-[11px] font-medium pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Planilha conectada com sucesso ({todasAbas.length} abas identificadas).</span>
                </div>
              )}
            </div>

            {/* Mensagem de Erro */}
            {erroMsg && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {erroMsg}
              </p>
            )}

            {/* Seletor de Turma/Aba e Ações só aparecem DEPOIS de conectar a planilha */}
            {planilhaConectada ? (
              <div className="space-y-3 pt-1 border-t border-slate-200/60">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-semibold">Aba da Sala:</span>
                    <select
                      value={abaSelecionada}
                      onChange={(e) => setAbaSelecionada(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    >
                      {abasDoNivel.map((aba) => {
                        const amigavel = formatarNomeSala(aba);
                        return (
                          <option key={aba} value={aba}>
                            Turma {amigavel} (Aba {aba})
                          </option>
                        );
                      })}
                    </select>

                    {nivelDetectado && (
                      <span className="text-[11px] text-slate-400">
                        (Restrito ao {nivelDetectado}º Ano)
                      </span>
                    )}
                  </div>

                  {descritores.length > 0 && (
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
                {carregando && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 py-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Carregando descritores da aba {abaSelecionada}...</span>
                  </div>
                )}
              </div>
            ) : (
              !conectandoPlanilha && !erroMsg && (
                <p className="text-xs text-slate-500 italic py-1">
                  Cole o link da sua planilha acima e clique em <strong>Conectar Planilha</strong> para carregar as salas e habilidades disponíveis.
                </p>
              )
            )}


            {/* LISTA COMPACTA DE DESCRITORES COM CHECKBOX */}
            {!carregando && descritores.length > 0 && (
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                {descritores.map((item) => {
                  const isChecked = selecionadosIds.has(item.id);
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
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                          <span className="font-semibold text-amber-700 bg-amber-100/60 px-1.5 py-0.2 rounded">
                            {item.taxaAcerto} acerto
                          </span>
                          <span className="text-slate-500 font-medium">{item.componente}</span>

                          {item.linkMaterial && (
                            <span className="text-slate-400 ml-auto">Material Pedagógico</span>
                          )}
                        </div>
                      </div>
                    </div>

                  );
                })}
              </div>
            )}

            {!carregando && descritores.length === 0 && !erroMsg && (
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
