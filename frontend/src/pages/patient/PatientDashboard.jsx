import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/Toast';
import api from '@/lib/api';
import { useUserLocation } from '@/lib/useUserLocation';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  User,
  HeartPulse,
  Activity,
  Check,
  Plus,
  Pill,
  Stethoscope,
  MapPin,
  Clock,
  ArrowRight,
  Navigation,
  Sparkles,
  Video,
  Search,
  CheckCircle,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { location, requestLocation } = useUserLocation();

  // Current live clock for greeting & dates
  const [currentDate, setCurrentDate] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Time-based greeting: Good Morning / Afternoon / Evening / Night
  const greeting = useMemo(() => {
    const hour = currentDate.getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 22) return 'Good Evening';
    return 'Good Night';
  }, [currentDate]);

  // Selected Day in Calendar
  const [selectedDay, setSelectedDay] = useState(12);

  // -------------------------------------------------------------
  // SMART DISEASE-BASED APPOINTMENT BOOKING ENGINE
  // -------------------------------------------------------------
  const symptomPresets = [
    { label: 'Chest Pain & Palpitations', specialty: 'Cardiology', icon: '🫀' },
    { label: 'Toothache & Sensitivity', specialty: 'Dentistry', icon: '🦷' },
    { label: 'High Fever & Flu', specialty: 'General Practice', icon: '🌡️' },
    { label: 'Severe Headache / Migraine', specialty: 'Neurology', icon: '🧠' },
    { label: 'Joint & Back Pain', specialty: 'Orthopedics', icon: '🦴' },
    { label: 'Skin Rash & Itching', specialty: 'Dermatology', icon: '🧴' },
    { label: 'Child Cough & Cold', specialty: 'Pediatrics', icon: '👶' },
  ];

  const specialistDirectory = {
    Cardiology: {
      name: 'Dr. Emily Williams, MD',
      specialty: 'Senior Cardiologist & Heart Specialist',
      experience: '12 years exp',
      fee: '₹800',
      rating: '4.9 ★ (180+ reviews)',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
      matchReason: 'Matched with Cardiology based on your cardiac / chest symptoms for comprehensive ECG & pulse assessment.',
    },
    Dentistry: {
      name: 'Dr. Wiktor Cross, DDS',
      specialty: 'Oral Health & Dental Surgeon',
      experience: '9 years exp',
      fee: '₹600',
      rating: '4.8 ★ (140+ reviews)',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
      matchReason: 'Matched with Dental Care for oral evaluation, toothache relief, and dental inspection.',
    },
    'General Practice': {
      name: 'Dr. James Brown, MBBS',
      specialty: 'General Physician & Internal Medicine',
      experience: '5 years exp',
      fee: '₹500',
      rating: '4.8 ★ (220+ reviews)',
      avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
      matchReason: 'Matched with Internal Medicine for viral infection, fever screening, and prescription treatment.',
    },
    Neurology: {
      name: 'Dr. Michael Chen, MD, DM',
      specialty: 'Consultant Neurologist',
      experience: '8 years exp',
      fee: '₹1000',
      rating: '4.9 ★ (110+ reviews)',
      avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80',
      matchReason: 'Matched with Neurology based on migraine, dizziness, and nervous system symptoms.',
    },
    Orthopedics: {
      name: 'Dr. Robert Johnson, MS',
      specialty: 'Orthopedic Surgeon & Joint Care',
      experience: '15 years exp',
      fee: '₹900',
      rating: '4.9 ★ (260+ reviews)',
      avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&auto=format&fit=crop&q=80',
      matchReason: 'Matched with Orthopedics for bone, joint, and spinal musculoskeletal pain management.',
    },
    Dermatology: {
      name: 'Dr. Priya Patel, MD',
      specialty: 'Consultant Dermatologist',
      experience: '6 years exp',
      fee: '₹700',
      rating: '4.9 ★ (195+ reviews)',
      avatar: 'https://images.unsplash.com/photo-1594824813576-905a5a676766?w=150&auto=format&fit=crop&q=80',
      matchReason: 'Matched with Dermatology for skin allergies, rash diagnosis, and topical prescription care.',
    },
    Pediatrics: {
      name: 'Dr. Anita Kumar, MD',
      specialty: 'Child Health & Pediatrician',
      experience: '10 years exp',
      fee: '₹650',
      rating: '4.9 ★ (170+ reviews)',
      avatar: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=150&auto=format&fit=crop&q=80',
      matchReason: 'Matched with Pediatrics for pediatric health examination and immunization guidance.',
    },
  };

  const [symptomInput, setSymptomInput] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('Cardiology');
  const [consultationType, setConsultationType] = useState('Video Consultation');
  const [appointmentDate, setAppointmentDate] = useState('Today (Immediate)');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('02:00 PM - 02:30 PM');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Auto-detect specialty from symptom text
  const handleSymptomTextChange = (text) => {
    setSymptomInput(text);
    const lower = text.toLowerCase();
    if (lower.includes('chest') || lower.includes('heart') || lower.includes('breath') || lower.includes('pulse') || lower.includes('palpitation')) {
      setSelectedSpecialty('Cardiology');
    } else if (lower.includes('tooth') || lower.includes('teeth') || lower.includes('gum') || lower.includes('dental')) {
      setSelectedSpecialty('Dentistry');
    } else if (lower.includes('fever') || lower.includes('cold') || lower.includes('cough') || lower.includes('flu') || lower.includes('vomit')) {
      setSelectedSpecialty('General Practice');
    } else if (lower.includes('head') || lower.includes('migraine') || lower.includes('dizzy') || lower.includes('neuro')) {
      setSelectedSpecialty('Neurology');
    } else if (lower.includes('bone') || lower.includes('joint') || lower.includes('knee') || lower.includes('back') || lower.includes('muscle')) {
      setSelectedSpecialty('Orthopedics');
    } else if (lower.includes('skin') || lower.includes('rash') || lower.includes('allergy') || lower.includes('itch')) {
      setSelectedSpecialty('Dermatology');
    } else if (lower.includes('child') || lower.includes('baby') || lower.includes('kid')) {
      setSelectedSpecialty('Pediatrics');
    }
  };

  const handleSelectPreset = (preset) => {
    setSymptomInput(preset.label);
    setSelectedSpecialty(preset.specialty);
  };

  const recommendedDoctor = specialistDirectory[selectedSpecialty] || specialistDirectory['General Practice'];

  // Handle appointment booking
  const handleConfirmAppointment = async () => {
    setBookingLoading(true);
    try {
      const newApt = {
        id: `apt-${Date.now()}`,
        doctor: recommendedDoctor.name,
        specialty: selectedSpecialty,
        time: selectedTimeSlot,
        date: appointmentDate,
        status: 'Confirmed',
        avatar: recommendedDoctor.avatar,
        type: consultationType,
        symptom: symptomInput || 'General Consultation'
      };

      setActiveAppointments(prev => [newApt, ...prev]);
      setBookingSuccess(true);
      toast({
        type: 'success',
        title: 'Appointment Booked Successfully!',
        message: `Your session with ${recommendedDoctor.name} is confirmed.`
      });

      setTimeout(() => setBookingSuccess(false), 4000);
    } catch {
      toast({ type: 'error', title: 'Booking Failed', message: 'Could not schedule appointment. Please try again.' });
    } finally {
      setBookingLoading(false);
    }
  };

  // Medication Doses Logged State
  const [medDoses, setMedDoses] = useState({
    ibuprofen: { morning: true, afternoon: false, night: false },
    paracetamol: { morning: true, afternoon: true, night: false },
    amoxicillin: { morning: true, afternoon: false, night: false }
  });

  const toggleMedDose = (medKey, timeOfDay) => {
    setMedDoses(prev => ({
      ...prev,
      [medKey]: {
        ...prev[medKey],
        [timeOfDay]: !prev[medKey][timeOfDay]
      }
    }));
  };

  // Interactive Notes with LocalStorage persistence
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('imed_patient_notes');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 1, text: 'Call the doctor', checked: true },
      { id: 2, text: 'Confirm the appointment', checked: true },
      { id: 3, text: 'Check test results', checked: false },
      { id: 4, text: 'Bring insurance card', checked: false },
      { id: 5, text: 'Cancel appointment', checked: false },
    ];
  });

  const [newNoteText, setNewNoteText] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);

  const toggleNote = (id) => {
    const updated = notes.map(n => n.id === id ? { ...n, checked: !n.checked } : n);
    setNotes(updated);
    try { localStorage.setItem('imed_patient_notes', JSON.stringify(updated)); } catch {}
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const updated = [...notes, { id: Date.now(), text: newNoteText.trim(), checked: false }];
    setNotes(updated);
    setNewNoteText('');
    setShowAddNote(false);
    try { localStorage.setItem('imed_patient_notes', JSON.stringify(updated)); } catch {}
  };

  // Backend Queries
  const { data: aptData } = useQuery({
    queryKey: ['patient-appointments-dashboard'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/appointments/mine?limit=10');
        return data.data;
      } catch {
        return { appointments: [] };
      }
    },
  });

  const backendAppointments = aptData?.appointments || [];

  const initialAppointments = [
    {
      id: 'apt-1',
      doctor: 'Dr. Emily Williams, MD',
      specialty: 'Cardiologist',
      time: '02.00 PM - 02.40 PM',
      date: 'Today',
      status: 'Confirmed',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
      type: 'Video Consultation'
    },
    {
      id: 'apt-2',
      doctor: 'Dr. Wiktor Cross, DDS',
      specialty: 'Dentist',
      time: '11.00 AM - 12.00 PM',
      date: 'Tomorrow',
      status: 'Confirmed',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
      type: 'In-Clinic Checkup'
    }
  ];

  const [activeAppointments, setActiveAppointments] = useState(() => {
    if (backendAppointments.length > 0) {
      return backendAppointments.map(a => ({
        id: a.id || a._id,
        doctor: `Dr. ${a.doctor?.user?.firstName || 'Medical'} ${a.doctor?.user?.lastName || 'Specialist'}`,
        specialty: a.doctor?.specialisation || 'General Physician',
        time: new Date(a.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date(a.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        status: a.status || 'Confirmed',
        avatar: a.doctor?.user?.avatar || '/doctor_promo_portrait.jpg',
        type: a.type || 'Consultation'
      }));
    }
    return initialAppointments;
  });

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const calendarDates = [
    { date: 27, inMonth: false }, { date: 28, inMonth: false }, { date: 29, inMonth: false }, { date: 30, inMonth: false },
    { date: 1, inMonth: true }, { date: 2, inMonth: true }, { date: 3, inMonth: true }, { date: 4, inMonth: true },
    { date: 5, inMonth: true }, { date: 6, inMonth: true }, { date: 7, inMonth: true }, { date: 8, inMonth: true },
    { date: 9, inMonth: true }, { date: 10, inMonth: true }, { date: 11, inMonth: true }, { date: 12, inMonth: true },
    { date: 13, inMonth: true }, { date: 14, inMonth: true }, { date: 15, inMonth: true }, { date: 16, inMonth: true },
    { date: 17, inMonth: true }, { date: 18, inMonth: true }, { date: 19, inMonth: true }, { date: 20, inMonth: true },
    { date: 21, inMonth: true }, { date: 22, inMonth: true }, { date: 23, inMonth: true }, { date: 24, inMonth: true },
    { date: 25, inMonth: true }, { date: 26, inMonth: true }, { date: 27, inMonth: true }, { date: 28, inMonth: true },
    { date: 29, inMonth: true }, { date: 30, inMonth: true }, { date: 31, inMonth: true },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <div className="max-w-[1600px] mx-auto pb-14 animate-in fade-in duration-300 font-sans">
        
        {/* ------------------------------------------------------------- */}
        {/* TOP HERO BANNER: WELCOME BACK & HEALTH SUMMARY (SECOND PIC)   */}
        {/* ------------------------------------------------------------- */}
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#2260FF] via-[#3575FF] to-[#4F46E5] text-white p-6 md:p-8 shadow-xl shadow-blue-500/15 mb-7">
          {/* Ambient Lighting Orbs */}
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-10 translate-y-1/3 -translate-x-1/4 h-48 w-48 rounded-full bg-blue-300/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Left 6 cols: WELCOME BACK & Next Appointment */}
            <div className="lg:col-span-6 space-y-4">
              <div>
                <p className="text-white/80 font-bold uppercase tracking-wider text-xs mb-1">
                  WELCOME BACK
                </p>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white font-sans">
                  {greeting}, {user?.firstName || 'Abhishek'}
                </h2>
              </div>

              {/* Dynamic Appointment Box in Banner */}
              {activeAppointments && activeAppointments.length > 0 ? (
                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                      <CalendarIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Next Appointment</p>
                      <p className="font-bold text-sm text-white truncate">{activeAppointments[0].doctor}</p>
                      <p className="text-xs text-white/80 truncate">{activeAppointments[0].date} · {activeAppointments[0].time} ({activeAppointments[0].specialty})</p>
                    </div>
                  </div>
                  <Link
                    to="/patient/telemedicine"
                    className="px-4 py-2 rounded-full bg-white text-[#1271F5] hover:bg-white/95 text-xs font-bold shadow-sm whitespace-nowrap transition-all shrink-0"
                  >
                    Join Call →
                  </Link>
                </div>
              ) : (
                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white/90">You have no upcoming appointments.</p>
                    <p className="text-xs text-white/70">Connect with a specialist doctor anytime.</p>
                  </div>
                  <button
                    onClick={() => document.getElementById('appointment-booking-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-4 py-2 rounded-full bg-white text-[#1271F5] hover:bg-white/95 text-xs font-bold shadow-sm whitespace-nowrap transition-all flex items-center gap-1.5"
                  >
                    Book Now <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Right 6 cols: Health Summary with BMI, BP, HEART, WEIGHT (Picture 2) */}
            <div className="lg:col-span-6 bg-white/15 backdrop-blur-md rounded-2xl p-5 border border-white/20">
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-white" /> Health Summary
                </h3>
                <span className="text-[11px] font-semibold text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full">
                  Real-time Vitals
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2.5 text-center">
                <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider mb-1">BMI</p>
                  <p className="font-extrabold text-xl text-white">22.4</p>
                  <p className="text-emerald-300 text-[10px] font-bold mt-1">Normal</p>
                </div>
                <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider mb-1">BP</p>
                  <p className="font-extrabold text-xl text-white">120<span className="text-xs font-normal text-white/70">/80</span></p>
                  <p className="text-emerald-300 text-[10px] font-bold mt-1">Optimal</p>
                </div>
                <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider mb-1">HEART</p>
                  <p className="font-extrabold text-xl text-white">74 <span className="text-[10px] font-normal text-white/70">bpm</span></p>
                  <p className="text-emerald-300 text-[10px] font-bold mt-1">Resting</p>
                </div>
                <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider mb-1">WEIGHT</p>
                  <p className="font-extrabold text-xl text-white">72 <span className="text-[10px] font-normal text-white/70">kg</span></p>
                  <p className="text-emerald-300 text-[10px] font-bold mt-1">Stable</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MAIN DASHBOARD CONTENT GRID                                  */}
        {/* ------------------------------------------------------------- */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">
          
          {/* Left / Center 8 Columns: Disease Appointment Engine, Vitals & Medicine */}
          <div className="xl:col-span-8 space-y-7">
            
            {/* 1. SMART DISEASE-BASED APPOINTMENT BOOKING WIZARD */}
            <div id="appointment-booking-section" className="bg-white border border-[#E6EBF2] rounded-[32px] p-6 md:p-8 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1271F5] text-xs font-bold mb-1">
                    <Sparkles className="h-3.5 w-3.5" /> Clinical Symptom Matcher
                  </div>
                  <h3 className="text-xl font-bold text-[#121A26]">
                    Book Consultation by Disease & Symptoms
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Select your symptoms or condition. Our clinical engine will recommend the verified specialist doctor.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Specialists Online
                  </span>
                </div>
              </div>

              {/* Step 1: Disease & Symptoms Input */}
              <div className="space-y-3.5 mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Step 1: Select Your Condition or Type Symptoms
                </label>

                {/* Quick Symptom Preset Pills */}
                <div className="flex flex-wrap gap-2">
                  {symptomPresets.map((preset) => {
                    const isSelected = selectedSpecialty === preset.specialty || symptomInput === preset.label;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-[#1271F5] text-white shadow-sm scale-105'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Search input for custom disease / symptoms */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={symptomInput}
                    onChange={(e) => handleSymptomTextChange(e.target.value)}
                    placeholder="e.g. sharp chest pain, persistent cough with fever, swollen knee, toothache..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-[#FAFBFD] text-xs text-[#121A26] placeholder:text-slate-400 focus:bg-white focus:border-[#1271F5] focus:outline-none focus:ring-2 focus:ring-[#1271F5]/10"
                  />
                </div>
              </div>

              {/* Step 2: Intelligent Specialist Doctor Suggestion */}
              <div className="mb-6 p-5 rounded-2xl border border-blue-100 bg-[#F8FAFD]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1271F5] flex items-center gap-1">
                    <Stethoscope className="h-3.5 w-3.5" /> Step 2: Suggested Specialist for Your Symptoms
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    High Match Confidence (98%)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={recommendedDoctor.avatar}
                      alt={recommendedDoctor.name}
                      className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white shadow-sm"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-base text-[#121A26]">{recommendedDoctor.name}</h4>
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {recommendedDoctor.rating}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#1271F5] mt-0.5">{recommendedDoctor.specialty}</p>
                      <p className="text-[11px] text-slate-500">{recommendedDoctor.experience} · Fee: <strong>{recommendedDoctor.fee}</strong></p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Consultation Mode</span>
                    <div className="flex gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => setConsultationType('Video Consultation')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          consultationType === 'Video Consultation'
                            ? 'bg-[#1271F5] text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        📹 Video Call
                      </button>
                      <button
                        type="button"
                        onClick={() => setConsultationType('In-Clinic Checkup')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          consultationType === 'In-Clinic Checkup'
                            ? 'bg-[#1271F5] text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        🏥 In-Clinic
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-200/60 leading-relaxed">
                  💡 <strong>Diagnosis Matching Note:</strong> {recommendedDoctor.matchReason}
                </p>
              </div>

              {/* Step 3: Schedule Slot & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Date
                  </label>
                  <select
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-[#FAFBFD] text-xs font-semibold text-[#121A26] focus:bg-white focus:border-[#1271F5] focus:outline-none cursor-pointer"
                  >
                    <option>Today (Immediate)</option>
                    <option>Tomorrow (Morning)</option>
                    <option>Day After Tomorrow</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Time Slot
                  </label>
                  <select
                    value={selectedTimeSlot}
                    onChange={(e) => setSelectedTimeSlot(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-[#FAFBFD] text-xs font-semibold text-[#121A26] focus:bg-white focus:border-[#1271F5] focus:outline-none cursor-pointer"
                  >
                    <option>02:00 PM - 02:30 PM</option>
                    <option>03:30 PM - 04:00 PM</option>
                    <option>05:15 PM - 05:45 PM</option>
                    <option>06:30 PM - 07:00 PM</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleConfirmAppointment}
                    disabled={bookingLoading}
                    className="w-full py-2.5 px-4 rounded-2xl bg-[#1271F5] hover:bg-[#0b5cd5] text-white text-xs font-bold shadow-md shadow-[#1271F5]/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 h-[42px]"
                  >
                    {bookingLoading ? (
                      'Scheduling...'
                    ) : bookingSuccess ? (
                      <span className="flex items-center gap-1 text-white">✓ Booked Confirmed!</span>
                    ) : (
                      <>
                        <span>Confirm Appointment</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* 2. Personal Healthcare Indications (Vitals & Notes) */}
            <div>
              <div className="flex items-center justify-between pb-4">
                <h3 className="font-bold text-base text-[#121A26]">
                  Personal Healthcare Indications
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  Continuous Tracking
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* Weight Card */}
                <div className="rounded-[28px] bg-[#1271F5] text-white p-6 shadow-md shadow-[#1271F5]/25 flex flex-col justify-between min-h-[190px] relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between">
                    <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <div className="h-5 w-5 rounded-md border-2 border-white flex flex-col items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-white mb-0.5" />
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                      Stable
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-white/80 text-xs font-medium">Weight</p>
                    <p className="text-3xl font-extrabold tracking-tight mt-1 text-white">
                      72 kg
                    </p>
                    <p className="text-[11px] text-white/70 mt-1">
                      -1.2 kg compared to last month
                    </p>
                  </div>
                </div>

                {/* Height Card */}
                <div className="rounded-[28px] bg-white border border-[#E6EBF2] p-6 shadow-sm flex flex-col justify-between min-h-[190px]">
                  <div className="flex items-center justify-between">
                    <div className="h-11 w-11 rounded-2xl bg-[#EDF4FF] flex items-center justify-center text-[#1271F5]">
                      <ArrowUpDown className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      Optimal
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-slate-400 text-xs font-medium">Height</p>
                    <p className="text-3xl font-extrabold tracking-tight mt-1 text-[#121A26]">
                      181 cm
                    </p>
                    <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                      BMI: 22.0 (Healthy)
                    </p>
                  </div>
                </div>

                {/* Age Card */}
                <div className="rounded-[28px] bg-white border border-[#E6EBF2] p-6 shadow-sm flex flex-col justify-between min-h-[190px]">
                  <div className="flex items-center justify-between">
                    <div className="h-11 w-11 rounded-2xl bg-[#E8F8F0] flex items-center justify-center text-emerald-600">
                      <User className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                      Active
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-slate-400 text-xs font-medium">Age</p>
                    <p className="text-3xl font-extrabold tracking-tight mt-1 text-[#121A26]">
                      28 y.o.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Born: Oct 1998
                    </p>
                  </div>
                </div>

                {/* Pulse Card */}
                <div className="rounded-[28px] bg-white border border-[#E6EBF2] p-6 shadow-sm flex flex-col justify-between min-h-[190px]">
                  <div className="flex items-center justify-between">
                    <div className="h-11 w-11 rounded-2xl bg-[#EDF4FF] flex items-center justify-center text-[#1271F5]">
                      <HeartPulse className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-[#1271F5]">
                      Normal
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-slate-400 text-xs font-medium">Pulse</p>
                    <p className="text-3xl font-extrabold tracking-tight mt-1 text-[#121A26]">
                      96 BPM
                    </p>
                    <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                      Resting pulse normal
                    </p>
                  </div>
                </div>

                {/* Notes Checklist Card */}
                <div className="sm:col-span-2 rounded-[28px] bg-white border border-[#E6EBF2] p-6 shadow-sm flex flex-col justify-between min-h-[190px]">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-[#121A26]">
                          Notes & Reminders
                        </h3>
                        <span className="text-[11px] font-semibold text-slate-400">
                          ({notes.filter(n => n.checked).length}/{notes.length})
                        </span>
                      </div>
                      <button
                        onClick={() => setShowAddNote(!showAddNote)}
                        className="h-7 w-7 rounded-full flex items-center justify-center text-slate-400 hover:text-[#1271F5] hover:bg-slate-100 transition-colors"
                        title="Add Reminder"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    {showAddNote && (
                      <form onSubmit={handleAddNote} className="mb-3 flex items-center gap-2">
                        <input
                          type="text"
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          placeholder="Add a new reminder..."
                          className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1271F5]"
                          autoFocus
                        />
                        <button type="submit" className="px-3 py-1.5 rounded-xl bg-[#1271F5] text-white text-xs font-semibold">
                          Add
                        </button>
                      </form>
                    )}

                    <div className="space-y-2 max-h-[130px] overflow-y-auto pr-1">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          onClick={() => toggleNote(note.id)}
                          className="flex items-center gap-3 cursor-pointer group select-none"
                        >
                          <div
                            className={`h-5 w-5 rounded-full flex items-center justify-center transition-all ${
                              note.checked
                                ? 'bg-[#1271F5] text-white shadow-sm'
                                : 'border border-slate-300 bg-white group-hover:border-[#1271F5]'
                            }`}
                          >
                            {note.checked && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <span className={`text-xs font-medium transition-all ${note.checked ? 'text-slate-400 line-through' : 'text-slate-700 group-hover:text-[#1271F5]'}`}>
                            {note.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                    Click items to toggle completion status.
                  </p>
                </div>

              </div>
            </div>

            {/* 3. Active Medicine Tracker */}
            <div className="bg-white border border-[#E6EBF2] rounded-[32px] p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Pill className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#121A26]">Active Medicine Schedule</h3>
                    <p className="text-xs text-slate-400 font-medium">Log doses taken today for automated adherence tracking</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  3 Prescriptions Active
                </span>
              </div>

              <div className="space-y-4">
                {/* Med 1: Ibuprofen */}
                <div className="p-4 rounded-2xl border border-[#E6EBF2] bg-[#FAFBFD] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-blue-100/60 text-[#1271F5] flex items-center justify-center font-bold text-xs shrink-0">
                      IBU
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-[#121A26]">Ibuprofen</p>
                        <span className="text-[11px] text-slate-400 font-medium">400 mg · Anti-inflammatory</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Take 1 tablet after meals with water</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleMedDose('ibuprofen', 'morning')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        medDoses.ibuprofen.morning
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      Morning {medDoses.ibuprofen.morning ? '✓' : '○'}
                    </button>
                    <button
                      onClick={() => toggleMedDose('ibuprofen', 'afternoon')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        medDoses.ibuprofen.afternoon
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      Afternoon {medDoses.ibuprofen.afternoon ? '✓' : '○'}
                    </button>
                    <button
                      onClick={() => toggleMedDose('ibuprofen', 'night')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        medDoses.ibuprofen.night
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      Night {medDoses.ibuprofen.night ? '✓' : '○'}
                    </button>
                  </div>
                </div>

                {/* Med 2: Paracetamol */}
                <div className="p-4 rounded-2xl border border-[#E6EBF2] bg-[#FAFBFD] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100/60 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                      PCM
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-[#121A26]">Paracetamol</p>
                        <span className="text-[11px] text-slate-400 font-medium">500 mg · Analgesic & Antipyretic</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">As needed for headache or joint pain (max 3/day)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleMedDose('paracetamol', 'morning')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        medDoses.paracetamol.morning
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      Morning {medDoses.paracetamol.morning ? '✓' : '○'}
                    </button>
                    <button
                      onClick={() => toggleMedDose('paracetamol', 'afternoon')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        medDoses.paracetamol.afternoon
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      Afternoon {medDoses.paracetamol.afternoon ? '✓' : '○'}
                    </button>
                    <button
                      onClick={() => toggleMedDose('paracetamol', 'night')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        medDoses.paracetamol.night
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      Night {medDoses.paracetamol.night ? '✓' : '○'}
                    </button>
                  </div>
                </div>

                {/* Med 3: Amoxicillin */}
                <div className="p-4 rounded-2xl border border-[#E6EBF2] bg-[#FAFBFD] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-amber-100/60 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                      AMX
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-[#121A26]">Amoxicillin</p>
                        <span className="text-[11px] text-slate-400 font-medium">250 mg · Antibiotic Course (Day 4/7)</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Finish entire prescribed course as advised by Dr. Williams</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleMedDose('amoxicillin', 'morning')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        medDoses.amoxicillin.morning
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      Morning {medDoses.amoxicillin.morning ? '✓' : '○'}
                    </button>
                    <button
                      onClick={() => toggleMedDose('amoxicillin', 'afternoon')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        medDoses.amoxicillin.afternoon
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      Afternoon {medDoses.amoxicillin.afternoon ? '✓' : '○'}
                    </button>
                    <button
                      onClick={() => toggleMedDose('amoxicillin', 'night')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        medDoses.amoxicillin.night
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      Night {medDoses.amoxicillin.night ? '✓' : '○'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right 4 Columns: Mini Calendar, Active Appointments & Prescriptions */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* 1. Mini Calendar Card */}
            <div className="bg-white border border-[#E6EBF2] rounded-[32px] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Today
                  </p>
                  <h3 className="text-lg font-bold text-[#121A26] mt-0.5">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {daysOfWeek.map((day) => (
                  <span key={day} className="text-[11px] font-bold text-slate-400">
                    {day}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarDates.map((item, idx) => {
                  const isSelected = item.inMonth && item.date === selectedDay;
                  return (
                    <button
                      key={idx}
                      onClick={() => item.inMonth && setSelectedDay(item.date)}
                      className={`h-8 w-8 mx-auto flex items-center justify-center rounded-full text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#1271F5] text-white shadow-md shadow-[#1271F5]/30 scale-105'
                          : item.inMonth
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'text-slate-300'
                      }`}
                    >
                      {item.date}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Scheduled Doctor Appointments on Dashboard */}
            <div className="bg-white border border-[#E6EBF2] rounded-[32px] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-[#121A26]">
                  Doctor Appointments
                </h3>
                <span className="text-xs font-bold text-emerald-600">
                  {activeAppointments.length} Active
                </span>
              </div>

              <div className="space-y-3.5">
                {activeAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-4 rounded-2xl border border-[#E6EBF2] bg-[#FAFBFD] hover:border-[#1271F5]/40 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {apt.status}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {apt.date} · {apt.time}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1">
                      <img
                        src={apt.avatar}
                        alt={apt.doctor}
                        className="h-11 w-11 rounded-2xl object-cover ring-2 ring-slate-100"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-[#121A26] truncate">
                          {apt.doctor}
                        </h4>
                        <p className="text-xs text-[#1271F5] font-medium truncate">
                          {apt.specialty}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {apt.type}
                      </span>
                      <Link
                        to="/patient/telemedicine"
                        className="text-xs font-bold text-[#1271F5] hover:underline"
                      >
                        Join Call &gt;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  document.getElementById('appointment-booking-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full mt-4 py-2.5 rounded-full bg-[#1271F5] text-white text-xs font-semibold hover:bg-[#0b5cd5] transition-all shadow-sm"
              >
                + Book Another Consultation
              </button>
            </div>

            {/* 3. Your Treatment Card */}
            <div className="bg-white border border-[#E6EBF2] rounded-[32px] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-base text-[#121A26]">
                  Your treatment
                </h3>
                <span className="text-xs font-semibold text-[#1271F5]">
                  Prescriptions
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mb-4">
                All your active medications are synchronized
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAFBFD] border border-[#E6EBF2]">
                  <div className="h-10 w-10 rounded-2xl bg-[#EDF4FF] flex items-center justify-center text-[#1271F5]">
                    <Pill className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#121A26] truncate">
                      Ibuprofen
                    </p>
                    <p className="text-xs text-slate-400">
                      2 times per day
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    Active
                  </span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAFBFD] border border-[#E6EBF2]">
                  <div className="h-10 w-10 rounded-2xl bg-[#E8F8F0] flex items-center justify-center text-emerald-600">
                    <Pill className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#121A26] truncate">
                      Paracetamol
                    </p>
                    <p className="text-xs text-slate-400">
                      500 mg · After meals
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    Active
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
