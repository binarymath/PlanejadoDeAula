import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Eye,
  Printer,
  CheckCircle,
  UserCheck,
  AlertTriangle,
  BookOpen,
  HeartHandshake,
  CalendarRange,
  Zap,
  Award,
  Library,
  Save,
  RotateCcw,
  Menu,
  X,
  FileJson,
  Sparkles,
  Key,
  BookOpenCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { LessonPlanState, initialLessonPlanState } from "./types/lessonPlan";
import { generateAndDownloadDocx } from "./services/docxExporter";
import { getBimesterTitles } from "./utils/bimesterHelper";

// Importação modular das sessões
import { IdentificationModule } from "./components/modules/IdentificationModule";
import { DiagnosticModule } from "./components/modules/DiagnosticModule";
import { ThematicUnitModule } from "./components/modules/ThematicUnitModule";
import { SocioemotionalModule } from "./components/modules/SocioemotionalModule";
import { ScheduleModule } from "./components/modules/ScheduleModule";
import { MethodologyModule } from "./components/modules/MethodologyModule";
import { EvaluationModule } from "./components/modules/EvaluationModule";
import { ReferencesModule } from "./components/modules/ReferencesModule";
import { AssessmentModule } from "./components/modules/AssessmentModule";
import { NotebookLMModule } from "./components/modules/NotebookLMModule";
import { DocumentPreviewModal } from "./components/common/DocumentPreviewModal";
import { ConfigLinksModal } from "./components/common/ConfigLinksModal";
import { GeminiApiKeyModal } from "./components/common/GeminiApiKeyModal";

const STORAGE_KEY = "planejador_aula_dados_v1";

interface TabDefinition {
  id: string;
  title: string;
  icon: React.ElementType;
  badge?: string;
}

