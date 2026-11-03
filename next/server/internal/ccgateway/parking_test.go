package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// parkController is a controller that records configurations and reports a
// runtime ready at the revision of its last enabled configuration.
type parkController struct {
	mu      sync.Mutex
	puts    map[string][]bool // key -> enabled of each PUT
	applied map[string]string // key -> revision of the last enabled PUT
	never   bool              // never report ready
}

func (c *parkController) handler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/health" {
		_, _ = w.Write([]byte(`{"features":["cli-profile-v1"]}`))
		return
	}
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/accounts/"), "/")
	key := parts[0]
	c.mu.Lock()
	defer c.mu.Unlock()
	if r.Method == http.MethodPut && len(parts) > 1 && parts[1] == "config" {
		var body struct {
			Enabled  bool   `json:"enabled"`
			Revision string `json:"revision"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		c.puts[key] = append(c.puts[key], body.Enabled)
		if body.Enabled {
			c.applied[key] = body.Revision
		} else {
			delete(c.applied, key)
		}
		_, _ = w.Write([]byte(`{"status":"ok"}`))
		return
	}
	if rev, ok := c.applied[key]; ok && !c.never {
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ready", "revision": rev})
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "pending", "revision": ""})
}

func (c *parkController) putsOf(key string) []bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return append([]bool(nil), c.puts[key]...)
}

type parkEnv struct {
	db   *store.DB
	s    *Service
	ctl  *parkController
	ctx  context.Context
	seen int
}

func newParkEnv(t *testing.T, hours *int) *parkEnv {
	t.Helper()
	db := testutil.DB(t)
	cipher, _ := secret.New(make([]byte, 32))
	ctl := &parkController{puts: map[string][]bool{}, applied: map[string]string{}}
	server := httptest.NewServer(http.HandlerFunc(ctl.handler))
	t.Cleanup(server.Close)
	t.Setenv("CCGATEWAY_URL", server.URL)
	cfg, _ := json.Marshal(Config{Mode: "local", AccountRuntimes: true, AdminKey: "controller-secret", ParkAfterHours: hours,
		RequestPolicy: &RequestPolicy{SchemaVersion: 1, UnknownField: "reject", CLIVersion: "2.1.302"}})
	encrypted, _ := cipher.Encrypt(cfg, configAAD)
	envelope, _ := json.Marshal(map[string]any{"cipher": encrypted})
	ctx := context.Background()
	if _, err := db.Pool.Exec(ctx, `INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, settingKey, envelope); err != nil {
		t.Fatal(err)
	}
	return &parkEnv{db: db, s: New(db, cipher), ctl: ctl, ctx: ctx}
}

type parkAccount struct {
	status     string
	schedul    bool
	until      bool // auto_disabled_until set (yellow)
	redFor     time.Duration
	wokenAgo   time.Duration // 0: never woken
	deleted    bool
	wantParked bool
}

// account creates a CCGateway account with its runtime, red (or not) since
// redFor ago, and returns its id and runtime key.
func (e *parkEnv) account(t *testing.T, a parkAccount) (int64, string) {
	t.Helper()
	e.seen++
	var id int64
	if err := e.db.Pool.QueryRow(e.ctx, `INSERT INTO accounts(name,plugin_key,type,credentials_enc,status,schedulable,auto_disabled_until,deleted_at)
		VALUES($1,'ccgateway','managed',''::bytea,$2,$3,CASE WHEN $4 THEN now() + interval '1 hour' END, CASE WHEN $5 THEN now() END) RETURNING id`,
		"acct-"+strconv.Itoa(e.seen), a.status, a.schedul, a.until, a.deleted).Scan(&id); err != nil {
		t.Fatal(err)
	}
	key := newDraftKey()
	if _, err := e.db.Pool.Exec(e.ctx, `INSERT INTO ccgateway_runtimes(key,account_id,adopted_at,woken_at) VALUES($1,$2,now(),
		CASE WHEN $3::bigint > 0 THEN now() - make_interval(secs => $3::bigint) END)`, key, id, int64(a.wokenAgo.Seconds())); err != nil {
		t.Fatal(err)
	}
	e.setChangedAgo(t, id, a.redFor)
	return id, key
}

