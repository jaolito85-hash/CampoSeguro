import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useI18n } from '../../src/i18n';
import { getHistory, clearHistory } from '../../src/data/database';
import { ResultCard } from '../../src/components/ResultCard';
import type { HistoryEntry, RiskLevel } from '../../src/types';

const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#22c55e',
  moderate: '#eab308',
  high: '#ef4444',
  emergency: '#dc2626',
};

const CATEGORY_ICONS: Record<string, string> = {
  plant: '🌿',
  mushroom: '🍄',
  snake: '🐍',
  insect: '🐜',
  animal: '🐾',
  injury: '🩹',
  general: '🔍',
};

function HistoryItem({
  entry,
  onPress,
  t,
}: {
  entry: HistoryEntry;
  onPress: () => void;
  t: ReturnType<typeof useI18n>['t'];
}) {
  const date = new Date(entry.timestamp);
  const dateStr = date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
  const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.itemLeft}>
        <Text style={styles.itemIcon}>{CATEGORY_ICONS[entry.category] || '🔍'}</Text>
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemCategory}>{entry.category}</Text>
        {entry.question ? (
          <Text style={styles.itemQuestion} numberOfLines={2}>{entry.question}</Text>
        ) : null}
        <Text style={styles.itemDate}>{dateStr} {timeStr}</Text>
      </View>
      <View style={[styles.riskDot, { backgroundColor: RISK_COLORS[entry.riskLevel] }]} />
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const { t } = useI18n();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHistory();
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleClear = useCallback(() => {
    Alert.alert(t.historyScreen.clear, t.historyScreen.clearConfirm, [
      { text: t.historyScreen.no, style: 'cancel' },
      {
        text: t.historyScreen.yes,
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          setEntries([]);
        },
      },
    ]);
  }, [t]);

  return (
    <View style={styles.screen}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#166534" />
      ) : entries.length === 0 ? (
        <Text style={styles.empty}>{t.historyScreen.empty}</Text>
      ) : (
        <>
          <FlatList
            data={entries}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <HistoryItem entry={item} onPress={() => setSelected(item)} t={t} />
            )}
          />
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.8}>
            <Text style={styles.clearText}>{t.historyScreen.clear}</Text>
          </TouchableOpacity>
        </>
      )}

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.result.title}</Text>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <ResultCard result={selected.result} />
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  empty: {
    textAlign: 'center',
    marginTop: 60,
    color: '#9ca3af',
    fontSize: 15,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemLeft: {
    marginRight: 12,
  },
  itemIcon: {
    fontSize: 26,
  },
  itemBody: {
    flex: 1,
  },
  itemCategory: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  itemQuestion: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
    lineHeight: 18,
  },
  itemDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  riskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  clearBtn: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 14,
  },
  modal: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a3a1a',
    padding: 16,
    paddingTop: 52,
  },
  modalTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalContent: {
    padding: 16,
    paddingBottom: 40,
  },
});
