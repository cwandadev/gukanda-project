import { View } from 'react-native';
import { useI18n, type Lang } from '../lib/i18n';
import { spacing } from '../theme';
import { Chip } from './Chip';

const LANGS: Lang[] = ['en', 'fr'];

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      {LANGS.map((l) => (
        <Chip key={l} label={l.toUpperCase()} active={l === lang} onPress={() => setLang(l)} />
      ))}
    </View>
  );
}