// setChangedAgo moves an account's status_changed_at back (the trigger keeps
// it otherwise).
func (e *parkEnv) setChangedAgo(t *testing.T, id int64, ago time.Duration) {
	t.Helper()
	err := pgx.BeginFunc(e.ctx, e.db.Pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(e.ctx, `SET LOCAL session_replication_role = replica`); err != nil {
			return err
		}
		_, err := tx.Exec(e.ctx, `UPDATE accounts SET status_changed_at = now() - make_interval(secs => $2::bigint) WHERE id = $1`, id, int64(ago.Seconds()))
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
}

func (e *parkEnv) park(t *testing.T) core.TaskResult {
	t.Helper()
	res, err := e.s.parkRuntimes(e.ctx, core.TaskRun{Name: ParkRuntimesTask})
	if err != nil {
		t.Fatal(err)
	}
	return res
}

func (e *parkEnv) parkedAt(t *testing.T, key string) *time.Time {
	t.Helper()
	var at *time.Time
	if err := e.db.Pool.QueryRow(e.ctx, `SELECT parked_at FROM ccgateway_runtimes WHERE key = $1`, key).Scan(&at); err != nil {
		t.Fatal(err)
	}
	return at
}

func TestParkRuntimesStopsRedAccountsDueOnly(t *testing.T) {
	e := newParkEnv(t, nil) // default: 3 hours
	cases := map[string]parkAccount{
		"disabled 4h":                 {status: "disabled", schedul: true, redFor: 4 * time.Hour, wantParked: true},
		"auto-disabled 4h":            {status: "auto_disabled", schedul: true, redFor: 4 * time.Hour, wantParked: true},
		"legacy error 4h":             {status: "error", schedul: true, redFor: 4 * time.Hour, wantParked: true},
		"out of scheduling 4h":        {status: "active", schedul: false, redFor: 4 * time.Hour, wantParked: true},
		"yellow (release time) 4h":    {status: "auto_disabled", schedul: true, until: true, redFor: 4 * time.Hour},
		"active 4h":                   {status: "active", schedul: true, redFor: 4 * time.Hour},
		"disabled 2h":                 {status: "disabled", schedul: true, redFor: 2 * time.Hour},
		"disabled 4h, woken 1h ago":   {status: "disabled", schedul: true, redFor: 4 * time.Hour, wokenAgo: time.Hour},
		"disabled 8h, woken 4h ago":   {status: "disabled", schedul: true, redFor: 8 * time.Hour, wokenAgo: 4 * time.Hour, wantParked: true},
		"deleted, disabled 4h before": {status: "disabled", schedul: true, redFor: 4 * time.Hour, deleted: true},
	}
	keys := map[string]string{}
	ids := map[string]int64{}
	want := 0
	for name, a := range cases {
		ids[name], keys[name] = e.account(t, a)
		if a.wantParked {
			want++
		}
	}
	if res := e.park(t); res.Count != want {
		t.Fatalf("parked %d runtimes, want %d", res.Count, want)
	}
	for name, a := range cases {
		if got := e.parkedAt(t, keys[name]) != nil; got != a.wantParked {
			t.Errorf("%s: parked=%v, want %v", name, got, a.wantParked)
		}
		parked, err := e.s.RuntimeParked(e.ctx, ids[name])
		if err != nil || parked != a.wantParked {
			t.Errorf("%s: RuntimeParked=%v (%v), want %v", name, parked, err, a.wantParked)
		}
	}
	var audits int
	if err := e.db.Pool.QueryRow(e.ctx, `SELECT count(*) FROM audit_logs WHERE action = $1`, actionRuntimeParked).Scan(&audits); err != nil || audits != want {
		t.Fatalf("audit rows %d (%v), want %d", audits, err, want)
	}
	// Parked runtimes are not claimed again.
	if res := e.park(t); res.Count != 0 {
		t.Fatalf("parked %d runtimes again", res.Count)
	}
}

func TestParkRuntimesOff(t *testing.T) {
	zero := 0
	e := newParkEnv(t, &zero)
	_, key := e.account(t, parkAccount{status: "disabled", redFor: 100 * time.Hour})
	if res := e.park(t); res.Count != 0 || e.parkedAt(t, key) != nil {
		t.Fatalf("parked with park_after_hours 0: %+v", res)
	}
}

func TestParkRuntimesClaimsEachOnceWhenRunTwice(t *testing.T) {
	e := newParkEnv(t, nil)
	const n = 30
	for range n {
		e.account(t, parkAccount{status: "disabled", redFor: 5 * time.Hour})
	}
	var wg sync.WaitGroup
	var mu sync.Mutex
	total := 0
	for range 2 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			res, err := e.s.parkRuntimes(e.ctx, core.TaskRun{})
			if err != nil {
				t.Error(err)
				return
			}
			mu.Lock()
			total += res.Count
			mu.Unlock()
		}()
	}
	wg.Wait()
	var audits int
	_ = e.db.Pool.QueryRow(e.ctx, `SELECT count(*) FROM audit_logs WHERE action = $1`, actionRuntimeParked).Scan(&audits)
	if total != n || audits != n {
		t.Fatalf("two runs parked %d runtimes with %d audit rows, want %d", total, audits, n)
	}
}

