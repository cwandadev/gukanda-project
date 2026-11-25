// TEMPORARY dev screen: checks icons, sizes/colors and Poppins/Jost accents (EN + FR).
import { StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { Icon, type IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import { useI18n } from '../lib/i18n';
import { colors, spacing, text } from '../theme';

const NAMES: IconName[] = [
  'home', 'calendar', 'user', 'clock', 'document', 'check', 'close', 'warning', 'language',
];
const SIZES = [16, 24, 32, 48];
const TONES = ['plum', 'ink', 'success', 'danger'] as const;
const VARIANTS = Object.keys(text) as (keyof typeof text)[];

export default function IconTest() {
  const { t } = useI18n();

  return (
    <Screen title={t('dev.iconTest')}>
      <Card style={styles.card}>
        <AppText variant="h3">{t('dev.icons')}</AppText>
        <View style={styles.grid}>
          {NAMES.map((name) => (
            <View key={name} style={styles.cell}>
              <Icon name={name} size={32} color={colors.plum} />
              <AppText variant="caption" color="muted">{name}</AppText>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <AppText variant="h3">{t('dev.sizesColors')}</AppText>
        <View style={styles.row}>
          {SIZES.map((s) => (
            <Icon key={s} name="check" size={s} color={colors.plum} />
          ))}
        </View>
        <View style={styles.row}>
          {TONES.map((c) => (
            <Icon key={c} name="warning" size={32} color={colors[c]} />
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <AppText variant="h3">{t('dev.fonts')}</AppText>
        {VARIANTS.map((v) => (
          <View key={v} style={styles.sample}>
            <AppText variant="caption" color="muted">{v}</AppText>
            <AppText variant={v}>{t('dev.sampleEn')}</AppText>
            <AppText variant={v}>{t('dev.sampleFr')}</AppText>
          </View>
        ))}
        <AppText variant="h3">{t('dev.glyphs')}</AppText>
        <AppText variant="body">{t('dev.glyphs')}</AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cell: { width: 84, alignItems: 'center', gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.lg },
  sample: { gap: spacing.xs },
});
