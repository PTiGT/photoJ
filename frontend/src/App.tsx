import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { GuestOnly, RequireAdmin, RequireAuth } from '@/components/layout/RouteGuards';
import { ConfirmHost } from '@/components/ui/ConfirmDialog';
import { FullScreenLoader } from '@/components/ui/Feedback';
import { useThemeStore, resolveDark } from '@/stores/themeStore';
import { LoginPage, RegisterPage } from '@/features/auth/AuthPages';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { NotFoundPage } from '@/features/NotFoundPage';

// The builder and admin pages are the heaviest — load them on demand.
const DocumentBuilderPage = lazy(() => import('@/features/builder/BuilderPage').then((m) => ({ default: m.DocumentBuilderPage })));
const TemplateBuilderPage = lazy(() => import('@/features/builder/BuilderPage').then((m) => ({ default: m.TemplateBuilderPage })));
const TemplatesPage = lazy(() => import('@/features/templates/TemplatesPage').then((m) => ({ default: m.TemplatesPage })));
const AdminPage = lazy(() => import('@/features/admin/AdminPage').then((m) => ({ default: m.AdminPage })));

export function App() {
  const theme = useThemeStore((s) => s.theme);
  return (
    <BrowserRouter>
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route path="/documents/:id" element={<DocumentBuilderPage />} />
            <Route path="/templates/:id/edit" element={<TemplateBuilderPage />} />
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <ConfirmHost />
      <Toaster position="bottom-right" theme={resolveDark(theme) ? 'dark' : 'light'} richColors closeButton toastOptions={{ className: 'font-sans' }} />
    </BrowserRouter>
  );
}
