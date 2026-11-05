//go:build realvalkey

package engine

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/redis/go-redis/v9/maintnotifications"
	"github.com/stretchr/testify/require"
)

// The stores against a real Valkey (SESSION-MEMORY-TOOLS-USED-DESIGN.md
// §10.2): the compose service's image, arguments and users.acl, set up by
// controller-go/integration/state/run.sh, which runs this binary inside that
// image next to a loop that keeps valkey-server running, with
//
//	CCG_REAL_VALKEY_SOCKET       the socket
//	CCG_REAL_VALKEY_SECRET_FILE  the management password file
//	CCG_REAL_VALKEY_PAUSE        a file that, while it exists, keeps the
//	                             loop from starting valkey-server again
//
// Built only with -tags realvalkey (session_store_noreal_test.go is the
// default suite's empty realStoreCases). Each case has an account user of
// its own (a fresh key), set up with the controller's rules
// (sessionstate.Rules) through the management user.

type realValkey struct {
	socket, secret, pause string
}

func needRealValkey(t *testing.T) realValkey {
	t.Helper()
	r := realValkey{os.Getenv("CCG_REAL_VALKEY_SOCKET"), os.Getenv("CCG_REAL_VALKEY_SECRET_FILE"), os.Getenv("CCG_REAL_VALKEY_PAUSE")}
	if r.socket == "" || r.secret == "" {
		t.Fatal("CCG_REAL_VALKEY_SOCKET / CCG_REAL_VALKEY_SECRET_FILE not set")
	}
	return r
}

// admin is a client as the management user ccg-controller.
func (r realValkey) admin(t *testing.T) *redis.Client {
	t.Helper()
	b, err := os.ReadFile(r.secret)
	require.NoError(t, err)
	c := r.client("ccg-controller", strings.TrimSpace(string(b)))
	t.Cleanup(func() { c.Close() })
	return c
}

func (r realValkey) client(user, password string) *redis.Client {
	return redis.NewClient(&redis.Options{Network: "unix", Addr: r.socket, Username: user, Password: password,
		Protocol: 2, DisableIdentity: true, MaxRetries: -1,
		MaintNotificationsConfig: &maintnotifications.Config{Mode: maintnotifications.ModeDisabled, EndpointType: maintnotifications.EndpointTypeNone}})
}

// accountRules are the controller's (sessionstate.Rules, §5.4).
func accountRules(key, password string, on bool) []any {
	state := "on"
	if !on {
		state = "off"
	}
	out := []any{"ACL", "SETUSER", "acct-" + key, "reset", state, ">" + password, "resetkeys", "~ccg:" + key + ":*", "resetchannels", "-@all"}
	for _, c := range []string{"+hello", "+get", "+set", "+getex", "+expire", "+del", "+exists", "+ttl", "+evalsha", "+eval", "+script|load", "+ping"} {
		out = append(out, c)
	}
	return out
}

// account sets up a fresh account user and returns its key and password.
func (r realValkey) account(t *testing.T) (key, password string) {
	t.Helper()
	b := make([]byte, 8)
	rand.Read(b)
	key, password = "e"+hex.EncodeToString(b), hex.EncodeToString(append(b, b...))
	admin := r.admin(t)
	ctx := context.Background()
	require.NoError(t, admin.Do(ctx, accountRules(key, password, true)...).Err())
	t.Cleanup(func() { admin.Do(context.Background(), "ACL", "DELUSER", "acct-"+key) })
	return key, password
}

func (r realValkey) runID(t *testing.T, admin *redis.Client) string {
	t.Helper()
	text, err := admin.Info(context.Background(), "server").Result()
	require.NoError(t, err)
	for _, line := range strings.Split(text, "\n") {
		if v, ok := strings.CutPrefix(strings.TrimSpace(line), "run_id:"); ok {
			return v
		}
	}
	t.Fatal("no run_id")
	return ""
}

// stop ends valkey-server; with pause the loop leaves it stopped until
// resume.
func (r realValkey) stop(t *testing.T, pause bool) {
	t.Helper()
	if pause {
		require.NotEmpty(t, r.pause, "CCG_REAL_VALKEY_PAUSE not set")
		require.NoError(t, os.WriteFile(r.pause, nil, 0o644))
	}
	entries, err := os.ReadDir("/proc")
	require.NoError(t, err)
	for _, e := range entries {
		comm, err := os.ReadFile(filepath.Join("/proc", e.Name(), "comm"))
		if err != nil || strings.TrimSpace(string(comm)) != "valkey-server" {
			continue
		}
		pid, _ := strconv.Atoi(e.Name())
		p, err := os.FindProcess(pid)
		require.NoError(t, err)
		require.NoError(t, p.Signal(os.Interrupt))
		if pause {
			// Gone (the socket refuses) before the test goes on.
			for i := 0; i < 100; i++ {
				if _, err := os.Stat(filepath.Join("/proc", e.Name())); errors.Is(err, os.ErrNotExist) {
					break
				}
				time.Sleep(50 * time.Millisecond)
			}
		}
		return
	}
	t.Fatal("no valkey-server process")
}

