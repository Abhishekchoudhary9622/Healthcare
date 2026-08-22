import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Activity, HeartPulse, Brain, AlertCircle, ArrowRight, UserPlus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

export default function RiskAssessmentResult({ result, recommendedDoctors, onReset }) {
  const navigate = useNavigate();
  
  if (!result) return null;

  const { riskScore, riskLevel, shapExplanations, recommendations } = result;

  // Prepare SHAP data for chart
  const shapData = shapExplanations
    .map((item) => ({
      name: item.feature,
      impact: item.impact,
      isPositive: item.impact > 0
    }))
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)) // Sort by absolute impact
    .slice(0, 5); // Take top 5 for cleaner UI

  const getRiskColor = (level) => {
    switch(level) {
      case 'LOW': return 'bg-emerald-500 text-white';
      case 'MEDIUM': return 'bg-amber-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'CRITICAL': return 'bg-red-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getRiskGradient = (level) => {
    switch(level) {
      case 'LOW': return 'from-emerald-400 to-emerald-600';
      case 'MEDIUM': return 'from-amber-400 to-amber-600';
      case 'HIGH': return 'from-orange-400 to-orange-600';
      case 'CRITICAL': return 'from-red-500 to-red-700';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Section: Score & Recommendation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Risk Score Card */}
        <Card className="col-span-1 md:col-span-1 border-0 shadow-lg overflow-hidden relative">
          <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${getRiskGradient(riskLevel)}`}></div>
          <CardContent className="p-8 flex flex-col items-center justify-center h-full text-center">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-xl bg-gradient-to-br ${getRiskGradient(riskLevel)}`}>
              <div className="w-28 h-28 rounded-full bg-white dark:bg-slate-900 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-slate-800 dark:text-white">{riskScore}</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">/ 100</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Health Risk Score</h3>
            <Badge className={`px-4 py-1.5 text-sm font-semibold rounded-full ${getRiskColor(riskLevel)} border-0`}>
              {riskLevel} RISK
            </Badge>
          </CardContent>
        </Card>

        {/* AI Recommendations Card */}
        <Card className="col-span-1 md:col-span-2 border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">AI Analysis & Next Steps</h3>
            </div>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed bg-white/60 dark:bg-slate-900/60 p-6 rounded-2xl backdrop-blur-sm border border-white/40 dark:border-slate-700/50">
              {recommendations}
            </p>
            <div className="mt-6 flex justify-end">
              <Button onClick={onReset} variant="outline" className="mr-3 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-900/50">
                New Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SHAP Explanation Visualization */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-lg">Risk Factor Breakdown (SHAP Analysis)</CardTitle>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            How different symptoms and vitals impacted your risk score. (Red increases risk, Green decreases it)
          </p>
        </CardHeader>
        <CardContent className="p-6 h-[350px]">
          {shapData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={shapData} margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 13 }}
                  width={150}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700">
                          <p className="font-semibold text-slate-800 dark:text-white">{data.name}</p>
                          <p className={`font-bold ${data.isPositive ? 'text-red-500' : 'text-emerald-500'}`}>
                            {data.isPositive ? '+' : ''}{data.impact}% impact on risk
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="impact" radius={[0, 4, 4, 0]} barSize={24}>
                  {shapData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isPositive ? '#ef4444' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              No detailed breakdown available for this assessment.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Doctor Recommendations */}
      {recommendedDoctors && recommendedDoctors.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-6">
            <HeartPulse className="w-6 h-6 text-pink-500" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Recommended Specialists</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedDoctors.map((doc) => (
              <Card key={doc.id} className="border-0 shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer" onClick={() => navigate('/patient/doctors')}>
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-transparent group-hover:border-indigo-500 transition-colors">
                    {doc.user.avatar ? (
                      <img src={doc.user.avatar} alt="Dr." className="w-full h-full object-cover" />
                    ) : (
                      <UserPlus className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Dr. {doc.user.firstName} {doc.user.lastName}
                    </h4>
                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-1">{doc.specialisation}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> {doc.experience} years exp
                    </p>
                    <Button variant="link" className="px-0 mt-2 h-auto text-sm text-indigo-600 group-hover:text-indigo-700 p-0 flex items-center">
                      Book Appointment <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
