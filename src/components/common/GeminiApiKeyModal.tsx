import React, { useState, useEffect } from "react";
import {
  X,
  Key,
  ExternalLink,
  Check,
  Trash2,
  Lock,
  AlertCircle,
} from "lucide-react";
import {
  obterGeminiApiKey,
  salvarGeminiApiKey,
} from "../../services/geminiScheduleService";

interface GeminiApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyChange?: (novaKey: string) => void;
}

export const GeminiApiKeyModal: React.FC<GeminiApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeyChange,
}) => {
  const [chaveAtual, setChaveAtual] = useState<string>("");
  const [inputChave, setInputChave] = useState<string>("");
  const [salvoFeedback, setSalvoFeedback] = useState<boolean>(false);
  const [erroMsg, setErroMsg] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      const key = obterGeminiApiKey();
      setChaveAtual(key);
      setInputChave(key);
      setSalvoFeedback(false);
      setErroMsg("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSalvar = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const limpa = inputChave.trim();
    if (!limpa) {
      setErroMsg("Cole sua chave de API antes de salvar.");
      return;
    }

    salvarGeminiApiKey(limpa);
    setChaveAtual(limpa);
    setSalvoFeedback(true);
    setErroMsg("");
    if (onKeyChange) onKeyChange(limpa);
    setTimeout(() => {
      setSalvoFeedback(false);
    }, 2500);
  };

  const handleRemover = () => {
    salvarGeminiApiKey("");
    setChaveAtual("");
    setInputChave("");
    setSalvoFeedback(false);
    setErroMsg("");
    if (onKeyChange) onKeyChange("");
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 print:hidden"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho Discreto */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white text-sky-600 rounded-lg border border-slate-200">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 leading-tight">
                Chave da API Google Gemini
              </h3>
              <p className="text-[11px] text-slate-500">
                Habilita o assistente de IA no Cronograma e Sugestão de Avaliação
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo Clean e Direto */}
        <form onSubmit={handleSalvar} className="p-5 space-y-4">
          {/* Instrução Concisa */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">
                Como obter sua chave gratuita:
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-sky-600 hover:text-sky-700 hover:underline inline-flex items-center gap-1 text-[11px]"
              >
                <span>Abrir Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Acesse o link acima com sua conta Google, clique em{" "}
              <strong className="text-slate-700">Create API key</strong> e cole o código gerado (iniciado por{" "}
              <code className="text-slate-700 bg-white px-1 py-0.5 rounded border border-slate-200">
                AIzaSy...
              </code>
              ) abaixo.
            </p>
          </div>

          {/* Campo da Chave */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Chave de API:
              </label>
              <span className="text-[11px] text-slate-400">
                {chaveAtual ? "Configurada neste navegador" : "Não configurada"}
              </span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                type="password"
                value={inputChave}
                onChange={(e) => {
                  setInputChave(e.target.value);
                  if (erroMsg) setErroMsg("");
                }}
                placeholder="AIzaSy..."
                className="w-full pl-8 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
              />
              {chaveAtual && chaveAtual === inputChave.trim() && (
                <div
                  title="Chave ativa"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sky-600"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-snug">
              Armazenada apenas localmente neste navegador. Nunca é incluída nos arquivos exportados.
            </p>
          </div>

          {erroMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{erroMsg}</span>
            </div>
          )}

          {salvoFeedback && (
            <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-lg flex items-center gap-2 text-xs text-sky-800 font-medium">
              <Check className="w-3.5 h-3.5 text-sky-600 stroke-[2.5]" />
              <span>Chave salva com sucesso.</span>
            </div>
          )}

          {/* Rodapé Integrado de Ações */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            {chaveAtual ? (
              <button
                type="button"
                onClick={handleRemover}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Fechar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar Chave</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
