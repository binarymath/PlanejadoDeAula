import React from "react";
import { Download, X, Printer, FileText } from "lucide-react";
import { LessonPlanState } from "../../types/lessonPlan";
import { getBimesterTitles } from "../../utils/bimesterHelper";
import { formatarPorcentagem2Casas } from "../../services/googleSheetsService";

function formatDateBR(dateStr?: string): string {
  if (!dateStr) return "__/__/____";
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

interface DocumentPreviewModalProps {
  data: LessonPlanState;
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
  isExporting: boolean;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  data,
  isOpen,
  onClose,
  onDownload,
  isExporting,
}) => {
  if (!isOpen) return null;

  const hasLogo = Boolean(data.logoEscolaBase64 && data.logoEscolaBase64.trim().length > 0);
  const bimesterTitles = getBimesterTitles(data.bimestre);

  return (
    <div
      id="preview-modal-root"
      className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block"
    >
      <div className="bg-slate-100 rounded-2xl max-w-5xl w-full max-h-[96vh] flex flex-col shadow-2xl overflow-hidden border border-slate-700/50 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full print:max-h-none print:h-auto print:overflow-visible print:bg-white print:m-0 print:p-0">
        
        {/* Barra superior de controle (Oculta completamente na impressão) */}
        <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between print:hidden shadow-xs z-10">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>Pré-visualização Oficial (Guia Bimestral)</span>
              <span className="text-[10px] px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-mono font-medium">
                Layout Idêntico ao .DOCX
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {hasLogo
                ? "Cabeçalho oficial com logotipo da unidade escolar ativo."
                : "Cabeçalho oficial padrão da Secretaria da Educação ativo."}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => window.print()}
              title="Salvar como PDF ou Imprimir documento oficial"
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Salvar PDF / Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onDownload}
              disabled={isExporting}
              title={isExporting ? "Gerando documento .DOCX..." : "Baixar documento .DOCX"}
              className="p-1.5 border border-slate-300 hover:border-sky-500 hover:bg-sky-50 text-slate-600 hover:text-sky-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-colors flex items-center justify-center"
            >
              <FileText className={`w-4 h-4 ${isExporting ? "animate-pulse text-sky-600" : ""}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Área de Leitura Fluida */}
        <div
          ref={(el) => {
            if (el) el.scrollTop = 0;
          }}
          className="p-4 sm:p-6 overflow-y-auto flex-1 bg-white print:p-0 print:m-0 print:overflow-visible print:h-auto print:block"
        >
          <div
            id="printable-document"
            className="w-full font-sans text-black print:p-0 print:m-0 print:w-full print:block"
          >
            
            {/* CABEÇALHO COM LOGO OCUPANDO 100% DA LARGURA */}
            {hasLogo && (
              <div className="w-full mb-4 pb-2 border-b-2 border-slate-700/60 print:border-b-2 print:border-black flex items-center justify-center">
                <img
                  src={data.logoEscolaBase64}
                  alt="Logo"
                  className="w-full h-auto object-contain max-h-36 block"
                />
              </div>
            )}

            {/* ESTRUTURA MODULAR DO GUIA BIMESTRAL (Fiel tanto na tela quanto na impressão) */}
            <div className="doc-sheet border border-black bg-white text-xs divide-y divide-black">
              
              {/* Bloco 0: Identificação Geral do Professor e Turma */}
              <div className="doc-block p-3.5 space-y-2 leading-relaxed bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">Escola: </span>
                    <span className="font-bold text-slate-800 text-sm">
                      {data.nomeEscola || "________________________________________________"}
                    </span>
                  </div>

                </div>

                <div className="flex flex-wrap justify-between gap-y-1">
                  <div>
                    <span className="font-bold">Nome: </span>
                    <span>{data.nomeProfessor || "____________________________________"}</span>
                  </div>
                  <div>
                    <span className="font-bold">Componente Curricular: </span>
                    <span>{data.componenteCurricular || "______________________"}</span>
                  </div>
                </div>

                <div>
                  <span className="font-bold">Ano Escolar: </span>
                  <span>{data.anoEscolar || "____________________"}</span>
                </div>

                <div>
                  <span className="font-bold">Bimestre: </span>
                  <span>{data.bimestre || "1º Bimestre"}</span>
                  {(data.dataInicioBimestre || data.dataFimBimestre) && (
                    <span className="text-slate-600 font-medium ml-2">
                      (Período: {formatDateBR(data.dataInicioBimestre)} até {formatDateBR(data.dataFimBimestre)})
                    </span>
                  )}
                </div>

                <div>
                  <span className="font-bold">Aulas previstas: </span>
                  <span>{data.aulasPrevistas || "____________________"}</span>
                </div>

                <div>
                  <span className="font-bold">Controle sua frequência: </span>
                  <span>{data.controleFrequencia || "Acompanhamento diário no Diário Digital (SED)"}</span>
                </div>
              </div>

              {/* Bloco 1: Aprendizagens Essenciais não consolidadas */}
              <div className="doc-block p-3.5">
                <div className="text-center font-bold text-[12px] mb-2 text-slate-900">
                  {bimesterTitles.tituloRecuperacao}
                </div>

                <div className="space-y-2 text-slate-800 leading-relaxed min-h-[40px]">
                  {data.aprendizagensNaoConsolidadas ? (
                    data.aprendizagensNaoConsolidadas.split("\n").map((line, idx) => {
                      const trimmed = line.trim();
                      if (!trimmed) return null;

                      // Caso 1: Linha agrupada [6º A: 10,00% | 6º C: 8,70%]: Descrição ou [6º A - 10,00%]: Descrição
                      const matchAgrupado = trimmed.match(/^•?\s*\[(.*?)\]:\s*(.*)$/);
                      if (matchAgrupado) {
                        const blocoSalas = matchAgrupado[1].trim();
                        const desc = matchAgrupado[2].trim();
                        return (
                          <div
                            key={idx}
                            className="flex items-start gap-1.5 text-xs text-slate-900 leading-snug py-0.5"
                          >
                            <span className="text-slate-400 select-none">•</span>
                            <span className="font-bold text-slate-800">[{blocoSalas}]:</span>
                            <span className="flex-1 text-slate-800">{desc}</span>
                          </div>
                        );
                      }

                      // Caso 2 (legado): linha formatada com [Acerto: X | Sala: Y] Descrição
                      const matchAcerto = trimmed.match(/^•?\s*\[Acerto:\s*([^|\]]+)\s*\|\s*Sala:\s*([^\]]+)\]\s*(.*)$/i);
                      if (matchAcerto) {
                        const [_, taxa, sala, desc] = matchAcerto;
                        const taxaFmt = formatarPorcentagem2Casas(taxa);
                        return (
                          <div
                            key={idx}
                            className="flex items-start gap-1.5 text-xs text-slate-900 leading-snug py-0.5"
                          >
                            <span className="text-slate-400 select-none">•</span>
                            <span className="font-bold text-slate-800">[{sala.trim()} - {taxaFmt}]:</span>
                            <span className="flex-1 text-slate-800">
                              {desc.trim()}
                            </span>
                          </div>
                        );
                      }

                      // Caso seja a linha bruta com pipes
                      const parts = trimmed.split("|").map((p) => p.trim());
                      if (parts.length >= 4 && parts[1].includes("ANO")) {
                        const taxaFmt = formatarPorcentagem2Casas(parts[2]);
                        const desc = parts[3];
                        const comp = parts[4] || "";
                        return (
                          <div
                            key={idx}
                            className="flex items-start gap-1.5 text-xs text-slate-900 leading-snug py-0.5"
                          >
                            <span className="text-slate-400 select-none">•</span>
                            <span className="font-bold text-slate-800">[{parts[1]} - {taxaFmt}]:</span>
                            <span className="flex-1 text-slate-800">
                              {desc}
                              {comp && <span className="text-slate-500 text-[11px] ml-1">({comp})</span>}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <p key={idx} className="text-xs text-slate-800 leading-relaxed py-0.5">
                          {trimmed.startsWith("•") ? trimmed : `• ${trimmed}`}
                        </p>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 italic">Não informado.</p>
                  )}
                </div>
              </div>

              {/* Bloco 2: Objetos de Conhecimento */}
              <div className="doc-block p-3.5">
                <div className="text-center font-bold text-[12px] mb-2 text-slate-900">
                  {bimesterTitles.tituloConteudos}
                </div>
                <div className="space-y-2 text-slate-800 leading-relaxed min-h-[40px]">
                  {data.objetosConhecimento ? (
                    data.objetosConhecimento.split("\n").map((line, idx) => {
                      const trimmed = line.trim();
                      if (!trimmed) return <div key={idx} className="h-1.5" />;

                      const matchAEHeader = trimmed.match(/^•?\s*\[?(AE\s*\d+)\]?\s*[-–:]\s*(.*)$/i);
                      if (matchAEHeader) {
                        return (
                          <div
                            key={idx}
                            className="flex items-start gap-1.5 text-xs text-slate-900 leading-snug pt-1"
                          >
                            <span className="text-slate-400 select-none">•</span>
                            <span className="font-bold text-slate-900">[{matchAEHeader[1].toUpperCase()}]:</span>
                            <span className="flex-1 text-slate-800 font-normal">{matchAEHeader[2].trim()}</span>
                          </div>
                        );
                      }

                      if (trimmed.startsWith("-") || trimmed.startsWith("•")) {
                        return (
                          <div
                            key={idx}
                            className="pl-4 text-xs text-slate-700 leading-relaxed"
                          >
                            {trimmed}
                          </div>
                        );
                      }

                      return (
                        <p key={idx} className="text-xs text-slate-800 leading-relaxed">
                          {trimmed}
                        </p>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 italic">Não informado.</p>
                  )}
                </div>
              </div>

              {/* Bloco 3: Competências Socioemocionais */}
              <div className="doc-block p-3.5">
                <div className="text-center font-bold text-[12px] mb-2 text-slate-900">
                  Competências Socioemocionais
                </div>
                <div className="space-y-1.5 text-slate-800 leading-relaxed min-h-[40px]">
                  {data.competenciasSocioemocionais ? (
                    data.competenciasSocioemocionais.split("\n").map((line, idx) => {
                      const trimmed = line.trim();
                      if (!trimmed) return null;

                      const matchBloco = trimmed.match(/^•?\s*\[(.*?)\]:\s*(.*)$/i);
                      if (matchBloco) {
                        return (
                          <div
                            key={idx}
                            className="flex items-start gap-1.5 text-xs text-slate-900 leading-snug py-0.5"
                          >
                            <span className="text-slate-400 select-none">•</span>
                            <span className="font-bold text-slate-900">[{matchBloco[1].trim()}]:</span>
                            <span className="flex-1 text-slate-800 font-normal">{matchBloco[2].trim()}</span>
                          </div>
                        );
                      }

                      return (
                        <p key={idx} className="text-xs text-slate-800 leading-relaxed py-0.5">
                          {trimmed.startsWith("•") ? trimmed : `• ${trimmed}`}
                        </p>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 italic">Não informado.</p>
                  )}
                </div>
              </div>

              {/* Bloco 4: Cronograma */}
              <div className="doc-block p-3.5">
                <div className="text-center font-bold text-[12px] mb-2 text-slate-900">
                  Cronograma
                </div>
                <div className="space-y-2 text-slate-800 leading-relaxed min-h-[40px]">
                  {data.cronograma ? (
                    (() => {
                      const lines = data.cronograma.split("\n");
                      return lines.map((line, idx) => {
                        const trimmed = line.trim();
                        if (!trimmed) return <div key={idx} className="h-1" />;

                        // Detectar cabeçalho de mês (ex: MÊS: ABRIL ou FEVEREIRO:)
                        const matchMes =
                          (trimmed.match(/^([A-ZÇÃÉÊÍÓÔÚ\s]{3,}:?|=+.*=+)$/i) &&
                            (trimmed.endsWith(":") ||
                              trimmed.includes("==") ||
                              /^(MÊS:|JANEIRO|FEVEREIRO|MARÇO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)/i.test(
                                trimmed
                              )) &&
                            !trimmed.includes("/")) ||
                          trimmed.toUpperCase().startsWith("MÊS:");

                        if (matchMes) {
                          return (
                            <div
                              key={idx}
                              className="font-bold text-slate-900 text-xs tracking-wider pt-2 pb-1 border-b border-slate-200"
                            >
                              {trimmed}
                            </div>
                          );
                        }

                        const matchSemana = trimmed.match(/^(\d{2}\/\d{2}\s+a\s+\d{2}\/\d{2}):?\s*(.*)$/i);
                        if (matchSemana) {
                          return (
                            <div
                              key={idx}
                              className="flex items-start gap-1.5 text-xs text-slate-900 leading-snug py-0.5"
                            >
                              <span className="font-bold text-slate-900 flex-shrink-0">
                                {matchSemana[1]}:
                              </span>
                              <span className="flex-1 text-slate-800 font-normal">
                                {matchSemana[2].trim()}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <p key={idx} className="text-xs text-slate-800 leading-relaxed py-0.5">
                            {trimmed}
                          </p>
                        );
                      });
                    })()
                  ) : (
                    <p className="text-xs text-slate-400 italic">Não informado.</p>
                  )}
                </div>
              </div>

              {/* Bloco 5: Metodologias Ativas */}
              <div className="doc-block p-3.5">
                <div className="text-center font-bold text-[12px] mb-2 text-slate-900">
                  Metodologias Ativas
                </div>
                <div className="space-y-2 text-slate-800 leading-relaxed min-h-[40px]">
                  {data.metodologiaAtiva ? (
                    data.metodologiaAtiva.split("\n\n").map((bloco, idx) => {
                      const trimmed = bloco.trim();
                      if (!trimmed) return null;

                      const matchMet = trimmed.match(/^•?\s*\[(.*?)\]:\s*(.*)$/s);
                      if (matchMet) {
                        return (
                          <div
                            key={idx}
                            className="flex items-start gap-1.5 text-xs text-slate-900 leading-snug py-0.5"
                          >
                            <span className="text-slate-400 select-none">•</span>
                            <span className="font-bold text-slate-900">[{matchMet[1].trim()}]:</span>
                            <span className="flex-1 text-slate-800 font-normal">{matchMet[2].trim()}</span>
                          </div>
                        );
                      }

                      return (
                        <p key={idx} className="text-xs text-slate-800 leading-relaxed py-0.5">
                          {trimmed.startsWith("•") ? trimmed : `• ${trimmed}`}
                        </p>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 italic">Não informado.</p>
                  )}
                </div>
              </div>

              {/* Bloco 6: Critérios de Avaliação */}
              <div className="doc-block p-3.5">
                <div className="text-center font-bold text-[12px] mb-2 text-slate-900">
                  Critérios de Avaliação
                </div>
                <div className="space-y-2 text-slate-800 leading-relaxed min-h-[40px]">
                  {data.criterioAvaliacao ? (
                    data.criterioAvaliacao.split("\n\n").map((bloco, idx) => {
                      const trimmed = bloco.trim();
                      if (!trimmed) return null;

                      const matchCrit = trimmed.match(/^•?\s*\[(.*?)\](?:\s*\((.*?)\))?:\s*(.*)$/s);
                      if (matchCrit) {
                        return (
                          <div
                            key={idx}
                            className="flex items-start gap-1.5 text-xs text-slate-900 leading-snug py-0.5"
                          >
                            <span className="text-slate-400 select-none">•</span>
                            <span className="font-bold text-slate-900">
                              [{matchCrit[1].trim()}]{matchCrit[2] ? ` (${matchCrit[2].trim()}):` : ":"}
                            </span>
                            <span className="flex-1 text-slate-800 font-normal">{matchCrit[3].trim()}</span>
                          </div>
                        );
                      }

                      return (
                        <p key={idx} className="text-xs text-slate-800 leading-relaxed py-0.5">
                          {trimmed.startsWith("•") ? trimmed : `• ${trimmed}`}
                        </p>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 italic">Não informado.</p>
                  )}
                </div>
              </div>

              {/* Bloco 7: Referências Bibliográficas e Materiais de Apoio */}
              <div className="doc-block p-3.5">
                <div className="text-center font-bold text-[12px] mb-2 text-slate-900">
                  Referências Bibliográficas e Materiais de Apoio
                </div>
                <div className="space-y-2 text-slate-800 leading-relaxed min-h-[40px]">
                  {data.referenciasApoio ? (
                    data.referenciasApoio.split("\n\n").map((bloco, idx) => {
                      const trimmed = bloco.trim();
                      if (!trimmed) return null;

                      const matchRef = trimmed.match(/^•?\s*\[(.*?)\]:\s*(.*)$/s);
                      if (matchRef) {
                        return (
                          <div
                            key={idx}
                            className="flex items-start gap-1.5 text-xs text-slate-900 leading-snug py-0.5"
                          >
                            <span className="text-slate-400 select-none">•</span>
                            <span className="font-bold text-slate-900">[{matchRef[1].trim()}]:</span>
                            <span className="flex-1 text-slate-800 font-normal">{matchRef[2].trim()}</span>
                          </div>
                        );
                      }

                      return (
                        <p key={idx} className="text-xs text-slate-800 leading-relaxed py-0.5">
                          {trimmed.startsWith("•") ? trimmed : `• ${trimmed}`}
                        </p>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 italic">Não informado.</p>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
