/**
 * Utilitários para conversão e manipulação de imagens e URLs de Logo (incluindo Google Drive).
 */

/**
 * Converte qualquer link de compartilhamento do Google Drive para link direto de imagem.
 * Formatos suportados:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * - https://lh3.googleusercontent.com/d/FILE_ID
 */
export function converterUrlGoogleDrive(url: string): string {
  const urlLimpa = url.trim();
  if (!urlLimpa) return "";

  // 1. Padrão: /file/d/ID/...
  const matchFileD = urlLimpa.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) {
    return `https://drive.google.com/thumbnail?id=${matchFileD[1]}&sz=w1000`;
  }

  // 2. Padrão: id=ID ou open?id=ID ou uc?id=ID
  const matchIdParam = urlLimpa.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam && matchIdParam[1]) {
    return `https://drive.google.com/thumbnail?id=${matchIdParam[1]}&sz=w1000`;
  }

  // 3. Padrão: lh3.googleusercontent.com/d/ID
  const matchLh3 = urlLimpa.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (matchLh3 && matchLh3[1]) {
    return `https://drive.google.com/thumbnail?id=${matchLh3[1]}&sz=w1000`;
  }

  return urlLimpa;
}

/**
 * Converte uma URL de imagem (ou Google Drive, ou link web comum) para Base64 Data URI
 * utilizando HTML Image e Canvas para evitar restrições de CORS direto de fetch quando possível.
 */
export async function urlParaBase64(url: string): Promise<string> {
  const directUrl = converterUrlGoogleDrive(url);
  if (!directUrl) return "";

  // Se já for data URI, retorna imediatamente
  if (directUrl.startsWith("data:image/")) {
    return directUrl;
  }

  // 1. Tenta carregar via HTML Image element com crossOrigin anonymous
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Não foi possível criar contexto 2D para a imagem.");
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        resolve(dataUrl);
      } catch (err) {
        // Se falhar (ex: taint de canvas por CORS restrito), tenta via fetch ou fallback
        tentarFetchDireto(directUrl).then(resolve).catch(reject);
      }
    };

    img.onerror = () => {
      // Se falhar o carregamento via tag Image, tenta fetch direto
      tentarFetchDireto(directUrl).then(resolve).catch(reject);
    };

    img.src = directUrl;
  });
}

async function tentarFetchDireto(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Falha HTTP ${response.status}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err: any) {
    throw new Error(
      "Não foi possível converter a imagem. Certifique-se de que o arquivo no Google Drive esteja com o compartilhamento definido para 'Qualquer pessoa com o link'."
    );
  }
}
