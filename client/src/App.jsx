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

// Guard for Candidate Assessment Flow (Disabled)
function CandidateAccessGuard({ children }) {
  const isTestDisabled = true;

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
