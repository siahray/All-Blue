import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { Colors } from '../../theme/colors';
import { supabase } from '../../services/supabase';
import { PlusCircle, Utensils, AlertCircle, Search, ArrowRight, Heart } from 'lucide-react-native';

export default function ActivitiesScreen() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  async function fetchActivities() {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setActivities(data || []);
    setLoading(false);
  }

  const renderActivityIcon = (type: string) => {
    switch (type) {
      case 'added': return <PlusCircle size={20} color={Colors.accentGold} />;
      case 'cooked': return <Utensils size={20} color="#2196F3" />;
      default: return <AlertCircle size={20} color={Colors.accentRed} />;
    }
  };

  const Header = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.header}>History</Text>
      <TouchableOpacity style={styles.searchButton}>
        <Search size={22} color={Colors.black} />
      </TouchableOpacity>
    </View>
  );

  const FeaturedActivity = ({ item }: { item: any }) => (
    <View style={styles.featuredCard}>
      <View style={styles.featuredContent}>
        <View style={styles.featuredIconContainer}>
          {renderActivityIcon(item.type)}
        </View>
        <View style={styles.featuredTextContainer}>
          <Text style={styles.featuredLabel}>LATEST ACTIVITY</Text>
          <Text style={styles.featuredTitle}>{item.item_name}</Text>
          <Text style={styles.featuredSubtext}>
            {item.type === 'added' ? 'Added to your digital pantry' : 'Used in a recent dish'}
          </Text>
        </View>
        <TouchableOpacity style={styles.featuredArrow}>
          <ArrowRight size={18} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const ActivityItem = ({ item }: { item: any }) => (
    <View style={styles.activityItem}>
      <View style={[styles.iconBadge, { backgroundColor: item.type === 'added' ? '#E8F5E9' : '#E3F2FD' }]}>
        {renderActivityIcon(item.type)}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.actionText}>
          {item.type === 'added' ? 'Added to Pantry' : 'Cooked with'}
        </Text>
        <Text style={styles.itemName}>{item.item_name}</Text>
      </View>
      <Text style={styles.timeText}>
        {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header />
      
      {loading ? (
        <ActivityIndicator color={Colors.black} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={() => (
            <>
              {activities.length > 0 && <FeaturedActivity item={activities[0]} />}
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </>
          )}
          renderItem={({ item, index }) => (
            index === 0 ? null : <ActivityItem item={item} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No activities yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40 
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  header: { 
    fontSize: 42, 
    fontWeight: '700', 
    color: Colors.black,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  list: { 
    paddingHorizontal: 24, 
    paddingBottom: 100 
  },
  featuredCard: {
    backgroundColor: Colors.black,
    borderRadius: 28,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  featuredContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featuredTextContainer: {
    flex: 1,
  },
  featuredLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  featuredTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  featuredSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  featuredArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
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
    elevation: 2
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: { flex: 1 },
  actionText: { 
    fontSize: 11, 
    color: Colors.textSecondary, 
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  itemName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: Colors.black 
  },
  timeText: { 
    fontSize: 12, 
    color: '#999',
    fontWeight: '600'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
  }
});