-- Add real_ip tracking to proxies table for displaying the actual IP address
-- when using a proxy in CCGateway account runtimes.

ALTER TABLE proxies ADD COLUMN real_ip varchar(45); -- IPv4 or IPv6
ALTER TABLE proxies ADD COLUMN real_ip_updated_at timestamptz;

COMMENT ON COLUMN proxies.real_ip IS 'The actual IP address detected when testing the proxy';
COMMENT ON COLUMN proxies.real_ip_updated_at IS 'Timestamp when real_ip was last updated';
