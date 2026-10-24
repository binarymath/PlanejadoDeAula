import React, { useState, useEffect } from "react";
import {
  Library,
  ExternalLink,
  RefreshCw,
  Check,
  CheckCircle2,
  FileText,
  BookmarkCheck,
  BookOpen,
  Sparkles,
  Search
} from "lucide-react";
import { LessonPlanState } from "../../types/lessonPlan";
import {
  ReferenciaItem,
  fetchReferenciasPlanilha,
  REFERENCIAS_PADRAO
} from "../../services/referencesService";


interface ReferencesModuleProps {
  data: LessonPlanState;
  onChange: (field: keyof LessonPlanState, value: string) => void;
}

export const ReferencesModule: React.FC<ReferencesModuleProps> = ({
  data,
  onChange,
}) => {
  const [referencias, setReferencias] = useState<ReferenciaItem[]>(REFERENCIAS_PADRAO);
  const [loading, setLoading] = useState(false);
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Carregar dados da planilha ao montar o componente
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchReferenciasPlanilha()
      .then((items) => {
        if (isMounted) {
          setReferencias(items);
        }
      })
      .catch(() => {
        if (isMounted) setReferencias(REFERENCIAS_PADRAO);
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
    const textoAtual = data.referenciasApoio || "";
    const selecionados = referencias
      .filter((r) => textoAtual.toLowerCase().includes(r.titulo.toLowerCase()))
      .map((r) => r.titulo);
    setSelectedTitles(selecionados);
  }, [data.referenciasApoio, referencias]);

  const handleReload = async () => {
    setLoading(true);
    try {
      const items = await fetchReferenciasPlanilha();
      setReferencias(items);
    } finally {
      setLoading(false);
    }
  };

  // Gerar texto formatado com todas as referências da planilha
  const aplicarTodasReferencias = () => {
    const linhas = referencias.map(
      (r) => `• [${r.titulo}]: ${r.categoria} - ${r.orgao} (${r.url})`
    );
    onChange("referenciasApoio", linhas.join("\n\n"));
  };

  // Formato compacto em tópicos
  const aplicarFormatoCompacto = () => {
    const linhas = referencias.map(
      (r) => `• ${r.titulo} - ${r.orgao}`
    );
    onChange("referenciasApoio", linhas.join("\n"));
  };

  const toggleReferencia = (item: ReferenciaItem) => {
    const current = data.referenciasApoio || "";
    const isSelected = selectedTitles.includes(item.titulo);

    if (isSelected) {
      // Remove do texto
      const regex = new RegExp(`•?\\s*\\[?${item.titulo}\\]?[^\\n]*(\\n\\n|\\n)?`, "gi");
      const updated = current.replace(regex, "").trim();
      onChange("referenciasApoio", updated);
    } else {
      // Adiciona ao texto
      const novoBloco = `• [${item.titulo}]: ${rCategoriaTexto(item)} (${item.url})`;
      const updated = current ? `${current}\n\n${novoBloco}` : novoBloco;
      onChange("referenciasApoio", updated);
    }
  };

  const rCategoriaTexto = (r: ReferenciaItem) => {
    if (r.categoria && r.orgao) return `${r.categoria} - ${r.orgao}`;
    return r.categoria || r.orgao || "Material oficial de referência";
  };

  const filteredReferencias = referencias.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.titulo.toLowerCase().includes(term) ||
      r.categoria.toLowerCase().includes(term) ||
      r.orgao.toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Library className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              8. Referências Bibliográficas e Materiais de Apoio
            </h2>
            <p className="text-xs text-slate-500">
              Fontes bibliográficas oficiais, repositórios digitais e diretrizes curriculares
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReload}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>

      </div>

      {/* Painel com Cards Interativos das Referências da Planilha Oficial */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/20 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Fontes Oficiais Homologadas ({referencias.length} recursos)
            </span>
            <span className="text-xs font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
              {selectedTitles.length} selecionado{selectedTitles.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar referência ou órgão..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Grid de Cards dos Recursos Oficiais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredReferencias.map((ref) => {
            const isSelected = selectedTitles.includes(ref.titulo);

            return (
              <div
                key={ref.item || ref.titulo}
                onClick={() => toggleReferencia(ref)}
                role="button"
                tabIndex={0}
                className={`relative p-4 rounded-xl border transition-all text-left cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                      {ref.categoria || "Referência"}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "border border-slate-300 text-transparent"
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  </div>

                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug mb-1">
                    {ref.titulo}
                  </h3>

                  <p className="text-[11px] text-slate-500 font-medium mb-2">
                    {ref.orgao}
                  </p>

                  {ref.descricao && (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {ref.descricao}
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <span>{ref.linkTexto || "Acessar Link Oficial"}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <span className="text-[11px] text-slate-400 font-mono">
                    Item {ref.item}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Botões de Ação Rápida */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Clique nos cards para selecionar ou utilize os botões rápidos:</span>
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={aplicarTodasReferencias}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Inserir Todas (Completo com Links)</span>
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

      {/* Campo de Texto Final para o Documento */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
            Texto de Referências Bibliográficas (Exportado no Quadro Oficial DOCX):
          </label>
          <span className="text-[11px] text-slate-400">
            {data.referenciasApoio ? `${data.referenciasApoio.split("\n").length} linhas` : "Vazio"}
          </span>
        </div>

        <textarea
          rows={7}
          value={data.referenciasApoio}
          onChange={(e) => onChange("referenciasApoio", e.target.value)}
          placeholder="Selecione as referências acima para preencher automaticamente ou digite aqui..."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all text-sm leading-relaxed font-normal"
        />

        <p className="text-[11px] text-slate-500 leading-snug">
          Alinhado às referências curriculares oficiais: Repositório Institucional da Educação SP, BNCC, Acervo Digital CMSP e Currículo Paulista.
        </p>
      </div>
    </div>
  );
};

