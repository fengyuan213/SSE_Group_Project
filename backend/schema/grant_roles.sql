-- ============================================================================
-- 🔐 ROLE MANAGEMENT TEMPLATE
-- ============================================================================
-- Quick guide for administrators to manage user roles
-- Available roles: admin, provider, customer
--
-- 📝 QUICK START:
-- 1. Edit the CONFIGURATION section below
-- 2. Uncomment the action you want (GRANT or REMOVE)
-- 3. Run in psql: \i backend/schema/grant_roles.sql
--
-- ⚠️  IMPORTANT: User must have logged in at least once before granting roles
-- ============================================================================

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║                         ⚙️  CONFIGURATION                              ║
-- ║                    👉 EDIT THESE VALUES 👈                             ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- Single user configuration (most common)
\set TARGET_EMAIL '''fengyuan.liu@live.com'''
\set TARGET_EMAIL '''liufengyuan2015@gmail.com'''

\set TARGET_ROLE '''admin'''

\echo '✅ Granting role to user...'
INSERT INTO user_roles (user_id, role_id)
SELECT
    (SELECT id FROM users WHERE email = :TARGET_EMAIL),
    (SELECT role_id FROM roles WHERE role_name = :TARGET_ROLE)
ON CONFLICT (user_id, role_id) DO NOTHING;
\echo '✅ Done! Role granted.'
-- Multiple users (for batch operations)
-- \set USER_LIST '''user1@example.com'', ''user2@example.com'', ''user3@example.com'''

-- Multiple roles (for granting multiple roles at once)
-- \set ROLE_LIST '''admin'', ''provider'', ''customer'''

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║                   📋 STEP 1: CHECK CURRENT ROLES                       ║
-- ║                   (runs automatically)                                 ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

\echo ''
\echo '========================================='
\echo '📋 All Users and Their Current Roles'
\echo '========================================='
SELECT
    u.email,
    u.name,
    COALESCE(ARRAY_AGG(r.role_name ORDER BY r.role_name) FILTER (WHERE r.role_name IS NOT NULL), ARRAY[]::text[]) as roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.role_id
