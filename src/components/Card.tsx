import { View, type ViewProps } from 'react-native';
import { cardStyle } from '../theme';

export function Card({ style, ...rest }: ViewProps) {
  return <View style={[cardStyle, style]} {...rest} />;
}
