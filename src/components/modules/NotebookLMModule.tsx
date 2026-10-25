import React, { useState, useEffect } from "react";
import {
  ExternalLink,
  BookOpen,
  Sparkles,
  RefreshCw,
  FileText,
  AlertCircle,
  HelpCircle,
  FolderOpen,
} from "lucide-react";
import {
  carregarNotebookLMLinks,
  NotebookLMCardItem,
} from "../../services/notebooklmService";

export const NotebookLMModule: React.FC = () => {
  const [cards, setCards] = useState<NotebookLMCardItem[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      setErro(null);
      const dados = await carregarNotebookLMLinks();
      setCards(dados);
    } catch (e: any) {
      setErro(e.message || "Erro ao carregar os links do NotebookLM.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Paleta de temas para o efeito autoadesivo 3D
  const obterEstiloFigurinha = (cor: NotebookLMCardItem["cor"]) => {
    switch (cor) {
      case "roxo":
        return {
          fundo: "bg-gradient-to-br from-purple-50 via-white to-purple-100/60",
          accent: "text-purple-700 bg-purple-100/80 border-purple-200",
          detalhe: "bg-purple-500",
          borda: "border-purple-200/60",
          sombra: "hover:shadow-purple-500/15",
          btn: "bg-purple-600 hover:bg-purple-700 text-white",
        };
      case "verde":
        return {
          fundo: "bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60",
          accent: "text-emerald-700 bg-emerald-100/80 border-emerald-200",
          detalhe: "bg-emerald-500",
          borda: "border-emerald-200/60",
          sombra: "hover:shadow-emerald-500/15",
          btn: "bg-emerald-600 hover:bg-emerald-700 text-white",
        };
      case "amarelo":
        return {
          fundo: "bg-gradient-to-br from-amber-50 via-white to-amber-100/60",
          accent: "text-amber-800 bg-amber-100/80 border-amber-200",
          detalhe: "bg-amber-500",
          borda: "border-amber-200/60",
          sombra: "hover:shadow-amber-500/15",
          btn: "bg-amber-600 hover:bg-amber-700 text-white",
        };
      case "rosa":
        return {
          fundo: "bg-gradient-to-br from-rose-50 via-white to-rose-100/60",
          accent: "text-rose-700 bg-rose-100/80 border-rose-200",
          detalhe: "bg-rose-500",
          borda: "border-rose-200/60",
          sombra: "hover:shadow-rose-500/15",
          btn: "bg-rose-600 hover:bg-rose-700 text-white",
        };
      case "cinza":
        return {
          fundo: "bg-gradient-to-br from-slate-50 via-white to-slate-100/60",
          accent: "text-slate-700 bg-slate-100/80 border-slate-200",
          detalhe: "bg-slate-500",
          borda: "border-slate-200/60",
          sombra: "hover:shadow-slate-500/15",
          btn: "bg-slate-700 hover:bg-slate-800 text-white",
        };
      case "azul":
      default:
        return {
          fundo: "bg-gradient-to-br from-sky-50 via-white to-sky-100/60",
          accent: "text-sky-800 bg-sky-100/80 border-sky-200",
          detalhe: "bg-sky-500",
          borda: "border-sky-200/60",
          sombra: "hover:shadow-sky-500/15",
          btn: "bg-sky-600 hover:bg-sky-700 text-white",
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Limpo em Fundo Branco */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-sky-500 to-indigo-600 text-white rounded-xl shadow-sm shadow-sky-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Consulte o nosso Gemini Notebook
            </h2>
            <p className="text-xs text-slate-500">
              Acesse cadernos de apoio inteligente gerados com materiais curriculares oficiais e planos de aula.
            </p>
          </div>
        </div>

      </div>

      {/* Erro ao carregar */}
      {erro && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Aviso: </span>
            <span>{erro}</span>
          </div>
        </div>
      )}

      {/* Grid de Cards em formato de Figurinhas Autoadesivas 3D */}
      {carregando ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-500" />
          <span className="text-xs font-medium">Carregando cadernos do Gemini Notebook...</span>
        </div>
      ) : cards.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">Nenhum link cadastrado no arquivo</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Abra o arquivo <code className="font-mono font-bold">public/notebooklm_links.txt</code> e adicione seus cadernos do Gemini Notebook para visualizá-los aqui como figurinhas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
          {cards.map((card) => {
            const estilo = obterEstiloFigurinha(card.cor);

            return (
              <div
                key={card.id}
                className={`group relative transition-all duration-300 ease-out transform ${card.rotacao} hover:-translate-y-2.5 hover:z-20`}
              >
                {/* Sombra da Figurinha Projetada no Fundo */}
                <div className="absolute inset-0 rounded-2xl bg-slate-800/10 blur-md transform translate-y-3 translate-x-1 group-hover:translate-y-6 group-hover:blur-xl group-hover:bg-slate-900/15 transition-all duration-300" />

                {/* Corpo do Adesivo: Borda Branca Grossa de Vinil + Recorte 3D */}
                <div
                  className={`relative rounded-2xl p-5 ${estilo.fundo} border-4 border-white shadow-[0_4px_12px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)] ring-1 ring-slate-200/70 transition-all duration-300 group-hover:shadow-2xl ${estilo.sombra} flex flex-col justify-between min-h-[220px] overflow-hidden`}
                >
                  {/* Detalhe de Brilho Translúcido Superior (Glossy Sticker Finish) */}
                  <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white/70 via-white/20 to-transparent pointer-events-none rounded-t-xl" />

                  {/* Dobra de Adesivo Descolando no Canto Superior Direito (Peel Corner) */}
                  <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-slate-200/70 via-white/80 to-transparent transform rotate-45 translate-x-6 -translate-y-6 shadow-2xs border-b border-l border-white/60" />
                  </div>

                  {/* Topo do Card: Categoria + Ícone Gemini Notebook */}
                  <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider border shadow-2xs ${estilo.accent}`}
                    >
                      {card.categoria}
                    </span>

                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs">
                      <Sparkles className="w-3 h-3 text-sky-500" />
                      <span>Gemini Notebook</span>
                    </div>
                  </div>

                  {/* Título e Descrição */}
                  <div className="relative z-10 space-y-1.5 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-sky-700 transition-colors">
                      {card.titulo}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {card.descricao}
                    </p>
                  </div>

                  {/* Rodapé do Adesivo: Botão de Ação Direta */}
                  <div className="relative z-10 pt-4 mt-2 border-t border-slate-200/50 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Gemini Notebook
                    </span>

                    <a
                      href={card.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-transform group-hover:scale-105 active:scale-95 ${estilo.btn}`}
                    >
                      <span>Abrir Caderno</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
