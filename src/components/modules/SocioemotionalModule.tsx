import React, { useState, useEffect } from "react";
import {
  HeartHandshake,
  CheckSquare,
  Square,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { LessonPlanState } from "../../types/lessonPlan";
import {
  CINCO_GRANDES_BLOCOS_SOCIOEMOCIONAIS,
  MacrocompetenciaSocioemocional,
} from "../../config/competenciasSocioemocionaisBNCC";

interface SocioemotionalModuleProps {
  data: LessonPlanState;
  onChange: (field: keyof LessonPlanState, value: string) => void;
}

export const SocioemotionalModule: React.FC<SocioemotionalModuleProps> = ({
  data,
  onChange,
}) => {
  // Guarda quais blocos estão selecionados
  const [blocosSelecionados, setBlocosSelecionados] = useState<Set<string>>(new Set());
  const [painelAberto, setPainelAberto] = useState<boolean>(true);

  // Sincroniza os checkboxes com o texto atual ao carregar
  useEffect(() => {
    const texto = data.competenciasSocioemocionais || "";
    const novos = new Set<string>();

    CINCO_GRANDES_BLOCOS_SOCIOEMOCIONAIS.forEach((bloco) => {
      if (
        texto.includes(`[${bloco.nome}]`) ||
        texto.includes(`[${bloco.sigla}]`) ||
        texto.includes(bloco.nome)
      ) {
        novos.add(bloco.id);
      }
    });

    setBlocosSelecionados(novos);
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

        {painelAberto && (
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
                        <span className="text-xs font-bold text-slate-900">
                          {bloco.nome}
                        </span>
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

      {/* Caixa de Texto que migra para o DOCX */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
          Competências Socioemocionais (Será exportado no DOCX):
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
