export interface AvaliacaoItem {
  criterio: string;
  peso: string;
  percentual: number; // ex: 40, 20
  descricao?: string;
  instrumento?: string;
}

export const AVALIACAO_SHEET_ID = "";

export const AVALIACOES_PADRAO: AvaliacaoItem[] = [
  {
    criterio: "Prova Paulista",
    peso: "40%",
    percentual: 40,
    descricao: "Avaliação externa diagnóstica e somativa aplicada pela SEDUC-SP em formato digital.",
    instrumento: "Plataforma Prova Paulista (CMSP / SED)"
  },
  {
    criterio: "Avaliação Interna",
    peso: "20%",
    percentual: 20,
    descricao: "Avaliação escrita / prática bimestral elaborada pelo professor com foco nas habilidades essenciais trabalhadas no bimestre.",
    instrumento: "Prova escrita bimestral com questões discursivas e de múltipla escolha"
  },
  {
    criterio: "Tarefas",
    peso: "20%",
    percentual: 20,
    descricao: "Resolução contínua de atividades, tarefas de sala de aula e tarefas no aplicativo CMSP / Sala de Aula.",
    instrumento: "Plataforma CMSP Tarefas e cadernos/produções em sala de aula"
  },
  {
    criterio: "Engajamento",
    peso: "20%",
    percentual: 20,
    descricao: "Participação ativa nas dinâmicas, pontualidade, colaboração em grupo, respeito às regras de convivência e autoavaliação.",
    instrumento: "Rubrica de acompanhamento contínuo e diário de engajamento discente"
  }
];

export async function fetchAvaliacaoPlanilha(customUrl?: string): Promise<AvaliacaoItem[]> {
  let url = customUrl || (AVALIACAO_SHEET_ID ? `https://docs.google.com/spreadsheets/d/${AVALIACAO_SHEET_ID}/export?format=csv` : "");
  if (!url) {
    return [];
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
    
    // Parse do CSV simples
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) return AVALIACOES_PADRAO;

    const items: AvaliacaoItem[] = [];
    // Linha 0 é o cabeçalho (Critério, Peso)
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map(p => p.trim().replace(/^"|"$/g, ""));
      if (parts[0]) {
        const criterio = parts[0];
        const peso = parts[1] || "";
        const numMatch = peso.match(/(\d+)/);
        const percentual = numMatch ? parseInt(numMatch[1], 10) : 0;
        
        // Complemento descritivo enriquecido conforme diretrizes pedagógicas SEDUC
        const padrao = AVALIACOES_PADRAO.find(p => p.criterio.toLowerCase() === criterio.toLowerCase());

        items.push({
          criterio,
          peso: peso.includes("%") ? peso : `${peso}%`,
          percentual,
          descricao: padrao?.descricao || "Avaliação contínua das competências e habilidades curriculares.",
          instrumento: padrao?.instrumento || "Instrumento avaliativo pedagógico institucional."
        });
      }
    }

    return items.length > 0 ? items : AVALIACOES_PADRAO;
  } catch (err) {
    console.warn("Utilizando catálogo padrão de avaliação (offline/fallback):", err);
    return AVALIACOES_PADRAO;
  }
}