GROUP BY u.id, u.email, u.name
ORDER BY u.email;
\echo ''

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║                 ➕ STEP 2: GRANT ROLES                                 ║
-- ║              (uncomment ONE action below)                              ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ ACTION 1: Grant single role to single user                            │
-- │ Uses: TARGET_EMAIL and TARGET_ROLE from config above                  │
-- └───────────────────────────────────────────────────────────────────────┘
-- \echo '✅ Granting role to user...'
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT
--     (SELECT id FROM users WHERE email = :TARGET_EMAIL),
--     (SELECT role_id FROM roles WHERE role_name = :TARGET_ROLE)
-- ON CONFLICT (user_id, role_id) DO NOTHING;
-- \echo '✅ Done! Role granted.'

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ ACTION 2: Grant ALL 3 roles to one user (Super User)                  │
-- │ Uses: TARGET_EMAIL from config above                                  │
-- │ Grants: admin + provider + customer                                   │
-- └───────────────────────────────────────────────────────────────────────┘
-- \echo '✅ Granting all roles (admin, provider, customer)...'
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT
--     (SELECT id FROM users WHERE email = :TARGET_EMAIL),
--     role_id
-- FROM roles
-- WHERE role_name IN ('admin', 'provider', 'customer')
-- ON CONFLICT (user_id, role_id) DO NOTHING;
-- \echo '✅ Done! All roles granted.'

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ ACTION 3: Grant admin + provider roles                                │
-- │ Uses: TARGET_EMAIL from config above                                  │
-- └───────────────────────────────────────────────────────────────────────┘
-- \echo '✅ Granting admin and provider roles...'
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT
--     (SELECT id FROM users WHERE email = :TARGET_EMAIL),
--     role_id
-- FROM roles
-- WHERE role_name IN ('admin', 'provider')
-- ON CONFLICT (user_id, role_id) DO NOTHING;
-- \echo '✅ Done! Admin and provider roles granted.'

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ ACTION 4: Grant provider + customer roles                             │
-- │ Uses: TARGET_EMAIL from config above                                  │
-- └───────────────────────────────────────────────────────────────────────┘
-- \echo '✅ Granting provider and customer roles...'
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT
--     (SELECT id FROM users WHERE email = :TARGET_EMAIL),
--     role_id
-- FROM roles
-- WHERE role_name IN ('provider', 'customer')
-- ON CONFLICT (user_id, role_id) DO NOTHING;
-- \echo '✅ Done! Provider and customer roles granted.'

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ ACTION 5: Grant same role to MULTIPLE users                           │
-- │ 1. Uncomment \set USER_LIST in config section                         │
-- │ 2. Uncomment this block                                               │
-- │ Uses: USER_LIST and TARGET_ROLE from config                           │
-- └───────────────────────────────────────────────────────────────────────┘
-- \echo '✅ Granting role to multiple users...'
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT
--     u.id,
--     (SELECT role_id FROM roles WHERE role_name = :TARGET_ROLE)
-- FROM users u
-- WHERE u.email IN (:USER_LIST)
-- ON CONFLICT (user_id, role_id) DO NOTHING;
-- \echo '✅ Done! Role granted to all users.'

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ ACTION 6: Grant MULTIPLE roles to MULTIPLE users                      │
-- │ 1. Uncomment \set USER_LIST in config section                         │
-- │ 2. Uncomment \set ROLE_LIST in config section                         │
-- │ 3. Uncomment this block                                               │
-- └───────────────────────────────────────────────────────────────────────┘
-- \echo '✅ Granting multiple roles to multiple users...'
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT u.id, r.role_id
-- FROM users u
-- CROSS JOIN roles r
-- WHERE u.email IN (:USER_LIST)
-- AND r.role_name IN (:ROLE_LIST)
-- ON CONFLICT (user_id, role_id) DO NOTHING;
-- \echo '✅ Done! Roles granted to all users.'

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║                 ➖ STEP 3: REMOVE ROLES                                ║
-- ║              (uncomment ONE action below)                              ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ ACTION 1: Remove single role from single user                         │
-- │ Uses: TARGET_EMAIL and TARGET_ROLE from config above                  │
-- └───────────────────────────────────────────────────────────────────────┘
-- \echo '⚠️  Removing role from user...'
-- DELETE FROM user_roles
-- WHERE user_id = (SELECT id FROM users WHERE email = :TARGET_EMAIL)
--   AND role_id = (SELECT role_id FROM roles WHERE role_name = :TARGET_ROLE);
-- \echo '✅ Done! Role removed.'

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ ACTION 2: Remove ALL roles from a user                                │
-- │ Uses: TARGET_EMAIL from config above                                  │
-- │ ⚠️  WARNING: This removes ALL roles!                                   │
-- └───────────────────────────────────────────────────────────────────────┘
-- \echo '⚠️  Removing ALL roles from user...'
-- DELETE FROM user_roles
-- WHERE user_id = (SELECT id FROM users WHERE email = :TARGET_EMAIL);
-- \echo '✅ Done! All roles removed.'

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║               🔍 STEP 4: VERIFY CHANGES                                ║
-- ║           (uncomment to check specific user)                           ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- \echo ''
-- \echo '========================================='
-- \echo '🔍 Verifying roles for specified user'
-- \echo '========================================='
-- SELECT
--     u.email,
--     u.name,
--     COALESCE(ARRAY_AGG(r.role_name ORDER BY r.role_name) FILTER (WHERE r.role_name IS NOT NULL), ARRAY[]::text[]) as roles
-- FROM users u
-- LEFT JOIN user_roles ur ON u.id = ur.user_id
-- LEFT JOIN roles r ON ur.role_id = r.role_id
-- WHERE u.email = :TARGET_EMAIL
-- GROUP BY u.id, u.email, u.name;
-- \echo ''

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║                        📖 USAGE EXAMPLES                               ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ Example 1: Make john@company.com an admin                             │
-- └───────────────────────────────────────────────────────────────────────┘
-- Step 1: Edit config at top:
--   \set TARGET_EMAIL '''john@company.com'''
--   \set TARGET_ROLE '''admin'''
--
-- Step 2: Uncomment ACTION 1 in STEP 2 (Grant Roles)
-- Step 3: Run: \i backend/schema/grant_roles.sql
-- ✅ Done!

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ Example 2: Make jane@company.com a super user (all roles)             │
-- └───────────────────────────────────────────────────────────────────────┘
-- Step 1: Edit config at top:
--   \set TARGET_EMAIL '''jane@company.com'''
--
-- Step 2: Uncomment ACTION 2 in STEP 2 (Grant all roles)
-- Step 3: Run: \i backend/schema/grant_roles.sql
-- ✅ Done!

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ Example 3: Grant admin to 3 users at once                             │
-- └───────────────────────────────────────────────────────────────────────┘
-- Step 1: Edit config at top:
--   \set TARGET_ROLE '''admin'''
--   \set USER_LIST '''admin1@company.com'', ''admin2@company.com'', ''admin3@company.com'''
--
-- Step 2: Uncomment the \set USER_LIST line in config
-- Step 3: Uncomment ACTION 5 in STEP 2 (Grant to multiple users)
-- Step 4: Run: \i backend/schema/grant_roles.sql
-- ✅ Done!

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ Example 4: Remove admin role from john@company.com                    │
-- └───────────────────────────────────────────────────────────────────────┘
-- Step 1: Edit config at top:
--   \set TARGET_EMAIL '''john@company.com'''
--   \set TARGET_ROLE '''admin'''
--
-- Step 2: Uncomment ACTION 1 in STEP 3 (Remove Roles)
-- Step 3: Run: \i backend/schema/grant_roles.sql
-- ✅ Done!

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║                      📝 IMPORTANT NOTES                                ║
-- ╚═══════════════════════════════════════════════════════════════════════╝
--
-- ✅ Safe to Run Multiple Times
--    ON CONFLICT (user_id, role_id) DO NOTHING prevents duplicate errors
--
-- 🔄 Default Roles (Automatic on First Login)
--    New users automatically get: customer
--    (configured in backend/app/routes/auth_routes.py)
--
-- 👑 Admin Role
--    Must be granted manually for security
--
-- ⚠️  Prerequisites
--    Users MUST log in at least once before granting roles
--    (account must exist in users table)
--
-- 🔍 Quick Queries
--    Check all users:       SELECT email, name FROM users;
--    Check current roles:   Run this file without uncommenting actions
--
-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║                      🎯 QUICK REFERENCE                                ║
-- ╚═══════════════════════════════════════════════════════════════════════╝
--
-- Variable Syntax:
--   \set VARIABLE_NAME '''value'''          (single value)
--   \set VARIABLE_NAME '''val1'', ''val2''' (multiple values)
--
-- Using Variables:
--   WHERE email = :TARGET_EMAIL             (single value)
--   WHERE email IN (:USER_LIST)             (multiple values)
--
-- Available Roles:
--   - admin      (full system access, can manage users)
--   - provider   (can offer services, manage inspections)
--   - customer   (can book services, view inspections)
--
-- ============================================================================
