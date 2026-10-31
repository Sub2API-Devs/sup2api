-- Failure policy (GATEWAY-FAILURE-POLICY-DESIGN, Schema 4 note of
-- 2026-11-01): from core 0.1.225 a rule with status codes and keywords
-- matches only when both match. The account rule the policy migration drew
-- from the old automatic disable settings ("migrated-disable": 401 plus the
-- new-api keywords, stored as OR) would then disable an account only on a 401
-- carrying one of those keywords: none of them names a login failure, and
-- the balance and organization ones come with other statuses.
--
-- While that rule is still the only account rule and still on 401 exactly,
-- it is split into rules that keep what it caught, each precise:
--   * login-invalid: 401 with a login failure of Claude Code, the Worker or
--     the provider (revoked or dead OAuth token, signed out, rejected key);
--   * account-on-hold: 403 with an account the provider holds or refuses
--     OAuth for;
--   * migrated-disable: its own keywords at any status, as before.
-- The replaced policy goes to the history, the revision moves on, and every
-- rule says mode "all" so a core before 0.1.225 reads the same rules alike.
-- A policy an administrator has changed otherwise is left alone; after the
-- split the rule count no longer matches, so running again changes nothing.
DO $$
DECLARE
    p     jsonb;
    old   jsonb;
    rules jsonb;
    hist  jsonb;
BEGIN
    SELECT value INTO p FROM settings WHERE key = 'failure_policy' FOR UPDATE;
    IF p IS NULL OR jsonb_typeof(p->'account_rules') IS DISTINCT FROM 'array'
       OR jsonb_array_length(p->'account_rules') <> 1 THEN
        RETURN;
    END IF;
    old := p->'account_rules'->0;
    IF old->>'id' IS DISTINCT FROM 'migrated-disable' OR old->'match'->>'status_codes' IS DISTINCT FROM '401'
       OR old->'match'->>'source' IS DISTINCT FROM 'upstream' OR coalesce((old->'match'->>'keyword_regex')::boolean, false)
       OR jsonb_array_length(coalesce(old->'match'->'keywords', '[]'::jsonb)) = 0 THEN
        RETURN;
    END IF;

    rules := jsonb_build_array(
        jsonb_build_object('id', 'login-invalid', 'name', 'Login invalid (401)', 'enabled', true, 'action', 'disable',
            'same_account_retries', 0, 'exhausted_action', '', 'egress', '', 'cooldown_seconds', 0,
            'match', jsonb_build_object('source', 'upstream', 'status_codes', '401', 'mode', 'all',
                'groups', '[]'::jsonb, 'models', '[]'::jsonb, 'protocols', '[]'::jsonb,
                'keywords', jsonb_build_array(
                    'oauth access token has been revoked',
                    'oauth token has been revoked',
                    'oauth refresh token is no longer valid',
                    'oauth_refresh_dead',
                    'not_logged_in',
                    'has cleared its stored login',
                    'invalid x-api-key',
                    'invalid bearer token',
                    'the security token included in the request is invalid',
                    'your account is not authorized'))),
        jsonb_build_object('id', 'account-on-hold', 'name', 'Account on hold (403)', 'enabled', true, 'action', 'disable',
            'same_account_retries', 0, 'exhausted_action', '', 'egress', '', 'cooldown_seconds', 0,
            'match', jsonb_build_object('source', 'upstream', 'status_codes', '403', 'mode', 'all',
                'groups', '[]'::jsonb, 'models', '[]'::jsonb, 'protocols', '[]'::jsonb,
                'keywords', jsonb_build_array(
                    'oauth_account_on_hold',
                    'oauth authentication is currently not allowed for this organization'))),
        old || jsonb_build_object('match', (old->'match') || jsonb_build_object('status_codes', '', 'mode', 'all')));

    SELECT value INTO hist FROM settings WHERE key = 'failure_policy_history' FOR UPDATE;
    hist := jsonb_build_array(p) || coalesce(hist->'policies', '[]'::jsonb);
    IF jsonb_array_length(hist) > 10 THEN
        hist := (SELECT jsonb_agg(e ORDER BY i) FROM jsonb_array_elements(hist) WITH ORDINALITY AS t(e, i) WHERE i <= 10);
    END IF;
    INSERT INTO settings (key, value, updated_at) VALUES ('failure_policy_history', jsonb_build_object('policies', hist), now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

    UPDATE settings SET value = p || jsonb_build_object('account_rules', rules,
            'revision', coalesce((p->>'revision')::bigint, 0) + 1), updated_by = NULL, updated_at = now()
    WHERE key = 'failure_policy';
END $$;
