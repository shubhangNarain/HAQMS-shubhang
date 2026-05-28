'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/common/Navbar';
import Link from 'next/link';
import {
  ArrowLeft, Calendar, FileText, User, Mail, Phone, HeartPulse,
  Clock, ShieldAlert, Award, ClipboardList, CheckCircle, AlertCircle,
  FileSpreadsheet, Download, ExternalLink, CalendarDays, Activity
} from 'lucide-react';

export default function PatientHistoryPage() {
  const { user, token, API_BASE_URL } = useAuth();
  const params = useParams();
  const router = useRouter();
  const patientId = params?.id;

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Navigation Guard: Redirect to login if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const fetchPatientDetails = useCallback(async () => {
    if (!token || !patientId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Patient not found in the directory database.');
        }
        throw new Error('Failed to retrieve patient diagnostic reports.');
      }
      const data = await res.json();
      setPatient(data);
      setError('');
    } catch (err) {
      console.error('Error fetching patient diagnostic reports:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, patientId, token]);

  useEffect(() => {
    fetchPatientDetails();
  }, [fetchPatientDetails]);

  // Generate some realistic mock diagnostics reports to populate the legacy app details section
  const mockReports = [
    { id: '1', name: 'Comprehensive Metabolic Panel (CMP)', category: 'Lab Report', date: 'May 12, 2026', doctor: 'Dr. Sarah Jenkins', status: 'Approved', size: '1.2 MB' },
    { id: '2', name: 'Electrocardiogram (ECG) Analysis', category: 'Cardiology', date: 'April 20, 2026', doctor: 'Dr. Robert Chen', status: 'Approved', size: '2.4 MB' },
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8">

        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Patient Directory
          </Link>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="pulse-loader">
              <div></div>
              <div></div>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-400">Retrieving patient medical reports & history...</p>
          </div>
        ) : error ? (
          <div className="glass p-8 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-center max-w-xl mx-auto shadow-lg">
            <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Failed to Load Reports</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">{error}</p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex items-center justify-center px-4 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all duration-300 shadow-md hover:shadow-teal-500/20"
            >
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Patient Header Identity Card */}
            <div className="glass p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-teal-500/10 transition-colors duration-500"></div>

              <div className="flex items-center gap-4 relative z-10">
                <div className="p-4 bg-teal-500/15 text-teal-600 dark:text-teal-400 rounded-2xl border border-teal-500/20">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                      {patient.name}
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 uppercase">
                      ID: {patient.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-sm text-slate-500 dark:text-slate-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <strong>Age:</strong> {patient.age} years
                    </span>
                    <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                    <span className="flex items-center gap-1.5">
                      <strong>Gender:</strong> {patient.gender}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                    <span className="flex items-center gap-1.5">
                      <strong>Status:</strong> Active Clinical File
                    </span>
                  </div>
                </div>
              </div>

              {/* Patient Contact Details */}
              <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-4 lg:gap-8 relative z-10 w-full md:w-auto p-4 bg-slate-500/5 rounded-xl border border-slate-200/50 dark:border-slate-800">
                <div className="flex items-center gap-2.5 text-xs">
                  <Phone className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider text-xxs">Phone Number</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{patient.phoneNumber}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  <Mail className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <div>
                    <span className="block text-slate-400 font-bold uppercase tracking-wider text-xxs">Email Address</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{patient.email || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-8 lg:grid-cols-3">

              {/* Left Column: Medical History & Diagnostic Records */}
              <div className="lg:col-span-1 space-y-8">

                {/* Clinical Background Card */}
                <div className="glass rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col hover:border-teal-500/30 transition-all duration-300">
                  <div className="bg-slate-500/5 p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                    <HeartPulse className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">Clinical Background</h3>
                  </div>
                  <div className="p-6">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs">
                      <h4 className="font-extrabold text-slate-400 uppercase tracking-wider mb-2">Registered Anamnesis</h4>
                      <p className="text-slate-700 dark:text-slate-300 leading-6 text-sm font-semibold whitespace-pre-line">
                        {patient.medicalHistory?.toUpperCase() || 'NO CLINICAL MEDICAL HISTORY RECORDED'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Diagnostic Reports File Repository (Legacy App Mode) */}
                <div className="glass rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col hover:border-teal-500/30 transition-all duration-300">
                  <div className="bg-slate-500/5 p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                      <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">Legacy Reports</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xxs font-extrabold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 uppercase">
                      4 Files
                    </span>
                  </div>

                  <div className="p-6 space-y-4">
                    {mockReports.map((report) => (
                      <div
                        key={report.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 hover:border-teal-500/30 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-3 group/item hover:shadow-sm transition-all duration-300"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg group-hover/item:bg-teal-500 group-hover/item:text-white transition-colors duration-300">
                            <FileSpreadsheet className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="block text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-1 group-hover/item:text-teal-600 dark:group-hover/item:text-teal-400 transition-colors">
                              {report.name}
                            </span>
                            <span className="block text-xxs text-slate-400 mt-0.5 font-semibold">
                              {report.category} • {report.date}
                            </span>
                          </div>
                        </div>

                        <button
                          className="p-2 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-lg hover:bg-teal-500/10 transition-all duration-300"
                          title="Download report PDF"
                          onClick={() => alert(`Downloading ${report.name} (${report.size})...`)}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column: Appointment Records Table */}
              <div className="lg:col-span-2 space-y-8">

                {/* Appointments History List */}
                <div className="glass rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-full hover:border-teal-500/30 transition-all duration-300">
                  <div className="bg-slate-500/5 p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <ClipboardList className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                      <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">Consultation & Appointment History</h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {patient.appointments.length} Total
                    </span>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    {patient.appointments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Calendar className="h-12 w-12 text-slate-400 mb-4 animate-bounce" />
                        <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">No Appointments Registered</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 max-w-sm">
                          This patient record is currently clean. No past, present, or pending medical appointments have been scheduled.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {patient.appointments.map((appt) => {
                          const formattedDate = new Date(appt.appointmentDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          });

                          const formattedTime = new Date(appt.appointmentDate).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          });

                          return (
                            <div
                              key={appt.id}
                              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-500/5 relative overflow-hidden group/appt hover:border-teal-500/20 transition-all duration-300"
                            >
                              {/* Background highlight hover effect */}
                              <div className="absolute inset-y-0 left-0 w-1.5 bg-teal-500 transition-all duration-300 group-hover/appt:w-2"></div>

                              <div className="pl-3 sm:pl-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                                      <CalendarDays className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                                      {formattedDate}
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>
                                    <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                                      <Clock className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                                      {formattedTime}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                                      {appt.doctor?.name || `Physician ID: ${appt.doctorId.slice(0, 8)}`}
                                    </span>
                                    {appt.doctor?.specialization && (
                                      <span className="px-2 py-0.5 rounded text-xxs font-extrabold uppercase bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                                        {appt.doctor.specialization}
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    <strong>Consultation Fee:</strong> ${appt.doctor?.consultationFee?.toFixed(2) || '45.00'} | <strong>Dept:</strong> {appt.doctor?.department || 'General Medicine'}
                                  </p>

                                  {appt.reason && (
                                    <div className="mt-2.5 p-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-xs italic text-slate-600 dark:text-slate-400 leading-5">
                                      &ldquo;{appt.reason}&rdquo;
                                    </div>
                                  )}
                                </div>

                                {/* Status Badge */}
                                <div className="sm:text-right shrink-0 pl-3 sm:pl-0">
                                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${appt.status === 'COMPLETED'
                                      ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20'
                                      : appt.status === 'CANCELLED'
                                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                    }`}>
                                    {appt.status === 'COMPLETED' && <CheckCircle className="h-3 w-3" />}
                                    {appt.status === 'CANCELLED' && <AlertCircle className="h-3 w-3" />}
                                    {appt.status === 'PENDING' && <Clock className="h-3 w-3 animate-pulse" />}
                                    {appt.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}
      </main>
    </div>
  );
}
