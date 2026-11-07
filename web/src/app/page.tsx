"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Cpu,
  Eye,
  Lock,
  LogOut,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Square,
  Upload,
  UserCheck,
  Video,
  VideoOff,
} from "lucide-react";

interface AnaliseResultado {
  status: "OK" | "INCONCLUSIVE" | "NO_FACE_DETECTED" | string;
  expression: string | null;
  label: string | null;
  confidence: number | null;
  faces: number;
  box?: [number, number, number, number] | null;
}

interface ItemHistorico extends AnaliseResultado {
  hora: string;
  origem: string;
}

interface ResumoPainel {
  numero: number;
  resultado: AnaliseResultado | null;
  origem: string | null;
  idade_s: number | null;
  historico: ItemHistorico[];
}

const META_EXPRESSOES: Record<
  string,
  { titulo: string; emoji: string; corTexto: string; corBg: string; corBarra: string }
> = {
  feliz: {
    titulo: "Feliz",
    emoji: "😊",
    corTexto: "text-emerald-400",
    corBg: "bg-emerald-500/15 border-emerald-500/30",
    corBarra: "bg-emerald-500",
  },
  neutro: {
    titulo: "Neutro",
    emoji: "😐",
    corTexto: "text-slate-300",
    corBg: "bg-slate-500/15 border-slate-500/30",
    corBarra: "bg-slate-400",
  },
  surpreso: {
    titulo: "Surpreso",
    emoji: "😮",
    corTexto: "text-amber-400",
    corBg: "bg-amber-500/15 border-amber-500/30",
    corBarra: "bg-amber-400",
  },
  triste: {
    titulo: "Triste",
    emoji: "😢",
    corTexto: "text-sky-400",
    corBg: "bg-sky-500/15 border-sky-500/30",
    corBarra: "bg-sky-400",
  },
  raiva: {
    titulo: "Raiva",
    emoji: "😠",
    corTexto: "text-rose-400",
    corBg: "bg-rose-500/15 border-rose-500/30",
    corBarra: "bg-rose-500",
  },
  nojo: {
    titulo: "Nojo",
    emoji: "🤢",
    corTexto: "text-lime-400",
    corBg: "bg-lime-500/15 border-lime-500/30",
    corBarra: "bg-lime-500",
  },
  medo: {
    titulo: "Medo",
    emoji: "😨",
    corTexto: "text-purple-400",
    corBg: "bg-purple-500/15 border-purple-500/30",
    corBarra: "bg-purple-500",
  },
  inconclusivo: {
    titulo: "Inconclusivo",
    emoji: "🤔",
    corTexto: "text-orange-300",
    corBg: "bg-orange-500/15 border-orange-500/30",
    corBarra: "bg-orange-400",
  },
};

function obterMeta(r: AnaliseResultado | null) {
  if (!r) {
    return {
      titulo: "Aguardando captura",
      emoji: "📷",
      corTexto: "text-slate-400",
      corBg: "bg-slate-800/60 border-slate-700/60",
      corBarra: "bg-slate-600",
    };
  }
  if (r.status === "NO_FACE_DETECTED") {
    return {
      titulo: "Nenhum rosto detectado",
      emoji: "👤",
      corTexto: "text-slate-400",
      corBg: "bg-slate-800/60 border-slate-700",
      corBarra: "bg-slate-600",
    };
  }
  const chave = r.status === "INCONCLUSIVE" ? "inconclusivo" : r.label || "inconclusivo";
  return META_EXPRESSOES[chave] || META_EXPRESSOES.inconclusivo;
}

