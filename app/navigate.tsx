import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { MapWebView } from '../src/components/MapWebView';
import {
  getActiveTrip,
  getWaypoints,
  addWaypoint,
  deleteWaypoint,
  addBreadcrumb,
  getBreadcrumbs,
  distanceBetween,
  bearingTo,
  formatDistance,
  formatBearing,
  type Trip,
  type Waypoint,
  type Breadcrumb,
} from '../src/data/trips';

const WP_COLORS: Record<string, string> = {
  start: '#22c55e', camp: '#f59e0b', water: '#3b82f6',
  danger: '#ef4444', exit: '#8b5cf6', custom: '#6b7280',
};
const WP_ICONS: Record<string, string> = {
  start: '📍', camp: '⛺', water: '💧', danger: '⚠️', exit: '🚪', custom: '📌',
};
const WP_TYPES: { type: Waypoint['type']; label: string; icon: string }[] = [
  { type: 'start', label: 'Inicio', icon: '📍' },
  { type: 'camp', label: 'Acampamento', icon: '⛺' },
  { type: 'water', label: 'Agua', icon: '💧' },
  { type: 'danger', label: 'Perigo', icon: '⚠️' },
  { type: 'exit', label: 'Saida', icon: '🚪' },
  { type: 'custom', label: 'Outro', icon: '📌' },
];

