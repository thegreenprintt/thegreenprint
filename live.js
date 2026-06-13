import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from 'expo-router';
import { colors } from '../../src/theme';

const STREAM_URL = 'https://thegreenprint.trade/stream.html';

// Runs after page load:
// 1. Hides the name gate so app users skip it
// 2. Retries every 300ms until loadPeerJS() is available, then calls it
// 3. Fixes camera PIP position for mobile
const INJECT = `
  (function() {
    function tryConnect() {
      var gate = document.getElementById('gate');
      if (gate) gate.style.display = 'none';

      if (typeof loadPeerJS === 'function') {
        loadPeerJS();
      } else {
        setTimeout(tryConnect, 300);
        return;
      }

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
    }

    // Run immediately + after DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryConnect);
    } else {
      tryConnect();
    }
  })();
  true;
`;

export default function Live() {
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(true);

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

      {focused && (
        <WebView
          source={{ uri: `${STREAM_URL}?app=1&t=${Date.now()}` }}
          style={{ flex: 1, backgroundColor: '#000' }}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          allowsFullscreenVideo={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          originWhitelist={['*']}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
          injectedJavaScript={INJECT}
          onMessage={() => {}}
        />
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
  loadingTxt: { fontSize: 14, color: colors.textMuted },
});
