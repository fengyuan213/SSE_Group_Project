-- ============================================================================
-- Update Service Providers to Adelaide Area
-- ============================================================================
-- This script updates all existing service providers to be located around
-- Adelaide, SA for testing the nearby services feature.
-- User location: -34.930688, 138.6479616 (Adelaide area)
-- ============================================================================

-- Update provider 1: PlumberPro Ltd -> Adelaide CBD
UPDATE service_providers
SET
    latitude = -34.9285,
    longitude = 138.6007,
    address = 'Adelaide CBD, SA 5000'
WHERE provider_id = 1;

-- Update provider 2: ElectroFix Co. -> North Adelaide
UPDATE service_providers
SET
    latitude = -34.9058,
    longitude = 138.5965,
    address = 'North Adelaide, SA 5006'
WHERE provider_id = 2;

-- Update provider 3: HVAC Expert Solutions -> Glenelg
UPDATE service_providers
SET
    latitude = -34.9797,
    longitude = 138.5141,
    address = 'Glenelg, SA 5045'
WHERE provider_id = 3;

-- Update provider 4: CleanHome Services -> Norwood
UPDATE service_providers
SET
    latitude = -34.9190,
    longitude = 138.6289,
    address = 'Norwood, SA 5067'
WHERE provider_id = 4;

-- Update provider 5: Quick Maintenance -> Henley Beach
UPDATE service_providers
SET
    latitude = -34.9201,
    longitude = 138.4972,
    address = 'Henley Beach, SA 5022'
WHERE provider_id = 5;

-- Verify the updates
SELECT
    provider_id,
    business_name,
    latitude,
    longitude,
    address,
    service_radius_km
FROM service_providers
ORDER BY provider_id;

-- Calculate distances from user location (-34.930688, 138.6479616)
-- This is just for verification purposes
SELECT
    provider_id,
    business_name,
    address,
    ROUND(
        6371 * 2 * ASIN(
            SQRT(
                POWER(SIN((RADIANS(-34.930688) - RADIANS(latitude)) / 2), 2) +
                COS(RADIANS(-34.930688)) * COS(RADIANS(latitude)) *
                POWER(SIN((RADIANS(138.6479616) - RADIANS(longitude)) / 2), 2)
            )
        )::numeric, 2
    ) AS distance_km
FROM service_providers
ORDER BY distance_km;

