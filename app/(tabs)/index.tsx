import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useI18n } from '../../src/i18n';
import { CategoryPicker } from '../../src/components/CategoryPicker';
import { FlagChips } from '../../src/components/FlagChips';
import { ResultCard } from '../../src/components/ResultCard';
import { analyze } from '../../src/engine/analyzer';
import { saveHistory } from '../../src/data/database';
import { isOnline } from '../../src/api/gemini';
import { getActiveTrip, addWaypoint } from '../../src/data/trips';
import * as Location from 'expo-location';
import type { Category, Flag, AnalysisResult } from '../../src/types';

export default function AnalyzeScreen() {
  const { t, language } = useI18n();

  const [category, setCategory] = useState<Category>('general');
  const [question, setQuestion] = useState('');
  const [flags, setFlags] = useState<Flag[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [aiMode, setAiMode] = useState<'checking' | 'cloud' | 'offline'>('checking');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpText, setFollowUpText] = useState('');
  const [followUpImageUri, setFollowUpImageUri] = useState<string | null>(null);
  const [followUpBase64, setFollowUpBase64] = useState<string | null>(null);
  const [reAnalyzing, setReAnalyzing] = useState(false);

  useEffect(() => {
    isOnline().then((online) => setAiMode(online ? 'cloud' : 'offline'));
  }, []);

  const toggleFlag = useCallback((flag: Flag) => {
    setFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag],
    );
  }, []);

  const pickImage = useCallback(async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) return;

    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      aspect: [4, 3],
    };

    const res = fromCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);

    if (!res.canceled && res.assets[0]) {
      const asset = res.assets[0];
      setImageUri(asset.uri);
      setImageBase64(asset.base64 || null);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!question.trim() && !imageUri) {
      Alert.alert(t.common.error, 'Descreva o que encontrou ou adicione uma foto.');
      return;
    }

    setAnalyzing(true);
    setResult(null);
    setSaved(false);

    try {
      const { result: res, debug } = await analyze({
        language,
        category,
        question: question.trim(),
        flags,
        image: imageBase64 || undefined,
      });
      setResult(res);
      if (debug.error) {
        Alert.alert('Modo offline', debug.error + '\n\nUsando protocolos de seguranca offline.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert(t.common.error, msg);
    } finally {
      setAnalyzing(false);
    }
  }, [language, category, question, flags, imageBase64, imageUri, t]);

  const handleSave = useCallback(async () => {
    if (!result) return;

    // Get current location if available
    let lat: number | undefined;
    let lon: number | undefined;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
      }
    } catch { /* GPS not available */ }

    await saveHistory({
      timestamp: new Date().toISOString(),
      category,
      question,
      imageUri: imageUri || undefined,
      result,
      riskLevel: result.risk,
      latitude: lat,
      longitude: lon,
    });
    setSaved(true);

    // If high risk or emergency, offer to save as danger waypoint
    if ((result.risk === 'high' || result.risk === 'emergency') && lat && lon) {
      const trip = await getActiveTrip();
      if (trip) {
        Alert.alert(
          'Marcar perigo no mapa?',
          `Salvar este local como ponto de perigo na viagem "${trip.name}"?`,
          [
            { text: 'Nao', style: 'cancel' },
            { text: 'Sim', onPress: async () => {
              await addWaypoint({
                tripId: trip.id,
                name: `⚠️ ${result.likelyIdentification}`,
                type: 'danger',
                latitude: lat!,
                longitude: lon!,
                notes: result.summary,
              });
              Alert.alert('Salvo', 'Ponto de perigo marcado na viagem.');
            }},
          ],
        );
      }
    }
  }, [result, category, question, imageUri]);

  const handleFollowUpPhoto = useCallback(async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true, aspect: [4, 3],
    };
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled && res.assets[0]) {
      setFollowUpImageUri(res.assets[0].uri);
      setFollowUpBase64(res.assets[0].base64 || null);
    }
  }, []);

  const handleReAnalyze = useCallback(async () => {
    if (!followUpText.trim() && !followUpBase64) return;
    setReAnalyzing(true);
    try {
      const contextPrefix = result
        ? `Analise anterior: ${result.likelyIdentification}. ${result.summary}\nInformacao adicional do usuario: `
        : '';
      const { result: res } = await analyze({
        language,
        category,
        question: contextPrefix + followUpText.trim(),
        flags,
        image: followUpBase64 || imageBase64 || undefined,
      });
      setResult(res);
      setShowFollowUp(false);
      setFollowUpText('');
      setFollowUpImageUri(null);
      setFollowUpBase64(null);
      setSaved(false);
    } catch (err) {
      Alert.alert(t.common.error, err instanceof Error ? err.message : String(err));
    } finally {
      setReAnalyzing(false);
    }
  }, [followUpText, followUpBase64, result, language, category, flags, imageBase64, t]);

  const handleReset = useCallback(() => {
    setResult(null);
    setQuestion('');
    setImageUri(null);
    setImageBase64(null);
    setFlags([]);
    setCategory('general');
    setSaved(false);
    setShowFollowUp(false);
    setFollowUpText('');
    setFollowUpImageUri(null);
    setFollowUpBase64(null);
  }, []);

  if (result) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <ResultCard result={result} />

        {/* Follow-up section */}
        {!showFollowUp ? (
          <TouchableOpacity style={styles.followUpToggle} onPress={() => setShowFollowUp(true)} activeOpacity={0.8}>
            <Text style={styles.followUpToggleText}>+ Adicionar informacoes</Text>
            <Text style={styles.followUpHint}>Responda as perguntas acima para uma analise mais precisa</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.followUpBox}>
            <Text style={styles.followUpTitle}>Informacoes adicionais</Text>
            <TextInput
              style={styles.followUpInput}
              multiline
              numberOfLines={4}
              placeholder="Responda as perguntas: horario, local, sintomas, se viu o animal..."
              placeholderTextColor="#9ca3af"
              value={followUpText}
              onChangeText={setFollowUpText}
              textAlignVertical="top"
            />
            <View style={styles.followUpPhotoRow}>
              <TouchableOpacity style={styles.followUpPhotoBtn} onPress={() => handleFollowUpPhoto(true)} activeOpacity={0.8}>
                <Text style={styles.followUpPhotoBtnText}>📷 Foto do animal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.followUpPhotoBtn} onPress={() => handleFollowUpPhoto(false)} activeOpacity={0.8}>
                <Text style={styles.followUpPhotoBtnText}>🖼 Galeria</Text>
              </TouchableOpacity>
            </View>
            {followUpImageUri && (
              <View style={styles.followUpPreview}>
                <Image source={{ uri: followUpImageUri }} style={styles.followUpImg} resizeMode="cover" />
                <TouchableOpacity style={styles.removeImg} onPress={() => { setFollowUpImageUri(null); setFollowUpBase64(null); }}>
                  <Text style={styles.removeImgText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={[styles.analyzeBtn, reAnalyzing && styles.analyzeBtnDisabled]}
              onPress={handleReAnalyze}
              disabled={reAnalyzing}
              activeOpacity={0.8}
            >
              {reAnalyzing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.analyzeBtnText}>Re-analisar com mais dados</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btn, saved && styles.btnSaved]}
          onPress={saved ? undefined : handleSave}
          activeOpacity={saved ? 1 : 0.8}
        >
          <Text style={styles.btnText}>{saved ? t.result.saved : t.result.saveToHistory}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnOutline} onPress={handleReset} activeOpacity={0.8}>
          <Text style={styles.btnOutlineText}>{t.result.newAnalysis}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {/* AI status */}
      <View style={[styles.modelBadge, aiMode === 'cloud' ? styles.modelReady : styles.modelNotReady]}>
        <Text style={styles.modelText}>
          {aiMode === 'checking'
            ? t.model.loading
            : aiMode === 'cloud'
            ? '✓ Gemini IA ativa'
            : t.model.protocolsOnly}
        </Text>
      </View>

      {/* Category */}
      <Text style={styles.label}>{t.analyze.selectCategory}</Text>
      <CategoryPicker selected={category} onSelect={setCategory} />

      {/* Flags */}
      <FlagChips selected={flags} onToggle={toggleFlag} />

      {/* Photo */}
      <View style={styles.photoRow}>
        <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage(true)} activeOpacity={0.8}>
          <Text style={styles.photoBtnText}>📷 {t.analyze.takePhoto}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage(false)} activeOpacity={0.8}>
          <Text style={styles.photoBtnText}>🖼 {t.analyze.pickImage}</Text>
        </TouchableOpacity>
      </View>

      {imageUri && (
        <View style={styles.preview}>
          <Image source={{ uri: imageUri }} style={styles.previewImg} resizeMode="cover" />
          <TouchableOpacity style={styles.removeImg} onPress={() => { setImageUri(null); setImageBase64(null); }}>
            <Text style={styles.removeImgText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Question */}
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={4}
        placeholder={t.analyze.questionPlaceholder}
        placeholderTextColor="#9ca3af"
        value={question}
        onChangeText={setQuestion}
        textAlignVertical="top"
      />

      {/* Analyze button */}
      <TouchableOpacity
        style={[styles.analyzeBtn, analyzing && styles.analyzeBtnDisabled]}
        onPress={handleAnalyze}
        disabled={analyzing}
        activeOpacity={0.8}
      >
        {analyzing ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.analyzeBtnText}>{t.analyze.analyzeButton}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  modelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  modelReady: {
    backgroundColor: '#dcfce7',
  },
  modelNotReady: {
    backgroundColor: '#fef3c7',
  },
  modelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  photoBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  preview: {
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImg: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  removeImg: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImgText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1f2937',
    minHeight: 100,
    marginBottom: 16,
  },
  analyzeBtn: {
    backgroundColor: '#166534',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  analyzeBtnDisabled: {
    opacity: 0.7,
  },
  analyzeBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  btn: {
    backgroundColor: '#166534',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnSaved: {
    backgroundColor: '#4ade80',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnOutlineText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  followUpToggle: {
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  followUpToggleText: {
    color: '#1e40af',
    fontSize: 15,
    fontWeight: '700',
  },
  followUpHint: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  followUpBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
  },
  followUpTitle: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  followUpInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 80,
    marginBottom: 10,
  },
  followUpPhotoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  followUpPhotoBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  followUpPhotoBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  followUpPreview: {
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  followUpImg: {
    width: '100%',
    height: 150,
    borderRadius: 10,
  },
});
