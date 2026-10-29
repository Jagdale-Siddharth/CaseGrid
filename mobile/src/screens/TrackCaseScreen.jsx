import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { trackCase } from '../services/api';

export default function TrackCaseScreen({ initialCaseId }) {
  const [caseRef, setCaseRef] = useState(initialCaseId || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTrack = async (searchRef) => {
    const target = (searchRef || caseRef).trim();
    if (!target) {
      Alert.alert('Case ID Required', 'Please enter a Case ID (e.g. CMP-2026-000001).');
      return;
    }

    setLoading(true);
    setData(null);
    try {
      const res = await trackCase(target);
      setData(res);
    } catch (err) {
      Alert.alert('Case Not Found', err.message || `No case found matching reference "${target}".`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'resolved':
        return { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
      case 'in progress':
        return { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' };
      case 'under review':
        return { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' };
      default:
        return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Track Any Complaint</Text>
        <Text style={styles.headerSubtitle}>Real-time public tracking via Case Reference ID</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Search Input Box */}
        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>Case Reference ID</Text>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="e.g. CMP-2026-000001"
              placeholderTextColor="#94a3b8"
              value={caseRef}
              onChangeText={setCaseRef}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.trackBtn, loading && styles.btnDisabled]}
            onPress={() => handleTrack()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.trackBtnText}>Track Progress</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Tracking Result View */}
        {data && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View>
                <Text style={styles.resultCaseId}>{data.case_id}</Text>
                <Text style={styles.resultCategory}>{data.category} Complaint</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: getStatusColor(data.status).bg,
                    borderColor: getStatusColor(data.status).border,
                  },
                ]}
              >
                <Text style={[styles.statusText, { color: getStatusColor(data.status).text }]}>
                  {data.status}
                </Text>
              </View>
            </View>

            {/* Urgent Badge */}
            {data.is_urgent && (
              <View style={styles.urgentBanner}>
                <Ionicons name="flash" size={14} color="#dc2626" />
                <Text style={styles.urgentBannerText}>Urgent SLA Priority Case</Text>
              </View>
            )}

            {/* Info Grid */}
            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Institution</Text>
                <Text style={styles.gridValue} numberOfLines={2}>
                  {data.institution_name}
                </Text>
                <Text style={styles.gridSubvalue}>{data.institution_city}, {data.institution_state}</Text>
              </View>
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Assigned Bureau</Text>
                <Text style={styles.gridValue}>{data.bureau_name}</Text>
                <Text style={styles.gridSubvalue}>Due: {data.due_date}</Text>
              </View>
            </View>

            {/* Subject */}
            <View style={styles.infoBlock}>
              <Text style={styles.gridLabel}>Subject</Text>
              <Text style={styles.subjectText}>{data.subject}</Text>
            </View>

            {/* Pending Action */}
            <View style={styles.actionBox}>
              <Ionicons name="time-outline" size={18} color="#0284c7" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.actionTitle}>Next Step / Pending Action</Text>
                <Text style={styles.actionDesc}>{data.pending_action || 'Under officer evaluation'}</Text>
              </View>
            </View>

            {/* Timeline */}
            {data.history && data.history.length > 0 && (
              <View style={styles.timelineSection}>
                <Text style={styles.timelineSectionTitle}>Official Action Chronology</Text>
                {data.history.map((h, i) => (
                  <View key={h.id || i} style={styles.timelineRow}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineEventText}>{h.description}</Text>
                      <Text style={styles.timelineMetaText}>
                        {h.actor_role} ({h.actor_name}) • {h.created_at ? h.created_at.split('T')[0] : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
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
  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  searchLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '600',
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  trackBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 18,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
    marginBottom: 12,
  },
  resultCaseId: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  resultCategory: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 12,
  },
  urgentBannerText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  gridCol: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  gridSubvalue: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  infoBlock: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
  },
  subjectText: {
    fontSize: 13,
    color: '#1e293b',
    marginTop: 2,
  },
  actionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  actionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
    textTransform: 'uppercase',
  },
  actionDesc: {
    fontSize: 12,
    color: '#0f172a',
    marginTop: 1,
  },
  timelineSection: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  timelineSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0284c7',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 8,
  },
  timelineEventText: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '500',
  },
  timelineMetaText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
});
