import { RoleTabs, type TabItem } from '@/components/RoleTabs';

const ITEMS: TabItem[] = [
  { name: 'dashboard', labelKey: 'practitioner.dashboard', icon: 'grid' },
  { name: 'clients', labelKey: 'practitioner.clients', icon: 'group' },
  { name: 'appointments', labelKey: 'practitioner.appointments', icon: 'calendar' },
  { name: 'assessments', labelKey: 'practitioner.assessments', icon: 'clipboard' },
  { name: 'reports', labelKey: 'practitioner.reports', icon: 'document' },
  { name: 'settings', labelKey: 'practitioner.settings', icon: 'cog' },
];

export default function PractitionerLayout() {
  return <RoleTabs items={ITEMS} sidebarOnWeb />;
}
