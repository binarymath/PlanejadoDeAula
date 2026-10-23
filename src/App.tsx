import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Eye,
  Printer,
  CheckCircle,
  FolderCog,
  UserCheck,
  AlertTriangle,
  BookOpen,
  HeartHandshake,
  CalendarRange,
  Zap,
  Award,
  Library,
  Save,
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
import { DocumentPreviewModal } from "./components/common/DocumentPreviewModal";

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
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Container de tela (completamente ocultado ao imprimir para nunca vazar atrás do documento) */}
      <div id="app-screen-content" className="flex flex-col flex-1 print:hidden">
        {/* Barra de Topo */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-sky-600 text-white p-2 rounded-lg shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Planejador de Aula • Guia Bimestral
              </h1>
              <p className="text-xs text-slate-500">
                EE Prof. Marco Antônio Mencacci • SEDUC-SP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs flex items-center gap-1 transition-opacity ${
                savedFeedback ? "opacity-100 text-emerald-600 font-medium" : "opacity-0"
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Salvo no navegador
            </span>

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
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              <Download className={`w-4 h-4 ${isExporting ? "animate-bounce" : ""}`} />
              {isExporting ? "Exportando..." : "Gerar Documento .DOCX"}
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal com Abas */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {/* Aviso de Configuração de Planilhas */}
        <div className="mb-4 bg-sky-50/60 border border-sky-200 rounded-lg p-3 text-xs text-sky-900 flex items-start gap-2.5">
          <FolderCog className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold">Vínculo Direto de Planilhas:</span> Você pode definir os endereços de cada planilha diretamente no código no arquivo{" "}
            <code className="bg-sky-100 px-1.5 py-0.5 rounded text-sky-950 font-mono text-[11px]">
              src/config/spreadsheets.ts
            </code>{" "}
            ou digitar/colar a URL no cabeçalho de cada sessão abaixo. Cada módulo é isolado e alimenta sua respectiva parte do documento final.
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="bg-white rounded-t-xl border border-b-0 border-slate-200 p-2 overflow-x-auto flex gap-1 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{tab.title}</span>
              </button>
            );
          })}
        </div>

        {/* Renderização do Módulo Ativo */}
        <div className="rounded-b-xl">
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
            <ScheduleModule data={data} onChange={handleFieldChange} />
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
        </div>

        {/* Barra Inferior de Navegação Rápida entre Abas */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <button
            type="button"
            disabled={activeTab === tabs[0].id}
            onClick={() => {
              const idx = tabs.findIndex((t) => t.id === activeTab);
              if (idx > 0) setActiveTab(tabs[idx - 1].id);
            }}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 font-medium"
          >
            ← Aba Anterior
          </button>

          <span className="font-medium text-slate-400">
            Aba {tabs.findIndex((t) => t.id === activeTab) + 1} de {tabs.length}
          </span>

          <button
            type="button"
            disabled={activeTab === tabs[tabs.length - 1].id}
            onClick={() => {
              const idx = tabs.findIndex((t) => t.id === activeTab);
              if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1].id);
            }}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 font-medium"
          >
            Próxima Aba →
          </button>
        </div>
      </main>
      </div>

      {/* Modal de Pré-visualização Fiel ao DOCX */}
      <DocumentPreviewModal
        data={data}
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onDownload={handleDownload}
        isExporting={isExporting}
      />
    </div>
  );
};

export default App;
