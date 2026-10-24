import React, { useState } from "react";
import { Table, RefreshCw, CheckCircle2, AlertCircle, Link } from "lucide-react";
import { SheetConfig } from "../../config/spreadsheets";
import { fetchSpreadsheetData, formatRowsToText } from "../../services/spreadsheetReader";

interface SpreadsheetConnectorProps {
  config: SheetConfig;
  onImportData: (extractedText: string, rawData: Record<string, any>[]) => void;
}

export const SpreadsheetConnector: React.FC<SpreadsheetConnectorProps> = ({
  config,
  onImportData,
}) => {
  const [currentUrl, setCurrentUrl] = useState(config.spreadsheetUrl || "");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const handleSync = async () => {
    if (!currentUrl.trim()) {
      setStatus("error");
      setMessage("Insira o link da planilha no campo acima para conectar.");
      return;
    }

    try {
      setLoading(true);
      setStatus("idle");
      setMessage("Conectando e lendo a planilha...");

      const rows = await fetchSpreadsheetData(currentUrl, config.sheetTabName);

      if (rows.length === 0) {
        setStatus("error");
        setMessage("A planilha foi lida, mas nenhuma linha ou dado foi encontrado.");
        setLoading(false);
        return;
      }

      const formatted = formatRowsToText(rows);
      onImportData(formatted, rows);

      setPreviewCount(rows.length);
      setStatus("success");
      setMessage(`${rows.length} linhas importadas com sucesso da planilha!`);
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err.message || "Erro ao conectar à planilha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-4 text-xs">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <Table className="w-4 h-4 text-sky-600" />
          <span>Fonte da Planilha ({config.moduleName})</span>
        </div>
      </div>

      <p className="text-slate-500 mb-2 leading-relaxed">
        {config.description}
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            <Link className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            placeholder="Cole aqui o link da planilha Google..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono text-[11px]"
          />
        </div>

        <button
          type="button"
          onClick={handleSync}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 text-white font-medium rounded transition-colors whitespace-nowrap"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Sincronizando..." : "Sincronizar Planilha"}
        </button>
      </div>

      {status === "success" && (
        <div className="flex items-center gap-1.5 text-emerald-600 mt-2 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-1.5 text-rose-600 mt-2 font-medium">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
};
