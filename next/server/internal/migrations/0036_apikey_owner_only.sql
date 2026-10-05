-- Retire global API key permissions, including existing role grants.
DELETE FROM role_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE key IN ('apikey:all:read', 'apikey:all:manage')
);
DELETE FROM permissions WHERE key IN ('apikey:all:read', 'apikey:all:manage');
