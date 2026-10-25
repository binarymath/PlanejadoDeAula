export interface NotebookLMCardItem {
  id: string;
  titulo: string;
  link: string;
  descricao: string;
  categoria: string;
  cor: "azul" | "roxo" | "verde" | "amarelo" | "rosa" | "cinza";
  rotacao: string; // Efeito orgânico de adesivo (ex: -rotate-1, rotate-1)
}

const ROTATION_PATTERNS = [
  "-rotate-1 hover:rotate-0",
  "rotate-1 hover:rotate-0",
  "-rotate-0.5 hover:rotate-0",
  "rotate-0.5 hover:rotate-0",
  "rotate-0 hover:rotate-0",
];

function normalizarCor(corStr?: string): "azul" | "roxo" | "verde" | "amarelo" | "rosa" | "cinza" {
  const c = (corStr || "").toLowerCase().trim();
  if (c.includes("roxo") || c.includes("purple") || c.includes("violet")) return "roxo";
  if (c.includes("verd") || c.includes("green")) return "verde";
  if (c.includes("amar") || c.includes("yellow") || c.includes("orange") || c.includes("laranja")) return "amarelo";
  if (c.includes("ros") || c.includes("pink") || c.includes("vermelh") || c.includes("red")) return "rosa";
  if (c.includes("cinz") || c.includes("gray") || c.includes("slate")) return "cinza";
  return "azul";
}

/**
 * Lê e analisa o arquivo public/notebooklm_links.txt
 */
export async function carregarNotebookLMLinks(): Promise<NotebookLMCardItem[]> {
  try {
    // Adiciona timestamp para evitar cache durante edições locais
    const response = await fetch(`/notebooklm_links.txt?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Não foi possível carregar o arquivo notebooklm_links.txt (HTTP ${response.status})`);
    }

    const texto = await response.text();
    const linhas = texto.split(/\r?\n/);
    const itens: NotebookLMCardItem[] = [];

    linhas.forEach((linha, idx) => {
      const limpa = linha.trim();
      // Ignora comentários e linhas vazias
      if (!limpa || limpa.startsWith("#")) return;

      const partes = limpa.split("|").map((p) => p.trim());
      if (partes.length < 2) return;

      const titulo = partes[0] || `Caderno ${itens.length + 1}`;
      let link = partes[1] || "https://notebooklm.google.com";
      if (!link.startsWith("http://") && !link.startsWith("https://")) {
        link = `https://${link}`;
      }

      const descricao = partes[2] || "Acesse materiais de estudo, roteiros didáticos e perguntas geradas no Gemini Notebook.";
      const categoria = partes[3] || "Gemini Notebook";
      const cor = normalizarCor(partes[4]);
      const rotacao = ROTATION_PATTERNS[itens.length % ROTATION_PATTERNS.length];

      itens.push({
        id: `card-${idx}-${Date.now()}`,
        titulo,
        link,
        descricao,
        categoria,
        cor,
        rotacao,
      });
    });

    return itens;
  } catch (error) {
    console.warn("Erro ao ler notebooklm_links.txt:", error);
    return [];
  }
}
