import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMyComplaints, trackCase } from '../services/api';
import { getApiUrl } from '../config';

export default function MyComplaintsScreen({ token, onTrackExternal }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseDetails, setCaseDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    loadComplaints();
    getApiUrl().then(setServerUrl);
  }, []);

  const loadComplaints = async () => {
    try {
      const data = await getMyComplaints(token);
      setComplaints(data || []);
    } catch (e) {
      console.warn('Error loading complaints', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadComplaints();
  };

  const openDetail = async (c) => {
    setSelectedCase(c);
    setLoadingDetails(true);
    try {
      const details = await trackCase(c.case_id);
      setCaseDetails(details);
    } catch (err) {
      console.warn('Detail fetch error', err);
      setCaseDetails(c);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'resolved':
        return { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
      case 'in progress':
        return { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' };
      case 'under review':
      case 'pending information':
        return { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' };
      default:
        return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Complaints</Text>
        <Text style={styles.headerSubtitle}>
          {complaints.length} {complaints.length === 1 ? 'grievance' : 'grievances'} lodged from this account
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Fetching your cases...</Text>
        </View>
      ) : complaints.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          <View style={styles.emptyIconCircle}>
            <Ionicons name="document-text-outline" size={44} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>No Complaints Lodged Yet</Text>
          <Text style={styles.emptySubtitle}>
            When you submit a complaint from the "File Complaint" tab, its tracking status, assigned bureau and timeline will appear here.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {complaints.map((c) => {
            const sc = getStatusColor(c.status);
            return (
              <TouchableOpacity
                key={c.id}
                style={styles.card}
                onPress={() => openDetail(c)}
                activeOpacity={0.8}
              >
                {/* Top Row: Case ID & Status */}
                <View style={styles.cardTopRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.caseId}>{c.case_id}</Text>
                    {c.is_urgent && (
                      <View style={styles.urgentPill}>
                        <Ionicons name="flash" size={10} color="#dc2626" />
                        <Text style={styles.urgentPillText}>URGENT</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{c.status}</Text>
                  </View>
                </View>

                {/* Subject & Inst */}
                <Text style={styles.subject} numberOfLines={2}>
                  {c.subject}
                </Text>
                <Text style={styles.instName} numberOfLines={1}>
                  <Ionicons name="business" size={12} color="#64748b" /> {c.institution_name}
                </Text>

                {/* Footer tags */}
                <View style={styles.cardFooter}>
                  <View style={styles.bureauTag}>
                    <Ionicons name="git-network-outline" size={12} color="#0284c7" />
                    <Text style={styles.bureauTagText} numberOfLines={1}>{c.bureau}</Text>
                  </View>
                  <Text style={styles.dateText}>{c.registered_on || 'Recent'}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Case Detail Modal */}
      <Modal visible={!!selectedCase} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalCaseId}>{selectedCase?.case_id}</Text>
                <Text style={styles.modalCategory}>{selectedCase?.category} Grievance</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedCase(null)} style={{ padding: 6 }}>
                <Ionicons name="close" size={24} color="#334155" />
              </TouchableOpacity>
            </View>

            {loadingDetails ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView style={{ maxHeight: 500 }}>
                {/* Status Box */}
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Current Status</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: getStatusColor(caseDetails?.status).bg,
                          borderColor: getStatusColor(caseDetails?.status).border,
                        },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: getStatusColor(caseDetails?.status).text }]}>
                        {caseDetails?.status}
                      </Text>
                    </View>
                    {caseDetails?.is_urgent && (
                      <View style={styles.urgentPill}>
                        <Ionicons name="flash" size={10} color="#dc2626" />
                        <Text style={styles.urgentPillText}>URGENT (Expedited)</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Bureau & Institution */}
                <View style={styles.detailGrid}>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>Assigned Bureau</Text>
                    <Text style={styles.detailValue}>{caseDetails?.bureau || caseDetails?.bureau_name}</Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>Due Date (SLA)</Text>
                    <Text style={styles.detailValue}>{caseDetails?.due_date || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Institution</Text>
                  <Text style={styles.detailValueBold}>{caseDetails?.institution_name}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Subject</Text>
                  <Text style={styles.detailValue}>{caseDetails?.subject}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailText}>{caseDetails?.description}</Text>
                </View>

                {/* Geotagged Photo Preview */}
                {(caseDetails?.photo_url || caseDetails?.geo_latitude) && (
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>Geotagged Photo & Site Location</Text>
                    {caseDetails?.photo_url && (
                      <Image
                        source={{ uri: `${serverUrl.replace(/\/$/, '')}${caseDetails.photo_url}` }}
                        style={styles.detailPhoto}
                        resizeMode="cover"
                      />
                    )}
                    {caseDetails?.geo_latitude && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                        <Ionicons name="location" size={14} color="#059669" />
                        <Text style={styles.geoDetailText}>
                          GPS: {caseDetails.geo_latitude.toFixed(4)}°, {caseDetails.geo_longitude.toFixed(4)}°
                          {caseDetails.geo_address ? ` (${caseDetails.geo_address})` : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Timeline History */}
                {caseDetails?.history && caseDetails.history.length > 0 && (
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>Chronological Timeline</Text>
                    <View style={styles.timelineList}>
                      {caseDetails.history.map((h, i) => (
                        <View key={h.id || i} style={styles.timelineItem}>
                          <View style={styles.timelineDot} />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.timelineText}>{h.description}</Text>
                            <Text style={styles.timelineDate}>
                              By {h.actor_name} ({h.actor_role}) • {h.created_at ? h.created_at.split('T')[0] : ''}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  caseId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  urgentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    gap: 2,
  },
  urgentPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#dc2626',
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subject: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  instName: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  bureauTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
    maxWidth: '65%',
  },
  bureauTagText: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 14,
    marginBottom: 14,
  },
  modalCaseId: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCategory: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  detailBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  detailCol: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    color: '#0f172a',
    marginTop: 2,
  },
  detailValueBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  detailText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginTop: 2,
  },
  detailPhoto: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginTop: 8,
  },
  geoDetailText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  timelineList: {
    marginTop: 8,
  },
  timelineItem: {
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
  timelineText: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '500',
  },
  timelineDate: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
});
