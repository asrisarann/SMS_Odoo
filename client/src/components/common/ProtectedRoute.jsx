import { Navigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';

/**
 * ProtectedRoute Component
 * Guards dashboard routes by validating authentication and role/module permissions
 */
export default function ProtectedRoute({
  children,
  allowedRoles = [],
  allowedModules = [],
}) {
  const location = useLocation();
  const user = api.auth.getUser();

  // 1. Not authenticated -> redirect to login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = (user.role || 'MEMBER').toUpperCase();
  const moduleName = (user.module || '').toLowerCase();

  // Superadmin has universal access to all dashboards
  if (role === 'SUPERADMIN') {
    return children;
  }

  // Check role authorization
  const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(role);

  // Check module authorization (for SUBADMIN / STAFF)
  const moduleAllowed =
    allowedModules.length === 0 ||
    allowedModules.some((m) => moduleName.includes(m.toLowerCase()));

  if (!roleAllowed && !moduleAllowed) {
    // Normal members or unauthorized staff cannot access this dashboard
    return <Navigate to="/" replace />;
  }

  return children;
}
