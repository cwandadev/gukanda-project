// Reads the one-row business_settings table (time zone + booking rules).
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type BusinessSettings = {
  timezone: string;
  cancel_notice_hours: number;
  slot_step_minutes: number;
  booking_horizon_days: number;
};

export function useBusinessSettings() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('business_settings')
      .select('timezone, cancel_notice_hours, slot_step_minutes, booking_horizon_days')
      .maybeSingle();
    if (err || !data) setError(true);
    else {
      setSettings(data as BusinessSettings);
      setError(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { settings, error, reload };
}
