import { RoleTabs, type TabItem } from '@/components/RoleTabs';

const ITEMS: TabItem[] = [
  { name: 'team', labelKey: 'admin.team', icon: 'group' },
  { name: 'availability', labelKey: 'admin.availability', icon: 'clock' },
  { name: 'data', labelKey: 'admin.data', icon: 'data' },
];

export default function AdminLayout() {
  return <RoleTabs items={ITEMS} sidebarOnWeb />;
}
