import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ShieldAlert, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { assessmentAPI } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

export default function AssessmentRoom() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(30);
  const [question, setQuestion] = useState(null);

  // Timer state - 25 minutes = 1500 seconds
  const [remainingSeconds, setRemainingSeconds] = useState(1500);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerIntervalRef = useRef(null);
  const serverDeadlineRef = useRef(null);

  const fetchCurrentState = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await assessmentAPI.getCurrentQuestion(assessmentId);

      if (res.data.completed) {
        navigate(`/test/${assessmentId}/completed`);
        return;
      }

      setCandidateName(res.data.candidateName || 'Candidate');
      setCurrentQuestionNumber(res.data.currentQuestionNumber);
      setTotalQuestions(res.data.totalQuestions);
      setQuestion(res.data.question);
      setSelectedOption(null);
      setIsSubmitting(false);

      if (res.data.remainingSeconds !== undefined) {
        setRemainingSeconds(res.data.remainingSeconds);
        serverDeadlineRef.current = Date.now() + res.data.remainingSeconds * 1000;
      }
    } catch (err) {
      console.error('Failed to load assessment:', err);
      setError(err.response?.data?.error || 'Failed to connect to assessment server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentState();

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Assessment in progress. Leaving this page will submit your test automatically.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [assessmentId]);

  // Synchronized 25-minute live timer countdown
  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      if (!serverDeadlineRef.current) return;

      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((serverDeadlineRef.current - now) / 1000));
      setRemainingSeconds(diffSec);

      if (diffSec <= 0) {
        clearInterval(timerIntervalRef.current);
        handleTimeExpired();
      }
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, []);

  const handleTimeExpired = async () => {
    setIsSubmitting(true);
    try {
      await assessmentAPI.getCurrentQuestion(assessmentId);
    } catch (e) {
      console.warn('Time expired ping error:', e);
    } finally {
      navigate(`/test/${assessmentId}/completed`);
    }
  };

  // Immediate selection and auto-advance
  const handleOptionSelect = async (optionLabel) => {
    if (isSubmitting || selectedOption !== null) return;

    setSelectedOption(optionLabel);
    setIsSubmitting(true);

    try {
      const res = await assessmentAPI.submitAnswer(assessmentId, question.id, optionLabel);

      if (res.data.completed) {
        setTimeout(() => {
          navigate(`/test/${assessmentId}/completed`);
        }, 350);
      } else {
        setTimeout(async () => {
          await fetchCurrentState();
        }, 350);
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      await fetchCurrentState();
    }
  };

  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerStyles = () => {
    if (remainingSeconds <= 120) {
      return 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 text-rose-700 dark:text-rose-400 shadow-sm animate-pulse';
    }
    if (remainingSeconds <= 300) {
      return 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 text-amber-800 dark:text-amber-400 shadow-sm';
    }
    return 'bg-[#EAF7EF] dark:bg-[#1D3327] border-[#C8E8D5] dark:border-[#294337] text-[#146C43] dark:text-emerald-300 shadow-xs';
  };

  const progressPercentage = Math.round((currentQuestionNumber / totalQuestions) * 100);

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
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 mb-6">{error}</p>
          <button
            onClick={fetchCurrentState}
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
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#14221B]/90 backdrop-blur-md border-b border-gray-200/80 dark:border-[#284033] shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#198754] animate-ping" />
              <h1 className="text-base sm:text-lg font-extrabold text-[#146C43] dark:text-emerald-400 tracking-tight">
                Round 1 – Online Assessment
              </h1>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Candidate: <span className="font-semibold text-gray-700 dark:text-gray-200">{candidateName}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Synchronized 25-Minute Countdown Timer */}
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border text-sm font-bold tracking-wider transition-all ${getTimerStyles()}`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono text-sm sm:text-base">{formatTime(remainingSeconds)}</span>
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
          {/* Section & Question Progress Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-gray-100 dark:border-gray-800/80">
            <div className="inline-flex items-center gap-2 bg-[#EAF7EF] dark:bg-[#1D3327] text-[#146C43] dark:text-emerald-300 px-3.5 py-1 rounded-xl text-xs font-bold tracking-wide border border-[#C8E8D5] dark:border-[#294337]">
              <span>{question?.section || 'Assessment'}</span>
              <span className="text-[#52B482]">•</span>
              <span className="text-gray-600 dark:text-gray-300 font-medium">{question?.topic}</span>
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
          <div className="mb-6 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50/80 dark:bg-[#1B2B23]/60 px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
            <AlertTriangle className="w-4 h-4 text-[#198754] dark:text-emerald-400 flex-shrink-0" />
            <span>Click any option to immediately record your choice and auto-advance. Modification is disabled.</span>
          </div>

          {/* 4 Interactive Option Cards */}
          <div className="space-y-3">
            {question?.options.map((opt) => {
              const isSelected = selectedOption === opt.label;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleOptionSelect(opt.label)}
                  disabled={isSubmitting}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3.5 group relative ${
                    isSelected
                      ? 'border-[#198754] bg-[#EAF7EF] dark:bg-[#1D3327] text-[#146C43] dark:text-emerald-300 shadow-sm scale-[1.005]'
                      : isSubmitting
                      ? 'border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-[#14221B] text-gray-400 cursor-not-allowed'
                      : 'border-gray-200/90 dark:border-[#284033] hover:border-[#198754]/70 hover:bg-gray-50/70 dark:hover:bg-[#1B2B23] bg-white dark:bg-[#14221B] text-gray-800 dark:text-gray-200 active:scale-[0.99] hover:shadow-xs'
                  }`}
                >
                  {/* Option Badge */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold transition-all flex-shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-[#198754] text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-[#20362B] text-gray-700 dark:text-gray-300 group-hover:bg-[#EAF7EF] dark:group-hover:bg-[#2A473B] group-hover:text-[#146C43] dark:group-hover:text-emerald-300'
                    }`}
                  >
                    {opt.label}
                  </div>

                  {/* Option Text */}
                  <div className="flex-1 text-sm leading-snug font-medium pt-0.5">
                    {opt.text}
                  </div>

                  {isSelected && (
                    <div className="text-[#198754] dark:text-emerald-400 mt-0.5 flex-shrink-0 animate-in zoom-in-75">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Instant Saving Indicator */}
          {isSubmitting && (
            <div className="mt-4 text-center text-xs font-semibold text-[#198754] dark:text-emerald-400 flex items-center justify-center gap-2 animate-in fade-in">
              <div className="w-3.5 h-3.5 border-2 border-[#198754]/30 border-t-[#198754] rounded-full animate-spin" />
              <span>Saving answer and loading next question...</span>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 px-4 text-center text-xs text-gray-400 dark:text-gray-600 border-t border-gray-200/50 dark:border-gray-800 bg-white dark:bg-[#14221B]">
        Round 1 Assessment • 25 Minutes Total Duration • Questions randomized per candidate
      </footer>
    </div>
  );
}
