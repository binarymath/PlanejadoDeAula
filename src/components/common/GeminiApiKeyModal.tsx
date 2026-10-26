import React, { useState, useEffect } from "react";
import {
  X,
  Key,
  ShieldCheck,
  ExternalLink,
  Check,
  Trash2,
  Lock,
  Sparkles,
  HelpCircle,
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
      setErroMsg("Por favor, cole a sua chave de API antes de salvar.");
      return;
    }

    salvarGeminiApiKey(limpa);
    setChaveAtual(limpa);
    setSalvoFeedback(true);
    setErroMsg("");
    if (onKeyChange) onKeyChange(limpa);
    setTimeout(() => {
      setSalvoFeedback(false);
    }, 3000);
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
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal Clean */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 leading-tight">
                Chave da API do Google Gemini
              </h3>
              <p className="text-xs text-slate-500">
                Assistente de Inteligência Artificial para Cronograma e Avaliação
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Card explicativo amigável para usuários leigos */}
          <div className="p-4 bg-sky-50/60 border border-sky-100 rounded-xl space-y-2.5">
            <div className="flex items-center gap-2 text-sky-900 font-semibold text-xs">
              <Sparkles className="w-4 h-4 text-sky-600 flex-shrink-0" />
              <span>O que é e para que serve esta chave?</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              O <strong>Google Gemini</strong> é a Inteligência Artificial do Google que ajuda a montar o seu <em>Cronograma de Aulas</em> e gerar as <em>10 Questões Graduais de Avaliação</em>.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              A chave funciona como uma "senha pessoal de autorização" fornecida pelo Google para que o sistema possa conversar com a IA gratuitamente em seu nome.
            </p>
          </div>

          {/* Aviso de Privacidade e Chave Pessoal */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-900">
                Sua Chave é Pessoal, Gratuita e Segura
              </h4>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Cada professor utiliza sua própria chave pessoal. Ela fica gravada <strong>exclusivamente na memória deste seu navegador de internet</strong> (localStorage). Ela <em>nunca é compartilhada</em>, nem entra no arquivo Word (.docx), nem é enviada para servidores de terceiros.
              </p>
            </div>
          </div>

          {/* Como obter a chave em 3 passos simples */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              Como obter a sua chave gratuita:
            </h4>
            <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4 leading-relaxed">
              <li>
                Acesse o site oficial{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sky-600 hover:text-sky-700 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>Google AI Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>{" "}
                com a sua conta Google.
              </li>
              <li>Clique no botão azul <strong>"Create API key"</strong> (Criar chave de API).</li>
              <li>Copie o código gerado (que começa com <code>AIzaSy...</code>) e cole no campo abaixo.</li>
            </ol>
          </div>

          {/* Formulário de inserção da Chave */}
          <form onSubmit={handleSalvar} className="space-y-3 pt-1">
            <label className="block text-xs font-bold text-slate-700">
              Cole sua Chave de API aqui:
            </label>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={inputChave}
                onChange={(e) => {
                  setInputChave(e.target.value);
                  if (erroMsg) setErroMsg("");
                }}
                placeholder="Exemplo: AIzaSyD-..."
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
              />
              {chaveAtual && chaveAtual === inputChave.trim() && (
                <div
                  title="Chave sincronizada e ativa"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-600"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}
            </div>

            {erroMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{erroMsg}</span>
              </div>
            )}

            {salvoFeedback && (
              <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-lg flex items-center gap-2 text-xs text-sky-800 font-medium">
                <Check className="w-4 h-4 text-sky-600 stroke-[3]" />
                <span>Chave de API salva com sucesso no seu navegador!</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2">
              {chaveAtual ? (
                <button
                  type="button"
                  onClick={handleRemover}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover Chave</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400">Nenhuma chave configurada ainda</span>
              )}

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar Chave</span>
              </button>
            </div>
          </form>
        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
