package growth

import (
	"bytes"
	"context"
	_ "embed"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/shopspring/decimal"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

//go:embed testdata/manifest.json
var manifestJSON []byte

func startDB(t *testing.T, config any) (*Plugin, *pluginsdktest.Harness, *pluginsdktest.FakeHost) {
	t.Helper()
	dsn, schema := pluginsdktest.NewSchema(t, "plg_growth_t")
	pluginsdktest.ApplyMigrations(t, dsn, schema, filepath.Join("..", "..", "migrations"))
	fh := pluginsdktest.NewFakeHost()
	fh.SetDSN(dsn, schema)
	if config == nil {
		config = Settings{
			ReferralEnabled:       true,
			ReferralRatePercent:   10,
			ReferralMaxPerInvitee: 100,
			ReferralDurationDays:  0,
			CheckinEnabled:        true,
			CheckinMinQuota:       0.01,
			CheckinMaxQuota:       0.05,
			CheckinTimezone:       "UTC",
		}
	}
	p := New()
	h := pluginsdktest.Start(t, p, pluginsdktest.Options{
		Host:   fh,
		Config: config,
		Grants: []*pluginv1.Grant{
			{Permission: "ledger.credit", ScopeJson: `{"maxPerTx":"10","maxPerDay":"100"}`},
		},
		SDK: []pluginsdk.Option{pluginsdk.WithManifest(manifestJSON)},
	})
	return p, h, fh
}

func TestManifestServes(t *testing.T) {
	p := New()
	h := pluginsdktest.Start(t, p, pluginsdktest.Options{
		SDK:           []pluginsdk.Option{pluginsdk.WithManifest(manifestJSON)},
		SkipHandshake: true,
	})
	caps := h.Info.GetCapabilities()
	for _, c := range []string{manifest.CapAppEvents, manifest.CapAppJobs, manifest.CapHTTPRoutes} {
		found := false
		for _, got := range caps {
			if got == c {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("capability %s missing: %v", c, caps)
		}
	}
}

func TestManifestValid(t *testing.T) {
	dec := json.NewDecoder(bytes.NewReader(manifestJSON))
	dec.DisallowUnknownFields()
	var m manifest.Manifest
	if err := dec.Decode(&m); err != nil {
		t.Fatalf("manifest.json: %v", err)
	}
	if m.Key != "growth" || m.Version == "" || m.Database == nil || m.Database.Schema != "plg_growth" {
		t.Fatalf("manifest = %+v", m)
	}
	if len(m.Events.Subscribe) != 3 {
		t.Fatalf("events.subscribe = %v", m.Events.Subscribe)
	}
	if len(m.Jobs) != 1 || m.Jobs[0].ID != "cleanup" {
		t.Fatalf("jobs = %v", m.Jobs)
	}
	if len(m.Routes) != 9 {
		t.Fatalf("routes = %d", len(m.Routes))
	}
	perms := map[string]bool{}
	for _, up := range m.UserPermissions {
		perms[up.Key] = true
	}
	if !perms["growth:read"] || !perms["growth:manage"] || len(perms) != 2 {
		t.Fatalf("user permissions = %v", perms)
	}
}

func TestSettingsForms(t *testing.T) {
	var m manifest.Manifest
	if err := json.Unmarshal(manifestJSON, &m); err != nil {
		t.Fatal(err)
	}
	var schema struct {
		AdditionalProperties *bool                     `json:"additionalProperties"`
		Properties           map[string]map[string]any `json:"properties"`
	}
	schemaPath := filepath.Join("..", "..", m.UI.Settings.Schema)
	b, err := os.ReadFile(schemaPath)
	if err != nil || json.Unmarshal(b, &schema) != nil {
		t.Fatalf("schema: %v", err)
	}
	if schema.AdditionalProperties == nil || *schema.AdditionalProperties {
		t.Fatal("schema must set additionalProperties:false")
	}
	var ui map[string]json.RawMessage
	uiPath := filepath.Join("..", "..", m.UI.Settings.UISchema)
	b, err = os.ReadFile(uiPath)
	if err != nil || json.Unmarshal(b, &ui) != nil {
		t.Fatalf("ui schema: %v", err)
	}
	var order []string
	_ = json.Unmarshal(ui["ui:order"], &order)
	if len(order) != len(schema.Properties) {
		t.Fatalf("ui:order has %d fields, schema %d", len(order), len(schema.Properties))
	}
	for _, k := range order {
		if _, ok := schema.Properties[k]; !ok {
			t.Errorf("ui:order field %s not in schema", k)
		}
	}
}

func TestReferralCodeGeneration(t *testing.T) {
	_, h, _ := startDB(t, nil)
	ctx := context.Background()
	// Simulate user.created event.
	events := []*pluginv1.Event{
		{Id: 1, Type: "user.created", PayloadJson: `{"user_id":100}`},
		{Id: 2, Type: "user.created", PayloadJson: `{"user_id":200}`},
	}
	resp, err := h.App.OnEvents(ctx, &pluginv1.OnEventsRequest{Events: events})
	if err != nil {
		t.Fatal(err)
	}
	if resp.GetAckedThroughId() != 2 {
		t.Fatalf("acked = %d", resp.GetAckedThroughId())
	}
	// Check codes were generated.
	r1 := h.Do("GET", "/me/referral", nil, nil)
	if r1.GetStatus() != 200 {
		t.Fatalf("GET /me/referral: %d %s", r1.GetStatus(), r1.GetBody())
	}
	var data1 struct {
		Data MyReferralResponse `json:"data"`
	}
	json.Unmarshal(r1.GetBody(), &data1)
	if len(data1.Data.Code) != 8 {
		t.Fatalf("code = %q", data1.Data.Code)
	}
}

func TestBindReferralCode(t *testing.T) {
	p, h, _ := startDB(t, nil)
	ctx := context.Background()
	// Create codes for user 100 and 200.
	code100, _ := p.ensureCode(ctx, 100)
	p.ensureCode(ctx, 200)
	// User 200 binds code of user 100.
	h.Do("GET", "/me/referral", nil, nil) // ensure code for caller (user 1)
	bindResp := h.Do("POST", "/me/referral/bind", nil, map[string]string{"code": code100})
	if bindResp.GetStatus() != 200 {
		t.Fatalf("bind: %d %s", bindResp.GetStatus(), bindResp.GetBody())
	}
	// Check binding.
	db, _ := p.db(ctx)
	var inviterID int64
	db.QueryRow(ctx, `SELECT inviter_user_id FROM referral_codes WHERE user_id = 1`).Scan(&inviterID)
	if inviterID != 100 {
		t.Fatalf("inviter = %d", inviterID)
	}
	// Bind again should fail.
	bind2 := h.Do("POST", "/me/referral/bind", nil, map[string]string{"code": code100})
	if bind2.GetStatus() != 400 {
		t.Fatalf("bind again: %d", bind2.GetStatus())
	}
}

func TestCommissionOnUsage(t *testing.T) {
	p, h, fh := startDB(t, nil)
	ctx := context.Background()
	// User 1 invites user 2.
	code1, _ := p.ensureCode(ctx, 1)
	p.ensureCode(ctx, 2)
	p.bindInviter(ctx, 2, code1)
	// User 2 usage event.
	events := []*pluginv1.Event{
		{Id: 100, Type: "usage.recorded", PayloadJson: `{"user_id":2,"total_cost":"1.50","billing_status":"billed"}`},
	}
	_, err := h.App.OnEvents(ctx, &pluginv1.OnEventsRequest{Events: events})
	if err != nil {
		t.Fatal(err)
	}
	// Check commission (10% of 1.50 = 0.15).
	ledger := fh.Ledger()
	if len(ledger) != 1 {
		t.Fatalf("ledger = %d entries", len(ledger))
	}
	if !ledger[0].Credit || ledger[0].Req.GetUserId() != 1 {
		t.Fatalf("ledger[0] = %+v", ledger[0])
	}
	amount, _ := decimal.NewFromString(ledger[0].Req.GetAmount())
	expected := decimal.NewFromFloat(0.15)
	if !amount.Equal(expected) {
		t.Fatalf("commission = %s, want %s", amount, expected)
	}
	// Check commission record.
	db, _ := p.db(ctx)
	var commission decimal.Decimal
	db.QueryRow(ctx, `SELECT commission FROM commissions WHERE inviter_user_id = 1 AND invitee_user_id = 2`).Scan(&commission)
	if !commission.Equal(expected) {
		t.Fatalf("db commission = %s", commission)
	}
}

func TestCommissionIdempotency(t *testing.T) {
	p, h, fh := startDB(t, nil)
	ctx := context.Background()
	code1, _ := p.ensureCode(ctx, 1)
	p.ensureCode(ctx, 2)
	p.bindInviter(ctx, 2, code1)
	// Same event twice.
	events := []*pluginv1.Event{
		{Id: 100, Type: "usage.recorded", PayloadJson: `{"user_id":2,"total_cost":"1.00","billing_status":"billed"}`},
	}
	h.App.OnEvents(ctx, &pluginv1.OnEventsRequest{Events: events})
	h.App.OnEvents(ctx, &pluginv1.OnEventsRequest{Events: events})
	// Should only credit once.
	ledger := fh.Ledger()
	if len(ledger) != 1 {
		t.Fatalf("ledger = %d entries", len(ledger))
	}
}

func TestCommissionCapPerInvitee(t *testing.T) {
	p, h, fh := startDB(t, Settings{
		ReferralEnabled:       true,
		ReferralRatePercent:   10,
		ReferralMaxPerInvitee: 0.20, // cap at $0.20
		CheckinEnabled:        false,
	})
	ctx := context.Background()
	code1, _ := p.ensureCode(ctx, 1)
	p.ensureCode(ctx, 2)
	p.bindInviter(ctx, 2, code1)
	// Two events: $1.50 and $1.00.
	events := []*pluginv1.Event{
		{Id: 100, Type: "usage.recorded", PayloadJson: `{"user_id":2,"total_cost":"1.50","billing_status":"billed"}`},
		{Id: 101, Type: "usage.recorded", PayloadJson: `{"user_id":2,"total_cost":"1.00","billing_status":"billed"}`},
	}
	h.App.OnEvents(ctx, &pluginv1.OnEventsRequest{Events: events})
	// First: 10% of 1.50 = 0.15, second: capped to remaining 0.05.
	ledger := fh.Ledger()
	if len(ledger) != 2 {
		t.Fatalf("ledger = %d", len(ledger))
	}
	amt1, _ := decimal.NewFromString(ledger[0].Req.GetAmount())
	amt2, _ := decimal.NewFromString(ledger[1].Req.GetAmount())
	if !amt1.Equal(decimal.NewFromFloat(0.15)) || !amt2.Equal(decimal.NewFromFloat(0.05)) {
		t.Fatalf("amounts = %s, %s", amt1, amt2)
	}
}

func TestCheckin(t *testing.T) {
	_, h, fh := startDB(t, Settings{
		ReferralEnabled: false,
		CheckinEnabled:  true,
		CheckinMinQuota: 0.01,
		CheckinMaxQuota: 0.01, // fixed for testing
		CheckinTimezone: "UTC",
	})
	// First check-in.
	resp := h.Do("POST", "/me/checkin", nil, nil)
	if resp.GetStatus() != 200 {
		t.Fatalf("checkin: %d %s", resp.GetStatus(), resp.GetBody())
	}
	var data struct {
		Data CheckinPostResponse `json:"data"`
	}
	json.Unmarshal(resp.GetBody(), &data)
	if !data.Data.QuotaAwarded.Equal(decimal.NewFromFloat(0.01)) {
		t.Fatalf("quota = %s", data.Data.QuotaAwarded)
	}
	// Check ledger.
	ledger := fh.Ledger()
	if len(ledger) != 1 || !ledger[0].Credit || ledger[0].Req.GetUserId() != 1 {
		t.Fatalf("ledger = %+v", ledger)
	}
	// Second check-in same day should fail.
	resp2 := h.Do("POST", "/me/checkin", nil, nil)
	if resp2.GetStatus() != 400 {
		t.Fatalf("second checkin: %d", resp2.GetStatus())
	}
	// Check status.
	status := h.Do("GET", "/me/checkin/status", nil, nil)
	var statusData struct {
		Data CheckinStatusResponse `json:"data"`
	}
	json.Unmarshal(status.GetBody(), &statusData)
	if !statusData.Data.CheckedInToday || statusData.Data.TotalCheckins != 1 {
		t.Fatalf("status = %+v", statusData.Data)
	}
}

func TestCheckinConsecutiveDays(t *testing.T) {
	p, h, _ := startDB(t, Settings{
		CheckinEnabled:  true,
		CheckinMinQuota: 0.01,
		CheckinMaxQuota: 0.01,
		CheckinTimezone: "UTC",
	})
	ctx := context.Background()
	db, _ := p.db(ctx)
	now := time.Now().UTC()
	// Insert check-ins for yesterday and day before yesterday.
	for i := 1; i <= 2; i++ {
		date := now.AddDate(0, 0, -i).Format("2006-01-02")
		db.Exec(ctx, `INSERT INTO checkins (user_id, checkin_date, quota_awarded, ledger_id) VALUES (1, $1, 0.01, $2)`, date, 1000+i)
	}
	// Get status.
	resp := h.Do("GET", "/me/checkin/status", nil, nil)
	var data struct {
		Data CheckinStatusResponse `json:"data"`
	}
	json.Unmarshal(resp.GetBody(), &data)
	if data.Data.ConsecutiveDays != 2 {
		t.Fatalf("consecutive = %d", data.Data.ConsecutiveDays)
	}
}

func TestCleanupJob(t *testing.T) {
	p, h, _ := startDB(t, nil)
	ctx := context.Background()
	db, _ := p.db(ctx)
	// Insert old check-in (100 days ago).
	oldDate := time.Now().AddDate(0, 0, -100).Format("2006-01-02")
	db.Exec(ctx, `INSERT INTO checkins (user_id, checkin_date, quota_awarded, ledger_id) VALUES (1, $1, 0.01, 9999)`, oldDate)
	// Run cleanup job.
	jobResp, err := h.App.RunJob(ctx, &pluginv1.RunJobRequest{JobId: JobCleanup})
	if err != nil {
		t.Fatal(err)
	}
	if jobResp.GetMessage() == "" {
		t.Fatalf("job message empty")
	}
	// Check old record deleted.
	var count int
	db.QueryRow(ctx, `SELECT COUNT(*) FROM checkins WHERE checkin_date = $1`, oldDate).Scan(&count)
	if count != 0 {
		t.Fatalf("old record not deleted")
	}
}

func TestAdminRoutes(t *testing.T) {
	p, h, _ := startDB(t, nil)
	ctx := context.Background()
	// Setup data.
	code1, _ := p.ensureCode(ctx, 1)
	p.ensureCode(ctx, 2)
	p.bindInviter(ctx, 2, code1)
	events := []*pluginv1.Event{
		{Id: 100, Type: "usage.recorded", PayloadJson: `{"user_id":2,"total_cost":"1.00","billing_status":"billed"}`},
	}
	h.App.OnEvents(ctx, &pluginv1.OnEventsRequest{Events: events})
	p.doCheckin(ctx, 1)
	// Test admin endpoints.
	tests := []struct {
		path string
	}{
		{"/admin/referrals"},
		{"/admin/referrals/1"},
		{"/admin/commissions"},
		{"/admin/checkins"},
		{"/admin/stats"},
	}
	for _, tt := range tests {
		resp := h.Do("GET", tt.path, nil, nil)
		if resp.GetStatus() != 200 {
			t.Errorf("%s: %d %s", tt.path, resp.GetStatus(), resp.GetBody())
		}
	}
}
