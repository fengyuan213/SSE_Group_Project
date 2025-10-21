-- ============================================================================
-- ADD HOME INSPECTION PACKAGE
-- ============================================================================
-- Create the special "Home Inspection" service package that users book first
-- to get their personalized urgent work list

-- Insert Home Inspection package
INSERT INTO service_packages (
  category_id,
  package_name,
  description,
  base_price,
  duration_minutes,
  package_type,
  requires_inspection,
  is_active
) VALUES (
  4, -- Assuming category 4 exists (adjust if needed)
  'Special General Service (Home Inspection)',
  'Comprehensive home inspection service covering safety, water, power, HVAC, and visible structure. Inspector will assess your property and provide a detailed urgent work list with prioritized recommendations.',
  150.00,
  180, -- 3 hours for thorough inspection
  'single',
  FALSE, -- This IS the inspection itself
  TRUE
)
ON CONFLICT DO NOTHING;

-- Get the package_id of the inspection package
-- (You'll need this to link providers to offer this service)

COMMENT ON COLUMN service_packages.requires_inspection IS
  'If TRUE, this service requires a prior inspection. The Home Inspection package itself has this as FALSE.';

-- Create mock user for testing (using proper UUID and column names)
INSERT INTO users (id, auth0_user_id, email, name, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000123'::uuid,
  'mock|user-123',
  'testuser@example.com',
  'Test User',
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

-- Create test provider
INSERT INTO service_providers (
  user_id,
  business_name,
  description,
  address,
  is_active,
  is_verified
) VALUES (
  '00000000-0000-0000-0000-000000000123'::uuid,
  'Home Inspection Services',
  'Professional home inspection services',
  '123 Test Street',
  TRUE,
  TRUE
)
ON CONFLICT DO NOTHING;
