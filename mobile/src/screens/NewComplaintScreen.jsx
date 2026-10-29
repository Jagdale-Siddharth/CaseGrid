import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as DocumentPicker from 'expo-document-picker';
import { getInstitutions, getCategories, fileComplaint } from '../services/api';

export default function NewComplaintScreen({ token, citizen, onComplaintCreated }) {
  const [institutions, setInstitutions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Form State
  const [selectedInst, setSelectedInst] = useState(null);
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  // Geotag Photo State (Optional)
  const [photo, setPhoto] = useState(null);
  const [locationCoords, setLocationCoords] = useState(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Document State (Optional)
  const [document, setDocument] = useState(null);

  // Submitting
  const [submitting, setSubmitting] = useState(false);

  // Institution Search Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    setLoadingMeta(true);
    try {
      const [insts, cats] = await Promise.all([getInstitutions(''), getCategories()]);
      setInstitutions(insts || []);
      setCategories(cats.categories || ['Infrastructure', 'Faculty', 'Fees', 'Admissions', 'Academic Quality']);
      if (cats.categories && cats.categories.length > 0) {
        setCategory(cats.categories[0]);
      }
    } catch (e) {
      console.warn('Metadata load error', e);
    } finally {
      setLoadingMeta(false);
    }
  };

  const handleSearchInst = async (text) => {
    setSearchQuery(text);
    try {
      const results = await getInstitutions(text);
      setInstitutions(results || []);
    } catch (e) {
      console.warn(e);
    }
  };

  // --- Photo & Geotag Handling ---
  const handlePickPhoto = async (sourceType) => {
    try {
      let result;
      if (sourceType === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is needed to take a complaint photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true,
          allowsEditing: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery permission is needed to pick a photo.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true,
          allowsEditing: true,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPhoto(asset);
        // Automatically fetch Geolocation for geotag
        await fetchCurrentLocation();
      }
    } catch (err) {
      Alert.alert('Photo Selection Error', err.message);
    }
  };

  const fetchCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Location permission was denied. Photo will be attached without GPS coordinates.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;
      setLocationCoords({ latitude, longitude });

      // Reverse geocode for readable address
      try {
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocode && geocode.length > 0) {
          const g = geocode[0];
          const parts = [g.name, g.street, g.city, g.region].filter(Boolean);
          setLocationAddress(parts.join(', ') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } else {
          setLocationAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      } catch {
        setLocationAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    } catch (e) {
      console.warn('Geolocation error', e);
      setLocationAddress('GPS Coordinates unavailable');
    } finally {
      setLoadingLocation(false);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setLocationCoords(null);
    setLocationAddress('');
  };

  // --- Document Picker Handling ---
  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'text/*'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setDocument(res.assets[0]);
      }
    } catch (err) {
      Alert.alert('Document Picker Error', err.message);
    }
  };

  const removeDocument = () => {
    setDocument(null);
  };

  const fileUriToBase64 = async (uri) => {
    try {
      const res = await fetch(uri);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const str = (reader.result || '').toString();
          const base64 = str.includes(',') ? str.split(',')[1] : str;
          resolve(base64);
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  };

  // --- Submit Form ---
  const handleSubmit = async () => {
    if (!selectedInst) {
      Alert.alert('Missing Institution', 'Please select an institution.');
      return;
    }
    if (!category) {
      Alert.alert('Missing Category', 'Please select a category.');
      return;
    }
    if (!subject.trim() || subject.trim().length < 3) {
      Alert.alert('Subject Required', 'Please enter a clear subject (at least 3 characters).');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert('Description Required', 'Please provide a detailed description (at least 10 characters).');
      return;
    }

    setSubmitting(true);
    try {
      let photoBase64 = photo?.base64 || null;
      if (!photoBase64 && photo?.uri) {
        photoBase64 = await fileUriToBase64(photo.uri);
      }

      let docBase64 = null;
      if (document?.uri) {
        docBase64 = await fileUriToBase64(document.uri);
      }

      const payload = {
        institution_id: selectedInst.id,
        category,
        subject: subject.trim(),
        description: description.trim(),
        is_urgent: isUrgent,
        geo_latitude: locationCoords?.latitude || null,
        geo_longitude: locationCoords?.longitude || null,
        geo_address: locationAddress || null,
        photo_base64: photoBase64,
        photo_name: photo?.fileName || 'geotag_photo.jpg',
        document_base64: docBase64,
        document_name: document?.name || 'document.pdf',
      };

      const res = await fileComplaint(token, payload);
      Alert.alert(
        'Complaint Submitted!',
        `Your complaint has been successfully registered.\n\nCase ID: ${res.case_id}\nAssigned Bureau: ${res.bureau}\nDue Date: ${res.due_date}`,
        [
          {
            text: 'Track Complaint',
            onPress: () => {
              // Reset form
              setSubject('');
              setDescription('');
              setIsUrgent(false);
              removePhoto();
              removeDocument();
              if (onComplaintCreated) onComplaintCreated(res.case_id);
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Submission Error', err.message || 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>File a Complaint</Text>
        <Text style={styles.headerSubtitle}>Direct grievance lodging to AICTE bureaus</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Institution Selector */}
        <Text style={styles.fieldLabel}>Institution *</Text>
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="business-outline" size={20} color="#0284c7" style={{ marginRight: 8 }} />
          <Text style={selectedInst ? styles.selectBtnTextSelected : styles.selectBtnTextPlaceholder} numberOfLines={1}>
            {selectedInst ? `${selectedInst.name} (${selectedInst.city}, ${selectedInst.state})` : 'Select Affected College / Institution'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#64748b" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {/* Category Pills */}
        <Text style={styles.fieldLabel}>Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {categories.map((c) => {
            const active = category === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.catPill, active && styles.catPillActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.catPillText, active && styles.catPillTextActive]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Subject */}
        <Text style={styles.fieldLabel}>Complaint Subject *</Text>
        <TextInput
          style={styles.input}
          placeholder="Brief summary of the issue"
          placeholderTextColor="#94a3b8"
          value={subject}
          onChangeText={setSubject}
        />

        {/* Description */}
        <Text style={styles.fieldLabel}>Detailed Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe what occurred, dates, names, or specifics..."
          placeholderTextColor="#94a3b8"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Optional Geotagged Photo Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="camera-outline" size={20} color="#0284c7" />
              <Text style={styles.sectionTitle}>Geotagged Photo</Text>
            </View>
            <Text style={styles.optionalBadge}>Optional</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Take or upload an on-site photo. GPS coordinates will be captured to verify location.
          </Text>

          {photo ? (
            <View style={styles.photoPreviewCard}>
              <Image source={{ uri: photo.uri }} style={styles.photoImg} />
              <View style={styles.photoMeta}>
                {loadingLocation ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ActivityIndicator size="small" color="#0284c7" />
                    <Text style={styles.geoText}>Acquiring GPS coordinates...</Text>
                  </View>
                ) : (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="location-sharp" size={16} color="#059669" />
                      <Text style={styles.geoTextBold}>
                        {locationCoords ? `${locationCoords.latitude.toFixed(4)}°, ${locationCoords.longitude.toFixed(4)}°` : 'Location Tagged'}
                      </Text>
                    </View>
                    {locationAddress ? <Text style={styles.geoSubtext} numberOfLines={2}>{locationAddress}</Text> : null}
                  </View>
                )}
                <TouchableOpacity style={styles.removeBtn} onPress={removePhoto}>
                  <Ionicons name="trash-outline" size={16} color="#dc2626" />
                  <Text style={styles.removeBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.photoButtonsRow}>
              <TouchableOpacity style={styles.photoActionBtn} onPress={() => handlePickPhoto('camera')}>
                <Ionicons name="camera" size={18} color="#0284c7" />
                <Text style={styles.photoActionText}>Take Camera Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoActionBtn} onPress={() => handlePickPhoto('gallery')}>
                <Ionicons name="images" size={18} color="#0284c7" />
                <Text style={styles.photoActionText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Optional Document Upload Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="document-attach-outline" size={20} color="#0284c7" />
              <Text style={styles.sectionTitle}>Supporting Document</Text>
            </View>
            <Text style={styles.optionalBadge}>Optional</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Attach relevant letters, fee receipts, circulars or PDFs (Max 10 MB).
          </Text>

          {document ? (
            <View style={styles.docChip}>
              <Ionicons name="document-text" size={24} color="#0284c7" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.docName} numberOfLines={1}>{document.name}</Text>
                <Text style={styles.docSize}>{document.size ? `${(document.size / 1024).toFixed(0)} KB` : 'Attached'}</Text>
              </View>
              <TouchableOpacity onPress={removeDocument} style={{ padding: 6 }}>
                <Ionicons name="close-circle" size={20} color="#dc2626" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadBtn} onPress={handlePickDocument}>
              <Ionicons name="cloud-upload-outline" size={20} color="#0284c7" />
              <Text style={styles.uploadBtnText}>Select Document (PDF / DOC / Image)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Optional Urgent Checkbox Section */}
        <View style={[styles.sectionCard, isUrgent && styles.urgentCardActive]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="flash" size={18} color={isUrgent ? '#dc2626' : '#64748b'} />
                <Text style={[styles.urgentTitle, isUrgent && { color: '#dc2626' }]}>
                  Mark as Urgent
                </Text>
                <Text style={styles.optionalBadge}>Optional</Text>
              </View>
              <Text style={styles.urgentDesc}>
                Flags case for expedited SLA escalation and priority review by bureau officers.
              </Text>
            </View>
            <Switch
              value={isUrgent}
              onValueChange={setIsUrgent}
              trackColor={{ false: '#cbd5e1', true: '#fca5a5' }}
              thumbColor={isUrgent ? '#dc2626' : '#f8fafc'}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Submit Complaint</Text>
              <Ionicons name="send" size={16} color="#fff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Institution Search Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Institution</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color="#334155" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchWrap}>
              <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search college name, code, or city..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={handleSearchInst}
                autoFocus
              />
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              {institutions.map((inst) => (
                <TouchableOpacity
                  key={inst.id}
                  style={styles.instItem}
                  onPress={() => {
                    setSelectedInst(inst);
                    setModalVisible(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.instName}>{inst.name}</Text>
                    <Text style={styles.instSub}>
                      {inst.code} • {inst.city}, {inst.state} ({inst.inst_type})
                    </Text>
                  </View>
                  {selectedInst?.id === inst.id && (
                    <Ionicons name="checkmark-circle" size={22} color="#0284c7" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  scrollContent: {
    padding: 18,
    paddingBottom: 48,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginTop: 14,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  selectBtnTextPlaceholder: {
    color: '#94a3b8',
    fontSize: 14,
    flex: 1,
  },
  selectBtnTextSelected: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  catScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  catPill: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
  },
  catPillActive: {
    backgroundColor: '#0284c7',
  },
  catPillText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  catPillTextActive: {
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: '#0f172a',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  urgentCardActive: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  optionalBadge: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  sectionDesc: {
    fontSize: 12,
    color: '#64748b',
    marginVertical: 6,
    lineHeight: 16,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingVertical: 10,
    borderRadius: 8,
  },
  photoActionText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: '600',
  },
  photoPreviewCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
    alignItems: 'center',
  },
  photoImg: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  photoMeta: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  geoText: {
    fontSize: 12,
    color: '#64748b',
  },
  geoTextBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  geoSubtext: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  removeBtnText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 3,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    borderStyle: 'dashed',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 6,
  },
  uploadBtnText: {
    color: '#0284c7',
    fontSize: 13,
    fontWeight: '600',
  },
  docChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  docName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  docSize: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  urgentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  urgentDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: '#0284c7',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  instItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  instName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  instSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});
