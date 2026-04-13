import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

interface MapMarker {
  lat: number;
  lng: number;
  title: string;
  color: string;
}

interface Props {
  latitude: number;
  longitude: number;
  markers?: MapMarker[];
  trail?: { lat: number; lng: number }[];
  accuracy?: number;
  heading?: number;
  style?: object;
}

export function MapWebView({ latitude, longitude, markers = [], trail = [], accuracy = 0, heading = 0, style }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);

  const html = useMemo(() => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%}</style>
</head><body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:true}).setView([-23.55,-46.63],13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'OSM',maxZoom:19}).addTo(map);
var userMarker=null,accuracyCircle=null,trailLine=null,wpMarkers=[],centered=false;
function updatePosition(lat,lng,acc){
  if(!lat||!lng)return;var ll=[lat,lng];
  if(userMarker){userMarker.setLatLng(ll)}
  else{userMarker=L.circleMarker(ll,{radius:8,color:'#fff',fillColor:'#3b82f6',fillOpacity:1,weight:3}).addTo(map)}
  if(accuracyCircle){accuracyCircle.setLatLng(ll);if(acc>0)accuracyCircle.setRadius(acc)}
  else if(acc>0){accuracyCircle=L.circle(ll,{radius:acc,color:'#3b82f6',fillColor:'#3b82f6',fillOpacity:0.08,weight:1}).addTo(map)}
  if(!centered){map.setView(ll,15);centered=true}
}
function updateTrail(coords){
  if(trailLine)map.removeLayer(trailLine);
  if(coords&&coords.length>1){trailLine=L.polyline(coords.map(function(c){return[c.lat,c.lng]}),{color:'#3b82f6',weight:3,opacity:0.7}).addTo(map)}
}
function updateMarkers(mks){
  wpMarkers.forEach(function(m){map.removeLayer(m)});wpMarkers=[];
  if(!mks)return;
  mks.forEach(function(mk){
    var m=L.circleMarker([mk.lat,mk.lng],{radius:10,color:'#fff',fillColor:mk.color,fillOpacity:1,weight:2}).addTo(map);
    m.bindPopup(mk.title);wpMarkers.push(m);
  });
}
window.parent.postMessage('mapReady','*');
</script>
</body></html>`, []);

  const inject = (code: string) => {
    try {
      iframeRef.current?.contentWindow?.eval(code);
    } catch { /* cross-origin fallback */ }
  };

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === 'mapReady') readyRef.current = true;
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (!readyRef.current || !latitude) return;
    inject(`updatePosition(${latitude},${longitude},${accuracy})`);
  }, [latitude, longitude, accuracy]);

  useEffect(() => {
    if (!readyRef.current) return;
    inject(`updateTrail(${JSON.stringify(trail)})`);
  }, [trail.length]);

  useEffect(() => {
    if (!readyRef.current) return;
    inject(`updateMarkers(${JSON.stringify(markers)})`);
  }, [JSON.stringify(markers)]);

  const blob = useMemo(() => {
    const b = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(b);
  }, [html]);

  return (
    <View style={[styles.container, style]}>
      <iframe
        ref={iframeRef}
        src={blob}
        style={{ width: '100%', height: '100%', border: 'none' }}
        sandbox="allow-scripts allow-same-origin"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
});