// A parked runtime is blocked once (not at every pass); the account coming
// back makes the mark stale and the runtime runs again; disabling it again
// waits the full time again.
func TestParkedRuntimeFollowsTheAccount(t *testing.T) {
	e := newParkEnv(t, nil)
	id, key := e.account(t, parkAccount{status: "disabled", redFor: 4 * time.Hour})
	if res := e.park(t); res.Count != 1 {
		t.Fatalf("parked %d", res.Count)
	}
	d, err := e.s.desired(e.ctx, id, false)
	if err != nil || !d.Parked || d.Enabled {
		t.Fatalf("desired of a parked runtime: parked=%v enabled=%v (%v)", d.Parked, d.Enabled, err)
	}
	for range 3 {
		if err := e.s.Reconcile(e.ctx, key); err != nil {
			t.Fatal(err)
		}
	}
	if puts := e.ctl.putsOf(key); len(puts) != 1 || puts[0] {
		t.Fatalf("configurations sent to a parked runtime: %v (want one enabled:false)", puts)
	}
	// Another account's change does not block it again.
	e.s.Kick("999999")
	if err := e.s.Reconcile(e.ctx, key); err != nil || len(e.ctl.putsOf(key)) != 1 {
		t.Fatalf("blocked again after another account changed: %v %v", err, e.ctl.putsOf(key))
	}

	// The account is enabled again: the mark no longer counts.
	if _, err := e.db.Pool.Exec(e.ctx, `UPDATE accounts SET status = 'active' WHERE id = $1`, id); err != nil {
		t.Fatal(err)
	}
	e.s.Kick(key)
	if err := e.s.Reconcile(e.ctx, key); err != nil {
		t.Fatal(err)
	}
	puts := e.ctl.putsOf(key)
	if len(puts) != 2 || !puts[1] {
		t.Fatalf("runtime not started after the account came back: %v", puts)
	}
	// Disabled again: the old mark does not stop it; the task clears it.
	if _, err := e.db.Pool.Exec(e.ctx, `UPDATE accounts SET status = 'disabled' WHERE id = $1`, id); err != nil {
		t.Fatal(err)
	}
	if d, _ := e.s.desired(e.ctx, id, false); d.Parked || !d.Enabled {
		t.Fatal("a stale mark stopped the runtime of a newly disabled account")
	}
	if res := e.park(t); res.Count != 0 || e.parkedAt(t, key) != nil {
		t.Fatalf("a newly disabled account was parked at once or its stale mark kept: %+v", res)
	}
}

