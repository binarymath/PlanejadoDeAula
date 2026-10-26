import React, { useRef, useState, useEffect, useMemo } from "react";
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
  Link as LinkIcon,
  Loader2,
  ExternalLink,
  CalendarRange,
  Settings2,
  X,
  Filter,
} from "lucide-react";
import {
  LessonPlanState,
  TurmaPlanejada,
  FeriadoExcecao,
  TipoEventoEscolar,
  CalendarioBimestres,
  CALENDARIO_BIMESTRES_PADRAO,
} from "../../types/lessonPlan";
import { SPREADSHEETS_CONFIG } from "../../config/spreadsheets";
import { SpreadsheetConnector } from "../common/SpreadsheetConnector";
import { calcularAulasPrevistas } from "../../utils/classCalculator";
import {
  obterDisciplinasCadastradas,
  aplicarDisciplinaSelecionada,
  cadastrarNovaDisciplina,
  removerDisciplinaCadastrada,
  fundirDisciplinas,
  DisciplinaFundida,
  STORAGE_KEYS,
} from "../../services/configLinksService";
import {
  obterDisciplinasDaPlanilhaDiagnostico,
  obterTurmasDaPlanilhaDiagnostico,
  padronizarNomeTurma,
  limparNomeComponente,
  normalizarTexto,
} from "../../services/googleSheetsService";
import { urlParaBase64 } from "../../utils/imageHelper";

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
    { id: "1", nome: data.anoEscolar || "", aulasPorDia: { seg: 0, ter: 0, qua: 0, qui: 0, sex: 0 } }
  ];

  const feriados = Array.isArray(data.feriadosExcecoes) ? data.feriadosExcecoes : [];

  // Estado para novo evento / exceção
  const [novoFeriadoData, setNovoFeriadoData] = useState("");
  const [novoFeriadoDataFim, setNovoFeriadoDataFim] = useState("");
  const [novoFeriadoMotivo, setNovoFeriadoMotivo] = useState("");
  const [novoFeriadoTipo, setNovoFeriadoTipo] = useState<TipoEventoEscolar>("nao_letivo");

  // Estado para modal dos 4 bimestres e filtro de exibição de eventos
  const [modalBimestresAberto, setModalBimestresAberto] = useState<boolean>(false);
  const [verTodosEventosAno, setVerTodosEventosAno] = useState<boolean>(false);

  // Calendário efetivo dos 4 bimestres (persistido em data.calendarioBimestres)
  const calendarioEfetivo = useMemo<CalendarioBimestres>(() => {
    return {
      ...CALENDARIO_BIMESTRES_PADRAO,
      ...(data.calendarioBimestres || {}),
    };
  }, [data.calendarioBimestres]);

  // Lista de disciplinas do arquivo JSON
  const [disciplinasJSON, setDisciplinasJSON] = useState<string[]>(() => obterDisciplinasCadastradas());
  const [disciplinasColunaD, setDisciplinasColunaD] = useState<string[]>([]);
  const [cadastrandoNovaDisc, setCadastrandoNovaDisc] = useState<boolean>(false);
  const [novaDiscTexto, setNovaDiscTexto] = useState<string>("");

  // Disciplinas fundidas (Planilha Oficial + JSON do Sistema sem duplicidades)
  const disciplinasFundidas = useMemo(() => {
    return fundirDisciplinas(disciplinasColunaD, disciplinasJSON);
  }, [disciplinasColunaD, disciplinasJSON]);

  // Disciplina selecionada atual dentro da lista fundida (se houver correspondência canônica)
  const disciplinaAtualFundida = useMemo(() => {
    if (!data.componenteCurricular) return null;
    const chaveAtual = normalizarTexto(limparNomeComponente(data.componenteCurricular));
    return disciplinasFundidas.find((d) => d.chaveCanonica === chaveAtual) || null;
  }, [disciplinasFundidas, data.componenteCurricular]);

  useEffect(() => {
    const handleAtualizarDisciplinas = () => {
      setDisciplinasJSON(obterDisciplinasCadastradas());
    };
    window.addEventListener("storage_links_updated", handleAtualizarDisciplinas);
    window.addEventListener("storage", handleAtualizarDisciplinas);
    return () => {
      window.removeEventListener("storage_links_updated", handleAtualizarDisciplinas);
      window.removeEventListener("storage", handleAtualizarDisciplinas);
    };
  }, []);

  // Busca disciplinas e turmas diretamente na Planilha de Diagnóstico conectada
  const [turmasPlanilha, setTurmasPlanilha] = useState<string[]>([]);

  useEffect(() => {
    const urlDiag = localStorage.getItem(STORAGE_KEYS.DIAGNOSTICO) || "";
    if (!urlDiag.trim()) {
      setDisciplinasColunaD([]);
      setTurmasPlanilha([]);
      return;
    }

    let ativo = true;
    obterDisciplinasDaPlanilhaDiagnostico(undefined, urlDiag.trim())
      .then((discs) => {
        if (!ativo) return;
        setDisciplinasColunaD(discs);
      })
      .catch((err) => {
        console.warn("Falha ao buscar disciplinas da coluna D na Identificação:", err);
      });

    obterTurmasDaPlanilhaDiagnostico(urlDiag.trim())
      .then((salas) => {
        if (!ativo) return;
        setTurmasPlanilha(salas);
      })
      .catch((err) => {
        console.warn("Falha ao buscar turmas da planilha na Identificação:", err);
      });

    return () => {
      ativo = false;
    };
  }, []);

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
      if (calculo.resumoControleFrequencia && calculo.resumoControleFrequencia !== data.controleFrequencia) {
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

  // Estados para inserção de Logo via URL / Google Drive
  const [urlLogoInput, setUrlLogoInput] = useState<string>(data.logoEscolaUrl || "");
  const [modoUrlLogo, setModoUrlLogo] = useState<boolean>(Boolean(data.logoEscolaUrl));
  const [carregandoLogoUrl, setCarregandoLogoUrl] = useState<boolean>(false);
  const [erroLogoUrl, setErroLogoUrl] = useState<string>("");

  useEffect(() => {
    if (data.logoEscolaUrl && data.logoEscolaUrl !== urlLogoInput) {
      setUrlLogoInput(data.logoEscolaUrl);
    }
  }, [data.logoEscolaUrl]);

  const handleAplicarUrlLogo = async (urlCustom?: string) => {
    const linkParaAplicar = (urlCustom ?? urlLogoInput).trim();
    if (!linkParaAplicar) {
      setErroLogoUrl("Por favor, cole o link da imagem ou link do Google Drive.");
      return;
    }

    try {
      setCarregandoLogoUrl(true);
      setErroLogoUrl("");
      const base64 = await urlParaBase64(linkParaAplicar);
      onChange("logoEscolaBase64", base64);
      onChange("logoEscolaUrl", linkParaAplicar);
    } catch (err: any) {
      console.error("Erro ao converter logo via URL:", err);
      setErroLogoUrl(
        err.message ||
          "Não foi possível carregar a imagem. Verifique se o link é público (se for Google Drive, escolha 'Qualquer pessoa com o link')."
      );
    } finally {
      setCarregandoLogoUrl(false);
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
        onChange("logoEscolaUrl", "");
        setUrlLogoInput("");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    onChange("logoEscolaBase64", "");
    onChange("logoEscolaUrl", "");
    setUrlLogoInput("");
    setErroLogoUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Operações de Turmas
  const handleAddTurma = () => {
    const novaTurma: TurmaPlanejada = {
      id: String(Date.now()),
      nome: "",
      aulasPorDia: { seg: 0, ter: 0, qua: 0, qui: 0, sex: 0 },
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

  const handleTurmaBlur = (id: string, nomeAtual: string) => {
    if (!nomeAtual.trim()) return;
    const nomePadrao = padronizarNomeTurma(nomeAtual);
    const turmasAtuais = [...data.turmas];
    const indexAtual = turmasAtuais.findIndex((t) => t.id === id);
    if (indexAtual === -1) return;

    // Procura se já existe outra turma com o mesmo nome padronizado (fusão de turmas iguais)
    const indexOutra = turmasAtuais.findIndex(
      (t) => t.id !== id && padronizarNomeTurma(t.nome) === nomePadrao
    );

    if (indexOutra !== -1) {
      // Funde as aulas das duas turmas
      const turmaAlvo = turmasAtuais[indexOutra];
      const turmaOrigem = turmasAtuais[indexAtual];

      turmaAlvo.nome = nomePadrao;
      (
        ["seg", "ter", "qua", "qui", "sex"] as (keyof TurmaPlanejada["aulasPorDia"])[]
      ).forEach((dia) => {
        turmaAlvo.aulasPorDia[dia] = Math.max(
          turmaAlvo.aulasPorDia[dia] || 0,
          turmaOrigem.aulasPorDia[dia] || 0
        );
      });
      turmaAlvo.aulasSabadoLetivo = Math.max(
        turmaAlvo.aulasSabadoLetivo || 0,
        turmaOrigem.aulasSabadoLetivo || 0
      );

      // Remove a turma duplicada mantendo apenas a turma fundida
      const novasTurmas = turmasAtuais.filter((t) => t.id !== id);
      onChange("turmas", novasTurmas);
    } else {
      // Apenas normaliza o nome para o formato compacto (ex: 6A)
      turmasAtuais[indexAtual].nome = nomePadrao;
      onChange("turmas", turmasAtuais);
    }
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

  // Troca de Bimestre com carregamento automático das datas pré-configuradas
  const handleBimestreChange = (novoBimestre: string) => {
    onChange("bimestre", novoBimestre);
    if (novoBimestre && calendarioEfetivo[novoBimestre]) {
      const { inicio, fim } = calendarioEfetivo[novoBimestre];
      onChange("dataInicioBimestre", inicio);
      onChange("dataFimBimestre", fim);
    }
  };

  // Alteração manual da data de início do bimestre atual
  const handleDataInicioChange = (novaData: string) => {
    onChange("dataInicioBimestre", novaData);
    if (data.bimestre && calendarioEfetivo[data.bimestre]) {
      const novoCalendario: CalendarioBimestres = {
        ...calendarioEfetivo,
        [data.bimestre]: {
          ...calendarioEfetivo[data.bimestre],
          inicio: novaData,
        },
      };
      onChange("calendarioBimestres", novoCalendario);
    }
  };

  // Alteração manual da data de término do bimestre atual
  const handleDataFimChange = (novaData: string) => {
    onChange("dataFimBimestre", novaData);
    if (data.bimestre && calendarioEfetivo[data.bimestre]) {
      const novoCalendario: CalendarioBimestres = {
        ...calendarioEfetivo,
        [data.bimestre]: {
          ...calendarioEfetivo[data.bimestre],
          fim: novaData,
        },
      };
      onChange("calendarioBimestres", novoCalendario);
    }
  };

  // Atualização em lote pelo modal de configuração dos 4 bimestres
  const handleSalvarPeriodoBimestreModal = (bim: string, campo: "inicio" | "fim", valor: string) => {
    const novoCalendario: CalendarioBimestres = {
      ...calendarioEfetivo,
      [bim]: {
        ...(calendarioEfetivo[bim] || { inicio: "", fim: "" }),
        [campo]: valor,
      },
    };
    onChange("calendarioBimestres", novoCalendario);

    // Se estiver editando o bimestre atualmente ativo, reflete imediatamente
    if (data.bimestre === bim) {
      if (campo === "inicio") onChange("dataInicioBimestre", valor);
      if (campo === "fim") onChange("dataFimBimestre", valor);
    }
  };

  // Descobre a qual bimestre um evento pertence baseado nas datas cadastradas
  const identificarBimestreDoEvento = (dataEvento: string): string | null => {
    if (!dataEvento) return null;
    for (const [bimNome, periodo] of Object.entries(calendarioEfetivo)) {
      if (periodo.inicio && periodo.fim && dataEvento >= periodo.inicio && dataEvento <= periodo.fim) {
        return bimNome.replace("º Bimestre", "º Bim");
      }
    }
    return null;
  };

  // Verifica se o evento está dentro do bimestre atualmente selecionado
  const eventoPertenceAoBimestreAtual = (f: FeriadoExcecao): boolean => {
    if (!data.dataInicioBimestre || !data.dataFimBimestre) return true;
    const iniBim = data.dataInicioBimestre;
    const fimBim = data.dataFimBimestre;
    const dtFim = f.dataFim || f.data;
    // Sobreposição de intervalos: max(ini1, ini2) <= min(fim1, fim2)
    return f.data <= fimBim && dtFim >= iniBim;
  };

  // Eventos filtrados pela preferência de exibição (Bimestre Selecionado vs Todos do Ano)
  const eventosExibidos = useMemo(() => {
    if (verTodosEventosAno) {
      return [...feriados].sort((a, b) => a.data.localeCompare(b.data));
    }
    return feriados
      .filter(eventoPertenceAoBimestreAtual)
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [feriados, verTodosEventosAno, data.dataInicioBimestre, data.dataFimBimestre]);

  const totalEventosNoBimestreAtual = useMemo(() => {
    return feriados.filter(eventoPertenceAoBimestreAtual).length;
  }, [feriados, data.dataInicioBimestre, data.dataFimBimestre]);

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
              placeholder="Digite o nome da Unidade Escolar..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all text-sm font-semibold"
            />

          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-600 uppercase">
                Logotipo da Escola:
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setModoUrlLogo(false)}
                  className={`px-1.5 py-0.5 text-[10px] rounded font-medium transition-colors ${
                    !modoUrlLogo
                      ? "bg-sky-100 text-sky-800 font-semibold"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  Arquivo
                </button>
                <span className="text-[10px] text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setModoUrlLogo(true)}
                  className={`px-1.5 py-0.5 text-[10px] rounded font-medium transition-colors flex items-center gap-1 ${
                    modoUrlLogo
                      ? "bg-sky-100 text-sky-800 font-semibold"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  <LinkIcon className="w-2.5 h-2.5" />
                  <span>URL / Drive</span>
                </button>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoUpload}
              accept="image/*"
              className="hidden"
            />

            {data.logoEscolaBase64 ? (
              <div className="p-2 bg-white border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center gap-3">
                  <img
                    src={data.logoEscolaBase64}
                    alt="Logo da Escola"
                    className="w-12 h-12 object-contain rounded border border-slate-100 p-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-sky-600 truncate flex items-center gap-1">
                      <span>Logo carregado</span>
                      {data.logoEscolaUrl && <span className="text-[10px] text-slate-400 font-normal">(via URL)</span>}
                    </p>
                    {data.logoEscolaUrl && (
                      <p className="text-[10px] text-slate-400 truncate max-w-[160px]" title={data.logoEscolaUrl}>
                        {data.logoEscolaUrl}
                      </p>
                    )}
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
              </div>
            ) : modoUrlLogo ? (
              <div className="space-y-1.5">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={urlLogoInput}
                    onChange={(e) => {
                      setUrlLogoInput(e.target.value);
                      if (erroLogoUrl) setErroLogoUrl("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAplicarUrlLogo();
                      }
                    }}
                    placeholder="Cole URL direta ou link Google Drive..."
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleAplicarUrlLogo()}
                    disabled={carregandoLogoUrl}
                    className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
                  >
                    {carregandoLogoUrl ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Carregar</span>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Suporta links de imagem ou <strong>Google Drive</strong> (compartilhado como público).
                </p>
                {erroLogoUrl && (
                  <p className="text-[11px] text-rose-600 bg-rose-50 p-1.5 rounded border border-rose-200">
                    {erroLogoUrl}
                  </p>
                )}
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
            placeholder="Digite o nome do professor..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all text-sm"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-600 uppercase">
              Componente Curricular:
            </label>
            <div className="flex items-center gap-2">
              {disciplinaAtualFundida ? (
                disciplinaAtualFundida.origemPlanilhaOficial && disciplinaAtualFundida.origemSistema ? (
                  <span className="text-[11px] text-sky-600 font-semibold" title="Identificada na planilha e vinculada à matriz curricular">
                    ✔ Oficial • Vinculada
                  </span>
                ) : disciplinaAtualFundida.origemPlanilhaOficial ? (
                  <span className="text-[11px] text-amber-600 font-semibold" title="Identificada na coluna D da planilha oficial">
                    ✔ Oficial (Planilha)
                  </span>
                ) : (
                  <span className="text-[11px] text-sky-600 font-semibold" title="Cadastrada no sistema">
                    ✔ Salva no Sistema
                  </span>
                )
              ) : null}

              {!cadastrandoNovaDisc && (
                <button
                  type="button"
                  onClick={() => setCadastrandoNovaDisc(true)}
                  className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold hover:underline"
                >
                  + Cadastrar
                </button>
              )}
            </div>
          </div>

          {!cadastrandoNovaDisc ? (
            <div className="space-y-1.5">
              <select
                value={
                  disciplinaAtualFundida
                    ? disciplinaAtualFundida.nome
                    : data.componenteCurricular
                    ? "__outro__"
                    : ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__cadastrar__") {
                    setCadastrandoNovaDisc(true);
                  } else if (val === "__outro__") {
                    onChange("componenteCurricular", "");
                  } else {
                    onChange("componenteCurricular", val);
                    aplicarDisciplinaSelecionada(val);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all text-sm font-medium"
              >
                <option value="">Selecione ou identifique a disciplina...</option>

                {/* Lista Unificada e Fundida de Disciplinas (Ordem Alfabética) */}
                {disciplinasFundidas.map((item) => (
                  <option key={`fund_${item.chaveCanonica}`} value={item.nome}>
                    {item.nome}
                    {item.origemPlanilhaOficial && item.origemSistema
                      ? " (Oficial • Vinculada)"
                      : item.origemPlanilhaOficial
                      ? " (Oficial)"
                      : " (Personalizada)"}
                  </option>
                ))}

                <option value="__cadastrar__">+ Cadastrar nova disciplina...</option>
                <option value="__outro__">Digitar manualmente...</option>
              </select>

              {/* Botão para gerenciar/remover se estiver cadastrada no sistema JSON */}
              {disciplinaAtualFundida && disciplinaAtualFundida.origemSistema && (
                <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
                  <span>
                    Disciplina cadastrada no sistema: <strong>{disciplinaAtualFundida.nome}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Deseja remover "${disciplinaAtualFundida.nome}" das disciplinas salvas no sistema? Você poderá usar a planilha própria ou recadastrá-la quando quiser.`
                        )
                      ) {
                        removerDisciplinaCadastrada(disciplinaAtualFundida.chaveSistemaOriginal || disciplinaAtualFundida.nome);
                        onChange("componenteCurricular", "");
                      }
                    }}
                    className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 font-semibold"
                    title="Excluir do sistema para usar planilha própria"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Excluir do Sistema</span>
                  </button>
                </div>
              )}

              {/* Se o professor escolheu Outro ou a disciplina não consta na lista, exibe input para digitar livremente */}
              {!disciplinaAtualFundida && data.componenteCurricular !== undefined && (
                <input
                  type="text"
                  value={data.componenteCurricular}
                  onChange={(e) => onChange("componenteCurricular", e.target.value)}
                  placeholder="Digite o nome da disciplina manualmente..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all text-xs"
                />
              )}
            </div>
          ) : (
            /* Formulário rápido de cadastro de nova disciplina */
            <div className="flex gap-1.5 items-center p-2 bg-sky-50 border border-sky-200 rounded-lg">
              <input
                type="text"
                value={novaDiscTexto}
                onChange={(e) => setNovaDiscTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (novaDiscTexto.trim()) {
                      const nome = novaDiscTexto.trim();
                      cadastrarNovaDisciplina(nome);
                      onChange("componenteCurricular", nome);
                      setNovaDiscTexto("");
                      setCadastrandoNovaDisc(false);
                    }
                  }
                }}
                placeholder="Nome da nova disciplina..."
                className="flex-1 px-2.5 py-1.5 bg-white border border-sky-300 rounded text-xs text-slate-800 focus:ring-1 focus:ring-sky-500 outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  if (novaDiscTexto.trim()) {
                    const nome = novaDiscTexto.trim();
                    cadastrarNovaDisciplina(nome);
                    onChange("componenteCurricular", nome);
                    setNovaDiscTexto("");
                    setCadastrandoNovaDisc(false);
                  }
                }}
                disabled={!novaDiscTexto.trim()}
                className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white rounded text-xs font-semibold"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => {
                  setNovaDiscTexto("");
                  setCadastrandoNovaDisc(false);
                }}
                className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bimestre e Calendário do Período */}
      <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <label className="block text-xs font-bold text-slate-700 uppercase">
            Período do Bimestre (Define o intervalo de contagem das aulas):
          </label>
          <button
            type="button"
            onClick={() => setModalBimestresAberto(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors shadow-2xs"
            title="Visualizar e configurar datas de início e término dos 4 bimestres do ano letivo"
          >
            <CalendarRange className="w-3.5 h-3.5 text-sky-600" />
            <span>Configurar os 4 Bimestres</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Bimestre:
            </label>
            <select
              value={data.bimestre}
              onChange={(e) => handleBimestreChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all text-sm font-medium"
            >
              <option value="">Selecione o Bimestre...</option>
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
              onChange={(e) => handleDataInicioChange(e.target.value)}
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
              onChange={(e) => handleDataFimChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all text-sm"
            />
          </div>
        </div>
      </div>

      {/* MODAL PARA CONFIGURAR AS DATAS DOS 4 BIMESTRES */}
      {modalBimestresAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-100 text-sky-700 rounded-lg">
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Calendário dos 4 Bimestres do Ano Letivo
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina o período de cada bimestre para preenchimento e filtros automáticos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalBimestresAberto(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 max-h-[70vh] overflow-y-auto">
              {(["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"] as const).map((bimNome) => {
                const periodo = calendarioEfetivo[bimNome] || { inicio: "", fim: "" };
                const isAtivo = data.bimestre === bimNome;

                return (
                  <div
                    key={bimNome}
                    className={`p-3.5 rounded-xl border transition-colors ${
                      isAtivo
                        ? "bg-sky-50/50 border-sky-300 ring-1 ring-sky-300"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{bimNome}</span>
                        {isAtivo && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-600 text-white rounded-full">
                            Bimestre Ativo
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {periodo.inicio && periodo.fim ? "Definido" : "Pendente"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                          Início
                        </label>
                        <input
                          type="date"
                          value={periodo.inicio}
                          onChange={(e) =>
                            handleSalvarPeriodoBimestreModal(bimNome, "inicio", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                          Término
                        </label>
                        <input
                          type="date"
                          value={periodo.fim}
                          onChange={(e) =>
                            handleSalvarPeriodoBimestreModal(bimNome, "fim", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setModalBimestresAberto(false)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                Concluir e Salvar
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {totalEventosNoBimestreAtual} no {data.bimestre || "bimestre"} ({feriados.length} no ano)
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Cadastre feriados e dias sem aula (não entram na contagem de aulas) ou eventos escolares (que contam normalmente na carga horária).
              </p>
            </div>
          </div>

          {/* Seletor de visualização (Deste Bimestre vs Todos do Ano) */}
          <div className="inline-flex items-center p-0.5 bg-white border border-slate-200 rounded-lg shadow-2xs text-xs">
            <button
              type="button"
              onClick={() => setVerTodosEventosAno(false)}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                !verTodosEventosAno
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Eventos deste Bimestre ({totalEventosNoBimestreAtual})
            </button>
            <button
              type="button"
              onClick={() => setVerTodosEventosAno(true)}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                verTodosEventosAno
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos do Ano ({feriados.length})
            </button>
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
        {eventosExibidos && eventosExibidos.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            <div className="flex flex-wrap gap-2">
              {eventosExibidos.map((f) => {
                const formatBRShort = (dt: string) => {
                  const [y, m, d] = dt.split("-");
                  return y && m && d ? `${d}/${m}` : dt;
                };

                const temPeriodo = Boolean(f.dataFim && f.dataFim > f.data);
                const periodoFormatado = temPeriodo
                  ? `${formatBRShort(f.data)} a ${formatBRShort(f.dataFim!)}`
                  : formatBRShort(f.data);

                const isLetivo = f.tipo === "letivo";
                const bimDetectado = identificarBimestreDoEvento(f.data);

                return (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs shadow-2xs border border-slate-200 bg-white text-slate-800"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isLetivo ? "bg-sky-500" : "bg-rose-500"
                      }`}
                      title={isLetivo ? "Letivo (conta na contagem)" : "Não Letivo (não entra na contagem)"}
                    />
                    <span className="font-bold text-slate-900">{periodoFormatado}</span>
                    <span className="text-slate-700 font-medium">{f.motivo}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
                      {isLetivo ? "Letivo" : "Sem aula"}
                    </span>
                    {bimDetectado && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        {bimDetectado}
                      </span>
                    )}
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
                • Dias não letivos descontados no bimestre:{" "}
                <strong className="text-rose-600 font-bold">
                  {calculoAtual.feriadosDescontados} dia(s)
                </strong>
              </span>
              <span>
                • Eventos escolares letivos no bimestre:{" "}
                <strong className="text-sky-700 font-bold">
                  {calculoAtual.eventosLetivosTotais} evento(s)
                </strong>
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            {verTodosEventosAno
              ? "Nenhum evento ou feriado cadastrado para o ano letivo."
              : `Nenhum evento ou feriado cadastrado para o ${data.bimestre || "bimestre selecionado"}.`}
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

        {/* Chips de Turmas Identificadas na Planilha Oficial para inclusão rápida */}
        {turmasPlanilha.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-white border border-sky-100 rounded-lg text-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">
              Turmas na Planilha:
            </span>
            {turmasPlanilha.map((tPlan) => {
              const jaAdicionada = turmas.some(
                (t) => padronizarNomeTurma(t.nome) === tPlan
              );
              return (
                <button
                  key={tPlan}
                  type="button"
                  onClick={() => {
                    if (jaAdicionada) return;
                    // Se a primeira turma estiver vazia, preenche ela
                    const primeiroVazio = turmas.find((t) => !t.nome.trim());
                    if (primeiroVazio) {
                      onChange(
                        "turmas",
                        turmas.map((t) => (t.id === primeiroVazio.id ? { ...t, nome: tPlan } : t))
                      );
                    } else {
                      const nova: TurmaPlanejada = {
                        id: String(Date.now()),
                        nome: tPlan,
                        aulasPorDia: { seg: 0, ter: 0, qua: 0, qui: 0, sex: 0 },
                      };
                      onChange("turmas", [...turmas, nova]);
                    }
                  }}
                  disabled={jaAdicionada}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    jaAdicionada
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-default"
                      : "bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 shadow-2xs hover:shadow-xs cursor-pointer"
                  }`}
                  title={jaAdicionada ? `Turma ${tPlan} já está na sua grade` : `Clique para adicionar ${tPlan} à sua grade`}
                >
                  <span>{tPlan}</span>
                  {jaAdicionada ? (
                    <span className="text-[10px] text-sky-600 font-bold">✔</span>
                  ) : (
                    <span className="text-[10px] text-sky-600">+</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="space-y-3">
          {turmas.map((turma, index) => {
            const aulasTurma = calculoAtual.totalAulasPorTurma[turma.id] || 0;
            return (
              <div
                key={turma.id}
                className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="w-full md:w-52">
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">
                      Turma #{index + 1}
                    </label>
                    {turmasPlanilha.length > 0 && (
                      <span className="text-[9px] font-semibold text-sky-600 bg-sky-50 px-1 py-0.2 rounded border border-sky-200">
                        Planilha Ativa
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      list={`sugestoes_turmas_${turma.id}`}
                      value={turma.nome}
                      onChange={(e) => handleTurmaNomeChange(turma.id, e.target.value)}
                      onBlur={(e) => handleTurmaBlur(turma.id, e.target.value)}
                      placeholder="Ex: 6A"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-bold text-sm text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500"
                    />

                    {/* Datalist com turmas identificadas na planilha de diagnóstico */}
                    <datalist id={`sugestoes_turmas_${turma.id}`}>
                      {turmasPlanilha.map((t) => (
                        <option key={t} value={t}>
                          Turma {t} (Identificada na Planilha)
                        </option>
                      ))}
                    </datalist>
                  </div>
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
