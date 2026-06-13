import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../src/theme';

export default function Terms() {
  const router = useRouter();
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.back}>
            <Text style={s.backTxt}>‹</Text>
          </TouchableOpacity>
          <Text style={s.title}>Terms & Privacy</Text>
        </View>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          <Section title="Not Financial Advice">
            The Greenprint is an educational trading community. Jacob Walton is NOT a licensed financial adviser, broker, or investment professional. Nothing shared in this app, on our website, in our live sessions, or in our community chats constitutes financial advice, investment advice, or a solicitation to buy or sell any financial instrument.{'\n\n'}All content is provided strictly for educational and informational purposes. You are solely responsible for your own trading decisions and any losses that may result.
          </Section>

          <Section title="Risk Disclaimer">
            Trading financial markets including forex, indices, commodities, and cryptocurrencies involves a substantial risk of loss and is not suitable for every investor. The high degree of leverage available in trading can work against you as well as for you.{'\n\n'}Past performance shown in this community is not indicative of future results. You should carefully consider your financial situation and risk tolerance before trading. Never trade with money you cannot afford to lose.
          </Section>

          <Section title="Terms of Use">
            By using The Greenprint app you agree to:{'\n\n'}
            • Use the app for personal, non-commercial educational purposes only{'\n'}
            • Not share, reproduce, or redistribute any content without permission{'\n'}
            • Conduct yourself respectfully in all community spaces{'\n'}
            • Not spam, harass, or abuse other members{'\n'}
            • Not use the platform for any unlawful purpose{'\n\n'}
            We reserve the right to remove any member from the community for violations of these terms at any time without notice.
          </Section>

          <Section title="Privacy Policy">
            We collect only what is necessary to provide the service:{'\n\n'}
            • Email address and display name for your account{'\n'}
            • Chat messages sent within the app{'\n'}
            • Trade journal entries (stored privately, visible only to you){'\n'}
            • Device push notification token (for live alerts){'\n\n'}
            We do not sell your data to third parties. We do not share your personal information with advertisers. Your trade journal entries are private and are never shared with other members or used for any purpose other than displaying them back to you.{'\n\n'}
            Data is stored securely using Google Firebase. You may request deletion of your account and data at any time by contacting us.
          </Section>

          <Section title="Community Rules">
            The Greenprint community is a professional environment. Members are expected to:{'\n\n'}
            • Keep discussion relevant to trading and markets{'\n'}
            • Never provide financial advice to other members{'\n'}
            • Respect all members regardless of experience level{'\n'}
            • Not share third-party trade signals or promotions without permission{'\n'}
            • Report any issues to admin via the app{'\n\n'}
            Violations may result in immediate removal from the community.
          </Section>

          <Section title="Contact">
            For questions, account deletion requests, or any concerns:{'\n\n'}thegreenprint.trade
          </Section>

          <Text style={s.updated}>Last updated: June 2026</Text>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <Text style={s.sectionBody}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#000' },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#111', gap: 12 },
  back:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', borderRadius: 18, borderWidth: 1, borderColor: '#222' },
  backTxt: { fontSize: 22, color: '#FFF', fontWeight: '700', marginTop: -2 },
  title:   { fontSize: 18, color: '#FFF', fontWeight: '700' },
  scroll:  { paddingHorizontal: 20, paddingTop: 24 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.accent, marginBottom: 10, letterSpacing: 0.3 },
  sectionBody:  { fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 24 },
  updated: { fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 8 },
});
