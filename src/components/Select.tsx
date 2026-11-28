import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors, control, radius, shadow, spacing } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export type Option = { value: string; label: string };

type Props = {
  value: string | null;
  options: Option[];
  onChange: (value: string) => void;
  label?: string;
  title?: string; // heading of the list
  placeholder?: string;
  compact?: boolean; // smaller, for use inside a row
  disabled?: boolean;
};

const ROW = 48;

// A dropdown that looks and works the same on phone and web (a native <select> does not).
export function Select({ value, options, onChange, label, title, placeholder, compact, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const index = options.findIndex((o) => o.value === value);

  return (
    <View style={[{ gap: spacing.xs }, compact && { flex: 1 }]}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label ?? title}
        style={[styles.box, compact && styles.compact, disabled && { opacity: 0.5 }]}
      >
        <AppText color={index >= 0 ? 'ink' : 'muted'} numberOfLines={1} style={{ flex: 1 }}>
          {index >= 0 ? options[index].label : (placeholder ?? '')}
        </AppText>
        <Icon name="chevronDown" size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {title ? (
              <AppText variant="h3" style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
                {title}
              </AppText>
            ) : null}
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              getItemLayout={(_, i) => ({ length: ROW, offset: ROW * i, index: i })}
              initialNumToRender={options.length}
              initialScrollIndex={index > 2 ? index - 2 : 0}
              renderItem={({ item }) => {
                const selected = item.value === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    style={[styles.row, selected && styles.rowSelected]}
                  >
                    <AppText variant={selected ? 'bodyMedium' : 'body'} color={selected ? 'plum' : 'ink'} style={{ flex: 1 }}>
                      {item.label}
                    </AppText>
                    {selected ? <Icon name="check" size={20} color={colors.plum} /> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: control.height,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: control.inputRadius,
  },
  compact: { minHeight: control.heightSm + 4, paddingHorizontal: spacing.sm + 4 },
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  sheet: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '70%',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    boxShadow: shadow.raised,
  },
  row: { height: ROW, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md },
  rowSelected: { backgroundColor: colors.plumTint },
});
