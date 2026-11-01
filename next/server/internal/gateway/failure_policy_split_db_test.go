package gateway

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// The live policy before core 0.1.225: the migrated rule on 401 with the
// new-api keywords, stored as OR.
const migratedPolicy = `{"egress":"account_configured","revision":1,"backoff_ms":200,"max_retries":2,"max_wait_ms":0,
"retry_rules":[{"id":"http-transient","name":"HTTP transient errors","match":{"mode":"all","groups":[],"models":[],"source":"upstream","keywords":[],"protocols":[],"status_codes":"408,429,500-599"},"action":"retry","egress":"","enabled":true,"cooldown_seconds":0,"exhausted_action":"","same_account_retries":0}],
"reset_sticky":true,
"account_rules":[{"id":"migrated-disable","name":"Existing automatic disable","match":{"mode":"any","groups":[],"models":[],"source":"upstream","keywords":["your credit balance is too low","this organization has been disabled.","you exceeded your current quota","permission denied","the security token included in the request is invalid","operation not allowed","your account is not authorized"],"protocols":[],"status_codes":"401"},"action":"disable","egress":"","enabled":true,"cooldown_seconds":0,"exhausted_action":"","same_account_retries":0}],
"retry_enabled":true,"schema_version":3,"switch_account":true,"account_enabled":true,"respect_retry_after":false,"retries_per_account":0}`

