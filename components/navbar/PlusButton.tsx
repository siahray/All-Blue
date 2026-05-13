import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';

export const PlusButton = ({ onPress }: { onPress?: () => void }) => {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={styles.button}
      >
        <Plus color="white" size={32} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 70,
    marginTop: -35, // Pull it up to sit in the cutout
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
});
