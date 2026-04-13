import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Category } from '../types';
import { useI18n } from '../i18n';

const CATEGORY_ICONS: Record<Category, string> = {
  plant: '\u{1F33F}',
  mushroom: '\u{1F344}',
  snake: '\u{1F40D}',
  insect: '\u{1F41C}',
  animal: '\u{1F43E}',
  injury: '\u{1FA79}',
  general: '\u{1F50D}',
};

const CATEGORIES: Category[] = ['plant', 'mushroom', 'snake', 'insect', 'animal', 'injury', 'general'];

interface Props {
  selected: Category;
  onSelect: (category: Category) => void;
}

export function CategoryPicker({ selected, onSelect }: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      {CATEGORIES.map((cat) => (
        <TouchableOpacity
          key={cat}
          style={[styles.chip, selected === cat && styles.chipActive]}
          onPress={() => onSelect(cat)}
          activeOpacity={0.7}
        >
          <Text style={styles.icon}>{CATEGORY_ICONS[cat]}</Text>
          <Text style={[styles.label, selected === cat && styles.labelActive]}>
            {t.categories[cat]}
          </Text>
        </TouchableOpacity>
      ))}
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
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#166534',
    borderColor: '#166534',
  },
  icon: {
    fontSize: 16,
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  labelActive: {
    color: '#ffffff',
  },
});
