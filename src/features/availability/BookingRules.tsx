// Admin only: the rules every booking follows. (Saving is allowed only for admins by the database.)
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Banner } from '../../components/Banner';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Select } from '../../components/Select';
import { useBusinessSettings } from '../../lib/business';
import { useI18n } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { spacing } from '../../theme';

const NOTICE = [0, 2, 4, 12, 24, 48, 72];
const STEP = [15, 30, 60];
const HORIZON = [30, 60, 90, 180];

export function BookingRules() {
  const { t } = useI18n();
  const { settings, error, reload } = useBusinessSettings();
  const [notice, setNotice] = useState('24');
  const [step, setStep] = useState('30');
  const [horizon, setHorizon] = useState('60');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setNotice(String(settings.cancel_notice_hours));
    setStep(String(settings.slot_step_minutes));
    setHorizon(String(settings.booking_horizon_days));
  }, [settings]);

  const dirty =
    !!settings &&
    (Number(notice) !== settings.cancel_notice_hours ||
      Number(step) !== settings.slot_step_minutes ||
      Number(horizon) !== settings.booking_horizon_days);

  async function save() {
    setBusy(true);
    setSaved(false);
    setFailed(false);
    const { data, error: err } = await supabase
      .from('business_settings')
      .update({
        cancel_notice_hours: Number(notice),
        slot_step_minutes: Number(step),
        booking_horizon_days: Number(horizon),
      })
      .eq('id', true)
      .select('id');
    setBusy(false);
    if (err || !data || data.length === 0) return setFailed(true); // not an admin, or the save failed
    setSaved(true);
    await reload();
  }

  const noticeOptions = NOTICE.map((n) => ({ value: String(n), label: n === 0 ? t('rules.none') : t('rules.hours', { n }) }));
  const stepOptions = STEP.map((n) => ({ value: String(n), label: t('rules.minutes', { n }) }));
  const horizonOptions = HORIZON.map((n) => ({ value: String(n), label: t('rules.days', { n }) }));

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="h2">{t('rules.title')}</AppText>
        <AppText color="muted">{t('rules.subtitle')}</AppText>
      </View>

      {error ? <Banner tone="error">{t('rules.error.load')}</Banner> : null}

      <View style={{ gap: spacing.xs }}>
        <AppText variant="label">{t('rules.timezone')}</AppText>
        <AppText>{settings?.timezone ?? '…'}</AppText>
      </View>

      <Select label={t('rules.notice')} title={t('rules.notice')} value={notice} options={noticeOptions} onChange={(v) => { setNotice(v); setSaved(false); }} />
      <AppText variant="small" color="muted" style={{ marginTop: -spacing.sm }}>
        {t('rules.noticeHint')}
      </AppText>
      <Select label={t('rules.step')} title={t('rules.step')} value={step} options={stepOptions} onChange={(v) => { setStep(v); setSaved(false); }} />
      <Select label={t('rules.horizon')} title={t('rules.horizon')} value={horizon} options={horizonOptions} onChange={(v) => { setHorizon(v); setSaved(false); }} />

      {failed ? <Banner tone="error">{t('rules.error.save')}</Banner> : null}
      {saved ? <Banner tone="success">{t('rules.saved')}</Banner> : null}

      <Button label={t('rules.save')} onPress={save} busy={busy} disabled={!dirty} />
    </Card>
  );
}