func TestWakeRuntime(t *testing.T) {
	e := newParkEnv(t, nil)
	id, key := e.account(t, parkAccount{status: "disabled", redFor: 4 * time.Hour})
	e.park(t)
	if err := e.s.Reconcile(e.ctx, key); err != nil {
		t.Fatal(err)
	}
	if err := e.s.WakeRuntime(e.ctx, id); err != nil {
		t.Fatal(err)
	}
	if e.parkedAt(t, key) != nil {
		t.Fatal("woken runtime still marked")
	}
	if puts := e.ctl.putsOf(key); len(puts) != 2 || !puts[1] {
		t.Fatalf("woken runtime not started: %v", puts)
	}
	var woken *time.Time
	_ = e.db.Pool.QueryRow(e.ctx, `SELECT woken_at FROM ccgateway_runtimes WHERE key = $1`, key).Scan(&woken)
	if woken == nil {
		t.Fatal("woken_at not recorded")
	}
	// Still red, but woken just now: not parked again yet.
	if res := e.park(t); res.Count != 0 {
		t.Fatal("parked again right after waking")
	}
	// Waking a running runtime does nothing.
	if err := e.s.WakeRuntime(e.ctx, id); err != nil || len(e.ctl.putsOf(key)) != 2 {
		t.Fatalf("waking a running runtime: %v %v", err, e.ctl.putsOf(key))
	}
	var audits int
	_ = e.db.Pool.QueryRow(e.ctx, `SELECT count(*) FROM audit_logs WHERE action = $1`, actionRuntimeWoken).Scan(&audits)
	if audits != 1 {
		t.Fatalf("%d wake audit rows", audits)
	}
}

func TestWakeRuntimeTimesOut(t *testing.T) {
	old, oldPoll := wakeWait, wakePoll
	wakeWait, wakePoll = 300*time.Millisecond, 50*time.Millisecond
	t.Cleanup(func() { wakeWait, wakePoll = old, oldPoll })
	e := newParkEnv(t, nil)
	e.ctl.never = true
	id, _ := e.account(t, parkAccount{status: "disabled", redFor: 4 * time.Hour})
	e.park(t)
	err := e.s.WakeRuntime(e.ctx, id)
	var ce *core.Error
	if !errors.As(err, &ce) || ce.Details["reason"] != reasonRuntimeNotReady {
		t.Fatalf("wake of a runtime that never gets ready: %v", err)
	}
}

func TestParkedRuntimeQuotaAndStatus(t *testing.T) {
	e := newParkEnv(t, nil)
	id, _ := e.account(t, parkAccount{status: "disabled", redFor: 4 * time.Hour})
	e.park(t)
	_, err := e.s.QueryAccountQuota(e.ctx, id, "usage")
	var ue *UsageError
	if !errors.As(err, &ue) || ue.Code != reasonRuntimeParked {
		t.Fatalf("quota of a parked runtime: %v", err)
	}
	parked, err := e.s.ParkedRuntimes(e.ctx, []int64{id, id + 1000})
	if err != nil || !parked[id] || len(parked) != 1 {
		t.Fatalf("ParkedRuntimes: %v %v", parked, err)
	}
}

func TestParkAfterHoursSetting(t *testing.T) {
	if got := (Config{}).ParkAfter(); got != 3*time.Hour {
		t.Fatalf("default %s", got)
	}
	zero, five, bad := 0, 5, 721
	if got := (Config{ParkAfterHours: &zero}).ParkAfter(); got != 0 {
		t.Fatalf("zero %s", got)
	}
	c := Config{}
	if err := mergeParking(&c, Config{ParkAfterHours: &five}); err != nil || *c.ParkAfterHours != 5 {
		t.Fatal("omitted setting not kept")
	}
	c = Config{ParkAfterHours: &bad}
	if err := mergeParking(&c, Config{}); err == nil {
		t.Fatal("721 hours accepted")
	}
	if (Config{ParkAfterHours: &five}).Public()["park_after_hours"] != 5 {
		t.Fatal("public view")
	}
	if !sameRuntimeConfig(Config{ParkAfterHours: &five}, Config{}) {
		t.Fatal("park_after_hours reconfigures runtimes")
	}
}
