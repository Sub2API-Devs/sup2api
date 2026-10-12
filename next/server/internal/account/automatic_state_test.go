package account

import (
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestAccountCommonControls(t *testing.T) {
	e := setup(t)
	off := false
	legacy := e.mkRawAccount("anthropic", "apikey", "legacy", "unused", true)
	e.gen.types[0].Type.CommonControls = map[string]manifest.AccountCommonControl{
		"auto_disable": {Configurable: &off, Default: &off},
		"schedulable":  {Configurable: &off, Default: &off},
	}
	status, result := e.do("GET", "/account-types", nil)
	require.Equal(t, 200, status)
	controls := result["data"].([]any)[0].(map[string]any)["common_controls"].(map[string]any)
	require.Equal(t, map[string]any{"configurable": false, "default": false}, controls["auto_disable"])
	body := map[string]any{"name": "controlled", "plugin_key": "anthropic", "type": "apikey", "credentials": map[string]any{"api_key": "sk-good-key-123"}}
	body["auto_disable"] = true
	status, result = e.do("POST", "/accounts", body)
	require.Equal(t, 400, status)
	require.Contains(t, fieldsOf(result), "auto_disable:read_only")
	delete(body, "auto_disable")
	status, result = e.do("POST", "/accounts", body)
	require.Equal(t, 201, status)
	created := data(result)
	require.Equal(t, false, created["auto_disable"])
	require.Equal(t, false, created["schedulable"])
	id := int64(created["id"].(float64))
	for _, field := range []string{"auto_disable", "schedulable"} {
		status, result = e.do("PATCH", "/accounts/"+itoa(id), map[string]any{field: true})
		require.Equal(t, 400, status)
		require.Contains(t, fieldsOf(result), field+":read_only")
	}
	status, result = e.do("PATCH", "/accounts/"+itoa(legacy), map[string]any{"name": "retained", "auto_disable": true, "schedulable": true, "status": "disabled"})
	require.Equal(t, 200, status)
	require.Equal(t, true, data(result)["auto_disable"])
	require.Equal(t, true, data(result)["schedulable"])
	require.Equal(t, "disabled", data(result)["status"])
	e.gen.types[0].Type.CommonControls["auto_disable"] = manifest.AccountCommonControl{Default: &off}
	status, result = e.do("PATCH", "/accounts/"+itoa(id), map[string]any{"auto_disable": true})
	require.Equal(t, 200, status)
	require.Equal(t, true, data(result)["auto_disable"])
}

func TestAccountAutoDisablePolicy(t *testing.T) {
	authz := fakeAuthz{keys: map[int64][]string{}}
	e := setupWith(t, authz)
	path := "/accounts/auto-disable"
	status, _ := e.do("GET", path, nil)
	require.Equal(t, 403, status)
	for _, permission := range []string{"account:create", "account:own:create", "account:update", "account:own:update"} {
		authz.keys[e.uid] = []string{permission}
		status, result := e.do("GET", path, nil)
		require.Equal(t, 200, status, permission)
		require.Equal(t, map[string]any{"enabled": true}, data(result))
	}
	for _, tc := range []struct {
		value   string
		enabled bool
	}{
		{`{"enabled":false,"keywords":["private-rule"],"status_codes":"401"}`, false},
		{`{"enabled":true}`, true},
		{`{}`, true},
	} {
		_, err := e.db.Pool.Exec(t.Context(), `INSERT INTO settings(key,value) VALUES('auto_disable',$1::jsonb) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, tc.value)
		require.NoError(t, err)
		status, result := e.do("GET", path, nil)
		require.Equal(t, 200, status)
		require.Equal(t, map[string]any{"enabled": tc.enabled}, data(result))
	}
}

func TestReauthorizationClearsOnlyAutomaticAccountBlocks(t *testing.T) {
	e := setup(t)
	for _, state := range []string{"error", "auto_disabled", "disabled"} {
		id := e.mkRawAccount("ccgateway", "managed", "reauth-"+state, "unused", true)
		if _, err := e.db.Pool.Exec(t.Context(), `UPDATE accounts SET status=$2,status_reason='blocked',schedulable=false,auto_disabled_until=clock_timestamp()+interval '1 hour' WHERE id=$1`, id, state); err != nil {
			t.Fatal(err)
		}
		err := e.db.Tx(t.Context(), func(tx pgx.Tx) error {
			changed, err := e.svc.resetForReauth(t.Context(), tx, &row{ID: id, Status: state})
			if changed != (state != "disabled") {
				t.Fatalf("reauth changed=%t for %s", changed, state)
			}
			return err
		})
		if err != nil {
			t.Fatal(err)
		}
		var status, reason string
		var schedulable bool
		var until *time.Time
		if err := e.db.Pool.QueryRow(t.Context(), `SELECT status,status_reason,schedulable,auto_disabled_until FROM accounts WHERE id=$1`, id).Scan(&status, &reason, &schedulable, &until); err != nil {
			t.Fatal(err)
		}
		if schedulable || until != nil {
			t.Fatal("reauth changed manual scheduling or retained the deadline")
		}
		if state == "disabled" {
			if status != state || reason != "blocked" {
				t.Fatal("reauth overrode manual disable")
			}
		} else if status != "active" || reason != "" {
			t.Fatal("reauth retained the automatic block")
		}
	}
}

func TestAutomaticStateActionsAndTimeForms(t *testing.T) {
	e := setup(t)
	id := e.mkRawAccount("anthropic", "apikey", "automatic", "sk-good-key-123", true)
	ctx := t.Context()
	disable := &pluginv1.AccountAutomaticState{Action: pluginv1.AccountAutomaticState_ACTION_DISABLE, Reason: "quota exhausted"}
	clear := &pluginv1.AccountAutomaticState{Action: pluginv1.AccountAutomaticState_ACTION_CLEAR}
	out, err := e.svc.ApplyPluginAccountAutomaticState(ctx, "anthropic", id, disable)
	require.NoError(t, err)
	assert.False(t, out.GetChanged())
	assert.Equal(t, "active", out.GetStatus())
	assert.Zero(t, out.GetUntilUnix())
	assert.Empty(t, e.eventTypes())
	assert.Empty(t, e.auditRows("account.automatic_state"))
	out, err = e.svc.ApplyAccountAutomaticState(ctx, id, disable)
	require.NoError(t, err)
	assert.True(t, out.GetChanged())
	assert.Equal(t, "auto_disabled", out.GetStatus())
	assert.Zero(t, out.GetUntilUnix())
	if again, err := e.svc.ApplyAccountAutomaticState(ctx, id, disable); err != nil || again.GetChanged() {
		t.Fatalf("duplicate: %v %v", again, err)
	}
	timed := &pluginv1.AccountAutomaticState{Action: pluginv1.AccountAutomaticState_ACTION_DISABLE, Reason: "temporary quota",
		Release: &pluginv1.AccountAutomaticState_DurationSeconds{DurationSeconds: 60}}
	if out, err = e.svc.ApplyAccountAutomaticState(ctx, id, timed); err != nil || out.GetChanged() || out.GetUntilUnix() != 0 {
		t.Fatalf("timed event weakened an indefinite disable: %v %v", out, err)
	}
	if out, err = e.svc.ApplyPluginAccountAutomaticState(ctx, "anthropic", id, clear); err != nil || !out.GetChanged() || out.GetStatus() != "active" || out.GetReason() != "" {
		t.Fatalf("clear: %v %v", out, err)
	}
	if out, err = e.svc.ApplyAccountAutomaticState(ctx, id, timed); err != nil || out.GetUntilUnix() < time.Now().Add(55*time.Second).Unix() || out.GetUntilUnix() > time.Now().Add(65*time.Second).Unix() {
		t.Fatalf("duration: %v %v", out, err)
	}
	deadline := time.Now().Add(time.Hour).Unix()
	timed.Release = &pluginv1.AccountAutomaticState_UntilUnix{UntilUnix: deadline}
	if out, err = e.svc.ApplyAccountAutomaticState(ctx, id, timed); err != nil || out.GetUntilUnix() != deadline {
		t.Fatalf("time point: %v %v", out, err)
	}
	if n, err := e.svc.SweepAutomaticState(ctx); err != nil || n != 0 {
		t.Fatalf("old deadline released a renewed disable: %d %v", n, err)
	}
	code, body := e.do("POST", "/accounts/"+itoa(id)+"/reset-status", nil)
	if code != 200 || data(body)["status"] != "active" || data(body)["auto_disabled_until"] != nil {
		t.Fatalf("manual reset: %d %v", code, body)
	}
}

func TestAutomaticStateNeverChangesManualDisableOrOwner(t *testing.T) {
	e := setup(t)
	ctx := t.Context()
	id := e.mkRawAccount("anthropic", "apikey", "manual", "sk-good-key-123", false)
	if _, err := e.db.Pool.Exec(ctx, `UPDATE accounts SET status_reason='disabled by administrator' WHERE id=$1`, id); err != nil {
		t.Fatal(err)
	}
	for _, action := range []pluginv1.AccountAutomaticState_Action{pluginv1.AccountAutomaticState_ACTION_DISABLE, pluginv1.AccountAutomaticState_ACTION_CLEAR} {
		state := &pluginv1.AccountAutomaticState{Action: action, Reason: "plugin decision"}
		out, err := e.svc.ApplyPluginAccountAutomaticState(ctx, "anthropic", id, state)
		if err != nil || out.GetChanged() || out.GetStatus() != "disabled" || out.GetReason() != "disabled by administrator" {
			t.Fatalf("manual disable changed: %v %v", out, err)
		}
		_, other := e.svc.ApplyPluginAccountAutomaticState(ctx, "other", id, state)
		_, missing := e.svc.ApplyPluginAccountAutomaticState(ctx, "other", 999999, state)
		if core.AsError(other).Code != "not_found" || core.AsError(missing).Code != "not_found" || other.Error() != missing.Error() {
			t.Fatalf("ownership: %v %v", other, missing)
		}
	}
	if len(e.eventTypes()) != 0 || len(e.auditRows("account.automatic_state")) != 0 {
		t.Fatal("manual/no-access operations emitted changes")
	}
}

func TestAutomaticStateRecoveryIsClusterSafe(t *testing.T) {
	e := setup(t)
	ctx := t.Context()
	states := []struct {
		status, until string
		schedulable   bool
		expected      string
	}{
		{"auto_disabled", "clock_timestamp()-interval '1 minute'", true, "active"},
		{"auto_disabled", "clock_timestamp()-interval '1 minute'", false, "active"},
		{"auto_disabled", "clock_timestamp()+interval '1 hour'", true, "auto_disabled"},
		{"auto_disabled", "NULL", true, "auto_disabled"},
		{"disabled", "clock_timestamp()-interval '1 minute'", true, "disabled"},
	}
	ids := make([]int64, len(states))
	for i, state := range states {
		ids[i] = e.mkRawAccount("anthropic", "apikey", "candidate-"+itoa(int64(i)), "sk-good-key-123", true)
		if _, err := e.db.Pool.Exec(ctx, `UPDATE accounts SET status=$2,schedulable=$3,auto_disabled_until=`+state.until+` WHERE id=$1`, ids[i], state.status, state.schedulable); err != nil {
			t.Fatal(err)
		}
	}
	other := New(e.svc.d)
	var wg sync.WaitGroup
	results := make(chan int, 2)
	for _, svc := range []*Service{e.svc, other} {
		wg.Add(1)
		go func() {
			defer wg.Done()
			n, err := svc.SweepAutomaticState(ctx)
			if err != nil {
				t.Error(err)
			}
			results <- n
		}()
	}
	wg.Wait()
	if n := <-results + <-results; n != 2 {
		t.Fatalf("recovered %d accounts, want exactly 2", n)
	}
	for i, state := range states {
		var status string
		var schedulable bool
		if err := e.db.Pool.QueryRow(ctx, `SELECT status,schedulable FROM accounts WHERE id=$1`, ids[i]).Scan(&status, &schedulable); err != nil || status != state.expected || schedulable != state.schedulable {
			t.Fatalf("state %d: %s %t %v", i, status, schedulable, err)
		}
	}
	if len(e.auditRows("account.automatic_recovery")) != 2 || len(e.eventTypes()) != 2 {
		t.Fatal("recovery was lost or duplicated")
	}
	if n, err := other.SweepAutomaticState(ctx); err != nil || n != 0 {
		t.Fatalf("repeat sweep: %d %v", n, err)
	}
}

func TestAutomaticStateOptOutAndInvalidTime(t *testing.T) {
	e := setup(t)
	ctx := t.Context()
	id := e.mkRawAccount("anthropic", "apikey", "guarded", "sk-good-key-123", true)
	for _, state := range []*pluginv1.AccountAutomaticState{
		nil, {},
		{Action: pluginv1.AccountAutomaticState_ACTION_DISABLE, Release: &pluginv1.AccountAutomaticState_UntilUnix{UntilUnix: 1}},
		{Action: pluginv1.AccountAutomaticState_ACTION_DISABLE, Release: &pluginv1.AccountAutomaticState_DurationSeconds{DurationSeconds: 0}},
		{Action: pluginv1.AccountAutomaticState_ACTION_DISABLE, Release: &pluginv1.AccountAutomaticState_DurationSeconds{DurationSeconds: -1}},
		{Action: pluginv1.AccountAutomaticState_ACTION_DISABLE, Release: &pluginv1.AccountAutomaticState_DurationSeconds{DurationSeconds: 1 << 62}},
		{Action: pluginv1.AccountAutomaticState_ACTION_CLEAR, Release: &pluginv1.AccountAutomaticState_DurationSeconds{DurationSeconds: 1}},
	} {
		if _, err := e.svc.ApplyAccountAutomaticState(ctx, id, state); core.AsError(err).Code != "invalid_argument" {
			t.Fatalf("invalid state accepted: %v %v", state, err)
		}
	}
	disable := &pluginv1.AccountAutomaticState{Action: pluginv1.AccountAutomaticState_ACTION_DISABLE, Reason: "quota"}
	if _, err := e.db.Pool.Exec(ctx, `UPDATE accounts SET auto_disable=false WHERE id=$1`, id); err != nil {
		t.Fatal(err)
	}
	if out, err := e.svc.ApplyPluginAccountAutomaticState(ctx, "anthropic", id, disable); err != nil || out.GetChanged() || out.GetStatus() != "active" {
		t.Fatalf("opt-out: %v %v", out, err)
	}
	if _, err := e.db.Pool.Exec(ctx, `UPDATE accounts SET auto_disable=true WHERE id=$1`, id); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Pool.Exec(ctx, `INSERT INTO settings(key,value) VALUES('auto_disable','{"enabled":false}')`); err != nil {
		t.Fatal(err)
	}
	if out, err := e.svc.ApplyPluginAccountAutomaticState(ctx, "anthropic", id, disable); err != nil || out.GetChanged() || out.GetStatus() != "active" {
		t.Fatalf("global opt-out: %v %v", out, err)
	}
}
