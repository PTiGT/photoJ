import { Link } from 'react-router';
import { FileQuestion } from 'lucide-react';
import { EmptyState } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-full items-center justify-center">
      <EmptyState
        icon={<FileQuestion />}
        title="Страница не найдена"
        description="Возможно, документ был удалён или ссылка устарела."
        action={
          <Link to="/">
            <Button>На главную</Button>
          </Link>
        }
      />
    </div>
  );
}
