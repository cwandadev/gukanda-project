import { View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useI18n, type Lang } from '../lib/i18n';
import { spacing } from '../theme';
import { Chip } from './Chip';

const LANGS: Lang[] = ['en', 'fr'];

// Changes the language now, and saves it on the profile when someone is signed in.
export function LanguageSwitcher() {
  const { lang } = useI18n();
  const { saveLanguage } = useAuth();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      {LANGS.map((l) => (
        <Chip key={l} label={l.toUpperCase()} active={l === lang} onPress={() => void saveLanguage(l)} />
      ))}
    </View>
  );
}
