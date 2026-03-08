import React from 'react';
import { Image } from 'expo-image';
import { ViewStyle, StyleSheet, ImageStyle } from 'react-native';

interface LogoProps {
  size?: number;
  style?: ViewStyle;
}

export function Logo({ size = 120, style }: LogoProps) {
  return (
    <Image 
      source={require('@/assets/logo.svg')} 
      style={[
        styles.image, 
        { width: size, height: size },
        style as ImageStyle
      ]} 
      contentFit="contain"
      transition={200}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    // any default styles
  }
});
