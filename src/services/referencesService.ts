export interface ReferenciaItem {
  item: string;
  titulo: string;
  categoria: string;
  orgao: string;
  linkTexto: string;
  url: string;
  descricao?: string;
}

export const REFERENCIAS_SHEET_ID = "";

export const REFERENCIAS_PADRAO: ReferenciaItem[] = [
  {
    item: "1",
    titulo: "Repositório Institucional da Educação SP",
    categoria: "Repositório Digital & Materiais",
    orgao: "Secretaria da Educação do Estado de São Paulo (SEDUC-SP)",
    linkTexto: "Acessar Repositório",
    url: "https://repositorio.educacao.sp.gov.br/",
    descricao: "Acervo de materiais pedagógicos, sequências didáticas e cadernos oficiais."
  },
  {
    item: "2",
    titulo: "Base Nacional Comum Curricular (BNCC)",
    categoria: "Diretriz Curricular Nacional",
    orgao: "Ministério da Educação (MEC)",
    linkTexto: "Download da BNCC",
    url: "http://basenacionalcomum.mec.gov.br/images/BNCC_EI_EF_110518_versaofinal_site.pdf",
    descricao: "Documento normativo que define as aprendizagens essenciais para a Educação Básica."
  },
  {
    item: "3",
    titulo: "Acervo Digital Ementa Escopo-sequência 2026",
    categoria: "Ementa & Planejamento Pedagógico",
    orgao: "Centro de Mídias SP (CMSP) / SEDUC-SP",
    linkTexto: "Acessar Acervo CMSP",
    url: "https://repositorio.educacao.sp.gov.br/Inicio/MidiasCMSP",
    descricao: "Alinhamento de escopo, sequências de atividades e videoaulas do Centro de Mídias."
  },
  {
    item: "4",
    titulo: "Currículo Paulista",
    categoria: "Currículo Estadual & Apoio Pedagógico",
    orgao: "Secretaria da Educação do Estado de São Paulo (SEDUC-SP)",
    linkTexto: "Acessar Currículo Paulista",
    url: "https://efape.educacao.sp.gov.br/curriculopaulista/",
    descricao: "Diretrizes curriculares e habilidades orientadoras do estado de São Paulo."
  }
];

export async function fetchReferenciasPlanilha(customUrl?: string): Promise<ReferenciaItem[]> {
  let url = customUrl || (REFERENCIAS_SHEET_ID ? `https://docs.google.com/spreadsheets/d/${REFERENCIAS_SHEET_ID}/export?format=csv` : "");
  if (!url) {
    return REFERENCIAS_PADRAO;
  }

  // Normaliza link do Google Sheets para export CSV se fornecido URL comum de visualização
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && !url.includes("export?format=")) {
    url = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Falha HTTP ${res.status}`);

    const csvText = await res.text();

    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return REFERENCIAS_PADRAO;

    const items: ReferenciaItem[] = [];

    // Linha 0 é o cabeçalho (Item, Título do Recurso, Categoria, Instituição / Órgão, Link de Acesso / URL)
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
      if (parts[1]) {
        const itemNum = parts[0] || `${i}`;
        const titulo = parts[1];
        const categoria = parts[2] || "";
        const orgao = parts[3] || "";
        
        // Verifica se alguma coluna tem URL válida
        const urlEncontrada = parts.find((p) => /^https?:\/\//i.test(p)) || "";
        
        const padrao = REFERENCIAS_PADRAO.find(
          (p) => p.titulo.toLowerCase() === titulo.toLowerCase() || p.item === itemNum
        );

        let linkTexto = parts[4] || "";
        // Se a coluna 4 for a própria URL, gera texto adequado
        if (/^https?:\/\//i.test(linkTexto)) {
          linkTexto = "";
        }

        const urlFinal = urlEncontrada || padrao?.url || "";
        if (!linkTexto) {
          linkTexto = padrao?.linkTexto || (urlFinal.toLowerCase().includes("download") || urlFinal.endsWith(".pdf") ? "Download" : "Acessar Recurso");
        }

        items.push({
          item: itemNum,
          titulo,
          categoria: categoria || padrao?.categoria || "Referência Oficial",
          orgao: orgao || padrao?.orgao || "Órgão Oficial",
          linkTexto,
          url: urlFinal,
          descricao: padrao?.descricao || "Material de referência e apoio pedagógico.",
        });
      }
    }

    return items.length > 0 ? items : REFERENCIAS_PADRAO;
  } catch (err) {
    console.warn("Erro ao buscar referências da planilha, utilizando padrão oficial:", err);
    return REFERENCIAS_PADRAO;
  }
}