// Migration 0072 splits the migrated rule into precise ones; the result is a
// valid policy that disables on login failures and keeps the old keywords
// at any status, and running it again changes nothing.
func TestMigrationSplitsTheMigratedAutoDisableRule(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	_, err := db.Pool.Exec(ctx, `INSERT INTO settings(key,value) VALUES('failure_policy',$1)
		ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`, migratedPolicy)
	require.NoError(t, err)
	raw, err := migrations.FS.ReadFile("0072_failure_policy_split_auto_disable.sql")
	require.NoError(t, err)
	for range 2 {
		_, err = db.Pool.Exec(ctx, string(raw))
		require.NoError(t, err)
	}
	p, err := loadFailurePolicy(ctx, db.Pool)
	require.NoError(t, err)
	require.NotNil(t, p)
	require.Equal(t, int64(2), p.Revision)
	require.Len(t, p.AccountRules, 3)
	want := loginAccountRules()
	for i, r := range want {
		require.Equal(t, r.ID, p.AccountRules[i].ID)
		require.Equal(t, r.Match.StatusCodes, p.AccountRules[i].Match.StatusCodes)
		require.Equal(t, r.Match.Keywords, p.AccountRules[i].Match.Keywords, "migration 0072 and loginAccountRules must agree")
	}
	require.Equal(t, "migrated-disable", p.AccountRules[2].ID)
	require.Empty(t, p.AccountRules[2].Match.StatusCodes)
	for _, tc := range []struct {
		status        int
		text, rule, k string
	}{
		{401, `{"type":"error","error":{"type":"authentication_error","message":"OAuth access token has been revoked."}}`, "login-invalid", "oauth access token has been revoked"},
		{401, `{"type":"error","error":{"type":"authentication_error","code":"oauth_refresh_dead","message":"OAuth refresh token is no longer valid; run /login to re-authenticate"}}`, "login-invalid", "oauth refresh token is no longer valid"},
		{403, `{"type":"error","error":{"type":"permission_error","code":"oauth_account_on_hold","message":"x"}}`, "account-on-hold", "oauth_account_on_hold"},
		{400, `{"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the API"}}`, "migrated-disable", "your credit balance is too low"},
		{401, `{"type":"error","error":{"type":"authentication_error","message":"something else"}}`, "", ""},
	} {
		d := p.decide(FailureFacts{Source: "upstream", Status: tc.status, Text: tc.text})
		require.Equal(t, tc.rule, d.AccountRule, tc.text)
		require.Equal(t, tc.k, d.AccountKeyword, tc.text)
	}
	var history string
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT value::text FROM settings WHERE key='failure_policy_history'`).Scan(&history))
	require.Equal(t, 1, strings.Count(history, `"revision": 1`), history)

	// A policy the administrator changed is left alone.
	_, err = db.Pool.Exec(ctx, `UPDATE settings SET value=jsonb_set($1::jsonb,'{account_rules,0,match,status_codes}','"401,403"') WHERE key='failure_policy'`, migratedPolicy)
	require.NoError(t, err)
	_, err = db.Pool.Exec(ctx, string(raw))
	require.NoError(t, err)
	p, err = loadFailurePolicy(ctx, db.Pool)
	require.NoError(t, err)
	require.Len(t, p.AccountRules, 1)
}

func TestMigrationDraftNamesLoginFailures(t *testing.T) {
	p := migrationDraft(defaultGatewaySettings(), defaultAutoDisableSettings())
	require.Empty(t, p.validate(t.Context()))
	ids := []string{}
	for _, r := range p.AccountRules {
		ids = append(ids, r.ID)
	}
	require.Equal(t, []string{"login-invalid", "account-on-hold", "migrated-disable"}, ids)
	require.Empty(t, p.AccountRules[2].Match.StatusCodes)
}

// Migration 0073 splits the migrated rule where 0072 left it alone: next to
// rules an administrator added, in place, keeping their order; a rule id the
// policy already has is not added twice; 0072's result and a second run are
// left as they are.
func TestMigrationSplitsTheMigratedRuleNextToOtherRules(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	raw72, err := migrations.FS.ReadFile("0072_failure_policy_split_auto_disable.sql")
	require.NoError(t, err)
	raw73, err := migrations.FS.ReadFile("0073_failure_policy_split_auto_disable_any_position.sql")
	require.NoError(t, err)
	store := func(policy string) {
		t.Helper()
		_, err := db.Pool.Exec(ctx, `INSERT INTO settings(key,value) VALUES('failure_policy',$1)
			ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`, policy)
		require.NoError(t, err)
	}
	run := func(raw []byte) {
		t.Helper()
		_, err := db.Pool.Exec(ctx, string(raw))
		require.NoError(t, err)
	}
	ids := func(p *FailurePolicy) []string {
		out := []string{}
		for _, r := range p.AccountRules {
			out = append(out, r.ID)
		}
		return out
	}
	custom := `{"id":"quota-cooldown","name":"Quota","match":{"mode":"all","groups":[],"models":[],"source":"upstream","keywords":[],"protocols":[],"status_codes":"402"},"action":"cooldown","egress":"","enabled":true,"cooldown_seconds":60,"exhausted_action":"","same_account_retries":0}`

	// The migrated rule after an added one, and one more after it.
	var policy string
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT jsonb_set($1::jsonb, '{account_rules}',
		jsonb_build_array($2::jsonb) || ($1::jsonb->'account_rules') || jsonb_build_array(jsonb_set($2::jsonb, '{id}', '"tail"')))::text`,
		migratedPolicy, custom).Scan(&policy))
	store(policy)
	run(raw72) // leaves it alone: more than one account rule
	p, err := loadFailurePolicy(ctx, db.Pool)
	require.NoError(t, err)
	require.Equal(t, []string{"quota-cooldown", "migrated-disable", "tail"}, ids(p))
	for range 2 {
		run(raw73)
	}
	p, err = loadFailurePolicy(ctx, db.Pool)
	require.NoError(t, err)
	require.Equal(t, int64(2), p.Revision)
	require.Equal(t, []string{"quota-cooldown", "login-invalid", "account-on-hold", "migrated-disable", "tail"}, ids(p))
	require.Equal(t, "402", p.AccountRules[0].Match.StatusCodes)
	require.Empty(t, p.AccountRules[3].Match.StatusCodes)
	want := loginAccountRules()
	for i, r := range want {
		require.Equal(t, r.Match.Keywords, p.AccountRules[1+i].Match.Keywords, "migration 0073 and loginAccountRules must agree")
	}
	d := p.decide(FailureFacts{Source: "upstream", Status: 401,
		Text: `{"type":"error","error":{"type":"authentication_error","message":"OAuth access token has been revoked."}}`})
	require.Equal(t, "login-invalid", d.AccountRule)
	d = p.decide(FailureFacts{Source: "upstream", Status: 402, Text: `{}`})
	require.Equal(t, "quota-cooldown", d.AccountRule)

	// An id the policy already has is not added again.
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT jsonb_set($1::jsonb, '{account_rules}',
		jsonb_build_array(jsonb_set($2::jsonb, '{id}', '"login-invalid"')) || ($1::jsonb->'account_rules'))::text`,
		migratedPolicy, custom).Scan(&policy))
	store(policy)
	run(raw73)
	p, err = loadFailurePolicy(ctx, db.Pool)
	require.NoError(t, err)
	require.Equal(t, []string{"login-invalid", "account-on-hold", "migrated-disable"}, ids(p))
	require.Equal(t, "402", p.AccountRules[0].Match.StatusCodes)

	// 0072's result is left as it is.
	store(migratedPolicy)
	run(raw72)
	run(raw73)
	p, err = loadFailurePolicy(ctx, db.Pool)
	require.NoError(t, err)
	require.Equal(t, int64(2), p.Revision)
	require.Equal(t, []string{"login-invalid", "account-on-hold", "migrated-disable"}, ids(p))
}
