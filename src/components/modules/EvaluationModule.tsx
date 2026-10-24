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
  Sparkles
} from "lucide-react";
import { LessonPlanState } from "../../types/lessonPlan";
import {
  AvaliacaoItem,
  fetchAvaliacaoPlanilha,
  AVALIACOES_PADRAO
} from "../../services/evaluationService";


interface EvaluationModuleProps {
  data: LessonPlanState;
  onChange: (field: keyof LessonPlanState, value: string) => void;
}

export const EvaluationModule: React.FC<EvaluationModuleProps> = ({
  data,
  onChange,
}) => {
  const [criterios, setCriterios] = useState<AvaliacaoItem[]>(AVALIACOES_PADRAO);
  const [loading, setLoading] = useState(false);
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);

  // Carregar dados da planilha ao montar o componente
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchAvaliacaoPlanilha()
      .then((items) => {
        if (isMounted) {
          setCriterios(items);
        }
      })
      .catch(() => {
        if (isMounted) setCriterios(AVALIACOES_PADRAO);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sincronizar itens selecionados com o texto atual
  useEffect(() => {
    const textoAtual = data.criterioAvaliacao || "";
    const selecionados = criterios
      .filter((c) => textoAtual.toLowerCase().includes(c.criterio.toLowerCase()))
      .map((c) => c.criterio);
    setSelectedCriteria(selecionados);
  }, [data.criterioAvaliacao, criterios]);

  const handleReload = async () => {
    setLoading(true);
    try {
      const items = await fetchAvaliacaoPlanilha();
      setCriterios(items);
    } finally {
      setLoading(false);
    }
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

      {/* Painel Informativo da Composição da Nota Bimestral (100%) */}
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
                  ? "bg-emerald-100 text-emerald-800"
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

