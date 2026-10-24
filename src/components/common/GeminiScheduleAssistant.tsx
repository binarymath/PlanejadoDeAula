import React, { useState } from "react";
import {
  Sparkles,
  Send,
  CheckCircle2,
  Key,
  Bot,
  User,
  RefreshCw,
  HelpCircle,
  Columns,
  Calendar,
} from "lucide-react";
import {
  ColunaCurriculoOpcao,
  COLUNAS_CURRICULO_DISPONIVEIS,
  ChatMensagem,
  obterGeminiApiKey,
  salvarGeminiApiKey,
  conversarComGeminiCronograma,
} from "../../services/geminiScheduleService";
import { AulaCurriculoItem } from "../../services/curriculumService";
import { SemanaCronogramaInfo } from "../../utils/scheduleHelper";
import { LessonPlanState } from "../../types/lessonPlan";

interface GeminiScheduleAssistantProps {
  plano: LessonPlanState;
  aulasCurriculo: AulaCurriculoItem[];
  semanas: SemanaCronogramaInfo[];
  colunaEscolhida: ColunaCurriculoOpcao;
  onColunaChange: (coluna: ColunaCurriculoOpcao) => void;
  onAplicarCronograma: (cronograma: string) => void;
}

export const GeminiScheduleAssistant: React.FC<GeminiScheduleAssistantProps> = ({
  plano,
  aulasCurriculo,
  semanas,
  colunaEscolhida,
  onColunaChange,
  onAplicarCronograma,
}) => {
  const [apiKey, setApiKey] = useState<string>(obterGeminiApiKey());
  const [mostrarConfigKey, setMostrarConfigKey] = useState<boolean>(!obterGeminiApiKey());
  const [mensagens, setMensagens] = useState<ChatMensagem[]>([]);
  const [inputTexto, setInputTexto] = useState<string>("");
  const [carregando, setCarregando] = useState<boolean>(false);
  const [ultimoCronogramaGerado, setUltimoCronogramaGerado] = useState<string | null>(null);

  // Salvar chave de API
  const handleSalvarKey = (e: React.FormEvent) => {
    e.preventDefault();
    salvarGeminiApiKey(apiKey);
    setMostrarConfigKey(false);
  };

  // Enviar mensagem para o Gemini
  const handleEnviarMensagem = async (textoPersonalizado?: string) => {
    const textoParaEnviar = (textoPersonalizado || inputTexto).trim();
    if (!textoParaEnviar || carregando) return;

    if (!apiKey) {
      setMostrarConfigKey(true);
      return;
    }

    const agora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMensagem = {
      id: Date.now().toString(),
      role: "user",
      texto: textoParaEnviar,
      dataHora: agora,
    };

    setMensagens((prev) => [...prev, userMsg]);
    setInputTexto("");
    setCarregando(true);

    // Mapeia histórico para o SDK
    const historico = mensagens.map((m) => ({
      role: m.role,
      parts: [{ text: m.texto }],
    }));

    try {
      const res = await conversarComGeminiCronograma({
        apiKey,
        colunaEscolhida,
        aulasCurriculo,
        semanas,
        plano,
        historicoMensagens: historico,
        mensagemUsuario: textoParaEnviar,
      });

      const modelMsg: ChatMensagem = {
        id: (Date.now() + 1).toString(),
        role: "model",
        texto: res.respostaTexto.replace(/<CRONOGRAMA>[\s\S]*?<\/CRONOGRAMA>/gi, "").trim(),
        dataHora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        cronogramaGerado: res.cronogramaFormatado,
      };

      setMensagens((prev) => [...prev, modelMsg]);
      if (res.cronogramaFormatado) {
        setUltimoCronogramaGerado(res.cronogramaFormatado);
      }
    } catch (err: any) {
      console.error("Erro no chat com o Gemini:", err);
      const erroMsg: ChatMensagem = {
        id: (Date.now() + 1).toString(),
        role: "model",
        texto: `Não foi possível gerar a resposta. Verifique sua chave de API ou conexão: ${err.message || err}`,
        dataHora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      };
      setMensagens((prev) => [...prev, erroMsg]);
    } finally {
      setCarregando(false);
    }
  };

  // Sugestão automática inicial
  const handleSugerirCronogramaCompleto = () => {
    const colunaConfig = COLUNAS_CURRICULO_DISPONIVEIS.find((c) => c.id === colunaEscolhida);
    const prompt = `Por favor, elabore uma sugestão de cronograma distribuindo os itens da coluna "${colunaConfig?.label || colunaEscolhida}" da planilha ao longo das semanas de aula do bimestre, considerando feriados e prevendo momentos para avaliações e nivelamento.`;
    handleEnviarMensagem(prompt);
  };

  return (
    <div className="bg-gradient-to-br from-sky-50/60 to-indigo-50/40 border border-sky-200/80 rounded-xl p-5 space-y-4">
      {/* Barra de Título e Configuração de Chave */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sky-600 text-white rounded-lg shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Assistente Gemini • Cronograma Inteligente
            </h3>
            <p className="text-[11px] text-slate-500">
              Associa a planilha de Objetos de Conhecimento com feriados e semanas letivas
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMostrarConfigKey(!mostrarConfigKey)}
          className="inline-flex items-center gap-1 text-xs text-sky-700 hover:text-sky-900 bg-white border border-sky-200 px-2.5 py-1 rounded-md font-medium transition-colors"
        >
          <Key className="w-3.5 h-3.5" />
          <span>{apiKey ? "Chave de API Configurada" : "Inserir Chave Gemini"}</span>
        </button>
      </div>

      {/* Formulário de Chave de API */}
      {mostrarConfigKey && (
        <form onSubmit={handleSalvarKey} className="bg-white p-3.5 rounded-lg border border-sky-200 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Chave da API do Google Gemini (gratuita no Google AI Studio):
            </label>
          </div>

          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Cole sua chave AIzaSy... aqui"
              className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded transition-colors"
            >
              Salvar
            </button>
          </div>
          <p className="text-[10px] text-slate-400">
            A chave é armazenada com segurança localmente no seu navegador e não é compartilhada.
          </p>
        </form>
      )}

      {/* Seletor da Coluna da Planilha de Objetos de Conhecimento - Exibido apenas após conexão */}
      {aulasCurriculo.length > 0 ? (
        <div className="bg-white p-3.5 rounded-lg border border-sky-200/80 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Columns className="w-4 h-4 text-sky-600" />
            <span>Escolha a coluna da planilha de Objetos de Conhecimento para o cronograma:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {COLUNAS_CURRICULO_DISPONIVEIS.map((col) => {
              const isSelected = colunaEscolhida === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => onColunaChange(col.id)}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                    isSelected
                      ? "bg-sky-50 border-sky-500 ring-1 ring-sky-500 text-sky-950 font-semibold"
                      : "bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{col.label}</span>
                    {isSelected && <span className="text-[10px] bg-sky-600 text-white px-1.5 py-0.2 rounded font-bold">Ativa</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 font-normal mt-0.5 line-clamp-1">
                    {col.descricao}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Botão de Sugestão com 1 Clique */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 mt-2">
            <span className="text-[11px] text-slate-500">
              {aulasCurriculo.length} aulas cadastradas nesta aba da planilha • {semanas.length} semanas letivas
            </span>

            <button
              type="button"
              disabled={carregando}
              onClick={handleSugerirCronogramaCompleto}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              {carregando ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Sugerir Cronograma Completo com Gemini</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center text-xs text-slate-500">
          Conecte a planilha de Currículo / Objetos de Conhecimento na Seção 3 para habilitar a escolha das colunas e a geração automática do cronograma com o Gemini.
        </div>
      )}

      {/* Caixa de Diálogo / Chat Interativo */}
      <div className="bg-white rounded-lg border border-sky-200 overflow-hidden flex flex-col">
        <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 flex items-center justify-between">
          <span>Diálogo Pedagógico com Gemini</span>
          {mensagens.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setMensagens([]);
                setUltimoCronogramaGerado(null);
              }}
              className="text-[11px] text-slate-400 hover:text-slate-600"
            >
              Limpar conversa
            </button>
          )}
        </div>

        {/* Mensagens do Chat */}
        <div className="p-3.5 max-h-72 overflow-y-auto space-y-3">
          {mensagens.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs space-y-2">
              <Bot className="w-7 h-7 mx-auto text-sky-400" />
              <p>
                Clique em <strong>"Sugerir Cronograma Completo"</strong> ou digite uma instrução abaixo.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                {[
                  "Distribua 2 aulas para cada tema",
                  "Reserve a semana do Carnaval para nivelamento",
                  "Adicione prova bimestral na última semana",
                ].map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleEnviarMensagem(sug)}
                    className="text-[10px] bg-slate-100 hover:bg-sky-50 text-slate-600 px-2 py-1 rounded border border-slate-200 transition-colors"
                  >
                    "{sug}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            mensagens.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "model" && (
                  <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed space-y-2 ${
                    msg.role === "user"
                      ? "bg-sky-600 text-white rounded-br-none"
                      : "bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.texto}</p>

                  {/* Bloco de cronograma gerado */}
                  {msg.cronogramaGerado && (
                    <div className="bg-white border border-sky-200 rounded p-2.5 mt-2 space-y-2 text-slate-900">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                        <span className="font-bold text-[11px] text-sky-900 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Proposta de Cronograma Formatado
                        </span>
                        <button
                          type="button"
                          onClick={() => onAplicarCronograma(msg.cronogramaGerado!)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-colors shadow-2xs"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Aplicar ao Cronograma</span>
                        </button>
                      </div>
                      <pre className="font-mono text-[10px] whitespace-pre-wrap max-h-40 overflow-y-auto text-slate-700">
                        {msg.cronogramaGerado}
                      </pre>
                    </div>
                  )}

                  <span
                    className={`block text-[9px] ${
                      msg.role === "user" ? "text-sky-200 text-right" : "text-slate-400"
                    }`}
                  >
                    {msg.dataHora}
                  </span>
                </div>

                {msg.role === "user" && (
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))
          )}

          {carregando && (
            <div className="flex items-center gap-2 text-xs text-sky-600 p-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>O Gemini está analisando os dados e organizando o cronograma...</span>
            </div>
          )}
        </div>

        {/* Input de Mensagem */}
        <div className="p-2 border-t border-slate-200 bg-slate-50/70 flex gap-2">
          <input
            type="text"
            value={inputTexto}
            disabled={carregando}
            onChange={(e) => setInputTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEnviarMensagem()}
            placeholder="Ex: Gemini, agrupe 2 aulas em cada semana e deixe o Carnaval para recuperação..."
            className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={carregando || !inputTexto.trim()}
            onClick={() => handleEnviarMensagem()}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
