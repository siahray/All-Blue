import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../../theme/colors';
import { X } from 'lucide-react-native';

interface AchievementsModalProps {
  visible: boolean;
  onClose: () => void;
  stats: { recipes: number; following: number; followers: number; totalLikes: number };
  likedRecipesCount: number;
}

export const AchievementsModal = ({ visible, onClose, stats, likedRecipesCount }: AchievementsModalProps) => {
  const achievements = [
    { emoji: '👨‍🍳', title: 'First Recipe', desc: 'Create your first recipe', unlocked: stats.recipes >= 1, progress: Math.min(stats.recipes, 1), target: 1 },
    { emoji: '📖', title: 'Recipe Collector', desc: 'Create 5 recipes', unlocked: stats.recipes >= 5, progress: Math.min(stats.recipes, 5), target: 5 },
    { emoji: '🍳', title: 'Master Chef', desc: 'Create 20 recipes', unlocked: stats.recipes >= 20, progress: Math.min(stats.recipes, 20), target: 20 },
    { emoji: '❤️', title: 'First Like', desc: 'Get your first like', unlocked: stats.totalLikes >= 1, progress: Math.min(stats.totalLikes, 1), target: 1 },
    { emoji: '🔥', title: 'Trending Chef', desc: 'Get 10 likes', unlocked: stats.totalLikes >= 10, progress: Math.min(stats.totalLikes, 10), target: 10 },
    { emoji: '⭐', title: 'Superstar', desc: 'Get 50 likes', unlocked: stats.totalLikes >= 50, progress: Math.min(stats.totalLikes, 50), target: 50 },
    { emoji: '🤝', title: 'Social Butterfly', desc: 'Follow 5 chefs', unlocked: stats.following >= 5, progress: Math.min(stats.following, 5), target: 5 },
    { emoji: '👥', title: 'Community Leader', desc: 'Gain 10 followers', unlocked: stats.followers >= 10, progress: Math.min(stats.followers, 10), target: 10 },
    { emoji: '💎', title: 'Diamond Chef', desc: 'Gain 50 followers', unlocked: stats.followers >= 50, progress: Math.min(stats.followers, 50), target: 50 },
    { emoji: '🌟', title: 'Rising Star', desc: 'Follow 1 chef & create 1 recipe', unlocked: stats.following >= 1 && stats.recipes >= 1, progress: (stats.following >= 1 ? 1 : 0) + (stats.recipes >= 1 ? 1 : 0), target: 2 },
    { emoji: '🎯', title: 'Food Explorer', desc: 'Save 10 recipes to likes', unlocked: likedRecipesCount >= 10, progress: Math.min(likedRecipesCount, 10), target: 10 },
    { emoji: '🏅', title: 'All-Rounder', desc: 'Create 10 recipes, 5 followers, 20 likes', unlocked: stats.recipes >= 10 && stats.followers >= 5 && stats.totalLikes >= 20, progress: (stats.recipes >= 10 ? 1 : 0) + (stats.followers >= 5 ? 1 : 0) + (stats.totalLikes >= 20 ? 1 : 0), target: 3 },
  ];
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '85%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🏆 Achievements</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={Colors.black} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.summaryCard}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🏆</Text>
              <Text style={styles.summaryCount}>{unlockedCount} / {achievements.length}</Text>
              <Text style={styles.summaryLabel}>Achievements Unlocked</Text>
              <View style={styles.summaryBar}>
                <View style={[styles.summaryFill, { width: `${(unlockedCount / achievements.length) * 100}%` }]} />
              </View>
            </View>
            {achievements.map((a, i) => (
              <View key={i} style={[styles.achievementRow, { opacity: a.unlocked ? 1 : 0.45, borderBottomWidth: i < achievements.length - 1 ? 1 : 0 }]}>
                <View style={[styles.emojiBox, { backgroundColor: a.unlocked ? '#FFF9E6' : '#f5f5f5' }]}>
                  <Text style={{ fontSize: 24 }}>{a.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.achTitle}>{a.title}</Text>
                    {a.unlocked && <Text style={{ fontSize: 12 }}>✅</Text>}
                  </View>
                  <Text style={styles.achDesc}>{a.desc}</Text>
                  {!a.unlocked && (
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${(a.progress / a.target) * 100}%` }]} />
                    </View>
                  )}
                </View>
                <Text style={styles.achCount}>{a.progress}/{a.target}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.black },
  modalBody: { padding: 24 },
  summaryCard: { backgroundColor: Colors.black, borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'center' },
  summaryCount: { color: 'white', fontSize: 22, fontWeight: '800' },
  summaryLabel: { color: '#aaa', fontSize: 13, marginTop: 4 },
  summaryBar: { width: '100%', height: 6, backgroundColor: '#333', borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  summaryFill: { height: '100%', backgroundColor: Colors.accentGold || '#FFD700', borderRadius: 3 },
  achievementRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomColor: '#f0f0f0' },
  emojiBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  achTitle: { fontSize: 15, fontWeight: '700', color: Colors.black },
  achDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  progressBar: { width: '100%', height: 4, backgroundColor: '#eee', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.accentGold || '#FFD700', borderRadius: 2 },
  achCount: { fontSize: 12, color: '#aaa', fontWeight: '600', marginLeft: 8 },
});

export default AchievementsModal;
