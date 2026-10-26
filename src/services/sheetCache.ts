import type { PlanilhaParseada } from "./xlsxParse";
import type { XlsxWorkerRequest, XlsxWorkerResponse } from "../workers/xlsxWorker";

export type { PlanilhaParseada } from "./xlsxParse";

/**
 * Cache compartilhado de planilhas:
 * 1. Memória: retorno instantâneo dentro da mesma sessão.
 * 2. Deduplicação: chamadas simultâneas para a mesma URL compartilham um único download.
 * 3. IndexedDB: após recarregar a página, os dados aparecem na hora (stale-while-revalidate),
 *    e uma atualização silenciosa é feita em segundo plano quando o cache está "velho".
 * 4. Web Worker: download + parse do XLSX fora da thread principal (a interface não congela).
 */

interface EntradaCache extends PlanilhaParseada {
  url: string;
  ts: number;
}

/** Após esse tempo, o dado salvo ainda é exibido, mas é revalidado em segundo plano. */
const TEMPO_REVALIDACAO_MS = 2 * 60 * 1000;
/** Após esse tempo, o dado salvo é descartado e um novo download é obrigatório. */
const TEMPO_EXPIRACAO_MS = 7 * 24 * 60 * 60 * 1000;

const DB_NOME = "planejador-planilhas";
const DB_STORE = "planilhas";
const DB_VERSAO = 1;

const memoria = new Map<string, EntradaCache>();
const emAndamento = new Map<string, Promise<EntradaCache>>();

// ---------------------------------------------------------------------------
// IndexedDB (falhas são silenciosas: o app funciona normalmente sem persistência)
// ---------------------------------------------------------------------------
let dbPromise: Promise<IDBDatabase | null> | null = null;

function abrirDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NOME, DB_VERSAO);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE, { keyPath: "url" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

async function lerDb(url: string): Promise<EntradaCache | null> {
  const db = await abrirDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get(url);
      req.onsuccess = () => resolve((req.result as EntradaCache) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function salvarDb(entrada: EntradaCache): Promise<void> {
  const db = await abrirDb();
  if (!db) return;
  try {
    db.transaction(DB_STORE, "readwrite").objectStore(DB_STORE).put(entrada);
  } catch (err) {
    console.warn("Não foi possível persistir a planilha no cache local:", err);
  }
}

// ---------------------------------------------------------------------------
// Web Worker (com fallback para a thread principal caso não esteja disponível)
// ---------------------------------------------------------------------------
let worker: Worker | null = null;
let workerIndisponivel = false;
let proximoId = 1;
const pendentes = new Map<number, { resolve: (p: PlanilhaParseada) => void; reject: (e: Error) => void }>();

function obterWorker(): Worker | null {
  if (workerIndisponivel) return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("../workers/xlsxWorker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (ev: MessageEvent<XlsxWorkerResponse>) => {
      const { id, ok, error, sheetNames, sheets } = ev.data;
      const p = pendentes.get(id);
      if (!p) return;
      pendentes.delete(id);
      if (ok && sheetNames && sheets) p.resolve({ sheetNames, sheets });
      else p.reject(new Error(error || "Falha ao processar a planilha."));
    };
    worker.onerror = (ev) => {
      console.warn("Worker de planilhas falhou; usando processamento na thread principal.", ev);
      workerIndisponivel = true;
      worker?.terminate();
      worker = null;
      pendentes.forEach((p) => p.reject(new Error("__worker_falhou__")));
      pendentes.clear();
    };
    return worker;
  } catch {
    workerIndisponivel = true;
    return null;
  }
}

async function baixarNaThreadPrincipal(url: string): Promise<PlanilhaParseada> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Falha ao conectar à planilha. Status: ${resp.status}`);
  }
  // Carregado sob demanda: mantém a biblioteca XLSX fora do bundle inicial
  const { parseWorkbookBuffer } = await import("./xlsxParse");
  return parseWorkbookBuffer(await resp.arrayBuffer());
}

async function baixarEProcessar(url: string): Promise<PlanilhaParseada> {
  const w = obterWorker();
  if (!w) return baixarNaThreadPrincipal(url);
  try {
    return await new Promise<PlanilhaParseada>((resolve, reject) => {
      const id = proximoId++;
      pendentes.set(id, { resolve, reject });
      w.postMessage({ id, url } satisfies XlsxWorkerRequest);
    });
  } catch (err: any) {
    if (err?.message === "__worker_falhou__") return baixarNaThreadPrincipal(url);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------
function buscarDaRede(url: string): Promise<EntradaCache> {
  const existente = emAndamento.get(url);
  if (existente) return existente;

  const promessa = baixarEProcessar(url)
    .then((parsed) => {
      const entrada: EntradaCache = { url, ts: Date.now(), ...parsed };
      memoria.set(url, entrada);
      void salvarDb(entrada);
      return entrada;
    })
    .finally(() => emAndamento.delete(url));

  emAndamento.set(url, promessa);
  return promessa;
}

function revalidarEmSegundoPlano(entrada: EntradaCache) {
  if (Date.now() - entrada.ts < TEMPO_REVALIDACAO_MS) return;
  buscarDaRede(entrada.url).catch((err) =>
    console.warn("Atualização em segundo plano da planilha falhou:", err)
  );
}

/**
 * Obtém a planilha já convertida em linhas (por aba), usando cache em memória, IndexedDB
 * e deduplicação de downloads. Use `forcar: true` para ignorar o cache.
 */
export async function obterPlanilha(
  url: string,
  opcoes: { forcar?: boolean } = {}
): Promise<PlanilhaParseada> {
  const alvo = (url || "").trim();
  if (!alvo) throw new Error("Nenhum endereço de planilha informado.");

  if (opcoes.forcar) return buscarDaRede(alvo);

  const emMemoria = memoria.get(alvo);
  if (emMemoria) {
    revalidarEmSegundoPlano(emMemoria);
    return emMemoria;
  }

  // Se já há um download em andamento, aproveita-o em vez de consultar o IndexedDB
  const andamento = emAndamento.get(alvo);
  if (andamento) return andamento;

  const salvo = await lerDb(alvo);
  if (salvo && Date.now() - salvo.ts < TEMPO_EXPIRACAO_MS) {
    // Outra chamada pode ter preenchido a memória enquanto lia o IndexedDB
    const atual = memoria.get(alvo) || salvo;
    memoria.set(alvo, atual);
    revalidarEmSegundoPlano(atual);
    return atual;
  }

  return buscarDaRede(alvo);
}

/** Retorna as linhas brutas (header: 1) de uma aba; vazio se a aba não existir. */
export function linhasDaAba(planilha: PlanilhaParseada, aba: string): any[][] {
  return planilha.sheets[aba] || [];
}

/**
 * Converte linhas brutas em objetos usando a primeira linha não vazia como cabeçalho
 * (equivalente a XLSX.utils.sheet_to_json(ws, { defval: "" })).
 */
export function linhasParaObjetos(linhas: any[][]): Record<string, any>[] {
  const inicio = linhas.findIndex((l) => l && l.some((c) => String(c ?? "").trim() !== ""));
  if (inicio < 0) return [];

  const usados = new Map<string, number>();
  const chaves = linhas[inicio].map((c) => {
    const base = String(c ?? "").trim() === "" ? "__EMPTY" : String(c);
    const n = usados.get(base) || 0;
    usados.set(base, n + 1);
    return n === 0 ? base : `${base}_${n}`;
  });

  const resultado: Record<string, any>[] = [];
  for (let i = inicio + 1; i < linhas.length; i++) {
    const linha = linhas[i] || [];
    if (!linha.some((c) => String(c ?? "").trim() !== "")) continue; // ignora linhas em branco
    const obj: Record<string, any> = {};
    chaves.forEach((k, j) => {
      obj[k] = linha[j] ?? "";
    });
    resultado.push(obj);
  }
  return resultado;
}
