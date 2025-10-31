-- ============================================================================
-- Remove Provider Role from fengyuan.liu@live.com
-- ============================================================================

\echo ''
\echo '========================================='
\echo '📋 Current roles for fengyuan.liu@live.com'
\echo '========================================='

SELECT
    u.email,
    u.name,
    COALESCE(ARRAY_AGG(r.role_name ORDER BY r.role_name) FILTER (WHERE r.role_name IS NOT NULL), ARRAY[]::text[]) as roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.role_id
WHERE u.email = 'fengyuan.liu@live.com'
GROUP BY u.id, u.email, u.name;

\echo ''
\echo '========================================='
\echo '⚠️  Removing provider role...'
\echo '========================================='

DELETE FROM user_roles
WHERE user_id = (SELECT id FROM users WHERE email = 'fengyuan.liu@live.com')
  AND role_id = (SELECT role_id FROM roles WHERE role_name = 'provider');

\echo '✅ Provider role removed!'
\echo ''
\echo '========================================='
\echo '🔍 Updated roles for fengyuan.liu@live.com'
\echo '========================================='

SELECT
    u.email,
    u.name,
    COALESCE(ARRAY_AGG(r.role_name ORDER BY r.role_name) FILTER (WHERE r.role_name IS NOT NULL), ARRAY[]::text[]) as roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.role_id
WHERE u.email = 'fengyuan.liu@live.com'
GROUP BY u.id, u.email, u.name;

\echo ''
\echo '✅ Done!'

