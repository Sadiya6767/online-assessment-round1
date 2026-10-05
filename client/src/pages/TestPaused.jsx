import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Hourglass, Lock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

// 1 Hour Pause Target: 2:35 PM IST (09:05:00 UTC)
export const TEST_RESUME_TIME = new Date('2026-10-05T09:05:00.000Z').getTime();

export default function TestPaused({ onResume }) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, TEST_RESUME_TIME - Date.now()));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, TEST_RESUME_TIME - Date.now());
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        if (onResume) onResume();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [onResume]);

  const totalSeconds = Math.floor(timeLeft / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0C1410] text-[#212529] dark:text-gray-100 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200 relative overflow-hidden flex flex-col justify-between">
      {/* Background ambient gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-amber-500/10 via-[#198754]/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <div className="max-w-2xl mx-auto w-full flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#198754] flex items-center justify-center text-white font-bold text-sm shadow-md">
            N
          </div>
          <span className="font-bold text-sm tracking-tight text-gray-900 dark:text-white">Nexis Assessment</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Main Pause Card */}
      <div className="max-w-lg mx-auto w-full my-auto text-center relative z-10 py-6">
        <div className="bg-white/90 dark:bg-[#14221B]/90 backdrop-blur-md border border-gray-200/80 dark:border-[#284033] rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 border border-amber-200/80 dark:border-amber-800/50">
            <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600 dark:text-amber-400" />
            <span>Test Window Temporarily Paused</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3">
            Assessment is Paused for 1 Hour
          </h2>

          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            The candidate registration and test portal is temporarily disabled for an administrative break.
            The portal will automatically reopen at <strong className="text-gray-900 dark:text-white">2:35 PM IST</strong>.
          </p>

          {/* Countdown Clock Display */}
          <div className="bg-gray-50/90 dark:bg-[#1B2B23] border border-gray-200/70 dark:border-[#2F4A3C] rounded-2xl p-4 sm:p-5 mb-6">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Time Remaining Until Reopening
            </div>
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              <div className="bg-white dark:bg-[#14221B] rounded-xl p-2.5 border border-gray-100 dark:border-gray-800 shadow-xs">
                <div className="text-2xl sm:text-3xl font-mono font-bold text-[#198754] dark:text-emerald-400">
                  {String(hours).padStart(2, '0')}
                </div>
                <div className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">Hours</div>
              </div>
              <div className="bg-white dark:bg-[#14221B] rounded-xl p-2.5 border border-gray-100 dark:border-gray-800 shadow-xs">
                <div className="text-2xl sm:text-3xl font-mono font-bold text-[#198754] dark:text-emerald-400">
                  {String(minutes).padStart(2, '0')}
                </div>
                <div className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">Mins</div>
              </div>
              <div className="bg-white dark:bg-[#14221B] rounded-xl p-2.5 border border-gray-100 dark:border-gray-800 shadow-xs">
                <div className="text-2xl sm:text-3xl font-mono font-bold text-[#198754] dark:text-emerald-400">
                  {String(seconds).padStart(2, '0')}
                </div>
                <div className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">Secs</div>
              </div>
            </div>
          </div>

          {/* Info Notes */}
          <div className="space-y-2 text-left bg-emerald-50/50 dark:bg-[#1A2E24]/50 border border-emerald-100 dark:border-[#294337] rounded-xl p-3.5 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#198754] dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>You do not need to refresh. This page will automatically unlock when the timer finishes.</span>
            </div>
            <div className="flex items-start gap-2">
              <Hourglass className="w-4 h-4 text-[#198754] dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>If you were instructed to wait for batch commencement, please stay on this screen.</span>
            </div>
          </div>
        </div>

        {/* Admin Link */}
        <div className="mt-6 text-center">
          <Link
            to="/admin/login"
            className="text-xs text-gray-500 hover:text-[#198754] dark:text-gray-400 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1 font-medium"
          >
            <Lock className="w-3 h-3" />
            <span>Coordinator / Admin Portal Login</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 dark:text-gray-500 relative z-10 pb-2">
        Round 1 Online Assessment Platform • Protected Evaluation System
      </footer>
    </div>
  );
}
