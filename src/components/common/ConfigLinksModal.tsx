import React, { useState, useEffect, useRef } from "react";
import {
  X,
  FileJson,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Link,
  Copy,
  Check,
  BookOpen,
} from "lucide-react";
import {
  ConfiguracaoLinksJSON,
  obterConfiguracaoLinks,
  salvarConfiguracaoLinks,
  gerarModeloConfiguracaoAtual,
} from "../../services/configLinksService";

interface ConfigLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  disciplinaAtual?: string;
  onLinksAtualizados?: () => void;
}

export const ConfigLinksModal: React.FC<ConfigLinksModalProps> = ({
  isOpen,
  onClose,
  disciplinaAtual,
  onLinksAtualizados,
}) => {
  const [jsonTexto, setJsonTexto] = useState<string>("");
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; mensagem: string } | null>(null);
  const [copiado, setCopiado] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializa com a configuração atual ou modelo padrão
  useEffect(() => {
    if (isOpen) {
      const configSalva = obterConfiguracaoLinks();
      const modelo = configSalva || gerarModeloConfiguracaoAtual(disciplinaAtual);
      setJsonTexto(JSON.stringify(modelo, null, 2));
      setFeedback(null);
    }
  }, [isOpen, disciplinaAtual]);

  if (!isOpen) return null;

  const handleSalvarTexto = () => {
    try {
      setFeedback(null);
      const parsed: ConfiguracaoLinksJSON = JSON.parse(jsonTexto);

      if (!parsed || typeof parsed !== "object") {
        throw new Error("O conteúdo precisa ser um objeto JSON válido.");
      }

      salvarConfiguracaoLinks(parsed, disciplinaAtual);
      setFeedback({
        tipo: "sucesso",
        mensagem: "Links e disciplinas configurados e sincronizados com sucesso! ✔",
      });

      if (onLinksAtualizados) {
        onLinksAtualizados();
      }

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (e: any) {
      setFeedback({
        tipo: "erro",
        mensagem: `Erro na estrutura do JSON: ${e.message}`,
      });
    }
  };

  const handleCarregarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const conteudo = event.target?.result as string;
        const parsed: ConfiguracaoLinksJSON = JSON.parse(conteudo);
        setJsonTexto(JSON.stringify(parsed, null, 2));
        salvarConfiguracaoLinks(parsed, disciplinaAtual);
        setFeedback({
          tipo: "sucesso",
          mensagem: `Arquivo "${file.name}" importado e sincronizado com sucesso! ✔`,
        });

        if (onLinksAtualizados) {
          onLinksAtualizados();
        }

        setTimeout(() => {
          onClose();
        }, 1400);
      } catch (err: any) {
        setFeedback({
          tipo: "erro",
          mensagem: `Não foi possível ler o arquivo JSON: ${err.message}`,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleBaixarModelo = () => {
    try {
      const modelo = jsonTexto.trim() ? JSON.parse(jsonTexto) : gerarModeloConfiguracaoAtual(disciplinaAtual);
      const blob = new Blob([JSON.stringify(modelo, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "configuracao-planilhas-planejador.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      const modelo = gerarModeloConfiguracaoAtual(disciplinaAtual);
      const blob = new Blob([JSON.stringify(modelo, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "configuracao-planilhas-planejador.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleCopiarExemplo = () => {
    navigator.clipboard.writeText(jsonTexto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Configuração Rápida de Planilhas via .JSON
              </h3>
              <p className="text-xs text-slate-500">
                Cadastre seus links gerais e disciplinas para sincronizar tudo com 1 clique
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                feedback.tipo === "sucesso"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              {feedback.tipo === "sucesso" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span className="font-medium">{feedback.mensagem}</span>
            </div>
          )}

          {/* Dicas e Instruções */}
          <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5 leading-relaxed">
            <p className="font-semibold text-sky-900 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-sky-600" />
              Como funciona o arquivo de links:
            </p>
            <p>
              • Cole ou carregue seu arquivo <strong>.json</strong> com os links das planilhas.
            </p>
            <p>
              • O bloco <code>disciplinas</code> cria automaticamente as opções no seletor da tela <strong>1. Identificação</strong> e conecta a planilha de conteúdos da matéria escolhida.
            </p>
            <p className="text-[11px] text-slate-500">
              * A sua chave de IA do Gemini <strong>não</strong> faz parte deste JSON, garantindo sua privacidade pessoal.
            </p>
          </div>

          {/* Barra de Ações Rápidas */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleCarregarArquivo}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold transition-all shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Carregar arquivo .json</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopiarExemplo}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-medium border border-slate-200 transition-colors"
                title="Copiar texto JSON"
              >
                {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiado ? "Copiado!" : "Copiar JSON"}</span>
              </button>

              <button
                type="button"
                onClick={handleBaixarModelo}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold border border-slate-200 transition-colors shadow-2xs"
                title="Baixar arquivo configuracao-planilhas.json com links atuais"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Modelo / Backup</span>
              </button>
            </div>
          </div>

          {/* Editor de Texto do JSON */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600 uppercase">
              Conteúdo JSON da Configuração:
            </label>
            <textarea
              rows={11}
              value={jsonTexto}
              onChange={(e) => setJsonTexto(e.target.value)}
              placeholder='{\n  "planilhasGerais": { ... },\n  "disciplinas": { ... }\n}'
              className="w-full px-3.5 py-2.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all leading-relaxed"
            />
          </div>
        </div>

        {/* Rodapé com Salvar */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSalvarTexto}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <Link className="w-3.5 h-3.5" />
            <span>Sincronizar Links no Sistema</span>
          </button>
        </div>
      </div>
    </div>
  );
};
