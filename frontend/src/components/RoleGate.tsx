import { ReactNode } from "react";
import { useUserRoles } from "../auth/useUserRoles";

interface RoleGateProps {
  children: ReactNode;
  requiredRoles: string[]; // User must have at least one of these roles
  requireAllRoles?: boolean; // If true, user must have ALL roles
  fallback?: ReactNode; // What to render if user doesn't have required roles
}

/**
 * Component to conditionally render content based on user roles
 *
 * Usage:
 *   <RoleGate requiredRoles={['admin']}>
 *     <AdminPanel />
 *   </RoleGate>
 *
 *   <RoleGate requiredRoles={['admin', 'provider']} fallback={<p>Unauthorized</p>}>
 *     <ManagementTools />
 *   </RoleGate>
 *
 *   <RoleGate requiredRoles={['admin', 'moderator']} requireAllRoles={true}>
 *     <SuperAdminPanel />
 *   </RoleGate>
 */
export const RoleGate = ({
  children,
  requiredRoles,
  requireAllRoles = false,
  fallback = null,
}: RoleGateProps) => {
  const { roles, loading } = useUserRoles();

  // Don't render anything while loading
  if (loading) {
    return null;
  }

  // Check if user has required roles
  const hasRequiredRoles = requireAllRoles
    ? requiredRoles.every((role) => roles.includes(role))
    : requiredRoles.some((role) => roles.includes(role));

  if (!hasRequiredRoles) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Inverse of RoleGate - renders children only if user DOESN'T have the specified roles
 */
export const HideForRoles = ({
  children,
  roles: rolesToHide,
}: {
  children: ReactNode;
  roles: string[];
}) => {
  const { roles } = useUserRoles();

  const hasAnyRole = rolesToHide.some((role) => roles.includes(role));

  if (hasAnyRole) {
    return null;
  }

  return <>{children}</>;
};
