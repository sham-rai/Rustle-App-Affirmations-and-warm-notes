import { EmptyTab } from '../../components/EmptyTab';
import { BackupStatusRow } from '../../features/settings/backup-status';
import { useAuth } from '../../lib/auth/AuthProvider';

export default function YouScreen() {
  const auth = useAuth();
  return (
    <EmptyTab tab="you">
      <BackupStatusRow auth={auth} />
    </EmptyTab>
  );
}
