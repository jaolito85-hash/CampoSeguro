import React, { useRef, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

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
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  // Fix the HTML once — never changes
  const html = useMemo(() => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%;overflow:hidden}</style>
</head><body>
<div id="map"></div>
<script>
var map = L.map('map',{zoomControl:false}).setView([-23.55,-46.63],13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'OSM',maxZoom:19
}).addTo(map);

var userMarker=null, accuracyCircle=null, trailLine=null, wpMarkers=[], centered=false;

function updatePosition(lat,lng,acc,hdg){
  if(!lat||!lng) return;
  var ll=[lat,lng];
  if(userMarker){userMarker.setLatLng(ll)}
  else{userMarker=L.circleMarker(ll,{radius:8,color:'#fff',fillColor:'#3b82f6',fillOpacity:1,weight:3}).addTo(map)}
  if(accuracyCircle){accuracyCircle.setLatLng(ll);if(acc>0)accuracyCircle.setRadius(acc)}
  else if(acc>0){accuracyCircle=L.circle(ll,{radius:acc,color:'#3b82f6',fillColor:'#3b82f6',fillOpacity:0.08,weight:1}).addTo(map)}
  if(!centered){map.setView(ll,15);centered=true}
}

function updateTrail(coords){
  if(trailLine)map.removeLayer(trailLine);
  if(coords&&coords.length>1){
    trailLine=L.polyline(coords.map(function(c){return[c.lat,c.lng]}),{color:'#3b82f6',weight:3,opacity:0.7}).addTo(map);
  }
}

function updateMarkers(mks){
  wpMarkers.forEach(function(m){map.removeLayer(m)});wpMarkers=[];
  if(!mks)return;
  mks.forEach(function(mk){
    var m=L.circleMarker([mk.lat,mk.lng],{radius:10,color:'#fff',fillColor:mk.color,fillOpacity:1,weight:2}).addTo(map);
    m.bindPopup(mk.title);wpMarkers.push(m);
  });
}

window.ReactNativeWebView.postMessage('ready');
</script>
</body></html>`, []);

  const onMessage = () => setReady(true);

  // Update position
  useEffect(() => {
    if (!ready || !webRef.current || !latitude) return;
    webRef.current.injectJavaScript(`updatePosition(${latitude},${longitude},${accuracy},${heading});true;`);
  }, [ready, latitude, longitude, accuracy, heading]);

  // Update trail
  useEffect(() => {
    if (!ready || !webRef.current) return;
    webRef.current.injectJavaScript(`updateTrail(${JSON.stringify(trail)});true;`);
  }, [ready, trail.length]);

  // Update markers
  useEffect(() => {
    if (!ready || !webRef.current) return;
    webRef.current.injectJavaScript(`updateMarkers(${JSON.stringify(markers)});true;`);
  }, [ready, JSON.stringify(markers)]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webRef}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        onMessage={onMessage}
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  webview: { flex: 1 },
});
