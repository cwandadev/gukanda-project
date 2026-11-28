import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// "Are you sure?" popup, used before deleting something.
export function ConfirmDialog({ visible, title, message, confirmLabel, cancelLabel, danger, busy, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <AppText variant="h3">{title}</AppText>
          {message ? <AppText color="muted">{message}</AppText> : null}
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <Button label={confirmLabel} variant={danger ? 'danger' : 'primary'} onPress={onConfirm} busy={busy} />
            <Button label={cancelLabel} variant="ghost" onPress={onCancel} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 380, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, boxShadow: shadow.raised },
});
