import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Flag } from '../types';
import { useI18n } from '../i18n';

const FLAGS: Flag[] = ['bite', 'bleeding', 'breathing', 'ate'];

const FLAG_ICONS: Record<Flag, string> = {
  bite: '\u{1F9B7}',
  bleeding: '\u{1FA78}',
  breathing: '\u{1F32C}',
  ate: '\u{1F37D}',
};

interface Props {
  selected: Flag[];
  onToggle: (flag: Flag) => void;
}

export function FlagChips({ selected, onToggle }: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      {FLAGS.map((flag) => {
        const active = selected.includes(flag);
        return (
          <TouchableOpacity
            key={flag}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onToggle(flag)}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>{FLAG_ICONS[flag]}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>
              {t.flags[flag]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  chipActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  icon: {
    fontSize: 14,
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991b1b',
  },
  labelActive: {
    color: '#ffffff',
  },
});
