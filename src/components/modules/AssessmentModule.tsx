import React from "react";
import { Sparkles, Award } from "lucide-react";
import { LessonPlanState } from "../../types/lessonPlan";
import { AssessmentAssistant } from "../common/AssessmentAssistant";

interface AssessmentModuleProps {
  data: LessonPlanState;
}

export const AssessmentModule: React.FC<AssessmentModuleProps> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">
          <Award className="w-48 h-48 text-white" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold text-amber-100">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>Exclusivo para o Professor • Apoio Diagnóstico</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Sugestão de Avaliação (Retomada Diagnóstica)
          </h2>

          <p className="text-sm text-amber-100/90 leading-relaxed">
            Gera uma avaliação estruturada com <strong>10 questões em dificuldade gradual</strong> (do nível de apoio inicial até o domínio avançado) baseada nas <em>Aprendizagens Essenciais não consolidadas</em> detectadas.
          </p>

          <p className="text-xs text-amber-200/80 bg-black/10 px-3 py-1.5 rounded-lg inline-block">
            ℹ Esta seção não entra na impressão do plano oficial de aula nem no arquivo Word (.docx), servindo como ferramenta pedagógica direta para você aplicar aos seus alunos.
          </p>
        </div>
      </div>

      {/* Assistente de Geração e Gerenciamento da Avaliação */}
      <AssessmentAssistant data={data} />
    </div>
  );
};
