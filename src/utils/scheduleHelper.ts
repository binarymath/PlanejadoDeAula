import { FeriadoExcecao, TurmaPlanejada } from "../types/lessonPlan";

const MESES_PT = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];

function formatDDMM(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}`;
}

function formatYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Gera o esqueleto do cronograma agrupado por mês,
 * iniciando diretamente na data (Segunda a Sexta), sem numerar semana.
 * Exemplo:
 * FEVEREIRO:
 * 02/02 a 06/02: 
 * 09/02 a 13/02: 
 * 16/02 a 20/02: (Feriado: 16/02 - Carnaval)
 */
export function gerarCronogramaPorDatas(
  dataInicioStr: string,
  dataFimStr: string,
  feriados: FeriadoExcecao[] = []
): string {
  if (!dataInicioStr || !dataFimStr) {
    return "Selecione o Início e o Fim do Bimestre na aba 1 (Identificação) para gerar o cronograma por datas.";
  }

  const [y1, m1, d1] = dataInicioStr.split("-").map(Number);
  const [y2, m2, d2] = dataFimStr.split("-").map(Number);

  const start = new Date(y1, m1 - 1, d1);
  const end = new Date(y2, m2 - 1, d2);

  if (start > end) return "";

  // Mapeia eventos para consulta rápida (data -> lista de eventos com tipo, expandindo intervalos com dataFim)
  const eventosMap = new Map<string, FeriadoExcecao[]>();
  feriados.forEach((f) => {
    if (!f.data) return;
    const inicioStr = f.data.trim();
    const fimStr = (f.dataFim || f.data).trim();

    if (fimStr && fimStr > inicioStr) {
      const [iy, im, id] = inicioStr.split("-").map(Number);
      const [fy, fm, fd] = fimStr.split("-").map(Number);
      const cur = new Date(iy, im - 1, id);
      const endEvt = new Date(fy, fm - 1, fd);

      while (cur <= endEvt) {
        const k = formatYYYYMMDD(cur);
        if (!eventosMap.has(k)) {
          eventosMap.set(k, []);
        }
        eventosMap.get(k)!.push(f);
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      if (!eventosMap.has(inicioStr)) {
        eventosMap.set(inicioStr, []);
      }
      eventosMap.get(inicioStr)!.push(f);
    }
  });

  // Encontra a segunda-feira da semana de início
  const currentMonday = new Date(start);
  const startDay = currentMonday.getDay();
  // Se for domingo (0), avança 1 dia; senão recua para a segunda (1)
  const diffToMonday = startDay === 0 ? 1 : (startDay === 1 ? 0 : 1 - startDay);
  currentMonday.setDate(currentMonday.getDate() + diffToMonday);

  const mesesMap = new Map<string, string[]>();

  while (currentMonday <= end) {
    // Sexta-feira da semana (segunda + 4 dias)
    const currentFriday = new Date(currentMonday);
    currentFriday.setDate(currentMonday.getDate() + 4);
    const inicioSemana = new Date(Math.max(currentMonday.getTime(), start.getTime()));
    const fimSemana = new Date(Math.min(currentFriday.getTime(), end.getTime()));

    // Mês predominante da semana (usamos a sexta ou a segunda)
    const mesNome = MESES_PT[inicioSemana.getMonth()];

    // Verifica se há eventos dentro desta semana (Segunda a Sexta)
    const eventosNaSemana: string[] = [];
    const checkDay = new Date(inicioSemana);
    while (checkDay <= fimSemana) {
      const dateKey = formatYYYYMMDD(checkDay);
      if (eventosMap.has(dateKey)) {
        const evts = eventosMap.get(dateKey)!;
        evts.forEach((e) => {
          const tipoRotulo = e.tipo === "letivo" ? "Evento Letivo" : "Sem aula";
          eventosNaSemana.push(`${formatDDMM(checkDay)} - ${e.motivo} (${tipoRotulo})`);
        });
      }
      checkDay.setDate(checkDay.getDate() + 1);
    }

    const obsEvento = eventosNaSemana.length > 0 ? ` [${eventosNaSemana.join(", ")}]` : "";
    const linhaSemana = `${formatDDMM(inicioSemana)} a ${formatDDMM(fimSemana)}: ${obsEvento}`;

    if (!mesesMap.has(mesNome)) {
      mesesMap.set(mesNome, []);
    }
    mesesMap.get(mesNome)!.push(linhaSemana);

    // Avança 7 dias para a próxima segunda-feira
    currentMonday.setDate(currentMonday.getDate() + 7);
  }

  // Monta o texto formatado por Mês
  const blocos: string[] = [];
  mesesMap.forEach((linhas, mes) => {
    blocos.push(`${mes}:\n` + linhas.join("\n"));
  });

  return blocos.join("\n\n");
}

export interface SemanaCronogramaInfo {
  mes: string;
  segundaFormatada: string;
  sextaFormatada: string;
  rotulo: string; // ex: "02/02 a 06/02"
  feriadosNaSemana: string[]; // ex: ["16/02 - Carnaval"]
  diasLetivos: number;
  aulasPrevistas: number;
  aulasPorTurma: { nome: string; quantidade: number }[];
  semanaCurta: boolean;
}

/**
 * Retorna as semanas calculadas como objetos para alimentar o assistente de IA
 */
export function obterSemanasEstruturadas(
  dataInicioStr: string,
  dataFimStr: string,
  feriados: FeriadoExcecao[] = [],
  turmas: TurmaPlanejada[] = []
): SemanaCronogramaInfo[] {
  if (!dataInicioStr || !dataFimStr) return [];

  const [y1, m1, d1] = dataInicioStr.split("-").map(Number);
  const [y2, m2, d2] = dataFimStr.split("-").map(Number);

  const start = new Date(y1, m1 - 1, d1);
  const end = new Date(y2, m2 - 1, d2);
  if (start > end) return [];

  const eventosMap = new Map<string, FeriadoExcecao[]>();
  feriados.forEach((f) => {
    if (!f.data) return;
    const inicioStr = f.data.trim();
    const fimStr = (f.dataFim || f.data).trim();

    if (fimStr && fimStr > inicioStr) {
      const [iy, im, id] = inicioStr.split("-").map(Number);
      const [fy, fm, fd] = fimStr.split("-").map(Number);
      const cur = new Date(iy, im - 1, id);
      const endEvt = new Date(fy, fm - 1, fd);

      while (cur <= endEvt) {
        const k = formatYYYYMMDD(cur);
        if (!eventosMap.has(k)) {
          eventosMap.set(k, []);
        }
        eventosMap.get(k)!.push(f);
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      if (!eventosMap.has(inicioStr)) {
        eventosMap.set(inicioStr, []);
      }
      eventosMap.get(inicioStr)!.push(f);
    }
  });

  const currentMonday = new Date(start);
  const startDay = currentMonday.getDay();
  const diffToMonday = startDay === 0 ? 1 : (startDay === 1 ? 0 : 1 - startDay);
  currentMonday.setDate(currentMonday.getDate() + diffToMonday);

  const lista: SemanaCronogramaInfo[] = [];

  while (currentMonday <= end) {
    const currentFriday = new Date(currentMonday);
    currentFriday.setDate(currentMonday.getDate() + 4);

    const mesNome = MESES_PT[currentMonday.getMonth()];
    const feriadosNaSemana: string[] = [];
    const inicioSemana = new Date(Math.max(currentMonday.getTime(), start.getTime()));
    const fimSemana = new Date(Math.min(currentFriday.getTime(), end.getTime()));
    let diasLetivos = 0;
    let aulasPrevistas = 0;
    const aulasPorTurma = turmas.map((turma) => ({
      nome: turma.nome || "Turma",
      quantidade: 0,
    }));
    const checkDay = new Date(inicioSemana);
    while (checkDay <= fimSemana) {
      const dateKey = formatYYYYMMDD(checkDay);
      if (eventosMap.has(dateKey)) {
        const evts = eventosMap.get(dateKey)!;
        evts.forEach((e) => {
          const tipoRotulo = e.tipo === "letivo" ? "Evento Letivo" : "Sem aula";
          feriadosNaSemana.push(`${formatDDMM(checkDay)} - ${e.motivo} (${tipoRotulo})`);
        });
      }

      const eventosNoDia = eventosMap.get(dateKey) || [];
      const diaSemAula = eventosNoDia.some((evento) => (evento.tipo ?? "nao_letivo") === "nao_letivo");
      if (checkDay.getDay() >= 1 && checkDay.getDay() <= 5 && !diaSemAula) {
        diasLetivos += 1;
        if (turmas.length > 0) {
          const chavesDia: Record<number, keyof TurmaPlanejada["aulasPorDia"]> = {
            1: "seg",
            2: "ter",
            3: "qua",
            4: "qui",
            5: "sex",
          };
          const chave = chavesDia[checkDay.getDay()];
          turmas.forEach((turma, indice) => {
            aulasPorTurma[indice].quantidade += Number(turma.aulasPorDia[chave]) || 0;
          });
          aulasPrevistas += turmas.reduce(
            (total, turma) => total + (Number(turma.aulasPorDia[chave]) || 0),
            0
          ) / turmas.length;
        } else {
          aulasPrevistas += 1;
        }
      }
      checkDay.setDate(checkDay.getDate() + 1);
    }

    lista.push({
      mes: mesNome,
      segundaFormatada: formatDDMM(inicioSemana),
      sextaFormatada: formatDDMM(fimSemana),
      rotulo: `${formatDDMM(inicioSemana)} a ${formatDDMM(fimSemana)}`,
      feriadosNaSemana,
      diasLetivos,
      aulasPrevistas,
      aulasPorTurma,
      semanaCurta: diasLetivos < 5,
    });

    currentMonday.setDate(currentMonday.getDate() + 7);
  }

  return lista;
}
