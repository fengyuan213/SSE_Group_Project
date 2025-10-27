import { ProtectedRoute } from "./ProtectedRoute";

/**
 * Higher-order component version of ProtectedRoute
 */
export const withProtectedRoute = (
  Component: React.ComponentType,
  requiredRoles?: string[]
) => {
  return (props: Record<string, unknown>) => (
    <ProtectedRoute requiredRoles={requiredRoles}>
      <Component {...props} />
    </ProtectedRoute>
  );
};
