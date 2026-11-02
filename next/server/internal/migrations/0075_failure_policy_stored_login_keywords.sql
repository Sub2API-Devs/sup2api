-- Failure policy: the codes of Claude Code 2.1.316's StoredLoginHeldBackError.
--
-- From CCGateway CLI v44 (ccgateway 0.1.123) the request command answers a login Claude Code
-- holds back with 401 stored_login_refused_restart_needed (only a new
-- authorization helps: every request starts a new process) and 403
-- stored_login_refused_admin (the organization's settings refuse the login,
-- like oauth_account_on_hold); settings that did not load stay a retryable
-- 5xx. Without a keyword the login rules do not match them, and the plugin's
-- disable is only a cooldown (CONTRACTS §42, §69): the account would be picked
-- again every few seconds (2026-11-02, user request).
--
-- Each keyword is appended to the account rule of its id, the one 0072/0074
-- wrote (login-invalid, account-on-hold), wherever it is: only when the rule
-- still exists, already has keywords (appending one to a rule that matches on
-- its status code alone would narrow it), has room for one more (at most 100)
-- and does not have it yet (in any case). The replaced policy goes to the
-- history and the revision moves on; running again changes nothing.
DO $$
DECLARE
    p      jsonb;
    rules  jsonb;
    hist   jsonb;
BEGIN
    SELECT value INTO p FROM settings WHERE key = 'failure_policy' FOR UPDATE;
    IF p IS NULL OR jsonb_typeof(p->'account_rules') IS DISTINCT FROM 'array' THEN
        RETURN;
    END IF;

    SELECT coalesce(jsonb_agg(
        CASE WHEN a.keyword IS NOT NULL
                  AND jsonb_typeof(e->'match'->'keywords') = 'array'
                  AND jsonb_array_length(e->'match'->'keywords') BETWEEN 1 AND 99
                  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(e->'match'->'keywords') k
                                  WHERE lower(k #>> '{}') = a.keyword)
             THEN jsonb_set(e, '{match,keywords}', (e->'match'->'keywords') || jsonb_build_array(a.keyword))
             ELSE e END
        ORDER BY i), '[]'::jsonb) INTO rules
    FROM jsonb_array_elements(p->'account_rules') WITH ORDINALITY AS t(e, i)
    LEFT JOIN (VALUES ('login-invalid', 'stored_login_refused_restart_needed'),
                      ('account-on-hold', 'stored_login_refused_admin')) AS a(id, keyword)
        ON e->>'id' = a.id;

    IF rules = p->'account_rules' THEN
        RETURN;
    END IF;

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
