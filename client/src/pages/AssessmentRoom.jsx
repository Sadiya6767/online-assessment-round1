import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ShieldAlert, CheckCircle, AlertTriangle, Sparkles, ShieldCheck } from 'lucide-react';
import { assessmentAPI } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

export default function AssessmentRoom() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(50);
  const [question, setQuestion] = useState(null);
  const [interestedProfile, setInterestedProfile] = useState(localStorage.getItem('nexis_interested_profile') || '');

  // Strictly 12 seconds per question
  const QUESTION_TOTAL_DURATION = 12;
  const [timerRatio, setTimerRatio] = useState(1.0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoAdvanceAlert, setAutoAdvanceAlert] = useState(false);

  // Anti-Cheating & Proctoring States
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showStrikeModal, setShowStrikeModal] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const lastViolationTimeRef = useRef(0);
  const isCompletedRef = useRef(false);

  const questionIntervalRef = useRef(null);
  const questionStartTimeRef = useRef(Date.now());
  const isAutoAdvancingRef = useRef(false);

  const fetchCurrentState = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError('');

      const res = await assessmentAPI.getCurrentQuestion(assessmentId);

      if (res.data.completed) {
        isCompletedRef.current = true;
        navigate(`/test/${assessmentId}/completed`);
        return;
      }

      setCandidateName(res.data.candidateName || 'Candidate');
      if (res.data.interestedProfile) {
        setInterestedProfile(res.data.interestedProfile);
        localStorage.setItem('nexis_interested_profile', res.data.interestedProfile);
      }
      setCurrentQuestionNumber(res.data.currentQuestionNumber);
      setTotalQuestions(res.data.totalQuestions);
      setQuestion(res.data.question);
      setSelectedOption(null);
      setIsSubmitting(false);
    } catch (err) {
      console.error('Failed to load assessment:', err);
      // Auto-retry silently up to 3 times
      if (retryCount < 3) {
        setTimeout(() => {
          fetchCurrentState(retryCount + 1);
        }, 600);
        return;
      }
      setError(err.response?.data?.error || 'Failed to connect to assessment server. Reconnecting...');
    } finally {
      setLoading(false);
    }
  };

  // Anti-Back Navigation and Keystroke Protections
  useEffect(() => {
    // Lock browser history so back button cannot leave the assessment
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);

    // Disable Right-Click Context Menu
    const handleContextMenu = (e) => e.preventDefault();
    window.addEventListener('contextmenu', handleContextMenu);

    // Disable Copy, Cut, Paste
    const handleCopy = (e) => e.preventDefault();
    window.addEventListener('copy', handleCopy);
    window.addEventListener('cut', handleCopy);
    window.addEventListener('paste', handleCopy);

    // Disable Developer Tools and Back Keystrokes
    const handleKeyDown = (e) => {
      // F12 or Ctrl+Shift+I/J/C or Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U'))
      ) {
        e.preventDefault();
        return false;
      }
      // Alt+ArrowLeft (browser back) or Backspace outside text input
      if (
        (e.altKey && e.key === 'ArrowLeft') ||
        (e.key === 'Backspace' && !['INPUT', 'TEXTAREA'].includes(e.target?.tagName))
      ) {
        e.preventDefault();
        return false;
      }
      // Ctrl+C / Ctrl+V / Ctrl+A / Ctrl+X
      if (e.ctrlKey && ['c', 'C', 'v', 'V', 'a', 'A', 'x', 'X'].includes(e.key)) {
        e.preventDefault();
        return false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const handleBeforeUnload = (e) => {
      if (!isCompletedRef.current) {
        e.preventDefault();
        e.returnValue = 'Assessment in progress. Leaving this page will submit your test automatically.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('cut', handleCopy);
      window.removeEventListener('paste', handleCopy);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Initial Data Load
  useEffect(() => {
    fetchCurrentState();
    return () => {
      if (questionIntervalRef.current) clearInterval(questionIntervalRef.current);
    };
  }, [assessmentId]);

  // Tab-Switching and Window Blur Detection
  useEffect(() => {
    const handleTabViolation = async () => {
      const now = Date.now();
      // Debounce events occurring within 2 seconds
      if (now - lastViolationTimeRef.current < 2000) return;
      lastViolationTimeRef.current = now;

      if (isCompletedRef.current || isTerminated) return;

      const nextCount = tabSwitchCount + 1;
      setTabSwitchCount(nextCount);

      if (nextCount === 1) {
        // Strike 1 Warning
        setShowStrikeModal(true);
        try {
          await assessmentAPI.recordViolation(assessmentId, { type: 'TAB_SWITCH', autoTerminate: false });
        } catch (err) {
          console.warn('Violation record error:', err);
        }
      } else {
        // Strike 2 - Auto Terminate!
        setIsTerminated(true);
        setShowStrikeModal(false);
        try {
          await assessmentAPI.recordViolation(assessmentId, { type: 'TAB_SWITCH', autoTerminate: true });
        } catch (err) {
          console.warn('Violation terminate error:', err);
        }
        setTimeout(() => {
          isCompletedRef.current = true;
          navigate(`/test/${assessmentId}/completed`);
        }, 3000);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleTabViolation();
      }
    };

    const handleWindowBlur = () => {
      handleTabViolation();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [assessmentId, tabSwitchCount, isTerminated]);

  // Auto-reconnect if notice ever appears
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => {
      setError('');
      fetchCurrentState();
    }, 2000);
    return () => clearTimeout(timer);
  }, [error]);

  // Synchronized 12s Per-Question Timer
  useEffect(() => {
    if (!question || loading || isTerminated) return;

    questionStartTimeRef.current = Date.now();
    isAutoAdvancingRef.current = false;
    setTimerRatio(1.0);
    setAutoAdvanceAlert(false);

    if (questionIntervalRef.current) clearInterval(questionIntervalRef.current);

    questionIntervalRef.current = setInterval(() => {
      const elapsedSec = (Date.now() - questionStartTimeRef.current) / 1000;
      const ratio = Math.max(0, (QUESTION_TOTAL_DURATION - elapsedSec) / QUESTION_TOTAL_DURATION);
      setTimerRatio(ratio);

      // Warning when approaching the end (at 9.5s mark)
      if (elapsedSec >= 9.5) {
        setAutoAdvanceAlert(true);
      }

      // Hard auto-advance at 12 seconds
      if (elapsedSec >= QUESTION_TOTAL_DURATION) {
        clearInterval(questionIntervalRef.current);
        if (!isAutoAdvancingRef.current) {
          isAutoAdvancingRef.current = true;
          triggerAutoAdvance();
        }
      }
    }, 100);

    return () => {
      if (questionIntervalRef.current) clearInterval(questionIntervalRef.current);
    };
  }, [question?.id, loading, isTerminated]);

  // Automatically submit and advance when question 12s limit expires
  const triggerAutoAdvance = async () => {
    if (isSubmitting || isTerminated) return;
    setIsSubmitting(true);

    const fallbackChoice = selectedOption || 'TIMEOUT';
    try {
      const res = await assessmentAPI.submitAnswer(assessmentId, question.id, fallbackChoice);

      if (res.data.completed) {
        isCompletedRef.current = true;
        navigate(`/test/${assessmentId}/completed`);
      } else {
        await fetchCurrentState();
      }
    } catch (err) {
      console.warn('Auto-advance submission error, retrying:', err);
      try {
        await new Promise((r) => setTimeout(r, 400));
        const res2 = await assessmentAPI.submitAnswer(assessmentId, question.id, fallbackChoice);
        if (res2.data.completed) {
          isCompletedRef.current = true;
          navigate(`/test/${assessmentId}/completed`);
        } else {
          await fetchCurrentState();
        }
      } catch (err2) {
        await fetchCurrentState();
      }
    }
  };

  // Immediate option selection by candidate
  const handleOptionSelect = async (optionLabel) => {
    if (isSubmitting || selectedOption !== null || isTerminated) return;

    if (questionIntervalRef.current) clearInterval(questionIntervalRef.current);
    setSelectedOption(optionLabel);
    setIsSubmitting(true);

    try {
      const res = await assessmentAPI.submitAnswer(assessmentId, question.id, optionLabel);

      if (res.data.completed) {
        isCompletedRef.current = true;
        setTimeout(() => {
          navigate(`/test/${assessmentId}/completed`);
        }, 150);
      } else {
        setTimeout(async () => {
          await fetchCurrentState();
        }, 150);
      }
    } catch (err) {
      console.error('Failed to submit answer, retrying:', err);
      try {
        await new Promise((r) => setTimeout(r, 400));
        const res2 = await assessmentAPI.submitAnswer(assessmentId, question.id, optionLabel);
        if (res2.data.completed) {
          isCompletedRef.current = true;
          navigate(`/test/${assessmentId}/completed`);
        } else {
          await fetchCurrentState();
        }
      } catch (err2) {
        await fetchCurrentState();
      }
    }
  };

  const progressPercentage = Math.round((currentQuestionNumber / totalQuestions) * 100);

  // Terminated screen for repeated malpractice
  if (isTerminated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#14221B] rounded-3xl border-2 border-rose-500 p-7 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/60 flex items-center justify-center mx-auto mb-4 border border-rose-900">
            <ShieldAlert className="w-9 h-9 text-rose-500" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Test Auto-Terminated</h2>
          <p className="text-xs font-bold text-rose-400 uppercase tracking-wide mb-3">
            Malpractice / Repeated Tab Switching Detected
          </p>
          <p className="text-xs text-gray-300 mb-6 leading-relaxed">
            You navigated away from the assessment window multiple times. According to our security and proctoring policy, your assessment has been automatically locked, scored, and submitted.
          </p>
          <div className="w-7 h-7 border-3 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-400">Redirecting to submission confirmation...</p>
        </div>
      </div>
    );
  }

  if (loading && !question) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0C1410] flex flex-col items-center justify-center p-4">
        <div className="w-11 h-11 border-3 border-[#198754]/30 border-t-[#198754] rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Preparing assessment question...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0C1410] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#14221B] rounded-2xl border border-gray-200 dark:border-[#284033] p-6 shadow-soft text-center">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Session Notice</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 mb-2">{error}</p>
          <p className="text-xs text-[#198754] font-medium mb-5 animate-pulse">Auto-reconnecting to server...</p>
          <button
            onClick={() => {
              setError('');
              fetchCurrentState();
            }}
            className="w-full py-2.5 px-4 bg-[#198754] hover:bg-[#146C43] text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0C1410] text-[#212529] dark:text-gray-100 flex flex-col select-none transition-colors duration-200">
      {/* Strike 1 Warning Modal */}
      {showStrikeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#14221B] rounded-3xl border-2 border-amber-500 p-6 sm:p-8 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-900">
              <AlertTriangle className="w-9 h-9 text-amber-500 animate-bounce" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 text-xs font-black uppercase tracking-wider mb-3">
              <span>Security Warning • Strike 1 of 2</span>
            </div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-2">
              Tab Switching Is Strictly Prohibited!
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-5 leading-relaxed">
              You navigated away from the assessment window. Leaving this tab, minimizing the browser, or opening any other application is strictly monitored.
              <br /><br />
              <strong className="text-rose-600 dark:text-rose-400 font-bold">
                FINAL WARNING: If you switch tabs one more time, your test will be immediately auto-submitted and permanently terminated!
              </strong>
            </p>
            <button
              onClick={() => setShowStrikeModal(false)}
              className="w-full py-3 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-sm font-bold shadow-soft transition-all duration-200 active:scale-[0.98]"
            >
              I Understand & Resume Test
            </button>
          </div>
        </div>
      )}

      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#14221B]/90 backdrop-blur-md border-b border-gray-200/80 dark:border-[#284033] shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#198754] animate-ping" />
              <h1 className="text-base sm:text-lg font-extrabold text-[#146C43] dark:text-emerald-400 tracking-tight">
                Round 1 – Online Assessment
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3" /> Proctored
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:flex items-center gap-1.5 mt-0.5">
              <span>Candidate: <strong className="text-gray-700 dark:text-gray-200">{candidateName}</strong></span>
              {interestedProfile && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF7EF] dark:bg-[#1D3327] text-[#146C43] dark:text-emerald-300 border border-[#C8E8D5] dark:border-[#294337]">
                  {interestedProfile}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live 12s Visual Fuel Timer Track */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-[#284033] bg-white dark:bg-[#14221B] shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Clock className={`w-3.5 h-3.5 transition-colors ${
                  timerRatio > 0.35
                    ? 'text-[#198754] dark:text-emerald-400'
                    : timerRatio > 0.15
                    ? 'text-amber-500'
                    : 'text-rose-500 animate-spin'
                }`} />
                <span className="text-gray-600 dark:text-gray-300 text-xs">
                  {timerRatio <= 0.2 ? 'Moving soon...' : 'Timer'}
                </span>
              </div>
              <div className="w-24 sm:w-36 h-2.5 bg-gray-100 dark:bg-[#1E3326] rounded-full overflow-hidden p-0.5 border border-gray-200/70 dark:border-[#294534]">
                <div
                  className={`h-full rounded-full transition-all duration-100 ease-linear ${
                    timerRatio > 0.35
                      ? 'bg-gradient-to-r from-emerald-500 to-[#198754]'
                      : timerRatio > 0.15
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                      : 'bg-gradient-to-r from-rose-500 to-red-600 animate-pulse'
                  }`}
                  style={{ width: `${Math.max(4, Math.round(timerRatio * 100))}%` }}
                />
              </div>
            </div>

            <ThemeToggle />
          </div>
        </div>

        {/* Live Progress Bar with Gradient */}
        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#198754] via-[#22A96B] to-[#146C43] h-1.5 transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </header>

      {/* Main Assessment Room */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 sm:py-8 flex flex-col justify-center">
        {/* Question Card */}
        <div className="bg-white dark:bg-[#14221B] rounded-3xl border border-gray-200/90 dark:border-[#284033] shadow-soft dark:shadow-dark-soft p-5 sm:p-8 sm:py-9 relative overflow-hidden">
          {/* Live Question Countdown Track across card header */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ease-linear ${
                timerRatio > 0.35
                  ? 'bg-gradient-to-r from-[#198754] via-emerald-400 to-[#146C43]'
                  : timerRatio > 0.15
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                  : 'bg-gradient-to-r from-rose-500 to-red-600 animate-pulse'
              }`}
              style={{ width: `${Math.round(timerRatio * 100)}%` }}
            />
          </div>

          {/* Section & Question Progress Header (NO TOPIC HINT DISPLAYED) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-gray-100 dark:border-gray-800/80">
            <div className="inline-flex items-center gap-2 bg-[#EAF7EF] dark:bg-[#1D3327] text-[#146C43] dark:text-emerald-300 px-3.5 py-1 rounded-xl text-xs font-bold tracking-wide border border-[#C8E8D5] dark:border-[#294337]">
              <span>{question?.section || 'Assessment'}</span>
            </div>

            {/* Question Counter */}
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1B2B23] px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-[#284033]">
              Question <span className="text-[#198754] dark:text-emerald-400 font-extrabold text-sm">{currentQuestionNumber}</span> of {totalQuestions}
            </div>
          </div>

          {/* Question Text */}
          <div className="my-6 sm:my-7">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 leading-relaxed">
              {question?.questionText}
            </h2>
          </div>

          {/* Notice Banner */}
          <div className="mb-6 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50/80 dark:bg-[#1B2B23]/60 px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#198754] dark:text-emerald-400 flex-shrink-0" />
              <span>Select an option immediately. Question auto-moves in 12 seconds. Tab switching is strictly prohibited.</span>
            </div>
            {autoAdvanceAlert && (
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 animate-pulse flex-shrink-0">
                Auto-advancing...
              </span>
            )}
          </div>

          {/* 4 Interactive Option Cards */}
          <div className="space-y-3">
            {question?.options.map((opt) => {
              const isSelected = selectedOption === opt.label;

              return (
                <button
                  key={opt.label}
                  onClick={() => handleOptionSelect(opt.label)}
                  disabled={isSubmitting || selectedOption !== null}
                  className={`w-full p-4 sm:p-4.5 rounded-2xl border text-left transition-all duration-150 flex items-center justify-between gap-4 group ${
                    isSelected
                      ? 'bg-[#198754] border-[#198754] text-white shadow-soft dark:shadow-none'
                      : 'bg-[#FDFDFD] dark:bg-[#17271F] border-gray-200 dark:border-[#284033] hover:border-[#198754]/50 dark:hover:border-emerald-500/50 hover:bg-gray-50/80 dark:hover:bg-[#1B2F25] active:scale-[0.99]'
                  } ${isSubmitting ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-3.5">
                    <span
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm transition-colors ${
                        isSelected
                          ? 'bg-white text-[#198754] shadow-xs'
                          : 'bg-gray-100 dark:bg-[#20362B] text-gray-700 dark:text-gray-200 group-hover:bg-[#EAF7EF] dark:group-hover:bg-[#274436] group-hover:text-[#146C43] dark:group-hover:text-emerald-300'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className={`text-sm sm:text-base font-medium leading-relaxed ${
                      isSelected ? 'text-white' : 'text-gray-800 dark:text-gray-200'
                    }`}>
                      {opt.text}
                    </span>
                  </div>

                  <div className="flex-shrink-0">
                    {isSelected ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 group-hover:border-[#198754] dark:group-hover:border-emerald-400 transition-colors" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
