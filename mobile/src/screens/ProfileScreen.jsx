import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getApiUrl, setApiUrl } from '../config';

export default function ProfileScreen({ citizen, onLogout }) {
  const [serverUrl, setServerUrlState] = useState('');
  const [editingUrl, setEditingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState('');

  useEffect(() => {
    getApiUrl().then((url) => {
      setServerUrlState(url);
      setTempUrl(url);
    });
  }, []);

  const handleSaveUrl = async () => {
    if (tempUrl.trim()) {
      await setApiUrl(tempUrl.trim());
      setServerUrlState(tempUrl.trim());
      setEditingUrl(false);
      Alert.alert('Server URL Updated', `API endpoint set to:\n${tempUrl.trim()}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account & Settings</Text>
        <Text style={styles.headerSubtitle}>Authenticated Citizen Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={32} color="#0284c7" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.userName}>{citizen.full_name || 'Citizen User'}</Text>
              <Text style={styles.userEmail}>{citizen.email}</Text>
              {citizen.phone ? <Text style={styles.userPhone}>+91 {citizen.phone}</Text> : null}
            </View>
          </View>
          <View style={styles.authBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#059669" />
            <Text style={styles.authBadgeText}>Email Authenticated via Resend</Text>
          </View>
        </View>

        {/* Server Endpoint Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Backend API Connection</Text>
          <Text style={styles.cardSectionDesc}>
            The mobile app connects to your AICTE server on the local network or tunnel.
          </Text>

          {editingUrl ? (
            <View style={{ marginTop: 8 }}>
              <TextInput
                style={styles.urlInput}
                value={tempUrl}
                onChangeText={setTempUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUrl}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setTempUrl(serverUrl);
                    setEditingUrl(false);
                  }}
                >
                  <Text style={{ color: '#475569', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.urlDisplayRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.urlLabel}>Active Server URL</Text>
                <Text style={styles.urlValue}>{serverUrl}</Text>
              </View>
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditingUrl(true)}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* AICTE Information */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>About AICTE Complaint Portal</Text>
          <Text style={styles.infoParagraph}>
            • <Text style={{ fontWeight: '700' }}>Automated Routing:</Text> Cases are systematically classified by AICTE rule engines to the Technical Bureau, Approval Bureau, or Student Grievance Cell.
          </Text>
          <Text style={styles.infoParagraph}>
            • <Text style={{ fontWeight: '700' }}>SLA Monitoring:</Text> High priority and urgent cases receive accelerated resolution windows.
          </Text>
          <Text style={styles.infoParagraph}>
            • <Text style={{ fontWeight: '700' }}>Public Transparency:</Text> Anyone can track case progress at any time using their Case ID.
          </Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.logoutBtnText}>Sign Out of Mobile App</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#0f172a',
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  userPhone: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 14,
    gap: 6,
  },
  authBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardSectionDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 8,
  },
  urlDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  urlLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  urlValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
    marginTop: 2,
  },
  editBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '700',
  },
  urlInput: {
    borderWidth: 1.5,
    borderColor: '#0284c7',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    backgroundColor: '#f8fafc',
  },
  saveBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelBtn: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  infoParagraph: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 6,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    gap: 8,
  },
  logoutBtnText: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '700',
  },
});
