/**
 * Retorna os títulos dinâmicos das seções 2 e 3 com base no bimestre selecionado.
 */
export function getBimesterTitles(bimestre: string) {
  const b = bimestre || "1º Bimestre";

  if (b.includes("1")) {
    return {
      tituloRecuperacao: "Aprendizagens Essenciais não consolidadas do ano anterior",
      tituloConteudos: "Objetos de Conhecimento/ Unidade Temática do 1º bimestre",
      abaRecuperacao: "2. Aprendizagens Ano Anterior",
      abaConteudos: "3. Objetos 1º Bim.",
    };
  }

  if (b.includes("2")) {
    return {
      tituloRecuperacao: "Aprendizagens Essenciais não consolidadas do 1º bimestre",
      tituloConteudos: "Objetos de Conhecimento/ Unidade Temática do 2º bimestre",
      abaRecuperacao: "2. Aprendizagens 1º Bim.",
      abaConteudos: "3. Objetos 2º Bim.",
    };
  }

  if (b.includes("3")) {
    return {
      tituloRecuperacao: "Aprendizagens Essenciais não consolidadas do 2º bimestre",
      tituloConteudos: "Objetos de Conhecimento/ Unidade Temática do 3º bimestre",
      abaRecuperacao: "2. Aprendizagens 2º Bim.",
      abaConteudos: "3. Objetos 3º Bim.",
    };
  }

  // Padrão 4º Bimestre
  return {
    tituloRecuperacao: "Aprendizagens Essenciais não consolidadas do 3º bimestre",
    tituloConteudos: "Objetos de Conhecimento/ Unidade Temática do 4º bimestre",
    abaRecuperacao: "2. Aprendizagens 3º Bim.",
    abaConteudos: "3. Objetos 4º Bim.",
  };
}
