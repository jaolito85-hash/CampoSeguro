import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useI18n } from '../../src/i18n';
import { searchProtocols } from '../../src/data/database';
import type { Protocol, RiskLevel } from '../../src/types';

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

const RISK_TEXT: Record<RiskLevel, string> = {
  low: '#166534',
  moderate: '#854d0e',
  high: '#991b1b',
  emergency: '#ffffff',
};

function ProtocolCard({ protocol, t }: { protocol: Protocol; t: ReturnType<typeof useI18n>['t'] }) {
  const [expanded, setExpanded] = useState(false);
  const risk = protocol.riskLevel;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: RISK_COLORS[risk] }]}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{protocol.title}</Text>
          <View style={[styles.riskBadge, { backgroundColor: RISK_BG[risk] }]}>
            <Text style={[styles.riskText, { color: RISK_TEXT[risk] }]}>
              {t.risk[risk]}
            </Text>
          </View>
        </View>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </View>

      {expanded && (
        <View style={styles.cardBody}>
          {protocol.doNow.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: '#166534' }]}>{t.result.doNow}</Text>
              {protocol.doNow.map((item, i) => (
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          )}
          {protocol.avoid.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: '#991b1b' }]}>{t.result.avoid}</Text>
              {protocol.avoid.map((item, i) => (
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ProtocolsScreen() {
  const { t, language } = useI18n();
  const [query, setQuery] = useState('');
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const data = await searchProtocols(q, language);
      setProtocols(data);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    load(query);
  }, [load, query]);

  return (
    <View style={styles.screen}>
      <TextInput
        style={styles.search}
        placeholder={t.protocols.search}
        placeholderTextColor="#9ca3af"
        value={query}
        onChangeText={setQuery}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#166534" />
      ) : protocols.length === 0 ? (
        <Text style={styles.empty}>{t.protocols.empty}</Text>
      ) : (
        <FlatList
          data={protocols}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ProtocolCard protocol={item} t={t} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  search: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1f2937',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  empty: {
    textAlign: 'center',
    marginTop: 60,
    color: '#9ca3af',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderLeftWidth: 4,
    marginBottom: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  riskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  riskText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chevron: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
  cardBody: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 2,
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
