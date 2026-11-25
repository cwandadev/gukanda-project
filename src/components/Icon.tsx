// The ONLY place icons are drawn. Screens import <Icon name="home" />, never a library.
import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';
import { iconPaths, type IconName } from './iconPaths';

export type { IconName };

type Props = { name: IconName; size?: number; color?: ColorValue };

export function Icon({ name, size = 24, color = colors.ink }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      {iconPaths[name].map((d, i) => (
        <Path key={i} d={d} />
      ))}
    </Svg>
  );
}
