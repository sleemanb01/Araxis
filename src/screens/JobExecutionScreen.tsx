import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CustomButton } from '../components/CustomButton';
import { StatusBadge } from '../components/StatusBadge';
import { useJobStore } from '../store/useJobStore';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RouteP = RouteProp<RootStackParamList, 'JobExecution'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function JobExecutionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteP>();
  const { jobId } = route.params;

  const getJobById     = useJobStore((s) => s.getJobById);
  const completeJob = useJobStore((s) => s.completeJob);
  const addNote         = useJobStore((s) => s.addNote);

  const job = getJobById(jobId);
  const [noteText, setNoteText] = useState('');

  if (!job) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.errorText}>משימה לא נמצאה</Text>
      </SafeAreaView>
    );
  }

  function handleAddNote() {
    if (!noteText.trim()) return;
    addNote(job!.id, noteText.trim());
    setNoteText('');
  }

  function handleTakePhoto() {
    // TODO: launch expo-image-picker / expo-camera
    Alert.alert('צילום', 'מצלמה תחובר בשלב הבא.');
  }

  function handleScanEquipment() {
    navigation.navigate('Warehouse');
  }

  function handleFinishJob() {
    Alert.alert(
      'סיום משימה',
      'האם לסמן את המשימה כ"הושלמה"?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'אשר',
          onPress: () => {
            completeJob(job!.id);
            navigation.goBack();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.customerName}>{job.customerName}</Text>
          <StatusBadge status={job.status} />
        </View>

        <Text style={styles.address}>{job.address}</Text>
        <Text style={styles.description}>{job.description}</Text>

        {/* Notes */}
        <Text style={styles.sectionTitle}>הערות</Text>
        {job.notes.length > 0 ? (
          job.notes.map((note, i) => (
            <View key={i} style={styles.noteRow}>
              <Text style={styles.noteText}>• {note}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>אין הערות עדיין</Text>
        )}

        {/* Add note input */}
        <View style={styles.noteInputRow}>
          <TextInput
            style={styles.noteInput}
            placeholder="הוסף הערה..."
            placeholderTextColor={Colors.textSecondary}
            value={noteText}
            onChangeText={setNoteText}
            multiline
            textAlign="right"
          />
          <CustomButton
            label="הוסף"
            onPress={handleAddNote}
            style={styles.addBtn}
            disabled={!noteText.trim()}
          />
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <CustomButton label="צלם תמונה"      variant="secondary" onPress={handleTakePhoto} />
          <CustomButton label="סרוק ציוד"       variant="secondary" onPress={handleScanEquipment} />
          <CustomButton label="סיים משימה"      variant="primary"   onPress={handleFinishJob} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: Layout.screenPadding,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
    marginStart: 8,
  },
  address: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  description: {
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'right',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
    marginTop: 8,
  },
  noteRow: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 10,
  },
  noteText: {
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  noteInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  noteInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 44,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  addBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 40,
    color: Colors.textSecondary,
    fontSize: 16,
  },
});
