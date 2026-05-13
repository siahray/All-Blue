import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

interface TabBackgroundProps {
  color?: string;
}

export const TabBackground: React.FC<TabBackgroundProps> = ({ color = Colors.surface }) => {
  const tabWidth = width;
  const holeWidth = 90;
  const holeHeight = 35;
  const startX = (tabWidth - holeWidth) / 2;

  const line = `
    M 0 20
    L ${startX} 20
    C ${startX + 15} 20, ${startX + 10} ${holeHeight}, ${startX + holeWidth / 2} ${holeHeight}
    C ${startX + holeWidth - 10} ${holeHeight}, ${startX + holeWidth - 15} 20, ${startX + holeWidth} 20
    L ${tabWidth} 20
    L ${tabWidth} 100
    L 0 100
    Z
  `;

  return (
    <View style={styles.container}>
      <Svg width={tabWidth} height={100} viewBox={`0 0 ${tabWidth} 100`}>
        <Path d={line} fill={color} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: width,
    height: 100,
  },
});
