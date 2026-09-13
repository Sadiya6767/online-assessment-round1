import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Building, Calendar, Mail, User, FileCheck, Copy, Check } from 'lucide-react';
import { assessmentAPI } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

export default function AssessmentCompletion() {
  const { assessmentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await assessmentAPI.getStatus(assessmentId);
        setData(res.data);
      } catch (err) {
        console.error('Failed to load assessment status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Prevent back navigation
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [assessmentId]);

  const handleCopyId = () => {
    const refId = data?.assessmentId || assessmentId;
    navigator.clipboard.writeText(refId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (isoString) => {
    if (!isoString) return new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    return new Date(isoString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0C1410] text-[#212529] dark:text-gray-100 py-12 px-4 sm:px-6 flex flex-col items-center justify-center transition-colors duration-200 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#198754]/10 dark:bg-[#198754]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full flex justify-end mb-3 relative z-10">
        <ThemeToggle />
      </div>

      <div className="max-w-xl w-full bg-white dark:bg-[#14221B] rounded-3xl border border-gray-200/90 dark:border-[#284033] shadow-soft dark:shadow-dark-soft p-6 sm:p-10 text-center relative z-10 overflow-hidden">
        {/* Top green gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-[#198754] via-[#24A66B] to-[#146C43]" />

        {/* Ambient Halo Behind Green Success Badge */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5">
          <div className="absolute inset-0 bg-[#198754]/20 dark:bg-emerald-500/20 rounded-full blur-lg animate-pulse" />
          <div className="relative w-full h-full bg-[#EAF7EF] dark:bg-[#1D3327] border-2 border-[#C8E8D5] dark:border-[#294337] rounded-full flex items-center justify-center text-[#198754] dark:text-emerald-400 shadow-md">
            <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14" />
          </div>
        </div>

        {/* Main Heading: Test Submitted Successfully! */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Test Submitted Successfully!
        </h1>

        {/* Thank You Note */}
        <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed max-w-md mx-auto">
          Thank you for completing the Round 1 assessment. Your responses have been recorded successfully.
          Our recruitment team will review your performance and contact you regarding the next steps.
        </p>

        {/* Digital Submission Receipt Card */}
        <div className="mt-8 bg-gray-50/90 dark:bg-[#1B2B23]/70 rounded-2xl border border-gray-200/80 dark:border-[#284033] p-5 sm:p-6 text-left text-sm space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800/80 text-xs font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-[#146C43] dark:text-emerald-400">
              <FileCheck className="w-4 h-4 text-[#198754] dark:text-emerald-400" /> Official Submission Receipt
            </span>
            <span className="bg-[#EAF7EF] dark:bg-[#20392B] text-[#146C43] dark:text-emerald-300 px-3 py-0.5 rounded-full font-bold text-[11px]">
              {data?.status || 'SUBMITTED'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 text-xs sm:text-sm">
            {/* Reference ID with Copy Button */}
            <div>
              <div className="text-gray-400 dark:text-gray-400 text-xs font-medium">Reference ID</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono font-bold text-gray-800 dark:text-gray-200 text-xs sm:text-sm truncate">
                  {data?.assessmentId || assessmentId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  title="Copy Reference ID"
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <div className="text-gray-400 dark:text-gray-400 text-xs font-medium">Candidate ID</div>
              <div className="font-mono font-bold text-gray-800 dark:text-gray-200 text-xs sm:text-sm truncate mt-0.5">
                {data?.candidateId || 'Recorded'}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <div className="text-gray-400 text-xs font-medium">Candidate Name</div>
                <div className="font-bold text-gray-800 dark:text-gray-200">{data?.candidateName || 'Candidate'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="truncate">
                <div className="text-gray-400 text-xs font-medium">Registered Email</div>
                <div className="font-medium text-gray-800 dark:text-gray-200 truncate">{data?.email || '-'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="truncate">
                <div className="text-gray-400 text-xs font-medium">College / University</div>
                <div className="font-medium text-gray-800 dark:text-gray-200 truncate">{data?.collegeName || '-'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <div className="text-gray-400 text-xs font-medium">Submission Timestamp</div>
                <div className="font-medium text-gray-800 dark:text-gray-200 text-xs">{formatDate(data?.submissionTime)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Confirmed Footer */}
        <div className="mt-6 text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#198754]" />
          <span>Round 1 Assessment • Verification Confirmed</span>
        </div>
      </div>
    </div>
  );
}
