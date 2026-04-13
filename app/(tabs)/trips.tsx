import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { MapWebView } from '../../src/components/MapWebView';
import {
  createTrip,
  getTrips,
  deleteTrip,
  activateTrip,
  type Trip,
} from '../../src/data/trips';

const WAYPOINT_ICONS: Record<string, string> = {
  start: '📍', camp: '⛺', water: '💧', danger: '⚠️', exit: '🚪', custom: '📌',
};

export default function TripsScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTrips(await getTrips());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Digite o nome do local.');
      return;
    }

    setCreating(true);
    try {
      // Get current location as default
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 0, lon = 0;
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
      }

      await createTrip({
        name: name.trim(),
        description: description.trim(),
        latitude: lat,
        longitude: lon,
        mapImageUri: null,
        emergencyNotes: emergencyNotes.trim(),
      });

      setName('');
      setDescription('');
      setEmergencyNotes('');
      setShowForm(false);
      await load();
    } catch (err) {
      Alert.alert('Erro', String(err));
    } finally {
      setCreating(false);
    }
  }, [name, description, emergencyNotes, load]);

  const handleDelete = useCallback((trip: Trip) => {
    Alert.alert('Excluir viagem', `Apagar "${trip.name}" e todos os dados?`, [
      { text: 'Nao', style: 'cancel' },
      { text: 'Sim', style: 'destructive', onPress: async () => { await deleteTrip(trip.id); load(); } },
    ]);
  }, [load]);

  const handleActivate = useCallback(async (trip: Trip) => {
    await activateTrip(trip.id);
    load();
    router.push('/navigate');
  }, [load, router]);

  if (showForm) {
    return (
      <View style={styles.screen}>
        <View style={styles.form}>
          <Text style={styles.formTitle}>Nova Viagem</Text>

          <Text style={styles.label}>Nome do local</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Trilha Pedra do Bau, SP"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Descricao</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Tipo de terreno, duracao estimada, dificuldade..."
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.label}>Notas de emergencia</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Hospital mais proximo, contato do guia, numeros de resgate..."
            placeholderTextColor="#9ca3af"
            value={emergencyNotes}
            onChangeText={setEmergencyNotes}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.createBtn, creating && { opacity: 0.7 }]}
            onPress={handleCreate}
            disabled={creating}
            activeOpacity={0.8}
          >
            {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Salvar viagem</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)} activeOpacity={0.8}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#166534" />
      ) : trips.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyTitle}>Nenhuma viagem salva</Text>
          <Text style={styles.emptyText}>
            Prepare sua viagem com internet. No campo, tudo funciona offline: GPS, bussola, pontos de referencia.
          </Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, item.active && styles.cardActive]}>
              {item.latitude !== 0 && (
                <MapWebView
                  latitude={item.latitude}
                  longitude={item.longitude}
                  markers={[{ lat: item.latitude, lng: item.longitude, title: item.name, color: '#166534' }]}
                  style={styles.cardMap}
                />
              )}
              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  {item.active && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>ATIVA</Text>
                    </View>
                  )}
                </View>
                {item.description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
                <Text style={styles.cardCoords}>
                  {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                </Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.goBtn} onPress={() => handleActivate(item)} activeOpacity={0.8}>
                    <Text style={styles.goBtnText}>🧭 Navegar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)} activeOpacity={0.8}>
                    <Text style={styles.deleteBtnText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.8}>
        <Text style={styles.fabText}>+ Nova viagem</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 16, paddingBottom: 100 },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  cardActive: { borderWidth: 2, borderColor: '#166534' },
  cardMap: { width: '100%', height: 140 },
  cardBody: { padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1f2937', flex: 1 },
  activeBadge: { backgroundColor: '#166534', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  cardDesc: { fontSize: 13, color: '#6b7280', marginBottom: 4, lineHeight: 18 },
  cardCoords: { fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', marginBottom: 10 },
  cardActions: { flexDirection: 'row', gap: 8 },
  goBtn: { flex: 1, backgroundColor: '#166534', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  deleteBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  deleteBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 13 },
  fab: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    backgroundColor: '#166534', borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  form: { padding: 16 },
  formTitle: { fontSize: 20, fontWeight: '700', color: '#1f2937', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 15, color: '#1f2937' },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  createBtn: { backgroundColor: '#166534', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  cancelBtnText: { color: '#6b7280', fontSize: 15, fontWeight: '600' },
});
