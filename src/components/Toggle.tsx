import { Switch } from 'react-native';
import { colors } from '../theme';

type Props = { value: boolean; onValueChange: (v: boolean) => void; label: string };

// On/off switch in brand colors. `label` is read by screen readers.
export function Toggle({ value, onValueChange, label }: Props) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={label}
      trackColor={{ false: colors.border, true: colors.plum }}
      thumbColor={colors.white}
    />
  );
}
