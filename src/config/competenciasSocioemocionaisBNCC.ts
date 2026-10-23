export interface MacrocompetenciaSocioemocional {
  id: string;
  sigla: string;
  nome: string;
  descricaoCurta: string;
  habilidades: {
    nome: string;
    definicao: string;
  }[];
}

export const CINCO_GRANDES_BLOCOS_SOCIOEMOCIONAIS: MacrocompetenciaSocioemocional[] = [
  {
    id: "autogestao",
    sigla: "AUTOGESTÃO",
    nome: "Autogestão",
    descricaoCurta: "Capacidade de gerenciar sentimentos, pensamentos e ações em prol de objetivos.",
    habilidades: [
      {
        nome: "Foco",
        definicao: "Capacidade de manter a atenção concentrada na tarefa sem se distrair.",
      },
      {
        nome: "Organização",
        definicao: "Capacidade de estruturar o tempo, os materiais e planejar etapas.",
      },
      {
        nome: "Determinação",
        definicao: "Capacidade de persistir diante de dificuldades para alcançar metas.",
      },
      {
        nome: "Persistência",
        definicao: "Superar obstáculos e concluir as tarefas propostas até o fim.",
      },
      {
        nome: "Responsabilidade",
        definicao: "Cumprir prazos, combinados e assumir as consequências de seus atos.",
      },
    ],
  },
  {
    id: "engajamento",
    sigla: "ENGAJAMENTO",
    nome: "Engajamento com os Outros",
    descricaoCurta: "Capacidade de expressar sentimentos e ideias, interagir positivamente e motivar colegas.",
    habilidades: [
      {
        nome: "Iniciativa Social",
        definicao: "Facilidade de interagir com diferentes pessoas e liderar grupos.",
      },
      {
        nome: "Assertividade",
        definicao: "Expressar ideias, vontades e sentimentos de forma clara e respeitosa.",
      },
      {
        nome: "Entusiasmo",
        definicao: "Demonstrar energia, vibração positiva e engajamento nas atividades.",
      },
    ],
  },
  {
    id: "amabilidade",
    sigla: "AMABILIDADE",
    nome: "Amabilidade",
    descricaoCurta: "Capacidade de agir com empatia, generosidade e cooperação nas relações humanas.",
    habilidades: [
      {
        nome: "Empatia",
        definicao: "Colocar-se no lugar do outro e compreender seus sentimentos e pontos de vista.",
      },
      {
        nome: "Respeito",
        definicao: "Tratar a todos com consideração, valorizando a dignidade e a diversidade.",
      },
      {
        nome: "Confiança",
        definicao: "Acreditar na boa intenção dos colegas e cooperar em grupo.",
      },
    ],
  },
  {
    id: "resiliencia",
    sigla: "RESILIÊNCIA",
    nome: "Resiliência Emocional",
    descricaoCurta: "Capacidade de lidar com sentimentos desafiadores como estresse, ansiedade e frustração.",
    habilidades: [
      {
        nome: "Tolerância ao Estresse",
        definicao: "Gerir a ansiedade e manter a calma em situações de pressão ou provas.",
      },
      {
        nome: "Autoconfiança",
        definicao: "Acreditar na sua própria capacidade de aprender e realizar tarefas.",
      },
      {
        nome: "Tolerância à Frustração",
        definicao: "Lidar de forma construtiva com erros e contratempos.",
      },
    ],
  },
  {
    id: "abertura",
    sigla: "ABERTURA",
    nome: "Abertura ao Novo",
    descricaoCurta: "Capacidade de explorar novas ideias, perspectivas culturais e soluções originais.",
    habilidades: [
      {
        nome: "Curiosidade para Aprender",
        definicao: "Interesse e paixão por adquirir novos conhecimentos e fazer perguntas.",
      },
      {
        nome: "Imaginação Criativa",
        definicao: "Gerar ideias inovadoras, pensar fora da caixa e expressar-se criativamente.",
      },
      {
        nome: "Interesse Artístico",
        definicao: "Apreciação de diferentes formas de arte, cultura e manifestações estéticas.",
      },
    ],
  },
];
