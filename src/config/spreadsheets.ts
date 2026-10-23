/**
 * =========================================================================
 * CONFIGURAÇÃO CENTRAL DE FONTES DE DADOS E PLANILHAS POR SESSÃO
 * =========================================================================
 * 
 * Você pode colocar diretamente aqui o endereço (URL ou caminho local) da planilha 
 * de cada sessão ou de arquivos que alimentam os módulos.
 * Exemplo de links suportados:
 * - URL pública do Google Sheets (exportada em CSV): "https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
 * - Arquivo local ou na pasta public/: "/dados/conteudos_4bim.xlsx"
 * - Endpoint de API ou arquivo JSON/CSV
 */

export interface SheetConfig {
  id: string;
  moduleName: string;
  description: string;
  spreadsheetUrl: string; // Coloque diretamente aqui o link da planilha
  sheetTabName?: string;  // Nome da aba da planilha (opcional)
  mapping?: Record<string, string>; // Mapeamento de colunas da planilha para campos do módulo
}

export const SPREADSHEETS_CONFIG: Record<string, SheetConfig> = {
  // 1. Identificação Geral (Professores, turmas, bimestres)
  identificacao: {
    id: "identificacao",
    moduleName: "Identificação Geral",
    description: "Planilha de turmas, componentes curriculares e carga horária prevista",
    spreadsheetUrl: "", // <-- COLE AQUI O LINK DA PLANILHA DE IDENTIFICAÇÃO
    sheetTabName: "Geral",
  },

  // 2. Aprendizagens Essenciais Não Consolidadas (Recuperação do 3º Bimestre)
  recuperacao: {
    id: "recuperacao",
    moduleName: "Aprendizagens Não Consolidadas",
    description: "Diagnóstico de habilidades e aprendizagens defasadas do bimestre anterior",
    spreadsheetUrl: "", // <-- COLE AQUI O LINK DA PLANILHA DE DEFASAGENS / RECUPERAÇÃO
    sheetTabName: "Habilidades_Defasadas",
  },

  // 3. Objetos de Conhecimento / Unidades Temáticas do Bimestre
  conteudos: {
    id: "conteudos",
    moduleName: "Objetos de Conhecimento",
    description: "Unidades temáticas, habilidades BNCC e objetos de conhecimento do bimestre",
    spreadsheetUrl: "", // <-- COLE AQUI O LINK DA PLANILHA DE CURRÍCULO PAULISTA / CONTEÚDOS
    sheetTabName: "Objetos_Conhecimento",
  },

  // 4. Competências Socioemocionais
  socioemocionais: {
    id: "socioemocionais",
    moduleName: "Competências Socioemocionais",
    description: "Lista de competências do Instituto Ayrton Senna / Currículo Paulista",
    spreadsheetUrl: "", // <-- COLE AQUI O LINK DA PLANILHA DE COMPETÊNCIAS SOCIOEMOCIONAIS
    sheetTabName: "Socioemocionais",
  },

  // 5. Cronograma
  cronograma: {
    id: "cronograma",
    moduleName: "Cronograma de Aulas",
    description: "Distribuição semanal das aulas, datas e blocos temáticos",
    spreadsheetUrl: "", // <-- COLE AQUI O LINK DA PLANILHA DE CRONOGRAMA
    sheetTabName: "Cronograma",
  },

  // 6. Metodologias Ativas
  metodologias: {
    id: "metodologias",
    moduleName: "Metodologias Ativas",
    description: "Técnicas ativas, estratégias pedagógicas e dinâmicas de sala de aula",
    spreadsheetUrl: "", // <-- COLE AQUI O LINK DA PLANILHA DE METODOLOGIAS
    sheetTabName: "Metodologias",
  },

  // 7. Critérios de Avaliação
  avaliacao: {
    id: "avaliacao",
    moduleName: "Critérios de Avaliação",
    description: "Critérios, rubricas, instrumentos avaliativos e pesos (Prova Paulista, Interna, Tarefas, Engajamento)",
    spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1UmgDMOnzGXXsWbYxtNN9I7R4wOHl-bPr_1DfPexZClY/edit?usp=sharing",
    sheetTabName: "Página1",
  },

  // 8. Referências Bibliográficas e Apoio
  referencias: {
    id: "referencias",
    moduleName: "Referências e Materiais de Apoio",
    description: "Repositório SEDUC-SP, BNCC, Acervo CMSP 2026 e Currículo Paulista",
    spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1ABztg6sXaNaWpGLaGwKRE0xfrRoR4kkJpyyzRyYS_5Y/edit?usp=sharing",
    sheetTabName: "Página1",
  },
};
