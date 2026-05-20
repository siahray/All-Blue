import React from 'react';
import {
  StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView,
  ActivityIndicator, Switch, Platform, Image,
} from 'react-native';
import { Colors } from '../../../theme/colors';
import { X } from 'lucide-react-native';
import { FontAwesome } from '@expo/vector-icons';

interface PrivacyModalProps {
  visible: boolean;
  onClose: () => void;
  identities: any[];
  linkingProvider: string | null;
  isPrivate: boolean;
  hideLikes: boolean;
  onTogglePrivate: (v: boolean) => void;
  onToggleHideLikes: (v: boolean) => void;
  onLinkIdentity: (provider: 'google' | 'facebook') => void;
}

export const PrivacyModal = ({
  visible, onClose, identities, linkingProvider,
  isPrivate, hideLikes, onTogglePrivate, onToggleHideLikes, onLinkIdentity,
}: PrivacyModalProps) => {
  const isGoogleLinked = identities.some(i => i.provider === 'google');
  const isFacebookLinked = identities.some(i => i.provider === 'facebook');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { height: '80%', maxHeight: 680 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Privacy &amp; Security</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={Colors.black} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.sectionSubtitle}>Linked Accounts</Text>
            <Text style={styles.sectionDescription}>Manage and link your social accounts.</Text>
            <View style={styles.linkedAccountsContainer}>
              {/* Google */}
              <View style={styles.linkedAccountRow}>
                <View style={styles.linkedAccountLeft}>
                  <View style={[styles.oauthIconBadge, { backgroundColor: '#F5F5F5' }]}>
                    <Image 
                      source={require('../../../assets/google-logo.png')} 
                      style={{ width: 22, height: 22, resizeMode: 'contain', opacity: isGoogleLinked ? 1 : 0.4 }} 
                    />
                  </View>
                  <View>
                    <Text style={styles.linkedAccountName}>Google</Text>
                    <Text style={styles.linkedAccountStatus}>{isGoogleLinked ? 'Connected' : 'Not Connected'}</Text>
                  </View>
                </View>
                {isGoogleLinked ? (
                  <View style={styles.connectedBadge}><Text style={styles.connectedBadgeText}>Linked</Text></View>
                ) : (
                  <TouchableOpacity style={styles.linkActionBtn} onPress={() => onLinkIdentity('google')} disabled={linkingProvider !== null}>
                    {linkingProvider === 'google' ? <ActivityIndicator size="small" color={Colors.black} /> : <Text style={styles.linkActionText}>Link</Text>}
                  </TouchableOpacity>
                )}
              </View>
              {/* Facebook */}
              <View style={styles.linkedAccountRow}>
                <View style={styles.linkedAccountLeft}>
                  <View style={[styles.oauthIconBadge, { backgroundColor: '#E8F4FD' }]}>
                    <FontAwesome name="facebook" size={22} color={isFacebookLinked ? '#1877F2' : '#888'} />
                  </View>
                  <View>
                    <Text style={styles.linkedAccountName}>Facebook</Text>
                    <Text style={styles.linkedAccountStatus}>{isFacebookLinked ? 'Connected' : 'Not Connected'}</Text>
                  </View>
                </View>
                {isFacebookLinked ? (
                  <View style={styles.connectedBadge}><Text style={styles.connectedBadgeText}>Linked</Text></View>
                ) : (
                  <TouchableOpacity style={styles.linkActionBtn} onPress={() => onLinkIdentity('facebook')} disabled={linkingProvider !== null}>
                    {linkingProvider === 'facebook' ? <ActivityIndicator size="small" color={Colors.black} /> : <Text style={styles.linkActionText}>Link</Text>}
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Text style={styles.sectionSubtitle}>Private Account</Text>
                <Text style={styles.toggleDesc}>Other users cannot find you in search results or view your cookbook.</Text>
              </View>
              <Switch value={isPrivate} onValueChange={onTogglePrivate} trackColor={{ false: '#D1D1D6', true: Colors.black }} thumbColor={Platform.OS === 'android' ? 'white' : undefined} />
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Text style={styles.sectionSubtitle}>Hide Likes from Profile</Text>
                <Text style={styles.toggleDesc}>Other users won't be able to see your liked recipes.</Text>
              </View>
              <Switch value={hideLikes} onValueChange={onToggleHideLikes} trackColor={{ false: '#D1D1D6', true: Colors.black }} thumbColor={Platform.OS === 'android' ? 'white' : undefined} />
            </View>
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
  sectionSubtitle: { fontSize: 16, fontWeight: 'bold', color: Colors.black, marginBottom: 8 },
  sectionDescription: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 24 },
  linkedAccountsContainer: { gap: 16, marginBottom: 16 },
  linkedAccountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#F9F9F9', borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0' },
  linkedAccountLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  oauthIconBadge: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  linkedAccountName: { fontSize: 16, fontWeight: 'bold', color: Colors.black },
  linkedAccountStatus: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  connectedBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  connectedBadgeText: { fontSize: 13, color: '#4CAF50', fontWeight: 'bold' },
  linkActionBtn: { backgroundColor: Colors.black, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, minWidth: 70, alignItems: 'center' },
  linkActionText: { fontSize: 13, color: 'white', fontWeight: 'bold' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  toggleLeft: { flex: 1, paddingRight: 16 },
  toggleDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 4 },
});
