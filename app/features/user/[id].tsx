import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, Image, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Modal
} from 'react-native';
import { useAppAlert } from '../../../components/common/AppAlert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../../theme/colors';
import { supabase } from '../../../services/supabase';
import { ArrowLeft, BookOpen, Images, Clock, UserCheck, UserPlus, X, Lock, Heart } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - 48 - 8) / 3; // 3 cols, 24px side padding, 4px gaps

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showAlert } = useAppAlert();

  const [profile, setProfile] = useState<any>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [stats, setStats] = useState({ recipes: 0, followers: 0, following: 0, likes: 0 });
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cookbook' | 'gallery' | 'likes'>('cookbook');
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<any>(null);
  const [likedRecipesList, setLikedRecipesList] = useState<any[]>([]);

  useEffect(() => {
    if (id) loadAll();
  }, [id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const meId = session?.user?.id ?? null;
      setCurrentUserId(meId);

      // Fetch viewed user's profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (profileData) setProfile(profileData);

      // Fetch their authored recipes
      const { data: userRecipes } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      const authored = (userRecipes || []).filter(
        (r: any) => !r.source_url && !r.source_name && r.category !== 'web'
      );
      setRecipes(authored);

      // Fetch their liked/saved recipes
      const { data: likesData } = await supabase
        .from('saved_recipes')
        .select('*, recipes(*)')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      const liked = likesData ? likesData.map((item: any) => item.recipes).filter((r: any) => r !== null) : [];
      setLikedRecipesList(liked);

      // Followers / Following counts
      const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id),
      ]);

      // Total likes on their recipes
      let totalLikes = 0;
      if (authored.length > 0) {
        const { count } = await supabase
          .from('saved_recipes')
          .select('*', { count: 'exact', head: true })
          .in('recipe_id', authored.map((r: any) => r.id))
          .neq('user_id', id);
        totalLikes = count || 0;
      }

      setStats({
        recipes: authored.length,
        followers: followersCount || 0,
        following: followingCount || 0,
        likes: totalLikes,
      });

      // Check if current user already follows this profile
      if (meId && meId !== id) {
        const { data: followRow } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', meId)
          .eq('following_id', id)
          .maybeSingle();
        setIsFollowing(!!followRow);
      }
    } catch (e) {
      console.error('User profile load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUserId) { showAlert('Login required', 'Please log in to follow users.'); return; }
    if (currentUserId === id) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', id);
        setIsFollowing(false);
        setStats(s => ({ ...s, followers: Math.max(0, s.followers - 1) }));
      } else {
        await supabase.from('follows').insert({ follower_id: currentUserId, following_id: id });
        setIsFollowing(true);
        setStats(s => ({ ...s, followers: s.followers + 1 }));
      }
    } catch (e) {
      console.error('Follow error:', e);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.black} size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>User not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCenter}>
          <Text style={styles.backBtnCenterText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSelf = currentUserId === id;
  const isPrivate = profile?.is_private && !isSelf && !isFollowing;
  const showLikesTab = isSelf || !profile?.hide_likes;
  const galleryImages = recipes.filter((r: any) => r.image_url);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={Colors.black} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{profile.username}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar & Info */}
        <View style={styles.profileSection}>
          <Image
            source={{ uri: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/png?seed=${profile.username}&size=200` }}
            style={styles.avatar}
          />
          <Text style={styles.fullName}>{profile.full_name || profile.username}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          {/* Follow button (hidden if viewing own profile) */}
          {!isSelf && (
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={handleFollow}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator color={isFollowing ? Colors.black : 'white'} size="small" />
              ) : (
                <>
                  {isFollowing
                    ? <UserCheck size={16} color={Colors.black} />
                    : <UserPlus size={16} color="white" />}
                  <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.recipes}</Text>
            <Text style={styles.statLabel}>Recipes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.likes}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
        </View>

        {isPrivate ? (
          <View style={styles.lockedContainer}>
            <View style={styles.lockIconContainer}>
              <Lock size={36} color={Colors.black} />
            </View>
            <Text style={styles.lockedTitle}>This Account is Private</Text>
            <Text style={styles.lockedDesc}>
              Follow this user to see their cookbook and photos.
            </Text>
          </View>
        ) : (
          <>
            {/* Tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'cookbook' && styles.tabActive]}
                onPress={() => setActiveTab('cookbook')}
              >
                <BookOpen size={18} color={activeTab === 'cookbook' ? 'white' : Colors.black} />
                <Text style={[styles.tabText, activeTab === 'cookbook' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit>Cookbook</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'gallery' && styles.tabActive]}
                onPress={() => setActiveTab('gallery')}
              >
                <Images size={18} color={activeTab === 'gallery' ? 'white' : Colors.black} />
                <Text style={[styles.tabText, activeTab === 'gallery' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit>Gallery</Text>
              </TouchableOpacity>
              {showLikesTab && (
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'likes' && styles.tabActive]}
                  onPress={() => setActiveTab('likes')}
                >
                  <Heart size={18} color={activeTab === 'likes' ? 'white' : Colors.black} />
                  <Text style={[styles.tabText, activeTab === 'likes' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit>Likes</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Cookbook list */}
            {activeTab === 'cookbook' && (
              <View style={styles.recipeList}>
                {recipes.length === 0 ? (
                  <View style={styles.emptyState}>
                    <BookOpen size={44} color="#DDD" />
                    <Text style={styles.emptyText}>No recipes shared yet.</Text>
                  </View>
                ) : (
                  recipes.map((r: any) => (
                    <TouchableOpacity
                      key={r.id}
                      style={styles.recipeCard}
                      onPress={() => router.push(`/features/recipe/${r.id}`)}
                      activeOpacity={0.85}
                    >
                      {r.image_url ? (
                        <Image source={{ uri: r.image_url }} style={styles.recipeThumb} />
                      ) : (
                        <View style={[styles.recipeThumb, styles.recipeThumbPlaceholder]}>
                          <BookOpen size={22} color="#CCC" />
                        </View>
                      )}
                      <View style={styles.recipeBody}>
                        <Text style={styles.recipeTitle} numberOfLines={1}>{r.title}</Text>
                        <View style={styles.recipeMeta}>
                          <Clock size={12} color={Colors.textSecondary} />
                          <Text style={styles.recipeMetaText}>{r.cook_time || '30 min'}</Text>
                          {r.difficulty ? (
                            <View style={styles.diffChip}>
                              <Text style={styles.diffChipText}>{r.difficulty}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Gallery grid */}
            {activeTab === 'gallery' && (
              <View style={styles.galleryGrid}>
                {galleryImages.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Images size={44} color="#DDD" />
                    <Text style={styles.emptyText}>No photos yet.</Text>
                  </View>
                ) : (
                  galleryImages.map((r: any) => (
                    <TouchableOpacity
                      key={r.id}
                      style={styles.gridCell}
                      onPress={() => setSelectedGalleryItem(r)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: r.image_url }} style={styles.gridImage} />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Likes list */}
            {activeTab === 'likes' && showLikesTab && (
              <View style={styles.recipeList}>
                {likedRecipesList.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Heart size={44} color="#DDD" />
                    <Text style={styles.emptyText}>No liked recipes yet.</Text>
                  </View>
                ) : (
                  likedRecipesList.map((r: any) => (
                    <TouchableOpacity
                      key={r.id}
                      style={styles.recipeCard}
                      onPress={() => router.push(`/features/recipe/${r.id}`)}
                      activeOpacity={0.85}
                    >
                      {r.image_url ? (
                        <Image source={{ uri: r.image_url }} style={styles.recipeThumb} />
                      ) : (
                        <View style={[styles.recipeThumb, styles.recipeThumbPlaceholder]}>
                          <BookOpen size={22} color="#CCC" />
                        </View>
                      )}
                      <View style={styles.recipeBody}>
                        <Text style={styles.recipeTitle} numberOfLines={1}>{r.title}</Text>
                        <View style={styles.recipeMeta}>
                          <Clock size={12} color={Colors.textSecondary} />
                          <Text style={styles.recipeMetaText}>{r.cook_time || '30 min'}</Text>
                          {r.difficulty ? (
                            <View style={styles.diffChip}>
                              <Text style={styles.diffChipText}>{r.difficulty}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Gallery Image Overlay Modal */}
      <Modal
        visible={!!selectedGalleryItem}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedGalleryItem(null)}
      >
        <View style={styles.galleryOverlay}>
          <TouchableOpacity 
            style={styles.closeGalleryOverlayButton} 
            onPress={() => setSelectedGalleryItem(null)}
          >
            <X size={28} color="white" />
          </TouchableOpacity>
          {selectedGalleryItem && (
            <View style={styles.galleryOverlayImageContainer}>
              <Image 
                source={{ uri: selectedGalleryItem.image_url }} 
                style={styles.galleryOverlayImage} 
                resizeMode="contain"
              />
              <View style={styles.galleryOverlayTextContainer}>
                <Text style={styles.galleryOverlayText}>{selectedGalleryItem.title}</Text>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  errorText: { fontSize: 16, color: Colors.textSecondary, marginBottom: 16 },
  backBtnCenter: { backgroundColor: Colors.black, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 20 },
  backBtnCenterText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, backgroundColor: Colors.background },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.black },

  // Profile section
  profileSection: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F0F0F0', marginBottom: 14 },
  fullName: { fontSize: 22, fontWeight: 'bold', color: Colors.black },
  username: { fontSize: 14, color: Colors.textSecondary, marginTop: 2, marginBottom: 8 },
  bio: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20, marginBottom: 16, paddingHorizontal: 16 },

  // Follow button
  followBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.black, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 20, marginTop: 8 },
  followBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  followingBtn: { backgroundColor: 'white', borderWidth: 1.5, borderColor: '#E0E0E0' },
  followingBtnText: { color: Colors.black },

  // Stats
  statsRow: { flexDirection: 'row', backgroundColor: 'white', marginHorizontal: 24, borderRadius: 20, padding: 16, justifyContent: 'space-around', borderWidth: 1, borderColor: '#F0F0F0' },
  statItem: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 20, fontWeight: 'bold', color: Colors.black },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: '#F0F0F0' },

  // Tabs
  tabs: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 24, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 24, backgroundColor: 'white' },
  tabActive: { backgroundColor: Colors.black },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.black },
  tabTextActive: { color: 'white', fontWeight: 'bold' },

  // Recipe list
  recipeList: { paddingHorizontal: 24, marginTop: 16 },
  recipeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 18, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0' },
  recipeThumb: { width: 80, height: 80 },
  recipeThumbPlaceholder: { backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  recipeBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  recipeTitle: { fontSize: 15, fontWeight: '700', color: Colors.black },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recipeMetaText: { fontSize: 12, color: Colors.textSecondary },
  diffChip: { backgroundColor: '#F0F0F0', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8 },
  diffChipText: { fontSize: 11, fontWeight: '600', color: '#555' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },

  // Gallery grid
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24, marginTop: 16, gap: 4 },
  gridCell: { width: GRID_SIZE, height: GRID_SIZE, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F0F0F0' },
  gridImage: { width: '100%', height: '100%' },

  // Gallery Overlay
  galleryOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeGalleryOverlayButton: { position: 'absolute', top: 60, right: 24, zIndex: 10, padding: 8 },
  galleryOverlayImageContainer: { width: '100%', height: '70%', justifyContent: 'center', alignItems: 'center' },
  galleryOverlayImage: { width: '100%', height: '100%' },
  galleryOverlayTextContainer: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', padding: 16, borderRadius: 12 },
  galleryOverlayText: { color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  lockedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 40,
    marginTop: 20,
  },
  lockIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EFEFEF',
    marginBottom: 16,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 8,
  },
  lockedDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
