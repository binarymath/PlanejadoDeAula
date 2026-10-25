import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { LessonPlanState } from "../../types/lessonPlan";
import { AssessmentAssistant } from "../common/AssessmentAssistant";
import { obterGeminiApiKey } from "../../services/geminiScheduleService";

interface AssessmentModuleProps {
  data: LessonPlanState;
}

export const AssessmentModule: React.FC<AssessmentModuleProps> = ({ data }) => {
  const [apiKey, setApiKey] = useState<string>(() => obterGeminiApiKey());

  useEffect(() => {
    const atualizar = () => {
      setApiKey(obterGeminiApiKey());
    };
    window.addEventListener("storage", atualizar);
    window.addEventListener("focus", atualizar);
    return () => {
      window.removeEventListener("storage", atualizar);
      window.removeEventListener("focus", atualizar);
    };
  }, []);
  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-800">
            Sugestão de Avaliação (Retomada Diagnóstica)
          </h2>

          {/* Status da IA */}
          <div className="flex items-center gap-2">
            {apiKey ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold shadow-2xs">
                <Check className="w-4 h-4 stroke-[3] text-emerald-600" />
                <span>Sincronizado ✔</span>
                <span className="text-slate-300">|</span>
                <span className="text-emerald-700 font-normal">IA Pronta</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-medium">
                <span>Chave Gemini não configurada (configure no topo do sistema)</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Gera uma avaliação estruturada com <strong>10 questões em dificuldade gradual</strong> (do nível de apoio inicial até o domínio avançado) baseada nas <em>Aprendizagens Essenciais não consolidadas</em> detectadas.
        </p>
      </div>

      {/* Assistente de Geração e Gerenciamento da Avaliação */}
      <AssessmentAssistant data={data} />
    </div>
  );
};
