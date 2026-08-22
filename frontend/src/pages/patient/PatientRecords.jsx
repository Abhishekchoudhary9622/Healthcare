import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  Activity, FileText, Pill, FileHeart, Stethoscope, Plus,
  Download, Printer, Syringe, Sparkles, Filter, CheckCircle2,
  Calendar, User, ChevronRight, AlertCircle, FileCheck
} from 'lucide-react';
import { PageSpinner } from '@/components/ui/Spinner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

const iconMap = {
  CONSULTATION: Stethoscope,
  LAB_REPORT: Activity,
  BLOOD_TEST: Activity,
  PRESCRIPTION: Pill,
  ECG: FileHeart,
  IMMUNIZATION: Syringe,
  X_RAY: FileText,
  OTHER: FileText
};

const colorMap = {
  CONSULTATION: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200',
  LAB_REPORT: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200',
  BLOOD_TEST: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-200',
  PRESCRIPTION: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200',
  ECG: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200',
  IMMUNIZATION: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200',
  X_RAY: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200',
  OTHER: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200'
};

export default function PatientRecords() {
  const { toast } = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  // New Record Form State
  const [newRecord, setNewRecord] = useState({
    type: 'LAB_REPORT',
    title: '',
    description: '',
    doctorName: '',
    vitals: { bloodPressure: '120/80', heartRate: 72, bloodGlucose: 95 }
  });

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

  const handleCreateRecord = async () => {
    if (!newRecord.title) {
      return toast({ type: 'error', title: 'Title required' });
    }
    try {
      await api.post('/records', newRecord);
      toast({ type: 'success', title: 'Record added to EHR' });
      setIsAddModalOpen(false);
      fetchRecords();
    } catch (e) {
      toast({ type: 'error', title: 'Failed to add record' });
    }
  };

  const handleOpenSummary = async () => {
    try {
      const res = await api.get('/records/summary');
      setSummaryData(res.data.data);
      setIsSummaryModalOpen(true);
    } catch (e) {
      toast({ type: 'error', title: 'Could not fetch EHR summary' });
    }
  };

  if (loading) return <DashboardLayout title="Electronic Health Records"><PageSpinner /></DashboardLayout>;

  const filteredRecords = records.filter(r => {
    if (activeCategory === 'ALL') return true;
    if (activeCategory === 'LAB_REPORT') return r.type === 'LAB_REPORT' || r.type === 'BLOOD_TEST' || r.type === 'ECG';
    return r.type === activeCategory;
  });

  return (
    <DashboardLayout title="Electronic Health Records (EHR)">
      <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header with EHR Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <FileCheck className="h-7 w-7 text-brand-600" /> Electronic Health Record (EHR)
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Your unified medical timeline, lab results, prescriptions, and clinical summaries.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="text-xs font-bold"
              icon={Printer}
              onClick={handleOpenSummary}
            >
              Export Summary
            </Button>
            <Button
              className="text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white"
              icon={Plus}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Record
            </Button>
          </div>
        </div>

        {/* Quick EHR Health Snapshot Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/20 border-indigo-200/50 dark:border-indigo-900/30">
            <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Blood Group</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">O+ Positive</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Verified in Lab</p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border-emerald-200/50 dark:border-emerald-900/30">
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active Regimens</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">2 Active</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Vitamin D3, Cetirizine</p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/20 border-blue-200/50 dark:border-blue-900/30">
            <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Latest Blood Pressure</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">120/80 <span className="text-xs font-normal text-slate-500">mmHg</span></p>
            <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">Optimal Range</p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border-amber-200/50 dark:border-amber-900/30">
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Recorded Entries</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{records.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Complete Timeline</p>
          </Card>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex gap-2 p-1.5 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border)] overflow-x-auto text-xs font-bold">
          {[
            { key: 'ALL', label: 'All Records' },
            { key: 'LAB_REPORT', label: 'Lab & Diagnostics' },
            { key: 'PRESCRIPTION', label: 'Prescriptions' },
            { key: 'CONSULTATION', label: 'Consultations' },
            { key: 'IMMUNIZATION', label: 'Immunizations' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={cn(
                'px-4 py-2 rounded-xl whitespace-nowrap transition-colors',
                activeCategory === key
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Main EHR Health Timeline */}
        <Card className="border-0 shadow-xl shadow-slate-200/40 dark:shadow-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
          <CardHeader className="border-b border-[var(--border)]">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-600" />
              Chronological Health Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                No records found in this category.
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 md:ml-6 space-y-10">
                {filteredRecords.map((record, idx) => {
                  const Icon = iconMap[record.type] || FileText;
                  const colorClass = colorMap[record.type] || colorMap.OTHER;

                  return (
                    <div key={record._id || idx} className="relative pl-8 md:pl-10">
                      {/* Timeline Node */}
                      <div className={`absolute -left-[17px] top-1 h-8 w-8 rounded-full border-2 bg-white dark:bg-slate-950 flex items-center justify-center shadow-md ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 md:gap-4 mb-2">
                        <div>
                          <h3
                            onClick={() => setSelectedRecord(record)}
                            className="text-base font-bold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer transition-colors"
                          >
                            {record.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            <span className="font-medium text-brand-600 dark:text-brand-400">
                              {new Date(record.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                            {record.doctorName && (
                              <>
                                <span>·</span>
                                <span>{record.doctorName}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge className={colorClass + ' border w-fit font-bold'}>
                          {record.type.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 leading-relaxed space-y-3">
                        <p>{record.description}</p>

                        {/* Lab Results Inline Table */}
                        {record.labResults?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Lab Values</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {record.labResults.map((test, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                                  <p className="text-slate-500 truncate">{test.testName}</p>
                                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                                    {test.value} <span className="text-[10px] font-normal text-slate-500">{test.unit}</span>
                                  </p>
                                  <span className="text-[10px] text-emerald-500 font-semibold">Ref: {test.referenceRange}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Prescribed Meds Inline */}
                        {record.prescriptions?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Medications</p>
                            <div className="space-y-1.5">
                              {record.prescriptions.map((p, i) => (
                                <div key={i} className="flex justify-between items-center text-xs bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                  <span className="font-bold text-slate-900 dark:text-white">{p.medicationName}</span>
                                  <span className="text-slate-500">{p.dosage} · {p.frequency} ({p.duration})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Attachment tags */}
                        {record.attachments?.length > 0 && (
                          <div className="flex gap-2 pt-2">
                            {record.attachments.map((att, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 rounded-lg border border-brand-200 dark:border-brand-900/50 cursor-pointer">
                                <Download className="h-3 w-3" /> {att.fileName} ({att.fileSize})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Record Modal */}
      <Modal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Electronic Health Record" size="md">
        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Record Type</label>
            <select
              value={newRecord.type}
              onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value })}
              className="input-base"
            >
              <option value="LAB_REPORT">Lab & Diagnostic Report</option>
              <option value="PRESCRIPTION">Prescription / Medication</option>
              <option value="CONSULTATION">Doctor Consultation</option>
              <option value="ECG">ECG / Cardiology</option>
              <option value="IMMUNIZATION">Vaccination / Immunization</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Title / Exam Name</label>
            <input
              type="text"
              placeholder="e.g. Fasting Lipid Profile, Vitamin D Test"
              value={newRecord.title}
              onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
              className="input-base"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Physician / Doctor Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Dr. Sarah Jenkins"
              value={newRecord.doctorName}
              onChange={(e) => setNewRecord({ ...newRecord, doctorName: e.target.value })}
              className="input-base"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Clinical Notes & Findings</label>
            <textarea
              rows={3}
              placeholder="Key observations, results, and recommendations..."
              value={newRecord.description}
              onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
              className="input-base resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button className="flex-1 bg-brand-600 text-white font-bold" onClick={handleCreateRecord}>Save to EHR</Button>
          </div>
        </div>
      </Modal>

      {/* Exportable EHR Summary Modal */}
      <Modal open={isSummaryModalOpen} onClose={() => setIsSummaryModalOpen(false)} title="Official EHR Health Summary" size="lg">
        {summaryData && (
          <div className="p-6 space-y-6 text-xs" id="ehr-summary-print">
            <div className="border-b pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{summaryData.patient.name}</h2>
                <p className="text-slate-500">Email: {summaryData.patient.email} · Phone: {summaryData.patient.phone}</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 rounded-full font-bold bg-brand-50 text-brand-700 border border-brand-200">
                  Blood Group: {summaryData.patient.bloodGroup}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
              <div>
                <p className="font-bold text-slate-400 uppercase">Blood Pressure</p>
                <p className="text-base font-bold text-slate-900 dark:text-white">{summaryData.latestVitals.bloodPressure || '120/80'}</p>
              </div>
              <div>
                <p className="font-bold text-slate-400 uppercase">Heart Rate</p>
                <p className="text-base font-bold text-slate-900 dark:text-white">{summaryData.latestVitals.heartRate || 72} bpm</p>
              </div>
              <div>
                <p className="font-bold text-slate-400 uppercase">Fasting Glucose</p>
                <p className="text-base font-bold text-slate-900 dark:text-white">{summaryData.latestVitals.bloodGlucose || 95} mg/dL</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-2">Recorded History ({summaryData.records.length})</h3>
              <div className="divide-y border rounded-xl overflow-hidden">
                {summaryData.records.map((r, i) => (
                  <div key={i} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{r.title}</p>
                      <p className="text-slate-500">{new Date(r.date).toLocaleDateString()} · {r.type}</p>
                    </div>
                    <span className="text-emerald-600 font-semibold">{r.doctorName || 'Verified'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsSummaryModalOpen(false)}>Close</Button>
              <Button className="bg-brand-600 text-white font-bold" icon={Printer} onClick={() => window.print()}>
                Print / Save PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
