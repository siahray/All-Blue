import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator } from 'react-native';
import { Colors } from '../../theme/colors';
import { supabase } from '../../services/supabase';
import { PlusCircle, Utensils, AlertCircle } from 'lucide-react-native';

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
      case 'added': return <PlusCircle size={20} color="#4CAF50" />;
      case 'cooked': return <Utensils size={20} color="#2196F3" />;
      default: return <AlertCircle size={20} color="#FF9800" />;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Activity Log</Text>
      
      {loading ? (
        <ActivityIndicator color="black" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.activityItem}>
              <View style={styles.iconContainer}>{renderActivityIcon(item.type)}</View>
              <View style={styles.textContainer}>
                <Text style={styles.actionText}>
                  {item.type === 'added' ? 'Added to Pantry' : 'Cooked with'}
                </Text>
                <Text style={styles.itemName}>{item.item_name}</Text>
              </View>
              <Text style={styles.timeText}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 60 },
  header: { fontSize: 32, fontWeight: 'bold', marginLeft: 20, marginBottom: 20 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  activityItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    padding: 15, 
    borderRadius: 15, 
    marginBottom: 12,
    elevation: 1
  },
  iconContainer: { marginRight: 15 },
  textContainer: { flex: 1 },
  actionText: { fontSize: 12, color: '#888', textTransform: 'uppercase' },
  itemName: { fontSize: 16, fontWeight: 'bold', color: Colors.black },
  timeText: { fontSize: 12, color: '#BBB' }
});