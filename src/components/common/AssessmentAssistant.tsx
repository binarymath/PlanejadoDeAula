import React, { useState } from "react";
import {
  Sparkles,
  Award,
  Printer,
  Copy,
  Check,
  RefreshCw,
  Eye,
  Key,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { LessonPlanState } from "../../types/lessonPlan";
import {
  AvaliacaoDiagnosticaGerada,
  gerarSugestaoAvaliacaoGradual,
} from "../../services/geminiAssessmentService";
import {
  obterGeminiApiKey,
  salvarGeminiApiKey,
} from "../../services/geminiScheduleService";

interface AssessmentAssistantProps {
  data: LessonPlanState;
}

export const AssessmentAssistant: React.FC<AssessmentAssistantProps> = ({ data }) => {
  const [apiKey, setApiKey] = useState<string>(() => obterGeminiApiKey());
  const [inputKey, setInputKey] = useState<string>(() => obterGeminiApiKey());
  const [mostrarConfigKey, setMostrarConfigKey] = useState<boolean>(!obterGeminiApiKey());
  const [instrucaoExtra, setInstrucaoExtra] = useState<string>("");
  const [carregando, setCarregando] = useState<boolean>(false);
  const [erro, setErro] = useState<string>("");
  const [avaliacao, setAvaliacao] = useState<AvaliacaoDiagnosticaGerada | null>(null);
  const [modoVisualizacao, setModoVisualizacao] = useState<"professor" | "aluno">("professor");
  const [copiado, setCopiado] = useState<boolean>(false);
  const [painelAberto, setPainelAberto] = useState<boolean>(false);

  // Salvar Chave
  const handleSalvarKey = () => {
    const limpa = inputKey.trim();
    salvarGeminiApiKey(limpa);
    setApiKey(limpa);
    setMostrarConfigKey(false);
    setErro("");
  };

  // Gerar Avaliação
  const handleGerar = async () => {
    const textoAprendizagens = data.aprendizagensNaoConsolidadas || "";
    if (!textoAprendizagens.trim()) {
      setErro("Selecione ou insira pelo menos uma Aprendizagem Não Consolidada acima para poder gerar a avaliação.");
      return;
    }

    try {
      setCarregando(true);
      setErro("");
      const res = await gerarSugestaoAvaliacaoGradual({
        apiKey,
        plano: data,
        aprendizagensNaoConsolidadas: textoAprendizagens,
        instrucoesPersonalizadas: instrucaoExtra,
      });
      setAvaliacao(res);
      setPainelAberto(true);
    } catch (err: any) {
      console.error("Erro ao gerar sugestão de avaliação:", err);
      setErro(err.message || "Erro ao conectar com a API do Gemini. Verifique a chave ou tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  // Copiar Texto Formatado
  const handleCopiarTexto = () => {
    if (!avaliacao) return;

    let texto = `========================================================\n`;
    texto += `${avaliacao.titulo.toUpperCase()}\n`;
    texto += `Componente: ${avaliacao.componenteCurricular} | Ano: ${avaliacao.anoEscolar}\n`;
    if (modoVisualizacao === "aluno") {
      texto += `Nome do Aluno(a): __________________________________ Data: ____/____/________\n`;
      texto += `Turma: ______________\n`;
    }
    texto += `========================================================\n\n`;

    avaliacao.questoes.forEach((q) => {
      texto += `QUESTÃO ${q.numero} [${q.nivelRotulo}]\n`;
      if (modoVisualizacao === "professor") {
        texto += `Habilidade: ${q.habilidadeOuDescritor}\n`;
      }
      texto += `${q.enunciado}\n\n`;

      if (q.alternativas && q.alternativas.length > 0) {
        q.alternativas.forEach((alt) => {
          texto += `( ${alt.letra} ) ${alt.texto}\n`;
        });
        texto += `\n`;
      } else {
        texto += `Resposta: ____________________________________________________________________\n\n`;
      }

      if (modoVisualizacao === "professor") {
        texto += `>> GABARITO: ${q.respostaEsperadaOuGabarito}\n`;
        texto += `>> JUSTIFICATIVA PEDAGÓGICA: ${q.justificativaPedagogica}\n\n`;
        texto += `--------------------------------------------------------\n\n`;
      }
    });

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  // Imprimir Avaliação em Janela Separada (não mistura com o plano oficial)
  const handleImprimirEmSeparado = () => {
    if (!avaliacao) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Por favor, permita pop-ups para imprimir a avaliação.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${avaliacao.titulo}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #111827;
            margin: 20mm;
            line-height: 1.4;
            font-size: 11pt;
          }
          .header {
            border: 1px solid #374151;
            padding: 10px 15px;
            margin-bottom: 20px;
            border-radius: 4px;
          }
          .header h1 {
            font-size: 14pt;
            margin: 0 0 6px 0;
            text-align: center;
            text-transform: uppercase;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 8px;
            font-size: 10pt;
          }
          .student-line {
            margin-top: 10px;
            border-top: 1px dashed #9ca3af;
            padding-top: 8px;
            display: flex;
            justify-content: space-between;
          }
          .questao-card {
            margin-bottom: 18px;
            page-break-inside: avoid;
          }
          .questao-num {
            font-weight: bold;
            color: #1f2937;
          }
          .badge-nivel {
            display: inline-block;
            font-size: 8pt;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 3px;
            margin-left: 6px;
            background: #f3f4f6;
            color: #4b5563;
          }
          .alternativas {
            margin-top: 6px;
            margin-left: 15px;
          }
          .alt-item {
            margin-bottom: 4px;
          }
          .gabarito-box {
            background-color: #f8fafc;
            border-left: 3px solid #0284c7;
            padding: 6px 10px;
            margin-top: 6px;
            font-size: 9.5pt;
          }
          @media print {
            body { margin: 15mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${avaliacao.titulo}</h1>
          <div class="info-grid">
            <div><strong>Componente:</strong> ${avaliacao.componenteCurricular}</div>
            <div><strong>Ano/Série:</strong> ${avaliacao.anoEscolar}</div>
          </div>
          ${
            modoVisualizacao === "aluno"
              ? `
            <div class="student-line">
              <div><strong>Aluno(a):</strong> ___________________________________________</div>
              <div><strong>Data:</strong> ____/____/________ &nbsp;&nbsp; <strong>Turma:</strong> _______</div>
            </div>
            `
              : ""
          }
        </div>

        ${avaliacao.questoes
          .map(
            (q) => `
          <div class="questao-card">
            <div>
              <span class="questao-num">Questão ${q.numero}</span>
              ${
                modoVisualizacao === "professor"
                  ? `<span class="badge-nivel">${q.nivelRotulo}</span>`
                  : ""
              }
            </div>
            ${
              modoVisualizacao === "professor"
                ? `<div style="font-size: 9pt; color: #6b7280; margin-bottom: 4px;"><em>Habilidade: ${q.habilidadeOuDescritor}</em></div>`
                : ""
            }
            <div style="margin-top: 4px;">${q.enunciado}</div>

            ${
              q.alternativas && q.alternativas.length > 0
                ? `
              <div class="alternativas">
                ${q.alternativas
                  .map(
                    (alt) => `
                  <div class="alt-item"><strong>( ${alt.letra} )</strong> ${alt.texto}</div>
                `
                  )
                  .join("")}
              </div>
            `
                : `
              <div style="margin-top: 15px; border-bottom: 1px dotted #9ca3af; height: 30px;"></div>
            `
            }

            ${
              modoVisualizacao === "professor"
                ? `
              <div class="gabarito-box">
                <div><strong>Gabarito:</strong> ${q.respostaEsperadaOuGabarito}</div>
                <div style="margin-top: 2px;"><strong>Justificativa Pedagógica:</strong> ${q.justificativaPedagogica}</div>
              </div>
            `
                : ""
            }
          </div>
        `
          )
          .join("")}

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Cores dos níveis
  const getCorNivel = (nivel: number) => {
    switch (nivel) {
      case 1:
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case 2:
        return "bg-sky-50 text-sky-800 border-sky-200";
      case 3:
        return "bg-amber-50 text-amber-800 border-amber-200";
      case 4:
        return "bg-purple-50 text-purple-800 border-purple-200";
      default:
        return "bg-slate-50 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 border border-amber-200/80 rounded-xl p-4 sm:p-5 space-y-4 shadow-xs print:hidden">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500 text-white rounded-lg shadow-2xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                Sugestão de Avaliação (Retomada Diagnóstica)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                10 Questões Graduais • IA Gemini
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Auxilia o(a) professor(a) a avaliar e nivelar os alunos desde muita dificuldade até domínio pleno.
              <strong className="text-amber-800 ml-1">Não entra na impressão do plano oficial.</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMostrarConfigKey(!mostrarConfigKey)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
          >
            <Key className="w-3.5 h-3.5 text-amber-600" />
            <span>{apiKey ? "API Key Configurada" : "Inserir Chave Gemini"}</span>
          </button>

          {avaliacao && (
            <button
              type="button"
              onClick={() => setPainelAberto(!painelAberto)}
              className="p-1.5 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg transition-colors"
              title={painelAberto ? "Ocultar questões" : "Expandir questões"}
            >
              {painelAberto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Caixa de Configuração de Chave API (se expandida) */}
      {mostrarConfigKey && (
        <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Chave de API do Google Gemini:
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-sky-600 hover:underline flex items-center gap-1"
            >
              <span>Obter chave gratuita no Google AI Studio</span>
            </a>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Cole sua chave AIzaSy..."
              className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={handleSalvarKey}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold transition-colors"
            >
              Salvar
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            A chave fica salva exclusivamente no seu navegador (localStorage) e não é enviada para servidores externos.
          </p>
        </div>
      )}

      {/* Instruções Adicionais Opcionais e Disparo */}
      <div className="flex flex-col sm:flex-row gap-2 items-center">
        <input
          type="text"
          value={instrucaoExtra}
          onChange={(e) => setInstrucaoExtra(e.target.value)}
          placeholder="Instrução opcional para a IA (ex: foque em frações com denominadores simples, incluir 2 questões discursivas)..."
          className="flex-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />

        <button
          type="button"
          onClick={handleGerar}
          disabled={carregando}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:from-slate-400 disabled:to-slate-400 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition-all"
        >
          {carregando ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Gerando 10 Questões Graduais...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{avaliacao ? "Regenerar Avaliação" : "Gerar Sugestão de Avaliação (10 Questões)"}</span>
            </>
          )}
        </button>
      </div>

      {/* Erro */}
      {erro && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      {/* Painel com as Questões Geradas */}
      {avaliacao && painelAberto && (
        <div className="bg-white border border-amber-200/90 rounded-xl p-4 sm:p-5 space-y-4">
          {/* Barra de Controles da Avaliação */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Modo de Exibição:</span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setModoVisualizacao("professor")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    modoVisualizacao === "professor"
                      ? "bg-white text-amber-700 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Visão do Professor (Com Gabarito)
                </button>
                <button
                  type="button"
                  onClick={() => setModoVisualizacao("aluno")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    modoVisualizacao === "aluno"
                      ? "bg-white text-sky-700 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Folha de Prova (Para os Alunos)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopiarTexto}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                title="Copiar texto para colar no Word ou Google Docs"
              >
                {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiado ? "Copiado!" : "Copiar Texto"}</span>
              </button>

              <button
                type="button"
                onClick={handleImprimirEmSeparado}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-2xs"
                title="Imprimir ou salvar PDF exclusivo desta avaliação em folha separada"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Avaliação em Separado</span>
              </button>
            </div>
          </div>

          {/* Orientações Gerais */}
          {avaliacao.orientacoesGerais && modoVisualizacao === "professor" && (
            <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-lg text-xs text-amber-900 leading-relaxed">
              <strong>Orientações Pedagógicas para Retomada:</strong> {avaliacao.orientacoesGerais}
            </div>
          )}

          {/* Lista das 10 Questões Graduais */}
          <div className="space-y-4 divide-y divide-slate-100 max-h-[550px] overflow-y-auto pr-1">
            {avaliacao.questoes.map((q) => (
              <div key={q.numero} className="pt-4 first:pt-0 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">
                      Questão {q.numero}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCorNivel(
                        q.nivel
                      )}`}
                    >
                      {q.nivelRotulo}
                    </span>
                  </div>

                  {modoVisualizacao === "professor" && (
                    <span className="text-[11px] text-slate-400 italic">
                      Habilidade: {q.habilidadeOuDescritor}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                  {q.enunciado}
                </p>

                {/* Alternativas */}
                {q.alternativas && q.alternativas.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {q.alternativas.map((alt) => (
                      <div
                        key={alt.letra}
                        className={`p-2 rounded border text-xs flex items-start gap-2 ${
                          modoVisualizacao === "professor" &&
                          q.respostaEsperadaOuGabarito.includes(alt.letra)
                            ? "bg-emerald-50/80 border-emerald-300 font-semibold text-emerald-950"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span className="font-bold">{alt.letra})</span>
                        <span>{alt.texto}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Gabarito e Justificativa Pedagógica (Somente Modo Professor) */}
                {modoVisualizacao === "professor" && (
                  <div className="mt-2 p-2.5 bg-sky-50/60 border border-sky-100 rounded text-xs space-y-1">
                    <div className="font-bold text-sky-950">
                      Gabarito: <span className="font-normal">{q.respostaEsperadaOuGabarito}</span>
                    </div>
                    <div className="text-sky-900 leading-relaxed">
                      <strong>Justificativa Pedagógica:</strong> {q.justificativaPedagogica}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
