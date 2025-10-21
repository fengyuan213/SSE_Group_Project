-- ============================================================================
-- ADD DISCOUNT SUPPORT TO URGENT WORK ITEMS
-- ============================================================================
-- Remove estimated_cost and add discount_percentage instead
-- Price comes from the recommended package, discount is optional

-- Add discount_percentage column
ALTER TABLE urgent_work_items
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2) DEFAULT 0.00
CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

-- Drop estimated_cost if it exists (it might not be used anymore)
-- ALTER TABLE urgent_work_items DROP COLUMN IF EXISTS estimated_cost;

COMMENT ON COLUMN urgent_work_items.discount_percentage IS
  'Discount percentage applied by provider (0-100). Price comes from recommended_package.base_price';


