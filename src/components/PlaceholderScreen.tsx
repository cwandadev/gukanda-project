import { useI18n } from '../lib/i18n';
import { AppText } from './AppText';
import { Card } from './Card';
import { Screen } from './Screen';

// Stand-in for every screen until its real chunk is built.
export function PlaceholderScreen({ titleKey }: { titleKey: string }) {
  const { t } = useI18n();
  return (
    <Screen title={t(titleKey)}>
      <Card>
        <AppText variant="body">{t('common.placeholder')}</AppText>
      </Card>
    </Screen>
  );
}
