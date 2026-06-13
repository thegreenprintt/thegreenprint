import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, StatusBar, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from 'expo-router';
import { subscribeLiveStatus } from '../../src/liveStatus';
import { STREAM_URL } from '../../src/config';
import { colors } from '../../src/theme';

const INJECT = `
  (function() {
    var gate = document.getElementById('gate');
    if (gate) gate.style.display = 'none';
    if (typeof loadPeerJS === 'function') loadPeerJS();
    var style = document.createElement('style');
    style.textContent = \`
      #cam-pip {
        position: fixed !important;
        bottom: 90px !important;
        right: 12px !important;
        width: 28vw !important;
        min-width: 80px !important;
        max-width: 140px !important;
        z-index: 9999 !important;
      }
      #chat-overlay { display: none !important; }
      .ctrl-bar { bottom: 0 !important; }
    \`;
    document.head.appendChild(style);
  })();
  true;
`;

export default function Live() {
  const [isLive,  setIsLive]  = useState(false);
  const [title,   setTitle]   = useState('');
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(true);

  // Stop stream when leaving tab, resume when returning
  useFocusEffect(
    React.useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  // Poll live status every 10s via REST API (no auth required)
  useEffect(() => {
    const unsub = subscribeLiveStatus(({ isLive, title }) => {
      setIsLive(isLive);
      setTitle(title);
    });
    return unsub;
  }, []);

  if (!isLive) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={s.center}>
          <Text style={s.orbIcon}>◉</Text>
          <Text style={s.offTitle}>Not Live Yet</Text>
          <Text style={s.offSub}>
            The Greenprint isn't streaming right now.{'\n'}
            You'll get a notification when we go live.
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" hidden />
      {loading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={s.loadingTxt}>Connecting to stream…</Text>
        </View>
      )}
      {focused ? (
        <WebView
          source={{ uri: `${STREAM_URL}?app=1` }}
          style={{ flex: 1, backgroundColor: '#000' }}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          injectedJavaScript={INJECT}
          onMessage={() => {}}
        />
      ) : (
        <View style={s.pausedOverlay}>
          <Text style={s.pausedTxt}>Stream paused</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  orbIcon:  { fontSize: 32, color: colors.accent, opacity: 0.5, marginBottom: 20 },
  offTitle: { fontSize: 24, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  offSub:   { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 24 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center', zIndex: 10, gap: 16,
  },
  loadingTxt:    { fontSize: 14, color: colors.textMuted },
  pausedOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  pausedTxt:     { fontSize: 14, color: '#333' },
});
