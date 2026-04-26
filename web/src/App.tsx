import { useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { TaskPanel } from './components/TaskPanel';
import { ConfigDrawer } from './components/ConfigDrawer';
import { api } from './lib/api';
import { useStore } from './lib/store';

export default function App() {
  const setUsers = useStore((s) => s.setUsers);
  const setVersion = useStore((s) => s.setVersion);
  const setArchiveTotal = useStore((s) => s.setArchiveTotal);
  const setConnected = useStore((s) => s.setConnected);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [u, v, a] = await Promise.all([
          api.listUsers(),
          api.getVersion(),
          api.archiveStats(),
        ]);
        if (!alive) return;
        setUsers(u.users, u.groups);
        setVersion(v.version);
        setArchiveTotal(a.total);
        setConnected(true);
      } catch {
        if (alive) setConnected(false);
      }
    })();

    // 定期刷新归档统计
    const t = setInterval(async () => {
      try {
        const a = await api.archiveStats();
        setArchiveTotal(a.total);
        setConnected(true);
      } catch {
        setConnected(false);
      }
    }, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [setUsers, setVersion, setArchiveTotal, setConnected]);

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <main className="flex-1 min-h-0 grid grid-cols-[320px_minmax(0,1fr)] gap-4 px-4 pb-4">
        <Sidebar />
        <TaskPanel />
      </main>
      <ConfigDrawer />
    </div>
  );
}
