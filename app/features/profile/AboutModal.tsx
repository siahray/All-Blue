import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Colors } from '../../../theme/colors';
import { X } from 'lucide-react-native';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AboutModal = ({ visible, onClose }: AboutModalProps) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, { height: '70%' }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>About All Blue</Text>
          <TouchableOpacity onPress={onClose}><X size={24} color={Colors.black} /></TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody}>
          <View style={styles.aboutHeader}>
            <Image source={require('../../../assets/icon.png')} style={styles.aboutLogo} defaultSource={require('../../../assets/icon.png')} />
            <Text style={styles.aboutAppName}>All Blue</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
          </View>
          <View style={styles.aboutSection}>
            <Text style={styles.aboutSectionTitle}>Our Mission</Text>
            <Text style={styles.aboutText}>
              All Blue is designed to revolutionize the way you cook. By leveraging advanced AI, we help you discover incredible recipes based on the ingredients you already have, reducing food waste and making every meal an adventure.
            </Text>
          </View>
          <View style={styles.aboutSection}>
            <Text style={styles.aboutSectionTitle}>The Vision</Text>
            <Text style={styles.aboutText}>
              We believe that everyone has a hidden chef inside. Our goal is to provide the tools and inspiration to unlock that potential, one dish at a time.
            </Text>
          </View>
          <View style={styles.aboutFooter}>
            <Text style={styles.aboutFooterText}>Made with ❤️ for the Culinary Community</Text>
            <Text style={styles.aboutCopyright}>© 2026 All Blue AI Kitchen</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.black },
  modalBody: { padding: 24 },
  aboutHeader: { alignItems: 'center', marginBottom: 30 },
  aboutLogo: { width: 80, height: 80, borderRadius: 20, marginBottom: 12 },
  aboutAppName: { fontSize: 24, fontWeight: 'bold', color: Colors.black },
  aboutVersion: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  aboutSection: { marginBottom: 24 },
  aboutSectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.black, marginBottom: 10 },
  aboutText: { fontSize: 15, lineHeight: 22, color: '#444' },
  aboutFooter: { marginTop: 20, alignItems: 'center', paddingBottom: 40 },
  aboutFooterText: { fontSize: 14, color: Colors.black, fontWeight: '600' },
  aboutCopyright: { fontSize: 12, color: Colors.textSecondary, marginTop: 8 },
});

export default AboutModal;