// restart stops valkey-server (or ends a pause) and waits for a new run_id.
func (r realValkey) restart(t *testing.T, old string, resume bool) {
	t.Helper()
	if resume {
		require.NoError(t, os.Remove(r.pause))
	} else {
		r.stop(t, false)
	}
	admin := r.admin(t)
	for i := 0; i < 150; i++ {
		if text, err := admin.Info(context.Background(), "server").Result(); err == nil && !strings.Contains(text, "run_id:"+old) {
			return
		}
		time.Sleep(200 * time.Millisecond)
	}
	t.Fatal("Valkey did not come back")
}

// realStoreCases are the shared store cases over the real Valkey: the store
// alone and with the local copy, on real time.
func realStoreCases(t *testing.T) []storeCase {
	t.Helper()
	r := needRealValkey(t)
	sleep := func(d time.Duration) { time.Sleep(d) }
	k1, p1 := r.account(t)
	valkey := newValkeyStore("unix", r.socket, "acct-"+k1, p1, k1)
	t.Cleanup(valkey.close)
	k2, p2 := r.account(t)
	fallback := newFallbackStore(newValkeyStore("unix", r.socket, "acct-"+k2, p2, k2), &memoryStore{})
	t.Cleanup(fallback.close)
	return []storeCase{
		{"real-valkey", valkey, sleep, func() {}},
		{"real-fallback", fallback, sleep, fallback.flush},
	}
}

// The Worker's store over the socket, as runtime.go makes it (StateStore):
// what one process wrote, the next one (a Worker restart) reads; the keys
// are under the account's prefix with the lifetime they were written with;
// the user cannot reach another account's keys.
func TestRealValkeyWorkerStore(t *testing.T) {
	r := needRealValkey(t)
	ctx := context.Background()
	key, pw := r.account(t)
	other, otherPW := r.account(t)
	cfg := StateStore{Socket: r.socket, User: "acct-" + key, Password: pw}
	day := 86400 * time.Second

	first := newSessionStore(cfg)
	_, isFallback := first.(*fallbackStore)
	require.True(t, isFallback, "configured: the shared store with a local copy")
	require.NoError(t, first.saveThread(ctx, "sess-1", mainThread, testEntry("req_1", time.Now()), day))
	require.NoError(t, first.mergeTools(ctx, "sess-1", []string{"Bash", "mcp__db__query"}, day))
	first.(*fallbackStore).flush()
	first.close()

	second := newSessionStore(cfg)
	defer second.close()
	entry, err := second.loadThread(ctx, "sess-1", mainThread, day)
	require.NoError(t, err)
	require.NotNil(t, entry, "the next Worker process reads it")
	require.Equal(t, "req_1", entry.state.RequestID)
	tools, err := second.loadTools(ctx, "sess-1", day)
	require.NoError(t, err)
	require.Equal(t, []string{"Bash", "mcp__db__query"}, tools)

	// The keys and their lifetimes, seen as the account user.
	c := r.client("acct-"+key, pw)
	defer c.Close()
	threadKey := "ccg:" + key + ":s:" + storeDigest("sess-1") + ":t:" + storeDigest(mainThread)
	toolsKey := "ccg:" + key + ":s:" + storeDigest("sess-1") + ":tools"
	for _, k := range []string{threadKey, toolsKey} {
		ttl, err := c.TTL(ctx, k).Result()
		require.NoError(t, err, k)
		require.Greater(t, ttl, day-time.Minute, k)
		require.LessOrEqual(t, ttl, day, k)
	}
	raw, err := c.Get(ctx, toolsKey).Result()
	require.NoError(t, err)
	require.Equal(t, `["Bash","mcp__db__query"]`, raw)
	// Another account's keys are out of reach, whatever the client.
	o := r.client("acct-"+other, otherPW)
	defer o.Close()
	for _, err := range []error{
		o.Get(ctx, toolsKey).Err(), o.Set(ctx, toolsKey, "[]", 0).Err(), o.Del(ctx, threadKey).Err(),
		o.Eval(ctx, "return redis.call('GET', KEYS[1])", []string{toolsKey}).Err(),
		o.Keys(ctx, "*").Err(), o.Scan(ctx, 0, "", 10).Err(), o.FlushAll(ctx).Err(),
	} {
		require.Error(t, err)
		require.Contains(t, err.Error(), "NOPERM")
	}
	// A wrong password: the store reports it and the Worker keeps process
	// memory for the request.
	bad := newValkeyStoreWith("unix", r.socket, "acct-"+key, otherPW, key, time.Second)
	defer bad.close()
	_, err = bad.loadTools(ctx, "sess-1", day)
	require.Error(t, err)
	require.Contains(t, err.Error(), "WRONGPASS")
}

