import { TurmaPlanejada, FeriadoExcecao } from "../types/lessonPlan";

export interface CalculoAulasResultado {
  totalAulasGeral: number;
  totalAulasPorTurma: Record<string, number>;
  limiteFaltasPorTurma: Record<string, number>; // 25% com Math.floor
  diasLetivosTotais: number;
  feriadosDescontados: number;
  resumoTextoTurmas: string;
  resumoTextoAulas: string;      // Apenas por turma: ex: "6º Ano A: 48 aulas | 6º Ano B: 42 aulas" (ou "48 aulas" se for 1 turma)
  resumoControleFrequencia: string; // ex: "6º Ano A: 12 faltas (25%) | 6º Ano B: 10 faltas (25%)" ou "12 faltas (máx. 25%)"
}

/**
 * Mapeia dia da semana JS (1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex)
 */
function getDiaChave(day: number): keyof TurmaPlanejada["aulasPorDia"] | null {
  switch (day) {
    case 1: return "seg";
    case 2: return "ter";
    case 3: return "qua";
    case 4: return "qui";
    case 5: return "sex";
    default: return null;
  }
}

/**
 * Calcula automaticamente:
 * 1. Aulas previstas estritamente por turma (sem somar o total global).
 * 2. Limite máximo de faltas de 25% por turma arredondado para o inteiro menor mais próximo (Math.floor).
 */
export function calcularAulasPrevistas(
  dataInicioStr: string,
  dataFimStr: string,
  turmas: TurmaPlanejada[],
  feriados: FeriadoExcecao[]
): CalculoAulasResultado {
  const result: CalculoAulasResultado = {
    totalAulasGeral: 0,
    totalAulasPorTurma: {},
    limiteFaltasPorTurma: {},
    diasLetivosTotais: 0,
    feriadosDescontados: 0,
    resumoTextoTurmas: "",
    resumoTextoAulas: "",
    resumoControleFrequencia: "",
  };

  if (!dataInicioStr || !dataFimStr || turmas.length === 0) {
    return result;
  }

  const feriadosSet = new Set(feriados.map((f) => f.data.trim()));

  turmas.forEach((t) => {
    result.totalAulasPorTurma[t.id] = 0;
  });

  const [y1, m1, d1] = dataInicioStr.split("-").map(Number);
  const [y2, m2, d2] = dataFimStr.split("-").map(Number);

  const start = new Date(y1, m1 - 1, d1);
  const end = new Date(y2, m2 - 1, d2);

  if (start > end) {
    return result;
  }

  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    const dateFormatted = `${y}-${m}-${d}`;

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      if (feriadosSet.has(dateFormatted)) {
        result.feriadosDescontados++;
      } else {
        result.diasLetivosTotais++;
        const chaveDia = getDiaChave(dayOfWeek);

        if (chaveDia) {
          turmas.forEach((turma) => {
            const aulasNoDia = Number(turma.aulasPorDia[chaveDia]) || 0;
            result.totalAulasPorTurma[turma.id] += aulasNoDia;
            result.totalAulasGeral += aulasNoDia;
          });
        }
      }
    }

    current.setDate(current.getDate() + 1);
  }

  // Soma as aulas pontuais de Sábado Letivo
  turmas.forEach((turma) => {
    const sabados = Number(turma.aulasSabadoLetivo) || 0;
    result.totalAulasPorTurma[turma.id] = (result.totalAulasPorTurma[turma.id] || 0) + sabados;
    result.totalAulasGeral += sabados;
  });

  // Calcula o limite de faltas (25% com Math.floor)
  turmas.forEach((turma) => {
    const totalAulasTurma = result.totalAulasPorTurma[turma.id] || 0;
    result.limiteFaltasPorTurma[turma.id] = Math.floor(totalAulasTurma * 0.25);
  });

  // Texto consolidado das Turmas
  result.resumoTextoTurmas = turmas.map((t) => t.nome).filter(Boolean).join(", ");

  // Formatação: Apenas por turma, sem exibir a soma total!
  if (turmas.length === 1) {
    const t = turmas[0];
    const aulasT = result.totalAulasPorTurma[t.id] || 0;
    const faltasT = result.limiteFaltasPorTurma[t.id] || 0;

    result.resumoTextoAulas = `${t.nome}: ${aulasT}`;
    result.resumoControleFrequencia = `${t.nome} ${faltasT}`;
  } else {
    // Múltiplas turmas: lista apenas turma a turma
    const aulasPartes = turmas.map(
      (t) => `${t.nome}: ${result.totalAulasPorTurma[t.id] || 0}`
    );
    result.resumoTextoAulas = aulasPartes.join(" | ");

    // Formato com separador ' | ' e espaçamento entre turmas: "6º Ano A 12 | 6º Ano B 10"
    const faltasPartes = turmas.map(
      (t) => `${t.nome} ${result.limiteFaltasPorTurma[t.id] || 0}`
    );
    result.resumoControleFrequencia = faltasPartes.join(" | ");
  }

  return result;
}
