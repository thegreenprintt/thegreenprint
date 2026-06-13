import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, SafeAreaView, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../src/firebase';
import { useAuth } from '../../src/hooks/useAuth';
import { registerForPushNotifications } from '../../src/hooks/useNotifications';
import { colors, fonts, radius, spacing, shadow } from '../../src/theme';

export default function Home() {
  const router = useRouter();
  const { user, profile, isAdmin } = useAuth();
  const [isLive,  setIsLive]  = useState(false);
  const [liveTitle, setLiveTitle] = useState('');
  const [announcements, setAnnouncements] = useState([]);

  // ─── Animated values ───────────────────────────────────────────
  const headerAnim   = useRef(new Animated.Value(0)).current;
  const liveAnim     = useRef(new Animated.Value(0)).current;
  const quickAnim    = useRef(new Animated.Value(0)).current;
  const announceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const glowAnim     = useRef(new Animated.Value(0.4)).current;

  // Entrance stagger on mount
  useEffect(() => {
    Animated.stagger(90, [
      Animated.spring(headerAnim,   { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
      Animated.spring(liveAnim,     { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
      Animated.spring(quickAnim,    { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
      Animated.spring(announceAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  // Pulse loop when live
  useEffect(() => {
    if (isLive) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.03, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1,   duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0.4, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
      Animated.parallel([
        Animated.timing(pulseAnim, { toValue: 1,   duration: 200, useNativeDriver: true }),
        Animated.timing(glowAnim,  { toValue: 0.4, duration: 200, useNativeDriver: true }),
      ]).start();
    }
    return () => {
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
    };
  }, [isLive]);

  // ─── Data listeners ────────────────────────────────────────────
  useEffect(() => {
    if (user) registerForPushNotifications(user.uid);
  }, [user]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'stream', 'status'), (snap) => {
      if (snap.exists()) {
        setIsLive(snap.data().isLive || false);
        setLiveTitle(snap.data().title || 'Jacob is Live');
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(5),
    );
    const unsub = onSnapshot(q, (snap) => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const name = profile?.displayName || user?.displayName || 'there';

  // Helper: slide-up + fade entrance style
  const enterStyle = (anim) => ({
    opacity: anim,
    transform: [{
      translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }),
    }],
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View style={[s.header, enterStyle(headerAnim)]}>
            <View>
              <Text style={s.greeting}>Good day,</Text>
              <Text style={s.name}>{name} {isAdmin ? '👑' : ''}</Text>
            </View>
            {isAdmin && (
              <TouchableOpacity
                style={s.adminBtn}
                onPress={() => router.push('/admin')}
              >
                <Text style={s.adminTxt}>Admin</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Live card */}
          <Animated.View style={[
            enterStyle(liveAnim),
            { transform: [
                { translateY: liveAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
                { scale: pulseAnim },
              ]
            },
          ]}>
            {isLive ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push('/(tabs)/live')}
                style={s.liveCardWrap}
              >
                <Animated.View style={[s.glowRing, { opacity: glowAnim }]} pointerEvents="none" />
                <LinearGradient
                  colors={['#00FF87', '#00C96B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.liveCard}
                >
                  <View style={s.livePill}>
                    <View style={s.liveDot} />
                    <Text style={s.livePillTxt}>LIVE NOW</Text>
                  </View>
                  <Text style={s.liveTitle}>{liveTitle}</Text>
                  <Text style={s.liveSub}>Tap to join the session →</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={[s.offlineCard, shadow.card]}>
                <LinearGradient
                  colors={['rgba(0,255,135,0.08)', 'rgba(0,255,135,0.02)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={s.offlineOrb}>
                  <Text style={s.offlineIcon}>◉</Text>
                </View>
                <Text style={s.offlineTitle}>Not Live Yet</Text>
                <Text style={s.offlineSub}>
                  You'll get a notification the moment Jacob goes live.
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Quick actions */}
          <Animated.View style={enterStyle(quickAnim)}>
            <Text style={s.sectionLabel}>Quick Access</Text>
            <View style={s.quickRow}>
              <QuickCard
                icon="◈"
                label="Community"
                sub="Chat live"
                onPress={() => router.push('/(tabs)/chat')}
                accent={colors.accent}
              />
              <QuickCard
                icon="▶"
                label="Stream"
                sub="Watch live"
                onPress={() => router.push('/(tabs)/live')}
                accent="#00D4FF"
              />
            </View>
          </Animated.View>

          {/* Announcements */}
          {announcements.length > 0 && (
            <Animated.View style={enterStyle(announceAnim)}>
              <Text style={s.sectionLabel}>From Jacob</Text>
              {announcements.map((a, i) => (
                <AnnouncementCard key={a.id} data={a} index={i} />
              ))}
            </Animated.View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function QuickCard({ icon, label, sub, onPress, accent }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, tension: 120, friction: 8 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 120, friction: 8 }).start();

  return (
    <Animated.View style={[q.card, shadow.card, { transform: [{ scale }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        style={{ flex: 1 }}
      >
        <View style={[q.iconWrap, { borderColor: accent + '30', backgroundColor: accent + '12' }]}>
          <Text style={[q.icon, { color: accent }]}>{icon}</Text>
        </View>
        <Text style={q.label}>{label}</Text>
        <Text style={q.sub}>{sub}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function AnnouncementCard({ data, index }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: index * 60,
      tension: 55,
      friction: 9,
      useNativeDriver: true,
    }).start();
  }, []);

  const time = data.createdAt?.toDate ? timeAgo(data.createdAt.toDate()) : '';

  return (
    <Animated.View style={[
      a.card, shadow.card,
      {
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      },
    ]}>
      <View style={a.row}>
        <View style={a.avatar}>
          <Text style={a.avatarTxt}>JW</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={a.nameRow}>
            <Text style={a.sender}>Jacob Walton</Text>
            <View style={a.badge}><Text style={a.badgeTxt}>ADMIN</Text></View>
          </View>
          <Text style={a.time}>{time}</Text>
        </View>
      </View>
      <Text style={a.text}>{data.text}</Text>
    </Animated.View>
  );
}

function timeAgo(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  greeting: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, marginBottom: 2 },
  name:     { fontFamily: fonts.display, fontSize: 28, color: colors.text },
  adminBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.accentDim,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0,255,135,0.2)',
  },
  adminTxt: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accent },
  liveCardWrap: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    ...shadow.accent,
  },
  glowRing: {
    position: 'absolute',
    top: -6, left: -6, right: -6, bottom: -6,
    borderRadius: radius.xl + 6,
    borderWidth: 2,
    borderColor: '#00FF87',
    zIndex: 1,
  },
  liveCard: { padding: spacing.xl, borderRadius: radius.xl },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  liveDot:    { width: 7, height: 7, borderRadius: radius.full, backgroundColor: colors.bg },
  livePillTxt:{ fontFamily: fonts.bold, fontSize: 11, color: colors.bg, letterSpacing: 1.5 },
  liveTitle:  { fontFamily: fonts.display, fontSize: 26, color: colors.bg, marginBottom: 6 },
  liveSub:    { fontFamily: fonts.medium, fontSize: 14, color: 'rgba(5,7,14,0.7)' },
  offlineCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,255,135,0.1)',
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  offlineOrb: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,255,135,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,135,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  offlineIcon:  { fontSize: 22, color: colors.accent, opacity: 0.6 },
  offlineTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.text, marginBottom: 6 },
  offlineSub:   { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  sectionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  quickRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
});

const q = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  icon:  { fontSize: 18 },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text,    marginBottom: 2 },
  sub:   { fontFamily: fonts.regular,  fontSize: 12, color: colors.textMuted },
});

const a = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(0,255,135,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontFamily: fonts.bold, fontSize: 12, color: colors.accent },
  nameRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sender:    { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  badge: {
    backgroundColor: colors.accentDim,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeTxt: { fontFamily: fonts.bold, fontSize: 9, color: colors.accent, letterSpacing: 1 },
  time: { fontFamily: fonts.regular, fontSize: 11, color: colors.textFaint },
  text: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMid, lineHeight: 24 },
});
