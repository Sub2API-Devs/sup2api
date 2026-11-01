-- Failure policy: migration 0072, for the policies it left alone.
--
-- 0072 split the migrated automatic-disable rule ("migrated-disable": 401
-- plus the new-api keywords, stored as OR) only when it was the policy's
-- only account rule. From core 0.1.225 status codes and keywords must both
-- match, so where an administrator had added any other account rule the
-- migrated one became "401 and one of the new-api keywords": none of them
-- names a login failure, and an account whose login was revoked was no
-- longer disabled.
--
-- Here the rule is split wherever it is in the account rules, under the same
-- conditions on the rule itself as 0072 (id migrated-disable, upstream, 401
-- exactly, plain keywords). It is replaced in place by login-invalid,
-- account-on-hold and itself at any status, so the rules before and after it
-- keep their order; login-invalid / account-on-hold are left out when the
-- policy already has a rule with that id. The replaced policy goes to the
-- history and the revision moves on. Once split the rule's status codes are
-- empty, so running again (or after 0072) changes nothing.
DO $$
DECLARE
    p      jsonb;
    old    jsonb;
    pos    int;
    split  jsonb;
    rules  jsonb;
    hist   jsonb;
BEGIN
    SELECT value INTO p FROM settings WHERE key = 'failure_policy' FOR UPDATE;
    IF p IS NULL OR jsonb_typeof(p->'account_rules') IS DISTINCT FROM 'array' THEN
        RETURN;
    END IF;
    SELECT e, i - 1 INTO old, pos
    FROM jsonb_array_elements(p->'account_rules') WITH ORDINALITY AS t(e, i)
    WHERE e->>'id' = 'migrated-disable'
    ORDER BY i LIMIT 1;
    IF old IS NULL OR old->'match'->>'status_codes' IS DISTINCT FROM '401'
       OR old->'match'->>'source' IS DISTINCT FROM 'upstream' OR coalesce((old->'match'->>'keyword_regex')::boolean, false)
       OR jsonb_array_length(coalesce(old->'match'->'keywords', '[]'::jsonb)) = 0 THEN
        RETURN;
    END IF;

    split := '[]'::jsonb;
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p->'account_rules') e WHERE e->>'id' = 'login-invalid') THEN
        split := split || jsonb_build_array(jsonb_build_object('id', 'login-invalid', 'name', 'Login invalid (401)', 'enabled', true, 'action', 'disable',
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
                    'your account is not authorized'))));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p->'account_rules') e WHERE e->>'id' = 'account-on-hold') THEN
        split := split || jsonb_build_array(jsonb_build_object('id', 'account-on-hold', 'name', 'Account on hold (403)', 'enabled', true, 'action', 'disable',
            'same_account_retries', 0, 'exhausted_action', '', 'egress', '', 'cooldown_seconds', 0,
            'match', jsonb_build_object('source', 'upstream', 'status_codes', '403', 'mode', 'all',
                'groups', '[]'::jsonb, 'models', '[]'::jsonb, 'protocols', '[]'::jsonb,
                'keywords', jsonb_build_array(
                    'oauth_account_on_hold',
                    'oauth authentication is currently not allowed for this organization'))));
    END IF;
    split := split || jsonb_build_array(old || jsonb_build_object('match', (old->'match') || jsonb_build_object('status_codes', '', 'mode', 'all')));

    SELECT coalesce(jsonb_agg(x ORDER BY o, n), '[]'::jsonb) INTO rules FROM (
        SELECT e AS x, i - 1 AS o, 0 AS n
        FROM jsonb_array_elements(p->'account_rules') WITH ORDINALITY AS t(e, i) WHERE i - 1 <> pos
        UNION ALL
        SELECT e, pos, j FROM jsonb_array_elements(split) WITH ORDINALITY AS s(e, j)
    ) r;

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
