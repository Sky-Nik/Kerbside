import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Profile } from './types';

type Value = { profile: Profile | null; loaded: boolean; reload: () => Promise<void> };

const ProfileContext = createContext<Value | null>(null);

// The single profile row, shared app-wide because routing depends on it.
export function ProfileProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(
    () =>
      db.getFirstAsync<Profile>('SELECT * FROM profile WHERE deleted_at IS NULL').then((p) => {
        setProfile(p);
        setLoaded(true);
      }),
    [db],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return <ProfileContext.Provider value={{ profile, loaded, reload }}>{children}</ProfileContext.Provider>;
}

export function useProfile(): Value {
  const v = useContext(ProfileContext);
  if (!v) throw new Error('useProfile outside ProfileProvider');
  return v;
}
