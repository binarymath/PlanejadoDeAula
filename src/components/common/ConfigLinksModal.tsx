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
  RotateCcw,
  Shield,
  FileCheck2,
} from "lucide-react";
import { LessonPlanState } from "../../types/lessonPlan";
import {
  obterConfiguracaoLinks,
  gerarBackupCompleto,
  restaurarBackupCompleto,
} from "../../services/configLinksService";

interface ConfigLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  dadosAtuais: LessonPlanState;
  onRestaurarDados: (novosDados: LessonPlanState) => void;
}

export const ConfigLinksModal: React.FC<ConfigLinksModalProps> = ({
  isOpen,
  onClose,
  dadosAtuais,
  onRestaurarDados,
}) => {
  const [jsonTexto, setJsonTexto] = useState<string>("");
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; mensagem: string } | null>(null);
  const [copiado, setCopiado] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializa o editor com o backup completo do sistema atual
  useEffect(() => {
    if (isOpen) {
      const backup = gerarBackupCompleto(dadosAtuais);
      setJsonTexto(JSON.stringify(backup, null, 2));
      setFeedback(null);
    }
  }, [isOpen, dadosAtuais]);

  if (!isOpen) return null;

  const handleSalvarOuRestaurar = () => {
    try {
      setFeedback(null);
      const parsed = JSON.parse(jsonTexto);
      const resultado = restaurarBackupCompleto(parsed, onRestaurarDados);
      setFeedback({
        tipo: "sucesso",
        mensagem: resultado.mensagem,
      });

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: any) {
      setFeedback({
        tipo: "erro",
        mensagem: `Erro ao processar o arquivo JSON: ${e.message}`,
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
        const parsed = JSON.parse(conteudo);
        setJsonTexto(JSON.stringify(parsed, null, 2));
        const resultado = restaurarBackupCompleto(parsed, onRestaurarDados);
        setFeedback({
          tipo: "sucesso",
          mensagem: `Arquivo "${file.name}" importado e restaurado com sucesso! ✔`,
        });

        setTimeout(() => {
          onClose();
        }, 1500);
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

  const handleBaixarBackup = () => {
    try {
      const backup = gerarBackupCompleto(dadosAtuais);
      const nomeArquivo = `backup-planejamento-${dadosAtuais.componenteCurricular || "aula"}-${
        dadosAtuais.bimestre || "bimestre"
      }.json`
        .toLowerCase()
        .replace(/\s+/g, "-");

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Erro ao gerar download do backup: " + e.message);
    }
  };

  const handleCopiar = () => {
    navigator.clipboard.writeText(jsonTexto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-600 text-white rounded-xl shadow-xs">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Backup e Restauração Completa do Sistema (.JSON)
              </h3>
              <p className="text-xs text-slate-500">
                Salve ou restaure seus links de planilhas, disciplinas e dados pedagógicos em 1 clique
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
                  ? "bg-sky-50 border-sky-200 text-sky-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              {feedback.tipo === "sucesso" ? (
                <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span className="font-semibold">{feedback.mensagem}</span>
            </div>
          )}

          {/* Destaque de Segurança e Instruções */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800">
                <Shield className="w-4 h-4 text-sky-600" />
                <span>Privacidade Pessoal</span>
              </div>
              <p className="text-[11px] text-sky-700 leading-relaxed">
                Sua chave de API do Gemini <strong>nunca</strong> é incluída no JSON, mantendo seu acesso 100% protegido.
              </p>
            </div>

            <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800">
                <FileCheck2 className="w-4 h-4 text-sky-600" />
                <span>Backup Integral</span>
              </div>
              <p className="text-[11px] text-sky-700 leading-relaxed">
                Guarda escola, turmas, feriados, textos gerados, links de planilhas e opções de disciplinas.
              </p>
            </div>

            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800">
                <RotateCcw className="w-4 h-4 text-indigo-600" />
                <span>Restauração Fácil</span>
              </div>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                Mesmo limpando o cache ou trocando de computador, restaure todo o trabalho enviando o arquivo.
              </p>
            </div>
          </div>

          {/* Barra de Ações de Importar e Baixar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Enviar Arquivo .JSON para Restaurar</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopiar}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium border border-slate-200 transition-colors"
                title="Copiar texto JSON"
              >
                {copiado ? <Check className="w-3.5 h-3.5 text-sky-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiado ? "Copiado!" : "Copiar"}</span>
              </button>

              <button
                type="button"
                onClick={handleBaixarBackup}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
                title="Baixar arquivo de backup do sistema atual"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Backup Completo (.JSON)</span>
              </button>
            </div>
          </div>

          {/* Visualizador / Editor JSON */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Visualização do Conteúdo do Backup (JSON):
              </label>
              <span className="text-[11px] text-slate-400">Você pode colar um JSON aqui diretamente</span>
            </div>
            <textarea
              rows={12}
              value={jsonTexto}
              onChange={(e) => setJsonTexto(e.target.value)}
              placeholder="Cole o arquivo JSON de backup aqui..."
              className="w-full px-4 py-3 bg-slate-900 text-sky-400 font-mono text-[11px] rounded-xl border border-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all leading-relaxed"
            />
          </div>
        </div>

        {/* Rodapé com Sincronizar / Restaurar */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleSalvarOuRestaurar}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <Link className="w-3.5 h-3.5" />
            <span>Aplicar e Restaurar Dados</span>
          </button>
        </div>
      </div>
    </div>
  );
};
