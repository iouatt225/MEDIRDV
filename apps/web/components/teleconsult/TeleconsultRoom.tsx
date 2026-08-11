'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BadgeAlert,
  CameraOff,
  Clock3,
  Mic,
  MicOff,
  PhoneOff,
  ShieldAlert,
  Sparkles,
  UserRound,
  Users,
  Video,
  VideoOff,
} from 'lucide-react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { apiClient } from '@/lib/api/client';
import { Appointment } from '@/types/appointments';

type TeleconsultRole = 'patient' | 'medecin';

interface TeleconsultRoomProps {
  appointmentId: string;
  role: TeleconsultRole;
  backHref: string;
  backLabel: string;
  exitHref: string;
}

interface TokenResponse {
  token: string;
  video_url: string;
}

type CallFrame = {
  join: (options: { url: string }) => Promise<void>;
  leave: () => Promise<void>;
  destroy: () => void;
  on: (event: string, handler: () => void) => void;
};

type DeviceTestState = 'idle' | 'checking' | 'ready' | 'error';

type SessionPresence = 'waiting' | 'connected' | 'simulation';

function formatDateTime(value: string | null) {
  if (!value) return 'Date inconnue';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatWindowStart(value: string | null) {
  if (!value) return 'Date inconnue';
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatClock(value: number | null) {
  if (!value) return 'En attente';

  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function statusLabel(status: Appointment['status']) {
  switch (status) {
    case 'confirme':
      return 'Confirme';
    case 'annule':
      return 'Annule';
    case 'effectue':
      return 'Effectue';
    case 'manque':
      return 'Manque';
    default:
      return status;
  }
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export default function TeleconsultRoom({
  appointmentId,
  role,
  backHref,
  backLabel,
  exitHref,
}: TeleconsultRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const testVideoRef = useRef<HTMLVideoElement>(null);
  const isExitingRef = useRef(false);
  const sessionStartedAtRef = useRef<number | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [simulation, setSimulation] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [preJoinState, setPreJoinState] = useState<DeviceTestState>('idle');
  const [preJoinError, setPreJoinError] = useState<string | null>(null);
  const [previewMicActive, setPreviewMicActive] = useState(true);
  const [previewCamActive, setPreviewCamActive] = useState(true);
  const [callMicActive, setCallMicActive] = useState(true);
  const [callCamActive, setCallCamActive] = useState(true);
  const [preJoinStream, setPreJoinStream] = useState<MediaStream | null>(null);
  const [simulationStream, setSimulationStream] = useState<MediaStream | null>(null);
  const [callFrame, setCallFrame] = useState<CallFrame | null>(null);
  const [remotePresence, setRemotePresence] = useState<SessionPresence>('waiting');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionStatus, setSessionStatus] = useState('Prete a rejoindre');
  const [lastStatusChangeAt, setLastStatusChangeAt] = useState<number | null>(null);
  const counterpartLabel = role === 'medecin' ? 'Patient' : 'Medecin';

  const { data: appointment, isLoading } = useQuery<Appointment>({
    queryKey: ['teleconsult-appointment', appointmentId],
    queryFn: () => apiClient.get(`/api/v1/appointments/${appointmentId}`),
  });

  useEffect(() => {
    return () => {
      callFrame?.destroy();
      stopStream(preJoinStream);
      stopStream(simulationStream);
    };
  }, [callFrame, preJoinStream, simulationStream]);

  useEffect(() => {
    if (!isJoined) {
      sessionStartedAtRef.current = null;
      setElapsedSeconds(0);
      return;
    }

    const startedAt = Date.now();
    sessionStartedAtRef.current = startedAt;
    setElapsedSeconds(0);

    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isJoined]);

  const updateSessionState = (nextPresence: SessionPresence, nextStatus: string) => {
    setRemotePresence(nextPresence);
    setSessionStatus(nextStatus);
    setLastStatusChangeAt(Date.now());
  };

  const cleanupPreJoinTest = () => {
    stopStream(preJoinStream);
    setPreJoinStream(null);
    setPreJoinState('idle');
    setPreJoinError(null);
    setPreviewMicActive(true);
    setPreviewCamActive(true);

    if (testVideoRef.current) {
      testVideoRef.current.srcObject = null;
    }
  };

  const cleanupCallSession = () => {
    callFrame?.destroy();
    setCallFrame(null);
    stopStream(simulationStream);
    setSimulationStream(null);
    setIsJoined(false);
    setSimulation(false);
    updateSessionState('waiting', 'Session terminee');

    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
  };

  const exitRoom = () => {
    if (isExitingRef.current) {
      return;
    }

    isExitingRef.current = true;
    cleanupPreJoinTest();
    cleanupCallSession();
    window.location.href = exitHref;
  };

  const handleLeaveCall = async () => {
    try {
      await callFrame?.leave?.();
    } catch {
      // Le SDK peut deja etre en cours de fermeture.
    } finally {
      exitRoom();
    }
  };

  const startDeviceTest = async () => {
    try {
      setPreJoinError(null);
      setPreJoinState('checking');

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stopStream(preJoinStream);
      setPreJoinStream(stream);
      setPreviewMicActive(true);
      setPreviewCamActive(true);
      setPreJoinState('ready');

      if (testVideoRef.current) {
        testVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Pre-join device test failed', error);
      setPreJoinState('error');
      setPreJoinError("Impossible d'acceder a la camera ou au micro. Verifiez les permissions du navigateur.");
    }
  };

  const stopDeviceTest = () => {
    cleanupPreJoinTest();
  };

  const togglePreviewMic = () => {
    if (preJoinStream) {
      preJoinStream.getAudioTracks().forEach((track) => {
        track.enabled = !previewMicActive;
      });
    }
    setPreviewMicActive((current) => !current);
  };

  const togglePreviewCam = () => {
    if (preJoinStream) {
      preJoinStream.getVideoTracks().forEach((track) => {
        track.enabled = !previewCamActive;
      });
    }
    setPreviewCamActive((current) => !current);
  };

  const joinSimulation = async () => {
    cleanupPreJoinTest();
    isExitingRef.current = false;
    setSimulation(true);
    setIsJoined(true);
    updateSessionState('simulation', 'Mode test local');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setSimulationStream(stream);

      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }
    } catch {
      // Fallback visuel sans flux local.
    }
  };

  const joinRealRoom = async () => {
    if (!appointment) return;

    try {
      if (preJoinState !== 'ready' || !preJoinStream) {
        setPreJoinError("Lancez d'abord le test camera et micro avant d'entrer dans la salle.");
        setPreJoinState('error');
        return;
      }

      isExitingRef.current = false;
      cleanupPreJoinTest();
      cleanupCallSession();
      setIsJoining(true);
      setTokenError(false);
      updateSessionState('waiting', 'Connexion a Daily');

      const res = await apiClient.get<TokenResponse>(`/api/v1/teleconsult/${appointmentId}/token`);
      const DailyIframe = (await import('@daily-co/daily-js')).default;

      if (!containerRef.current) return;
      containerRef.current.innerHTML = '';

      const frame = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: '0',
          borderRadius: '24px',
        },
        showLeaveButton: false,
        showFullscreenButton: true,
        showLocalVideo: true,
      }) as CallFrame;

      frame.on('left-meeting', () => {
        exitRoom();
      });

      frame.on('joined-meeting', () => {
        updateSessionState('waiting', 'Session en cours');
      });

      frame.on('participant-joined', () => {
        updateSessionState('connected', 'Correspondant connecte');
      });

      frame.on('participant-left', () => {
        updateSessionState('waiting', 'Correspondant en attente');
      });

      await frame.join({ url: `${res.video_url}?token=${res.token}` });
      setCallFrame(frame);
      setIsJoined(true);
      setSimulation(false);
      updateSessionState('waiting', 'Salle ouverte');
      setLastStatusChangeAt(Date.now());
    } catch (error) {
      console.error('Daily join failed', error);
      setTokenError(true);
      setLastStatusChangeAt(Date.now());
      setSessionStatus('Impossible de rejoindre la salle');
    } finally {
      setIsJoining(false);
    }
  };

  const toggleCallMic = () => {
    if (simulationStream) {
      simulationStream.getAudioTracks().forEach((track) => {
        track.enabled = !callMicActive;
      });
    }
    setCallMicActive((current) => !current);
  };

  const toggleCallCam = () => {
    if (simulationStream) {
      simulationStream.getVideoTracks().forEach((track) => {
        track.enabled = !callCamActive;
      });
    }
    setCallCamActive((current) => !current);
  };

  const participantName =
    role === 'medecin'
      ? `${appointment?.patient?.first_name ?? 'Patient'} ${appointment?.patient?.last_name ?? ''}`.trim()
      : `${appointment?.doctor?.first_name ?? 'Medecin'} ${appointment?.doctor?.last_name ?? ''}`.trim();

  const participantDetails =
    role === 'medecin'
      ? appointment?.patient?.address || appointment?.patient?.phone || 'Coordonnees patient'
      : appointment?.doctor?.specialty || appointment?.doctor?.cabinet_name || 'Profil medecin';

  const isJoinAvailable = Boolean(appointment?.video_url);
  const hasPreview = Boolean(preJoinStream);
  const preJoinReady = preJoinState === 'ready' && Boolean(preJoinStream);
  const canJoinRoom = isJoinAvailable && preJoinReady && !isJoining;
  const presenceLabel =
    remotePresence === 'connected'
      ? 'Correspondant present'
      : remotePresence === 'simulation'
        ? 'Simulation locale'
        : 'En attente du correspondant';
  const statusUpdatedLabel = formatClock(lastStatusChangeAt);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,168,188,0.16),_transparent_25%),linear-gradient(180deg,_#eef9fc_0%,_#f8fcfd_100%)] px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-accent">
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        {!isJoined ? (
          <section className="grid gap-6 xl:grid-cols-[0.95fr_0.65fr]">
            <Card hoverable={false} className="border border-white/70 bg-white/85 p-8 shadow-[0_24px_80px_rgba(8,54,59,0.12)]">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                Salle securisee
              </div>
              <h1 className="mt-4 text-3xl font-extrabold text-primary lg:text-5xl">
                {role === 'medecin' ? 'Demarrer la consultation video' : 'Votre rendez-vous video'}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-text lg:text-base">
                {role === 'medecin'
                  ? 'Accedez au salon prive du rendez-vous. Le lien reste limite a la fenetre autorisee et aux participants designes.'
                  : 'Preparez votre session video. Le lien devient actif uniquement dans la fenetre du rendez-vous et la salle reste privee.'}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-secondary/60 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-text/55">{counterpartLabel}</p>
                  <p className="mt-2 text-xl font-bold text-primary">{participantName}</p>
                  <p className="mt-1 text-sm text-text/65">{participantDetails}</p>
                </div>
                <div className="rounded-3xl bg-secondary/60 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-text/55">Rendez-vous</p>
                  <p className="mt-2 text-xl font-bold text-primary">{formatDateTime(appointment?.slot_start ?? null)}</p>
                  <p className="mt-1 text-sm text-text/65">Statut: {statusLabel(appointment?.status ?? 'confirme')}</p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button onClick={joinRealRoom} loading={isJoining} disabled={!canJoinRoom}>
                  Rejoindre l'appel video
                </Button>
                <Button variant="secondary" onClick={startDeviceTest}>
                  Tester camera et micro
                </Button>
                <Button variant="secondary" onClick={() => window.location.reload()}>
                  Actualiser
                </Button>
              </div>

              {!isJoinAvailable ? (
                <div className="mt-6 rounded-3xl border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
                  Ce rendez-vous n'est pas encore configure pour la video.
                </div>
              ) : null}

              {tokenError ? (
                <div className="mt-4 rounded-3xl border border-error/20 bg-error/10 p-4 text-sm text-error">
                  Acces refuse ou salon indisponible pour le moment. Vous pouvez essayer le mode test.
                </div>
              ) : null}

              <div className="mt-6 rounded-3xl border border-divider bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Pre-join requis</p>
                <div className="mt-3 grid gap-3 text-sm text-text/70 sm:grid-cols-3">
                  <div className="rounded-2xl bg-secondary/50 p-3">
                    <p className="font-semibold text-primary">Camera et micro</p>
                    <p className="mt-1">{preJoinReady ? 'Test valide' : 'A valider avant d’entrer'}</p>
                  </div>
                  <div className="rounded-2xl bg-secondary/50 p-3">
                    <p className="font-semibold text-primary">Acces</p>
                    <p className="mt-1">{isJoinAvailable ? 'Lien de salon pret' : 'Salle non configuree'}</p>
                  </div>
                  <div className="rounded-2xl bg-secondary/50 p-3">
                    <p className="font-semibold text-primary">Etat actuel</p>
                    <p className="mt-1">{sessionStatus}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-text/55">
                  L'aperçu local doit etre actif avant la connexion. Cela evite d'entrer sans autorisation camera/micro.
                </p>
              </div>
            </Card>

            <Card hoverable={false} className="border border-white/70 bg-white/85 p-6 shadow-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Pre-join</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Test camera et micro</h2>
                </div>
                <ShieldAlert className="h-10 w-10 text-accent" />
              </div>

              <div className="mt-6 overflow-hidden rounded-[28px] border border-divider bg-slate-950 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                {hasPreview ? (
                  <div className="relative aspect-[4/3]">
                    <video ref={testVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                    <div className="absolute inset-x-3 top-3 flex gap-2">
                      <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                        Camera {previewCamActive ? 'active' : 'desactivee'}
                      </span>
                      <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                        Micro {previewMicActive ? 'actif' : 'coupe'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center text-center text-white/55">
                    <div>
                      <Video className="mx-auto h-14 w-14" />
                      <p className="mt-3 text-lg font-semibold">Lancez un test avant d'entrer</p>
                      <p className="mt-1 text-sm">Permissions camera et micro, puis apercu local.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button onClick={startDeviceTest} loading={preJoinState === 'checking'} variant="secondary">
                  {preJoinState === 'ready' ? 'Relancer le test' : 'Demarrer le test'}
                </Button>
                <Button onClick={stopDeviceTest} variant="secondary" disabled={!hasPreview}>
                  Arreter le test
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-text">
                  Etat: {preJoinState === 'ready' ? 'Pret' : preJoinState === 'checking' ? 'Verification' : preJoinState === 'error' ? 'Erreur' : 'Inactif'}
                </span>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-text">
                  {hasPreview ? 'Apercu video actif' : 'Aucun flux pre-join'}
                </span>
              </div>

              {preJoinError ? (
                <div className="mt-4 rounded-3xl border border-error/20 bg-error/10 p-4 text-sm text-error">
                  {preJoinError}
                </div>
              ) : null}

              <div className="mt-4 flex gap-3">
                <button
                  onClick={togglePreviewMic}
                  disabled={!hasPreview}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    previewMicActive ? 'bg-primary text-white' : 'bg-error text-white'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {previewMicActive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  Micro
                </button>
                <button
                  onClick={togglePreviewCam}
                  disabled={!hasPreview}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    previewCamActive ? 'bg-primary text-white' : 'bg-error text-white'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {previewCamActive ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  Camera
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  { title: 'Fenetre autorisee', desc: '±15 minutes autour du rendez-vous.' },
                  { title: 'Salon prive', desc: 'Acces reserve aux participants du RDV.' },
                  { title: 'Audio video', desc: "Camera et micro sont testes avant l'entree." },
                ].map((item) => (
                  <div key={item.title} className="rounded-3xl border border-divider bg-white p-4">
                    <p className="font-semibold text-primary">{item.title}</p>
                    <p className="mt-1 text-sm text-text/65">{item.desc}</p>
                  </div>
                ))}
              </div>

              {tokenError ? (
                <Button variant="secondary" className="mt-6 w-full" onClick={joinSimulation}>
                  Lancer le mode test local
                </Button>
              ) : null}
            </Card>
          </section>
        ) : (
          <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <Card hoverable={false} className="overflow-hidden border border-white/70 bg-white/85 p-0 shadow-[0_24px_80px_rgba(8,54,59,0.12)]">
              {!simulation ? (
                <div className="relative min-h-[640px] bg-primary">
                  <div ref={containerRef} className="absolute inset-0" />
                  <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-white backdrop-blur-md">
                    <Video className="h-4 w-4 text-accent" />
                    Session en direct
                  </div>
                  <div className="absolute right-4 top-4 z-10 rounded-3xl border border-white/15 bg-slate-950/70 px-4 py-3 text-white backdrop-blur-xl">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-white/55">
                      <Clock3 className="h-3.5 w-3.5" />
                      Statut temps reel
                    </div>
                    <div className="mt-3 grid gap-2">
                      <div className="flex items-center justify-between gap-6">
                        <span className="inline-flex items-center gap-2 text-sm text-white/75">
                          <Users className="h-4 w-4 text-accent" />
                          Presence
                        </span>
                        <span className="text-sm font-semibold text-white">{presenceLabel}</span>
                      </div>
                      <div className="flex items-center justify-between gap-6">
                        <span className="inline-flex items-center gap-2 text-sm text-white/75">
                          <Clock3 className="h-4 w-4 text-accent" />
                          Duree
                        </span>
                        <span className="text-sm font-semibold text-white">{isJoined ? formatDuration(elapsedSeconds) : '00:00'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-6">
                        <span className="inline-flex items-center gap-2 text-sm text-white/75">
                          <UserRound className="h-4 w-4 text-accent" />
                          Session
                        </span>
                        <span className="text-sm font-semibold text-white">{sessionStatus}</span>
                      </div>
                      <div className="flex items-center justify-between gap-6">
                        <span className="inline-flex items-center gap-2 text-sm text-white/75">
                          <BadgeAlert className="h-4 w-4 text-accent" />
                          Mis a jour
                        </span>
                        <span className="text-sm font-semibold text-white">{statusUpdatedLabel}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleLeaveCall}
                    className="absolute right-4 top-[7.5rem] z-10 inline-flex items-center gap-2 rounded-full bg-error px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                  >
                    <PhoneOff className="h-4 w-4" />
                    Quitter
                  </button>
                </div>
              ) : (
                <div className="relative min-h-[640px] overflow-hidden bg-slate-950">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white/55">
                      <Video className="mx-auto h-14 w-14 animate-pulse" />
                      <p className="mt-3 text-lg font-semibold">
                        {role === 'medecin' ? 'Patient connecte (Simulation)' : 'Medecin connecte (Simulation)'}
                      </p>
                      <p className="mt-1 text-sm">Le flux reel est remplace par un mode local de test.</p>
                    </div>
                  </div>

                  <div className="absolute right-4 top-4 z-10 rounded-3xl border border-white/15 bg-slate-950/70 px-4 py-3 text-white backdrop-blur-xl">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-white/55">
                      <Clock3 className="h-3.5 w-3.5" />
                      Statut temps reel
                    </div>
                    <div className="mt-3 grid gap-2">
                      <div className="flex items-center justify-between gap-6">
                        <span className="inline-flex items-center gap-2 text-sm text-white/75">
                          <Users className="h-4 w-4 text-accent" />
                          Presence
                        </span>
                        <span className="text-sm font-semibold text-white">{presenceLabel}</span>
                      </div>
                      <div className="flex items-center justify-between gap-6">
                        <span className="inline-flex items-center gap-2 text-sm text-white/75">
                          <Clock3 className="h-4 w-4 text-accent" />
                          Duree
                        </span>
                        <span className="text-sm font-semibold text-white">{formatDuration(elapsedSeconds)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-6">
                        <span className="inline-flex items-center gap-2 text-sm text-white/75">
                          <UserRound className="h-4 w-4 text-accent" />
                          Session
                        </span>
                        <span className="text-sm font-semibold text-white">{sessionStatus}</span>
                      </div>
                      <div className="flex items-center justify-between gap-6">
                        <span className="inline-flex items-center gap-2 text-sm text-white/75">
                          <BadgeAlert className="h-4 w-4 text-accent" />
                          Mis a jour
                        </span>
                        <span className="text-sm font-semibold text-white">{statusUpdatedLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-20 right-4 h-32 w-48 overflow-hidden rounded-2xl border border-white/20 bg-black shadow-xl">
                    {callCamActive && simulationStream ? (
                      <video ref={previewVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-800 text-white/40">
                        <CameraOff className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3 rounded-full border border-white/10 bg-black/60 px-6 py-3 backdrop-blur-md">
                    <button
                      onClick={toggleCallMic}
                      className={`rounded-full p-3 transition ${callMicActive ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-error text-white'}`}
                      title={callMicActive ? 'Couper le micro' : 'Rallumer le micro'}
                    >
                      {callMicActive ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={toggleCallCam}
                      className={`rounded-full p-3 transition ${callCamActive ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-error text-white'}`}
                      title={callCamActive ? 'Couper la camera' : 'Rallumer la camera'}
                    >
                      {callCamActive ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={handleLeaveCall}
                      className="rounded-full bg-error p-3 text-white transition hover:opacity-90"
                      title="Quitter"
                    >
                      <PhoneOff className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </Card>

            <Card hoverable={false} className="border border-white/70 bg-white/85 p-6 shadow-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Session</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Informations du rendez-vous</h2>
                </div>
                <BadgeAlert className="h-10 w-10 text-accent" />
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-3xl bg-secondary/60 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Interlocuteur</p>
                  <p className="mt-2 text-xl font-bold text-primary">{participantName}</p>
                  <p className="mt-1 text-sm text-text/65">{participantDetails}</p>
                </div>
                <div className="rounded-3xl bg-secondary/60 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Creneau</p>
                  <p className="mt-2 text-lg font-bold text-primary">{formatDateTime(appointment?.slot_start ?? null)}</p>
                  <p className="mt-1 text-sm text-text/65">
                    Fenetre d'acces: {formatWindowStart(appointment?.slot_start ?? null)} a {formatWindowStart(appointment?.slot_end ?? null)}
                  </p>
                </div>
                <div className="rounded-3xl bg-secondary/60 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-text/55">Statut</p>
                  <p className="mt-2 text-lg font-bold text-primary">{statusLabel(appointment?.status ?? 'confirme')}</p>
                  <p className="mt-1 text-sm text-text/65">Salon video prive Daily.co</p>
                </div>
              </div>

              {!simulation ? (
                <div className="mt-6 rounded-3xl border border-divider bg-white p-4 text-sm text-text/70">
                  Utilisez les controles d'appel natifs pour gerer le flux audio et video.
                </div>
              ) : null}
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
