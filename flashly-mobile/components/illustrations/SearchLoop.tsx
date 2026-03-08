import React from 'react';
import Svg, { Path, G } from 'react-native-svg';
import { ViewStyle } from 'react-native';

interface SvgProps {
  width?: number;
  height?: number;
  style?: ViewStyle;
}

export default function SearchLoop({ width = 200, height = 200, style }: SvgProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 1024 1024" style={style}>
        <G transform="translate(472,299)">
            <Path d="m0 0h11l19 2 23 6 18 8 15 9 10 8 10 9 10 11 10 14 8 14 6 15 4 13 3 18v31l-3 18-6 20-8 16-7 12v4l11 11 5 4 6-2h10l6 4 12 11 10 9 8 7 12 11 8 7 13 12 8 7 10 9 4 5 3 7v15l-4 9-6 7-10 5-4 1h-9l-9-3-14-12-13-12-8-7-10-9-14-12-13-12-11-9-7-8-1-3v-7l2-7-13-12-6-4-11 9-13 8-14 7-21 7-16 3-11 1h-18l-21-3-18-5-20-9-14-9-10-8-10-9-12-14-9-14-8-16-6-17-3-15-1-8v-31l4-22 5-15 8-17 10-15 9-11 14-14 15-11 21-11 18-6 20-4zm-7 31-17 3-17 6-15 8-16 12v2l-4 2-11 13-9 15-7 17-4 19v29l4 19 6 15 8 14 8 10 8 9 11 9 11 7 14 7 15 5 22 3 19-1 15-3 15-5 17-9 12-9 15-15 10-15 8-17 4-14 2-15v-19l-3-18-5-15-9-17-9-12-10-11-13-10-14-8-14-6-16-4-7-1z" fill="#23206C"/>
        </G>
        <G transform="translate(467,355)">
            <Path d="m0 0h16l16 3 16 6 9 5 9 7 9 8 10 13 7 14 2 8-2 5-3 3-6 1-5-3-9-19-8-10-7-7-11-7-13-6-15-3-15-1-5-4-1-6 4-6z" fill="#24216D"/>
        </G>
        <G transform="translate(516,647)">
            <Path d="m0 0h15v15h-15z" fill="#24216D"/>
        </G>
        <G transform="translate(407,700)">
            <Path d="m0 0 6 1 4 5-1 6-3 3h-7l-4-5 1-7z" fill="#ECEBF1"/>
        </G>
    </Svg>
  );
}
