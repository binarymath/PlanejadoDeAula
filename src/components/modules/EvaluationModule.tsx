import React, { useState, useEffect } from "react";
import {
  Award,
  Check,
  RefreshCw,
  Plus,
  HelpCircle,
  Percent,
  CheckCircle2,
  FileText,
  BarChart3,
  Sliders,
  Sparkles,
  Link
} from "lucide-react";
import { LessonPlanState } from "../../types/lessonPlan";
import {
  AvaliacaoItem,
  fetchAvaliacaoPlanilha,
} from "../../services/evaluationService";

const STORAGE_KEY_URL_AVALIACAO = "planejador_url_planilha_avaliacao";

interface EvaluationModuleProps {
  data: LessonPlanState;
  onChange: (field: keyof LessonPlanState, value: string) => void;
}

export const EvaluationModule: React.FC<EvaluationModuleProps> = ({
  data,
  onChange,
}) => {
  const [criterios, setCriterios] = useState<AvaliacaoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const [urlPlanilha, setUrlPlanilha] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_URL_AVALIACAO) || "";
  });
  const [planilhaConectada, setPlanilhaConectada] = useState<boolean>(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  const conectarPlanilha = async (urlParaConectar?: string) => {
    const urlAlvo = (urlParaConectar !== undefined ? urlParaConectar : urlPlanilha).trim();
    if (!urlAlvo) {
      setCriterios([]);
      setPlanilhaConectada(false);
      setErroMsg("Insira o link da planilha de avaliação para conectar.");
      return;
    }

    setLoading(true);
    setErroMsg(null);
    try {
      const items = await fetchAvaliacaoPlanilha(urlAlvo);
      if (!items || items.length === 0) {
        throw new Error("Nenhum critério avaliativo encontrado na planilha informada.");
      }
      setCriterios(items);
      setPlanilhaConectada(true);
      localStorage.setItem(STORAGE_KEY_URL_AVALIACAO, urlAlvo);
    } catch (err: any) {
      setPlanilhaConectada(false);
      setErroMsg(err.message || "Erro ao conectar e processar planilha.");
    } finally {
      setLoading(false);
    }
  };

  // Se já havia URL salva no localStorage, conecta automaticamente
  useEffect(() => {
    const salva = localStorage.getItem(STORAGE_KEY_URL_AVALIACAO);
    if (salva) {
      conectarPlanilha(salva);
    }
  }, []);

  // Sincronizar itens selecionados com o texto atual
  useEffect(() => {
    const textoAtual = data.criterioAvaliacao || "";
    const selecionados = criterios
      .filter((c) => textoAtual.toLowerCase().includes(c.criterio.toLowerCase()))
      .map((c) => c.criterio);
    setSelectedCriteria(selecionados);
  }, [data.criterioAvaliacao, criterios]);

  const handleReload = () => {
    conectarPlanilha();
  };

  // Gerar texto formatado com todos os critérios da planilha
  const aplicarTodosOsCriterios = () => {
    const linhas = criterios.map(
      (c) => `• [${c.criterio}] (${c.peso}): ${c.descricao || "Instrumento avaliativo bimestral."}`
    );
    // Adicionar observação pedagógica sobre recuperação contínua
    linhas.push(
      "• [Recuperação Contínua]: Atividades paralelas de retomada das habilidades essenciais ao longo de todo o bimestre."
    );
    onChange("criterioAvaliacao", linhas.join("\n\n"));
  };

  // Formato compacto em tópicos
  const aplicarFormatoCompacto = () => {
    const linhas = criterios.map(
      (c) => `• ${c.criterio} (${c.peso}) - ${c.instrumento || "Avaliação regular"}`
    );
    linhas.push("• Recuperação contínua integrada à rotina pedagógica.");
    onChange("criterioAvaliacao", linhas.join("\n"));
  };

  const toggleCriterio = (item: AvaliacaoItem) => {
    const current = data.criterioAvaliacao || "";
    const isSelected = selectedCriteria.includes(item.criterio);

    if (isSelected) {
      // Remove do texto
      const regex = new RegExp(`•?\\s*\\[?${item.criterio}\\]?[^\\n]*(\\n\\n|\\n)?`, "gi");
      const updated = current.replace(regex, "").trim();
      onChange("criterioAvaliacao", updated);
    } else {
      // Adiciona ao texto
      const novoBloco = `• [${item.criterio}] (${item.peso}): ${item.descricao || "Avaliação contínua das habilidades bimestrais."}`;
      const updated = current ? `${current}\n\n${novoBloco}` : novoBloco;
      onChange("criterioAvaliacao", updated);
    }
  };

  // Soma percentual dos itens
  const somaPercentual = criterios.reduce((acc, curr) => acc + (curr.percentual || 0), 0);

  // Paleta de cores para cada critério no gráfico/cards
  const colorMap: Record<string, { bg: string; border: string; text: string; badge: string; bar: string }> = {
    "Prova Paulista": {
      bg: "bg-blue-50/60",
      border: "border-blue-200",
      text: "text-blue-900",
      badge: "bg-blue-100 text-blue-800",
      bar: "bg-blue-600",
    },
    "Avaliação Interna": {
      bg: "bg-indigo-50/60",
      border: "border-indigo-200",
      text: "text-indigo-900",
      badge: "bg-indigo-100 text-indigo-800",
      bar: "bg-indigo-500",
    },
    "Tarefas": {
      bg: "bg-sky-50/60",
      border: "border-sky-200",
      text: "text-sky-900",
      badge: "bg-sky-100 text-sky-800",
      bar: "bg-sky-500",
    },
    "Engajamento": {
      bg: "bg-amber-50/60",
      border: "border-amber-200",
      text: "text-amber-900",
      badge: "bg-amber-100 text-amber-800",
      bar: "bg-amber-500",
    },
  };

  const defaultColor = {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-900",
    badge: "bg-slate-100 text-slate-800",
    bar: "bg-slate-500",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">7. Critério de Avaliação</h2>
            <p className="text-xs text-slate-500">
              Critérios, pesos e instrumentos avaliativos alinhados à matriz oficial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReload}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Barra de Conexão com a Planilha de Avaliação */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Link className="w-3.5 h-3.5 text-indigo-600" />
          Link da Planilha Google (Critérios de Avaliação):
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
              placeholder="Cole aqui o link da planilha de avaliação (ex: https://docs.google.com/spreadsheets/d/...)"
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-[11px]"
            />
          </div>

          <button
            type="button"
            onClick={() => conectarPlanilha()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold rounded text-xs transition-colors whitespace-nowrap shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Conectando..." : planilhaConectada ? "Atualizar Planilha" : "Conectar Planilha"}</span>
          </button>
        </div>

        {planilhaConectada && (
          <div className="flex items-center gap-1.5 text-sky-600 text-[11px] font-medium pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Planilha de avaliação conectada ({criterios.length} critérios catalogados).</span>
          </div>
        )}

        {erroMsg && (
          <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
            {erroMsg}
          </p>
        )}
      </div>

      {planilhaConectada && (
        <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Composição da Nota Bimestral (Planilha Oficial)
              </span>
            </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Total de Pesos:</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                somaPercentual === 100
                  ? "bg-sky-100 text-sky-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {somaPercentual}%
            </span>
          </div>
        </div>

        {/* Barra de Progresso Visual Segmentada */}
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
          {criterios.map((c) => {
            const colors = colorMap[c.criterio] || defaultColor;
            return (
              <div
                key={c.criterio}
                style={{ width: `${c.percentual}%` }}
                title={`${c.criterio}: ${c.peso}`}
                className={`${colors.bar} transition-all duration-300 relative group`}
              />
            );
          })}
        </div>

        {/* Cards dos 4 Critérios Oficiais da Planilha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {criterios.map((c) => {
            const isSelected = selectedCriteria.includes(c.criterio);
            const colors = colorMap[c.criterio] || defaultColor;

            return (
              <div
                key={c.criterio}
                onClick={() => toggleCriterio(c)}
                role="button"
                tabIndex={0}
                className={`relative p-3.5 rounded-xl border transition-all text-left cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? `${colors.bg} ${colors.border} ring-2 ring-indigo-500/30 shadow-xs`
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <span className="font-bold text-xs text-slate-900 leading-snug">
                      {c.criterio}
                    </span>
                    <span
                      className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${colors.badge}`}
                    >
                      {c.peso}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed mb-2 line-clamp-3">
                    {c.descricao}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium truncate max-w-[140px]" title={c.instrumento}>
                    {c.instrumento}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-300 text-transparent"
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Botões de Ação Rápida */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Clique nos cards para incluir/remover individualmente ou use os botões rápidos:</span>
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={aplicarTodosOsCriterios}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Aplicar Todos (Completo)</span>
            </button>

            <button
              type="button"
              onClick={aplicarFormatoCompacto}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Formato Tópicos</span>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Editor de Texto Final para o Documento */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
            Texto de Avaliação (Exportado no Quadro Oficial DOCX):
          </label>
          <span className="text-[11px] text-slate-400">
            {data.criterioAvaliacao ? `${data.criterioAvaliacao.split("\n").length} linhas` : "Vazio"}
          </span>
        </div>

        <textarea
          rows={7}
          value={data.criterioAvaliacao}
          onChange={(e) => onChange("criterioAvaliacao", e.target.value)}
          placeholder="Selecione os cards acima para preencher automaticamente ou digite aqui os critérios de avaliação..."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all text-sm leading-relaxed font-normal"
        />

        <p className="text-[11px] text-slate-500 leading-snug">
          Dica pedagógica: A composição de <strong>100%</strong> (Prova Paulista 40%, Avaliação Interna 20%, Tarefas 20% e Engajamento 20%) assegura a conformidade com as diretrizes de avaliação formativa e somativa da rede SEDUC-SP.
        </p>
      </div>
    </div>
  );
};

