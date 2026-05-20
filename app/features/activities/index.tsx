import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity,
  Platform, TextInput, Keyboard, ScrollView,
} from 'react-native';
import { useAppAlert } from '../../../components/common/AppAlert';
import { Colors } from '../../../theme/colors';
import { supabase } from '../../../services/supabase';
import { Search, X, ArrowLeft, ChefHat } from 'lucide-react-native';
import { ActivityItem } from './ActivityItem';
import { FeaturedActivity } from './FeaturedActivity';
import { CalendarModal } from './CalendarModal';

type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'custom';

const DATE_FILTER_OPTIONS = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'week' },
  { label: 'Pick Date 📅', value: 'custom' },
];

export default function ActivitiesScreen() {
  const router = useRouter();
  const { showAlert } = useAppAlert();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  useFocusEffect(useCallback(() => { fetchActivities(); }, []));

  async function fetchActivities(silent = false) {
    if (!silent) setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) { setLoading(false); return; }
      const { data, error } = await supabase.from('activities').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      if (!error) setActivities(data || []);
    } catch (e) { console.warn('Activities fetch error:', e); }
    finally { setLoading(false); }
  }

  const handleRefresh = async () => { setRefreshing(true); await fetchActivities(true); setRefreshing(false); };

  const handleDelete = async (id: string) => {
    showAlert('Delete Activity', 'Remove this activity from your history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('activities').delete().eq('id', id);
        if (!error) setActivities(prev => prev.filter(a => a.id !== id));
        else showAlert('Error', 'Failed to delete activity.');
      }},
    ]);
  };

  const handleClearAll = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;
    showAlert('Clear History', 'Delete all activity logs? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: async () => {
        setLoading(true);
        const { error } = await supabase.from('activities').delete().eq('user_id', session.user.id);
        if (!error) setActivities([]); else showAlert('Error', 'Failed to clear history.');
        setLoading(false);
      }},
    ]);
  };

  const handleActivityPress = (item: any) => {
    Keyboard.dismiss();
    if (item.type === 'cooked') {
      const recipeId = item.metadata?.recipe_id;
      if (recipeId) router.push(`/features/recipe/${recipeId}`);
      else router.push({ pathname: '/(tabs)', params: { filter: item.item_name } });
    } else if (item.type === 'added') {
      router.push('/(tabs)/pantry');
    }
  };

  const handleDateFilterPress = (value: string) => {
    if (value === 'custom') { setCalendarModalVisible(true); }
    else { setDateFilter(value as DateFilter); setCustomDate(null); }
  };

  const filteredActivities = activities.filter(item => {
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const match = item.item_name?.toLowerCase().includes(query) || item.type?.toLowerCase().includes(query);
      if (!match) return false;
    }
    if (dateFilter === 'all') return true;
    const itemDate = new Date(item.created_at);
    const today = new Date();
    const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (dateFilter === 'today') return itemDay.getTime() === todayDay.getTime();
    if (dateFilter === 'yesterday') { const y = new Date(todayDay); y.setDate(y.getDate() - 1); return itemDay.getTime() === y.getTime(); }
    if (dateFilter === 'week') { const w = new Date(todayDay); w.setDate(w.getDate() - 7); return itemDay >= w && itemDay <= todayDay; }
    if (dateFilter === 'custom' && customDate) { const t = new Date(customDate.getFullYear(), customDate.getMonth(), customDate.getDate()); return itemDay.getTime() === t.getTime(); }
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        {isSearching ? (
          <View style={styles.searchBarContainer}>
            <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); }} style={styles.backBtn}>
              <ArrowLeft color={Colors.black} size={22} />
            </TouchableOpacity>
            <View style={styles.searchField}>
              <Search size={16} color={Colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput style={styles.searchInput} placeholder="Search history..." value={searchQuery} onChangeText={setSearchQuery} autoFocus autoCapitalize="none" />
              {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><X size={16} color={Colors.textSecondary} /></TouchableOpacity>}
            </View>
          </View>
        ) : (
          <>
            <View>
              <Text style={styles.headerTitle}>History</Text>
              <Text style={styles.headerSubtitle}>{activities.length} activities logged</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {activities.length > 0 && (
                <TouchableOpacity style={[styles.headerActionBtn, { marginRight: 8 }]} onPress={handleClearAll}>
                  <Text style={{ fontSize: 18 }}>🗑</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.headerActionBtn} onPress={() => setIsSearching(true)}>
                <Search size={20} color={Colors.black} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Date Filter Tabs */}
      <View style={{ marginBottom: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {DATE_FILTER_OPTIONS.map(opt => {
            const isActive = dateFilter === opt.value;
            const label = opt.value === 'custom' && customDate
              ? customDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : opt.label;
            return (
              <TouchableOpacity key={opt.value} onPress={() => handleDateFilterPress(opt.value)} style={[styles.tab, isActive && styles.tabActive]}>
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator color={Colors.black} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filteredActivities}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListHeaderComponent={() => (
            <>
              {filteredActivities.length > 0 && !searchQuery && dateFilter === 'all' && (
                <FeaturedActivity item={filteredActivities[0]} onPress={handleActivityPress} onDelete={handleDelete} />
              )}
              <Text style={styles.sectionTitle}>
                {searchQuery ? 'Search Results' : dateFilter !== 'all' ? 'Filtered Activities' : 'Recent Activity'}
              </Text>
            </>
          )}
          renderItem={({ item, index }) =>
            index === 0 && !searchQuery && dateFilter === 'all' ? null : (
              <ActivityItem item={item} onPress={handleActivityPress} onDelete={handleDelete} />
            )
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ChefHat size={48} color="#CCC" />
              <Text style={styles.emptyText}>
                {searchQuery ? `No history matches "${searchQuery}"` : dateFilter !== 'all' ? 'No activities in this period' : 'No activities recorded yet'}
              </Text>
            </View>
          }
        />
      )}

      <CalendarModal
        visible={calendarModalVisible}
        onClose={() => setCalendarModalVisible(false)}
        currentMonth={currentCalendarMonth}
        onPrevMonth={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1))}
        onNextMonth={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1))}
        selectedDate={customDate}
        onSelectDate={(date) => { setCustomDate(date); setDateFilter('custom'); setCalendarModalVisible(false); }}
        onReset={() => { setCustomDate(null); setDateFilter('all'); setCalendarModalVisible(false); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerContainer: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: Colors.black },
  headerSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  headerActionBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  searchBarContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  searchField: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: '#EEE' },
  searchInput: { flex: 1, height: '100%', fontSize: 15, color: Colors.black },
  tabScroll: { paddingHorizontal: 24, gap: 10, paddingVertical: 4 },
  tab: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#EFEFEF', minWidth: 80, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  tabActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: 'white', fontWeight: '700' },
  list: { paddingHorizontal: 24, paddingBottom: 100 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.black, marginBottom: 16 },
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 16 },
  emptyText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
