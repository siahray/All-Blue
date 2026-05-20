import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { X, Shield, FileText } from 'lucide-react-native';

interface LegalModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

export const LegalModal = ({ visible, onClose, initialTab = 'terms' }: LegalModalProps) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {activeTab === 'terms' ? (
                <FileText color={Colors.black} size={24} />
              ) : (
                <Shield color={Colors.black} size={24} />
              )}
              <Text style={styles.title}>
                {activeTab === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X color={Colors.black} size={24} />
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'terms' && styles.activeTabButton]}
              onPress={() => setActiveTab('terms')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'terms' && styles.activeTabText]}>
                Terms of Service
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'privacy' && styles.activeTabButton]}
              onPress={() => setActiveTab('privacy')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'privacy' && styles.activeTabText]}>
                Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {activeTab === 'terms' ? (
              <View style={styles.textSection}>
                <Text style={styles.lastUpdated}>Last Updated: May 20, 2026</Text>
                
                <Text style={styles.heading}>1. Welcome to All Blue</Text>
                <Text style={styles.paragraph}>
                  Thank you for using All Blue ("the App"), your personal AI-powered culinary companion. These Terms of Service ("Terms") govern your access to and use of our mobile application, AI recipe suggestions, ingredient scanning, and community features.
                </Text>

                <Text style={styles.heading}>2. Safety & Culinary Disclaimers</Text>
                <Text style={styles.importantWarning}>
                  ⚠️ IMPORTANT ALLERGY & FOOD SAFETY NOTICE: All Blue uses advanced Artificial Intelligence (AI) to generate recipes, recommend ingredient substitutions, and match pantry inventory. AI suggestions can make mistakes. Always check allergen labels, inspect ingredients for freshness, and follow standard food safety/cooking guidelines. All Blue is not responsible for allergic reactions or kitchen mishaps.
                </Text>

                <Text style={styles.heading}>3. User Accounts</Text>
                <Text style={styles.paragraph}>
                  To access premium features like AI recipe generation, kitchen sessions, and pantry synchronization, you must register for an account using a supported authentication method (Google or Facebook). You agree to keep your credentials secure and notify us immediately of any unauthorized use.
                </Text>

                <Text style={styles.heading}>4. User-Generated Content</Text>
                <Text style={styles.paragraph}>
                  Users can upload recipes, photos, and reviews ("User Content"). You retain ownership of your User Content, but you grant All Blue a worldwide, royalty-free, perpetual license to display, modify, distribute, and feature your recipes in our community feed.
                </Text>

                <Text style={styles.heading}>5. Acceptable Use</Text>
                <Text style={styles.paragraph}>
                  You agree not to upload offensive content, reverse-engineer the application, manipulate community popularity metrics (likes, shares), or scrape data from the App without explicit permission.
                </Text>

                <Text style={styles.heading}>6. Limitation of Liability</Text>
                <Text style={styles.paragraph}>
                  All Blue is provided "as is" without warranty of any kind. Under no circumstances shall All Blue, its developers, or affiliates be liable for direct, indirect, incidental, or consequential damages resulting from kitchen accidents, equipment damage, foodborne illness, or reliance on AI instructions.
                </Text>
              </View>
            ) : (
              <View style={styles.textSection}>
                <Text style={styles.lastUpdated}>Last Updated: May 20, 2026</Text>
                
                <Text style={styles.heading}>1. Introduction</Text>
                <Text style={styles.paragraph}>
                  At All Blue, your privacy is paramount. This Privacy Policy details how we collect, process, secure, and share your personal data when you interact with our AI Kitchen Assistant.
                </Text>

                <Text style={styles.heading}>2. Information We Collect</Text>
                <Text style={styles.paragraph}>
                  • <Text style={styles.boldText}>Profile Information</Text>: Full name, email address, username, profile picture, and bio provided during registration.
                </Text>
                <Text style={styles.paragraph}>
                  • <Text style={styles.boldText}>Pantry & Ingredient Data</Text>: Ingredients tracked in your virtual pantry, shopping basket items, and inventory quantities.
                </Text>
                <Text style={styles.paragraph}>
                  • <Text style={styles.boldText}>Culinary Activity</Text>: Liked recipes, custom recipes uploaded, history dates of recipes you cooked, and cooking session timers.
                </Text>
                <Text style={styles.paragraph}>
                  • <Text style={styles.boldText}>Camera Images</Text>: Photos captured during pantry camera scanning. Images are processed locally or via secure AI APIs strictly for ingredient recognition and are not permanently stored on our servers.
                </Text>

                <Text style={styles.heading}>3. How We Use Your Information</Text>
                <Text style={styles.paragraph}>
                  We use your data to power the core app experience:
                  {"\n"}• Personalize AI recipe matching and sorting algorithms.
                  {"\n"}• Provide synchronized updates of your pantry stock.
                  {"\n"}• Share your recipes with the culinary community on the social feed.
                </Text>

                <Text style={styles.heading}>4. Data Security & Third Parties</Text>
                <Text style={styles.paragraph}>
                  We utilize enterprise-grade cloud databases (Supabase) to secure your profiles and activity. We never sell your personal data. We only share anonymized analytical data with service providers (like Gemini AI API) to run core recipe parsing and image recognition functions.
                </Text>

                <Text style={styles.heading}>5. Your Controls & Deletion</Text>
                <Text style={styles.paragraph}>
                  You have full control over your privacy settings inside your profile settings modal. You can toggle your account to **Private Mode**, hide your liked recipes library from other community members, and request permanent deletion of your account and related data at any time.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.closeBtnText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '85%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.3,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  tabButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  activeTabButton: {
    backgroundColor: Colors.black,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    padding: 24,
  },
  textSection: {
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 20,
    fontWeight: '500',
  },
  heading: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.black,
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  paragraph: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 12,
  },
  importantWarning: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 14,
    lineHeight: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  boldText: {
    fontWeight: '700',
    color: Colors.black,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  closeBtn: {
    height: 52,
    backgroundColor: Colors.black,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
