/**
 * Role-Based Redirection Unit Test
 * Tests getDashboardRoute and getRoleBadge for all user types
 */

import { getDashboardRoute, getRoleBadge } from './src/utils/roleRedirect.js';

console.log('Testing role redirection logic...');

// 1. Super Admin
const superAdmin = { role: 'SUPERADMIN', name: 'Chief Director' };
if (getDashboardRoute(superAdmin) !== '/super-admin') {
  throw new Error(`Expected /super-admin for SUPERADMIN, got ${getDashboardRoute(superAdmin)}`);
}

// 2. Normal Admin
const clubAdmin = { role: 'ADMIN', name: 'General Manager' };
if (getDashboardRoute(clubAdmin) !== '/admin') {
  throw new Error(`Expected /admin for ADMIN, got ${getDashboardRoute(clubAdmin)}`);
}

// 3. Bar Admin / Bar Manager
const barAdmin = { role: 'SUBADMIN', module: 'bar', name: 'Lounge Manager' };
if (getDashboardRoute(barAdmin) !== '/bar-admin') {
  throw new Error(`Expected /bar-admin for Bar SUBADMIN, got ${getDashboardRoute(barAdmin)}`);
}
const cafeAdmin = { role: 'STAFF', module: 'cafe', name: 'Barista Lead' };
if (getDashboardRoute(cafeAdmin) !== '/bar-admin') {
  throw new Error(`Expected /bar-admin for Cafe STAFF, got ${getDashboardRoute(cafeAdmin)}`);
}

// 4. Sport Shop Admin
const shopAdmin = { role: 'SUBADMIN', module: 'shop', name: 'Pro Shop Manager' };
if (getDashboardRoute(shopAdmin) !== '/shop-admin') {
  throw new Error(`Expected /shop-admin for Shop SUBADMIN, got ${getDashboardRoute(shopAdmin)}`);
}

// 5. Front Desk Staff
const frontDeskStaff = { role: 'STAFF', module: 'front-desk', name: 'Receptionist' };
if (getDashboardRoute(frontDeskStaff) !== '/front-desk') {
  throw new Error(`Expected /front-desk for Front Desk STAFF, got ${getDashboardRoute(frontDeskStaff)}`);
}

// 6. Normal Member (Stays on existing website)
const memberUser = { role: 'MEMBER', membership: 'GOLD', name: 'Tennis Player' };
if (getDashboardRoute(memberUser) !== '/') {
  throw new Error(`Expected / for normal MEMBER, got ${getDashboardRoute(memberUser)}`);
}

// 7. Unauthenticated User
if (getDashboardRoute(null) !== '/login') {
  throw new Error(`Expected /login for null user, got ${getDashboardRoute(null)}`);
}

// Badges check
if (getRoleBadge(superAdmin).title !== 'Super Admin') {
  throw new Error('Super Admin badge mismatch');
}
if (getRoleBadge(barAdmin).title !== 'Bar Admin') {
  throw new Error('Bar Admin badge mismatch');
}
if (getRoleBadge(shopAdmin).title !== 'Shop Admin') {
  throw new Error('Shop Admin badge mismatch');
}
if (getRoleBadge(memberUser).title !== 'GOLD') {
  throw new Error('Member badge mismatch');
}

console.log('✓ All role redirection & badge rules passed successfully!');