// A Valkey restart loses the data and the users; once the controller has
// set the user again, the merge script is loaded again (EVALSHA answers
// NOSCRIPT, then EVAL) and a new set starts.
func TestRealValkeyStoreAfterRestart(t *testing.T) {
	r := needRealValkey(t)
	ctx := context.Background()
	key, pw := r.account(t)
	s := newValkeyStoreWith("unix", r.socket, "acct-"+key, pw, key, time.Second)
	defer s.close()
	day := 86400 * time.Second
	require.NoError(t, s.mergeTools(ctx, "sess-r", []string{"Bash"}, day))
	admin := r.admin(t)
	r.restart(t, r.runID(t, admin), false)
	// Until the user is back the store fails (the Worker uses its memory).
	_, err := s.loadTools(ctx, "sess-r", day)
	require.Error(t, err)
	require.NoError(t, admin.Do(ctx, accountRules(key, pw, true)...).Err())
	tools, err := s.loadTools(ctx, "sess-r", day)
	require.NoError(t, err)
	require.Nil(t, tools, "nothing kept across the restart")
	require.NoError(t, s.mergeTools(ctx, "sess-r", []string{"Read"}, day))
	tools, err = s.loadTools(ctx, "sess-r", day)
	require.NoError(t, err)
	require.Equal(t, []string{"Read"}, tools)
}

// Valkey stopped: no request waits for it or fails; after breakerFailures
// failures the breaker opens and the local copy answers alone; Valkey back
// and the breaker's time over, the shared store is used again and gets what
// was merged meanwhile.
func TestRealValkeyStoreDown(t *testing.T) {
	r := needRealValkey(t)
	ctx := context.Background()
	key, pw := r.account(t)
	clock := newTestClock()
	s := newFallbackStore(newValkeyStore("unix", r.socket, "acct-"+key, pw, key), &memoryStore{})
	s.breaker.now = clock.Now
	defer s.close()
	day := 86400 * time.Second
	require.NoError(t, s.mergeTools(ctx, "sess-d", []string{"Bash"}, day))
	s.flush()
	admin := r.admin(t)
	old := r.runID(t, admin)

	r.stop(t, true)
	stopped := true
	defer func() {
		if stopped {
			os.Remove(r.pause)
		}
	}()
	for i := 0; i < 2*breakerFailures; i++ {
		started := time.Now()
		session := "sess-down-" + strconv.Itoa(i)
		tools, _ := s.loadTools(ctx, session, day)
		require.Nil(t, tools)
		entry, _ := s.loadThread(ctx, session, mainThread, day)
		require.Nil(t, entry)
		require.NoError(t, s.mergeTools(ctx, session, []string{"Grep"}, day))
		require.Less(t, time.Since(started), 500*time.Millisecond, "a request never waits for a stopped Valkey")
	}
	require.False(t, s.breaker.allow(), "the breaker opened")
	// The local copy still answers.
	tools, err := s.loadTools(ctx, "sess-d", day)
	require.NoError(t, err)
	require.Equal(t, []string{"Bash"}, tools)
	require.NoError(t, s.mergeTools(ctx, "sess-d", []string{"Edit"}, day))
	tools, _ = s.loadTools(ctx, "sess-d", day)
	require.Equal(t, []string{"Bash", "Edit"}, tools)

	r.restart(t, old, true)
	stopped = false
	require.NoError(t, admin.Do(ctx, accountRules(key, pw, true)...).Err())
	clock.Add(breakerOpen + time.Second)
	require.True(t, s.breaker.allow())
	// A session first seen while it was down: merged into the shared store.
	require.NoError(t, s.mergeTools(ctx, "sess-new", []string{"Write"}, day))
	s.flush()
	c := r.client("acct-"+key, pw)
	defer c.Close()
	raw, err := c.Get(ctx, "ccg:"+key+":s:"+storeDigest("sess-new")+":tools").Result()
	require.NoError(t, err)
	require.Equal(t, `["Write"]`, raw)
}
