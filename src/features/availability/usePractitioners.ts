// The list of practitioners (any logged-in user may read them: clients need it to book).
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export type PractitionerItem = { id: string; full_name: string };

export function usePractitioners() {
  const [list, setList] = useState<PractitionerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'practitioner')
      .order('full_name')
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError(true);
        else setList((data ?? []) as PractitionerItem[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { list, loading, error };
}
