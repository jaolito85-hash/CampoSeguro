import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useI18n } from '../../src/i18n';
import { getApiKey, setApiKey, hasApiKey } from '../../src/api/config';
import { setLanguage } from '../../src/i18n';
import type { Language } from '../../src/types';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'pt', label: 'Portugues' },
  { code: 'es', label: 'Espanol' },
  { code: 'en', label: 'English' },
];

export default function SettingsScreen() {
  const { t, language } = useI18n();
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const existing = await getApiKey();
      if (existing) {
        setKey(existing);
        setHasKey(true);
      }
    })();
  }, []);

  const handleSaveKey = useCallback(async () => {
    if (!key.trim()) {
      Alert.alert('Erro', 'Cole sua API key do Google AI Studio.');
      return;
    }
    await setApiKey(key.trim());
    setHasKey(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [key]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Language selector */}
      <Text style={styles.sectionTitle}>Idioma / Language</Text>
      <View style={styles.langRow}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.langBtn, language === lang.code && styles.langBtnActive]}
            onPress={() => setLanguage(lang.code)}
            activeOpacity={0.8}
          >
            <Text style={[styles.langText, language === lang.code && styles.langTextActive]}>
              {lang.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* API Key */}
      <Text style={styles.sectionTitle}>Google Gemini API</Text>
      <View style={[styles.statusBadge, hasKey ? styles.statusOk : styles.statusMissing]}>
        <Text style={styles.statusText}>
          {hasKey ? '✓ API key configurada — identificacao por IA ativa' : '✗ Sem API key — modo offline apenas'}
        </Text>
      </View>

      <Text style={styles.hint}>
        Crie sua chave gratuita em aistudio.google.com/apikey e cole abaixo.
        Com a chave, o app identifica plantas, cobras, insetos e cogumelos por foto usando IA.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="AIza..."
        placeholderTextColor="#9ca3af"
        value={key}
        onChangeText={(v) => { setKey(v); setSaved(false); }}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={false}
      />

      <TouchableOpacity
        style={[styles.saveBtn, saved && styles.saveBtnDone]}
        onPress={handleSaveKey}
        activeOpacity={0.8}
      >
        <Text style={styles.saveBtnText}>{saved ? '✓ Salvo!' : 'Salvar chave'}</Text>
      </TouchableOpacity>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Como funciona:</Text>
        <Text style={styles.infoText}>• Com internet + API key → IA identifica por foto (Gemini)</Text>
        <Text style={styles.infoText}>• Sem internet → protocolos de seguranca offline</Text>
        <Text style={styles.infoText}>• Emergencias (mordida de cobra, falta de ar) → protocolo imediato, sem esperar IA</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 20,
  },
  langRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  langBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  langBtnActive: {
    backgroundColor: '#166534',
    borderColor: '#166534',
  },
  langText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  langTextActive: {
    color: '#ffffff',
  },
  statusBadge: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusOk: {
    backgroundColor: '#dcfce7',
  },
  statusMissing: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  hint: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: '#166534',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveBtnDone: {
    backgroundColor: '#4ade80',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  infoBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#166534',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
});
