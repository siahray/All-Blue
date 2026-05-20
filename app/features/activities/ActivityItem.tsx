import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Colors } from '../../../theme/colors';
import { PlusCircle, Utensils, AlertCircle, Trash2 } from 'lucide-react-native';

export function renderActivityIcon(type: string) {
  switch (type) {
    case 'added': return <PlusCircle size={20} color={Colors.accentGold} />;
    case 'cooked': return <Utensils size={20} color="#2196F3" />;
    default: return <AlertCircle size={20} color={Colors.accentRed} />;
  }
}

export function formatActivityDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
  let datePart = '';
  if (targetDate.getTime() === today.getTime()) {
    datePart = 'Today';
  } else if (targetDate.getTime() === yesterday.getTime()) {
    datePart = 'Yesterday';
  } else {
    const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (d.getFullYear() !== now.getFullYear()) dateOptions.year = 'numeric';
    datePart = d.toLocaleDateString(undefined, dateOptions);
  }
  return `${datePart} • ${timePart}`;
}

interface ActivityItemProps {
  item: any;
  onPress: (item: any) => void;
  onDelete: (id: string) => void;
}

export const ActivityItem = ({ item, onPress, onDelete }: ActivityItemProps) => (
  <TouchableOpacity
    style={styles.activityItem}
    onPress={() => onPress(item)}
    activeOpacity={0.7}
  >
    <View style={[styles.iconBadge, { backgroundColor: item.type === 'added' ? '#E8F5E9' : '#E3F2FD' }]}>
      {renderActivityIcon(item.type)}
    </View>
    <View style={styles.textContainer}>
      <Text style={styles.actionText}>{item.type === 'added' ? 'Added to Pantry' : 'Cooked with'}</Text>
      <Text style={styles.itemName} numberOfLines={1}>{item.item_name}</Text>
    </View>
    <View style={styles.rightContent}>
      <Text style={styles.timeText}>{formatActivityDate(item.created_at)}</Text>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => { e.stopPropagation(); onDelete(item.id); }}
      >
        <Trash2 size={16} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 22,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  iconBadge: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  textContainer: { flex: 1 },
  actionText: { fontSize: 11, color: Colors.textSecondary, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: Colors.black },
  rightContent: { alignItems: 'flex-end', justifyContent: 'center' },
  timeText: { fontSize: 12, color: '#999', fontWeight: '600', marginBottom: 4 },
  deleteButton: { padding: 4 },
});

export default ActivityItem;
