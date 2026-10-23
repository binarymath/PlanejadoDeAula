import React, { useState, useEffect } from "react";
import { CalendarRange, CalendarSync, Sparkles } from "lucide-react";
import { LessonPlanState } from "../../types/lessonPlan";
import { gerarCronogramaPorDatas, obterSemanasEstruturadas } from "../../utils/scheduleHelper";
import {
  obterAulasCurriculo,
  AulaCurriculoItem,
} from "../../services/curriculumService";
import { ColunaCurriculoOpcao } from "../../services/geminiScheduleService";
import { GeminiScheduleAssistant } from "../common/GeminiScheduleAssistant";

interface ScheduleModuleProps {
  data: LessonPlanState;
  onChange: (field: keyof LessonPlanState, value: string) => void;
}

export const ScheduleModule: React.FC<ScheduleModuleProps> = ({
  data,
  onChange,
}) => {
  const [aulasCurriculo, setAulasCurriculo] = useState<AulaCurriculoItem[]>([]);
  const [colunaEscolhida, setColunaEscolhida] = useState<ColunaCurriculoOpcao>("conteudo");

  // Ano e bimestre ativos
  const anoAtivo = data.anoEscolar || (data.turmas && data.turmas.length > 0 ? data.turmas[0].nome : "6º Ano");
  const bimestreAtivo = data.bimestre || "1º Bimestre";

  // Carrega as aulas da aba correspondente da planilha de Objetos de Conhecimento
  useEffect(() => {
    obterAulasCurriculo(anoAtivo, bimestreAtivo).then((aulas) => {
      setAulasCurriculo(aulas);
    });
  }, [anoAtivo, bimestreAtivo]);

  // Semanas calculadas
  const semanasEstruturadas = obterSemanasEstruturadas(
    data.dataInicioBimestre,
    data.dataFimBimestre,
    data.feriadosExcecoes || []
  );

  const handleGerarPorDatas = () => {
    const cronogramaGerado = gerarCronogramaPorDatas(
      data.dataInicioBimestre,
      data.dataFimBimestre,
      data.feriadosExcecoes || []
    );
    onChange("cronograma", cronogramaGerado);
  };

  const handleAplicarDoGemini = (cronogramaTexto: string) => {
    onChange("cronograma", cronogramaTexto);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <CalendarRange className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">5. Cronograma por Mês e Datas</h2>
            <p className="text-xs text-slate-500">
              Distribuição organizada por mês e semana, associada com a planilha de Objetos de Conhecimento
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGerarPorDatas}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all shadow-xs"
        >
          <CalendarSync className="w-4 h-4" />
          <span>Gerar Apenas Datas (Seg a Sex)</span>
        </button>
      </div>

      {/* Assistente Gemini com Escolha da Coluna da Planilha de Objetos de Conhecimento */}
      <GeminiScheduleAssistant
        plano={data}
        aulasCurriculo={aulasCurriculo}
        semanas={semanasEstruturadas}
        colunaEscolhida={colunaEscolhida}
        onColunaChange={setColunaEscolhida}
        onAplicarCronograma={handleAplicarDoGemini}
      />

      {/* Caixa de Texto do Cronograma para DOCX */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-slate-600 uppercase">
            Detalhamento do Cronograma (Será exportado no DOCX):
          </label>

          <span className="text-[11px] text-slate-400">
            Formato oficial: agrupado por Mês, iniciando direto na data (sem número de semana)
          </span>
        </div>

        <textarea
          rows={14}
          value={data.cronograma}
          onChange={(e) => onChange("cronograma", e.target.value)}
          placeholder={`FEVEREIRO:
02/02 a 06/02: Apresentação do plano e acolhimento dos estudantes.
09/02 a 13/02: Os números naturais em situações do cotidiano.
16/02 a 20/02: [16/02 a 18/02 - Carnaval] Retomada e nivelamento das aprendizagens.
23/02 a 27/02: Resolução de situações-problema e atividades em grupo.

MARÇO:
02/03 a 06/03: Aprofundamento temático e desenvolvimento de projetos.`}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm leading-relaxed font-mono text-xs"
        />
        <p className="text-[11px] text-slate-400 mt-1">
          Dica: Você pode interagir com o Gemini acima para distribuir os tópicos da coluna escolhida e clicar em <strong>"Aplicar ao Cronograma"</strong> ou editar livremente as linhas do texto.
        </p>
      </div>
    </div>
  );
};
