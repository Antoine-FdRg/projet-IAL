-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for storing box information and authentication
-- box_id is a UUID that serves as both identifier and authentication token
CREATE TABLE IF NOT EXISTS boxes (
    box_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing measurements (will be converted to hypertable)
CREATE TABLE IF NOT EXISTS measurements (
    id BIGSERIAL,
    box_id UUID NOT NULL,
    measurement_type VARCHAR(50) NOT NULL,
    value NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_box
        FOREIGN KEY(box_id)
        REFERENCES boxes(box_id)
        ON DELETE CASCADE
);

-- Convert measurements table to TimescaleDB hypertable
-- This enables efficient time-series queries
SELECT create_hypertable('measurements', 'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_measurements_box_id_timestamp
    ON measurements(box_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_measurements_type_timestamp
    ON measurements(measurement_type, timestamp DESC);

-- Seed data: Create some test boxes with predefined UUIDs for testing
-- These UUIDs serve as both identifier and authentication token
INSERT INTO boxes (box_id, description) VALUES
    ('550e8400-e29b-41d4-a716-446655440001'::UUID, 'Test Box 1'),
    ('550e8400-e29b-41d4-a716-446655440002'::UUID, 'Test Box 2')
ON CONFLICT (box_id) DO NOTHING;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_boxes_updated_at BEFORE UPDATE
    ON boxes FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a continuous aggregate for hourly statistics (TimescaleDB feature)
CREATE MATERIALIZED VIEW IF NOT EXISTS measurements_hourly
WITH (timescaledb.continuous) AS
SELECT
    box_id,
    measurement_type,
    time_bucket('1 hour', timestamp) AS bucket,
    AVG(value) AS avg_value,
    MIN(value) AS min_value,
    MAX(value) AS max_value,
    COUNT(*) AS measurement_count
FROM measurements
GROUP BY box_id, measurement_type, bucket
WITH NO DATA;

-- Add refresh policy to keep the continuous aggregate up to date
SELECT add_continuous_aggregate_policy('measurements_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Create retention policy to automatically delete old data after 90 days
SELECT add_retention_policy('measurements', INTERVAL '90 days', if_not_exists => TRUE);

-- Grant appropriate permissions
GRANT SELECT, INSERT ON measurements TO CURRENT_USER;
GRANT SELECT ON boxes TO CURRENT_USER;
