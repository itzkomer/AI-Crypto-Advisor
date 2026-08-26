import { Navigate, Route, Routes } from 'react-router-dom';
import { RedirectIfAuthenticated, RequireAuth, RequireOnboarding } from '@/routes/guards';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const App = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />

    {/* Public - bounces authenticated users to where they belong. */}
    <Route element={<RedirectIfAuthenticated />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Route>

    {/* Authenticated */}
    <Route element={<RequireAuth />}>
      {/* Reachable before onboarding is complete - it *is* the onboarding. */}
      <Route path="/onboarding" element={<OnboardingPage />} />

      {/* Requires a completed profile. */}
      <Route element={<RequireOnboarding />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
