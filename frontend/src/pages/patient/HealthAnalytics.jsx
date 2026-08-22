import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { Activity, HeartPulse, BrainCircuit, History, TrendingUp, ChevronRight, ImagePlus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import api from '@/lib/api';
import RiskAssessmentResult from '@/components/patient/RiskAssessmentResult';

import DashboardLayout from '@/components/layout/DashboardLayout';

export default function HealthAnalytics() {
  const [symptoms, setSymptoms] = useState('');
  const [vitals, setVitals] = useState({ bp: '', hr: '', temp: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [recommendedDoctors, setRecommendedDoctors] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/assessments/history');
      setHistory(data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch assessment history.', variant: 'error' });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleAnalyze = async () => {
    if (!symptoms.trim()) {
      return toast({ title: 'Input Required', description: 'Please describe your symptoms.', variant: 'error' });
    }

    setIsSubmitting(true);
    try {
      const { data } = await api.post('/assessments/analyze', {
        symptoms,
        vitals: {
          bloodPressure: vitals.bp || undefined,
          heartRate: vitals.hr || undefined,
          temperature: vitals.temp || undefined
        }
      });
      
      setAssessmentResult(data.assessment);
      setRecommendedDoctors(data.recommendedDoctors);
      
      // Update history
      fetchHistory();
      
      toast({ title: 'Analysis Complete', description: 'Your health risk assessment is ready.', type: 'success' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to complete analysis.', variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const chartData = [...history].reverse().map(h => ({
    date: new Date(h.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: h.riskScore
  }));

  return (
    <DashboardLayout title="AI Health Analytics">
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-indigo-600" />
            AI Health Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Analyze your symptoms and track your health risk over time.
          </p>
        </div>
      </div>

      {assessmentResult ? (
        <RiskAssessmentResult 
          result={assessmentResult} 
          recommendedDoctors={recommendedDoctors} 
          onReset={() => {
            setAssessmentResult(null);
            setSymptoms('');
            setVitals({ bp: '', hr: '', temp: '' });
          }} 
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* New Assessment Form */}
          <Card className="lg:col-span-2 border-0 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <CardHeader className="bg-slate-50/50 dark:bg-slate-800/20 pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                New Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex justify-between mb-2">
                    <span>Describe your symptoms in detail <span className="text-red-500">*</span></span>
                  </label>
                  <textarea 
                    placeholder="E.g. I have been having a mild headache for 3 days and feel slightly fatigued..."
                    className="w-full min-h-[120px] resize-none border-slate-200 dark:border-slate-700 focus-visible:ring-indigo-500 rounded-xl px-4 py-3 text-sm border dark:bg-slate-900 focus:outline-none focus:ring-2 shadow-sm"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                  />
                </div>

                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative group">
                  <input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    accept="image/*" 
                    onChange={(e) => {
                      if(e.target.files && e.target.files[0]) {
                        toast({ title: 'Image Attached', description: 'Your photo will be analyzed by the AI.' });
                      }
                    }} 
                  />
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Click or drag photo to attach</p>
                      <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 10MB</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Vitals (Optional)
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <input 
                      type="text" 
                      placeholder="BP (e.g. 120/80)" 
                      className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={vitals.bp}
                      onChange={(e) => setVitals({...vitals, bp: e.target.value})}
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Heart Rate" 
                      className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={vitals.hr}
                      onChange={(e) => setVitals({...vitals, hr: e.target.value})}
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Temp (°F/°C)" 
                      className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={vitals.temp}
                      onChange={(e) => setVitals({...vitals, temp: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleAnalyze} 
                disabled={isSubmitting}
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02]"
              >
                {isSubmitting ? 'Analyzing with AI...' : 'Analyze Symptoms'}
              </Button>
            </CardContent>
          </Card>

          {/* History Chart */}
          <Card className="lg:col-span-1 border-0 shadow-lg bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                Risk Score Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 px-2 pb-6">
              {isLoadingHistory ? (
                <div className="h-[250px] flex items-center justify-center text-slate-400">Loading...</div>
              ) : history.length > 0 ? (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex flex-col items-center justify-center text-slate-400 text-sm text-center px-6">
                  <History className="w-8 h-8 mb-2 opacity-50" />
                  <p>No assessment history yet.</p>
                  <p>Take your first assessment to start tracking.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
