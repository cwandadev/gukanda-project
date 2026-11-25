import { RoleTabs, type TabItem } from '@/components/RoleTabs';

const ITEMS: TabItem[] = [
  { name: 'home', labelKey: 'client.home', icon: 'home' },
  { name: 'book', labelKey: 'client.book', icon: 'calendarPlus' },
  { name: 'my-reports', labelKey: 'client.reports', icon: 'document' },
  { name: 'profile', labelKey: 'client.profile', icon: 'user' },
];

export default function ClientLayout() {
  return <RoleTabs items={ITEMS} />;
}
