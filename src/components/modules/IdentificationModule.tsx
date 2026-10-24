import React, { useRef, useState, useEffect } from "react";
import {
  UserCheck,
  School,
  Upload,
  Trash2,
  Plus,
  Calendar,
  Layers,
  Calculator,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { LessonPlanState, TurmaPlanejada, FeriadoExcecao, TipoEventoEscolar } from "../../types/lessonPlan";
import { SPREADSHEETS_CONFIG } from "../../config/spreadsheets";
import { SpreadsheetConnector } from "../common/SpreadsheetConnector";
import { calcularAulasPrevistas } from "../../utils/classCalculator";

interface IdentificationModuleProps {
  data: LessonPlanState;
  onChange: (field: keyof LessonPlanState, value: any) => void;
}

export const IdentificationModule: React.FC<IdentificationModuleProps> = ({
  data,
  onChange,
}) => {
  const config = SPREADSHEETS_CONFIG.identificacao;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const turmas = Array.isArray(data.turmas) && data.turmas.length > 0 ? data.turmas : [
    { id: "1", nome: data.anoEscolar || "Turma 1", aulasPorDia: { seg: 2, ter: 0, qua: 2, qui: 0, sex: 0 } }
  ];
  const feriados = Array.isArray(data.feriadosExcecoes) ? data.feriadosExcecoes : [];

  // Estado para novo evento / exceção
  const [novoFeriadoData, setNovoFeriadoData] = useState("");
  const [novoFeriadoDataFim, setNovoFeriadoDataFim] = useState("");
  const [novoFeriadoMotivo, setNovoFeriadoMotivo] = useState("");
  const [novoFeriadoTipo, setNovoFeriadoTipo] = useState<TipoEventoEscolar>("nao_letivo");

  // Recalcula as aulas sempre que mudar as datas, turmas ou feriados
  useEffect(() => {
    if (data.dataInicioBimestre && data.dataFimBimestre && turmas.length > 0) {
      const calculo = calcularAulasPrevistas(
        data.dataInicioBimestre,
        data.dataFimBimestre,
        turmas,
        feriados
      );

      // Atualiza automaticamente as Aulas Previstas (apenas por turma) e o Ano Escolar
      if (calculo.resumoTextoAulas && calculo.resumoTextoAulas !== data.aulasPrevistas) {
        onChange("aulasPrevistas", calculo.resumoTextoAulas);
      }
      if (calculo.resumoTextoTurmas && calculo.resumoTextoTurmas !== data.anoEscolar) {
        onChange("anoEscolar", calculo.resumoTextoTurmas);
      }
      if (calculo.resumoControleFrequencia && (!data.controleFrequencia || data.controleFrequencia.includes("|") || data.controleFrequencia.includes("!") || data.controleFrequencia.startsWith("Limite") || data.controleFrequencia.includes("faltas") || data.controleFrequencia === "Acompanhamento diário no Diário Digital (SED)" || data.controleFrequencia === "12")) {
        onChange("controleFrequencia", calculo.resumoControleFrequencia);
      }
    }
  }, [
    data.dataInicioBimestre,
    data.dataFimBimestre,
    data.turmas,
    data.feriadosExcecoes,
  ]);

  const handleSpreadsheetData = (_text: string, rawData: Record<string, any>[]) => {
    if (rawData.length > 0) {
      const first = rawData[0];
      if (first["Escola"]) onChange("nomeEscola", first["Escola"]);
      if (first["Professor"] || first["Nome"]) onChange("nomeProfessor", first["Professor"] || first["Nome"]);
      if (first["Disciplina"] || first["Componente"]) onChange("componenteCurricular", first["Disciplina"] || first["Componente"]);
      if (first["Turma"] || first["Ano"]) onChange("anoEscolar", first["Turma"] || first["Ano"]);
      if (first["Bimestre"]) onChange("bimestre", first["Bimestre"]);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Por favor selecione um arquivo de imagem (PNG, JPG, etc).");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        onChange("logoEscolaBase64", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    onChange("logoEscolaBase64", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Operações de Turmas
  const handleAddTurma = () => {
    const novaTurma: TurmaPlanejada = {
      id: String(Date.now()),
      nome: `Turma ${data.turmas.length + 1}`,
      aulasPorDia: { seg: 2, ter: 0, qua: 2, qui: 0, sex: 0 },
    };
    onChange("turmas", [...data.turmas, novaTurma]);
  };

  const handleRemoveTurma = (id: string) => {
    if (data.turmas.length <= 1) {
      alert("É necessário manter ao menos 1 turma no planejamento.");
      return;
    }
    onChange(
      "turmas",
      data.turmas.filter((t) => t.id !== id)
    );
  };

  const handleTurmaNomeChange = (id: string, nome: string) => {
    onChange(
      "turmas",
      data.turmas.map((t) => (t.id === id ? { ...t, nome } : t))
    );
  };

  const handleAulasDiaChange = (
    turmaId: string,
    dia: keyof TurmaPlanejada["aulasPorDia"],
    qtd: number
  ) => {
    onChange(
      "turmas",
      data.turmas.map((t) =>
        t.id === turmaId
          ? {
              ...t,
              aulasPorDia: {
                ...t.aulasPorDia,
                [dia]: Math.max(0, qtd),
              },
            }
          : t
      )
    );
  };

  const handleSabadoLetivoChange = (turmaId: string, qtd: number) => {
    onChange(
      "turmas",
      turmas.map((t) =>
        t.id === turmaId ? { ...t, aulasSabadoLetivo: Math.max(0, qtd) } : t
      )
    );
  };

  // Operações de Eventos Escolares e Feriados
  const handleAddFeriado = () => {
    if (!novoFeriadoData) {
      alert("Selecione a data de início do evento ou feriado.");
      return;
    }
    if (novoFeriadoDataFim && novoFeriadoDataFim < novoFeriadoData) {
      alert("A data de término não pode ser anterior à data de início.");
      return;
    }
    const novo: FeriadoExcecao = {
      id: String(Date.now()),
      data: novoFeriadoData,
      ...(novoFeriadoDataFim && novoFeriadoDataFim !== novoFeriadoData ? { dataFim: novoFeriadoDataFim } : {}),
      motivo:
        novoFeriadoMotivo ||
        (novoFeriadoTipo === "letivo" ? "Evento Escolar Letivo" : "Sem aula / Ponto facultativo"),
      tipo: novoFeriadoTipo,
    };
    onChange("feriadosExcecoes", [...(data.feriadosExcecoes || []), novo]);
    setNovoFeriadoData("");
    setNovoFeriadoDataFim("");
    setNovoFeriadoMotivo("");
  };

  const handleRemoveFeriado = (id: string) => {
    onChange(
      "feriadosExcecoes",
      data.feriadosExcecoes.filter((f) => f.id !== id)
    );
  };

  const calculoAtual = calcularAulasPrevistas(
    data.dataInicioBimestre,
    data.dataFimBimestre,
    data.turmas,
    data.feriadosExcecoes || []
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              1. Identificação Geral e Gestão de Turmas
            </h2>
            <p className="text-xs text-slate-500">
              Escola, professor, turmas planejadas, dias da semana e cálculo automático de aulas
            </p>
          </div>
        </div>
      </div>

      {/* Bloco de Personalização da Escola (Nome e Logo) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase">
          <School className="w-4 h-4 text-sky-600" />
          <span>Dados Institucionais da Escola</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Nome da Unidade Escolar:
            </label>
            <input
              type="text"
              value={data.nomeEscola}
              onChange={(e) => onChange("nomeEscola", e.target.value)}
              placeholder="Ex: EE PROF. MARCO ANTÔNIO MENCACCI"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Logotipo da Escola:
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoUpload}
              accept="image/*"
              className="hidden"
            />

            {data.logoEscolaBase64 ? (
              <div className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-lg">
                <img
                  src={data.logoEscolaBase64}
                  alt="Logo da Escola"
                  className="w-12 h-12 object-contain rounded border border-slate-100 p-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-emerald-600 truncate">Logo carregado</p>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 font-medium mt-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remover
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-3 border border-dashed border-slate-300 hover:border-sky-500 bg-white hover:bg-sky-50/50 rounded-lg text-xs font-semibold text-slate-600 hover:text-sky-700 flex items-center justify-center gap-2 transition-all"
              >
                <Upload className="w-4 h-4 text-sky-600" />
                <span>Upload Logo (Opcional)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <SpreadsheetConnector config={config} onImportData={handleSpreadsheetData} />

      {/* Professor e Componente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Nome do Professor:
          </label>
          <input
            type="text"
            value={data.nomeProfessor}
            onChange={(e) => onChange("nomeProfessor", e.target.value)}
            placeholder="Ex: Prof. Arthur Guins"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Componente Curricular:
          </label>
          <input
            type="text"
            value={data.componenteCurricular}
            onChange={(e) => onChange("componenteCurricular", e.target.value)}
            placeholder="Ex: Matemática, Tecnologia e Inovação..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* Bimestre e Calendário do Período */}
      <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4">
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
          Período do Bimestre (Define o intervalo de contagem das aulas):
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Bimestre:
            </label>
            <select
              value={data.bimestre}
              onChange={(e) => onChange("bimestre", e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all text-sm font-medium"
            >
              <option value="1º Bimestre">1º Bimestre</option>
              <option value="2º Bimestre">2º Bimestre</option>
              <option value="3º Bimestre">3º Bimestre</option>
              <option value="4º Bimestre">4º Bimestre</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Início do Bimestre:
            </label>
            <input
              type="date"
              value={data.dataInicioBimestre}
              onChange={(e) => onChange("dataInicioBimestre", e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Fim do Bimestre:
            </label>
            <input
              type="date"
              value={data.dataFimBimestre}
              onChange={(e) => onChange("dataFimBimestre", e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all text-sm"
            />
          </div>
        </div>
      </div>

      {/* EVENTOS ESCOLARES E CALENDÁRIO DO BIMESTRE */}
      <div className="border border-indigo-200 bg-indigo-50/20 rounded-xl p-5 space-y-3.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>Eventos Escolares e Calendário do Bimestre</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                  {feriados.length} cadastrado(s)
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Cadastre feriados e dias sem aula (não entram na contagem de aulas) ou eventos escolares (que contam normalmente na carga horária).
              </p>
            </div>
          </div>
        </div>

        {/* Adicionar Evento / Dia */}
        <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center bg-white border border-slate-200 p-3 rounded-lg shadow-2xs">
          <div className="flex items-center gap-2 w-full lg:w-72">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                Início
              </label>
              <input
                type="date"
                value={novoFeriadoData}
                onChange={(e) => setNovoFeriadoData(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5" title="Opcional se for de 1 único dia">
                Término <span className="text-[9px] text-slate-400 font-normal">(Opc.)</span>
              </label>
              <input
                type="date"
                value={novoFeriadoDataFim}
                min={novoFeriadoData || undefined}
                onChange={(e) => setNovoFeriadoDataFim(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 w-full">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
              Nome ou Descrição do Evento
            </label>
            <input
              type="text"
              value={novoFeriadoMotivo}
              onChange={(e) => setNovoFeriadoMotivo(e.target.value)}
              placeholder="Ex: Carnaval, Semana Cultural, Reunião de Pais..."
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="w-full lg:w-36">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
              Impacto nas Aulas
            </label>
            <select
              value={novoFeriadoTipo}
              onChange={(e) => setNovoFeriadoTipo(e.target.value as TipoEventoEscolar)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-800 bg-white font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="nao_letivo">Não Letivo</option>
              <option value="letivo">Letivo</option>
            </select>
          </div>

          <div className="pt-0 lg:pt-4">
            <button
              type="button"
              onClick={handleAddFeriado}
              className="w-full lg:w-auto px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar</span>
            </button>
          </div>
        </div>

        {/* Lista de Eventos Cadastrados */}
        {feriados && feriados.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            <div className="flex flex-wrap gap-2">
              {feriados.map((f) => {
                const formatBRShort = (dt: string) => {
                  const [y, m, d] = dt.split("-");
                  return y && m && d ? `${d}/${m}` : dt;
                };

                const temPeriodo = Boolean(f.dataFim && f.dataFim > f.data);
                const periodoFormatado = temPeriodo
                  ? `${formatBRShort(f.data)} a ${formatBRShort(f.dataFim!)}`
                  : formatBRShort(f.data);

                const isLetivo = f.tipo === "letivo";

                return (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs shadow-2xs border border-slate-200 bg-white text-slate-800"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isLetivo ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                      title={isLetivo ? "Letivo (conta na contagem)" : "Não Letivo (não entra na contagem)"}
                    />
                    <span className="font-bold text-slate-900">{periodoFormatado}</span>
                    <span className="text-slate-700 font-medium">{f.motivo}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
                      {isLetivo ? "Letivo" : "Sem aula"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeriado(f.id)}
                      className="text-slate-400 hover:text-rose-600 ml-1 font-bold text-sm leading-none"
                      title="Remover evento"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>

            {/* Resumo dinâmico de eventos */}
            <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
              <span>
                • Dias não letivos descontados:{" "}
                <strong className="text-rose-600 font-bold">
                  {calculoAtual.feriadosDescontados} dia(s)
                </strong>
              </span>
              <span>
                • Eventos escolares letivos:{" "}
                <strong className="text-emerald-700 font-bold">
                  {calculoAtual.eventosLetivosTotais} evento(s)
                </strong>
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            Nenhum evento ou feriado cadastrado para este bimestre.
          </p>
        )}
      </div>

      {/* GESTÃO DE MÚLTIPLAS TURMAS E DIAS DA SEMANA (ABAIXO) */}
      <div className="border border-sky-200 bg-sky-50/30 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Turmas e Grade Semanal de Aulas
              </h3>
              <p className="text-xs text-slate-500">
                Indique quantas aulas você tem em cada dia da semana por turma. O sistema calculará as aulas automaticamente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddTurma}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Turma
          </button>
        </div>

        <div className="space-y-3">
          {turmas.map((turma, index) => {
            const aulasTurma = calculoAtual.totalAulasPorTurma[turma.id] || 0;
            return (
              <div
                key={turma.id}
                className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="w-full md:w-48">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                    Nome da Turma #{index + 1}
                  </label>
                  <input
                    type="text"
                    value={turma.nome}
                    onChange={(e) => handleTurmaNomeChange(turma.id, e.target.value)}
                    placeholder="Ex: 6º Ano A"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-bold text-sm text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {/* Seletor de Aulas por Dia (Segunda a Sexta + Sábado Letivo) */}
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Aulas por dia da semana e Sábado Letivo:
                  </label>
                  <div className="grid grid-cols-6 gap-1.5 text-center">
                    {(
                      [
                        { key: "seg", label: "Seg" },
                        { key: "ter", label: "Ter" },
                        { key: "qua", label: "Qua" },
                        { key: "qui", label: "Qui" },
                        { key: "sex", label: "Sex" },
                      ] as const
                    ).map((dia) => (
                      <div key={dia.key} className="bg-slate-50 border border-slate-200 rounded p-1">
                        <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                          {dia.label}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={turma.aulasPorDia[dia.key]}
                          onChange={(e) =>
                            handleAulasDiaChange(turma.id, dia.key, parseInt(e.target.value) || 0)
                          }
                          className="w-full text-center text-xs font-bold text-sky-700 bg-white border border-slate-200 rounded py-0.5 mt-0.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                    ))}

                    {/* Coluna Especial: Sábados Letivos Pontuais */}
                    <div className="bg-amber-50 border border-amber-200 rounded p-1" title="Aulas pontuais em Sábados Letivos no bimestre">
                      <span className="block text-[10px] font-bold text-amber-800 uppercase">
                        Sáb. Letivo
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={turma.aulasSabadoLetivo ?? 0}
                        onChange={(e) =>
                          handleSabadoLetivoChange(turma.id, parseInt(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-full text-center text-xs font-bold text-amber-800 bg-white border border-amber-300 rounded py-0.5 mt-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Subtotal da Turma e Limite de 25% de Faltas */}
                <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-right space-y-0.5">
                    <span className="block text-xs font-bold text-slate-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                      {aulasTurma} aulas
                    </span>
                    <span className="block text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold" title="Limite máximo de 25% de faltas no bimestre">
                      Máx. {Math.floor(aulasTurma * 0.25)} faltas (25%)
                    </span>
                  </div>

                  {turmas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTurma(turma.id)}
                      title="Remover turma"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>




    </div>
  );
};
