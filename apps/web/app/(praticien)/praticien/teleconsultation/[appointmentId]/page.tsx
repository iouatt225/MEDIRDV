'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Video, Mic, MicOff, VideoOff, Send, MessageSquare, ShieldAlert, PhoneOff } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Appointment } from '@/types/appointments';
import RequireRole from '@/components/auth/RequireRole';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function PraticienTeleconsultationPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = use(params);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Call state
  const [joined, setJoined] = useState(false);
  const [simulation, setSimulation] = useState(false);
  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);
  const chatOpen = true;
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: string; text: string }>>([
    { sender: 'Système', text: 'Salon médecin activé. Liaison de visioconférence sécurisée.' },
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [callFrame, setCallFrame] = useState<any>(null);
  const [tokenError, setTokenError] = useState(false);

  // Local media stream (for simulation)
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Fetch appointment info
  const { data: appointment, isLoading } = useQuery<Appointment>({
    queryKey: ['teleconsult-appointment', appointmentId],
    queryFn: () => apiClient.get(`/api/v1/appointments/${appointmentId}`),
  });

  // Handle joining real Daily call
  const handleJoinCall = async () => {
    try {
      setTokenError(false);
      
      // 1. Fetch token from backend
      interface TokenResponse {
        token: string;
        video_url: string;
      }
      const res = await apiClient.get<TokenResponse>(`/api/v1/teleconsult/${appointmentId}/token`);

      // 2. Load Daily SDK dynamically and join
      const DailyIframe = (await import('@daily-co/daily-js')).default;

      if (containerRef.current) {
        containerRef.current.innerHTML = '';

        const frame = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: '0',
            borderRadius: '12px',
          },
          showLeaveButton: true,
        });

        frame.on('left-meeting', () => {
          setJoined(false);
          // Redirect to agenda
          window.location.href = '/praticien/agenda';
        });

        await frame.join({ url: `${res.video_url}?token=${res.token}` });
        setCallFrame(frame);
        setJoined(true);
      }
    } catch (err) {
      console.error('Daily connection failed, switching to simulation option:', err);
      setTokenError(true);
    }
  };

  // Handle joining simulated video room (for offline / testing validation)
  const handleStartSimulation = async () => {
    setSimulation(true);
    setJoined(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn('Webcam unavailable, using mock canvas instead:', e);
    }
  };

  // Clean up streams on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (callFrame) {
        callFrame.destroy();
      }
    };
  }, [localStream, callFrame]);

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = !micActive));
    }
    setMicActive(!micActive);
  };

  const toggleCam = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = !camActive));
    }
    setCamActive(!camActive);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    setChatHistory((prev) => [...prev, { sender: 'Vous (Dr)', text: chatMessage }]);
    setChatMessage('');

    // Simulate patient reply after 2 seconds
    setTimeout(() => {
      setChatHistory((prev) => [
        ...prev,
        { sender: 'Patient', text: 'Entendu Docteur, je comprends parfaitement.' },
      ]);
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <RequireRole allowedRoles={['medecin']}>
      <div className="pt-28 pb-16 min-h-screen bg-secondary flex flex-col justify-center">
        <div className="max-w-[1200px] w-full mx-auto px-4 flex-1 flex flex-col">
          
          {/* Waiting Room & Verification (Not joined yet) */}
          {!joined && (
            <div className="max-w-[600px] mx-auto w-full space-y-6 my-auto">
              <Link href="/praticien/agenda" className="inline-flex items-center gap-2 text-primary hover:text-accent font-semibold transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Retour à l&apos;agenda
              </Link>

              <Card hoverable={false} className="p-8 bg-white border border-divider text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent mx-auto">
                  <Video className="w-8 h-8" />
                </div>
                
                <div>
                  <span className="text-xs font-bold text-accent uppercase">Téléconsultation Praticien</span>
                  <h1 className="text-2xl font-bold text-primary mt-1">
                    Démarrer la consultation vidéo
                  </h1>
                  <p className="text-sm text-text mt-2">
                    {appointment ? `Patient : ${appointment.patient?.first_name} ${appointment.patient?.last_name}` : ''}
                  </p>
                </div>

                <div className="p-4 rounded bg-secondary/50 border border-divider text-xs text-text leading-relaxed">
                  L&apos;accès au salon vidéo est réservé aux participants désignés dans une fenêtre de ±15 minutes autour du rendez-vous.
                </div>

                <div className="space-y-3">
                  <Button fullWidth onClick={handleJoinCall}>
                    Démarrer la session (Daily.co)
                  </Button>
                  
                  {tokenError && (
                    <div className="space-y-3">
                      <div className="p-3 text-xs rounded bg-error/10 border border-error text-error text-center flex items-center gap-2 justify-center">
                        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                        Accès restreint ou clé API absente. Salon disponible à l&apos;heure du rendez-vous.
                      </div>
                      <Button fullWidth variant="secondary" onClick={handleStartSimulation}>
                        Lancer le simulateur de téléconsultation (Mode Test)
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Visioconference Session */}
          {joined && (
            <div className="flex-1 flex flex-col lg:flex-row gap-6 h-[600px] lg:h-[650px] my-auto">
              
              {/* Left Column: Video stream container */}
              <div className="flex-1 bg-primary rounded-xl overflow-hidden relative border border-divider-dark flex flex-col justify-center">
                {simulation ? (
                  /* SIMULATOR LAYOUT */
                  <div className="w-full h-full relative flex flex-col justify-between p-4">
                    {/* Simulated Patient Video */}
                    <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                      <div className="text-center text-white/50 space-y-3">
                        <Video className="w-12 h-12 mx-auto animate-pulse" />
                        <p className="text-sm font-semibold">Patient connecté (Simulation)</p>
                      </div>
                    </div>

                    {/* Simulated Doctor (Local) Video PIP */}
                    <div className="absolute bottom-20 right-4 w-40 h-28 bg-black rounded-lg overflow-hidden border border-white/20 shadow-lg z-10">
                      {camActive && localStream ? (
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white/40">
                          <VideoOff className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {/* Local Controls Bar */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 z-20">
                      <button
                        onClick={toggleMic}
                        className={`p-3 rounded-full border transition-all cursor-pointer ${
                          micActive
                            ? 'bg-slate-800 border-white/20 text-white hover:bg-slate-700'
                            : 'bg-error border-error text-white'
                        }`}
                      >
                        {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={toggleCam}
                        className={`p-3 rounded-full border transition-all cursor-pointer ${
                          camActive
                            ? 'bg-slate-800 border-white/20 text-white hover:bg-slate-700'
                            : 'bg-error border-error text-white'
                        }`}
                      >
                        {camActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => {
                          setJoined(false);
                          setSimulation(false);
                          window.location.href = '/praticien/agenda';
                        }}
                        className="p-3 rounded-full bg-error border-error text-white hover:bg-red-600 transition-all cursor-pointer"
                        title="Raccrocher"
                      >
                        <PhoneOff className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* REAL DAILY.CO LAYOUT */
                  <div ref={containerRef} className="w-full h-full" />
                )}
              </div>

              {/* Right Column: Chat side panel */}
              {chatOpen && (
                <div className="w-full lg:w-80 bg-white rounded-xl border border-divider flex flex-col shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-divider bg-secondary/30 flex items-center justify-between">
                    <span className="font-bold text-primary flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-accent" />
                      Chat de consultation
                    </span>
                    <Badge variant="info">Médecin</Badge>
                  </div>

                  {/* Messages list */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[400px] lg:max-h-[500px]">
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex flex-col ${msg.sender.startsWith('Vous') ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] text-text/60 mb-0.5 font-bold">{msg.sender}</span>
                        <div
                          className={`p-2.5 rounded-lg text-sm max-w-[85%] ${
                            msg.sender.startsWith('Vous')
                              ? 'bg-accent text-white'
                              : msg.sender === 'Système'
                              ? 'bg-secondary text-text italic'
                              : 'bg-secondary/70 text-primary'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handleSendChat} className="p-4 border-t border-divider flex gap-2">
                    <input
                      type="text"
                      placeholder="Tapez votre message..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      className="flex-1 rounded border border-divider p-2 text-sm text-primary outline-none focus:border-accent"
                    />
                    <button
                      type="submit"
                      className="p-2.5 rounded bg-accent text-white hover:bg-accent/90 transition-all flex items-center justify-center cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </RequireRole>
  );
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'info' }) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
        variant === 'info' ? 'bg-info/10 text-info border border-info/20' : 'bg-secondary text-text border border-divider'
      }`}
    >
      {children}
    </span>
  );
}
