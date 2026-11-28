// JS tabs (not native tabs) so our own icons work.
// Phone: bottom tabs. Web on wide screens (if sidebarOnWeb): left sidebar.
import { Tabs } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';
import { useI18n } from '../lib/i18n';
import { breakpoints, colors, fonts, fontSizes, radius } from '../theme';
import { Icon, type IconName } from './Icon';

export type TabItem = { name: string; labelKey: string; icon: IconName };

type Props = { items: TabItem[]; sidebarOnWeb?: boolean };

export function RoleTabs({ items, sidebarOnWeb = false }: Props) {
  const { t } = useI18n(); // re-renders the labels when the language changes
  const { width } = useWindowDimensions();
  const sidebar = sidebarOnWeb && Platform.OS === 'web' && width >= breakpoints.wide;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: sidebar ? 'left' : 'bottom',
        tabBarLabelPosition: sidebar ? 'beside-icon' : 'below-icon',
        tabBarActiveTintColor: colors.plum,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: sidebar ? colors.plumTint : undefined,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: sidebar ? fontSizes.sm : fontSizes.xs },
        tabBarItemStyle: sidebar ? { borderRadius: radius.md, marginHorizontal: 8, marginVertical: 2 } : undefined,
        tabBarStyle: { backgroundColor: colors.white, borderColor: colors.border },
      }}
    >
      {items.map((item) => (
        <Tabs.Screen
          key={item.name}
          name={item.name}
          options={{
            title: t(item.labelKey),
            tabBarIcon: ({ color, size }) => <Icon name={item.icon} color={color} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
