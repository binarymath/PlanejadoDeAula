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

export interface FeriadoExcecao {
  id: string;
  data: string; // YYYY-MM-DD
  motivo: string; // Ex: "Carnaval", "Reunião Pedagógica", "Ponto Facultativo"
}

export interface LessonPlanState {
  // Dados da Escola
  nomeEscola: string;
  logoEscolaBase64: string;

  // Identificação Geral
  nomeProfessor: string;
  componenteCurricular: string;
  anoEscolar: string;
  bimestre: string;
  dataInicioBimestre: string;
  dataFimBimestre: string;
  aulasPrevistas: string;
  controleFrequencia: string;

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
    nome: "6º Ano A",
    aulasPorDia: { seg: 2, ter: 0, qua: 2, qui: 0, sex: 0 },
    aulasSabadoLetivo: 0,
  },
];

export const initialLessonPlanState: LessonPlanState = {
  nomeEscola: "EE PROF. MARCO ANTÔNIO MENCACCI",
  logoEscolaBase64: "",
  nomeProfessor: "",
  componenteCurricular: "",
  anoEscolar: "6º Ano A",
  bimestre: "1º Bimestre",
  dataInicioBimestre: "2026-02-05",
  dataFimBimestre: "2026-04-18",
  aulasPrevistas: "40",
  controleFrequencia: "Acompanhamento diário no Diário Digital (SED)",
  turmas: initialTurmas,
  feriadosExcecoes: [
    { id: "f1", data: "2026-02-16", motivo: "Carnaval (Segunda-feira)" },
    { id: "f2", data: "2026-02-17", motivo: "Carnaval (Terça-feira)" },
    { id: "f3", data: "2026-04-03", motivo: "Sexta-feira Santa" },
  ],
  aprendizagensNaoConsolidadas: "",
  objetosConhecimento: "",
  competenciasSocioemocionais: "",
  cronograma: "",
  metodologiaAtiva: "",
  criterioAvaliacao: "",
  referenciasApoio: "",
};
