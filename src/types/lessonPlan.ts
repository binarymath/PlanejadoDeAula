export type DiaSemana = 1 | 2 | 3 | 4 | 5; // 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex

export interface TurmaPlanejada {
  id: string;
  nome: string; // Ex: "6º Ano A", "7º Ano B"
  // Quantas aulas a turma tem na grade regular semanal
  aulasPorDia: {
    seg: number;
    ter: number;
    qua: number;
    qui: number;
    sex: number;
  };
  // Quantidade pontual de aulas que essa turma terá em sábados letivos no bimestre
  aulasSabadoLetivo?: number;
}

export type TipoEventoEscolar = "nao_letivo" | "letivo";

export interface FeriadoExcecao {
  id: string;
  data: string; // YYYY-MM-DD (Início do evento)
  dataFim?: string; // YYYY-MM-DD (Término opcional do evento caso dure mais de um dia)
  motivo: string; // Ex: "Carnaval", "Feira de Ciências", "Reunião de Pais"
  tipo?: TipoEventoEscolar; // 'nao_letivo' (desconta da contagem) ou 'letivo' (mantém na contagem)
}

export type EventoEscolar = FeriadoExcecao;

export interface PeriodoBimestre {
  inicio: string; // YYYY-MM-DD
  fim: string;    // YYYY-MM-DD
}

export type CalendarioBimestres = Record<
  "1º Bimestre" | "2º Bimestre" | "3º Bimestre" | "4º Bimestre",
  PeriodoBimestre
> & {
  [bimestre: string]: PeriodoBimestre;
};

export const CALENDARIO_BIMESTRES_PADRAO: CalendarioBimestres = {
  "1º Bimestre": { inicio: "2026-02-02", fim: "2026-04-24" },
  "2º Bimestre": { inicio: "2026-04-27", fim: "2026-07-03" },
  "3º Bimestre": { inicio: "2026-07-27", fim: "2026-10-02" },
  "4º Bimestre": { inicio: "2026-10-05", fim: "2026-12-18" },
};

export interface LessonPlanState {
  // Dados da Escola
  nomeEscola: string;
  logoEscolaBase64: string;
  logoEscolaUrl?: string;

  // Identificação Geral
  nomeProfessor: string;
  componenteCurricular: string;
  anoEscolar: string;
  bimestre: string;
  dataInicioBimestre: string;
  dataFimBimestre: string;
  aulasPrevistas: string;
  controleFrequencia: string;

  // Calendário com os períodos dos 4 bimestres
  calendarioBimestres?: CalendarioBimestres;

  // Estrutura Dinâmica de Múltiplas Turmas e Calendário
  turmas: TurmaPlanejada[];
  feriadosExcecoes: FeriadoExcecao[];

  // Sessões Pedagógicas
  aprendizagensNaoConsolidadas: string;
  objetosConhecimento: string;
  competenciasSocioemocionais: string;
  cronograma: string;
  metodologiaAtiva: string;
  criterioAvaliacao: string;
  referenciasApoio: string;
}

export const initialTurmas: TurmaPlanejada[] = [
  {
    id: "1",
    nome: "",
    aulasPorDia: { seg: 0, ter: 0, qua: 0, qui: 0, sex: 0 },
    aulasSabadoLetivo: 0,
  },
];

export const initialLessonPlanState: LessonPlanState = {
  nomeEscola: "",
  logoEscolaBase64: "",
  logoEscolaUrl: "",
  nomeProfessor: "",
  componenteCurricular: "",
  anoEscolar: "",
  bimestre: "",
  dataInicioBimestre: "",
  dataFimBimestre: "",
  aulasPrevistas: "",
  controleFrequencia: "",
  calendarioBimestres: CALENDARIO_BIMESTRES_PADRAO,
  turmas: initialTurmas,
  feriadosExcecoes: [],
  aprendizagensNaoConsolidadas: "",
  objetosConhecimento: "",
  competenciasSocioemocionais: "",
  cronograma: "",
  metodologiaAtiva: "",
  criterioAvaliacao: "",
  referenciasApoio: "",
};

