import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/Toast';
import api from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare,
  FileText, Plus, CheckCircle2, Share2, Clock, User, Sparkles, Send,
  Shield, Stethoscope, Download, Users, ChevronDown, Check
} from 'lucide-react';

export default function TelemedicineRoom() {
  const { roomId = 'quick-room' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const isDoctor = user?.role === 'DOCTOR';

  // Video and media state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [activeTab, setActiveTab] = useState('NOTES'); // NOTES | CHAT
  const [callDuration, setCallDuration] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { senderName: 'System', senderRole: 'SYSTEM', text: 'Connected to HIPAA-compliant secure telemedicine room.' }
  ]);
  const [isEnded, setIsEnded] = useState(false);
  const [isDoctorSelectOpen, setIsDoctorSelectOpen] = useState(false);

  // Selected Doctor State
  const [selectedDoctor, setSelectedDoctor] = useState({
    name: 'Dr. Emily Williams, MD',
    specialty: 'Cardiologist • Gold Medalist',
    experience: '12+ Years Exp',
    fee: 800,
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&auto=format&fit=crop&q=80',
    firstName: 'Emily',
    lastName: 'Williams'
  });

  // Doctor Note Pad state
  const [diagnosis, setDiagnosis] = useState('Upper Respiratory Infection (Mild)');
  const [notes, setNotes] = useState('Patient presented with mild throat irritation, clear lungs upon observation, no acute distress.');
  const [meds, setMeds] = useState([
    { name: 'Amoxicillin / Clavulanate', dosage: '625mg', frequency: 'Twice daily', duration: '5 days', instructions: 'Take with food' },
    { name: 'Paracetamol', dosage: '500mg', frequency: 'Every 6-8 hrs as needed', duration: '3 days', instructions: 'For pain/fever' }
  ]);
  const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: '', duration: '', instructions: '' });

  const localVideoRef = useRef(null);

  // Fetch real doctors from backend so user can choose any doctor to call
  const { data: doctorsData } = useQuery({
    queryKey: ['available-call-doctors'],
    queryFn: async () => {
      const res = await api.get('/appointments/doctors/search');
      return res.data.data?.doctors || [];
    }
  });

  const availableDoctors = doctorsData?.length > 0 ? doctorsData : [
    { firstName: 'Emily', lastName: 'Williams', doctorProfile: { specialisation: 'Cardiologist', consultationFee: 800, experienceYears: 12 } },
    { firstName: 'Priya', lastName: 'Patel', doctorProfile: { specialisation: 'Dermatologist', consultationFee: 750, experienceYears: 8 } },
    { firstName: 'Robert', lastName: 'Johnson', doctorProfile: { specialisation: 'Orthopedic', consultationFee: 900, experienceYears: 15 } },
    { firstName: 'Sarah', lastName: 'Jenkins', doctorProfile: { specialisation: 'Pediatrician', consultationFee: 650, experienceYears: 10 } }
  ];

  // Setup local camera stream
  useEffect(() => {
    let stream = null;
    async function startCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (e) {
        console.log('Camera access notice:', e.message);
      }
    }
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Call duration timer
  useEffect(() => {
    if (isEnded) return;
    const interval = setInterval(() => {
      setCallDuration(c => c + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isEnded]);

  const handleSelectDoctor = (doc) => {
    const dp = doc.doctorProfile;
    setSelectedDoctor({
      name: `Dr. ${doc.firstName} ${doc.lastName}`,
      specialty: dp?.specialisation || 'General Physician',
      experience: dp?.experienceYears ? `${dp.experienceYears}+ Years Exp` : 'Certified Specialist',
      fee: dp?.consultationFee || 800,
      avatar: doc.avatar,
      firstName: doc.firstName,
      lastName: doc.lastName
    });
    setIsDoctorSelectOpen(false);
    toast({ type: 'success', title: 'Doctor Connected', message: `Now in live consultation with Dr. ${doc.firstName} ${doc.lastName}` });
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMsg = {
      senderName: user ? `${user.firstName} ${user.lastName}` : 'You',
      senderRole: user?.role || 'PATIENT',
      text: chatInput.trim()
    };
    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
  };

  const handleAddMed = () => {
    if (!newMed.name) return;
    setMeds([...meds, newMed]);
    setNewMed({ name: '', dosage: '', frequency: '', duration: '', instructions: '' });
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Post-Call Summary Screen
  if (isEnded) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <Card className="w-full max-w-lg bg-slate-900 border-slate-800 text-white p-8 text-center space-y-6 shadow-2xl">
          <div className="h-16 w-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Consultation Ended</h2>
            <p className="text-sm text-slate-400 mt-1">Doctor: {selectedDoctor.name}</p>
            <p className="text-xs text-teal-400 font-semibold mt-0.5">Duration: {formatTimer(callDuration)}</p>
          </div>

          <div className="text-left bg-slate-800/60 p-4 rounded-2xl border border-slate-700 space-y-3 text-xs">
            <p className="font-bold text-slate-300 uppercase tracking-wider">Clinical Diagnosis</p>
            <p className="text-white font-medium">{diagnosis}</p>
            <div className="pt-2 border-t border-slate-700">
              <p className="font-bold text-slate-300 uppercase tracking-wider mb-1">Prescribed Medicines ({meds.length})</p>
              {meds.map((m, i) => (
                <p key={i} className="text-slate-300">• {m.name} - {m.dosage} ({m.frequency})</p>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-slate-950 font-bold"
              onClick={() => navigate(isDoctor ? '/doctor' : '/patient')}
            >
              Back to Portal
            </Button>
            <Button
              variant="secondary"
              className="bg-slate-800 text-slate-200 hover:bg-slate-700"
              icon={Download}
              onClick={() => window.print()}
            >
              Print Summary
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center font-bold shadow-md shadow-teal-500/20">
            <Stethoscope className="h-5 w-5 text-slate-950" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight flex items-center gap-2">
              Virtual Telemedicine Consultation
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            </h1>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Clock className="h-3 w-3 text-teal-400" /> Live: {formatTimer(callDuration)} • Encrypted 256-bit
            </p>
          </div>
        </div>

        {/* Doctor Selector & End Call */}
        <div className="flex items-center gap-3">
          {/* Doctor Call Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDoctorSelectOpen(!isDoctorSelectOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold hover:bg-teal-500/25 transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              <span>{isDoctor ? 'Patient View' : selectedDoctor.name.split(',')[0]}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {isDoctorSelectOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl z-50 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase px-2.5 py-1">Select Doctor to Call</p>
                {availableDoctors.map((d, idx) => {
                  const dp = d.doctorProfile;
                  const isSelected = selectedDoctor.lastName === d.lastName;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectDoctor(d)}
                      className={cn(
                        'w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors text-xs',
                        isSelected ? 'bg-teal-500/20 text-teal-200 font-bold' : 'hover:bg-slate-800 text-slate-300'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar firstName={d.firstName} lastName={d.lastName} size="sm" />
                        <div>
                          <p className="font-semibold text-xs text-white">Dr. {d.firstName} {d.lastName}</p>
                          <p className="text-[10px] text-slate-400">{dp?.specialisation || 'Specialist'} • ₹{dp?.consultationFee || 800}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-teal-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Button
            variant="danger"
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white font-bold"
            icon={PhoneOff}
            onClick={() => {
              setIsEnded(true);
              toast({ type: 'success', title: 'Consultation Complete', message: 'Summary has been generated.' });
            }}
          >
            End Visit
          </Button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Side: Video Streams */}
        <div className="lg:col-span-8 p-4 flex flex-col justify-between relative bg-slate-950">
          
          {/* Main Remote Video Stream (Doctor or Patient) */}
          <div className="flex-1 rounded-3xl bg-slate-900 border border-slate-800 relative overflow-hidden flex items-center justify-center shadow-2xl min-h-[380px]">
            {/* Clinical Remote Feed Display */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-slate-900/80 flex flex-col items-center justify-center p-6 text-center">
              <div className="h-28 w-28 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-600/30 border-2 border-teal-500/40 flex items-center justify-center mb-4 shadow-xl">
                <Avatar
                  firstName={isDoctor ? (user?.firstName || 'Patient') : selectedDoctor.firstName}
                  lastName={isDoctor ? (user?.lastName || '') : selectedDoctor.lastName}
                  size="xl"
                />
              </div>
              <h3 className="text-xl font-bold text-white">
                {isDoctor ? `${user?.firstName || 'Patient'} (Patient)` : `${selectedDoctor.name} (${selectedDoctor.specialty.split('•')[0].trim()})`}
              </h3>
              <p className="text-xs text-emerald-400 font-semibold mt-1 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                HD Audio & Video Connected • Consultation Fee: ₹{selectedDoctor.fee}
              </p>
            </div>

            {/* Picture-in-Picture Local Video */}
            <div className="absolute bottom-4 right-4 w-44 h-32 sm:w-52 sm:h-36 rounded-2xl bg-slate-800 border-2 border-slate-700 overflow-hidden shadow-2xl z-10 flex items-center justify-center">
              {isVideoOff ? (
                <div className="flex flex-col items-center text-slate-500 text-xs font-bold">
                  <VideoOff className="h-6 w-6 mb-1" /> Camera Off
                </div>
              ) : (
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              )}
              <span className="absolute bottom-2 left-2 text-[10px] bg-black/70 px-2 py-0.5 rounded-full font-bold text-teal-300">
                You {isMuted && '(Muted)'}
              </span>
            </div>
          </div>

          {/* Video Control Bar */}
          <div className="mt-4 py-3 px-6 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-center gap-4">
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                toast({ title: isMuted ? 'Microphone unmuted' : 'Microphone muted' });
              }}
              className={cn(
                'h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-lg',
                isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              )}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            <button
              onClick={() => {
                setIsVideoOff(!isVideoOff);
                toast({ title: isVideoOff ? 'Camera started' : 'Camera stopped' });
              }}
              className={cn(
                'h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-lg',
                isVideoOff ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              )}
              title={isVideoOff ? 'Start Video' : 'Stop Video'}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </button>

            <button
              onClick={() => toast({ title: 'Screen sharing toggled' })}
              className="h-12 w-12 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center justify-center shadow-lg"
              title="Share Screen"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Right Side: Clinical Notepad & In-Call Chat */}
        <div className="lg:col-span-4 bg-slate-900 border-l border-slate-800 flex flex-col h-full">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950 p-1.5 gap-1.5">
            <button
              onClick={() => setActiveTab('NOTES')}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5',
                activeTab === 'NOTES' ? 'bg-teal-600 text-slate-950' : 'text-slate-400 hover:text-white'
              )}
            >
              <FileText className="h-3.5 w-3.5" /> Clinical Notes & Rx
            </button>
            <button
              onClick={() => setActiveTab('CHAT')}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5',
                activeTab === 'CHAT' ? 'bg-teal-600 text-slate-950' : 'text-slate-400 hover:text-white'
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" /> In-Call Chat
            </button>
          </div>

          {/* Notes Panel */}
          {activeTab === 'NOTES' && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Clinical Diagnosis
                </label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Observation & Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white resize-none focus:ring-2 focus:ring-teal-500 outline-none leading-relaxed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Prescriptions ({meds.length})
                  </label>
                </div>
                <div className="space-y-2">
                  {meds.map((m, idx) => (
                    <div key={idx} className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white text-xs">{m.name}</p>
                        <p className="text-[10px] text-slate-400">{m.dosage} • {m.frequency} • {m.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <p className="font-bold text-[10px] text-teal-400 uppercase">Add Medication</p>
                  <input
                    type="text"
                    placeholder="Medication name..."
                    value={newMed.name}
                    onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Dosage (e.g. 500mg)"
                      value={newMed.dosage}
                      onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Frequency (e.g. 2x daily)"
                      value={newMed.frequency}
                      onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <Button size="sm" className="w-full text-xs font-bold" onClick={handleAddMed} icon={Plus}>
                    Add to Prescription
                  </Button>
                </div>
              </div>

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={() => toast({ type: 'success', title: 'Prescription & Notes Saved to EHR' })}
              >
                Save Notes & Sync with EHR
              </Button>
            </div>
          )}

          {/* Chat Panel */}
          {activeTab === 'CHAT' && (
            <div className="flex-1 flex flex-col justify-between p-4">
              <div className="space-y-3 overflow-y-auto text-xs flex-1 pr-2">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn('p-3 rounded-2xl max-w-[85%]', msg.senderRole === user?.role ? 'ml-auto bg-teal-600 text-slate-950 font-medium' : 'bg-slate-800 text-slate-200')}>
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
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-teal-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-teal-600 hover:bg-teal-700 p-2.5 rounded-xl text-slate-950 font-bold"
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
