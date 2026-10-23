import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import { LessonPlanState } from "../types/lessonPlan";
import { getBimesterTitles } from "../utils/bimesterHelper";

/**
 * Converte data URI em Uint8Array
 */
function dataURItoUint8Array(dataURI: string): Uint8Array {
  const parts = dataURI.split(",");
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return array;
}

/**
 * Gera e realiza o download do arquivo .docx final preenchido.
 * - Cabeçalho: só é exibido se houver Logo da Escola enviado.
 * - Se não houver logo, o cabeçalho fica completamente vazio e o documento inicia na tabela.
 */
export async function generateAndDownloadDocx(data: LessonPlanState, customFileName?: string) {
  try {
    // 1. Carrega o template preparado contendo os marcadores
    const response = await fetch("/template_preparado.docx");
    if (!response.ok) {
      throw new Error("Não foi possível carregar o arquivo modelo 'template_preparado.docx'.");
    }

    const content = await response.arrayBuffer();
    const zip = new PizZip(content);

    const hasLogo = Boolean(data.logoEscolaBase64 && data.logoEscolaBase64.startsWith("data:image/"));

    // 2. Se houver logo, injeta na mídia; caso contrário, usa pixel transparente
    if (hasLogo) {
      try {
        const imgBytes = dataURItoUint8Array(data.logoEscolaBase64);
        zip.file("word/media/image1.jpeg", imgBytes);
      } catch (e) {
        console.warn("Falha ao injetar logo da escola:", e);
      }
    } else {
      try {
        const transRes = await fetch("/transparent.png");
        if (transRes.ok) {
          const transBytes = await transRes.arrayBuffer();
          zip.file("word/media/image1.jpeg", transBytes);
        }
      } catch (e) {
        console.warn("Falha ao aplicar imagem transparente:", e);
      }
    }

    // 3. Inicializa o docxtemplater com suporte a quebra de linha (\n)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const bimesterTitles = getBimesterTitles(data.bimestre);

    let bimestreFormatado = data.bimestre || "1º Bimestre";
    if (data.dataInicioBimestre || data.dataFimBimestre) {
      const formatBR = (d?: string) => {
        if (!d) return "__/__/____";
        const [y, m, day] = d.split("-");
        return y && m && day ? `${day}/${m}/${y}` : d;
      };
      bimestreFormatado += ` (Período: ${formatBR(data.dataInicioBimestre)} até ${formatBR(data.dataFimBimestre)})`;
    }

    // 4. Formata os dados para o template
    const renderData = {
      // Títulos dinâmicos conforme o bimestre selecionado
      tituloSecaoRecuperacao: bimesterTitles.tituloRecuperacao,
      tituloSecaoConteudos: bimesterTitles.tituloConteudos,

      headerEscolaBlock: hasLogo ? (data.nomeEscola || "").trim() : "",
      nomeEscola: data.nomeEscola || "EE PROF. MARCO ANTÔNIO MENCACCI",
      nomeProfessor: data.nomeProfessor || "_______________________________",
      componenteCurricular: data.componenteCurricular || "___________________",
      anoEscolar: data.anoEscolar || "__________",
      bimestre: bimestreFormatado,
      aulasPrevistas: data.aulasPrevistas || "____",
      controleFrequencia: data.controleFrequencia || "Acompanhamento diário no Diário Digital (SED)",
      aprendizagensNaoConsolidadas: data.aprendizagensNaoConsolidadas || "Não informado.",
      objetosConhecimento: data.objetosConhecimento || "Não informado.",
      competenciasSocioemocionais: data.competenciasSocioemocionais || "Não informado.",
      cronograma: data.cronograma || "Não informado.",
      metodologiaAtiva: data.metodologiaAtiva || "Não informado.",
      criterioAvaliacao: data.criterioAvaliacao || "Não informado.",
      referenciasApoio: data.referenciasApoio || "Não informado.",
    };

    // 5. Executa a substituição dos dados
    doc.render(renderData);

    // 6. Gera o blob final do Word
    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    // 7. Define o nome do arquivo final
    const professorSanitized = (data.nomeProfessor || "Professor").replace(/[^a-zA-Z0-9]/g, "_");
    const materiaSanitized = (data.componenteCurricular || "Materia").replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = customFileName || `GUIA_BIMESTRAL_${materiaSanitized}_${professorSanitized}.docx`;

    // 8. Dispara o download no navegador
    saveAs(out, fileName);
    return true;
  } catch (error) {
    console.error("Erro ao gerar o documento DOCX:", error);
    throw error;
  }
}