export default function NavigateScreen() {
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [lat, setLat] = useState(0);
  const [lon, setLon] = useState(0);
  const [alt, setAlt] = useState<number | null>(null);
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [showAddWp, setShowAddWp] = useState(false);
  const [wpName, setWpName] = useState('');
  const [wpType, setWpType] = useState<Waypoint['type']>('custom');
  const [wpNotes, setWpNotes] = useState('');
  const [showEmergency, setShowEmergency] = useState(false);
  const [tab, setTab] = useState<'map' | 'list'>('map');
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const headingSub = useRef<Location.LocationSubscription | null>(null);
  const trackingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadTrip = useCallback(async () => {
    const t = await getActiveTrip();
    setTrip(t);
    if (t) {
      setWaypoints(await getWaypoints(t.id));
      setBreadcrumbs(await getBreadcrumbs(t.id));
    }
  }, []);

  useEffect(() => {
    loadTrip();
    return () => {
      locationSub.current?.remove();
      headingSub.current?.remove();
      if (trackingInterval.current) clearInterval(trackingInterval.current);
    };
  }, [loadTrip]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 },
        (loc) => {
          setLat(loc.coords.latitude);
          setLon(loc.coords.longitude);
          setAlt(loc.coords.altitude);
          setSpeed(loc.coords.speed || 0);
          setAccuracy(loc.coords.accuracy || 0);
        },
      );
      headingSub.current = await Location.watchHeadingAsync((h) => {
        setHeading(h.trueHeading || h.magHeading || 0);
      });
    })();
  }, []);

  const startTracking = useCallback(() => {
    if (!trip) return;
    setTracking(true);
    trackingInterval.current = setInterval(async () => {
      if (lat && lon) {
        await addBreadcrumb(trip.id, lat, lon, alt);
        setBreadcrumbs(await getBreadcrumbs(trip.id));
      }
    }, 15000);
  }, [trip, lat, lon, alt]);

  const stopTracking = useCallback(async () => {
    setTracking(false);
    if (trackingInterval.current) { clearInterval(trackingInterval.current); trackingInterval.current = null; }
    if (trip) setBreadcrumbs(await getBreadcrumbs(trip.id));
  }, [trip]);

  const handleAddWaypoint = useCallback(async () => {
    if (!trip || !lat) return;
    if (!wpName.trim()) { Alert.alert('Erro', 'Nome do ponto.'); return; }
    await addWaypoint({ tripId: trip.id, name: wpName.trim(), type: wpType, latitude: lat, longitude: lon, notes: wpNotes.trim() });
    setWaypoints(await getWaypoints(trip.id));
    setShowAddWp(false);
    setWpName(''); setWpNotes(''); setWpType('custom');
  }, [trip, lat, lon, wpName, wpType, wpNotes]);

  const handleDeleteWp = useCallback(async (wp: Waypoint) => {
    Alert.alert('Remover', `Apagar "${wp.name}"?`, [
      { text: 'Nao', style: 'cancel' },
      { text: 'Sim', style: 'destructive', onPress: async () => {
        await deleteWaypoint(wp.id);
        if (trip) setWaypoints(await getWaypoints(trip.id));
      }},
    ]);
  }, [trip]);

  const mapMarkers = [
    { lat: trip?.latitude || 0, lng: trip?.longitude || 0, title: trip?.name || 'Destino', color: '#166534' },
    ...waypoints.map((wp) => ({ lat: wp.latitude, lng: wp.longitude, title: `${WP_ICONS[wp.type]} ${wp.name}`, color: WP_COLORS[wp.type] })),
  ];
  const mapTrail = breadcrumbs.map((b) => ({ lat: b.latitude, lng: b.longitude }));

  const totalDistance = breadcrumbs.reduce((acc, bc, i) => {
    if (i === 0) return 0;
    return acc + distanceBetween(breadcrumbs[i - 1].latitude, breadcrumbs[i - 1].longitude, bc.latitude, bc.longitude);
  }, 0);

  if (!trip) {
    return (
      <View style={s.center}>
        <Text style={s.emptyIcon}>🧭</Text>
        <Text style={s.emptyTitle}>Nenhuma viagem ativa</Text>
        <Text style={s.emptyText}>Va em Viagens e ative uma viagem para navegar.</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const trailCoords = breadcrumbs.map((b) => ({ latitude: b.latitude, longitude: b.longitude }));

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.headerBack}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{trip.name}</Text>
        <TouchableOpacity onPress={() => setShowEmergency(true)}>
          <Text style={s.headerSos}>🆘</Text>
        </TouchableOpacity>
      </View>

      {/* Tab selector */}
      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, tab === 'map' && s.tabActive]} onPress={() => setTab('map')}>
          <Text style={[s.tabText, tab === 'map' && s.tabTextActive]}>🗺️ Mapa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === 'list' && s.tabActive]} onPress={() => setTab('list')}>
          <Text style={[s.tabText, tab === 'list' && s.tabTextActive]}>📋 Detalhes</Text>
        </TouchableOpacity>
      </View>

      {tab === 'map' ? (
        <View style={s.mapContainer}>
          <MapWebView
            latitude={lat || trip.latitude}
            longitude={lon || trip.longitude}
            markers={mapMarkers}
            trail={mapTrail}
            accuracy={accuracy}
            heading={heading}
            style={s.map}
          />

          {/* Map overlay: GPS info */}
          <View style={s.mapOverlay}>
            <Text style={s.overlayHeading}>
              {formatBearing(heading)} {speed > 0 ? `· ${(speed * 3.6).toFixed(1)} km/h` : ''}
            </Text>
            <Text style={s.overlayDist}>
              Destino: {formatDistance(distanceBetween(lat, lon, trip.latitude, trip.longitude))}
            </Text>
            {alt !== null && <Text style={s.overlayAlt}>Alt: {Math.round(alt)}m · ±{Math.round(accuracy)}m</Text>}
          </View>

          {/* Map buttons */}
          <View style={s.mapButtons}>
            <TouchableOpacity style={s.mapBtn} onPress={() => setShowAddWp(true)}>
              <Text style={s.mapBtnText}>➕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.mapBtn, tracking ? s.mapBtnDanger : s.mapBtnGreen]}
              onPress={tracking ? stopTracking : startTracking}
            >
              <Text style={s.mapBtnText}>{tracking ? '⏹' : '▶'}</Text>
            </TouchableOpacity>
          </View>

          {/* Track stats */}
          {breadcrumbs.length > 0 && (
            <View style={s.trackStats}>
              <Text style={s.trackStatsText}>
                {tracking ? '🔴 Gravando · ' : ''}{breadcrumbs.length} pts · {formatDistance(totalDistance)}
              </Text>
            </View>
          )}
        </View>
      ) : (
        /* List tab */
        <ScrollView style={s.listContainer} contentContainerStyle={s.listContent}>
          {/* Distance to destination */}
          <View style={s.distBox}>
            <Text style={s.distLabel}>Distancia ao destino</Text>
            <Text style={s.distValue}>{formatDistance(distanceBetween(lat, lon, trip.latitude, trip.longitude))}</Text>
            <Text style={s.distBearing}>{formatBearing(bearingTo(lat, lon, trip.latitude, trip.longitude))}</Text>
          </View>

          {/* GPS info */}
          <View style={s.gpsBox}>
            <View style={s.gpsRow}>
              <Text style={[s.compass, { transform: [{ rotate: `${-heading}deg` }] }]}>🧭</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.gpsHeading}>{formatBearing(heading)}</Text>
                <Text style={s.gpsCoords}>{lat.toFixed(6)}, {lon.toFixed(6)}</Text>
              </View>
              <View>
                {alt !== null && <Text style={s.gpsMeta}>Alt: {Math.round(alt)}m</Text>}
                <Text style={s.gpsMeta}>±{Math.round(accuracy)}m</Text>
                {speed > 0 && <Text style={s.gpsSpeed}>{(speed * 3.6).toFixed(1)} km/h</Text>}
              </View>
            </View>
          </View>

          {/* Waypoints */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Pontos de referencia</Text>
              <TouchableOpacity onPress={() => setShowAddWp(true)}>
                <Text style={s.addBtn}>+ Adicionar</Text>
              </TouchableOpacity>
            </View>
            {waypoints.length === 0 ? (
              <Text style={s.emptyList}>Nenhum ponto. Toque + no mapa ou aqui para adicionar.</Text>
            ) : (
              waypoints.map((wp) => {
                const dist = distanceBetween(lat, lon, wp.latitude, wp.longitude);
                const bear = bearingTo(lat, lon, wp.latitude, wp.longitude);
                return (
                  <TouchableOpacity key={wp.id} style={s.wpItem} onLongPress={() => handleDeleteWp(wp)}>
                    <Text style={s.wpIcon}>{WP_ICONS[wp.type]}</Text>
                    <View style={s.wpBody}>
                      <Text style={s.wpName}>{wp.name}</Text>
                      {wp.notes ? <Text style={s.wpNotes}>{wp.notes}</Text> : null}
                    </View>
                    <View style={s.wpDist}>
                      <Text style={s.wpDistText}>{formatDistance(dist)}</Text>
                      <Text style={s.wpBearing}>{formatBearing(bear)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Trail stats */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Rastro</Text>
            <View style={s.trailInfo}>
              <Text style={s.trailStat}>{breadcrumbs.length} pontos gravados</Text>
              <Text style={s.trailStat}>Distancia: {formatDistance(totalDistance)}</Text>
            </View>
            <TouchableOpacity
              style={[s.trailBtn, tracking ? s.trailBtnStop : s.trailBtnStart]}
              onPress={tracking ? stopTracking : startTracking}
            >
              <Text style={s.trailBtnText}>{tracking ? '⏹ Parar gravacao' : '▶ Gravar rastro'}</Text>
            </TouchableOpacity>
          </View>

          {/* Emergency notes */}
          {trip.emergencyNotes ? (
            <View style={s.notesBox}>
              <Text style={s.notesTitle}>📝 Notas de emergencia</Text>
              <Text style={s.notesText}>{trip.emergencyNotes}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* Add waypoint modal */}
      <Modal visible={showAddWp} animationType="slide" transparent onRequestClose={() => setShowAddWp(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Marcar ponto aqui</Text>
            <Text style={s.modalCoords}>{lat.toFixed(6)}, {lon.toFixed(6)}</Text>
            <Text style={s.label}>Nome</Text>
            <TextInput style={s.input} value={wpName} onChangeText={setWpName} placeholder="Ex: Cachoeira grande" placeholderTextColor="#9ca3af" />
            <Text style={s.label}>Tipo</Text>
            <View style={s.typeRow}>
              {WP_TYPES.map((wt) => (
                <TouchableOpacity key={wt.type} style={[s.typeBtn, wpType === wt.type && s.typeBtnActive]} onPress={() => setWpType(wt.type)}>
                  <Text style={s.typeIcon}>{wt.icon}</Text>
                  <Text style={[s.typeLabel, wpType === wt.type && s.typeLabelActive]}>{wt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.label}>Notas</Text>
            <TextInput style={[s.input, { minHeight: 50 }]} value={wpNotes} onChangeText={setWpNotes} placeholder="Observacoes..." placeholderTextColor="#9ca3af" multiline textAlignVertical="top" />
            <TouchableOpacity style={s.saveWpBtn} onPress={handleAddWaypoint}>
              <Text style={s.saveWpText}>Salvar ponto</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAddWp(false)} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: '#6b7280', fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Emergency modal */}
      <Modal visible={showEmergency} animationType="slide" onRequestClose={() => setShowEmergency(false)}>
        <View style={s.emergScreen}>
          <View style={s.emergHeader}>
            <Text style={s.emergTitle}>🆘 Emergencia</Text>
            <TouchableOpacity onPress={() => setShowEmergency(false)}>
              <Text style={s.emergClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.emergContent}>
            <View style={s.emergBox}>
              <Text style={s.emergLabel}>Sua localizacao:</Text>
              <Text style={s.emergCoords}>{lat.toFixed(6)}, {lon.toFixed(6)}</Text>
              {alt !== null && <Text style={s.emergAlt}>Altitude: {Math.round(alt)}m</Text>}
              <Text style={s.emergHint}>Passe essas coordenadas por radio ou telefone para o resgate.</Text>
            </View>
            <View style={s.emergBox}>
              <Text style={s.emergLabel}>Numeros de emergencia:</Text>
              <Text style={s.emergNum}>🇧🇷 SAMU: 192</Text>
              <Text style={s.emergNum}>🇧🇷 Bombeiros: 193</Text>
              <Text style={s.emergNum}>🇧🇷 Policia: 190</Text>
              <Text style={s.emergNum}>🌎 Internacional: 112</Text>
            </View>
            {trip.emergencyNotes ? (
              <View style={s.emergBox}>
                <Text style={s.emergLabel}>Notas salvas:</Text>
                <Text style={s.emergNotes}>{trip.emergencyNotes}</Text>
              </View>
            ) : null}
            <View style={s.emergBox}>
              <Text style={s.emergLabel}>Distancia ao ponto de partida:</Text>
              <Text style={s.emergDistValue}>{formatDistance(distanceBetween(lat, lon, trip.latitude, trip.longitude))}</Text>
              <Text style={s.emergDistDir}>Direcao: {formatBearing(bearingTo(lat, lon, trip.latitude, trip.longitude))}</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#f9fafb' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  backBtn: { marginTop: 20, backgroundColor: '#166534', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  backBtnText: { color: '#fff', fontWeight: '700' },

  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a3a1a', paddingHorizontal: 16, paddingVertical: 12, paddingTop: 50 },
  headerBack: { color: '#4ade80', fontWeight: '600', fontSize: 14, marginRight: 12 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSos: { fontSize: 24 },

  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#166534' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#166534' },

  // Map tab
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  mapOverlay: {
    position: 'absolute', top: 10, left: 10, right: 10,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  overlayHeading: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  overlayDist: { fontSize: 13, color: '#166534', fontWeight: '600', marginTop: 2 },
  overlayAlt: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  mapButtons: {
    position: 'absolute', bottom: 20, right: 10, gap: 8,
  },
  mapBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  mapBtnGreen: { backgroundColor: '#166534' },
  mapBtnDanger: { backgroundColor: '#dc2626' },
  mapBtnText: { fontSize: 20 },
  trackStats: {
    position: 'absolute', bottom: 20, left: 10,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  trackStatsText: { fontSize: 12, fontWeight: '600', color: '#374151' },

  // List tab
  listContainer: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  distBox: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#166534' },
  distLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  distValue: { fontSize: 28, fontWeight: '700', color: '#166534', marginTop: 4 },
  distBearing: { fontSize: 14, color: '#374151', marginTop: 2 },
  gpsBox: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  compass: { fontSize: 36 },
  gpsHeading: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  gpsCoords: { fontSize: 11, color: '#6b7280', fontFamily: 'monospace', marginTop: 2 },
  gpsMeta: { fontSize: 11, color: '#9ca3af', textAlign: 'right' },
  gpsSpeed: { fontSize: 13, fontWeight: '600', color: '#166534', textAlign: 'right' },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },
  addBtn: { color: '#166534', fontWeight: '700', fontSize: 13 },
  emptyList: { color: '#9ca3af', fontSize: 13, fontStyle: 'italic' },
  wpItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 1, elevation: 1 },
  wpIcon: { fontSize: 22, marginRight: 10 },
  wpBody: { flex: 1 },
  wpName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  wpNotes: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  wpDist: { alignItems: 'flex-end', marginLeft: 8 },
  wpDistText: { fontSize: 15, fontWeight: '700', color: '#166534' },
  wpBearing: { fontSize: 11, color: '#6b7280' },
  trailInfo: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  trailStat: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  trailBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  trailBtnStart: { backgroundColor: '#166534' },
  trailBtnStop: { backgroundColor: '#dc2626' },
  trailBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  notesBox: { backgroundColor: '#fffbeb', borderRadius: 10, padding: 14, borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
  notesTitle: { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 6 },
  notesText: { fontSize: 14, color: '#374151', lineHeight: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  modalCoords: { fontSize: 12, color: '#9ca3af', fontFamily: 'monospace', marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, padding: 10, fontSize: 14, color: '#1f2937' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb' },
  typeBtnActive: { backgroundColor: '#166534', borderColor: '#166534' },
  typeIcon: { fontSize: 14, marginRight: 4 },
  typeLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  typeLabelActive: { color: '#fff' },
  saveWpBtn: { backgroundColor: '#166534', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  saveWpText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Emergency
  emergScreen: { flex: 1, backgroundColor: '#450a0a' },
  emergHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 52 },
  emergTitle: { flex: 1, color: '#fff', fontSize: 22, fontWeight: '700' },
  emergClose: { color: '#fff', fontSize: 22, fontWeight: '700', padding: 4 },
  emergContent: { padding: 16 },
  emergBox: { backgroundColor: '#7f1d1d', borderRadius: 12, padding: 16, marginBottom: 16 },
  emergLabel: { color: '#fca5a5', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  emergCoords: { color: '#fff', fontSize: 22, fontWeight: '700', fontFamily: 'monospace' },
  emergAlt: { color: '#fca5a5', fontSize: 14, marginTop: 4 },
  emergHint: { color: '#fca5a5', fontSize: 12, marginTop: 8, lineHeight: 16 },
  emergNum: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 6 },
  emergNotes: { color: '#fff', fontSize: 15, lineHeight: 22 },
  emergDistValue: { color: '#fff', fontSize: 28, fontWeight: '700' },
  emergDistDir: { color: '#fca5a5', fontSize: 14, marginTop: 4 },
});