export default function DashboardPage() {
  const [senha, setSenha] = useState<string>("");
  const [inputSenha, setInputSenha] = useState<string>("");
  const [autenticado, setAutenticado] = useState<boolean>(false);
  const [verificandoAuth, setVerificandoAuth] = useState<boolean>(true);
  const [erroLogin, setErroLogin] = useState<string>("");

  const [dados, setDados] = useState<ResumoPainel | null>(null);
  const [online, setOnline] = useState<boolean>(true);
  const [enviandoFoto, setEnviandoFoto] = useState<boolean>(false);
  const [mensagemEnvio, setMensagemEnvio] = useState<string>("");

  // Estado da Webcam (Simulador ESP32 no navegador)
  const [abaTeste, setAbaTeste] = useState<"webcam" | "upload">("webcam");
  const [webcamAtiva, setWebcamAtiva] = useState<boolean>(false);
  const [autoEnvio, setAutoEnvio] = useState<boolean>(false);
  const [intervaloAutoS, setIntervaloAutoS] = useState<number>(5);
  const [erroWebcam, setErroWebcam] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const validarSenha = useCallback(async (candidata: string) => {
    try {
      const resp = await fetch("/api/auth/verificar", {
        headers: { "X-Web-Password": candidata },
      });
      if (resp.ok) {
        setSenha(candidata);
        setAutenticado(true);
        setErroLogin("");
        sessionStorage.setItem("exp_senha_web", candidata);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const salva = sessionStorage.getItem("exp_senha_web");
    if (salva) {
      validarSenha(salva).finally(() => setVerificandoAuth(false));
    } else {
      setVerificandoAuth(false);
    }
  }, [validarSenha]);

  const buscarUltimo = useCallback(async () => {
    if (!autenticado || !senha) return;
    try {
      const resp = await fetch("/api/ultimo", {
        headers: { "X-Web-Password": senha },
        cache: "no-store",
      });
      if (resp.status === 401) {
        setAutenticado(false);
        sessionStorage.removeItem("exp_senha_web");
        return;
      }
      if (!resp.ok) throw new Error();
      const json: ResumoPainel = await resp.json();
      setDados(json);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [autenticado, senha]);

  useEffect(() => {
    if (!autenticado) return;
    buscarUltimo();
    const id = setInterval(buscarUltimo, 2000);
    return () => clearInterval(id);
  }, [autenticado, buscarUltimo]);

  const enviarBytesImagem = useCallback(
    async (blob: Blob | File, origem: string) => {
      setEnviandoFoto(true);
      setMensagemEnvio("Analisando com YuNet + HSEmotion...");
      try {
        const resp = await fetch("/api/analisar", {
          method: "POST",
          headers: {
            "Content-Type": "image/jpeg",
            "X-Web-Password": senha,
            "X-Origem": origem,
          },
          body: blob,
        });
        const d = await resp.json();
        if (!resp.ok) {
          setMensagemEnvio(d.error || "Erro ao analisar imagem.");
        } else {
          const meta = obterMeta(d);
          const conf = d.confidence ? ` (${Math.round(d.confidence * 100)}%)` : "";
          setMensagemEnvio(`${meta.emoji} ${meta.titulo}${conf}`);
          await buscarUltimo();
        }
      } catch {
        setMensagemEnvio("Falha de comunicação com o servidor.");
      } finally {
        setEnviandoFoto(false);
      }
    },
    [senha, buscarUltimo]
  );

  // Controle da Webcam no navegador
  const pararWebcam = useCallback(() => {
    setAutoEnvio(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamAtiva(false);
  }, []);

  const iniciarWebcam = async () => {
    setErroWebcam("");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não suporta acesso à webcam neste endereço.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setWebcamAtiva(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Não foi possível acessar a webcam. Verifique as permissões ou use a aba de Upload.";
      setErroWebcam(msg);
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const capturarQuadroWebcam = useCallback(
    async (origem = "webcam (navegador)") => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            enviarBytesImagem(blob, origem);
          }
        },
        "image/jpeg",
        0.88
      );
    },
    [enviarBytesImagem]
  );

  useEffect(() => {
    if (!webcamAtiva || !autoEnvio) return;
    capturarQuadroWebcam("simulador esp32 (web)");
    const timer = setInterval(() => {
      capturarQuadroWebcam("simulador esp32 (web)");
    }, intervaloAutoS * 1000);
    return () => clearInterval(timer);
  }, [webcamAtiva, autoEnvio, intervaloAutoS, capturarQuadroWebcam]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroLogin("");
    const ok = await validarSenha(inputSenha.trim());
    if (!ok) {
      setErroLogin("Senha incorreta ou servidor offline. Confira pc/senha_web.txt.");
    }
  };

  const handleLogout = () => {
    pararWebcam();
    sessionStorage.removeItem("exp_senha_web");
    setSenha("");
    setInputSenha("");
    setAutenticado(false);
  };

  if (verificandoAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090d16] text-slate-300">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span>Conectando ao servidor de expressões...</span>
        </div>
      </div>
    );
  }

  if (!autenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-[#090d16] to-[#090d16]">
        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ESP32-CAM Expressões</h1>
              <p className="text-xs text-slate-400">Visão Computacional • YuNet + HSEmotion</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 mb-6 leading-relaxed">
            Digite a senha de acesso ao painel gerada pelo servidor (disponível no terminal ou em{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 text-xs">
              pc/senha_web.txt
            </code>
            ).
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Senha do Painel Web
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={inputSenha}
                  onChange={(e) => setInputSenha(e.target.value)}
                  placeholder="Insira a senha..."
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {erroLogin && (
              <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{erroLogin}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition cursor-pointer"
            >
              Acessar Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  const metaAtual = obterMeta(dados?.resultado || null);
  const confiancaPct = dados?.resultado?.confidence
    ? Math.round(dados.resultado.confidence * 100)
    : 0;
  const semFotosRecentes =
    dados?.idade_s !== null && dados?.idade_s !== undefined && dados.idade_s > 45;

  // Contagem rápida por expressão no histórico
  const contagemHistorico: Record<string, number> = {};
  for (const item of dados?.historico || []) {
    const k =
      item.status === "NO_FACE_DETECTED"
        ? "sem rosto"
        : item.status === "INCONCLUSIVE"
        ? "inconclusivo"
        : item.label || "outro";
    contagemHistorico[k] = (contagemHistorico[k] || 0) + 1;
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Análise de Expressões Faciais
              </h1>
              <p className="text-xs text-slate-400">
                O resultado indica a expressão aparente na imagem, não o estado emocional real da
                pessoa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                online
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  online ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                }`}
              />
              {online ? "API Conectada" : "Sem conexão com o servidor"}
            </div>

            <button
              onClick={handleLogout}
              title="Sair"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Coluna Esquerda (7 cols): Captura Atual + Simulador Webcam / Upload */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card da Última Foto Analisada */}
          <section className="bg-slate-900/70 border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">Último Quadro Analisado</h2>
              </div>

              {dados?.numero ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Origem: <strong className="text-white">{dados.origem}</strong>
                  </span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    há {Math.round(dados.idade_s || 0)}s
                  </span>
                </div>
              ) : null}
            </div>

            {semFotosRecentes && (
              <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Nenhuma foto nova há {Math.round(dados?.idade_s || 0)}s. Verifique o ESP32 ou
                  use o simulador de webcam abaixo.
                </span>
              </div>
            )}

            <div className="p-4 flex items-center justify-center bg-slate-950/60 min-h-[280px] sm:min-h-[340px]">
              {dados?.numero ? (
                <img
                  src={`/api/foto?n=${dados.numero}&senha=${encodeURIComponent(senha)}`}
                  alt="Última foto analisada"
                  className="max-h-[380px] w-auto rounded-xl object-contain border border-slate-800 shadow-lg"
                />
              ) : (
                <div className="text-center py-12 px-4 space-y-2">
                  <Camera className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-medium text-slate-400">
                    Aguardando a primeira foto do ESP32-CAM ou da Webcam...
                  </p>
                  <p className="text-xs text-slate-500">
                    Ative a webcam abaixo ou envie uma imagem para testar imediatamente.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Card Simulador de Webcam (Sem ESP32) & Upload Manual */}
          <section className="bg-slate-900/70 border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">
                  Estação de Captura & Simulador ESP32
                </h2>
              </div>

              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setAbaTeste("webcam")}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                    abaTeste === "webcam"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Webcam ao Vivo
                </button>
                <button
                  type="button"
                  onClick={() => setAbaTeste("upload")}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                    abaTeste === "upload"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Enviar Arquivo
                </button>
              </div>
            </div>

            <div className="p-5">
              {abaTeste === "webcam" ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400">
                    Sem o ESP32-CAM em mãos? Use a webcam do seu computador para enviar quadros
                    avulsos ou simular o envio periódico automático da placa (a cada 5 segundos).
                  </p>

                  {erroWebcam && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                      {erroWebcam}
                    </div>
                  )}

                  {webcamAtiva ? (
                    <div className="space-y-4">
                      <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="max-h-[280px] w-auto object-contain"
                        />
                        {autoEnvio && (
                          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-indigo-600/90 text-white text-xs font-medium flex items-center gap-1.5 shadow">
                            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                            Simulando ESP32 (a cada {intervaloAutoS}s)
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          disabled={enviandoFoto}
                          onClick={() => capturarQuadroWebcam("webcam (navegador)")}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Capturar e Analisar Agora</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAutoEnvio((v) => !v)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            autoEnvio
                              ? "bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25"
                              : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                          }`}
                        >
                          {autoEnvio ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Pausar Envio Automático</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Simular Placa (Auto {intervaloAutoS}s)</span>
                            </>
                          )}
                        </button>

                        <select
                          value={intervaloAutoS}
                          onChange={(e) => setIntervaloAutoS(Number(e.target.value))}
                          className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300"
                          aria-label="Intervalo de envio automático"
                        >
                          <option value={2}>2s</option>
                          <option value={5}>5s (Padrão ESP32)</option>
                          <option value={10}>10s</option>
                        </select>

                        <button
                          type="button"
                          onClick={pararWebcam}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-medium ml-auto transition cursor-pointer"
                        >
                          <VideoOff className="w-3.5 h-3.5" />
                          <span>Desligar Webcam</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={iniciarWebcam}
                      className="w-full py-6 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-300 transition cursor-pointer bg-slate-950/40"
                    >
                      <Video className="w-7 h-7" />
                      <span className="text-sm font-medium">Clique para Ativar a Webcam</span>
                      <span className="text-xs text-slate-500">
                        Permite capturar fotos ao vivo ou simular o ciclo automático do ESP32-CAM
                      </span>
                    </button>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="w-full py-8 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-300 transition cursor-pointer bg-slate-950/40">
                    <Upload className="w-7 h-7" />
                    <span className="text-sm font-medium">
                      Escolher uma foto com rosto para analisar
                    </span>
                    <span className="text-xs text-slate-500">Formatos suportados: JPG, PNG, WEBP (máx. 5 MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const arq = e.target.files?.[0];
                        if (arq) enviarBytesImagem(arq, "teste manual");
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              )}

              {mensagemEnvio && (
                <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">{mensagemEnvio}</span>
                  {enviandoFoto && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Coluna Direita (5 cols): Diagnóstico Atual + Estatísticas + Histórico */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card de Resultado Principal */}
          <section className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">Diagnóstico da Expressão</h2>
              </div>
              {dados?.resultado && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  {dados.resultado.faces}{" "}
                  {dados.resultado.faces === 1 ? "rosto detectado" : "rostos detectados"}
                </span>
              )}
            </div>

            <div className={`p-5 rounded-2xl border ${metaAtual.corBg} flex items-center gap-4`}>
              <div className="text-4xl sm:text-5xl select-none">{metaAtual.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                  Expressão Aparente
                </div>
                <div className={`text-2xl sm:text-3xl font-extrabold truncate ${metaAtual.corTexto}`}>
                  {metaAtual.titulo}
                </div>
                {dados?.resultado?.expression && (
                  <div className="text-xs text-slate-400 mt-0.5">
                    Classe FER/AffectNet: <code className="text-slate-300">{dados.resultado.expression}</code>
                  </div>
                )}
              </div>
            </div>

            {/* Barra de Confiança */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Grau de Confiança (HSEmotion)</span>
                <span className="font-bold text-white">{confiancaPct}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-500 ${metaAtual.corBarra}`}
                  style={{ width: `${confiancaPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>0%</span>
                <span>Limiar mínimo: 40%</span>
                <span>100%</span>
              </div>
            </div>
          </section>

          {/* Resumo da Sessão */}
          {Object.keys(contagemHistorico).length > 0 && (
            <section className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 shadow-xl space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Distribuição Recente ({dados?.historico.length || 0} capturas)
              </h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(contagemHistorico).map(([rotulo, qtd]) => (
                  <span
                    key={rotulo}
                    className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5"
                  >
                    <span className="capitalize font-medium text-white">{rotulo}</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 font-bold">
                      {qtd}
                    </span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Tabela de Histórico */}
          <section className="bg-slate-900/70 border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">Últimos Resultados</h2>
              </div>
              <span className="text-xs text-slate-400">Total na sessão: #{dados?.numero || 0}</span>
            </div>

            <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Hora</th>
                    <th className="py-2.5 px-4 font-medium">Resultado</th>
                    <th className="py-2.5 px-4 font-medium">Confiança</th>
                    <th className="py-2.5 px-4 font-medium">Origem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {dados?.historico && dados.historico.length > 0 ? (
                    dados.historico.map((h, i) => {
                      const m = obterMeta(h);
                      const pct = h.confidence ? `${Math.round(h.confidence * 100)}%` : "—";
                      return (
                        <tr key={`${h.hora}-${i}`} className="hover:bg-slate-800/30 transition">
                          <td className="py-2.5 px-4 font-mono text-slate-400">{h.hora}</td>
                          <td className="py-2.5 px-4">
                            <span className={`font-semibold ${m.corTexto}`}>
                              {m.emoji} {m.titulo}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-300 font-medium">{pct}</td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                              {h.origem}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        Nenhum registro analisado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
