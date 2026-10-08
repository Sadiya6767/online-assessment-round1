import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import CandidateRegistration from './pages/CandidateRegistration';
import AssessmentRoom from './pages/AssessmentRoom';
import AssessmentCompletion from './pages/AssessmentCompletion';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

// Protected Route Guard for Admin
function ProtectedAdminRoute({ children }) {
  const token = localStorage.getItem('nexis_admin_token');
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Candidate Assessment Flow */}
      <Route path="/" element={<CandidateRegistration />} />
      <Route path="/test/:assessmentId" element={<AssessmentRoom />} />
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
