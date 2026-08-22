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
  Volume2, VolumeX, Maximize, Minimize, Check
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

  // Room lifecycle stages: 'PREVIEW' | 'WAITING' | 'CALL' | 'POST_VISIT'
  const [stage, setStage] = useState('PREVIEW');
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [peerInfo, setPeerInfo] = useState(null);

  // Local media controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeTab, setActiveTab] = useState('NOTES'); // 'NOTES' | 'CHAT'
  const [callDuration, setCallDuration] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Doctor Clinical Notes & Prescriptions
  const [diagnosis, setDiagnosis] = useState('');
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
  const previewVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const durationTimerRef = useRef(null);

  // Fetch Room & Consultation Data
  const { data: roomData, isLoading, isError } = useQuery({
    queryKey: ['consultation-room', roomId],
    queryFn: async () => {
      const res = await api.get(`/consultation/room/${roomId}`);
      return res.data.data;
    },
    enabled: !!roomId
  });

  const consultation = roomData?.consultation;
  const otherUser = isDoctor ? consultation?.patientUserId : consultation?.doctorUserId;

  // Initialize Local Media Stream on Mount (Camera & Mic Preview)
  useEffect(() => {
    let localStream = null;

    async function initMedia() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });
        localStreamRef.current = localStream;

        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = localStream;
        }
      } catch (err) {
        console.warn('Camera/Mic permission not granted:', err.message);
        toast({ type: 'warning', title: 'Media Notice', message: 'Camera/Mic not accessible. You can still join in voice/chat mode.' });
      }
    }

    initMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
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
  }, []);

  // Update video element sources when stage changes
  useEffect(() => {
    if (stage === 'PREVIEW' && previewVideoRef.current && localStreamRef.current) {
      previewVideoRef.current.srcObject = localStreamRef.current;
    }
    if ((stage === 'WAITING' || stage === 'CALL') && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [stage]);

  // Call Duration Counter
  useEffect(() => {
    if (stage === 'CALL' && isPeerConnected) {
      durationTimerRef.current = setInterval(() => {
        setCallDuration(d => d + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [stage, isPeerConnected]);

  // Complete Consultation Mutation
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
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Failed to save summary' });
    }
  });

  // Setup WebRTC PeerConnection & Socket.IO Signaling
  const startSignalingAndConnect = useCallback(() => {
    // Determine backend WebSocket URL
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;
    const socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5
    });
    socketRef.current = socket;

    // Create RTCPeerConnection
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Add local tracks to RTCPeerConnection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // On Remote Track received
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote stream track:', event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setIsPeerConnected(true);
      setStage('CALL');
    };

    // On Local ICE Candidate generated
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          roomId,
          candidate: event.candidate
        });
      }
    };

    // Socket: Joined room response
    socket.emit('join-room', {
      roomId,
      userId: user?.id,
      role: user?.role,
      name: `${user?.firstName} ${user?.lastName}`
    });

    socket.on('room-ready', async ({ participants }) => {
      const otherParticipant = participants.find(p => p.userId !== user?.id);
      if (otherParticipant) {
        setPeerInfo(otherParticipant);
        // If doctor joins an existing room with patient, doctor creates the WebRTC offer
        if (isDoctor) {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('offer', { roomId, offer });
          } catch (e) {
            console.error('Error creating offer:', e);
          }
        }
      } else {
        setStage('WAITING');
      }
    });

    socket.on('user-joined', async (data) => {
      setPeerInfo(data);
      toast({ type: 'info', title: 'Consultation Room', message: `${data.name} has joined the room.` });
      // When peer joins, create offer
      if (isDoctor) {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { roomId, offer });
        } catch (e) {
          console.error('Error creating offer on user-joined:', e);
        }
      }
    });

    // Handle Incoming Offer
    socket.on('offer', async ({ offer }) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { roomId, answer });
        setIsPeerConnected(true);
        setStage('CALL');
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    });

    // Handle Incoming Answer
    socket.on('answer', async ({ answer }) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        setIsPeerConnected(true);
        setStage('CALL');
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    });

    // Handle Incoming ICE Candidate
    socket.on('ice-candidate', async ({ candidate }) => {
      try {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    });

    // Handle Peer Media Toggle
    socket.on('peer-media-toggled', ({ type, enabled }) => {
      toast({ title: 'Participant Media', message: `Peer ${type === 'audio' ? (enabled ? 'unmuted audio' : 'muted audio') : (enabled ? 'turned camera on' : 'turned camera off')}` });
    });

    // In-Call Chat Message
    socket.on('receive-message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
      if (activeTab !== 'CHAT') {
        setUnreadChatCount(c => c + 1);
      }
    });

    // Consultation Ended
    socket.on('consultation-ended', ({ durationSeconds }) => {
      setIsPeerConnected(false);
      setStage('POST_VISIT');
      if (durationSeconds) setCallDuration(durationSeconds);
      toast({ type: 'info', title: 'Consultation Concluded', message: 'The video visit has ended.' });
    });

    // User Left
    socket.on('user-left', ({ name }) => {
      toast({ type: 'warning', title: 'Participant Disconnected', message: `${name} disconnected from the room.` });
      setIsPeerConnected(false);
      setStage('WAITING');
    });

  }, [roomId, user, isDoctor, activeTab]);

  // Handle "Join Now" Click from Preview
  const handleJoinRoom = () => {
    setStage('WAITING');
    startSignalingAndConnect();
  };

  // Toggle Audio Mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        socketRef.current?.emit('toggle-media', { roomId, type: 'audio', enabled: audioTrack.enabled });
      }
    }
  };

  // Toggle Video Off
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        socketRef.current?.emit('toggle-media', { roomId, type: 'video', enabled: videoTrack.enabled });
      }
    }
  };

  // Screen Sharing
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        const videoSender = peerConnectionRef.current
          ?.getSenders()
          .find(s => s.track && s.track.kind === 'video');

        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          stopScreenSharing();
        };

        setIsScreenSharing(true);
        toast({ type: 'success', title: 'Screen Sharing Active' });
      } catch (err) {
        console.warn('Screen share cancelled:', err);
      }
    } else {
      stopScreenSharing();
    }
  };

  const stopScreenSharing = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
    }
    const originalVideoTrack = localStreamRef.current?.getVideoTracks()[0];
    const videoSender = peerConnectionRef.current
      ?.getSenders()
      .find(s => s.track && s.track.kind === 'video');

    if (videoSender && originalVideoTrack) {
      videoSender.replaceTrack(originalVideoTrack);
    }
    setIsScreenSharing(false);
  };

  // Send In-Call Chat Message
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
    setStage('POST_VISIT');
  };

  // Add Medication Helper
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-400">Securing WebRTC consultation room...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // 1. PRE-CALL STAGE: Camera & Device Preview
  // ==========================================
  if (stage === 'PREVIEW') {
    return (
      <div className="min-h-screen bg-[#071322] text-white flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] h-96 w-96 rounded-full bg-teal-500/15 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-cyan-500/15 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-2xl bg-[#091b30]/90 border border-teal-500/20 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Consultation Check-In</h1>
                <p className="text-xs text-slate-400">Room: {roomId}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              <Shield className="h-3 w-3" /> HIPAA Encrypted
            </div>
          </div>

          {/* Camera Preview Box */}
          <div className="relative h-64 sm:h-80 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
            {isVideoOff ? (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <VideoOff className="h-10 w-10 text-slate-600" />
                <p className="text-xs font-semibold">Camera is Turned Off</p>
              </div>
            ) : (
              <video
                ref={previewVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            )}

            {/* Bottom device pill */}
            <div className="absolute bottom-4 inset-x-0 flex justify-center gap-3">
              <button
                type="button"
                onClick={toggleMute}
                className={cn(
                  'h-11 w-11 rounded-full flex items-center justify-center shadow-lg transition-all',
                  isMuted ? 'bg-red-500 text-white' : 'bg-[#071322]/80 backdrop-blur-md text-white hover:bg-slate-800 border border-slate-700'
                )}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5 text-teal-400" />}
              </button>

              <button
                type="button"
                onClick={toggleVideo}
                className={cn(
                  'h-11 w-11 rounded-full flex items-center justify-center shadow-lg transition-all',
                  isVideoOff ? 'bg-red-500 text-white' : 'bg-[#071322]/80 backdrop-blur-md text-white hover:bg-slate-800 border border-slate-700'
                )}
                title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
              >
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5 text-teal-400" />}
              </button>
            </div>
          </div>

          {/* Participant Info & Join Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div>
              <p className="text-xs text-slate-400">Joining as</p>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                {isDoctor ? `Dr. ${user?.firstName} ${user?.lastName} (Specialist)` : `${user?.firstName} ${user?.lastName} (Patient)`}
              </p>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <Button variant="secondary" onClick={() => navigate(-1)} icon={ArrowLeft}>
                Back
              </Button>
              <Button
                onClick={handleJoinRoom}
                className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-slate-950 font-extrabold px-8 py-3 rounded-2xl shadow-lg shadow-teal-500/25 flex-1 sm:flex-initial"
              >
                Join Consultation Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. WAITING ROOM STAGE
  // ==========================================
  if (stage === 'WAITING') {
    return (
      <div className="min-h-screen bg-[#071322] text-white flex items-center justify-center p-6 relative overflow-hidden">
        <div className="w-full max-w-lg bg-[#091b30]/95 border border-teal-500/20 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30 flex items-center justify-center mx-auto relative">
            <Stethoscope className="h-10 w-10 animate-pulse" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 animate-ping" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              {isDoctor ? 'Patient Waiting Room' : "Doctor's Virtual Waiting Room"}
            </h2>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              {isDoctor
                ? 'You are online. Waiting for the patient to connect to this consultation...'
                : `We've notified ${otherUser ? `Dr. ${otherUser.firstName} ${otherUser.lastName}` : 'your doctor'}. Please stay on this screen — your video call will start automatically.`}
            </p>
          </div>

          <div className="bg-[#071322] p-4 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">Your Camera & Mic are ready</span>
            </div>
            <span className="text-teal-400 font-mono font-bold">Room: {roomId.slice(0, 16)}</span>
          </div>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              socketRef.current?.disconnect();
              setStage('PREVIEW');
            }}
          >
            Leave Waiting Room
          </Button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. POST-VISIT SUMMARY & PRESCRIPTION STAGE
  // ==========================================
  if (stage === 'POST_VISIT') {
    return (
      <div className="min-h-screen bg-[#071322] text-white flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl bg-[#091b30] border border-teal-500/20 text-white p-8 rounded-3xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Consultation Concluded</h2>
                <p className="text-xs text-slate-400">Total Visit Duration: {formatTimer(callDuration)}</p>
              </div>
            </div>
          </div>

          {isDoctor ? (
            /* Doctor Clinical Completion Form */
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Clinical Diagnosis & Findings</label>
                <textarea
                  rows={3}
                  placeholder="Enter clinical observations, diagnosis, and patient summary..."
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  className="input-base"
                />
              </div>

              {/* Prescription Builder */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Prescriptions ({prescriptions.length})
                </label>
                <div className="space-y-2 mb-3">
                  {prescriptions.map((m, i) => (
                    <div key={i} className="p-3 bg-[#071322] rounded-xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white text-xs">{m.medicationName}</p>
                        <p className="text-[11px] text-slate-400">{m.dosage} • {m.frequency} • {m.durationDays} days</p>
                      </div>
                      <span className="text-emerald-400 font-semibold text-[11px]">{m.instructions || 'With food'}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-[#071322] rounded-2xl border border-slate-800 space-y-2">
                  <input
                    type="text"
                    placeholder="Medication name (e.g. Amoxicillin)"
                    value={newMed.medicationName}
                    onChange={(e) => setNewMed({ ...newMed, medicationName: e.target.value })}
                    className="input-base"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Dosage (e.g. 500mg)"
                      value={newMed.dosage}
                      onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                      className="input-base"
                    />
                    <input
                      type="text"
                      placeholder="Frequency (e.g. 2x Daily)"
                      value={newMed.frequency}
                      onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                      className="input-base"
                    />
                  </div>
                  <Button size="sm" onClick={handleAddMedication} icon={Plus} className="w-full">
                    Add Medication to Prescription
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Recommended Follow-up Date (Optional)</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="input-base"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex gap-3">
                <Button
                  className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold"
                  loading={completeMutation.isPending}
                  onClick={() => completeMutation.mutate()}
                  icon={Check}
                >
                  Complete Consultation & Save to EHR
                </Button>
              </div>
            </div>
          ) : (
            /* Patient Post-Call Summary */
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-[#071322] rounded-2xl border border-slate-800 leading-relaxed text-slate-300">
                Your consultation has completed. The doctor's clinical summary, diagnosis, and official digital prescriptions have been automatically synced to your <strong>Health Records (EHR)</strong>.
              </div>
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
  // 4. LIVE WEBRTC IN-CALL STAGE
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <header className="h-16 bg-[#071322]/90 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight flex items-center gap-2">
              Telemedicine Consultation
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            </h1>
            <p className="text-[11px] text-teal-300/80 flex items-center gap-1.5 mt-0.5">
              <Clock className="h-3 w-3" /> Live: {formatTimer(callDuration)} • P2P WebRTC HD
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

      {/* Main Video & Sidebar Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Main Video Canvas */}
        <div className="lg:col-span-8 p-4 flex flex-col justify-between relative bg-slate-950">
          
          {/* Remote Video Stream */}
          <div className="flex-1 rounded-3xl bg-[#071322] border border-slate-800 relative overflow-hidden flex items-center justify-center shadow-2xl min-h-[360px]">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {!isPeerConnected && (
              <div className="absolute inset-0 bg-[#071322]/90 flex flex-col items-center justify-center p-6 text-center">
                <Avatar
                  firstName={otherUser?.firstName || (isDoctor ? 'Patient' : 'Doctor')}
                  lastName={otherUser?.lastName || ''}
                  size="xl"
                  className="mb-4 shadow-xl"
                />
                <h3 className="text-lg font-bold text-white">
                  {otherUser ? `${isDoctor ? '' : 'Dr. '}${otherUser.firstName} ${otherUser.lastName}` : 'Connecting peer stream...'}
                </h3>
                <p className="text-xs text-teal-400 mt-1">Connecting WebRTC P2P stream...</p>
              </div>
            )}

            {/* Picture-in-Picture Local Video Feed */}
            <div className="absolute bottom-4 right-4 w-40 h-28 sm:w-52 sm:h-36 rounded-2xl bg-slate-900 border-2 border-teal-500/30 overflow-hidden shadow-2xl z-10 flex items-center justify-center">
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

          {/* Bottom Call Controls Bar */}
          <div className="mt-4 py-3 px-6 bg-[#071322]/90 rounded-2xl border border-slate-800 flex items-center justify-center gap-4">
            <button
              onClick={toggleMute}
              className={cn(
                'h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-lg',
                isMuted ? 'bg-red-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
              )}
              title={isMuted ? 'Unmute' : 'Mute'}
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
          </div>
        </div>

        {/* Right Sidebar: Live Notes & In-Call Chat */}
        <div className="lg:col-span-4 bg-[#071322] border-l border-slate-800 flex flex-col h-full">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950 p-1.5 gap-1.5">
            <button
              onClick={() => setActiveTab('NOTES')}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5',
                activeTab === 'NOTES' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              <FileText className="h-3.5 w-3.5" /> Clinical Notes & Rx
            </button>
            <button
              onClick={() => {
                setActiveTab('CHAT');
                setUnreadChatCount(0);
              }}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 relative',
                activeTab === 'CHAT' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" /> In-Call Chat
              {unreadChatCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {unreadChatCount}
                </span>
              )}
            </button>
          </div>

          {/* Notes Tab */}
          {activeTab === 'NOTES' && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Clinical Diagnosis & Notes
                </label>
                <textarea
                  rows={4}
                  placeholder={isDoctor ? 'Write observation, symptoms, and diagnosis here...' : 'Doctor notes will appear here.'}
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
                        <p className="text-[10px] text-slate-400">{m.dosage} • {m.frequency} • {m.durationDays}d</p>
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

          {/* In-Call Chat Tab */}
          {activeTab === 'CHAT' && (
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
                  placeholder="Type in-call message..."
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
      </div>
    </div>
  );
}
