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
  const [totalQuestions, setTotalQuestions] = useState(50);
  const [question, setQuestion] = useState(null);
  const [interestedProfile, setInterestedProfile] = useState(localStorage.getItem('nexis_interested_profile') || '');

  // Per-Question Timer Configuration
  // Active window: 28 seconds; Force auto-advances at 30 seconds
  const QUESTION_TOTAL_DURATION = 30; // seconds
  const [timerRatio, setTimerRatio] = useState(1.0); // 1.0 (full) down to 0.0 (empty)
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoAdvanceAlert, setAutoAdvanceAlert] = useState(false);

  const questionIntervalRef = useRef(null);
  const questionStartTimeRef = useRef(Date.now());
  const isAutoAdvancingRef = useRef(false);

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
      if (questionIntervalRef.current) clearInterval(questionIntervalRef.current);
    };
  }, [assessmentId]);

  // Synchronized 28-30s Per-Question Timer
  useEffect(() => {
    if (!question || loading) return;

    questionStartTimeRef.current = Date.now();
    isAutoAdvancingRef.current = false;
    setTimerRatio(1.0);
    setAutoAdvanceAlert(false);

    if (questionIntervalRef.current) clearInterval(questionIntervalRef.current);

    questionIntervalRef.current = setInterval(() => {
      const elapsedSec = (Date.now() - questionStartTimeRef.current) / 1000;
      const ratio = Math.max(0, (QUESTION_TOTAL_DURATION - elapsedSec) / QUESTION_TOTAL_DURATION);
      setTimerRatio(ratio);

      // Warning when approaching the end (at 26-28s mark)
      if (elapsedSec >= 26) {
        setAutoAdvanceAlert(true);
      }

      // Hard auto-advance at 30 seconds
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
  }, [question?.id, loading]);

  // Automatically submit and advance when question 30s limit expires
  const triggerAutoAdvance = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const fallbackChoice = selectedOption || 'TIMEOUT';
      const res = await assessmentAPI.submitAnswer(assessmentId, question.id, fallbackChoice);

      if (res.data.completed) {
        navigate(`/test/${assessmentId}/completed`);
      } else {
        await fetchCurrentState();
      }
    } catch (err) {
      console.warn('Auto-advance submission error:', err);
      await fetchCurrentState();
    }
  };

  // Immediate option selection by candidate
  const handleOptionSelect = async (optionLabel) => {
    if (isSubmitting || selectedOption !== null) return;

    if (questionIntervalRef.current) clearInterval(questionIntervalRef.current);
    setSelectedOption(optionLabel);
    setIsSubmitting(true);

    try {
      const res = await assessmentAPI.submitAnswer(assessmentId, question.id, optionLabel);

      if (res.data.completed) {
        setTimeout(() => {
          navigate(`/test/${assessmentId}/completed`);
        }, 300);
      } else {
        setTimeout(async () => {
          await fetchCurrentState();
        }, 300);
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      await fetchCurrentState();
    }
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
            {/* Live Per-Question Timer (No seconds exposed to candidate) */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-[#284033] bg-white dark:bg-[#14221B] shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Clock className={`w-3.5 h-3.5 transition-colors ${
                  timerRatio > 0.35
                    ? 'text-[#198754] dark:text-emerald-400'
                    : timerRatio > 0.15
                    ? 'text-amber-500'
                    : 'text-rose-500 animate-spin'
                }`} />
                <span className="text-gray-600 dark:text-gray-300">
                  {timerRatio <= 0.15 ? 'Moving soon...' : 'Timer'}
                </span>
              </div>
              {/* Visual Countdown Fuel Track - NO SECONDS SHOWN */}
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
          <div className="mb-6 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50/80 dark:bg-[#1B2B23]/60 px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#198754] dark:text-emerald-400 flex-shrink-0" />
              <span>Select an option to advance immediately. If not selected, the test automatically moves to the next question.</span>
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
        Round 1 Assessment • 28s Per Question • {interestedProfile ? `${interestedProfile} Track` : 'Questions randomized per candidate'}
      </footer>

    </div>
  );
}
