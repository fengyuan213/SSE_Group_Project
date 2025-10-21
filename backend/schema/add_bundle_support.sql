-- ============================================================================
-- ADD BUNDLE PACKAGE SUPPORT TO EXISTING SCHEMA
-- ============================================================================
-- This migration adds support for service packages that bundle multiple
-- services together at a discounted rate, as per assignment requirements

-- Add package_type column to distinguish single services from bundles
ALTER TABLE service_packages
ADD COLUMN IF NOT EXISTS package_type VARCHAR(20) DEFAULT 'single'
  CHECK (package_type IN ('single', 'bundle')),
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2) DEFAULT 0.00
  CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS is_customizable BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN service_packages.package_type IS 'Type: single (individual service) or bundle (multiple services)';
COMMENT ON COLUMN service_packages.discount_percentage IS 'Discount applied to bundle compared to sum of individual services';
COMMENT ON COLUMN service_packages.is_customizable IS 'Whether users can add/remove services from this bundle';

-- Junction table: Which individual services are included in a bundle
CREATE TABLE IF NOT EXISTS bundle_items (
  bundle_item_id SERIAL PRIMARY KEY,
  bundle_package_id INT NOT NULL REFERENCES service_packages(package_id) ON DELETE CASCADE,
  included_package_id INT NOT NULL REFERENCES service_packages(package_id) ON DELETE CASCADE,
  is_optional BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT no_self_reference CHECK (bundle_package_id != included_package_id),
  CONSTRAINT unique_bundle_item UNIQUE (bundle_package_id, included_package_id)
);

CREATE INDEX idx_bundle_items_bundle ON bundle_items(bundle_package_id);
CREATE INDEX idx_bundle_items_included ON bundle_items(included_package_id);

COMMENT ON TABLE bundle_items IS 'Defines which individual services are included in bundle packages';
COMMENT ON COLUMN bundle_items.is_optional IS 'Whether customer can remove this service to save cost';

-- Track customizations made to bookings (when customer modifies a bundle)
CREATE TABLE IF NOT EXISTS booking_customizations (
  customization_id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
  removed_package_id INT REFERENCES service_packages(package_id),
  added_package_id INT REFERENCES service_packages(package_id),
  price_adjustment DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_customizations ON booking_customizations(booking_id);

COMMENT ON TABLE booking_customizations IS 'Tracks user customizations to bundle packages (add/remove services)';

-- View: Get bundle details with included services and calculated pricing
CREATE OR REPLACE VIEW bundle_package_details AS
SELECT
  sp.package_id,
  sp.package_name,
  sp.description,
  sp.package_type,
  sp.base_price as bundle_price,
  sp.discount_percentage,
  sp.is_customizable,
  sp.duration_minutes as total_duration,
  sp.category_id,
  sc.category_name,
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'package_id', included.package_id,
        'package_name', included.package_name,
        'description', included.description,
        'base_price', included.base_price,
        'duration_minutes', included.duration_minutes,
        'is_optional', bi.is_optional,
        'display_order', bi.display_order
      ) ORDER BY bi.display_order
    )
    FROM bundle_items bi
    JOIN service_packages included ON bi.included_package_id = included.package_id
    WHERE bi.bundle_package_id = sp.package_id
    ), '[]'::json
  ) as included_services,
  (
    SELECT COALESCE(SUM(included.base_price), 0)
    FROM bundle_items bi
    JOIN service_packages included ON bi.included_package_id = included.package_id
    WHERE bi.bundle_package_id = sp.package_id
  ) as original_total_price,
  (
    SELECT COALESCE(SUM(included.duration_minutes), 0)
    FROM bundle_items bi
    JOIN service_packages included ON bi.included_package_id = included.package_id
    WHERE bi.bundle_package_id = sp.package_id
  ) as calculated_total_duration
FROM service_packages sp
JOIN service_categories sc ON sp.category_id = sc.category_id
WHERE sp.package_type = 'bundle'
  AND sp.is_active = TRUE;

COMMENT ON VIEW bundle_package_details IS 'Complete bundle information with included services and pricing';

-- ============================================================================
-- SAMPLE BUNDLE DATA
-- ============================================================================

