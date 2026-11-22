/**
 * Role-Based Dashboard Navigation Router
 * Determines destination route based on authenticated user's role and assigned module
 */

export function getDashboardRoute(user) {
  if (!user) return '/login';

  const role = (user.role || '').toUpperCase();
  const moduleName = (user.module || '').toLowerCase();

  // 1. Super Admin -> Executive Multi-Module Analytics Dashboard with Charts
  if (role === 'SUPERADMIN') {
    return '/super-admin';
  }

  // 2. Normal Admin -> Club General Operations & Configuration Dashboard
  if (role === 'ADMIN') {
    return '/admin';
  }

  // 3. Sub-Admins & Departmental Staff -> Specific Module Dashboards
  if (role === 'SUBADMIN' || role === 'STAFF') {
    if (moduleName === 'bar' || moduleName === 'cafe') {
      return '/bar-admin';
    }
    if (moduleName === 'shop' || moduleName === 'sports shop') {
      return '/shop-admin';
    }
    // Default staff assignment: Front Desk
    return '/front-desk';
  }

  // 4. Normal MEMBER stays on the existing website
  return '/';
}

export function getRoleBadge(user) {
  if (!user) return null;
  const role = (user.role || 'MEMBER').toUpperCase();
  const moduleName = (user.module || '').toLowerCase();

  if (role === 'SUPERADMIN') {
    return { title: 'Super Admin', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
  }
  if (role === 'ADMIN') {
    return { title: 'Club Admin', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
  }
  if (role === 'SUBADMIN' || role === 'STAFF') {
    if (moduleName === 'bar' || moduleName === 'cafe') {
      return { title: 'Bar Admin', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    }
    if (moduleName === 'shop' || moduleName === 'sports shop') {
      return { title: 'Shop Admin', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    }
    return { title: 'Front Desk', color: 'bg-lime-500/20 text-lime-300 border-lime-500/30' };
  }

  return { title: user.membership || 'Member', color: 'bg-gray-700/50 text-gray-300 border-gray-600' };
}
