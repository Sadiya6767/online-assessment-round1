import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Upload,
  Building2,
  GraduationCap,
  Mail,
  Phone,
  User,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Target,
  Briefcase
} from 'lucide-react';
import { candidateAPI } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

const PROFILES = [
  {
    id: 'Web Development cum Sales Engineer',
    title: 'Web Development cum Sales Engineer',
    badge: 'Tech Sales & Client Solutions',
    icon: TrendingUp,
    description: 'Core Web Dev (HTML, CSS, JS) + Reasoning + Pre-Sales, SaaS Proposals, Tech Discovery & Client Solutions.'
  },
  {
    id: 'Web Development cum HR Recruiter',
    title: 'Web Development cum HR Recruiter',
    badge: 'Talent Acquisition & Technical HR',
    icon: Users,
    description: 'Core Web Dev (HTML, CSS, JS) + Reasoning + Tech Sourcing, Candidate Screening, Structured Interviews & HR Ethics.'
  },
  {
    id: 'Web Development cum Digital Marketing',
    title: 'Web Development cum Digital Marketing',
    badge: 'SEO, Performance Ads & Growth',
    icon: Target,
    description: 'Core Web Dev (HTML, CSS, JS) + Reasoning + Technical SEO, Google Analytics 4, Meta/PPC Ads & Conversion Optimization.'
  }
];

