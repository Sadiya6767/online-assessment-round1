import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import CandidateRegistration from './pages/CandidateRegistration';
import AssessmentRoom from './pages/AssessmentRoom';
import AssessmentCompletion from './pages/AssessmentCompletion';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import TestPaused from './pages/TestPaused';

// Protected Route Guard for Admin
function ProtectedAdminRoute({ children }) {
  const token = localStorage.getItem('nexis_admin_token');
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

// 4-Hour Test Disabled Guard (Locks until 6:20 PM IST, auto-reopens afterwards)
const TEST_DISABLED_UNTIL = new Date('2026-10-05T12:50:00.000Z').getTime();

function CandidateAccessGuard({ children }) {
  const [isTestDisabled, setIsTestDisabled] = React.useState(Date.now() < TEST_DISABLED_UNTIL);

  React.useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() >= TEST_DISABLED_UNTIL) {
        setIsTestDisabled(false);
      }
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  if (isTestDisabled) {
    return <TestPaused />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Candidate Assessment Flow (Protected by 1-hour pause guard) */}
      <Route
        path="/"
        element={
          <CandidateAccessGuard>
            <CandidateRegistration />
          </CandidateAccessGuard>
        }
      />
      <Route
        path="/test/:assessmentId"
        element={
          <CandidateAccessGuard>
            <AssessmentRoom />
          </CandidateAccessGuard>
        }
      />
      <Route path="/test/:assessmentId/completed" element={<AssessmentCompletion />} />

      {/* Segregated Private Admin Flow */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedAdminRoute>
            <AdminDashboard />
          </ProtectedAdminRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
