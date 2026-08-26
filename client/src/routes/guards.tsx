/**
 * Route guards.
 *
 * State machine:
 *   no token            -> /login
 *   token, no profile   -> /onboarding   (newly registered users land here)
 *   token, has profile  -> /dashboard
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FullPageLoader } from '@/components/layout/FullPageLoader';

/** Requires a session. Unauthenticated users are sent to /login. */
export const RequireAuth = () => {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) return <FullPageLoader label="Restoring your session…" />;

  if (!isAuthenticated) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

/**
 * Requires completed onboarding. Sits inside RequireAuth, so a fresh registration
 * is redirected straight to the questionnaire.
 */
export const RequireOnboarding = () => {
  const { user } = useAuth();

  if (user && !user.hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
};

/** Keeps signed-in users off /login and /register. */
export const RedirectIfAuthenticated = () => {
  const { isAuthenticated, isBootstrapping, user } = useAuth();

  if (isBootstrapping) return <FullPageLoader label="Restoring your session…" />;

  if (isAuthenticated) {
    return <Navigate to={user?.hasCompletedOnboarding ? '/dashboard' : '/onboarding'} replace />;
  }

  return <Outlet />;
};
