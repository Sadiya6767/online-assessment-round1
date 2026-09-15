import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle,
  Clock,
  AlertOctagon,
  Award,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  LogOut,
  RefreshCw,
  FileText,
  GraduationCap,
  X,
  ShieldCheck,
  Check,
  XCircle,
  Percent,
  BarChart3,
  Timer,
  Sparkles
} from 'lucide-react';
import { adminAPI } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalAttempts: 0,
    completed: 0,
    inProgress: 0,
    timedOut: 0,
    qualified: 0,
    averageScore: 0,
    retentionHours: 24
  });

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [gradYearFilter, setGradYearFilter] = useState('ALL');
  const [percentageRange, setPercentageRange] = useState('ALL');

  // Candidate audit modal state
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [candidateAudit, setCandidateAudit] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState('ALL'); // ALL, CORRECT, INCORRECT

  // Delete modal state
  const [deleteCandidateId, setDeleteCandidateId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Manual purge state
  const [isPurging, setIsPurging] = useState(false);
  const [purgeMessage, setPurgeMessage] = useState('');

  const adminUser = JSON.parse(localStorage.getItem('nexis_admin_user') || '{}');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, candRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getCandidates({
          search: search.trim(),
          status: statusFilter,
          gradYear: gradYearFilter,
          percentageRange: percentageRange
        })
      ]);

      setStats(statsRes.data);
      setCandidates(candRes.data.candidates || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('nexis_admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchDashboardData();
  }, [statusFilter, gradYearFilter, percentageRange]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDashboardData();
  };

  const handleClearSearch = () => {
    setSearch('');
    setTimeout(() => {
      adminAPI.getCandidates({
        search: '',
        status: statusFilter,
        gradYear: gradYearFilter,
        percentageRange: percentageRange
      }).then(res => setCandidates(res.data.candidates || []));
    }, 0);
  };

  const handleLogout = () => {
    localStorage.removeItem('nexis_admin_token');
    localStorage.removeItem('nexis_admin_user');
    navigate('/admin/login');
  };

  const handleViewAudit = async (candidateId) => {
    setSelectedCandidateId(candidateId);
    setAuditFilter('ALL');
    setAuditLoading(true);
    try {
      const res = await adminAPI.getCandidateDetails(candidateId);
      setCandidateAudit(res.data);
    } catch (err) {
      console.error('Error fetching audit details:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!deleteCandidateId) return;
    setIsDeleting(true);
    try {
      await adminAPI.deleteCandidate(deleteCandidateId);
      setDeleteCandidateId(null);
      if (selectedCandidateId === deleteCandidateId) {
        setSelectedCandidateId(null);
        setCandidateAudit(null);
      }
      await fetchDashboardData();
    } catch (err) {
      console.error('Error deleting candidate:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Trigger manual purge for records > 24 hours
  const handleTriggerPurge = async () => {
    setIsPurging(true);
    setPurgeMessage('');
    try {
      const res = await adminAPI.purgeExpired();
      setPurgeMessage(res.data.message || `Purged ${res.data.purgedCount || 0} expired records.`);
      await fetchDashboardData();
      setTimeout(() => setPurgeMessage(''), 4000);
    } catch (err) {
      console.error('Error triggering retention purge:', err);
      setPurgeMessage('Purge failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsPurging(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await adminAPI.exportCSV();
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `assessment_candidates_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('CSV export failed:', err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 bg-[#EAF7EF] text-[#146C43] dark:bg-[#1D3327] dark:text-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            <Check className="w-3 h-3" /> Completed
          </span>
        );
      case 'TIMED_OUT':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            <Clock className="w-3 h-3" /> Timed Out
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" /> In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            Not Started
          </span>
        );
    }
  };

  const filteredAnswers = (candidateAudit?.answers || []).filter(ans => {
    if (auditFilter === 'CORRECT') return ans.is_correct === 1;
    if (auditFilter === 'INCORRECT') return ans.is_correct === 0;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0C1410] text-[#212529] dark:text-gray-100 transition-colors duration-200">
      {/* Top Header Navbar */}
      <header className="bg-white/90 dark:bg-[#14221B]/90 backdrop-blur-md border-b border-gray-200/80 dark:border-[#284033] shadow-xs sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#198754] to-[#24A66B] text-white flex items-center justify-center font-bold shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
                  Round 1 Assessment Portal
                </h1>
                {/* 24-Hour Retention Badge */}
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold bg-[#EAF7EF] dark:bg-[#1D3327] text-[#146C43] dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-[#C8E8D5] dark:border-[#294337]">
                  <Timer className="w-3 h-3 text-[#198754]" /> 24h Auto-Retention Active
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Candidate Evaluation & Results Administration</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 hidden sm:inline-block">
              Admin: <strong className="text-gray-900 dark:text-gray-100">{adminUser.username || 'Admin'}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-gray-50 dark:bg-[#1B2B23] hover:bg-rose-50 text-gray-700 dark:text-gray-300 hover:text-rose-700 dark:hover:text-rose-400 rounded-xl text-xs font-semibold border border-gray-200 dark:border-[#284033] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Retention Purge Alert / Banner */}
        {purgeMessage && (
          <div className="bg-[#EAF7EF] dark:bg-[#1D3327] border border-[#C8E8D5] dark:border-[#294337] text-[#146C43] dark:text-emerald-300 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#198754]" />
              {purgeMessage}
            </span>
            <button onClick={() => setPurgeMessage('')} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-[#14221B] p-4 rounded-2xl border border-gray-200/90 dark:border-[#284033] shadow-card hover:border-[#198754]/40 transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#198754]" />
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Users className="w-4 h-4 text-[#198754] dark:text-emerald-400" /> Total Registered
            </div>
            <div className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{stats.totalCandidates}</div>
          </div>

          <div className="bg-white dark:bg-[#14221B] p-4 rounded-2xl border border-gray-200/90 dark:border-[#284033] shadow-card hover:border-blue-500/40 transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Clock className="w-4 h-4 text-blue-600" /> Test Attempts
            </div>
            <div className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{stats.totalAttempts}</div>
          </div>

          <div className="bg-white dark:bg-[#14221B] p-4 rounded-2xl border border-gray-200/90 dark:border-[#284033] shadow-card hover:border-[#198754]/40 transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#198754]" />
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
              <CheckCircle className="w-4 h-4 text-[#198754] dark:text-emerald-400" /> Completed
            </div>
            <div className="text-2xl font-extrabold text-[#146C43] dark:text-emerald-400">{stats.completed}</div>
          </div>

          <div className="bg-white dark:bg-[#14221B] p-4 rounded-2xl border border-gray-200/90 dark:border-[#284033] shadow-card hover:border-amber-500/40 transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
              <AlertOctagon className="w-4 h-4 text-amber-600" /> Incomplete
            </div>
            <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-400">{stats.inProgress}</div>
          </div>

          <div className="bg-white dark:bg-[#14221B] p-4 rounded-2xl border border-gray-200/90 dark:border-[#284033] shadow-card hover:border-rose-500/40 transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Clock className="w-4 h-4 text-rose-600" /> Timed Out
            </div>
            <div className="text-2xl font-extrabold text-rose-700 dark:text-rose-400">{stats.timedOut}</div>
          </div>

          <div className="bg-white dark:bg-[#14221B] p-4 rounded-2xl border border-gray-200/90 dark:border-[#284033] shadow-card hover:border-emerald-500/40 transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Award className="w-4 h-4 text-[#198754] dark:text-emerald-400" /> Qualified (&ge;60%)
            </div>
            <div className="text-2xl font-extrabold text-[#198754] dark:text-emerald-400">{stats.qualified}</div>
          </div>
        </section>

        {/* Filter and Action Bar */}
        <section className="bg-white dark:bg-[#14221B] p-4 rounded-2xl border border-gray-200/90 dark:border-[#284033] shadow-card space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidate name, email, college, phone..."
                className="w-full pl-10 pr-9 py-2 bg-gray-50/70 dark:bg-[#1B2B23] border border-gray-200 dark:border-[#284033] rounded-xl text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#198754]"
              />
              {search && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            <div className="flex flex-wrap items-center gap-2">
              {/* Percentage Range Filter */}
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#1B2B23] px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#284033] text-xs">
                <Percent className="w-3.5 h-3.5 text-[#198754] dark:text-emerald-400" />
                <span className="text-gray-500 dark:text-gray-400 font-medium">Score Range:</span>
                <select
                  value={percentageRange}
                  onChange={(e) => setPercentageRange(e.target.value)}
                  className="bg-transparent text-gray-800 dark:text-gray-100 font-semibold border-0 focus:ring-0 cursor-pointer"
                >
                  <option value="ALL" className="dark:bg-[#14221B]">All Percentages</option>
                  <option value="90-100" className="dark:bg-[#14221B]">90% – 100% (Top Tier)</option>
                  <option value="75-89" className="dark:bg-[#14221B]">75% – 89% (High Distinction)</option>
                  <option value="60-74" className="dark:bg-[#14221B]">60% – 74% (Qualified / Pass)</option>
                  <option value="40-59" className="dark:bg-[#14221B]">40% – 59% (Average)</option>
                  <option value="0-39" className="dark:bg-[#14221B]">Below 40% (Needs Attention)</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#1B2B23] px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-[#284033] text-xs">
                <Filter className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-gray-700 dark:text-gray-200 font-medium border-0 focus:ring-0 cursor-pointer"
                >
                  <option value="ALL" className="dark:bg-[#14221B]">All Statuses</option>
                  <option value="COMPLETED" className="dark:bg-[#14221B]">Completed</option>
                  <option value="TIMED_OUT" className="dark:bg-[#14221B]">Timed Out</option>
                  <option value="IN_PROGRESS" className="dark:bg-[#14221B]">In Progress</option>
                  <option value="NOT_STARTED" className="dark:bg-[#14221B]">Not Started</option>
                </select>
              </div>

              {/* Grad Year Filter */}
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#1B2B23] px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-[#284033] text-xs">
                <GraduationCap className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <select
                  value={gradYearFilter}
                  onChange={(e) => setGradYearFilter(e.target.value)}
                  className="bg-transparent text-gray-700 dark:text-gray-200 font-medium border-0 focus:ring-0 cursor-pointer"
                >
                  <option value="ALL" className="dark:bg-[#14221B]">All Grad Years</option>
                  <option value="2024" className="dark:bg-[#14221B]">2024</option>
                  <option value="2025" className="dark:bg-[#14221B]">2025</option>
                  <option value="2026" className="dark:bg-[#14221B]">2026</option>
                  <option value="2027" className="dark:bg-[#14221B]">2027</option>
                  <option value="2028" className="dark:bg-[#14221B]">2028</option>
                  <option value="2029" className="dark:bg-[#14221B]">2029</option>
                </select>
              </div>

              {/* Trigger Manual Purge (>24h) */}
              <button
                type="button"
                onClick={handleTriggerPurge}
                disabled={isPurging}
                title="Clean candidate records older than 24 hours"
                className="inline-flex items-center gap-1 py-1.5 px-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 rounded-xl text-xs font-semibold border border-amber-200 dark:border-amber-800 transition-colors"
              >
                {isPurging ? (
                  <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Timer className="w-3.5 h-3.5" />
                )}
                <span>Purge &gt;24h</span>
              </button>

              {/* Refresh Table */}
              <button
                onClick={fetchDashboardData}
                title="Refresh Table"
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-[#198754] hover:bg-[#EAF7EF] dark:hover:bg-[#1B2B23] rounded-xl border border-gray-200 dark:border-[#284033] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Export CSV */}
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 py-2 px-3.5 bg-[#198754] hover:bg-[#146C43] text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </section>

        {/* Candidate Records Table */}
        <section className="bg-white dark:bg-[#14221B] rounded-2xl border border-gray-200/90 dark:border-[#284033] shadow-soft dark:shadow-dark-soft overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                Candidate Assessments ({candidates.length})
              </h2>
              {percentageRange !== 'ALL' && (
                <span className="text-xs bg-[#EAF7EF] dark:bg-[#1D3327] text-[#146C43] dark:text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full border border-[#C8E8D5] dark:border-[#294337]">
                  Filter: {percentageRange}%
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Candidate scores are confidential and visible exclusively to admins. Data auto-purges after 24 hours.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50/80 dark:bg-[#1B2B23] text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-800 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Candidate ID</th>
                  <th className="py-3 px-4">Name & Contact</th>
                  <th className="py-3 px-4">Academic Background</th>
                  <th className="py-3 px-4">College</th>
                  <th className="py-3 px-4">Test Status</th>
                  <th className="py-3 px-4">Score (Admin Only)</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4 text-center">Resume</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-normal text-gray-800 dark:text-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-gray-500 dark:text-gray-400">
                      <div className="w-6 h-6 border-2 border-[#198754]/30 border-t-[#198754] rounded-full animate-spin mx-auto mb-2" />
                      Loading candidate records...
                    </td>
                  </tr>
                ) : candidates.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-14 text-center text-gray-400 dark:text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="font-medium text-sm text-gray-600 dark:text-gray-400">No candidate records found</p>
                      <p className="text-xs text-gray-400 mt-1">Try adjusting your search query or percentage range filter.</p>
                    </td>
                  </tr>
                ) : (
                  candidates.map((cand) => (
                    <tr key={cand.candidateId} className="hover:bg-gray-50/70 dark:hover:bg-[#1B2B23]/50 transition-colors">
                      {/* ID */}
                      <td className="py-3 px-4 font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {cand.candidateId}
                      </td>

                      {/* Name & Contact */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{cand.fullName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{cand.email}</div>
                        <div className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">+91 {cand.phone}</div>
                      </td>

                      {/* Academic Background */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-gray-800 dark:text-gray-200">{cand.degree} - {cand.branch}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{cand.year} • {cand.semester} Sem</div>
                      </td>

                      {/* College & Grad Year */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800 dark:text-gray-200 max-w-xs truncate" title={cand.collegeName}>
                          {cand.collegeName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Class of {cand.graduationYear}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(cand.testStatus)}
                      </td>

                      {/* Score Column with Visual Progress Bar */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {cand.testStatus === 'COMPLETED' || cand.testStatus === 'TIMED_OUT' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900 dark:text-gray-100">
                                {cand.score} / {cand.totalQuestions}
                              </span>
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                cand.percentage >= 75
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : cand.percentage >= 60
                                  ? 'bg-[#EAF7EF] text-[#146C43] dark:bg-[#1D3327] dark:text-emerald-400'
                                  : cand.percentage >= 40
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}>
                                {cand.percentage}%
                              </span>
                            </div>

                            {/* Mini visual bar */}
                            <div className="w-24 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${
                                  cand.percentage >= 60 ? 'bg-[#198754]' : cand.percentage >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${cand.percentage}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Pending</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {cand.durationUsed}
                      </td>

                      {/* Resume Download */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {cand.resumeFilePath ? (
                          <a
                            href={adminAPI.getResumeUrl(cand.resumeFilePath)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#198754] dark:text-emerald-400 hover:underline font-semibold"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewAudit(cand.candidateId)}
                            title="Audit Candidate Answers & Section Breakdown"
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-[#198754] hover:bg-[#EAF7EF] dark:hover:bg-[#1B2B23] rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteCandidateId(cand.candidateId)}
                            title="Delete Candidate Record"
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Candidate Audit Details Modal with Section-Wise Stats */}
      {selectedCandidateId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#14221B] rounded-3xl border border-gray-200/90 dark:border-[#284033] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                  Candidate Performance Audit
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Candidate ID: <span className="font-mono">{candidateAudit?.candidate?.id}</span> • Assessment: {candidateAudit?.candidate?.assessmentId}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedCandidateId(null);
                  setCandidateAudit(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1B2B23]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-5 text-sm">
              {auditLoading ? (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                  <div className="w-8 h-8 border-3 border-[#198754]/30 border-t-[#198754] rounded-full animate-spin mx-auto mb-2" />
                  Loading audit log...
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 dark:bg-[#1B2B23] rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className="text-gray-400">Full Name</div>
                      <div className="font-bold text-gray-800 dark:text-gray-100 text-sm">{candidateAudit?.candidate?.full_name}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Email</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200 truncate">{candidateAudit?.candidate?.email}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Phone</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">+91 {candidateAudit?.candidate?.phone}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Academic Background</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {candidateAudit?.candidate?.degree} ({candidateAudit?.candidate?.branch})
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">College</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200 truncate">{candidateAudit?.candidate?.college_name}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Total Score</div>
                      <div className="font-bold text-[#146C43] dark:text-emerald-400 text-sm">
                        {candidateAudit?.candidate?.score} / {candidateAudit?.candidate?.totalQuestions} ({Math.round(((candidateAudit?.candidate?.score || 0) / (candidateAudit?.candidate?.totalQuestions || 40)) * 100)}%)
                      </div>
                    </div>
                  </div>

                  {/* Section-Wise Breakdown Cards */}
                  {candidateAudit?.sectionStats && Object.keys(candidateAudit.sectionStats).length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2.5 flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-[#198754]" /> Section-Wise Performance
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {Object.entries(candidateAudit.sectionStats).map(([sec, data]) => {
                          const pct = Math.round((data.correct / data.total) * 100);
                          return (
                            <div key={sec} className="bg-white dark:bg-[#14221B] border border-gray-200 dark:border-[#284033] rounded-xl p-2.5 text-center">
                              <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 truncate" title={sec}>
                                {sec}
                              </div>
                              <div className="text-sm font-bold text-[#146C43] dark:text-emerald-400 mt-0.5">
                                {data.correct} / {data.total}
                              </div>
                              <div className="text-[10px] text-gray-400 font-medium">{pct}%</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Question Breakdown with Answer Filtering */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                        Candidate Answers ({filteredAnswers.length})
                      </h4>

                      {/* Filter Answer Choices */}
                      <div className="inline-flex rounded-xl border border-gray-200 dark:border-[#284033] p-0.5 bg-gray-50 dark:bg-[#1B2B23] text-xs">
                        <button
                          type="button"
                          onClick={() => setAuditFilter('ALL')}
                          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            auditFilter === 'ALL'
                              ? 'bg-white dark:bg-[#14221B] text-gray-900 dark:text-gray-100 shadow-xs'
                              : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                          }`}
                        >
                          All ({candidateAudit?.answers?.length || 0})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAuditFilter('CORRECT')}
                          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            auditFilter === 'CORRECT'
                              ? 'bg-white dark:bg-[#14221B] text-[#146C43] dark:text-emerald-400 shadow-xs'
                              : 'text-gray-500 hover:text-[#146C43]'
                          }`}
                        >
                          Correct ({candidateAudit?.candidate?.score || 0})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAuditFilter('INCORRECT')}
                          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            auditFilter === 'INCORRECT'
                              ? 'bg-white dark:bg-[#14221B] text-rose-600 dark:text-rose-400 shadow-xs'
                              : 'text-gray-500 hover:text-rose-600'
                          }`}
                        >
                          Incorrect ({(candidateAudit?.candidate?.totalQuestions || 40) - (candidateAudit?.candidate?.score || 0)})
                        </button>
                      </div>
                    </div>

                    {filteredAnswers.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-4 text-center">No questions match the selected filter.</p>
                    ) : (
                      <div className="space-y-3">
                        {filteredAnswers.map((ans, idx) => (
                          <div
                            key={ans.question_id}
                            className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                              ans.is_correct
                                ? 'bg-[#EAF7EF]/50 dark:bg-[#1D3327]/60 border-[#C8E8D5] dark:border-[#294337]'
                                : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <span className="font-bold text-gray-800 dark:text-gray-200">
                                Q{idx + 1}. {ans.question_text}
                              </span>
                              {ans.is_correct ? (
                                <span className="inline-flex items-center gap-1 text-[#146C43] dark:text-emerald-400 font-bold flex-shrink-0">
                                  <Check className="w-3.5 h-3.5" /> Correct
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-bold flex-shrink-0">
                                  <XCircle className="w-3.5 h-3.5" /> Incorrect
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-800 text-[11px]">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Candidate Choice: </span>
                                <span className={`font-bold ${ans.is_correct ? 'text-[#146C43] dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                  Option {ans.selected_option}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Correct Answer: </span>
                                <span className="font-bold text-[#146C43] dark:text-emerald-400">Option {ans.correct_option}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 bg-gray-50 dark:bg-[#1B2B23] border-t border-gray-200 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => {
                  setSelectedCandidateId(null);
                  setCandidateAudit(null);
                }}
                className="py-2 px-4 bg-white dark:bg-[#14221B] border border-gray-300 dark:border-[#284033] rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1B2B23] transition-colors"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidateId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#14221B] rounded-3xl border border-gray-200 dark:border-[#284033] shadow-2xl max-w-md w-full p-6 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Delete Candidate Record?</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              This action will permanently delete candidate <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{deleteCandidateId}</span>, including all assessment attempts, submitted answers, and uploaded resumes.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteCandidateId(null)}
                className="py-2 px-4 bg-gray-100 dark:bg-[#1B2B23] hover:bg-gray-200 dark:hover:bg-[#20362B] text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteCandidate}
                className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
