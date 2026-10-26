import { parseWorkbookBuffer, PlanilhaParseada } from "../services/xlsxParse";

/**
 * Web Worker responsável por baixar e converter planilhas XLSX fora da thread principal,
 * evitando que a interface congele enquanto o arquivo é processado.
 */
export interface XlsxWorkerRequest {
  id: number;
  url: string;
}

export interface XlsxWorkerResponse extends Partial<PlanilhaParseada> {
  id: number;
  ok: boolean;
  error?: string;
}

// Tipagem mínima do escopo do worker (evita conflito entre as libs "DOM" e "WebWorker" no tsconfig)
const ctx = self as unknown as {
  onmessage: ((ev: MessageEvent<XlsxWorkerRequest>) => void) | null;
  postMessage: (msg: XlsxWorkerResponse) => void;
};

ctx.onmessage = async (ev: MessageEvent<XlsxWorkerRequest>) => {
  const { id, url } = ev.data;
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Falha ao conectar à planilha. Status: ${resp.status}`);
    }
    const buffer = await resp.arrayBuffer();
    const parsed = parseWorkbookBuffer(buffer);
    ctx.postMessage({ id, ok: true, ...parsed });
  } catch (err: any) {
    ctx.postMessage({ id, ok: false, error: err?.message || String(err) });
  }
};
