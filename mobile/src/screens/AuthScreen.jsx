import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendOtp, verifyOtp } from '../services/api';
import { getApiUrl, setApiUrl } from '../config';

export default function AuthScreen({ onLoginSuccess }) {
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoOtpHint, setDemoOtpHint] = useState('');

  // Server settings modal/drawer
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState('');

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(email.trim());
      if (res.debug_otp) {
        setDemoOtpHint(res.debug_otp);
        Alert.alert(
          'Verification Code Sent',
          `A code was sent to ${email}.\n\n[Dev Preview OTP]: ${res.debug_otp}`
        );
      } else {
        Alert.alert('Verification Code Sent', `A 6-digit code has been dispatched to ${email}. Check your inbox or spam.`);
      }
      setStep('otp');
    } catch (err) {
      Alert.alert('Error Sending Code', err.message || 'Failed to send OTP. Check your server connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp(email, otpCode, fullName, phone);
      if (res.access_token && res.citizen) {
        onLoginSuccess(res.access_token, res.citizen);
      } else {
        throw new Error('Authentication response invalid.');
      }
    } catch (err) {
      Alert.alert('Verification Failed', err.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const openServerConfig = async () => {
    const current = await getApiUrl();
    setCustomServerUrl(current);
    setShowServerConfig(true);
  };

  const saveServerConfig = async () => {
    if (customServerUrl.trim()) {
      await setApiUrl(customServerUrl.trim());
      Alert.alert('Saved', `Server URL set to:\n${customServerUrl.trim()}`);
      setShowServerConfig(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header Branding */}
        <View style={styles.brandHeader}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={38} color="#0284c7" />
          </View>
          <Text style={styles.title}>AICTE Grievance Portal</Text>
          <Text style={styles.subtitle}>Citizen & Student Mobile Complaint Access</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {step === 'email' ? (
            <>
              <Text style={styles.cardTitle}>Sign In / Authenticate</Text>
              <Text style={styles.cardDesc}>
                Enter your email address to receive a secure one-time verification code via Resend.
              </Text>

              <Text style={styles.label}>Email Address *</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. rahul.sharma@example.com"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Send Verification Code</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.stepHeader}>
                <TouchableOpacity onPress={() => setStep('email')} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={20} color="#0284c7" />
                  <Text style={styles.backBtnText}>Change Email</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.cardTitle}>Enter 6-Digit Code</Text>
              <Text style={styles.cardDesc}>
                Verification code sent to <Text style={{ fontWeight: '700', color: '#0f172a' }}>{email}</Text>
              </Text>

              {demoOtpHint ? (
                <View style={styles.hintBox}>
                  <Ionicons name="information-circle" size={18} color="#0369a1" />
                  <Text style={styles.hintText}>Demo OTP: {demoOtpHint}</Text>
                </View>
              ) : null}

              <Text style={styles.label}>6-Digit OTP Code *</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="key-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="123456"
                  placeholderTextColor="#94a3b8"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading}
                />
              </View>

              <Text style={styles.label}>Your Full Name (Optional)</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor="#94a3b8"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!loading}
                />
              </View>

              <Text style={styles.label}>Mobile Phone (Optional)</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="call-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#94a3b8"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Verify & Enter Portal</Text>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleSendOtp}
                disabled={loading}
              >
                <Text style={styles.resendBtnText}>Resend Code</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Server IP Config Pill */}
        <TouchableOpacity style={styles.serverPill} onPress={openServerConfig}>
          <Ionicons name="server-outline" size={14} color="#64748b" />
          <Text style={styles.serverPillText}>Server Settings</Text>
        </TouchableOpacity>

        {showServerConfig && (
          <View style={styles.serverModal}>
            <Text style={styles.serverModalTitle}>Backend Server URL</Text>
            <Text style={styles.serverModalDesc}>
              Enter your computer's IP address (e.g. http://192.168.1.6:8000) so this phone can reach the API:
            </Text>
            <TextInput
              style={styles.serverInput}
              value={customServerUrl}
              onChangeText={setCustomServerUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.serverBtn, { backgroundColor: '#0284c7' }]}
                onPress={saveServerConfig}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Save URL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.serverBtn, { backgroundColor: '#e2e8f0' }]}
                onPress={() => setShowServerConfig(false)}
              >
                <Text style={{ color: '#334155', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: '#38bdf8',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
  },
  otpInput: {
    letterSpacing: 4,
    fontWeight: '700',
    fontSize: 18,
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  stepHeader: {
    marginBottom: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 13,
    color: '#0284c7',
    fontWeight: '600',
    marginLeft: 4,
  },
  resendBtn: {
    alignSelf: 'center',
    marginTop: 14,
    padding: 6,
  },
  resendBtnText: {
    color: '#0284c7',
    fontSize: 13,
    fontWeight: '600',
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    gap: 6,
  },
  hintText: {
    fontSize: 12,
    color: '#0369a1',
    fontWeight: '600',
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginTop: 24,
    gap: 6,
  },
  serverPillText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  serverModal: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
  },
  serverModalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  serverModalDesc: {
    fontSize: 12,
    color: '#64748b',
    marginVertical: 6,
  },
  serverInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    backgroundColor: '#f8fafc',
  },
  serverBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
});
