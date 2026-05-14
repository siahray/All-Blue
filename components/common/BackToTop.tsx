import React from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  Animated 
} from 'react-native';
import { ArrowUp } from 'lucide-react-native';

interface BackToTopProps {
  visible: boolean;
  onPress: () => void;
}

export const BackToTop = ({ visible, onPress }: BackToTopProps) => {
  if (!visible) return null;

  return (
    <TouchableOpacity 
      style={styles.backToTop} 
      activeOpacity={0.9}
      onPress={onPress}
    >
      <ArrowUp color="white" size={24} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backToTop: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    zIndex: 1000,
  },
});
