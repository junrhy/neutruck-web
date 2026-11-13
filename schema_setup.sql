-- ==============================================================================
-- PostgreSQL Schema Isolation Setup for NeuGroup Database
-- Schemas:
--   1. `neutruck`  - Fleet, Dispatch, Fuel, Maintenance & Billing Data
--   2. `neugate`   - Gate Access Control, Visitor & Employee Entry Logs
-- ==============================================================================

-- 1. Create Isolated Schemas
CREATE SCHEMA IF NOT EXISTS neutruck;
CREATE SCHEMA IF NOT EXISTS neugate;

-- Set default search path for NeuTruck connections
SET search_path TO neutruck, public;

-- ==============================================================================
-- NEUTRUCK SCHEMA TABLES
-- ==============================================================================

-- Fleet Drivers
CREATE TABLE IF NOT EXISTS neutruck.driver_profiles (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(64) NOT NULL,
    license_number VARCHAR(64),
    license_restriction VARCHAR(128),
    spouse_name VARCHAR(255),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(64),
    emergency_contact_relationship VARCHAR(64),
    address TEXT,
    status VARCHAR(32) DEFAULT 'Available',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fleet Helpers
CREATE TABLE IF NOT EXISTS neutruck.helper_profiles (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(64) NOT NULL,
    license_number VARCHAR(64),
    license_restriction VARCHAR(128),
    spouse_name VARCHAR(255),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(64),
    emergency_contact_relationship VARCHAR(64),
    address TEXT,
    status VARCHAR(32) DEFAULT 'Available',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fleet Vehicles
CREATE TABLE IF NOT EXISTS neutruck.truck_vehicles (
    id VARCHAR(64) PRIMARY KEY,
    plate_number VARCHAR(64) NOT NULL UNIQUE,
    model_type VARCHAR(128) NOT NULL,
    capacity_tons NUMERIC(10, 2) DEFAULT 0,
    default_driver_id VARCHAR(64) REFERENCES neutruck.driver_profiles(id) ON DELETE SET NULL,
    driver_name VARCHAR(255),
    driver_phone VARCHAR(64),
    helper_name VARCHAR(255),
    helper_phone VARCHAR(64),
    gps_tracking_url TEXT,
    gps_auth_token TEXT,
    gps_auto_sync BOOLEAN DEFAULT FALSE,
    status VARCHAR(32) DEFAULT 'Available',
    is_archived BOOLEAN DEFAULT FALSE,
    decommission_reason TEXT,
    fuel_capacity_liters NUMERIC(10, 2) DEFAULT 300,
    current_fuel_level_percent NUMERIC(5, 2) DEFAULT 100,
    current_fuel_liters NUMERIC(10, 2) DEFAULT 300,
    fuel_card_number VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dispatch Jobs / Waybills
CREATE TABLE IF NOT EXISTS neutruck.dispatch_jobs (
    id VARCHAR(64) PRIMARY KEY,
    waybill_number VARCHAR(64) NOT NULL UNIQUE,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(64),
    pickup_location TEXT NOT NULL,
    dropoff_location TEXT NOT NULL,
    cargo_description TEXT NOT NULL,
    weight_tons NUMERIC(10, 2),
    van_size VARCHAR(64),
    truck_id VARCHAR(64) REFERENCES neutruck.truck_vehicles(id) ON DELETE SET NULL,
    truck_plate VARCHAR(64) NOT NULL,
    driver_name VARCHAR(255) NOT NULL,
    driver_phone VARCHAR(64),
    helper_name VARCHAR(255),
    helper_phone VARCHAR(64),
    helper_commission NUMERIC(12, 2) DEFAULT 0,
    dispatch_date VARCHAR(64) NOT NULL,
    delivery_status VARCHAR(64) DEFAULT 'Pending',
    freight_fee NUMERIC(12, 2) DEFAULT 0,
    freight_billing_terms VARCHAR(128),
    load_status VARCHAR(32) DEFAULT 'Loaded',
    fuel_allowance NUMERIC(12, 2) DEFAULT 0,
    driver_rate NUMERIC(12, 2) DEFAULT 0,
    container_number VARCHAR(128),
    trailer_number VARCHAR(128),
    seal_number VARCHAR(128),
    container_movement JSONB,
    truck_unit_checklist JSONB,
    fuel_management JSONB,
    is_inter_island BOOLEAN DEFAULT FALSE,
    roro_route TEXT,
    roro_ticket_fee NUMERIC(12, 2) DEFAULT 0,
    shipping_line VARCHAR(255),
    roro_legs JSONB,
    has_return_trip BOOLEAN DEFAULT FALSE,
    return_destination TEXT,
    return_cargo_type VARCHAR(128),
    return_payer VARCHAR(128),
    return_freight_fee NUMERIC(12, 2) DEFAULT 0,
    return_fuel_allowance NUMERIC(12, 2) DEFAULT 0,
    return_roro_ticket_fee NUMERIC(12, 2) DEFAULT 0,
    return_roro_legs JSONB,
    current_location TEXT,
    last_location_update VARCHAR(64),
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fuel Top-Up Audit Logs
CREATE TABLE IF NOT EXISTS neutruck.fuel_topup_logs (
    id VARCHAR(64) PRIMARY KEY,
    truck_id VARCHAR(64) REFERENCES neutruck.truck_vehicles(id) ON DELETE CASCADE,
    plate_number VARCHAR(64) NOT NULL,
    topup_date VARCHAR(64) NOT NULL,
    liters NUMERIC(10, 2) NOT NULL,
    cost_per_liter NUMERIC(10, 2) DEFAULT 0,
    total_cost NUMERIC(12, 2) DEFAULT 0,
    location VARCHAR(255) NOT NULL,
    container_source VARCHAR(255) NOT NULL,
    odometer_km NUMERIC(10, 2),
    driver_name VARCHAR(255),
    waybill_number VARCHAR(64),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Unit Safety & BLOWBAGETS Inspection Logs
CREATE TABLE IF NOT EXISTS neutruck.unit_inspection_logs (
    id VARCHAR(64) PRIMARY KEY,
    truck_id VARCHAR(64) REFERENCES neutruck.truck_vehicles(id) ON DELETE CASCADE,
    plate_number VARCHAR(64) NOT NULL,
    inspection_date VARCHAR(64) NOT NULL,
    inspector_name VARCHAR(255),
    odometer_km NUMERIC(10, 2),
    fuel_level_percent NUMERIC(5, 2),
    fuel_liters NUMERIC(10, 2),
    overall_status VARCHAR(64) NOT NULL,
    checklist JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Records
CREATE TABLE IF NOT EXISTS neutruck.maintenance_logs (
    id VARCHAR(64) PRIMARY KEY,
    truck_id VARCHAR(64) REFERENCES neutruck.truck_vehicles(id) ON DELETE CASCADE,
    plate_number VARCHAR(64) NOT NULL,
    service_type VARCHAR(255) NOT NULL,
    cost NUMERIC(12, 2) DEFAULT 0,
    service_date VARCHAR(64) NOT NULL,
    odometer_km NUMERIC(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clients / Shippers
CREATE TABLE IF NOT EXISTS neutruck.client_shippers (
    id VARCHAR(64) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(64) NOT NULL,
    address TEXT,
    tin_number VARCHAR(64),
    billing_number VARCHAR(64),
    default_pickup_location TEXT,
    notes TEXT,
    statement_status VARCHAR(64) DEFAULT 'Draft',
    billing_statement_statuses JSONB,
    billing_columns JSONB,
    billing_additions JSONB,
    billing_history JSONB,
    default_weighing_fee NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Waybill Receipts
CREATE TABLE IF NOT EXISTS neutruck.waybill_receipts (
    id VARCHAR(64) PRIMARY KEY,
    job_id VARCHAR(64) REFERENCES neutruck.dispatch_jobs(id) ON DELETE CASCADE,
    waybill_number VARCHAR(64) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    amount_paid NUMERIC(12, 2) DEFAULT 0,
    payment_method VARCHAR(64) DEFAULT 'Cash',
    payment_status VARCHAR(64) DEFAULT 'Pending',
    timestamp VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RoRo Ports & Routes
CREATE TABLE IF NOT EXISTS neutruck.roro_ports (
    id VARCHAR(64) PRIMARY KEY,
    port_name VARCHAR(255) NOT NULL,
    province VARCHAR(128) NOT NULL,
    island_group VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS neutruck.roro_routes (
    id VARCHAR(64) PRIMARY KEY,
    origin_port_name VARCHAR(255) NOT NULL,
    destination_port_name VARCHAR(255) NOT NULL,
    shipping_line VARCHAR(255) NOT NULL,
    default_ticket_fee NUMERIC(12, 2) DEFAULT 0
);

-- Dropoff Destination Hubs
CREATE TABLE IF NOT EXISTS neutruck.dropoff_destinations (
    id VARCHAR(64) PRIMARY KEY,
    hub_name VARCHAR(255) NOT NULL,
    city_province VARCHAR(255) NOT NULL,
    receiver_name VARCHAR(255),
    receiver_phone VARCHAR(64),
    default_freight_fee NUMERIC(12, 2) DEFAULT 0
);

-- Roles Table
CREATE TABLE IF NOT EXISTS neutruck.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Permissions Table
CREATE TABLE IF NOT EXISTS neutruck.permissions (
    id VARCHAR(128) PRIMARY KEY,
    module_name VARCHAR(128) NOT NULL,
    action_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Role Permissions Junction Table
CREATE TABLE IF NOT EXISTS neutruck.role_permissions (
    role_id INTEGER NOT NULL REFERENCES neutruck.roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(128) NOT NULL REFERENCES neutruck.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Truck Models Table
CREATE TABLE IF NOT EXISTS neutruck.truck_models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) UNIQUE NOT NULL
);

-- Seed Default Roles
INSERT INTO neutruck.roles (id, name, description)
VALUES 
    (1, 'Admin', 'Full System Administrator Access'),
    (2, 'Dispatcher', 'Dispatch Board, Waybills & Fleet Operations'),
    (3, 'Fleet Manager', 'Fleet Vehicles Register & Repair Maintenance'),
    (4, 'Gate Inspector', 'Truck Entry & Haul Waybill Inspections')
ON CONFLICT (id) DO NOTHING;

-- Seed Default Permissions
INSERT INTO neutruck.permissions (id, module_name, action_name) VALUES
    ('dispatch', 'dispatch', 'Full Access to Dispatch Board'),
    ('delivery_status_in_transit', 'dispatch', 'Set Delivery Status to In Transit / RoRo'),
    ('delivery_status_delivered', 'dispatch', 'Set Delivery Status to Delivered'),
    ('delivery_status_cancelled', 'dispatch', 'Set Delivery Status to Cancelled'),
    ('fleet', 'fleet', 'Fleet Vehicles Register'),
    ('waybills', 'waybills', 'Full Access to Waybills & Billing'),
    ('billing_status_prepared', 'waybills', 'Set Statement Status to Prepared'),
    ('billing_status_checked', 'waybills', 'Set Statement Status to Checked'),
    ('billing_status_approved', 'waybills', 'Set Statement Status to Approved'),
    ('maintenance', 'maintenance', 'Vehicle Repairs & Maintenance'),
    ('reports', 'reports', 'Full Access to Intelligence Reports'),
    ('report_daily_trip', 'reports', 'Access Daily Trip Report'),
    ('report_billing_statement', 'reports', 'Access Client Billing Statement'),
    ('report_container', 'reports', 'Access Per Trip Delivery Report'),
    ('report_financial', 'reports', 'Access Revenue & Profitability P&L'),
    ('report_utilization', 'reports', 'Access Fleet Utilization Report'),
    ('report_collectibles', 'reports', 'Access Accounts Receivable (Collectibles)'),
    ('report_roro', 'reports', 'Access Inter-Island RoRo Passage Report'),
    ('report_maintenance', 'reports', 'Access Repair & Maintenance Expenses Report'),
    ('users', 'users', 'Users & Roles Administration'),
    ('settings', 'settings', 'System Settings')
ON CONFLICT (id) DO UPDATE SET module_name = EXCLUDED.module_name, action_name = EXCLUDED.action_name;

-- Seed Admin Permissions
INSERT INTO neutruck.role_permissions (role_id, permission_id) VALUES
    (1, 'dispatch'), (1, 'delivery_status_in_transit'), (1, 'delivery_status_delivered'),
    (1, 'delivery_status_cancelled'), (1, 'fleet'), (1, 'waybills'),
    (1, 'billing_status_prepared'), (1, 'billing_status_checked'), (1, 'billing_status_approved'),
    (1, 'maintenance'), (1, 'reports'), (1, 'report_daily_trip'), (1, 'report_billing_statement'),
    (1, 'report_container'), (1, 'report_financial'), (1, 'report_utilization'),
    (1, 'report_collectibles'), (1, 'report_roro'), (1, 'report_maintenance'),
    (1, 'users'), (1, 'settings')
ON CONFLICT DO NOTHING;

-- Seed Dispatcher Permissions
INSERT INTO neutruck.role_permissions (role_id, permission_id) VALUES
    (2, 'dispatch'), (2, 'fleet'), (2, 'waybills'), (2, 'billing_status_prepared'),
    (2, 'billing_status_checked'), (2, 'delivery_status_in_transit'), (2, 'delivery_status_delivered')
ON CONFLICT DO NOTHING;

-- Seed Fleet Manager Permissions
INSERT INTO neutruck.role_permissions (role_id, permission_id) VALUES
    (3, 'fleet'), (3, 'maintenance')
ON CONFLICT DO NOTHING;

-- Seed Gate Inspector Permissions
INSERT INTO neutruck.role_permissions (role_id, permission_id) VALUES
    (4, 'dispatch')
ON CONFLICT DO NOTHING;

-- User Accounts & System Logs
CREATE TABLE IF NOT EXISTS neutruck.users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    role_id VARCHAR(64) DEFAULT 'dispatcher',
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial Staff & Admin Accounts Seed
INSERT INTO neutruck.users (id, name, username, password_hash, role_id, is_active)
VALUES 
    ('1', 'System Administrator', 'admin', 'password123', '1', true),
    ('2', 'Chief Dispatcher', 'dispatcher', 'password123', '2', true),
    ('3', 'Fleet Supervisor', 'fleet_manager', 'password123', '3', true)
ON CONFLICT (username) DO NOTHING;

CREATE TABLE IF NOT EXISTS neutruck.sms_logs (
    id VARCHAR(64) PRIMARY KEY,
    recipient_name VARCHAR(255),
    recipient_phone VARCHAR(64) NOT NULL,
    waybill_number VARCHAR(64),
    message TEXT NOT NULL,
    status VARCHAR(64) DEFAULT 'Sent',
    timestamp VARCHAR(64) NOT NULL
);

-- ==============================================================================
-- NEUGATE ENTERPRISE SCHEMA TABLES
-- ==============================================================================

-- Employees / Gate Access Directory
CREATE TABLE IF NOT EXISTS neugate.employees (
    id VARCHAR(64) PRIMARY KEY,
    employee_code VARCHAR(64) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    department VARCHAR(128),
    rfid_card_number VARCHAR(128) UNIQUE,
    status VARCHAR(32) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Gate Access / Turnstile Entry & Exit Audit Logs
CREATE TABLE IF NOT EXISTS neugate.gate_access_logs (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) REFERENCES neugate.employees(id) ON DELETE SET NULL,
    person_name VARCHAR(255) NOT NULL,
    access_direction VARCHAR(16) NOT NULL, -- 'IN' / 'OUT'
    gate_point_name VARCHAR(128) NOT NULL, -- e.g. 'Depot Main Gate Turnstile A'
    rfid_card_number VARCHAR(128),
    verification_method VARCHAR(64) DEFAULT 'RFID Card',
    access_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    vehicle_plate_linked VARCHAR(64) -- Optional link to NeuTruck truck plate passing through gate
);

-- Visitor Gate Badges
CREATE TABLE IF NOT EXISTS neugate.visitor_passes (
    id VARCHAR(64) PRIMARY KEY,
    visitor_name VARCHAR(255) NOT NULL,
    company_represented VARCHAR(255),
    contact_phone VARCHAR(64),
    badge_number VARCHAR(64) NOT NULL,
    host_employee VARCHAR(255),
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP WITH TIME ZONE
);

-- Schema Migrations / Idempotent Alter Statements
ALTER TABLE neutruck.unit_inspection_logs ADD COLUMN IF NOT EXISTS fuel_level_percent NUMERIC(5, 2);
ALTER TABLE neutruck.unit_inspection_logs ADD COLUMN IF NOT EXISTS fuel_liters NUMERIC(10, 2);

-- IP Access Whitelist & System Security Settings
CREATE TABLE IF NOT EXISTS neutruck.allowed_ips (
    id VARCHAR(64) PRIMARY KEY,
    ip_address VARCHAR(64) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS neutruck.security_settings (
    setting_key VARCHAR(64) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


