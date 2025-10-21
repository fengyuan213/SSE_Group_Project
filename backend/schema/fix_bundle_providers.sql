-- ============================================================================
-- FIX BUNDLE PROVIDER COVERAGE
-- ============================================================================
-- This migration adds service capabilities to providers so they can deliver
-- bundle packages. Each bundle requires a provider who can perform ALL
-- included services.

-- Make Provider 4 and 5 into "full service" providers who can handle bundles
-- Provider 4: Already has general services (5, 10), add plumbing, electrical, HVAC
INSERT INTO provider_services (provider_id, package_id, is_available)
VALUES
-- Provider 4: Add plumbing services
(4, 1, TRUE),  -- Basic Plumbing Inspection
(4, 2, TRUE),  -- Emergency Leak Repair
(4, 6, TRUE),  -- Pipe Replacement Service
-- Provider 4: Add electrical services
(4, 3, TRUE),  -- Electrical Safety Check
(4, 7, TRUE),  -- Lighting Installation
-- Provider 4: Add HVAC services
(4, 4, TRUE),  -- AC Maintenance
(4, 8, TRUE),  -- AC Gas Refill
(4, 9, TRUE)   -- Heating System Tune-up
ON CONFLICT (provider_id, package_id) DO UPDATE SET is_available = TRUE;

-- Provider 5: Make them full-service too for redundancy
INSERT INTO provider_services (provider_id, package_id, is_available)
VALUES
-- Provider 5: Add plumbing services
(5, 1, TRUE),  -- Basic Plumbing Inspection
(5, 2, TRUE),  -- Emergency Leak Repair
-- Provider 5: Add electrical services
(5, 3, TRUE),  -- Electrical Safety Check
-- Provider 5: Add HVAC services
(5, 4, TRUE),  -- AC Maintenance
(5, 8, TRUE),  -- AC Gas Refill
(5, 9, TRUE)   -- Heating System Tune-up
ON CONFLICT (provider_id, package_id) DO UPDATE SET is_available = TRUE;

-- Update provider descriptions to reflect their expanded capabilities
UPDATE service_providers
SET description = 'Full-service home services provider offering plumbing, electrical, HVAC, and general maintenance. Perfect for bundle packages and comprehensive home care.'
WHERE provider_id = 4;

UPDATE service_providers
SET description = 'Comprehensive home services provider with expertise in all areas: plumbing, electrical, HVAC, and general maintenance. Ideal for complete home solutions.'
WHERE provider_id = 5;

-- Verify coverage for each bundle
-- This query shows which providers can now handle each bundle
DO $$
DECLARE
    bundle_id INT;
    bundle_name TEXT;
    provider_count INT;
BEGIN
    RAISE NOTICE '=== BUNDLE PROVIDER COVERAGE ===';

    FOR bundle_id, bundle_name IN
        SELECT package_id, package_name
        FROM service_packages
        WHERE package_type = 'bundle' AND is_active = TRUE
    LOOP
        -- Count providers who can handle this bundle
        SELECT COUNT(*) INTO provider_count
        FROM service_providers sp
        WHERE sp.is_active = TRUE
        AND NOT EXISTS (
            -- Check if there's any included service this provider doesn't offer
            SELECT 1
            FROM bundle_items bi
            WHERE bi.bundle_package_id = bundle_id
            AND NOT EXISTS (
                SELECT 1
                FROM provider_services ps
                WHERE ps.provider_id = sp.provider_id
                AND ps.package_id = bi.included_package_id
                AND ps.is_available = TRUE
            )
        );

        RAISE NOTICE 'Bundle % (%): % provider(s) available', bundle_id, bundle_name, provider_count;
    END LOOP;
END $$;

COMMENT ON TABLE provider_services IS 'Links providers to services they can deliver. Providers 4 and 5 are full-service and can handle bundle packages.';

