import React, { useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from 'expo-router';
import { colors } from '../../src/theme';

// Injected into stream.html:
// - Skips the viewer name gate (app users don't need to enter name)
// - Fixes PIP camera position for mobile viewport
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

const STREAM_URL = 'https://thegreenprint.trade/stream.html';

export default function Live() {
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(true);

  // Pause WebView when leaving tab to save resources
  useFocusEffect(
    React.useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

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
        <View style={s.pausedOverlay} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    gap: 16,
  },
  loadingTxt:    { fontSize: 14, color: colors.textMuted },
  pausedOverlay: { flex: 1, backgroundColor: '#000' },
});
