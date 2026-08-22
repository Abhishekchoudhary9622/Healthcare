import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import BookingModal from '@/pages/patient/BookingModal';
import { useToast } from '@/components/ui/Toast';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  HeartPulse, BrainCircuit, Activity, ShieldCheck, AlertTriangle,
  Flame, Stethoscope, ArrowRight, Sparkles, CheckCircle2, Sliders, ChevronRight, UserCheck, Star
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function MLPrediction() {
  const { toast } = useToast();
  const [modelType, setModelType] = useState('CVD'); // CVD | DIABETES | STROKE
  const [bookingDoctor, setBookingDoctor] = useState(null);

  // CVD Parameters
  const [cvdParams, setCvdParams] = useState({
    age: 48,
    gender: 'MALE',
    systolicBP: 135,
    totalChol: 210,
    hdl: 46,
    isSmoker: false,
    hasDiabetes: false
  });

  // Diabetes Parameters
  const [diabetesParams, setDiabetesParams] = useState({
    age: 48,
    bmi: 27.5,
    physicalActivityHours: 2,
    familyHistory: true,
    highBP: false
  });

  // Stroke Parameters
  const [strokeParams, setStrokeParams] = useState({
    age: 52,
    systolicBP: 138,
    hasHypertension: true,
    hasDiabetes: false,
    hasHeartDisease: false
  });

  // Result state
  const [predictionData, setPredictionData] = useState(null);

  const predictMutation = useMutation({
    mutationFn: async () => {
      let parameters = cvdParams;
      if (modelType === 'DIABETES') parameters = diabetesParams;
      if (modelType === 'STROKE') parameters = strokeParams;

      const res = await api.post('/assessments/ml-predict', {
        modelType,
        parameters
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      setPredictionData(data);
      toast({
        type: 'success',
        title: 'ML Assessment Evaluated',
        message: `Calculated ${data.prediction.probability}% risk index.`
      });
    },
    onError: () => {
      toast({
        type: 'error',
        title: 'Calculation Error',
        message: 'Could not calculate prediction. Please try again.'
      });
    }
  });

  const getRiskColor = (level) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'HIGH':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
      case 'MEDIUM':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      default:
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  return (
    <DashboardLayout title="ML Health Risk Prediction">
      <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-brand-600 to-violet-800 p-8 text-white shadow-xl shadow-brand-500/20">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-4 border border-white/20">
              <BrainCircuit className="h-3.5 w-3.5" /> Clinical ML & Risk Engine
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Predictive Health Risk & Smart Doctor Recommendation
            </h1>
            <p className="mt-3 text-white/80 text-sm sm:text-base leading-relaxed">
              Calculate quantifiable 10-year clinical disease probabilities using validated Framingham and ADA statistical risk models with real-time specialist matching.
            </p>
          </div>
        </div>

        {/* Model Tabs */}
        <div className="flex gap-2 p-1.5 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border)] max-w-xl">
          {[
            { key: 'CVD', label: 'Cardiovascular (CVD)', icon: HeartPulse },
            { key: 'DIABETES', label: 'Type 2 Diabetes', icon: Activity },
            { key: 'STROKE', label: 'Stroke & Hypertension', icon: Flame }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setModelType(key); setPredictionData(null); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all',
                modelType === key
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Main Interface Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Parameter Inputs */}
          <div className="lg:col-span-7 space-y-6">
            <Card>
              <CardHeader className="pb-3 border-b border-[var(--border)] flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-brand-500" />
                  {modelType === 'CVD' && 'Framingham Cardiovascular Risk Parameters'}
                  {modelType === 'DIABETES' && 'ADA Type 2 Diabetes Risk Parameters'}
                  {modelType === 'STROKE' && 'Stroke & Hypertension Risk Parameters'}
                </CardTitle>
                <span className="text-xs text-[var(--text-muted)] font-medium">Quantifiable clinical metrics</span>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                {/* CVD Parameters */}
                {modelType === 'CVD' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">
                          Age: {cvdParams.age} years
                        </label>
                        <input
                          type="range"
                          min="25"
                          max="85"
                          value={cvdParams.age}
                          onChange={(e) => setCvdParams({ ...cvdParams, age: Number(e.target.value) })}
                          className="w-full accent-brand-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">Gender</label>
                        <select
                          value={cvdParams.gender}
                          onChange={(e) => setCvdParams({ ...cvdParams, gender: e.target.value })}
                          className="input-base"
                        >
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">
                          Systolic BP: {cvdParams.systolicBP} mmHg
                        </label>
                        <input
                          type="range"
                          min="90"
                          max="200"
                          value={cvdParams.systolicBP}
                          onChange={(e) => setCvdParams({ ...cvdParams, systolicBP: Number(e.target.value) })}
                          className="w-full accent-brand-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">
                          Total Chol: {cvdParams.totalChol} mg/dL
                        </label>
                        <input
                          type="range"
                          min="120"
                          max="320"
                          value={cvdParams.totalChol}
                          onChange={(e) => setCvdParams({ ...cvdParams, totalChol: Number(e.target.value) })}
                          className="w-full accent-brand-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">
                          HDL (Good): {cvdParams.hdl} mg/dL
                        </label>
                        <input
                          type="range"
                          min="20"
                          max="90"
                          value={cvdParams.hdl}
                          onChange={(e) => setCvdParams({ ...cvdParams, hdl: Number(e.target.value) })}
                          className="w-full accent-brand-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cvdParams.isSmoker}
                          onChange={(e) => setCvdParams({ ...cvdParams, isSmoker: e.target.checked })}
                          className="h-4 w-4 rounded accent-brand-600"
                        />
                        <span className="text-xs font-medium text-[var(--text-primary)]">Smoker / Tobacco User</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cvdParams.hasDiabetes}
                          onChange={(e) => setCvdParams({ ...cvdParams, hasDiabetes: e.target.checked })}
                          className="h-4 w-4 rounded accent-brand-600"
                        />
                        <span className="text-xs font-medium text-[var(--text-primary)]">Diagnosed Diabetes</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Diabetes Parameters */}
                {modelType === 'DIABETES' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">
                          Age: {diabetesParams.age} years
                        </label>
                        <input
                          type="range"
                          min="20"
                          max="85"
                          value={diabetesParams.age}
                          onChange={(e) => setDiabetesParams({ ...diabetesParams, age: Number(e.target.value) })}
                          className="w-full accent-brand-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">
                          BMI (Body Mass Index): {diabetesParams.bmi}
                        </label>
                        <input
                          type="range"
                          min="18"
                          max="45"
                          step="0.5"
                          value={diabetesParams.bmi}
                          onChange={(e) => setDiabetesParams({ ...diabetesParams, bmi: Number(e.target.value) })}
                          className="w-full accent-brand-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">
                        Physical Activity (hours/week): {diabetesParams.physicalActivityHours} hrs
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={diabetesParams.physicalActivityHours}
                        onChange={(e) => setDiabetesParams({ ...diabetesParams, physicalActivityHours: Number(e.target.value) })}
                        className="w-full accent-brand-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={diabetesParams.familyHistory}
                          onChange={(e) => setDiabetesParams({ ...diabetesParams, familyHistory: e.target.checked })}
                          className="h-4 w-4 rounded accent-brand-600"
                        />
                        <span className="text-xs font-medium text-[var(--text-primary)]">Family History of Diabetes</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={diabetesParams.highBP}
                          onChange={(e) => setDiabetesParams({ ...diabetesParams, highBP: e.target.checked })}
                          className="h-4 w-4 rounded accent-brand-600"
                        />
                        <span className="text-xs font-medium text-[var(--text-primary)]">High Blood Pressure History</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Stroke Parameters */}
                {modelType === 'STROKE' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">
                          Age: {strokeParams.age} years
                        </label>
                        <input
                          type="range"
                          min="30"
                          max="90"
                          value={strokeParams.age}
                          onChange={(e) => setStrokeParams({ ...strokeParams, age: Number(e.target.value) })}
                          className="w-full accent-brand-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">
                          Systolic BP: {strokeParams.systolicBP} mmHg
                        </label>
                        <input
                          type="range"
                          min="100"
                          max="210"
                          value={strokeParams.systolicBP}
                          onChange={(e) => setStrokeParams({ ...strokeParams, systolicBP: Number(e.target.value) })}
                          className="w-full accent-brand-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <label className="flex items-center gap-2 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={strokeParams.hasHypertension}
                          onChange={(e) => setStrokeParams({ ...strokeParams, hasHypertension: e.target.checked })}
                          className="h-4 w-4 rounded accent-brand-600"
                        />
                        <span className="text-xs font-medium text-[var(--text-primary)]">Hypertension</span>
                      </label>
                      <label className="flex items-center gap-2 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={strokeParams.hasDiabetes}
                          onChange={(e) => setStrokeParams({ ...strokeParams, hasDiabetes: e.target.checked })}
                          className="h-4 w-4 rounded accent-brand-600"
                        />
                        <span className="text-xs font-medium text-[var(--text-primary)]">Diabetes</span>
                      </label>
                      <label className="flex items-center gap-2 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={strokeParams.hasHeartDisease}
                          onChange={(e) => setStrokeParams({ ...strokeParams, hasHeartDisease: e.target.checked })}
                          className="h-4 w-4 rounded accent-brand-600"
                        />
                        <span className="text-xs font-medium text-[var(--text-primary)]">Prior Heart Disease</span>
                      </label>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => predictMutation.mutate()}
                  loading={predictMutation.isPending}
                  className="w-full h-11 text-sm font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/20"
                  icon={Sparkles}
                >
                  Calculate ML Risk Prediction
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Prediction Score & Key Drivers */}
          <div className="lg:col-span-5 space-y-6">
            {!predictionData ? (
              <Card className="h-full flex flex-col items-center justify-center p-8 text-center text-[var(--text-muted)] min-h-[320px]">
                <BrainCircuit className="h-16 w-16 mb-4 text-brand-500 opacity-40 animate-pulse" />
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Ready for Evaluation</h3>
                <p className="text-xs text-[var(--text-muted)] max-w-xs mt-1.5 leading-relaxed">
                  Adjust parameters on the left and click "Calculate ML Risk Prediction" to generate your statistical risk score and matching specialists.
                </p>
              </Card>
            ) : (
              <Card className="border-0 shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-r from-brand-600 to-indigo-600 p-6 text-white text-center">
                  <p className="text-xs uppercase font-bold tracking-widest text-white/80">10-Year Probability</p>
                  <div className="text-5xl font-black my-2">
                    {predictionData.prediction.probability}<span className="text-2xl font-light text-white/80">%</span>
                  </div>
                  <span className={cn('px-3 py-1 rounded-full text-xs font-bold uppercase border tracking-wider', getRiskColor(predictionData.prediction.riskLevel))}>
                    {predictionData.prediction.riskLevel} Risk
                  </span>
                </div>

                <CardContent className="p-6 space-y-5">
                  <div>
                    <h4 className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider mb-2">Key Clinical Drivers</h4>
                    <div className="space-y-2">
                      {predictionData.prediction.drivers?.map((d, i) => (
                        <div key={i} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]">
                          <span className="font-medium text-[var(--text-primary)]">{d.factor}</span>
                          <span className={cn('font-bold', d.impact.startsWith('+') ? 'text-amber-500' : 'text-emerald-500')}>
                            {d.impact}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider mb-1.5">Clinical Recommendation</h4>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-brand-500/5 p-3 rounded-xl border border-brand-500/20">
                      {predictionData.recommendations}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Doctor Recommendation Based on Health Issues */}
        {predictionData?.recommendedDoctors?.length > 0 && (
          <div className="space-y-4 pt-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-brand-500" />
                  Recommended Specialists for Your Risk Profile
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Direct matching based on {predictionData.recommendedSpecialties?.join(', ')} requirements
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {predictionData.recommendedDoctors.map((doc) => (
                <Card key={doc.id} className="p-5 flex flex-col justify-between hover:shadow-lg transition-all border hover:border-brand-400">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar firstName={doc.user?.firstName} lastName={doc.user?.lastName} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-[var(--text-primary)] truncate">
                          Dr. {doc.user?.firstName} {doc.user?.lastName}
                        </p>
                        <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 truncate">
                          {doc.specialisation}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-4">
                      <span>{doc.experience || 8}+ yrs exp</span>
                      <span className="flex items-center gap-1 font-bold text-amber-500">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {doc.rating || '4.9'}
                      </span>
                      <span className="font-bold text-[var(--text-primary)]">${doc.consultationFee}/visit</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => setBookingDoctor({
                      id: doc.id,
                      firstName: doc.user?.firstName,
                      lastName: doc.user?.lastName,
                      doctorProfile: { _id: doc.id, specialisation: doc.specialisation, consultationFee: doc.consultationFee }
                    })}
                  >
                    Book Consultation
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {bookingDoctor && (
        <BookingModal
          doctor={bookingDoctor}
          onClose={() => setBookingDoctor(null)}
        />
      )}
    </DashboardLayout>
  );
}
