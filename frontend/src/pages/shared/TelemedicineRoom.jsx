import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/Toast';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare,
  FileText, Plus, CheckCircle2, Share2, Clock, User, Send,
  Shield, Stethoscope, Download, ArrowLeft, AlertCircle, Sparkles,
  Volume2, VolumeX, Maximize, Minimize, Check, RefreshCw
} from 'lucide-react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

export default function TelemedicineRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const isDoctor = user?.role === 'DOCTOR';

  // Call states
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [peerInfo, setPeerInfo] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState('NONE'); // 'NONE' | 'NOTES' | 'CHAT'
  const [callDuration, setCallDuration] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isEnded, setIsEnded] = useState(false);

  // Doctor Clinical Notes & Prescriptions
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState([]);
  const [newMed, setNewMed] = useState({ medicationName: '', dosage: '', frequency: '', durationDays: 7, instructions: '' });
  const [followUpDate, setFollowUpDate] = useState('');

  // Refs for WebRTC & Audio/Video
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const durationTimerRef = useRef(null);

  // Fetch Room & Consultation Data
  const { data: roomData, isLoading } = useQuery({
    queryKey: ['consultation-room', roomId],
    queryFn: async () => {
      const res = await api.get(`/consultation/room/${roomId}`);
      return res.data.data;
    },
    enabled: !!roomId
  });

  const consultation = roomData?.consultation;
  const otherUser = isDoctor ? consultation?.patientUserId : consultation?.doctorUserId;

  // Initialize Local Media Stream and WebRTC Connection Immediately
  useEffect(() => {
    let localStream = null;

    async function startCall() {
      // 1. Get User Media
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true
          });
          localStreamRef.current = localStream;

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
        }
      } catch (err) {
        console.warn('Camera/Mic permission notice:', err.message);
      }

      // 2. Connect Socket.IO
      const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;
      const socket = io(backendUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5
      });
      socketRef.current = socket;

      // 3. Create WebRTC Peer Connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }

      pc.ontrack = (event) => {
        console.log('[WebRTC] Received remote stream:', event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setIsPeerConnected(true);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            roomId,
            candidate: event.candidate
          });
        }
      };

      // 4. Socket Events
      socket.emit('join-room', {
        roomId,
        userId: user?.id,
        role: user?.role,
        name: `${user?.firstName} ${user?.lastName}`
      });

      socket.on('room-ready', async ({ participants }) => {
        const other = participants.find(p => p.userId !== user?.id);
        if (other) {
          setPeerInfo(other);
          if (isDoctor) {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit('offer', { roomId, offer });
            } catch (e) {
              console.error('Offer error:', e);
            }
          }
        }
      });

      socket.on('user-joined', async (data) => {
        setPeerInfo(data);
        toast({ type: 'info', title: 'Consultation Room', message: `${data.name} has joined.` });
        if (isDoctor) {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('offer', { roomId, offer });
          } catch (e) {
            console.error('Offer error on join:', e);
          }
        }
      });

      socket.on('offer', async ({ offer }) => {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { roomId, answer });
          setIsPeerConnected(true);
        } catch (err) {
          console.error('Answer error:', err);
        }
      });

      socket.on('answer', async ({ answer }) => {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          setIsPeerConnected(true);
        } catch (err) {
          console.error('Set remote answer error:', err);
        }
      });

      socket.on('ice-candidate', async ({ candidate }) => {
        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (err) {
          console.error('ICE error:', err);
        }
      });

      socket.on('receive-message', (msg) => {
        setChatMessages(prev => [...prev, msg]);
      });

      socket.on('consultation-ended', ({ durationSeconds }) => {
        setIsPeerConnected(false);
        setIsEnded(true);
        if (durationSeconds) setCallDuration(durationSeconds);
      });
    }

    startCall();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [roomId, user, isDoctor]);

  // Duration timer
  useEffect(() => {
    if (!isEnded) {
      durationTimerRef.current = setInterval(() => {
        setCallDuration(d => d + 1);
      }, 1000);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [isEnded]);

  // Toggle Audio
  const toggleMute = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
        socketRef.current?.emit('toggle-media', { roomId, type: 'audio', enabled: track.enabled });
      }
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsVideoOff(!track.enabled);
        socketRef.current?.emit('toggle-media', { roomId, type: 'video', enabled: track.enabled });
      }
    }
  };

  // Screen Share
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        const sender = peerConnectionRef.current?.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(track);

        track.onended = () => stopScreenShare();
        setIsScreenSharing(true);
        toast({ type: 'success', title: 'Screen sharing started' });
      } catch (e) {
        console.warn('Screen share canceled');
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
    }
    const orig = localStreamRef.current?.getVideoTracks()[0];
    const sender = peerConnectionRef.current?.getSenders().find(s => s.track && s.track.kind === 'video');
    if (sender && orig) sender.replaceTrack(orig);
    setIsScreenSharing(false);
  };

  // Send Chat Message
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    socketRef.current?.emit('send-message', {
      roomId,
      text: chatInput.trim()
    });
    setChatInput('');
  };

  // End Consultation
  const handleEndCall = () => {
    socketRef.current?.emit('end-consultation', { roomId });
    setIsEnded(true);
  };

  // Complete Consultation
  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/consultation/complete', {
        roomId,
        clinicalNotes,
        prescriptions,
        followUpDate: followUpDate || undefined
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Consultation Complete', message: 'Notes and prescriptions saved to patient EHR.' });
      navigate(isDoctor ? '/doctor' : '/patient');
    }
  });

  const handleAddMedication = () => {
    if (!newMed.medicationName) return;
    setPrescriptions([...prescriptions, newMed]);
    setNewMed({ medicationName: '', dosage: '', frequency: '', durationDays: 7, instructions: '' });
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ==========================================
  // Post-Call Summary Modal
  // ==========================================
  if (isEnded) {
    return (
      <div className="min-h-screen bg-[#071322] text-white flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl bg-[#091b30] border border-teal-500/20 text-white p-8 rounded-3xl space-y-6 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Consultation Ended</h2>
              <p className="text-xs text-slate-400">Total Duration: {formatTimer(callDuration)}</p>
            </div>
          </div>

          {isDoctor ? (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Clinical Diagnosis & Notes</label>
                <textarea
                  rows={3}
                  placeholder="Enter diagnosis, observation, and clinical recommendations..."
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  className="input-base"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Prescriptions ({prescriptions.length})</label>
                <div className="space-y-2 mb-3">
                  {prescriptions.map((m, i) => (
                    <div key={i} className="p-3 bg-[#071322] rounded-xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white text-xs">{m.medicationName}</p>
                        <p className="text-[11px] text-slate-400">{m.dosage} • {m.frequency} • {m.durationDays}d</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-[#071322] rounded-2xl border border-slate-800 space-y-2">
                  <input
                    type="text"
                    placeholder="Medication name (e.g. Paracetamol)"
                    value={newMed.medicationName}
                    onChange={(e) => setNewMed({ ...newMed, medicationName: e.target.value })}
                    className="input-base"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Dosage (500mg)"
                      value={newMed.dosage}
                      onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                      className="input-base"
                    />
                    <input
                      type="text"
                      placeholder="Frequency (2x daily)"
                      value={newMed.frequency}
                      onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                      className="input-base"
                    />
                  </div>
                  <Button size="sm" onClick={handleAddMedication} icon={Plus} className="w-full">
                    Add Medication
                  </Button>
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold py-3"
                loading={completeMutation.isPending}
                onClick={() => completeMutation.mutate()}
                icon={Check}
              >
                Save & Complete Consultation
              </Button>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Thank you for consulting with HealthSync. Your medical summary, visit timestamps, and any doctor prescriptions have been automatically attached to your patient portal.
              </p>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => navigate('/patient/records')}>
                  View Medical Records
                </Button>
                <Button variant="secondary" onClick={() => navigate('/patient')}>
                  Back to Dashboard
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ==========================================
  // Direct Live Video Call Room UI
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans overflow-hidden">
      {/* Header Bar */}
      <header className="h-16 bg-[#07172b]/95 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(isDoctor ? '/doctor/today' : '/patient/telemedicine')}
            className="h-8 w-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
            title="Back to portal"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-bold text-sm leading-tight flex items-center gap-2">
              {otherUser ? `${isDoctor ? '' : 'Dr. '}${otherUser.firstName} ${otherUser.lastName}` : 'Live Video Consultation'}
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            </h1>
            <p className="text-[11px] text-teal-400 flex items-center gap-1.5 mt-0.5">
              <Clock className="h-3 w-3" /> Live: {formatTimer(callDuration)} • 256-Bit Encrypted
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="danger"
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white font-bold"
            icon={PhoneOff}
            onClick={handleEndCall}
          >
            End Visit
          </Button>
        </div>
      </header>

      {/* Main Grid: Video Stream + Optional Sidebar */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Side: Video Feeds */}
        <div className={cn(
          'p-4 flex flex-col justify-between relative bg-slate-950 transition-all',
          activeSidePanel === 'NONE' ? 'lg:col-span-12' : 'lg:col-span-8'
        )}>
          {/* Main Remote Video */}
          <div className="flex-1 rounded-3xl bg-[#071322] border border-slate-800 relative overflow-hidden flex items-center justify-center shadow-2xl min-h-[400px]">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {!isPeerConnected && (
              <div className="absolute inset-0 bg-[#071322]/95 flex flex-col items-center justify-center p-6 text-center">
                <Avatar
                  firstName={otherUser?.firstName || (isDoctor ? 'Patient' : 'Doctor')}
                  lastName={otherUser?.lastName || ''}
                  size="xl"
                  className="mb-4 ring-4 ring-teal-500/20 shadow-2xl"
                />
                <h3 className="text-xl font-bold text-white">
                  {otherUser ? `${isDoctor ? '' : 'Dr. '}${otherUser.firstName} ${otherUser.lastName}` : 'Waiting for doctor to connect...'}
                </h3>
                <p className="text-xs text-teal-400 mt-1 flex items-center gap-2 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live room active • Room ID: {roomId.slice(0, 16)}
                </p>
              </div>
            )}

            {/* Picture-in-Picture Local Feed */}
            <div className="absolute bottom-4 right-4 w-44 h-32 sm:w-56 sm:h-40 rounded-2xl bg-slate-900 border-2 border-teal-500/30 overflow-hidden shadow-2xl z-10 flex items-center justify-center">
              {isVideoOff ? (
                <div className="flex flex-col items-center text-slate-500 text-xs font-bold">
                  <VideoOff className="h-6 w-6 mb-1 text-slate-600" /> Camera Off
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              )}
              <span className="absolute bottom-2 left-2 text-[10px] bg-black/70 px-2 py-0.5 rounded-full font-bold text-teal-300">
                You {isMuted && '(Muted)'}
              </span>
            </div>
          </div>

          {/* Floating Call Controls */}
          <div className="mt-4 py-3 px-6 bg-[#07172b]/90 backdrop-blur-md rounded-2xl border border-slate-800 flex items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={toggleMute}
              className={cn(
                'h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-lg',
                isMuted ? 'bg-red-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
              )}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5 text-teal-400" />}
            </button>

            <button
              onClick={toggleVideo}
              className={cn(
                'h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-lg',
                isVideoOff ? 'bg-red-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
              )}
              title={isVideoOff ? 'Start Camera' : 'Stop Camera'}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5 text-teal-400" />}
            </button>

            <button
              onClick={toggleScreenShare}
              className={cn(
                'h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-lg',
                isScreenSharing ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-800 text-white hover:bg-slate-700'
              )}
              title="Share Screen"
            >
              <Share2 className="h-5 w-5" />
            </button>

            <button
              onClick={() => setActiveSidePanel(p => p === 'CHAT' ? 'NONE' : 'CHAT')}
              className={cn(
                'h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-lg',
                activeSidePanel === 'CHAT' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
              )}
              title="In-call Chat"
            >
              <MessageSquare className="h-5 w-5" />
            </button>

            <button
              onClick={() => setActiveSidePanel(p => p === 'NOTES' ? 'NONE' : 'NOTES')}
              className={cn(
                'h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-lg',
                activeSidePanel === 'NOTES' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
              )}
              title="Clinical Notes & Rx"
            >
              <FileText className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Right Side: Optional Drawer (Notes or Chat) */}
        {activeSidePanel !== 'NONE' && (
          <div className="lg:col-span-4 bg-[#071322] border-l border-slate-800 flex flex-col h-full">
            <div className="flex border-b border-slate-800 bg-slate-950 p-2 justify-between items-center">
              <span className="font-bold text-xs text-white">
                {activeSidePanel === 'NOTES' ? 'Clinical Notes & Prescriptions' : 'In-Call Chat'}
              </span>
              <button
                onClick={() => setActiveSidePanel('NONE')}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕ Close
              </button>
            </div>

            {/* Notes Panel */}
            {activeSidePanel === 'NOTES' && (
              <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Clinical Notes & Findings
                  </label>
                  <textarea
                    rows={4}
                    placeholder={isDoctor ? 'Write observation and symptoms here...' : 'Doctor notes will appear here.'}
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    readOnly={!isDoctor}
                    className="input-base"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Prescriptions ({prescriptions.length})
                  </label>
                  <div className="space-y-2">
                    {prescriptions.map((m, idx) => (
                      <div key={idx} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-white text-xs">{m.medicationName}</p>
                          <p className="text-[10px] text-slate-400">{m.dosage} • {m.frequency}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {isDoctor && (
                    <div className="mt-3 p-3 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                      <p className="font-bold text-[10px] text-teal-400 uppercase">Quick Add Medication</p>
                      <input
                        type="text"
                        placeholder="Medication name..."
                        value={newMed.medicationName}
                        onChange={(e) => setNewMed({ ...newMed, medicationName: e.target.value })}
                        className="input-base"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Dosage (500mg)"
                          value={newMed.dosage}
                          onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                          className="input-base"
                        />
                        <input
                          type="text"
                          placeholder="Frequency (2x daily)"
                          value={newMed.frequency}
                          onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                          className="input-base"
                        />
                      </div>
                      <Button size="sm" onClick={handleAddMedication} icon={Plus} className="w-full">
                        Add to Prescription
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chat Panel */}
            {activeSidePanel === 'CHAT' && (
              <div className="flex-1 flex flex-col justify-between p-4">
                <div className="space-y-3 overflow-y-auto text-xs flex-1 pr-2">
                  <div className="bg-slate-900 p-3 rounded-2xl text-slate-400 border border-slate-800">
                    <p className="font-bold text-[10px] text-teal-400 mb-1">Encrypted Session</p>
                    In-call messages are delivered in real-time between doctor and patient.
                  </div>
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        'p-3 rounded-2xl max-w-[85%]',
                        msg.senderId === user?.id
                          ? 'ml-auto bg-teal-600 text-white'
                          : 'bg-slate-900 border border-slate-800 text-slate-200'
                      )}
                    >
                      <p className="font-bold text-[10px] opacity-75 mb-0.5">{msg.senderName}</p>
                      <p>{msg.text}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    placeholder="Type message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && chatInput.trim()) handleSendMessage();
                    }}
                    className="input-base"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    className="bg-teal-600 hover:bg-teal-700 p-2.5 rounded-xl text-white font-bold"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
