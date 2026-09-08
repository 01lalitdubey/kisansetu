import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { FarmerLayout } from './components/layout/FarmerLayout';
import { OfficerLayout } from './components/layout/OfficerLayout';
import { useAuthStore } from './store/authStore';

import Landing from './pages/Landing';
import Onboarding from './pages/farmer/Onboarding';
import FarmerAuth from './pages/farmer/Auth';
import FarmerDashboard from './pages/farmer/Dashboard';
import FarmerCenters from './pages/farmer/Centers';
import FarmerProcurement from './pages/farmer/Procurement';
import FarmerToken from './pages/farmer/Token';
import FarmerQueue from './pages/farmer/Queue';
import FarmerAssistant from './pages/farmer/Assistant';
import FarmerHistory from './pages/farmer/History';
import FarmerNotifications from './pages/farmer/Notifications';
import FarmerProfile from './pages/farmer/Profile';
import FarmerTransport from './pages/farmer/Transport';
import FarmerPayment from './pages/farmer/Payment';
import FarmerPaymentSuccess from './pages/farmer/PaymentSuccess';

import OfficerRegister from './pages/officer/Register';
import OfficerDashboard from './pages/officer/Dashboard';
import OfficerQueue from './pages/officer/Queue';
import OfficerRecommendations from './pages/officer/Recommendations';
import OfficerFarmers from './pages/officer/Farmers';
import OfficerHistory from './pages/officer/History';
import OfficerAnalytics from './pages/officer/Analytics';
import OfficerNotifications from './pages/officer/Notifications';

import AdminDashboard from './pages/admin/Dashboard';

export default function App() {
  const initAuth = useAuthStore((s) => s.init);

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      {/* Farmer onboarding + auth sit outside the app shell */}
      <Route path="/farmer/onboarding" element={<Onboarding />} />
      <Route path="/farmer/auth" element={<FarmerAuth />} />
      <Route path="/officer/register" element={<OfficerRegister />} />

      <Route path="/farmer" element={<FarmerLayout />}>
        <Route index element={<Navigate to="/farmer/dashboard" replace />} />
        <Route path="dashboard" element={<FarmerDashboard />} />
        <Route path="centers" element={<FarmerCenters />} />
        <Route path="procurement" element={<FarmerProcurement />} />
        <Route path="token" element={<FarmerToken />} />
        <Route path="queue" element={<FarmerQueue />} />
        <Route path="assistant" element={<FarmerAssistant />} />
        <Route path="history" element={<FarmerHistory />} />
        <Route path="notifications" element={<FarmerNotifications />} />
        <Route path="profile" element={<FarmerProfile />} />
        <Route path="transport" element={<FarmerTransport />} />
        <Route path="payment/success" element={<FarmerPaymentSuccess />} />
        <Route path="payment/:transportId" element={<FarmerPayment />} />
      </Route>

      <Route path="/officer" element={<OfficerLayout />}>
        <Route index element={<Navigate to="/officer/dashboard" replace />} />
        <Route path="dashboard" element={<OfficerDashboard />} />
        {/* Change 17: no separate "Centers" page — officer belongs to one centre */}
        <Route path="centers" element={<Navigate to="/officer/dashboard" replace />} />
        <Route path="queue" element={<OfficerQueue />} />
        <Route path="history" element={<OfficerHistory />} />
        <Route path="recommendations" element={<OfficerRecommendations />} />
        <Route path="farmers" element={<OfficerFarmers />} />
        <Route path="analytics" element={<OfficerAnalytics />} />
        <Route path="notifications" element={<OfficerNotifications />} />
      </Route>

      <Route path="/admin" element={<OfficerLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
