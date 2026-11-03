import {
  Activity,
  AlertTriangle,
  Bell,
  History,
  KeyRound,
  LayoutGrid,
  ListChecks,
  ScanSearch,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type Role = 'VIEWER' | 'ANALYST' | 'ADMIN';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  minRole: Role;
}

// Section names and order follow the Stitch design. `minRole` hides items a user cannot use.
// (This is a convenience only: the API enforces access, so hiding a link never protects anything.)
export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Operations',
    items: [
      { href: '/overview', label: 'Overview', icon: LayoutGrid, minRole: 'VIEWER' },
      { href: '/alerts', label: 'Alerts', icon: Bell, minRole: 'VIEWER' },
      { href: '/events', label: 'Events', icon: Activity, minRole: 'VIEWER' },
      { href: '/incidents', label: 'Incidents', icon: AlertTriangle, minRole: 'VIEWER' },
      { href: '/scans', label: 'Scans', icon: ScanSearch, minRole: 'VIEWER' },
    ],
  },
  {
    title: 'Governance',
    items: [
      { href: '/admin/rules', label: 'Alert Rules', icon: ListChecks, minRole: 'VIEWER' },
      { href: '/admin/users', label: 'Users', icon: Users, minRole: 'ADMIN' },
      { href: '/admin/api-keys', label: 'API Keys', icon: KeyRound, minRole: 'ADMIN' },
      { href: '/admin/audit', label: 'Audit Log', icon: History, minRole: 'ADMIN' },
    ],
  },
];

const RANK: Record<Role, number> = { VIEWER: 1, ANALYST: 2, ADMIN: 3 };

export function canSee(role: Role | undefined, minRole: Role) {
  return role !== undefined && RANK[role] >= RANK[minRole];
}
