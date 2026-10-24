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
  Lock,
  Check,
  CalendarDays,
  ShieldCheck,
  Trash2,
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
  const [inputKey, setInputKey] = useState<string>(obterGeminiApiKey());
  const [mensagens, setMensagens] = useState<ChatMensagem[]>([]);
  const [inputTexto, setInputTexto] = useState<string>("");
  const [carregando, setCarregando] = useState<boolean>(false);
  const [ultimoCronogramaGerado, setUltimoCronogramaGerado] = useState<string | null>(null);
  const [copiadoSucesso, setCopiadoSucesso] = useState<boolean>(false);

  // Salvar chave de API
  const handleSalvarKey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const chaveLimpa = inputKey.trim();
    salvarGeminiApiKey(chaveLimpa);
    setApiKey(chaveLimpa);
    if (chaveLimpa) {
      setMostrarConfigKey(false);
    }
  };

  const handleRemoverKey = () => {
    salvarGeminiApiKey("");
    setApiKey("");
    setInputKey("");
    setMostrarConfigKey(true);
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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-sky-600/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              Assistente de IA • Planejamento do Cronograma
            </h3>
            <p className="text-xs text-slate-500">
              Distribuição inteligente de conteúdos respeitando seus feriados e semanas letivas
            </p>
          </div>
        </div>

        {/* Status e Botão da Chave */}
        <div className="flex items-center gap-2">
          {apiKey ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>IA Pronta para uso</span>
              <button
                type="button"
                onClick={() => setMostrarConfigKey(!mostrarConfigKey)}
                className="text-[11px] underline text-emerald-700 hover:text-emerald-900 ml-1"
                title="Configurações da Chave"
              >
                {mostrarConfigKey ? "Fechar" : "Alterar"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMostrarConfigKey(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Ativar IA (Inserir Chave)</span>
            </button>
          )}
        </div>
      </div>

      {/* Área Intuitiva de Configuração da Chave da API */}
      {mostrarConfigKey && (
        <div className="p-4 sm:p-5 bg-sky-50/70 border-b border-sky-200/80 rounded-xl animate-in fade-in duration-200">
          <div className="max-w-2xl bg-white p-4 rounded-xl border border-sky-200 shadow-2xs space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <Lock className="w-3.5 h-3.5 text-sky-600" />
                  Chave da API do Google Gemini
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  A chave é gratuita e gerada pelo Google AI Studio. Fica salva com total segurança apenas no seu navegador.
                </p>
              </div>
              {apiKey && (
                <button
                  type="button"
                  onClick={() => setMostrarConfigKey(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                >
                  Fechar
                </button>
              )}
            </div>

            <form onSubmit={handleSalvarKey} className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="Cole sua chave aqui (começa com AIzaSy...)"
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="submit"
                  disabled={!inputKey.trim()}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-2xs"
                >
                  Salvar Chave
                </button>

                {apiKey && (
                  <button
                    type="button"
                    onClick={handleRemoverKey}
                    title="Remover chave salva"
                    className="p-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Como obter: acesse o Google AI Studio com sua conta Google e clique em "Create API Key".</span>
            </div>
          </div>
        </div>
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

      {/* Diálogo Pedagógico com Gemini */}
      <div className="bg-white rounded-xl border border-sky-200 overflow-hidden shadow-2xs flex flex-col">
        <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-sky-600" />
            <span>Conversa Pedagógica com o Gemini</span>
          </div>
          {mensagens.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setMensagens([]);
                setUltimoCronogramaGerado(null);
              }}
              className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold"
            >
              Limpar conversa
            </button>
          )}
        </div>

        {/* Mensagens do Chat */}
        <div className="p-4 max-h-96 overflow-y-auto space-y-3.5 bg-slate-50/30">
          {mensagens.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-100/70 text-sky-600 flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">
                  Como posso ajudar a organizar suas semanas de aula?
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  Peça sugestões de distribuição, adaptações para semanas curtas ou clique em um dos exemplos rápidos:
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 pt-2 max-w-lg mx-auto">
                {[
                  "Distribua os temas organizando 2 aulas por semana",
                  "Reserve momentos de nivelamento antes dos feriados",
                  "Inclua uma aula para avaliação bimestral no final",
                ].map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={!apiKey || carregando}
                    onClick={() => handleEnviarMensagem(sug)}
                    className="text-xs bg-white hover:bg-sky-50 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-sky-300 transition-colors shadow-2xs text-left"
                  >
                    💡 {sug}
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
                    className={`max-w-[88%] rounded-2xl p-4 text-xs leading-relaxed space-y-2.5 shadow-2xs ${
                      msg.role === "user"
                        ? "bg-sky-600 text-white rounded-br-xs font-medium"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs"
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed">{msg.texto}</p>

                    {/* Card de Visualização do Cronograma Formatado */}
                    {msg.cronogramaGerado && (
                      <div className="bg-gradient-to-br from-slate-50 to-sky-50/50 border border-sky-200 rounded-xl p-3.5 mt-2 space-y-2.5 text-slate-900">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 pb-2">
                          <span className="font-bold text-xs text-sky-900 flex items-center gap-1.5">
                            <CalendarDays className="w-4 h-4 text-sky-600" />
                            Cronograma Organizado por Mês e Datas
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              onAplicarCronograma(msg.cronogramaGerado!);
                              setCopiadoSucesso(true);
                              setTimeout(() => setCopiadoSucesso(false), 3000);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
                          >
                            {copiadoSucesso ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Aplicado com Sucesso!</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Aplicar ao Cronograma Abaixo</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="bg-white rounded-lg p-3 border border-slate-200 max-h-56 overflow-y-auto">
                          <pre className="font-mono text-[11px] whitespace-pre-wrap text-slate-800 leading-relaxed font-normal">
                            {msg.cronogramaGerado}
                          </pre>
                        </div>
                      </div>
                    )}

                    <span
                      className={`block text-[10px] ${
                        msg.role === "user" ? "text-sky-200 text-right" : "text-slate-400"
                      }`}
                    >
                      {msg.dataHora}
                    </span>
                  </div>

                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-2xs">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))
            )}

            {carregando && (
              <div className="flex items-center gap-2.5 text-xs text-sky-700 bg-sky-50 p-3 rounded-xl border border-sky-200 max-w-md">
                <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                <span>O Gemini está analisando os dados e organizando o cronograma nas semanas...</span>
              </div>
            )}
          </div>

          {/* Input de Mensagem */}
          <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
            <input
              type="text"
              value={inputTexto}
              disabled={carregando || !apiKey}
              onChange={(e) => setInputTexto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEnviarMensagem()}
              placeholder={
                apiKey
                  ? "Digite uma instrução para o Gemini (ex: adapte a semana do Carnaval para acolhimento)..."
                  : "Insira sua chave de API acima para conversar com o Gemini..."
              }
              className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all"
            />
            <button
              type="button"
              disabled={carregando || !inputTexto.trim() || !apiKey}
              onClick={() => handleEnviarMensagem()}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </div>
      </div>
    </div>
  );
};
