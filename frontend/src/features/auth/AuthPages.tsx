import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { authApi, ApiError } from '@/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { DOCUMENT_TYPES } from '@/lib/documentTypes';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Decorative sample of an assembled document for the brand panel. */
function BuilderIllustration() {
  const rows = [
    { label: 'Title', value: 'Авторизация не работает', w: 'w-3/4' },
    { label: 'Severity', badge: 'Critical', tone: 'bg-rose-400/25 text-rose-100' },
    { label: 'Steps to Reproduce', steps: true },
  ];
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -left-6 top-10 hidden -rotate-6 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-indigo-100 shadow-lg backdrop-blur lg:block">
        ⠿ Шаг
      </div>
      <div className="absolute -right-4 -top-4 hidden rotate-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-indigo-100 shadow-lg backdrop-blur lg:block">
        ⠿ Environment
      </div>
      <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-md">
        <div className="mb-4 inline-flex rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white">BUG REPORT</div>
        <div className="space-y-3.5">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="mb-1.5 text-[10px] font-semibold tracking-wider text-indigo-200/80 uppercase">{row.label}</div>
              {row.value && <div className={`text-sm text-white ${row.w}`}>{row.value}</div>}
              {row.badge && <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${row.tone}`}>{row.badge}</span>}
              {row.steps && (
                <div className="space-y-1.5">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-md bg-white/15 text-[10px] text-white">{n}</span>
                      <span className="h-2 flex-1 rounded-full bg-white/20" style={{ maxWidth: `${90 - n * 12}%` }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex min-h-full">
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_45%)]" />
        <div className="relative flex items-center gap-2.5 text-[15px] font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-white/15">QA</span> QA Builder
        </div>
        <div className="relative">
          <BuilderIllustration />
        </div>
        <div className="relative">
          <h2 className="text-2xl font-semibold tracking-tight">Собирайте QA-документацию из блоков</h2>
          <p className="mt-2 max-w-md text-sm text-indigo-100/80">
            Bug Report, чек-листы, тест-кейсы, тест-листы и тест-планы — в визуальном конструкторе с мгновенным предпросмотром.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {DOCUMENT_TYPES.map((t) => (
              <span key={t.type} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
                {t.emoji} {t.label}
              </span>
            ))}
          </div>
        </div>
      </aside>
      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Logo className="lg:invisible" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <p className="mt-6 text-center text-sm text-muted">{footer}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

type Errors = Partial<Record<'email' | 'password' | 'name', string>>;

function useAuthSubmit() {
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const run = async (action: () => ReturnType<typeof authApi.login>) => {
    setLoading(true);
    try {
      const { token, user } = await action();
      setSession(token, user);
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось выполнить вход');
    } finally {
      setLoading(false);
    }
  };
  return { loading, run };
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const { loading, run } = useAuthSubmit();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Введите корректный email';
    if (!password) next.password = 'Введите пароль';
    setErrors(next);
    if (Object.keys(next).length === 0) run(() => authApi.login({ email: email.trim(), password }));
  };

  return (
    <AuthLayout
      title="С возвращением"
      subtitle="Войдите, чтобы продолжить работу с документами"
      footer={
        <>
          Нет аккаунта?{' '}
          <Link to="/register" className="font-medium text-accent hover:underline">
            Зарегистрироваться
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="you@company.com" autoFocus />
        <Field label="Пароль" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} placeholder="••••••••" />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Войти
        </Button>
      </form>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const { loading, run } = useAuthSubmit();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (name.trim().length < 2) next.name = 'Минимум 2 символа';
    if (!EMAIL_RE.test(email.trim())) next.email = 'Введите корректный email';
    if (password.length < 8) next.password = 'Минимум 8 символов';
    setErrors(next);
    if (Object.keys(next).length === 0) run(() => authApi.register({ name: name.trim(), email: email.trim(), password }));
  };

  return (
    <AuthLayout
      title="Создать аккаунт"
      subtitle="Бесплатно. Первый документ — меньше чем за минуту"
      footer={
        <>
          Уже есть аккаунт?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Войти
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Имя" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="Анна Тестова" autoFocus />
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="you@company.com" />
        <Field label="Пароль" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint="Не меньше 8 символов" />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Зарегистрироваться
        </Button>
      </form>
    </AuthLayout>
  );
}
