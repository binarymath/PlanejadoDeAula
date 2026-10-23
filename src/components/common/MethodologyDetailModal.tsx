import React from "react";
import { X, BookOpen, User, Lightbulb, Compass, Check, Plus } from "lucide-react";
import { MetodologiaAtivaItem } from "../../services/methodologyService";

interface MethodologyDetailModalProps {
  item: MetodologiaAtivaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectToggle: (item: MetodologiaAtivaItem) => void;
  isSelected: boolean;
}

export const MethodologyDetailModal: React.FC<MethodologyDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onSelectToggle,
  isSelected,
}) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Topo do Card Modal em Tons de Azul */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-sky-50/70 border-b border-blue-100 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100/80 px-2.5 py-0.5 rounded-full inline-block">
                {item.categoriaReferencia || "Metodologia Ativa"}
              </span>
              {item.modalidadeRecomendada && (
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <span>Destinado a:</span>
                  <span>{item.modalidadeRecomendada}</span>
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {item.metodologiaAtiva}
            </h3>
            {item.autorReferencia && (
              <p className="text-xs text-slate-600 flex items-center gap-1 font-medium">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Autor(a) / Referência: {item.autorReferencia}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Leitura Fluida e Organizada */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm leading-relaxed">
          {/* O que é esta técnica */}
          <div className="space-y-2 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
              <Compass className="w-4 h-4 text-blue-600" />
              <span>Em que Consiste esta Habilidade / Metodologia</span>
            </div>
            <p className="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
              {item.definicaoDescricao || "Definição não cadastrada na planilha."}
            </p>
          </div>

          {/* Aplicação Prática em Sala de Aula */}
          {item.exemploPratico && (
            <div className="space-y-2 bg-blue-50/40 p-4 rounded-xl border border-blue-200/70">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wide">
                <Lightbulb className="w-4 h-4 text-blue-600" />
                <span>Aplicação Prática em Sala de Aula</span>
              </div>
              <p className="text-blue-950 text-xs sm:text-sm leading-relaxed italic whitespace-pre-line">
                "{item.exemploPratico}"
              </p>
            </div>
          )}

          {/* Obra de Referência */}
          {item.categoriaReferencia && (
            <div className="text-xs text-slate-500 flex items-center gap-2 pt-2 border-t border-slate-100">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Obra: <strong>{item.categoriaReferencia}</strong>
                {item.autorReferencia ? ` (${item.autorReferencia})` : ""}
              </span>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Fechar Card
          </button>

          <button
            type="button"
            onClick={() => onSelectToggle(item)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg shadow-2xs transition-colors ${
              isSelected
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isSelected ? (
              <>
                <X className="w-4 h-4" />
                <span>Remover do Plano</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Adicionar ao Plano</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
