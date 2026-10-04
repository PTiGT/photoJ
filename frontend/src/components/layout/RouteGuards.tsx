import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { authApi } from '@/api';
import { useAuthStore } from '@/stores/authStore';
import { FullScreenLoader } from '@/components/ui/Feedback';

/** Validates the stored token once per session and redirects guests to /login. */
export function RequireAuth() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const location = useLocation();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    authApi
      .me()
      .then(({ user }) => active && setUser(user))
      .catch(() => undefined) // 401 already logs out in the API client
      .finally(() => active && setVerified(true));
    return () => {
      active = false;
    };
  }, [token, setUser]);

  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!verified) return <FullScreenLoader />;
  return <Outlet />;
}

export function RequireAdmin() {
  const role = useAuthStore((s) => s.user?.role);
  return role === 'ADMIN' ? <Outlet /> : <Navigate to="/" replace />;
}

export function GuestOnly() {
  const token = useAuthStore((s) => s.token);
  return token ? <Navigate to="/" replace /> : <Outlet />;
}
