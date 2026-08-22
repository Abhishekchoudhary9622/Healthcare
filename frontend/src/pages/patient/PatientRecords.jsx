import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Activity, FileText, Pill, FileHeart, Stethoscope, ChevronDown } from 'lucide-react';
import { PageSpinner } from '@/components/ui/Spinner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';

const iconMap = {
  CONSULTATION: Stethoscope,
  BLOOD_TEST: Activity,
  PRESCRIPTION: Pill,
  ECG: FileHeart,
  X_RAY: FileText,
  OTHER: FileText
};

const colorMap = {
  CONSULTATION: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200',
  BLOOD_TEST: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-200',
  PRESCRIPTION: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200',
  ECG: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200',
  X_RAY: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200',
  OTHER: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200'
};

export default function PatientRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await api.get('/records/timeline');
      setRecords(res.data);
    } catch (error) {
      console.error('Failed to fetch medical records:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DashboardLayout title="Medical Records"><PageSpinner /></DashboardLayout>;

  return (
    <DashboardLayout title="Medical Records">
      <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Medical Records</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Your comprehensive electronic health record timeline.</p>
      </div>

      <Card className="border-0 shadow-xl shadow-slate-200/40 dark:shadow-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            Health Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No medical records found.
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 md:ml-6 mt-4 space-y-12">
              {records.map((record, idx) => {
                const Icon = iconMap[record.type] || FileText;
                const colorClass = colorMap[record.type] || colorMap.OTHER;
                
                return (
                  <div key={record._id || idx} className="relative pl-8 md:pl-10">
                    {/* Timeline Node */}
                    <div className={`absolute -left-[17px] top-1 h-8 w-8 rounded-full border-2 bg-white dark:bg-slate-950 flex items-center justify-center ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 md:gap-4 mb-2">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                          {record.title}
                        </h3>
                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                          {new Date(record.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      <Badge className={colorClass + ' border w-fit'}>
                        {record.type.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 leading-relaxed">
                      {record.description}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}
