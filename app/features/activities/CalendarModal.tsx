import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Colors } from '../../../theme/colors';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onReset: () => void;
}

const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const numDays = new Date(year, month + 1, 0).getDate();
  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
  for (let i = 1; i <= numDays; i++) days.push(new Date(year, month, i));
  return days;
};

export const CalendarModal = ({
  visible, onClose, currentMonth, onPrevMonth, onNextMonth,
  selectedDate, onSelectDate, onReset,
}: CalendarModalProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <TouchableOpacity style={styles.modalBlur} activeOpacity={1} onPress={onClose} />
      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarTitle}>
            {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </Text>
          <View style={styles.calendarNav}>
            <TouchableOpacity onPress={onPrevMonth} style={styles.navBtn}>
              <ArrowLeft size={20} color={Colors.black} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onNextMonth} style={styles.navBtn}>
              <ArrowRight size={20} color={Colors.black} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.weekdaysRow}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, idx) => (
            <Text key={idx} style={styles.weekdayText}>{day}</Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {getDaysInMonth(currentMonth).map((day, idx) => {
            if (!day) return <View key={`empty-${idx}`} style={styles.dayCellEmpty} />;
            const today = new Date();
            const isSelected = selectedDate &&
              day.getDate() === selectedDate.getDate() &&
              day.getMonth() === selectedDate.getMonth() &&
              day.getFullYear() === selectedDate.getFullYear();
            const isToday =
              day.getDate() === today.getDate() &&
              day.getMonth() === today.getMonth() &&
              day.getFullYear() === today.getFullYear();
            return (
              <TouchableOpacity
                key={`day-${idx}`}
                onPress={() => onSelectDate(day)}
                style={[styles.dayCell, isSelected && styles.dayCellSelected, isToday && !isSelected && styles.dayCellToday]}
              >
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected, isToday && !isSelected && styles.dayTextToday]}>
                  {day.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.calendarActions}>
          <TouchableOpacity style={styles.calendarResetBtn} onPress={onReset}>
            <Text style={styles.calendarResetText}>Reset Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.calendarCloseBtn} onPress={onClose}>
            <Text style={styles.calendarCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBlur: { ...StyleSheet.absoluteFillObject },
  calendarCard: { backgroundColor: 'white', width: '90%', borderRadius: 32, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  calendarTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.black },
  calendarNav: { flexDirection: 'row', gap: 8 },
  navBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  weekdaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  weekdayText: { width: (width * 0.9 - 48) / 7, textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#999' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginBottom: 20 },
  dayCell: { width: (width * 0.9 - 48) / 7, height: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 6, borderRadius: 12 },
  dayCellEmpty: { width: (width * 0.9 - 48) / 7, height: 40, marginBottom: 6 },
  dayCellSelected: { backgroundColor: Colors.black },
  dayCellToday: { backgroundColor: '#F0F0F0' },
  dayText: { fontSize: 14, fontWeight: '600', color: Colors.black },
  dayTextSelected: { color: 'white', fontWeight: 'bold' },
  dayTextToday: { color: Colors.black, fontWeight: 'bold' },
  calendarActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  calendarResetBtn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#FFE0E0', backgroundColor: '#FFF5F5', justifyContent: 'center', alignItems: 'center' },
  calendarResetText: { color: '#FF4D4F', fontWeight: 'bold', fontSize: 14 },
  calendarCloseBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  calendarCloseText: { color: Colors.textSecondary, fontWeight: 'bold', fontSize: 14 },
});
