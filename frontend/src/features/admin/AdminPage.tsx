import { toast } from 'sonner';
import { FileText, History, LayoutTemplate, Trash2, Users } from 'lucide-react';
import type { AdminUser, Role } from '@/types';
import { adminApi } from '@/api';
import { useAsync } from '@/hooks/useAsync';
import { useAuthStore } from '@/stores/authStore';
import { DOCUMENT_TYPES } from '@/lib/documentTypes';
import { formatDateTime } from '@/lib/utils';
import { IconButton } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { confirm } from '@/components/ui/ConfirmDialog';

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
      <div className="flex items-center gap-2 text-[13px] text-muted [&_svg]:size-4">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}

export function AdminPage() {
  const me = useAuthStore((s) => s.user);
  const stats = useAsync(() => adminApi.stats(), []);
  const users = useAsync(() => adminApi.users(), []);

  const changeRole = async (user: AdminUser, role: Role) => {
    try {
      await adminApi.setRole(user.id, role);
      users.setData((list) => list?.map((u) => (u.id === user.id ? { ...u, role } : u)));
      toast.success(`Роль ${user.name} изменена`);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const removeUser = async (user: AdminUser) => {
    const ok = await confirm({ title: 'Удалить пользователя?', message: `${user.name} (${user.email}) и все его документы и шаблоны будут удалены.`, confirmLabel: 'Удалить', danger: true });
    if (!ok) return;
    try {
      await adminApi.removeUser(user.id);
      users.setData((list) => list?.filter((u) => u.id !== user.id));
      stats.reload();
      toast.success('Пользователь удалён');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const maxByType = Math.max(1, ...Object.values(stats.data?.documentsByType ?? {}));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Администрирование</h1>
        <p className="mt-1 text-sm text-muted">Пользователи, системные шаблоны и статистика</p>
      </div>

      {stats.error ? (
        <ErrorState message={stats.error} onRetry={stats.reload} />
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.data ? (
            <>
              <StatCard icon={<Users />} label="Пользователи" value={stats.data.users} />
              <StatCard icon={<FileText />} label="Документы" value={stats.data.documents} />
              <StatCard icon={<LayoutTemplate />} label="Шаблоны (сист. / польз.)" value={`${stats.data.systemTemplates} / ${stats.data.customTemplates}`} />
              <StatCard icon={<History />} label="Версии" value={stats.data.versions} />
            </>
          ) : (
            Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[92px] rounded-2xl" />)
          )}
        </section>
      )}

      {stats.data && (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
          <h2 className="mb-4 text-sm font-semibold">Документы по типам</h2>
          <div className="space-y-3">
            {DOCUMENT_TYPES.map((type) => {
              const count = stats.data!.documentsByType[type.type] ?? 0;
              return (
                <div key={type.type} className="grid grid-cols-[120px_1fr_40px] items-center gap-3 text-sm">
                  <span className="text-fg-soft">{type.label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(count / maxByType) * 100}%` }} />
                  </div>
                  <span className="text-right tabular-nums text-muted">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
        <h2 className="border-b border-line px-5 py-4 text-sm font-semibold">Пользователи</h2>
        {users.error ? (
          <ErrorState message={users.error} onRetry={users.reload} />
        ) : !users.data ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-surface-2 text-left text-xs text-muted">
                  <th className="px-5 py-2.5 font-medium">Пользователь</th>
                  <th className="px-3 py-2.5 font-medium">Роль</th>
                  <th className="px-3 py-2.5 font-medium">Документы</th>
                  <th className="px-3 py-2.5 font-medium">Шаблоны</th>
                  <th className="px-3 py-2.5 font-medium">Регистрация</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.data.map((user) => (
                  <tr key={user.id}>
                    <td className="px-5 py-3">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-muted">{user.email}</div>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={user.role}
                        disabled={user.id === me?.id}
                        onChange={(e) => changeRole(user, e.target.value as Role)}
                        aria-label={`Роль ${user.name}`}
                        className="field-input h-8 w-28 py-0"
                      >
                        <option value="USER">user</option>
                        <option value="ADMIN">admin</option>
                      </select>
                    </td>
                    <td className="px-3 py-3 tabular-nums">{user.documentsCount}</td>
                    <td className="px-3 py-3 tabular-nums">{user.templatesCount}</td>
                    <td className="px-3 py-3 text-muted">{formatDateTime(user.createdAt)}</td>
                    <td className="px-3 py-3">
                      {user.id !== me?.id && (
                        <IconButton size="sm" tone="danger" label="Удалить пользователя" onClick={() => removeUser(user)}>
                          <Trash2 />
                        </IconButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