export default function CandidateRegistration() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    interestedProfile: 'Web Development cum Sales Engineer',
    degree: '',
    customDegree: '',
    semester: '',
    year: '',
    branch: '',
    collegeName: '',
    graduationYear: '',
    email: '',
    phone: '',
    consent: false
  });

  const [resumeFile, setResumeFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const degrees = ['B.Tech', 'BCA', 'MCA', 'B.Sc (IT / CS)', 'B.E.', 'M.Tech', 'Other'];
  const semesters = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', 'Passed Out'];
  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Passed Out'];
  const gradYears = ['2024', '2025', '2026', '2027', '2028', '2029'];

  const validateField = (name, value) => {
    switch (name) {
      case 'fullName':
        return !value || value.trim().length < 2 ? 'Please enter your complete full name' : '';
      case 'interestedProfile':
        return !value ? 'Please select your target job profile' : '';
      case 'degree':
        return !value ? 'Please select your degree' : '';
      case 'semester':
        return !value ? 'Please select your semester' : '';
      case 'year':
        return !value ? 'Please select your academic year' : '';
      case 'branch':
        return !value || value.trim().length === 0 ? 'Branch or specialization is required' : '';
      case 'collegeName':
        return !value || value.trim().length < 3 ? 'Please enter your college name' : '';
      case 'graduationYear':
        return !value ? 'Please select your graduation year' : '';
      case 'email':
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Enter a valid email address' : '';
      case 'phone':
        return !/^[6-9]\d{9}$/.test(value.replace(/\D/g, ''))
          ? 'Enter a valid 10-digit Indian mobile number'
          : '';
      case 'consent':
        return !value ? 'You must accept the declaration to proceed' : '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    setFormData((prev) => ({ ...prev, [name]: val }));

    if (errors[name]) {
      const errorMsg = validateField(name, val);
      setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      setErrors((prev) => ({
        ...prev,
        resume: 'Invalid file format. Please upload PDF, DOC, or DOCX only.'
      }));
      setResumeFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        resume: 'File size exceeds 5MB limit. Please upload a smaller document.'
      }));
      setResumeFile(null);
      return;
    }

    setErrors((prev) => ({ ...prev, resume: '' }));
    setResumeFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    });

    if (formData.degree === 'Other' && (!formData.customDegree || formData.customDegree.trim().length === 0)) {
      newErrors.degree = 'Please specify your degree';
    }

    if (!resumeFile) {
      newErrors.resume = 'Please upload your updated resume';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorKey = Object.keys(newErrors)[0];
      const el = document.getElementsByName(firstErrorKey)[0];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append('fullName', formData.fullName.trim());
      payload.append('interestedProfile', formData.interestedProfile);
      payload.append('degree', formData.degree === 'Other' ? formData.customDegree.trim() : formData.degree);
      payload.append('semester', formData.semester);
      payload.append('year', formData.year);
      payload.append('branch', formData.branch.trim());
      payload.append('collegeName', formData.collegeName.trim());
      payload.append('graduationYear', formData.graduationYear);
      payload.append('email', formData.email.trim());
      payload.append('phone', formData.phone.trim().replace(/\D/g, ''));
      payload.append('consent', formData.consent ? 'true' : 'false');
      payload.append('resume', resumeFile);

      const res = await candidateAPI.register(payload);

      if (res.data.assessmentId) {
        localStorage.setItem('nexis_assessment_id', res.data.assessmentId);
        localStorage.setItem('nexis_candidate_id', res.data.candidateId);
        localStorage.setItem('nexis_candidate_name', res.data.candidateName || formData.fullName);
        localStorage.setItem('nexis_interested_profile', res.data.interestedProfile || formData.interestedProfile);

        navigate(`/test/${res.data.assessmentId}`);
      }
    } catch (err) {
      console.error('Registration failed:', err);
      const msg = err.response?.data?.error || 'Registration failed. Please check your details and try again.';
      setServerError(msg);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0C1410] text-[#212529] dark:text-gray-100 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200 relative overflow-hidden">
      {/* Subtle background ambient gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-[#198754]/10 via-[#198754]/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Header & Theme Toggle */}
      <div className="max-w-4xl mx-auto flex justify-end mb-3 relative z-10">
        <ThemeToggle />
      </div>

      <header className="max-w-4xl mx-auto mb-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-[#EAF7EF]/90 dark:bg-[#1A2E24]/90 backdrop-blur-xs text-[#146C43] dark:text-emerald-300 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase mb-3 border border-[#C8E8D5] dark:border-[#294337] shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#198754] dark:text-emerald-400" />
          <span>Official Assessment Portal</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Round 1 – <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#198754] via-[#20A065] to-[#146C43] dark:from-emerald-400 dark:to-emerald-300">Online Assessment</span>
        </h1>
        <p className="mt-2.5 text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-normal">
          Common first-round evaluation for technical and specialized job roles.
          Select your interested profile and complete your registration below to launch your assessment.
        </p>

        {/* Quick Highlights Bar */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
          <div className="bg-white/80 dark:bg-[#14221B]/80 backdrop-blur-xs border border-gray-200/80 dark:border-[#284033] rounded-2xl p-3 text-center shadow-card hover:border-[#198754]/40 transition-all">
            <HelpCircle className="w-5 h-5 mx-auto text-[#198754] dark:text-emerald-400 mb-1" />
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Questions</div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">50 MCQs</div>
          </div>
          <div className="bg-white/80 dark:bg-[#14221B]/80 backdrop-blur-xs border border-gray-200/80 dark:border-[#284033] rounded-2xl p-3 text-center shadow-card hover:border-[#198754]/40 transition-all">
            <Clock className="w-5 h-5 mx-auto text-[#198754] dark:text-emerald-400 mb-1" />
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Timer</div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">28s / Question</div>
          </div>
          <div className="bg-white/80 dark:bg-[#14221B]/80 backdrop-blur-xs border border-gray-200/80 dark:border-[#284033] rounded-2xl p-3 text-center shadow-card hover:border-[#198754]/40 transition-all">
            <Briefcase className="w-5 h-5 mx-auto text-[#198754] dark:text-emerald-400 mb-1" />
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Profiles</div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">3 Specializations</div>
          </div>
          <div className="bg-white/80 dark:bg-[#14221B]/80 backdrop-blur-xs border border-gray-200/80 dark:border-[#284033] rounded-2xl p-3 text-center shadow-card hover:border-[#198754]/40 transition-all">
            <ArrowRight className="w-5 h-5 mx-auto text-[#198754] dark:text-emerald-400 mb-1" />
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Navigation</div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">Auto-Advance</div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-6 relative z-10">
        {/* Instructions Card */}
        <section className="bg-white dark:bg-[#14221B] rounded-2xl border border-gray-200/90 dark:border-[#284033] shadow-soft dark:shadow-dark-soft p-5 sm:p-7 transition-all">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800/80">
            <div className="w-9 h-9 rounded-xl bg-[#EAF7EF] dark:bg-[#1D3327] flex items-center justify-center text-[#198754] dark:text-emerald-400 shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">Candidate Guidelines</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Read carefully before launching your test</p>
            </div>
          </div>

          <ul className="mt-4 space-y-2.5 text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#198754] mt-2 flex-shrink-0" />
              <span>This assessment contains <strong>50 questions</strong> (Web Development + Reasoning common modules, plus questions tailored to your chosen specialization). Each question automatically advances in <strong>12 seconds</strong>.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#198754] mt-2 flex-shrink-0" />
              <span>Select your interested profile carefully. <strong>You will only receive questions relevant to your selected profile</strong>.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#198754] mt-2 flex-shrink-0" />
              <span>Read every question thoroughly. <strong>Selecting an answer automatically advances you to the next question.</strong></span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#198754] mt-2 flex-shrink-0" />
              <span><strong>Back navigation is disabled</strong>, and answers cannot be altered once selected.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 flex-shrink-0" />
              <span className="text-rose-600 dark:text-rose-400 font-medium"><strong>Tab switching or leaving this window is strictly prohibited.</strong> First violation triggers a warning strike; a second violation will automatically terminate your test.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#198754] mt-2 flex-shrink-0" />
              <span>Please ensure you have an uninterrupted, stable internet connection.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#198754] mt-2 flex-shrink-0" />
              <span className="text-rose-600 dark:text-rose-400 font-medium">Do not refresh or close your browser window during the test.</span>
            </li>
          </ul>
        </section>

        {/* Server Error Alert */}
        {serverError && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 px-4 py-3.5 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Unable to Start Assessment</p>
              <p className="mt-0.5">{serverError}</p>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#14221B] rounded-2xl border border-gray-200/90 dark:border-[#284033] shadow-soft dark:shadow-dark-soft p-5 sm:p-8 space-y-6">
          <div className="border-b border-gray-100 dark:border-gray-800/80 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">Candidate Registration</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Please select your profile and provide your verified details</p>
            </div>
            <span className="text-[11px] text-[#198754] dark:text-emerald-400 font-semibold bg-[#EAF7EF] dark:bg-[#1D3327] px-2.5 py-1 rounded-full">
              All Fields Required
            </span>
          </div>

          {/* Specialization Profile Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Interested Job Profile / Specialization <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                Choose 1 profile
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Web Development & Reasoning questions are common across all roles. Specialization questions (10 MCQs) will be strictly based on your chosen profile.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {PROFILES.map((prof) => {
                const isSelected = formData.interestedProfile === prof.id;
                const IconComp = prof.icon;
                return (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, interestedProfile: prof.id }));
                      if (errors.interestedProfile) {
                        setErrors(prev => ({ ...prev, interestedProfile: '' }));
                      }
                    }}
                    className={`relative text-left p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-[#198754] ring-2 ring-[#198754]/25 shadow-xs'
                        : 'bg-gray-50/50 dark:bg-[#1B2B23]/70 border-gray-200/80 dark:border-[#284033] hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className={`p-2 rounded-lg ${
                          isSelected
                            ? 'bg-[#198754] text-white'
                            : 'bg-gray-200/70 dark:bg-[#284033] text-gray-600 dark:text-gray-300'
                        }`}>
                          <IconComp className="w-4 h-4" />
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isSelected
                            ? 'bg-[#198754]/15 text-[#198754] dark:text-emerald-400'
                            : 'bg-gray-200/60 dark:bg-[#20362B] text-gray-500 dark:text-gray-400'
                        }`}>
                          {prof.badge}
                        </span>
                      </div>
                      <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                        {prof.title}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                        {prof.description}
                      </p>
                    </div>
                    <div className="mt-3.5 pt-2.5 border-t border-gray-200/60 dark:border-[#284033] flex items-center justify-between text-[11px]">
                      <span className={isSelected ? 'text-[#198754] dark:text-emerald-400 font-semibold' : 'text-gray-400'}>
                        {isSelected ? '✓ Selected Profile' : 'Click to select'}
                      </span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-[#198754] bg-[#198754]' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.interestedProfile && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.interestedProfile}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-gray-100 dark:border-gray-800/80">
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-gray-50/70 dark:bg-[#1B2B23] border rounded-xl text-sm transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-[#1B2B23] focus:ring-2 focus:ring-[#198754]/20 ${
                    errors.fullName ? 'border-rose-400 focus:border-rose-500' : 'border-gray-200 dark:border-[#284033] focus:border-[#198754]'
                  }`}
                />
              </div>
              {errors.fullName && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.fullName}</p>}
            </div>

            {/* Degree */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Degree <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <select
                  name="degree"
                  value={formData.degree}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-gray-50/70 dark:bg-[#1B2B23] border rounded-xl text-sm transition-all text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-[#1B2B23] focus:ring-2 focus:ring-[#198754]/20 ${
                    errors.degree ? 'border-rose-400 focus:border-rose-500' : 'border-gray-200 dark:border-[#284033] focus:border-[#198754]'
                  }`}
                >
                  <option value="" disabled>Select degree</option>
                  {degrees.map((d) => (
                    <option key={d} value={d} className="dark:bg-[#14221B]">{d}</option>
                  ))}
                </select>
              </div>
              {errors.degree && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.degree}</p>}
            </div>

            {/* Custom Degree if Other */}
            {formData.degree === 'Other' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Specify Degree <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="customDegree"
                  value={formData.customDegree}
                  onChange={handleChange}
                  placeholder="e.g. B.Com, BA, B.Sc"
                  className="w-full px-3.5 py-2.5 bg-gray-50/70 dark:bg-[#1B2B23] border border-gray-200 dark:border-[#284033] rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:bg-white dark:focus:bg-[#1B2B23] focus:border-[#198754] focus:ring-2 focus:ring-[#198754]/20"
                />
              </div>
            )}

            {/* Branch / Specialization */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Branch / Specialization <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  placeholder="e.g. Computer Science, IT, Mechanical"
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-gray-50/70 dark:bg-[#1B2B23] border rounded-xl text-sm transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-[#1B2B23] focus:ring-2 focus:ring-[#198754]/20 ${
                    errors.branch ? 'border-rose-400 focus:border-rose-500' : 'border-gray-200 dark:border-[#284033] focus:border-[#198754]'
                  }`}
                />
              </div>
              {errors.branch && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.branch}</p>}
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Current Year <span className="text-rose-500">*</span>
              </label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                className={`w-full px-3.5 py-2.5 bg-gray-50/70 dark:bg-[#1B2B23] border rounded-xl text-sm transition-all text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-[#1B2B23] focus:ring-2 focus:ring-[#198754]/20 ${
                  errors.year ? 'border-rose-400 focus:border-rose-500' : 'border-gray-200 dark:border-[#284033] focus:border-[#198754]'
                }`}
              >
                <option value="" disabled>Select year</option>
                {years.map((y) => (
                  <option key={y} value={y} className="dark:bg-[#14221B]">{y}</option>
                ))}
              </select>
              {errors.year && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.year}</p>}
            </div>

            {/* Semester */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Semester <span className="text-rose-500">*</span>
              </label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                className={`w-full px-3.5 py-2.5 bg-gray-50/70 dark:bg-[#1B2B23] border rounded-xl text-sm transition-all text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-[#1B2B23] focus:ring-2 focus:ring-[#198754]/20 ${
                  errors.semester ? 'border-rose-400 focus:border-rose-500' : 'border-gray-200 dark:border-[#284033] focus:border-[#198754]'
                }`}
              >
                <option value="" disabled>Select semester</option>
                {semesters.map((s) => (
                  <option key={s} value={s} className="dark:bg-[#14221B]">{s}</option>
                ))}
              </select>
              {errors.semester && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.semester}</p>}
            </div>

            {/* College Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                College / University Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="collegeName"
                  value={formData.collegeName}
                  onChange={handleChange}
                  placeholder="Enter full college name"
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-gray-50/70 dark:bg-[#1B2B23] border rounded-xl text-sm transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-[#1B2B23] focus:ring-2 focus:ring-[#198754]/20 ${
                    errors.collegeName ? 'border-rose-400 focus:border-rose-500' : 'border-gray-200 dark:border-[#284033] focus:border-[#198754]'
                  }`}
                />
              </div>
              {errors.collegeName && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.collegeName}</p>}
            </div>

            {/* Graduation Year */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Graduation Year (Batch) <span className="text-rose-500">*</span>
              </label>
              <select
                name="graduationYear"
                value={formData.graduationYear}
                onChange={handleChange}
                className={`w-full px-3.5 py-2.5 bg-gray-50/70 dark:bg-[#1B2B23] border rounded-xl text-sm transition-all text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-[#1B2B23] focus:ring-2 focus:ring-[#198754]/20 ${
                  errors.graduationYear ? 'border-rose-400 focus:border-rose-500' : 'border-gray-200 dark:border-[#284033] focus:border-[#198754]'
                }`}
              >
                <option value="" disabled>Select graduation year</option>
                {gradYears.map((y) => (
                  <option key={y} value={y} className="dark:bg-[#14221B]">{y}</option>
                ))}
              </select>
              {errors.graduationYear && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.graduationYear}</p>}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-gray-50/70 dark:bg-[#1B2B23] border rounded-xl text-sm transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-[#1B2B23] focus:ring-2 focus:ring-[#198754]/20 ${
                    errors.email ? 'border-rose-400 focus:border-rose-500' : 'border-gray-200 dark:border-[#284033] focus:border-[#198754]'
                  }`}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.email}</p>}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-gray-50/70 dark:bg-[#1B2B23] border rounded-xl text-sm transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-[#1B2B23] focus:ring-2 focus:ring-[#198754]/20 ${
                    errors.phone ? 'border-rose-400 focus:border-rose-500' : 'border-gray-200 dark:border-[#284033] focus:border-[#198754]'
                  }`}
                />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.phone}</p>}
            </div>
          </div>

          {/* Resume Upload Box */}
          <div className="pt-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Upload Resume (PDF, DOC, DOCX - Max 5MB) <span className="text-rose-500">*</span>
            </label>
            <div
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                errors.resume
                  ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/20'
                  : resumeFile
                  ? 'border-[#198754] bg-[#EAF7EF]/40 dark:bg-[#1D3327]/30'
                  : 'border-gray-300 dark:border-[#284033] bg-gray-50/50 dark:bg-[#1B2B23]/40 hover:border-[#198754]/60'
              }`}
            >
              <input
                type="file"
                id="resumeUpload"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx"
                className="hidden"
              />
              <label htmlFor="resumeUpload" className="cursor-pointer block">
                {resumeFile ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-[#EAF7EF] dark:bg-[#1D3327] text-[#198754] dark:text-emerald-400 flex items-center justify-center mb-2">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{resumeFile.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB • Click to replace file
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#1B2B23] text-gray-500 dark:text-gray-400 flex items-center justify-center mb-2">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Click to upload your resume
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Supported formats: PDF, DOC, DOCX (up to 5MB)
                    </span>
                  </div>
                )}
              </label>
            </div>
            {errors.resume && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{errors.resume}</p>}
          </div>

          {/* Consent Declaration Checkbox */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="consent"
                checked={formData.consent}
                onChange={handleChange}
                className="mt-1 h-4 w-4 text-[#198754] rounded border-gray-300 dark:border-gray-700 focus:ring-[#198754]"
              />
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-snug select-none">
                I confirm that the information provided above is correct, and I agree to participate in the online assessment for my selected profile.
              </span>
            </label>
            {errors.consent && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 pl-7">{errors.consent}</p>}
          </div>

          {/* Start Assessment Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 group ${
                isSubmitting
                  ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#198754] via-[#1E955E] to-[#146C43] hover:from-[#146C43] hover:to-[#0F5132] active:scale-[0.99] shadow-[#198754]/25'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validating & Initializing Assessment...</span>
                </>
              ) : (
                <>
                  <span className="text-base tracking-wide">Start Assessment</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2.5">
              The assessment starts immediately once you click Start Assessment.
            </p>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-gray-400 dark:text-gray-600 relative z-10">
        &copy; {new Date().getFullYear()} Round 1 Assessment Platform • All rights reserved.
      </footer>
    </div>
  );
}
