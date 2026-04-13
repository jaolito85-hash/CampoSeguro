import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { AnalysisResult } from '../types';
import { useI18n } from '../i18n';
import { RiskMeter } from './RiskMeter';

interface Props {
  result: AnalysisResult;
}

function Section({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (!items.length) return null;
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      {items.map((item, i) => (
        <View key={i} style={styles.itemRow}>
          <Text style={styles.bullet}>{'\u2022'}</Text>
          <Text style={styles.itemText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function ResultCard({ result }: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <RiskMeter risk={result.risk} />

      <View style={styles.meta}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>
            {t.result.confidenceLabel}: {t.confidence[result.confidence]}
          </Text>
        </View>
      </View>

      {result.likelyIdentification !== 'uncertain' && (
        <View style={styles.idBox}>
          <Text style={styles.idLabel}>{t.result.identification}</Text>
          <Text style={styles.idText}>{result.likelyIdentification}</Text>
        </View>
      )}

      {result.summary ? (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>{result.summary}</Text>
        </View>
      ) : null}

      <Section title={t.result.doNow} items={result.doNow} color="#166534" />
      <Section title={t.result.avoid} items={result.avoid} color="#991b1b" />
      <Section title={t.result.needMore} items={result.needMore} color="#1e40af" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  pill: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pillText: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '600',
  },
  idBox: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6b7280',
  },
  idLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  idText: {
    fontSize: 15,
    color: '#1f2937',
  },
  summaryBox: {
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  summaryText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    paddingLeft: 4,
    marginBottom: 6,
  },
  bullet: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
    marginTop: 1,
  },
  itemText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
});