-- Create some example bundle packages
INSERT INTO service_packages (
  category_id,
  package_name,
  description,
  base_price,
  duration_minutes,
  package_type,
  discount_percentage,
  is_customizable,
  is_active
) VALUES
  -- Home Safety Bundle
  (4,
   'Complete Home Safety Bundle',
   'Comprehensive safety inspection including plumbing, electrical, and HVAC checks. Save 25% compared to booking separately!',
   450.00,  -- Discounted from ~600
   270,     -- ~4.5 hours
   'bundle',
   25.00,   -- 25% discount
   TRUE,
   TRUE),

  -- Emergency Response Bundle
  (4,
   'Emergency Response Package',
   'Fast-track emergency services bundle for urgent plumbing and electrical issues. Available 24/7.',
   650.00,  -- Discounted from ~750
   180,
   'bundle',
   15.00,   -- 15% discount
   FALSE,   -- Not customizable - all services required for emergencies
   TRUE),

  -- Seasonal Maintenance Bundle
  (3,
   'Seasonal Home Maintenance',
   'Prepare your home for the season with HVAC tune-up, filter changes, and system optimization.',
   380.00,  -- Discounted from ~460
   210,
   'bundle',
   20.00,   -- 20% discount
   TRUE,
   TRUE),

  -- New Home Setup Bundle
  (4,
   'New Home Setup Bundle',
   'Everything you need for a new home: inspections, installations, and furniture assembly.',
   750.00,  -- Discounted from ~900
   360,
   'bundle',
   18.00,
   TRUE,
   TRUE);

-- Link existing individual services to the Home Safety Bundle (assuming package IDs 1-10 exist)
-- Bundle ID would be 11 (Complete Home Safety Bundle)
INSERT INTO bundle_items (bundle_package_id, included_package_id, is_optional, display_order)
VALUES
  (11, 1, FALSE, 1),  -- Basic Plumbing Inspection (required)
  (11, 3, FALSE, 2),  -- Electrical Safety Check (required)
  (11, 4, TRUE, 3);   -- AC Maintenance (optional)

-- Emergency Response Bundle (ID 12)
INSERT INTO bundle_items (bundle_package_id, included_package_id, is_optional, display_order)
VALUES
  (12, 2, FALSE, 1),  -- Emergency Leak Repair (required)
  (12, 3, FALSE, 2);  -- Electrical Safety Check (required)

-- Seasonal Maintenance Bundle (ID 13)
INSERT INTO bundle_items (bundle_package_id, included_package_id, is_optional, display_order)
VALUES
  (13, 4, FALSE, 1),  -- AC Maintenance (required)
  (13, 8, TRUE, 2),   -- AC Gas Refill (optional)
  (13, 9, FALSE, 3);  -- Heating System Tune-up (required)

-- New Home Setup Bundle (ID 14)
INSERT INTO bundle_items (bundle_package_id, included_package_id, is_optional, display_order)
VALUES
  (14, 1, FALSE, 1),   -- Basic Plumbing Inspection
  (14, 3, FALSE, 2),   -- Electrical Safety Check
  (14, 5, TRUE, 3),    -- Full Home Maintenance (optional)
  (14, 10, TRUE, 4);   -- Furniture Assembly (optional)

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate actual bundle price after customization
CREATE OR REPLACE FUNCTION calculate_customized_bundle_price(
  p_bundle_package_id INT,
  p_removed_package_ids INT[],
  p_added_package_ids INT[]
) RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_base_price DECIMAL(10, 2);
  v_removed_cost DECIMAL(10, 2) := 0;
  v_added_cost DECIMAL(10, 2) := 0;
BEGIN
  -- Get bundle base price
  SELECT base_price INTO v_base_price
  FROM service_packages
  WHERE package_id = p_bundle_package_id;

  -- Calculate cost of removed services
  IF p_removed_package_ids IS NOT NULL THEN
    SELECT COALESCE(SUM(base_price), 0) INTO v_removed_cost
    FROM service_packages
    WHERE package_id = ANY(p_removed_package_ids);
  END IF;

  -- Calculate cost of added services
  IF p_added_package_ids IS NOT NULL THEN
    SELECT COALESCE(SUM(base_price), 0) INTO v_added_cost
    FROM service_packages
    WHERE package_id = ANY(p_added_package_ids);
  END IF;

  -- Return adjusted price
  RETURN v_base_price - v_removed_cost + v_added_cost;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_customized_bundle_price IS 'Calculate bundle price after user adds/removes services';

