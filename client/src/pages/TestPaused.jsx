import React from 'react';
import { Lock, ShieldAlert, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

export default function TestPaused() {
  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0C1410] text-[#212529] dark:text-gray-100 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200 relative overflow-hidden flex flex-col justify-between">
      {/* Background ambient gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-rose-500/10 via-amber-500/5 to-transparent blur-3xl pointer-events-none" />

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

      {/* Main Disabled Card */}
      <div className="max-w-md mx-auto w-full my-auto text-center relative z-10 py-6">
        <div className="bg-white/95 dark:bg-[#14221B]/95 backdrop-blur-md border border-gray-200/90 dark:border-[#284033] rounded-3xl p-8 sm:p-10 shadow-2xl">
          {/* Status Icon */}
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 border border-rose-200/80 dark:border-rose-900/50">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Portal Disabled</span>
          </div>

          {/* Exact User Requested Heading */}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3">
            Now test is disabled
          </h2>

          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            The online assessment portal is currently disabled. Please wait for official instructions from the coordinator.
          </p>

          {/* Minimal info note */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1B2B23] border border-gray-200/70 dark:border-[#2F4A3C] rounded-xl py-3 px-4">
            <ShieldAlert className="w-4 h-4 text-gray-400 shrink-0" />
            <span>New registrations and test sessions are temporarily suspended.</span>
          </div>
        </div>

        {/* Admin Link */}
        <div className="mt-6 text-center">
          <Link
            to="/admin/login"
            className="text-xs text-gray-400 hover:text-[#198754] dark:text-gray-500 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1 font-medium"
          >
            <span>Coordinator / Admin Login</span>
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
