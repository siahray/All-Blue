import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useAppAlert } from '../../../components/common/AppAlert';
import { useRouter, useNavigation } from 'expo-router';
import { Colors } from '../../../theme/colors';
import { supabase, withTimeout } from '../../../services/supabase';
import { Settings, Award, BookOpen, Heart, Clock, Image as ImageIcon, X, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsModal } from './SettingsModal';
import { EditProfileModal } from './EditProfileModal';
import { PrivacyModal } from './PrivacyModal';
import { AboutModal } from './AboutModal';
import { AchievementsModal } from './AchievementsModal';
import { FollowsModal } from './FollowsModal';
import { GalleryImageModal, ImagePickerModal } from './GalleryModals';

WebBrowser.maybeCompleteAuthSession();

export default function ProfileScreen() {
  const { showAlert } = useAppAlert();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cookbook' | 'likes' | 'gallery'>('cookbook');
  const [likedRecipes, setLikedRecipes] = useState<any[]>([]);
  const [stats, setStats] = useState({ recipes: 0, following: 0, followers: 0, totalLikes: 0 });
  const [myRecipes, setMyRecipes] = useState<any[]>([]);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
  const [isAboutVisible, setIsAboutVisible] = useState(false);
  const [editData, setEditData] = useState({ full_name: '', username: '', avatar_url: '' });
  const [selectedAvatarUri, setSelectedAvatarUri] = useState<string | null>(null);
  const [isImagePickerVisible, setIsImagePickerVisible] = useState(false);
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<any>(null);
  const [oauthAvatarUrl, setOauthAvatarUrl] = useState<string | null>(null);
  const [isPrivacyVisible, setIsPrivacyVisible] = useState(false);
  const [identities, setIdentities] = useState<any[]>([]);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [isPrivateState, setIsPrivateState] = useState(false);
  const [hideLikesState, setHideLikesState] = useState(false);
  const [isAchievementsVisible, setIsAchievementsVisible] = useState(false);
  const [isFollowsModalVisible, setIsFollowsModalVisible] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');
  const [followList, setFollowList] = useState<any[]>([]);
  const [loadingFollows, setLoadingFollows] = useState(false);
  const [hasNewFollowers, setHasNewFollowers] = useState(false);
  const [newFollowerIds, setNewFollowerIds] = useState<string[]>([]);
  const router = useRouter();
  const isFetchingRef = useRef(false);
  const navigation = useNavigation();

  useEffect(() => {
    const trigger = (user: any) => {
      if (user) { setOauthAvatarUrl(user.user_metadata?.avatar_url || user.user_metadata?.picture || null); fetchProfileAndData(user); }
      else { setProfile(null); setOauthAvatarUrl(null); setLoading(false); }
    };
    supabase.auth.getSession().then(({ data: { session } }) => trigger(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => trigger(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) { setOauthAvatarUrl(session.user.user_metadata?.avatar_url || null); fetchProfileAndData(session.user); }
      });
    });
    return unsub;
  }, [navigation]);

  useEffect(() => { if (isPrivacyVisible) fetchIdentities(); }, [isPrivacyVisible]);

  const fetchProfileAndData = async (user: any) => {
    if (!user || isFetchingRef.current) return;
    isFetchingRef.current = true; setLoading(true);
    try {
      const { data: profileData } = await withTimeout(supabase.from('profiles').select('*').eq('id', user.id).single()) as any;
      if (profileData) { setProfile(profileData); setIsPrivateState(profileData.is_private || false); setHideLikesState(profileData.hide_likes || false); }
      const { data: likesData } = await withTimeout(supabase.from('saved_recipes').select('*, recipes(*)').eq('user_id', user.id).order('created_at', { ascending: false })) as any;
      const allLiked = likesData ? likesData.map((i: any) => i.recipes).filter(Boolean) : [];
      const { data: userRecipes } = await withTimeout(supabase.from('recipes').select('*').eq('user_id', user.id).order('created_at', { ascending: false })) as any;
      const authored = userRecipes ? userRecipes.filter((r: any) => !r.source_url && !r.source_name && r.category !== 'web' && r.category !== 'Filipino') : [];
      setMyRecipes(authored); setLikedRecipes(allLiked);
      const [fwing, fwers] = await Promise.all([
        withTimeout(supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id)) as any,
        withTimeout(supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id)) as any,
      ]);
      let totalLikes = 0;
      if (authored.length > 0) {
        const { count } = await withTimeout(supabase.from('saved_recipes').select('*', { count: 'exact', head: true }).in('recipe_id', authored.map((r: any) => r.id)).neq('user_id', user.id)) as any;
        totalLikes = count || 0;
      }
      setStats({ recipes: authored.length, following: fwing.count || 0, followers: fwers.count || 0, totalLikes });
      const { data: followersList } = await withTimeout(supabase.from('follows').select('follower_id').eq('following_id', user.id)) as any;
      if (followersList) {
        const currentIds = followersList.map((f: any) => f.follower_id);
        const seenRaw = await AsyncStorage.getItem(`@allblue:seen_followers:${user.id}`);
        const seen = seenRaw ? JSON.parse(seenRaw) : [];
        const newIds = currentIds.filter((id: string) => !seen.includes(id));
        setHasNewFollowers(newIds.length > 0); setNewFollowerIds(newIds);
      }
    } catch (e) { console.error('Profile fetch error:', e); }
    finally { setLoading(false); isFetchingRef.current = false; }
  };

  const handleOpenFollows = async (type: 'followers' | 'following') => {
    setFollowModalType(type); setIsFollowsModalVisible(true); setLoadingFollows(true); setFollowList([]);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user; if (!user) return;
    try {
      if (type === 'followers') {
        const { data } = await supabase.from('follows').select('follower_id').eq('following_id', user.id);
        if (data?.length) { const { data: profiles } = await supabase.from('profiles').select('*').in('id', data.map(d => d.follower_id)); if (profiles) setFollowList(profiles); }
      } else {
        const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
        if (data?.length) { const { data: profiles } = await supabase.from('profiles').select('*').in('id', data.map(d => d.following_id)); if (profiles) setFollowList(profiles); }
      }
    } catch (e) { console.error(e); } finally { setLoadingFollows(false); }
  };

  const fetchIdentities = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.identities) setIdentities(user.identities);
  };

  const handleLinkIdentity = async (provider: 'google' | 'facebook') => {
    setLinkingProvider(provider);
    try {
      const { data, error } = await supabase.auth.linkIdentity({ provider, options: { redirectTo: 'allblue://auth', skipBrowserRedirect: true } });
      if (error) throw error;
      if (data?.url) { await WebBrowser.openAuthSessionAsync(data.url, 'allblue://auth'); await fetchIdentities(); }
    } catch (e: any) { showAlert('Link Error', e.message || 'Something went wrong.'); }
    finally { setLinkingProvider(null); }
  };

  const uploadAvatar = async (uri: string, userId: string): Promise<string | null> => {
    try {
      const ext = uri.split('.').pop() || 'jpg';
      const fileName = `${userId}/${Date.now()}.${ext}`;
      const blob = await (await fetch(uri)).blob();
      const buf = await new Response(blob).arrayBuffer();
      const { error } = await supabase.storage.from('avatars').upload(fileName, buf, { contentType: `image/${ext}`, upsert: true });
      if (error) { const fb = await supabase.storage.from('recipe-images').upload(`avatars/${fileName}`, buf, { contentType: `image/${ext}`, upsert: true }); if (fb.error) return null; return supabase.storage.from('recipe-images').getPublicUrl(`avatars/${fileName}`).data.publicUrl; }
      return supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
    } catch { return null; }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user; if (!user) return;
    let finalAvatar = editData.avatar_url;
    if (selectedAvatarUri) { const up = await uploadAvatar(selectedAvatarUri, user.id); if (up) finalAvatar = up; }
    const { error } = await supabase.from('profiles').update({ full_name: editData.full_name, username: editData.username, avatar_url: finalAvatar }).eq('id', user.id);
    if (error) showAlert('Error', 'Failed to update profile.');
    else { setProfile({ ...profile, full_name: editData.full_name, username: editData.username, avatar_url: finalAvatar }); setIsEditProfileVisible(false); }
    setLoading(false);
  };

  const handlePickImage = async (useCamera: boolean) => {
    setIsImagePickerVisible(false);
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setSelectedAvatarUri(result.assets[0].uri);
  };

  const handleUnlike = async (recipeId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user; if (!user) return;
    await supabase.from('saved_recipes').delete().eq('user_id', user.id).eq('recipe_id', recipeId);
    setLikedRecipes(prev => prev.filter(r => r.id !== recipeId));
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: profile?.avatar_url || oauthAvatarUrl || 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix&size=200' }} style={styles.avatar} />
            </View>
            <View style={styles.profileInfo}>
              {loading ? <ActivityIndicator size="small" color={Colors.accentGold} style={{ alignSelf: 'flex-start' }} /> : (
                <><Text style={styles.name}>@{profile?.username || 'chef_master'}</Text><Text style={styles.title}>{profile?.full_name || 'Master of Spice'}</Text></>
              )}
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => setIsAchievementsVisible(true)}><Award color={Colors.black} size={22} /></TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => setIsSettingsVisible(true)}><Settings color={Colors.black} size={22} /></TouchableOpacity>
            </View>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}><Text style={styles.statNumber}>{stats.recipes}</Text><Text style={styles.statLabel}>Recipes</Text></View>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => handleOpenFollows('following')}><Text style={styles.statNumber}>{stats.following}</Text><Text style={styles.statLabel}>Following</Text></TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => handleOpenFollows('followers')}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={styles.statNumber}>{stats.followers}</Text>{hasNewFollowers && <View style={styles.newFollowerDot} />}</View>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <View style={styles.statItem}><Text style={styles.statNumber}>{stats.totalLikes}</Text><Text style={styles.statLabel}>Likes</Text></View>
          </View>
        </View>

        <View style={styles.tabContainer}>
          {(['cookbook', 'likes', 'gallery'] as const).map(tab => {
            const icon = tab === 'cookbook' ? <BookOpen size={18} color={activeTab === tab ? 'white' : Colors.black} /> : tab === 'likes' ? <Heart size={18} color={activeTab === tab ? 'white' : Colors.black} /> : <ImageIcon size={18} color={activeTab === tab ? 'white' : Colors.black} />;
            const label = tab === 'cookbook' ? 'Cookbook' : tab === 'likes' ? 'Likes' : 'Gallery';
            return (
              <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}>
                {icon}<Text style={[styles.tabText, activeTab === tab && styles.activeTabText]} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.tabContent}>
          {activeTab === 'gallery' && (
            <View style={styles.galleryGrid}>
              {myRecipes.length === 0 ? (
                <View style={[styles.emptyState, { width: '100%' }]}><ImageIcon size={48} color="#CCC" /><Text style={styles.emptyStateText}>No photos yet.</Text></View>
              ) : myRecipes.map((r, i) => (
                <TouchableOpacity key={i} style={styles.galleryItem} onPress={() => setSelectedGalleryItem(r)}>
                  <Image source={{ uri: r.image_url }} style={styles.galleryImage} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          {activeTab === 'cookbook' && (
            <View style={styles.section}>
              {myRecipes.length === 0 ? (
                <View style={styles.emptyState}>
                  <BookOpen size={48} color="#CCC" /><Text style={styles.emptyStateText}>Your Cookbook is empty.</Text>
                  <Text style={styles.emptyStateSub}>Share your first recipe and it will appear here!</Text>
                  <TouchableOpacity style={styles.emptyStateCTA} onPress={() => router.push('/(tabs)/cook')}><Text style={styles.emptyStateCTAText}>+ Create a Recipe</Text></TouchableOpacity>
                </View>
              ) : myRecipes.map(recipe => (
                <TouchableOpacity key={recipe.id} style={styles.cookbookCard} onPress={() => router.push(`/features/recipe/${recipe.id.toString()}`)} activeOpacity={0.85}>
                  {recipe.image_url ? <Image source={{ uri: recipe.image_url }} style={styles.cookbookThumb} /> : <View style={[styles.cookbookThumb, styles.cookbookThumbPlaceholder]}><BookOpen size={26} color="#CCC" /></View>}
                  <View style={styles.cookbookBody}>
                    <Text style={styles.cookbookTitle} numberOfLines={1}>{recipe.title}</Text>
                    <View style={styles.cookbookChips}>
                      {recipe.category && <View style={styles.cookbookChip}><Text style={styles.cookbookChipText}>{recipe.category}</Text></View>}
                      {recipe.difficulty && <View style={[styles.cookbookChip, styles.cookbookChipDiff]}><Text style={styles.cookbookChipText}>{recipe.difficulty}</Text></View>}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Clock size={12} color={Colors.textSecondary} /><Text style={styles.recipeTime}>{recipe.cook_time || '30 min'}</Text></View>
                  </View>
                  <TouchableOpacity style={styles.cookbookDelete} onPress={() => showAlert('Delete Recipe', `Remove "${recipe.title}"?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('recipes').delete().eq('id', recipe.id); setMyRecipes(p => p.filter(r => r.id !== recipe.id)); setStats(p => ({ ...p, recipes: Math.max(0, p.recipes - 1) })); } }])}>
                    <X size={16} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {activeTab === 'likes' && (
            <View style={styles.section}>
              {likedRecipes.length === 0 ? (
                <View style={styles.emptyState}><Heart size={48} color="#CCC" /><Text style={styles.emptyStateText}>No liked recipes yet.</Text><Text style={styles.emptyStateSub}>Tap the heart icon on a recipe to save it here!</Text></View>
              ) : likedRecipes.map(recipe => (
                <TouchableOpacity key={recipe.id} style={styles.recipeCard} onPress={() => router.push(`/features/recipe/${recipe.id.toString()}`)}>
                  <Image source={{ uri: recipe.image_url }} style={styles.recipeImage} />
                  <View style={styles.recipeInfo}><Text style={styles.recipeTitle}>{recipe.title}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Clock size={14} color={Colors.textSecondary} /><Text style={styles.recipeTime}>{recipe.cook_time || '30 min'}</Text></View></View>
                  <TouchableOpacity style={{ padding: 8 }} onPress={() => handleUnlike(recipe.id)}><Heart size={20} color="#FF5252" fill="#FF5252" /></TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      <SettingsModal
        visible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
        onEditProfile={() => { setEditData({ full_name: profile?.full_name || '', username: profile?.username || '', avatar_url: profile?.avatar_url || '' }); setSelectedAvatarUri(null); setIsSettingsVisible(false); setIsEditProfileVisible(true); }}
        onPrivacy={() => { setIsSettingsVisible(false); setIsPrivacyVisible(true); }}
        onAbout={() => { setIsSettingsVisible(false); setIsAboutVisible(true); }}
        onLogout={async () => { setIsSettingsVisible(false); await supabase.auth.signOut(); }}
      />
      <EditProfileModal visible={isEditProfileVisible} onClose={() => setIsEditProfileVisible(false)} editData={editData} setEditData={setEditData} selectedAvatarUri={selectedAvatarUri} oauthAvatarUrl={oauthAvatarUrl} loading={loading} onSave={handleUpdateProfile} onChangePhoto={() => setIsImagePickerVisible(true)} />
      <PrivacyModal visible={isPrivacyVisible} onClose={() => setIsPrivacyVisible(false)} identities={identities} linkingProvider={linkingProvider} isPrivate={isPrivateState} hideLikes={hideLikesState} onTogglePrivate={async (v) => { setIsPrivateState(v); const { data: { session } } = await supabase.auth.getSession(); if (session?.user) await supabase.from('profiles').update({ is_private: v }).eq('id', session.user.id); }} onToggleHideLikes={async (v) => { setHideLikesState(v); const { data: { session } } = await supabase.auth.getSession(); if (session?.user) await supabase.from('profiles').update({ hide_likes: v }).eq('id', session.user.id); }} onLinkIdentity={handleLinkIdentity} />
      <AboutModal visible={isAboutVisible} onClose={() => setIsAboutVisible(false)} />
      <AchievementsModal visible={isAchievementsVisible} onClose={() => setIsAchievementsVisible(false)} stats={stats} likedRecipesCount={likedRecipes.length} />
      <FollowsModal visible={isFollowsModalVisible} onClose={() => setIsFollowsModalVisible(false)} type={followModalType} followList={followList} loading={loadingFollows} newFollowerIds={newFollowerIds} onClearFollowerId={(id) => setNewFollowerIds(p => p.filter(x => x !== id))} userId={profile?.id} />
      <GalleryImageModal item={selectedGalleryItem} onClose={() => setSelectedGalleryItem(null)} />
      <ImagePickerModal visible={isImagePickerVisible} onClose={() => setIsImagePickerVisible(false)} onCamera={() => handlePickImage(true)} onGallery={() => handlePickImage(false)} onRestore={() => { setSelectedAvatarUri(null); setEditData(p => ({ ...p, avatar_url: oauthAvatarUrl || '' })); setIsImagePickerVisible(false); }} canRestore={selectedAvatarUri !== null || (editData.avatar_url !== '' && editData.avatar_url !== oauthAvatarUrl)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.surface, paddingTop: 60, paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 2 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 30 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F5F5F5', padding: 2 },
  avatar: { width: '100%', height: '100%', borderRadius: 38 },
  profileInfo: { flex: 1, marginLeft: 20 },
  name: { fontSize: 24, fontWeight: 'bold', color: Colors.black },
  title: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8F8F8', justifyContent: 'center', alignItems: 'center' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 24 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: Colors.black },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: '#EEE', alignSelf: 'center' },
  newFollowerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D4F', marginLeft: 6, alignSelf: 'center' },
  tabContainer: { flexDirection: 'row', marginTop: 20, paddingHorizontal: 16, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6, borderRadius: 24, backgroundColor: 'white' },
  activeTab: { backgroundColor: Colors.black },
  tabText: { fontSize: 14, color: Colors.black, fontWeight: '600' },
  activeTabText: { color: 'white', fontWeight: 'bold' },
  tabContent: { flex: 1 },
  section: { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyStateText: { fontSize: 18, fontWeight: 'bold', color: Colors.black, marginTop: 16 },
  emptyStateSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  emptyStateCTA: { marginTop: 16, backgroundColor: Colors.black, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 20 },
  emptyStateCTAText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  cookbookCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 18, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0' },
  cookbookThumb: { width: 80, height: 80 },
  cookbookThumbPlaceholder: { backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  cookbookBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  cookbookTitle: { fontSize: 15, fontWeight: '700', color: Colors.black },
  cookbookChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  cookbookChip: { backgroundColor: '#F0F0F0', borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8 },
  cookbookChipDiff: { backgroundColor: '#E8F5E9' },
  cookbookChipText: { fontSize: 11, fontWeight: '600', color: '#555' },
  cookbookDelete: { padding: 16, justifyContent: 'center', alignItems: 'center' },
  recipeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 12, marginBottom: 12 },
  recipeImage: { width: 60, height: 60, borderRadius: 12 },
  recipeInfo: { flex: 1, marginLeft: 12 },
  recipeTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.black, marginBottom: 4 },
  recipeTime: { fontSize: 13, color: Colors.textSecondary },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 100, gap: 8 },
  galleryItem: { width: '31%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.surface },
  galleryImage: { width: '100%', height: '100%' },
});
