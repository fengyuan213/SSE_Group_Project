-- ============================================================================
-- Home Services Application - PostgreSQL Database Schema
-- ============================================================================
-- Auth0 Integration: Auth0 handles authentication, we store auth0_id (sub claim)
-- Note: Email and phone are optional for demo purposes
-- ============================================================================

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DELETE EXISTING SCHEMA AND DATA
-- ============================================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
--GRANT ALL ON SCHEMA public TO postgres;
--GRANT ALL ON SCHEMA public TO public;
--SET search_path TO public;
-- ============================================================================

-- ============================================================================
-- MODULE 1: USER MANAGEMENT
-- ============================================================================

-- Users Table (Core user information linked to Auth0)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth0_user_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    name TEXT,
    given_name TEXT,
    family_name TEXT,
    nickname TEXT,
    picture TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    metadata JSONB
);

-- Index for faster Auth0 lookups
CREATE INDEX idx_users_auth0_id ON users(auth0_user_id);
CREATE INDEX idx_users_email ON users(email);

-- Define available roles
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL, -- 'admin', 'provider', 'customer'
    description TEXT
);

-- Link users to roles (many-to-many for flexibility)
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(role_id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- ============================================================================
-- MODULE 2: SERVICE DISCOVERY & INSPECTION
-- ============================================================================

-- Service Categories
CREATE TABLE service_categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Service Packages (Module 2.1)
CREATE TABLE service_packages (
    package_id SERIAL PRIMARY KEY,
    category_id INT REFERENCES service_categories(category_id),
    package_name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2),
    duration_minutes INT, -- Estimated service duration
    is_active BOOLEAN DEFAULT TRUE,
    requires_inspection BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_service_packages_category ON service_packages(category_id);
CREATE INDEX idx_service_packages_active ON service_packages(is_active);

-- Service Providers (for Module 3.2 - Nearby Providers)
CREATE TABLE service_providers (
    provider_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255),
    description TEXT,
    latitude DECIMAL(10, 8), -- For geolocation
    longitude DECIMAL(11, 8),
    address TEXT,
    service_radius_km DECIMAL(5, 2), -- Service coverage radius
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    max_concurrent_jobs INT DEFAULT 1,
    working_hours_start TIME DEFAULT '09:00',
    working_hours_end TIME DEFAULT '17:00',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN service_providers.max_concurrent_jobs IS 'Maximum number of jobs provider can handle simultaneously';

CREATE INDEX idx_providers_location ON service_providers(latitude, longitude);
CREATE INDEX idx_providers_active ON service_providers(is_active);

-- Provider Services (Many-to-Many: Providers can offer multiple packages)
CREATE TABLE provider_services (
    provider_service_id SERIAL PRIMARY KEY,
    provider_id INT REFERENCES service_providers(provider_id) ON DELETE CASCADE,
    package_id INT REFERENCES service_packages(package_id) ON DELETE CASCADE,
    custom_price DECIMAL(10, 2), -- Provider can override package price
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Inspection Visits (Module 2.2)
CREATE TABLE inspection_visits (
    inspection_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider_id INT REFERENCES service_providers(provider_id),
    inspection_date TIMESTAMPTZ,
    inspection_status VARCHAR(50), -- 'scheduled', 'completed', 'cancelled'
    inspection_notes TEXT,
    inspector_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Urgent Work List (Module 2.2 - Generated from inspections)
CREATE TABLE urgent_work_items (
    urgent_item_id SERIAL PRIMARY KEY,
    inspection_id INT REFERENCES inspection_visits(inspection_id) ON DELETE CASCADE,
    item_description TEXT NOT NULL,
    urgency_level VARCHAR(50), -- 'critical', 'high', 'medium'
    estimated_cost DECIMAL(10, 2),
    recommended_package_id INT REFERENCES service_packages(package_id),
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_urgent_items_inspection ON urgent_work_items(inspection_id);

-- ============================================================================
-- MODULE 3: BOOKING & RESTRICTIONS
-- ============================================================================

-- Bookings (Module 3.1)
CREATE TABLE bookings (
    booking_id SERIAL PRIMARY KEY,
    booking_reference VARCHAR(50) UNIQUE NOT NULL, -- Human-readable reference
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    package_id INT REFERENCES service_packages(package_id),
    provider_id INT REFERENCES service_providers(provider_id),
    inspection_id INT REFERENCES inspection_visits(inspection_id), -- Link to inspection if applicable
    booking_type VARCHAR(50), -- 'urgent', 'non-urgent', 'inspection-based'
    booking_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'in-progress', 'completed', 'cancelled'
    scheduled_date TIMESTAMPTZ,
    scheduled_end_date TIMESTAMPTZ,
    service_address TEXT,
    service_latitude DECIMAL(10, 8),
    service_longitude DECIMAL(11, 8),
    special_instructions TEXT,
    restriction_check_status VARCHAR(50), -- 'passed', 'failed', 'pending', 'not-applicable'
    restriction_check_date TIMESTAMPTZ,
    restriction_details JSONB, -- Store COVID/restriction API response
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_provider ON bookings(provider_id);
CREATE INDEX idx_bookings_status ON bookings(booking_status);
CREATE INDEX idx_bookings_date ON bookings(scheduled_date);

-- Generate unique booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
    NEW.booking_reference := 'BK-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(NEW.booking_id::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_reference
BEFORE  INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION generate_booking_reference();

-- Provider Availability (Provider calendar blocks - vacations, sick days, holidays)
CREATE TABLE provider_availability (
    availability_id SERIAL PRIMARY KEY,
    provider_id INT REFERENCES service_providers(provider_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    reason VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, date, start_time, end_time)
);

CREATE INDEX idx_provider_availability ON provider_availability(provider_id, date);

COMMENT ON TABLE provider_availability IS 'Provider calendar blocks (vacation, sick leave) - separate from customer bookings';

-- Booking Time Slots (30-minute slot reservations - SINGLE SOURCE OF TRUTH)
CREATE TABLE booking_time_slots (
    booking_slot_id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES bookings(booking_id) ON DELETE CASCADE,
    provider_id INT REFERENCES service_providers(provider_id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    status VARCHAR(50) DEFAULT 'booked',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_slot_time CHECK (
        EXTRACT(MINUTE FROM slot_time)::INT IN (0, 30)
    )
);

CREATE INDEX idx_booking_slots_provider_date ON booking_time_slots(provider_id, slot_date, slot_time);
CREATE INDEX idx_booking_slots_booking ON booking_time_slots(booking_id);

COMMENT ON TABLE booking_time_slots IS 'Individual 30-min slot reservations - SINGLE SOURCE OF TRUTH for booking times';
COMMENT ON CONSTRAINT valid_slot_time ON booking_time_slots IS 'Enforce 30-minute intervals (00 or 30 minutes)';

-- Booking Time Ranges View (convenience view for querying booking start/end times)
CREATE OR REPLACE VIEW booking_time_ranges AS
SELECT
    b.booking_id,
    b.booking_reference,
    MIN(bts.slot_date + bts.slot_time) AS start_datetime,
    MAX(bts.slot_date + bts.slot_time) + INTERVAL '30 minutes' AS end_datetime,
    COUNT(DISTINCT bts.slot_date) AS days_span,
    COUNT(*) AS total_slots,
    b.booking_status
FROM bookings b
JOIN booking_time_slots bts ON b.booking_id = bts.booking_id
WHERE bts.status = 'booked'
GROUP BY b.booking_id, b.booking_reference, b.booking_status;

-- Urgent Work Booking Link (Module 3.1 - Attach urgent work to bookings)
CREATE TABLE booking_urgent_items (
    booking_urgent_id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES bookings(booking_id) ON DELETE CASCADE,
    urgent_item_id INT REFERENCES urgent_work_items(urgent_item_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- COVID/Restriction Checks (Module 3.3)
CREATE TABLE restriction_checks (
    check_id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES bookings(booking_id) ON DELETE CASCADE,
    check_type VARCHAR(50), -- 'covid', 'area-restriction', 'weather'
    check_status VARCHAR(50), -- 'safe', 'not-safe', 'api-failed'
    check_response JSONB, -- Store full API response
    check_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    api_endpoint VARCHAR(255),
    failsafe_applied BOOLEAN DEFAULT FALSE
);

-- ============================================================================
-- MODULE 4: PAYMENT & CONFIRMATION
-- ============================================================================

-- Payments (Module 4.1)
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES bookings(booking_id) ON DELETE CASCADE,
    payment_reference VARCHAR(100) UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    voucher_code VARCHAR(50),
    final_amount DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    payment_method VARCHAR(100), -- 'credit_card', 'debit_card', 'paypal', 'bank_transfer'
    payment_gateway VARCHAR(100),
    transaction_id VARCHAR(255), -- Gateway transaction ID
    payment_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(payment_status);

-- Vouchers/Discounts (Module 4.1)
CREATE TABLE vouchers (
    voucher_id SERIAL PRIMARY KEY,
    voucher_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20), -- 'percentage', 'fixed_amount'
    discount_value DECIMAL(10, 2),
    min_purchase_amount DECIMAL(10, 2),
    max_discount_amount DECIMAL(10, 2),
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    usage_limit INT,
    times_used INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Voucher Usage Tracking
CREATE TABLE voucher_usage (
    usage_id SERIAL PRIMARY KEY,
    voucher_id INT REFERENCES vouchers(voucher_id),
    payment_id INT REFERENCES payments(payment_id),
    user_id UUID REFERENCES users(id),
    used_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Confirmations & Tickets (Module 4.2)
CREATE TABLE confirmations (
    confirmation_id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES bookings(booking_id) ON DELETE CASCADE,
    confirmation_number VARCHAR(100) UNIQUE NOT NULL,
    qr_code_data TEXT, -- QR code content
    qr_code_image_url VARCHAR(255), -- URL to stored QR code image
    confirmation_letter_url VARCHAR(255), -- URL to PDF confirmation letter
    confirmation_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    email_sent BOOLEAN DEFAULT FALSE,
    sms_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    sms_sent_at TIMESTAMPTZ
);

-- ============================================================================
-- MODULE 5: PROVIDER & ADMIN
-- ============================================================================

-- Provider Booking Actions (Module 5.1)
CREATE TABLE provider_booking_responses (
    action_id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES bookings(booking_id) ON DELETE CASCADE,
    provider_id INT REFERENCES service_providers(provider_id),
    action_type VARCHAR(50), -- 'accept', 'reject', 'reschedule', 'complete'
    action_notes TEXT,
    action_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);



-- ============================================================================
-- MODULE 6: LOGGING & FEEDBACK
-- ============================================================================

-- Audit Logs (Module 6.1) Use audit_logs for system events (cleanup, user logins)
CREATE TABLE audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    log_type VARCHAR(50), -- 'user_action', 'system_event', 'security_event'
    action VARCHAR(255),
    action_details JSONB, -- Flexible JSON storage for action metadata
    severity VARCHAR(20), -- 'info', 'warning', 'error', 'critical'
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
-- Admin Actions Log (Module 5.2) Use admin_actions for explicit admin interactions (policy changes, managing users)
CREATE TABLE admin_actions (
    admin_action_id SERIAL PRIMARY KEY,
    admin_user_id UUID REFERENCES users(id),
    action_type VARCHAR(100), -- 'manage_user', 'manage_service', 'update_policy'
    target_type VARCHAR(50), -- 'user', 'service', 'provider', 'booking'
    target_id INT,
    action_details JSONB,
    action_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_type ON audit_logs(log_type);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Consent Logs (Module 1.3)
CREATE TABLE consent_logs (
    consent_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(100), -- 'data_sharing', 'marketing', 'terms_of_service'
    consent_given BOOLEAN NOT NULL,
    consent_version VARCHAR(50), -- Track version of terms/policy
    consent_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);
CREATE INDEX idx_consent_user_type ON consent_logs(user_id, consent_type);

-- Feedback & Ratings (from flowchart)
CREATE TABLE feedback (
    feedback_id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES bookings(booking_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    provider_id INT REFERENCES service_providers(provider_id),
    rating INT CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    admin_response TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_booking ON feedback(booking_id);
CREATE INDEX idx_feedback_provider ON feedback(provider_id);

-- ============================================================================
-- TRIGGER: Update updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_packages_updated_at BEFORE UPDATE ON service_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_providers_updated_at BEFORE UPDATE ON service_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DATA RETENTION: Automated Cleanup Function (Module 1.4) -done
-- ============================================================================
CREATE TABLE data_retention_policies (
    data_type VARCHAR(100) PRIMARY KEY,      -- e.g. 'personal_data', 'bookings', 'audit_logs'
    retention_period INTERVAL NOT NULL,      -- e.g. '1 year', '90 days'
    auto_delete_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Example data
INSERT INTO data_retention_policies (data_type, retention_period) VALUES
('personal_data', '2 years'),
('bookings', '1 year'),
('audit_logs', '180 days');

-- ============================================================================
-- SAMPLE DATA FOR DEVELOPMENT AND DEMO
-- ============================================================================
-- Note: Sample data inserts are located further down in this file to avoid
-- duplication. See lines 572+ for roles, categories, and packages.

-- Insert sample vouchers
INSERT INTO vouchers (voucher_code, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, valid_from, valid_until, usage_limit) VALUES
('WELCOME20', 'Welcome discount for new customers', 'percentage', 20.00, 100.00, 50.00, NOW(), NOW() + INTERVAL '30 days', 100),
('SPRING25', 'Spring cleaning special offer', 'percentage', 25.00, 200.00, 75.00, NOW(), NOW() + INTERVAL '60 days', 50),
('EMERGENCY10', 'Emergency service discount', 'fixed_amount', 50.00, 250.00, 50.00, NOW(), NOW() + INTERVAL '90 days', 200),
('BULK50', 'Bulk service package discount', 'fixed_amount', 100.00, 500.00, 100.00, NOW(), NOW() + INTERVAL '45 days', 25);
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
DECLARE
    personal_retention INTERVAL;
    booking_retention INTERVAL;
    audit_retention INTERVAL;
BEGIN
    -- Fetch retention intervals
    SELECT retention_period INTO personal_retention
    FROM data_retention_policies
    WHERE data_type = 'personal_data' AND auto_delete_enabled = TRUE;

    SELECT retention_period INTO booking_retention
    FROM data_retention_policies
    WHERE data_type = 'bookings' AND auto_delete_enabled = TRUE;

    SELECT retention_period INTO audit_retention
    FROM data_retention_policies
    WHERE data_type = 'audit_logs' AND auto_delete_enabled = TRUE;

    -- === Delete old users
    DELETE FROM users
    WHERE last_login < (CURRENT_TIMESTAMP - personal_retention);
    -- === Delete old bookings
    DELETE FROM bookings
    WHERE scheduled_date < (CURRENT_TIMESTAMP - booking_retention);

    -- === Delete old audit logs
    DELETE FROM audit_logs
    WHERE created_at < (CURRENT_TIMESTAMP - audit_retention);

    -- === Log cleanup event
    INSERT INTO audit_logs (log_type, action, action_details, severity)
    VALUES (
        'system_event',
        'auto_cleanup_expired_data',
        jsonb_build_object(
            'timestamp', CURRENT_TIMESTAMP,
            'policies_applied', jsonb_build_array('personal_data', 'bookings', 'audit_logs')
        ),
        'info'
    );
END;
$$ LANGUAGE plpgsql;

-- Schedule this function to run via cron job or pg_cron extension
-- Example: SELECT cron.schedule('cleanup-expired-data', '0 2 * * *', 'SELECT cleanup_expired_data()');

-- ============================================================================
-- VIEWS: Useful aggregations
-- ============================================================================

-- View: Active bookings with user and provider details
CREATE OR REPLACE VIEW active_bookings_view AS
SELECT
    b.booking_id,
    b.booking_reference,
    b.booking_status,
    b.scheduled_date,
    u.id AS user_id,
    u.name AS username,
    u.email,
    sp.provider_id,
    sp.business_name,
    pkg.package_name,
    b.service_address
FROM bookings b
JOIN users u ON b.user_id = u.id
JOIN service_providers sp ON b.provider_id = sp.provider_id
JOIN service_packages pkg ON b.package_id = pkg.package_id
WHERE b.booking_status NOT IN ('completed', 'cancelled');
-- View: Provider performance metrics
CREATE OR REPLACE VIEW provider_performance_view AS
SELECT
    sp.provider_id,
    sp.business_name,
    sp.average_rating,
    COUNT(DISTINCT b.booking_id) as total_bookings,
    COUNT(DISTINCT CASE WHEN b.booking_status = 'completed' THEN b.booking_id END) as completed_bookings,
    COUNT(DISTINCT f.feedback_id) as total_reviews,
    AVG(f.rating) as calculated_avg_rating
FROM service_providers sp
LEFT JOIN bookings b ON sp.provider_id = b.provider_id
LEFT JOIN feedback f ON sp.provider_id = f.provider_id
WHERE sp.is_active = TRUE
GROUP BY sp.provider_id, sp.business_name, sp.average_rating;

-- ============================================================================
-- CONSTRAINT: SET DATA VALID RANGE
-- ============================================================================


ALTER TABLE service_packages
  ADD CONSTRAINT chk_service_price CHECK (base_price >= 0);

ALTER TABLE payments
  ADD CONSTRAINT chk_payments_amount CHECK (amount >= 0),
  ADD CONSTRAINT chk_final_amount CHECK (final_amount >= 0);

ALTER TABLE vouchers
  ADD CONSTRAINT chk_voucher_value CHECK (discount_value >= 0);


-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

INSERT INTO users (auth0_user_id, email, email_verified, name, given_name, family_name, nickname, picture, last_login, metadata)
VALUES
('auth0|A1', 'admin@example.com', TRUE, 'System Admin', 'System', 'Admin', 'admin', 'https://example.com/admin.jpg', NOW(), '{"role":"admin"}'),
('auth0|A2', 'john.doe@example.com', TRUE, 'John Doe', 'John', 'Doe', 'johnny', 'https://example.com/john.jpg', NOW(), '{"preferred_service":"plumbing"}'),
('auth0|A3', 'jane.smith@example.com', TRUE, 'Jane Smith', 'Jane', 'Smith', 'janes', 'https://example.com/jane.jpg', NOW(), '{"preferred_service":"electrical"}'),
('auth0|A4', 'michael.lee@example.com', TRUE, 'Michael Lee', 'Michael', 'Lee', 'mike', 'https://example.com/mike.jpg', NOW(), '{"preferred_service":"hvac"}'),
('auth0|A5', 'sara.connor@example.com', TRUE, 'Sara Connor', 'Sara', 'Connor', 'sara', 'https://example.com/sara.jpg', NOW(), '{"preferred_service":"maintenance"}');


INSERT INTO roles (role_name, description) VALUES
('admin', 'System administrator with full privileges'),
('provider', 'Service provider who performs jobs'),
('customer', 'End user booking home services');



-- Assign roles to users
INSERT INTO user_roles (user_id, role_id)
SELECT id, 1 FROM users WHERE email = 'admin@example.com';



INSERT INTO user_roles (user_id, role_id)
SELECT id, 3 FROM users WHERE email IN (
  'john.doe@example.com',
  'jane.smith@example.com',
  'michael.lee@example.com',
  'sara.connor@example.com'
);



-- Create 5 provider user accounts
INSERT INTO users (auth0_user_id, email, email_verified, name, nickname, picture, last_login)
VALUES
('auth0|P1', 'plumber.pro@example.com', TRUE, 'Plumber Pro', 'plumberpro', 'https://example.com/p1.jpg', NOW()),
('auth0|P2', 'electro.fix@example.com', TRUE, 'Electro Fix', 'electrofix', 'https://example.com/p2.jpg', NOW()),
('auth0|P3', 'hvac.expert@example.com', TRUE, 'HVAC Expert', 'hvacexpert', 'https://example.com/p3.jpg', NOW()),
('auth0|P4', 'clean.home@example.com', TRUE, 'Clean Home Services', 'cleanhome', 'https://example.com/p4.jpg', NOW()),
('auth0|P5', 'quick.maint@example.com', TRUE, 'Quick Maintenance', 'quickmaint', 'https://example.com/p5.jpg', NOW());


-- Insert sample service categories
INSERT INTO service_categories (category_name, description) VALUES
    ('Plumbing', 'Water and drainage services'),
    ('Electrical', 'Electrical installation and repair'),
    ('HVAC', 'Heating, ventilation, and air conditioning'),
    ('General Maintenance', 'General home maintenance and repairs');

-- Insert sample service packages
INSERT INTO service_packages (category_id, package_name, description, base_price, duration_minutes, requires_inspection) VALUES
    (1, 'Basic Plumbing Inspection', 'Comprehensive plumbing inspection', 150.00, 60, TRUE),
    (1, 'Emergency Leak Repair', 'Urgent leak repair service', 300.00, 120, FALSE),
    (2, 'Electrical Safety Check', 'Full electrical safety inspection', 200.00, 90, TRUE),
    (3, 'AC Maintenance', 'Air conditioning service and maintenance', 180.00, 90, FALSE);



-- Convert them into service providers
INSERT INTO service_providers (
    user_id, business_name, description, latitude, longitude, address,
    service_radius_km, is_verified, average_rating
)
SELECT user_id, business_name, description, latitude, longitude, address,
       radius, verified, rating
FROM (
  VALUES
  ((SELECT id FROM users WHERE email='plumber.pro@example.com'), 'PlumberPro Ltd', 'Expert plumbing and emergency repairs', 51.5074, -0.1278, 'London, UK', 25, TRUE, 4.8),
  ((SELECT id FROM users WHERE email='electro.fix@example.com'), 'ElectroFix Co.', 'Electrical installation and troubleshooting', 52.4862, -1.8904, 'Birmingham, UK', 30, TRUE, 4.5),
  ((SELECT id FROM users WHERE email='hvac.expert@example.com'), 'HVAC Expert Solutions', 'Air conditioning and heating systems', 53.4808, -2.2426, 'Manchester, UK', 35, TRUE, 4.7),
  ((SELECT id FROM users WHERE email='clean.home@example.com'), 'CleanHome Services', 'Home deep cleaning and sanitation', 51.4545, -2.5879, 'Bristol, UK', 20, TRUE, 4.6),
  ((SELECT id FROM users WHERE email='quick.maint@example.com'), 'Quick Maintenance', 'General repairs and maintenance', 55.9533, -3.1883, 'Edinburgh, UK', 40, TRUE, 4.9)
) AS data(user_id, business_name, description, latitude, longitude, address, radius, verified, rating);

-- Update providers with working hours and capacity
UPDATE service_providers
SET max_concurrent_jobs = 2,
    working_hours_start = '08:00',
    working_hours_end = '18:00'
WHERE provider_id IN (1, 2, 3, 4, 5);



INSERT INTO service_packages (category_id, package_name, description, base_price, duration_minutes, requires_inspection)
VALUES
(4, 'Full Home Maintenance', 'Complete home check-up and repair', 500.00, 240, TRUE),
(1, 'Pipe Replacement Service', 'Replacement of damaged pipes', 250.00, 120, FALSE),
(2, 'Lighting Installation', 'Installation of new light fixtures', 180.00, 90, FALSE),
(3, 'AC Gas Refill', 'Refill refrigerant and performance check', 220.00, 60, FALSE),
(3, 'Heating System Tune-up', 'Full service for heating units', 260.00, 120, TRUE),
(4, 'Furniture Assembly', 'Assembling and installation of furniture', 150.00, 60, FALSE);

-- Link providers to service packages (provider_services)
-- Provider 1 (PlumberPro) offers plumbing services
-- Provider 2 (ElectroFix) offers electrical services
-- Provider 3 (HVAC Expert) offers HVAC services
-- Provider 4 (CleanHome) offers general services
-- Provider 5 (Quick Maintenance) offers general maintenance
INSERT INTO provider_services (provider_id, package_id, is_available)
VALUES
-- Provider 1: Plumbing packages
(1, 1, TRUE),  -- Basic Plumbing Inspection
(1, 2, TRUE),  -- Emergency Leak Repair
(1, 6, TRUE),  -- Pipe Replacement Service
-- Provider 2: Electrical packages
(2, 3, TRUE),  -- Electrical Safety Check
(2, 7, TRUE),  -- Lighting Installation
-- Provider 3: HVAC packages
(3, 4, TRUE),  -- AC Maintenance
(3, 8, TRUE),  -- AC Gas Refill
(3, 9, TRUE),  -- Heating System Tune-up
-- Provider 4: General services
(4, 5, TRUE),  -- Full Home Maintenance
(4, 10, TRUE), -- Furniture Assembly
-- Provider 5: General maintenance
(5, 5, TRUE),  -- Full Home Maintenance
(5, 10, TRUE); -- Furniture Assembly

-- Fake bookings
INSERT INTO bookings (user_id, package_id, provider_id, booking_type, booking_status, scheduled_date, service_address, special_instructions)
VALUES
((SELECT id FROM users WHERE email='john.doe@example.com'), 1, 1, 'non-urgent', 'confirmed', NOW() + INTERVAL '2 days', '221B Baker Street, London', 'Check kitchen sink leaks'),
((SELECT id FROM users WHERE email='jane.smith@example.com'), 2, 1, 'urgent', 'pending', NOW() + INTERVAL '1 day', '10 Downing Street, London', 'Fix leak immediately'),
((SELECT id FROM users WHERE email='michael.lee@example.com'), 3, 2, 'inspection-based', 'completed', NOW() - INTERVAL '3 days', '11 King Street, Manchester', 'Safety inspection before renovation'),
((SELECT id FROM users WHERE email='sara.connor@example.com'), 4, 3, 'non-urgent', 'in-progress', NOW() + INTERVAL '4 days', '22 Queen Road, Bristol', 'HVAC needs cleaning'),
((SELECT id FROM users WHERE email='john.doe@example.com'), 5, 4, 'urgent', 'pending', NOW() + INTERVAL '1 day', '14 Baker Street, London', 'Schedule fast'),
((SELECT id FROM users WHERE email='jane.smith@example.com'), 6, 5, 'non-urgent', 'confirmed', NOW() + INTERVAL '5 days', '45 Elm Street, Birmingham', 'Assembly required for 2 items');



-- Fake payments
INSERT INTO payments (booking_id, amount, discount_amount, final_amount, payment_status, payment_method, payment_gateway, transaction_id, payment_date)
VALUES
(1, 150.00, 0.00, 150.00, 'completed', 'credit_card', 'Stripe', 'txn_001', NOW()),
(2, 300.00, 20.00, 280.00, 'completed', 'paypal', 'PayPal', 'txn_002', NOW()),
(3, 200.00, 0.00, 200.00, 'completed', 'debit_card', 'Stripe', 'txn_003', NOW()),
(4, 180.00, 10.00, 170.00, 'pending', 'bank_transfer', 'Revolut', 'txn_004', NOW()),
(5, 250.00, 25.00, 225.00, 'completed', 'credit_card', 'Stripe', 'txn_005', NOW()),
(6, 150.00, 0.00, 150.00, 'completed', 'paypal', 'PayPal', 'txn_006', NOW());



-- Fake confirmations
INSERT INTO confirmations (booking_id, confirmation_number, qr_code_data, confirmation_date, email_sent)
VALUES
(1, 'CONF-0001', 'QRDATA-0001', NOW(), TRUE),
(2, 'CONF-0002', 'QRDATA-0002', NOW(), TRUE),
(3, 'CONF-0003', 'QRDATA-0003', NOW(), TRUE),
(4, 'CONF-0004', 'QRDATA-0004', NOW(), FALSE),
(5, 'CONF-0005', 'QRDATA-0005', NOW(), TRUE),
(6, 'CONF-0006', 'QRDATA-0006', NOW(), FALSE);



-- Fake feedback
INSERT INTO feedback (booking_id, user_id, provider_id, rating, feedback_text, is_public)
VALUES
(1, (SELECT id FROM users WHERE email='john.doe@example.com'), 1, 5, 'Excellent plumbing service!', TRUE),
(2, (SELECT id FROM users WHERE email='jane.smith@example.com'), 1, 4, 'Quick response, but a bit pricey.', TRUE),
(3, (SELECT id FROM users WHERE email='michael.lee@example.com'), 2, 5, 'Very professional inspection.', TRUE),
(4, (SELECT id FROM users WHERE email='sara.connor@example.com'), 3, 3, 'Took longer than expected.', FALSE),
(5, (SELECT id FROM users WHERE email='john.doe@example.com'), 4, 5, 'Fantastic team, highly recommended.', TRUE),
(6, (SELECT id FROM users WHERE email='jane.smith@example.com'), 5, 4, 'Good quality work.', TRUE);



INSERT INTO audit_logs (user_id, log_type, action, action_details, severity, ip_address)
SELECT id, log_type, action, details::jsonb, sev, ip::INET FROM (
  VALUES
  ((SELECT id FROM users WHERE email='admin@example.com'), 'system_event', 'cleanup_trigger', '{"module":"retention"}', 'info', '127.0.0.1'),
  ((SELECT id FROM users WHERE email='john.doe@example.com'), 'user_action', 'booking_created', '{"booking_id":1}', 'info', '192.168.0.11'),
  ((SELECT id FROM users WHERE email='jane.smith@example.com'), 'user_action', 'payment_completed', '{"booking_id":2}', 'info', '192.168.0.12'),
  ((SELECT id FROM users WHERE email='michael.lee@example.com'), 'user_action', 'feedback_submitted', '{"booking_id":3}', 'info', '192.168.0.13'),
  ((SELECT id FROM users WHERE email='sara.connor@example.com'), 'user_action', 'account_login', '{"device":"chrome"}', 'info', '192.168.0.14')
) AS a(id, log_type, action, details, sev, ip);


INSERT INTO consent_logs (user_id, consent_type, consent_given, consent_version, ip_address, user_agent)
SELECT id, ctype, TRUE, 'v1.0', ip::INET, 'Mozilla/5.0'
FROM (
  VALUES
  ((SELECT id FROM users WHERE email='john.doe@example.com'), 'terms_of_service', '192.168.0.10'),
  ((SELECT id FROM users WHERE email='jane.smith@example.com'), 'terms_of_service', '192.168.0.11'),
  ((SELECT id FROM users WHERE email='michael.lee@example.com'), 'data_sharing', '192.168.0.12'),
  ((SELECT id FROM users WHERE email='sara.connor@example.com'), 'marketing', '192.168.0.13'),
  ((SELECT id FROM users WHERE email='admin@example.com'), 'terms_of_service', '127.0.0.1')
) AS c(id, ctype, ip);


