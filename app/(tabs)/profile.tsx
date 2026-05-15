import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/colors';
import { supabase } from '../../services/supabase';
import { Settings, LogOut, ChevronRight, Award, BookOpen, Heart, Clock } from 'lucide-react-native';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cookbook' | 'likes'>('cookbook');
  const [likedRecipes, setLikedRecipes] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchProfileAndData();
  }, []);

  const fetchProfileAndData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data);

        const { data: likesData } = await supabase
          .from('saved_recipes')
          .select('*, recipes(*)')
          .eq('user_id', user.id);
          
        if (likesData) {
          // Flatten out the relation
          const recipes = likesData.map(item => item.recipes).filter(r => r !== null);
          setLikedRecipes(recipes);
        }
      }
    } catch (error) {
      console.log('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' }} 
              style={styles.avatar} 
            />
          </View>
          <View style={styles.profileInfo}>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ alignSelf: 'flex-start' }} />
            ) : (
              <>
                <Text style={styles.name}>@{profile?.username || 'chef_master'}</Text>
                <Text style={styles.title}>{profile?.full_name || 'Master of Spice'}</Text>
              </>
            )}
          </View>
          <TouchableOpacity style={styles.settingsButton}>
            <Settings color={Colors.black} size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Recipes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>48</Text>
            <Text style={styles.statLabel}>Cooked</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>85%</Text>
            <Text style={styles.statLabel}>Success</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'cookbook' && styles.activeTab]}
          onPress={() => setActiveTab('cookbook')}
        >
          <BookOpen size={20} color={activeTab === 'cookbook' ? Colors.black : Colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'cookbook' && styles.activeTabText]}>Cookbook</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'likes' && styles.activeTab]}
          onPress={() => setActiveTab('likes')}
        >
          <Heart size={20} color={activeTab === 'likes' ? Colors.black : Colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'likes' && styles.activeTabText]}>Likes</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContent}>
        {activeTab === 'cookbook' ? (
          <View style={styles.section}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Award size={20} color={Colors.black} />
                <Text style={styles.menuItemText}>Achievements</Text>
              </View>
              <ChevronRight size={20} color="#CCC" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LogOut size={20} color="#FF5252" />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            {likedRecipes.length === 0 ? (
              <View style={styles.emptyState}>
                <Heart size={48} color={Colors.border} />
                <Text style={styles.emptyStateText}>No liked recipes yet.</Text>
                <Text style={styles.emptyStateSub}>Tap the heart icon on a recipe to save it here!</Text>
              </View>
            ) : (
              likedRecipes.map((recipe) => (
                <TouchableOpacity 
                  key={recipe.id} 
                  style={styles.recipeCard}
                  onPress={() => router.push(`/features/recipe/${recipe.id}`)}
                >
                  <Image source={{ uri: recipe.image_url }} style={styles.recipeImage} />
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeTitle}>{recipe.title}</Text>
                    <View style={styles.recipeMeta}>
                      <Clock size={14} color={Colors.textSecondary} />
                      <Text style={styles.recipeTime}>{recipe.cook_time_minutes} mins</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color="#CCC" />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F5F5',
    padding: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.black,
  },
  title: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  settingsButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.black,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#EEE',
    alignSelf: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 20,
    paddingHorizontal: 24,
    gap: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: Colors.accentGold,
  },
  tabText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.black,
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
  },
  section: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.black,
    marginLeft: 12,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FFEAEA',
    borderRadius: 16,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF5252',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.black,
    marginTop: 16,
  },
  emptyStateSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  recipeImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  recipeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 4,
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipeTime: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
