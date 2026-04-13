import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { RiskLevel } from '../types';
import { useI18n } from '../i18n';

const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#22c55e',
  moderate: '#eab308',
  high: '#ef4444',
  emergency: '#dc2626',
};

const RISK_BG: Record<RiskLevel, string> = {
  low: '#f0fdf4',
  moderate: '#fefce8',
  high: '#fef2f2',
  emergency: '#450a0a',
};

const RISK_TEXT_COLOR: Record<RiskLevel, string> = {
  low: '#166534',
  moderate: '#854d0e',
  high: '#991b1b',
  emergency: '#ffffff',
};

interface Props {
  risk: RiskLevel;
}

export function RiskMeter({ risk }: Props) {
  const { t } = useI18n();
  const levels: RiskLevel[] = ['low', 'moderate', 'high', 'emergency'];
  const activeIndex = levels.indexOf(risk);

  return (
    <View style={[styles.container, { backgroundColor: RISK_BG[risk] }]}>
      <Text style={[styles.label, { color: RISK_TEXT_COLOR[risk] }]}>
        {t.result.risk}: {t.risk[risk]}
      </Text>
      <View style={styles.bars}>
        {levels.map((level, i) => (
          <View
            key={level}
            style={[
              styles.bar,
              {
                backgroundColor: i <= activeIndex ? RISK_COLORS[risk] : '#e5e7eb',
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bars: {
    flexDirection: 'row',
    gap: 4,
  },
  bar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
});
