import React from 'react';
import { View, Modal, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { Pencil, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface CollectionActionMenuProps {
  visible: boolean;
  onClose: () => void;
  onEditName: () => void;
  onDeleteCollection: () => void;
}

export function CollectionActionMenu({
  visible,
  onClose,
  onEditName,
  onDeleteCollection,
}: CollectionActionMenuProps) {
  const { colors: Theme, isDark, shadows } = useTheme();
  const styles = getStyles(Theme);
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Typography variant="h3" color={Theme.text}>Opcje kolekcji</Typography>
          </View>

          {/* Edit Name */}
          <TouchableOpacity style={styles.option} onPress={onEditName}>
            <View style={[styles.iconBox, { backgroundColor: Theme.primaryMuted }]}>
              <Pencil size={20} color={Theme.primary} />
            </View>
            <View>
              <Typography variant="bodySemi" color={Theme.text}>Edytuj nazwę</Typography>
              <Typography variant="caption" color={Theme.textMuted}>Zmień tytuł kolekcji</Typography>
            </View>
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity style={styles.option} onPress={onDeleteCollection}>
            <View style={[styles.iconBox, { backgroundColor: Theme.destructiveLight }]}>
              <Trash2 size={20} color={Theme.destructive} />
            </View>
            <View>
              <Typography variant="bodySemi" color={Theme.destructive}>Usuń kolekcję</Typography>
              <Typography variant="caption" color={Theme.textMuted}>Tej operacji nie można cofnąć</Typography>
            </View>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Typography variant="bodySemi" color={Theme.text}>Anuluj</Typography>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const getStyles = (Theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    backgroundColor: Theme.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
    borderWidth: 1,
    borderColor: Theme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: Theme.backgroundAlt,
  },
});
