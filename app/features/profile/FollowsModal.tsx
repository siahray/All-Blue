import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { Colors } from '../../../theme/colors';
import { X, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FollowsModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'followers' | 'following';
  followList: any[];
  loading: boolean;
  newFollowerIds: string[];
  onClearFollowerId: (id: string) => void;
  userId?: string;
}

export const FollowsModal = ({
  visible, onClose, type, followList, loading, newFollowerIds, onClearFollowerId, userId,
}: FollowsModalProps) => {
  const router = useRouter();

  const handleView = async (item: any) => {
    if (type === 'followers') {
      onClearFollowerId(item.id);
      if (userId) {
        const raw = await AsyncStorage.getItem(`@allblue:seen_followers:${userId}`);
        const seen: string[] = raw ? JSON.parse(raw) : [];
        if (!seen.includes(item.id)) {
          await AsyncStorage.setItem(`@allblue:seen_followers:${userId}`, JSON.stringify([...seen, item.id]));
        }
      }
    }
    onClose();
    router.push(`/features/user/${item.id}`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { height: '80%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{type === 'followers' ? 'Followers' : 'Following'}</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={Colors.black} /></TouchableOpacity>
          </View>
          <View style={[styles.modalBody, { flex: 1 }]}>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.black} style={{ marginTop: 40 }} />
            ) : followList.length === 0 ? (
              <View style={styles.emptyState}>
                <User size={48} color="#DDD" />
                <Text style={styles.emptyStateText}>
                  {type === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={followList}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.followItem}>
                    <Image source={{ uri: item.avatar_url || `https://api.dicebear.com/7.x/avataaars/png?seed=${item.id}&size=200` }} style={styles.followAvatar} />
                    <View style={styles.followInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.followName}>{item.full_name || 'Chef'}</Text>
                        {type === 'followers' && newFollowerIds.includes(item.id) && <View style={styles.newDot} />}
                      </View>
                      <Text style={styles.followUsername}>@{item.username || 'user'}</Text>
                    </View>
                    <TouchableOpacity style={styles.followActionBtn} onPress={() => handleView(item)}>
                      <Text style={styles.followActionText}>View</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.black },
  modalBody: { padding: 24 },
  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyStateText: { fontSize: 18, fontWeight: 'bold', color: Colors.black, marginTop: 16 },
  followItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  followAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F5F5F5' },
  followInfo: { flex: 1, marginLeft: 12 },
  followName: { fontSize: 16, fontWeight: 'bold', color: Colors.black },
  followUsername: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  followActionBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F0F0F0', borderRadius: 20 },
  followActionText: { fontSize: 14, fontWeight: 'bold', color: Colors.black },
  newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D4F' },
});