export const App: React.FC = () => {
  const [data, setData] = useState<LessonPlanState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...initialLessonPlanState,
          ...parsed,
          turmas: parsed.turmas && Array.isArray(parsed.turmas) && parsed.turmas.length > 0
            ? parsed.turmas
            : initialLessonPlanState.turmas,
          feriadosExcecoes: parsed.feriadosExcecoes && Array.isArray(parsed.feriadosExcecoes)
            ? parsed.feriadosExcecoes
            : initialLessonPlanState.feriadosExcecoes,
        };
      } catch (e) {
        console.error("Erro ao carregar dados salvos:", e);
      }
    }
    return initialLessonPlanState;
  });

  const [activeTab, setActiveTab] = useState<string>("identificacao");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showConfigLinksModal, setShowConfigLinksModal] = useState<boolean>(false);
  const [showGeminiModal, setShowGeminiModal] = useState<boolean>(false);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  // Auto-save no LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSavedFeedback(true);
    const timer = setTimeout(() => setSavedFeedback(false), 2000);
    return () => clearTimeout(timer);
  }, [data]);

  const handleFieldChange = (field: keyof LessonPlanState, value: string) => {
    setData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "componenteCurricular" && prev.componenteCurricular !== value
        ? { objetosConhecimento: "" }
        : {}),
    }));
  };

  const bimesterTitles = getBimesterTitles(data.bimestre);

  const tabs: TabDefinition[] = [
    { id: "identificacao", title: "1. Identificação", icon: UserCheck },
    { id: "diagnostico", title: bimesterTitles.abaRecuperacao, icon: AlertTriangle },
    { id: "conteudos", title: bimesterTitles.abaConteudos, icon: BookOpen },
    { id: "socioemocional", title: "4. Socioemocionais", icon: HeartHandshake },
    { id: "cronograma", title: "5. Cronograma", icon: CalendarRange },
    { id: "metodologia", title: "6. Metodologias", icon: Zap },
    { id: "avaliacao", title: "7. Avaliação", icon: Award },
    { id: "referencias", title: "8. Referências", icon: Library },
    { id: "sugestaoAvaliacao", title: "Sugestão de Avaliação", icon: Sparkles, badge: "IA" },
    { id: "notebooklm", title: "Consulte o nosso Gemini Notebook", icon: BookOpenCheck, badge: "Cadernos" },
  ];

  const handleDownload = async () => {
    try {
      setIsExporting(true);
      await generateAndDownloadDocx(data);
    } catch (err: any) {
      alert("Erro ao exportar documento: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Deseja iniciar um novo planejamento em branco? Os campos atuais serão limpos.")) {
      localStorage.removeItem(STORAGE_KEY);
      setData(initialLessonPlanState);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Container de tela (completamente ocultado ao imprimir para nunca vazar atrás do documento) */}
      <div id="app-screen-content" className="flex flex-col flex-1 print:hidden">
        {/* Barra de Topo */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs print:hidden">
          <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-sky-600 text-white p-2 rounded-lg shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  Planejador de Aula • Guia Bimestral
                </h1>
                <p className="text-xs text-slate-500">
                  {data.nomeEscola ? `${data.nomeEscola} • SEDUC-SP` : "Planejamento Curricular Integrado • SEDUC-SP"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Ver seções do planejamento"
                title="Abrir navegação das seções"
                className="md:hidden inline-flex items-center gap-1.5 px-2.5 py-2 border border-slate-300 hover:border-sky-500 hover:bg-sky-50 text-slate-700 hover:text-sky-700 rounded-lg transition-colors text-xs font-semibold"
              >
                <Menu className="w-4 h-4" />
                <span>Seções</span>
              </button>

              <button
                type="button"
                onClick={() => setSidebarVisible((visible) => !visible)}
                aria-label={sidebarVisible ? "Ocultar navegação" : "Mostrar navegação"}
                title={sidebarVisible ? "Ocultar navegação e ampliar a área de edição" : "Mostrar navegação"}
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-2 border border-slate-300 hover:border-sky-500 hover:bg-sky-50 text-slate-700 hover:text-sky-700 rounded-lg transition-colors text-xs font-semibold"
              >
                {sidebarVisible ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                <span>{sidebarVisible ? "Ocultar navegação" : "Mostrar navegação"}</span>
              </button>

              <span
                className={`text-xs flex items-center gap-1 transition-opacity ${
                  savedFeedback ? "opacity-100 text-sky-600 font-medium" : "opacity-0"
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Salvo no navegador
              </span>

              {/* Botão discreto com fundo branco para Inserir API Gemini */}
              <button
                type="button"
                onClick={() => setShowGeminiModal(true)}
                title="Configurar Chave da API do Google Gemini (IA)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-sky-700 border border-slate-300 hover:border-sky-400 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Key className="w-3.5 h-3.5 text-sky-600" />
                <span className="hidden sm:inline">API Gemini</span>
              </button>

              {/* Botão discreto para configurar links de planilhas via JSON */}
              <button
                type="button"
                onClick={() => setShowConfigLinksModal(true)}
                title="Configuração de links das planilhas (.JSON)"
                className="p-2 border border-slate-300 hover:border-sky-500 hover:bg-sky-50 text-slate-700 hover:text-sky-700 rounded-lg transition-colors flex items-center justify-center shadow-xs"
              >
                <FileJson className="w-4 h-4" />
              </button>

              {/* Botão para limpar campos / novo planejamento em branco */}
              <button
                type="button"
                onClick={handleReset}
                title="Iniciar novo planejamento em branco"
                className="p-2 border border-slate-300 hover:border-rose-400 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-lg transition-colors flex items-center justify-center shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Botão de impressora no canto superior direito para abrir a pré-visualização */}
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                title="Abrir pré-visualização para impressão"
                className="p-2 border border-slate-300 hover:border-sky-500 hover:bg-sky-50 text-slate-700 hover:text-sky-700 rounded-lg transition-colors flex items-center justify-center shadow-xs"
              >
                <Printer className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                title={isExporting ? "Gerando documento .DOCX..." : "Baixar documento .DOCX"}
                className="p-2 border border-slate-300 hover:border-sky-500 hover:bg-sky-50 text-slate-700 hover:text-sky-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-colors flex items-center justify-center shadow-xs"
              >
                <FileText className={`w-4 h-4 ${isExporting ? "animate-pulse text-sky-600" : ""}`} />
              </button>
            </div>
          </div>
        </header>

        {/* Layout Principal com Sidebar encostada à esquerda e Conteúdo preenchendo 100% */}
        <div className="flex-1 flex flex-col md:flex-row w-full">
          {/* Backdrop escuro para mobile */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-xs transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar Encostada no Lado Esquerdo */}
          <aside
            className={`fixed md:sticky top-0 md:top-16 z-50 md:z-20 h-full md:h-[calc(100vh-4rem)] w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col transition-[width,transform] duration-300 ease-in-out ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            } ${
              sidebarVisible ? "md:w-80 md:translate-x-0" : "md:w-0 md:-translate-x-full md:overflow-hidden md:border-r-0"
            } shadow-xl md:shadow-none`}
          >
          {/* Cabeçalho do menu com ação de recolher nomeada */}
          <div className="flex items-center justify-between gap-2 p-4 border-b border-slate-100">
            <span className="font-bold text-sm text-slate-800">Navegação do plano</span>
            <button
              type="button"
              onClick={() => {
                if (window.matchMedia("(min-width: 768px)").matches) {
                  setSidebarVisible(false);
                } else {
                  setSidebarOpen(false);
                }
              }}
              aria-label="Recolher navegação"
              title="Recolher navegação"
              className="inline-flex items-center gap-1.5 px-2 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md text-[11px] font-semibold whitespace-nowrap"
            >
              <PanelLeftClose className="w-4 h-4" />
              <span className="hidden sm:inline">Recolher</span>
            </button>
          </div>

          <div className="p-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:block">
            Navegação do Plano
          </div>

          {/* Lista de Seções com Numeração */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {tabs.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all text-left group ${
                    isActive
                      ? "bg-sky-600 text-white shadow-sm shadow-sky-600/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? "bg-sky-500/30 text-white"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block truncate leading-snug">{tab.title}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive ? "bg-sky-700 text-sky-100" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Rodapé do Sidebar */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/60 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Progresso</span>
            <span className="font-semibold text-sky-600">
              {tabs.findIndex((t) => t.id === activeTab) + 1} de {tabs.length} seções
            </span>
          </div>
        </aside>

        {/* Conteúdo Principal do Módulo */}
        <main className={`flex-1 min-w-0 overflow-y-auto ${activeTab === "cronograma" && !sidebarVisible ? "p-0" : "p-4 sm:p-6 lg:p-8"}`}>
          {/* Barra Mobile para Abrir Sidebar e Ver Seção Atual */}
          <div className="md:hidden flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 mb-4 shadow-2xs">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-2 text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200"
            >
              <Menu className="w-4 h-4" />
              <span>Ver Seções</span>
            </button>
            <span className="text-xs font-semibold text-slate-600 truncate max-w-[200px]">
              {tabs.find((t) => t.id === activeTab)?.title}
            </span>
          </div>

          {activeTab === "cronograma" && !sidebarVisible && (
            <div className="hidden md:flex justify-start px-4 pt-3">
              <button
                type="button"
                onClick={() => setSidebarVisible(true)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 hover:border-sky-500 hover:bg-sky-50 text-slate-700 hover:text-sky-800 rounded-md text-xs font-semibold shadow-xs"
              >
                <PanelLeftOpen className="w-4 h-4" />
                Mostrar navegação
              </button>
            </div>
          )}

          {/* Renderização do Módulo Ativo */}
          <div>
            {activeTab === "identificacao" && (
              <IdentificationModule data={data} onChange={handleFieldChange} />
            )}
            {activeTab === "diagnostico" && (
              <DiagnosticModule data={data} onChange={handleFieldChange} />
            )}
            {activeTab === "conteudos" && (
              <ThematicUnitModule data={data} onChange={handleFieldChange} />
            )}
            {activeTab === "socioemocional" && (
              <SocioemotionalModule data={data} onChange={handleFieldChange} />
            )}
            {activeTab === "cronograma" && (
              <ScheduleModule data={data} onChange={handleFieldChange} fullWidth={!sidebarVisible} />
            )}
            {activeTab === "metodologia" && (
              <MethodologyModule data={data} onChange={handleFieldChange} />
            )}
            {activeTab === "avaliacao" && (
              <EvaluationModule data={data} onChange={handleFieldChange} />
            )}
            {activeTab === "referencias" && (
              <ReferencesModule data={data} onChange={handleFieldChange} />
            )}
            {activeTab === "sugestaoAvaliacao" && (
              <AssessmentModule data={data} />
            )}
            {activeTab === "notebooklm" && (
              <NotebookLMModule />
            )}
          </div>

          {/* Barra Inferior de Navegação Rápida entre Abas */}
          <div className="mt-6 flex items-center justify-between text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              disabled={activeTab === tabs[0].id}
              onClick={() => {
                const idx = tabs.findIndex((t) => t.id === activeTab);
                if (idx > 0) setActiveTab(tabs[idx - 1].id);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-semibold rounded-lg text-slate-700 transition-colors"
            >
              ← Seção Anterior
            </button>

            <span className="font-semibold text-slate-500">
              {tabs.findIndex((t) => t.id === activeTab) + 1} de {tabs.length}
            </span>

            <button
              type="button"
              disabled={activeTab === tabs[tabs.length - 1].id}
              onClick={() => {
                const idx = tabs.findIndex((t) => t.id === activeTab);
                if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1].id);
              }}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white disabled:bg-slate-300 font-semibold rounded-lg transition-colors shadow-2xs"
            >
              Próxima Seção →
            </button>
          </div>
        </main>
      </div>
      </div>

      {/* Modal de Pré-visualização Fiel ao DOCX */}
      <DocumentPreviewModal
        data={data}
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onDownload={handleDownload}
        isExporting={isExporting}
      />

      {/* Modal de Backup e Restauração Completa por JSON */}
      <ConfigLinksModal
        isOpen={showConfigLinksModal}
        onClose={() => setShowConfigLinksModal(false)}
        dadosAtuais={data}
        onRestaurarDados={(novosDados) => setData(novosDados)}
      />

      {/* Modal de Configuração da Chave da API do Google Gemini */}
      <GeminiApiKeyModal
        isOpen={showGeminiModal}
        onClose={() => setShowGeminiModal(false)}
      />
    </div>
  );
};

export default App;
