package engine

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/alicebob/miniredis/v2"
	"github.com/stretchr/testify/require"
)

// memory is the process memory of a sessionStates without a shared store.
func (s *sessionStates) memory() *memoryStore { return s.backing().(*memoryStore) }

// testClock is a clock the tests move.
type testClock struct {
	mu  sync.Mutex
	now time.Time
}

func newTestClock() *testClock { return &testClock{now: time.Unix(1_800_000_000, 0)} }

func (c *testClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

func (c *testClock) Add(d time.Duration) {
	c.mu.Lock()
	c.now = c.now.Add(d)
	c.mu.Unlock()
}

// storeCase is one store implementation under the shared tests, with a way
// to move its time on (the process clock and Valkey's own).
type storeCase struct {
	name    string
	store   sessionStore
	advance func(time.Duration)
	flush   func()
}

func newMiniredis(t *testing.T) *miniredis.Miniredis {
	t.Helper()
	server := miniredis.RunT(t)
	return server
}

func testValkeyStore(t *testing.T, server *miniredis.Miniredis) *valkeyStore {
	t.Helper()
	s := newValkeyStoreWith("tcp", server.Addr(), "", "", "acct1", time.Second)
	t.Cleanup(s.close)
	return s
}

func storeCases(t *testing.T) []storeCase {
	t.Helper()
	memoryClock := newTestClock()
	memory := &memoryStore{now: memoryClock.Now}

	valkeyServer := newMiniredis(t)
	valkey := testValkeyStore(t, valkeyServer)

	fallbackServer := newMiniredis(t)
	fallbackClock := newTestClock()
	fallback := newFallbackStore(&slowStore{sessionStore: testValkeyStore(t, fallbackServer)}, &memoryStore{now: fallbackClock.Now})
	t.Cleanup(fallback.close)
	return append([]storeCase{
		{"memory", memory, memoryClock.Add, func() {}},
		{"valkey", valkey, valkeyServer.FastForward, func() {}},
		{"fallback", fallback, func(d time.Duration) {
			fallbackClock.Add(d)
			fallbackServer.FastForward(d)
		}, fallback.flush},
	}, realStoreCases(t)...)
}

func testEntry(requestID string, at time.Time) *sessionEntry {
	history := messageHistory{digests: [][32]byte{{1}, {2}}}.all()
	return &sessionEntry{
		state:   sessionState{Thread: mainThread, RequestID: requestID, Turn: &turnPosition{Prompt: 1, Turn: 3}, PromptHash: fixtureHash, MessageID: "msg_01", PromptID: "0d7e5f3a-1b2c-4d5e-8f90-123456789abc"},
		history: history,
		spawns:  []agentSpawn{{prompt: [32]byte{9}, agentType: "Explore"}, {prompt: [32]byte{8}}},
		at:      at.UTC().Truncate(time.Second),
	}
}

// Every store keeps the same things the same way.
func TestSessionStoresKeepThreadsAndTools(t *testing.T) {
	ctx := context.Background()
	for _, c := range storeCases(t) {
		t.Run(c.name, func(t *testing.T) {
			day := ttlSeconds(features.DefaultSessionMemoryTTL)
			entry, err := c.store.loadThread(ctx, "s1", mainThread, day)
			require.NoError(t, err)
			require.Nil(t, entry, "nothing remembered yet")
			tools, err := c.store.loadTools(ctx, "s1", day)
			require.NoError(t, err)
			require.Nil(t, tools)

			want := testEntry("req_1", time.Now())
			require.NoError(t, c.store.saveThread(ctx, "s1", mainThread, want, day))
			require.NoError(t, c.store.saveThread(ctx, "s1", "agent-1", testEntry("req_sub", time.Now()), day))
			c.flush()
			got, err := c.store.loadThread(ctx, "s1", mainThread, day)
			require.NoError(t, err)
			require.NotNil(t, got)
			require.Equal(t, want.state, got.state)
			require.Equal(t, want.history, got.history)
			require.Equal(t, want.spawns, got.spawns)
			require.True(t, want.at.Equal(got.at))
			got.state.Turn.Turn = 99
			again, _ := c.store.loadThread(ctx, "s1", mainThread, day)
			require.Equal(t, 3, again.state.Turn.Turn, "a copy")
			sub, _ := c.store.loadThread(ctx, "s1", "agent-1", day)
			require.Equal(t, "req_sub", sub.state.RequestID)
			other, _ := c.store.loadThread(ctx, "s2", mainThread, day)
			require.Nil(t, other, "another session")

			// The set keeps first-use order, each name once.
			require.NoError(t, c.store.mergeTools(ctx, "s1", []string{"Bash", "mcp__db__query"}, day))
			require.NoError(t, c.store.mergeTools(ctx, "s1", []string{"Read", "Bash", "srv:tool"}, day))
			require.NoError(t, c.store.mergeTools(ctx, "s1", nil, day))
			c.flush()
			tools, err = c.store.loadTools(ctx, "s1", day)
			require.NoError(t, err)
			require.Equal(t, []string{"Bash", "mcp__db__query", "Read", "srv:tool"}, tools)
			// An empty merge keeps an empty set (Lua writes it as {}).
			require.NoError(t, c.store.mergeTools(ctx, "s3", []string{}, day))
			c.flush()
			tools, err = c.store.loadTools(ctx, "s3", day)
			require.NoError(t, err)
			require.Equal(t, []string{}, tools)
			// At most toolsUsedMax names.
			many := make([]string, toolsUsedMax+10)
			for i := range many {
				many[i] = fmt.Sprintf("tool_%03d", i)
			}
			require.NoError(t, c.store.mergeTools(ctx, "s4", many, day))
			c.flush()
			tools, _ = c.store.loadTools(ctx, "s4", day)
			require.Len(t, tools, toolsUsedMax)
			require.Equal(t, many[:toolsUsedMax], tools)
		})
	}
}

// Each key lives for the lifetime it was written with: the thread's and the
// tools' expire on their own, a read of the tools renews them, and after
// that the next request finds nothing.
func TestSessionStoresExpireByTTL(t *testing.T) {
	ctx := context.Background()
	for _, c := range storeCases(t) {
		t.Run(c.name, func(t *testing.T) {
			threadTTL, toolsTTL := 2*time.Second, 5*time.Second
			require.NoError(t, c.store.saveThread(ctx, "s1", mainThread, testEntry("req_1", time.Now()), threadTTL))
			require.NoError(t, c.store.mergeTools(ctx, "s1", []string{"Bash"}, toolsTTL))
			c.flush()
			c.advance(time.Second)
			entry, _ := c.store.loadThread(ctx, "s1", mainThread, threadTTL)
			require.NotNil(t, entry)
			c.advance(1500 * time.Millisecond)
			entry, _ = c.store.loadThread(ctx, "s1", mainThread, threadTTL)
			require.Nil(t, entry, "the thread expired")
			tools, _ := c.store.loadTools(ctx, "s1", toolsTTL)
			require.Equal(t, []string{"Bash"}, tools, "the tools live on")
			// The read renewed the tools: 4 s after it they are still there.
			c.advance(4 * time.Second)
			tools, _ = c.store.loadTools(ctx, "s1", toolsTTL)
			require.Equal(t, []string{"Bash"}, tools)
			c.advance(6 * time.Second)
			tools, _ = c.store.loadTools(ctx, "s1", toolsTTL)
			require.Nil(t, tools, "the tools expired")
			// A merge after that starts a new set.
			require.NoError(t, c.store.mergeTools(ctx, "s1", []string{"Read"}, toolsTTL))
			c.flush()
			tools, _ = c.store.loadTools(ctx, "s1", toolsTTL)
			require.Equal(t, []string{"Read"}, tools)
		})
	}
}

func TestValkeyStoreKeysAndFormat(t *testing.T) {
	ctx := context.Background()
	server := newMiniredis(t)
	s := testValkeyStore(t, server)
	at := time.Date(2026, 11, 5, 3, 0, 0, 0, time.UTC)
	require.NoError(t, s.saveThread(ctx, "8d0f4b1e-0000-4000-8000-000000000001", "agent:x/*?", testEntry("req_1", at), 86400*time.Second))
	require.NoError(t, s.mergeTools(ctx, "8d0f4b1e-0000-4000-8000-000000000001", []string{"Bash"}, 86400*time.Second))
	keys := server.Keys()
	require.Len(t, keys, 2)
	prefix := "ccg:acct1:s:" + storeDigest("8d0f4b1e-0000-4000-8000-000000000001")
	require.ElementsMatch(t, []string{prefix + ":t:" + storeDigest("agent:x/*?"), prefix + ":tools"}, keys)
	for _, key := range keys {
		require.Regexp(t, `^ccg:acct1:s:[0-9a-f]{32}:(t:[0-9a-f]{32}|tools)$`, key)
		require.Equal(t, 86400*time.Second, server.TTL(key))
	}
	raw, _ := server.Get(prefix + ":t:" + storeDigest("agent:x/*?"))
	require.JSONEq(t, `{"v":1,"state":{"thread":"main","request_id":"req_1","turn_position":{"prompt_index":1,"turn_index":3},"prompt_hash":"`+fixtureHash+`","message_id":"msg_01","prompt_id":"0d7e5f3a-1b2c-4d5e-8f90-123456789abc"},
		"history":{"count":2,"digest":"`+fmt.Sprintf("%x", messageHistory{digests: [][32]byte{{1}, {2}}}.all().digest)+`"},
		"spawns":[{"prompt":"`+fmt.Sprintf("%x", [32]byte{9})+`","agent_type":"Explore"},{"prompt":"`+fmt.Sprintf("%x", [32]byte{8})+`"}],"at":"2026-11-05T03:00:00Z"}`, raw)
	tools, _ := server.Get(prefix + ":tools")
	require.Equal(t, `["Bash"]`, tools)

	// A value of another version, or one that does not read, is no memory.
	threadKey := s.threadKey("s9", mainThread)
	for _, value := range []string{strings.Replace(raw, `"v":1`, `"v":2`, 1), `{"v":1}`, `not json`, strings.Replace(raw, "req_1", "bad id", 1)} {
		require.NoError(t, server.Set(threadKey, value))
		entry, err := s.loadThread(ctx, "s9", mainThread, time.Hour)
		require.NoError(t, err)
		require.Nil(t, entry, value)
	}
	// A set Lua wrote empty ({}) is empty; a set with a bad name keeps the
	// stand-in for it.
	require.NoError(t, server.Set(s.toolsKey("s9"), `{}`))
	got, _ := s.loadTools(ctx, "s9", time.Hour)
	require.Equal(t, []string{}, got)
	require.NoError(t, server.Set(s.toolsKey("s9"), `["Bash","bad name"]`))
	got, _ = s.loadTools(ctx, "s9", time.Hour)
	require.Equal(t, []string{"Bash", features.ToolsUsedUnreadable}, got)
	// The read renews the set (GETEX … EX).
	server.SetTTL(s.toolsKey("s9"), time.Second)
	_, _ = s.loadTools(ctx, "s9", time.Hour)
	require.Equal(t, time.Hour, server.TTL(s.toolsKey("s9")))

	// A thread value past storeValueMax is not written.
	big := testEntry("req_big", at)
	big.state.Thread = strings.Repeat("t", storeValueMax)
	require.ErrorIs(t, s.saveThread(ctx, "s9", "big", big, time.Hour), errStoreValueTooLarge)
	require.False(t, server.Exists(s.threadKey("s9", "big")))
	// The set stays within storeValueMax however long its names.
	long := make([]string, 200)
	for i := range long {
		long[i] = fmt.Sprintf("%03d%s", i, strings.Repeat("x", 200))
	}
	require.NoError(t, s.mergeTools(ctx, "s10", long, time.Hour))
	stored, _ := server.Get(s.toolsKey("s10"))
	require.LessOrEqual(t, len(stored), storeValueMax)
	merged, _ := mergeToolNames(nil, long)
	require.Equal(t, len(merged), strings.Count(stored, `"`)/2, "the script and the Go merge cut at the same name")
}

// The script is run with EVALSHA, and again with EVAL once Valkey forgot it
// (a restart).
func TestValkeyStoreReloadsTheScript(t *testing.T) {
	ctx := context.Background()
	server := newMiniredis(t)
	s := testValkeyStore(t, server)
	require.NoError(t, s.mergeTools(ctx, "s1", []string{"Bash"}, time.Hour))
	require.NoError(t, s.client.ScriptFlush(ctx).Err())
	require.NoError(t, s.mergeTools(ctx, "s1", []string{"Read"}, time.Hour))
	tools, err := s.loadTools(ctx, "s1", time.Hour)
	require.NoError(t, err)
	require.Equal(t, []string{"Bash", "Read"}, tools)
}

// The account key comes from the ACL user acct-<key>; all three settings and
// the socket are needed.
func TestStateStoreConfigured(t *testing.T) {
	socket := t.TempDir() + "/valkey.sock"
	require.NoError(t, os.WriteFile(socket, nil, 0o600))
	key, ok := StateStore{Socket: socket, User: "acct-abc_1", Password: "p"}.configured()
	require.True(t, ok)
	require.Equal(t, "abc_1", key)
	for _, c := range []StateStore{
		{Socket: socket, User: "acct-abc"},
		{Socket: socket, Password: "p"},
		{User: "acct-abc", Password: "p"},
		{Socket: socket + ".missing", User: "acct-abc", Password: "p"},
		{Socket: socket, User: "abc", Password: "p"},
		{Socket: socket, User: "acct-a*b", Password: "p"},
		{Socket: socket, User: "acct-", Password: "p"},
	} {
		_, ok := c.configured()
		require.False(t, ok, c)
	}
	_, isMemory := newSessionStore(StateStore{}).(*memoryStore)
	require.True(t, isMemory)
	started := time.Now()
	shared := newSessionStore(StateStore{Socket: socket, User: "acct-abc", Password: "p"})
	defer shared.close()
	require.Less(t, time.Since(started), 500*time.Millisecond, "no name lookup of the socket path (go-redis endpoint detection)")
	fallback, ok := shared.(*fallbackStore)
	require.True(t, ok)
	require.Equal(t, "ccg:abc:", fallback.remote.(*valkeyStore).prefix)
}

// slowStore is a shared store that answers late or fails, as told.
type slowStore struct {
	sessionStore
	delay atomic.Int64 // nanoseconds
	fail  atomic.Bool
	calls atomic.Int64
}

func (s *slowStore) wait(ctx context.Context) error {
	s.calls.Add(1)
	if s.fail.Load() {
		return errors.New("connection refused")
	}
	if d := time.Duration(s.delay.Load()); d > 0 {
		select {
		case <-time.After(d):
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	return nil
}

func (s *slowStore) loadThread(ctx context.Context, session, thread string, ttl time.Duration) (*sessionEntry, error) {
	if err := s.wait(ctx); err != nil {
		return nil, err
	}
	return s.sessionStore.loadThread(ctx, session, thread, ttl)
}

func (s *slowStore) saveThread(ctx context.Context, session, thread string, e *sessionEntry, ttl time.Duration) error {
	if err := s.wait(ctx); err != nil {
		return err
	}
	return s.sessionStore.saveThread(ctx, session, thread, e, ttl)
}

func (s *slowStore) loadTools(ctx context.Context, session string, ttl time.Duration) ([]string, error) {
	if err := s.wait(ctx); err != nil {
		return nil, err
	}
	return s.sessionStore.loadTools(ctx, session, ttl)
}

func (s *slowStore) mergeTools(ctx context.Context, session string, names []string, ttl time.Duration) error {
	if err := s.wait(ctx); err != nil {
		return err
	}
	return s.sessionStore.mergeTools(ctx, session, names, ttl)
}

// A slow shared store (50 ms, past the 30 ms bound) never holds a request:
// its reads give up in time and the local copy answers; five failures in a
// row stop asking it for 30 s.
func TestFallbackStoreSlowAndFailingShared(t *testing.T) {
	ctx := context.Background()
	server := newMiniredis(t)
	remote := &slowStore{sessionStore: testValkeyStore(t, server)}
	clock := newTestClock()
	s := newFallbackStore(remote, &memoryStore{now: clock.Now})
	s.breaker.now = clock.Now
	defer s.close()
	states := &sessionStates{store: s, now: clock.Now}

	// What this Worker wrote is read back from the local copy, at once.
	require.NoError(t, s.saveThread(ctx, "s1", mainThread, testEntry("req_1", clock.Now()), time.Hour))
	require.NoError(t, s.mergeTools(ctx, "s1", []string{"Bash"}, time.Hour))
	s.flush()
	tools, err := s.loadTools(ctx, "s1", time.Hour)
	require.NoError(t, err)
	require.Equal(t, []string{"Bash"}, tools, "read once from the shared store")
	remote.delay.Store(int64(50 * time.Millisecond))
	started := time.Now()
	found := states.read(ctx, memoryRead{session: "s1", thread: mainThread, tools: true}, time.Hour, time.Hour)
	require.Less(t, time.Since(started), 20*time.Millisecond, "the local copy answers")
	require.Equal(t, "req_1", found.thread.state.RequestID)
	require.Equal(t, []string{"Bash"}, found.tools)

	// A session only the shared store has: its read gives up after 30 ms,
	// all reads together within 60 ms.
	other := testValkeyStore(t, server)
	require.NoError(t, other.saveThread(ctx, "s2", mainThread, testEntry("req_2", clock.Now()), time.Hour))
	require.NoError(t, other.mergeTools(ctx, "s2", []string{"Read"}, time.Hour))
	started = time.Now()
	found = states.read(ctx, memoryRead{session: "s2", thread: mainThread, parent: "agent-x", tools: true}, time.Hour, time.Hour)
	elapsed := time.Since(started)
	require.Nil(t, found.thread)
	require.Nil(t, found.tools)
	require.GreaterOrEqual(t, elapsed, storeOpTimeout-5*time.Millisecond)
	require.Less(t, elapsed, storeReadBudget+20*time.Millisecond, "never past the read budget")
	// The shared store answers in time again: it is read and kept locally.
	remote.delay.Store(0)
	found = states.read(ctx, memoryRead{session: "s2", thread: mainThread, tools: true}, time.Hour, time.Hour)
	require.Equal(t, "req_2", found.thread.state.RequestID)
	require.Equal(t, []string{"Read"}, found.tools)
	remote.delay.Store(int64(50 * time.Millisecond))
	found = states.read(ctx, memoryRead{session: "s2", thread: mainThread, tools: true}, time.Hour, time.Hour)
	require.Equal(t, "req_2", found.thread.state.RequestID, "the local copy")
	require.Equal(t, []string{"Read"}, found.tools)

	// Writes never wait for the shared store.
	started = time.Now()
	require.NoError(t, s.mergeTools(ctx, "s1", []string{"Edit"}, time.Hour))
	require.NoError(t, s.saveThread(ctx, "s1", mainThread, testEntry("req_3", clock.Now()), time.Hour))
	require.Less(t, time.Since(started), 10*time.Millisecond)
	s.flush()

	// Five failures in a row open the breaker: the store is not asked.
	remote.delay.Store(0)
	remote.fail.Store(true)
	s.breaker.success()
	for i := 0; i < breakerFailures; i++ {
		_, err := s.loadTools(ctx, fmt.Sprintf("x%d", i), time.Hour)
		require.Error(t, err)
	}
	calls := remote.calls.Load()
	_, err = s.loadTools(ctx, "x9", time.Hour)
	require.ErrorIs(t, err, errStoreUnavailable)
	_, err = s.loadThread(ctx, "x9", mainThread, time.Hour)
	require.ErrorIs(t, err, errStoreUnavailable)
	require.NoError(t, s.mergeTools(ctx, "x9", []string{"Bash"}, time.Hour))
	s.flush()
	require.Equal(t, calls, remote.calls.Load(), "not asked while open")
	tools, err = s.loadTools(ctx, "x9", time.Hour)
	require.NoError(t, err, "the local copy answers")
	require.Equal(t, []string{"Bash"}, tools)
	// After 30 s it is asked again; one success closes it.
	clock.Add(breakerOpen)
	remote.fail.Store(false)
	tools, err = s.loadTools(ctx, "x8", time.Hour)
	require.NoError(t, err)
	require.Nil(t, tools)
	require.Greater(t, remote.calls.Load(), calls)
	require.True(t, s.breaker.allow())
}

// A local set made while the shared store could not be read is joined with
// the shared set when it can be read again.
func TestFallbackStoreJoinsTheLocalAndSharedSets(t *testing.T) {
	ctx := context.Background()
	server := newMiniredis(t)
	remote := &slowStore{sessionStore: testValkeyStore(t, server)}
	s := newFallbackStore(remote, &memoryStore{})
	defer s.close()
	require.NoError(t, testValkeyStore(t, server).mergeTools(ctx, "s1", []string{"Bash", "Read"}, time.Hour))
	remote.fail.Store(true)
	require.NoError(t, s.mergeTools(ctx, "s1", []string{"Edit"}, time.Hour))
	s.flush()
	tools, _ := s.loadTools(ctx, "s1", time.Hour)
	require.Equal(t, []string{"Edit"}, tools, "only the local copy")
	remote.fail.Store(false)
	tools, _ = s.loadTools(ctx, "s1", time.Hour)
	require.Equal(t, []string{"Bash", "Read", "Edit"}, tools)
	s.flush()
	shared, _ := testValkeyStore(t, server).loadTools(ctx, "s1", time.Hour)
	require.Equal(t, []string{"Bash", "Read", "Edit"}, shared, "what the shared store missed is written once it is back")
}

// valkeyStore honours its deadline on a connection that answers late.
func TestValkeyStoreGivesUpOnASlowConnection(t *testing.T) {
	server := newMiniredis(t)
	proxy := delayProxy(t, server.Addr(), 50*time.Millisecond)
	s := newValkeyStore("tcp", proxy, "", "", "acct1")
	defer s.close()
	ctx, cancel := context.WithTimeout(context.Background(), storeOpTimeout)
	defer cancel()
	started := time.Now()
	_, err := s.loadTools(ctx, "s1", time.Hour)
	require.Error(t, err)
	require.Less(t, time.Since(started), 45*time.Millisecond)
}

// delayProxy forwards TCP to addr, each answer delay late.
func delayProxy(t *testing.T, addr string, delay time.Duration) string {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	t.Cleanup(func() { _ = listener.Close() })
	go func() {
		for {
			client, err := listener.Accept()
			if err != nil {
				return
			}
			upstream, err := net.Dial("tcp", addr)
			if err != nil {
				_ = client.Close()
				continue
			}
			go func() { _, _ = io.Copy(upstream, client); _ = upstream.Close() }()
			go func() {
				buf := make([]byte, 32<<10)
				for {
					n, err := upstream.Read(buf)
					if n > 0 {
						time.Sleep(delay)
						if _, werr := client.Write(buf[:n]); werr != nil {
							break
						}
					}
					if err != nil {
						break
					}
				}
				_ = client.Close()
			}()
		}
	}()
	return listener.Addr().String()
}

// The store reports each operation to the request's log (its events), and
// a failure there is no failure of the request.
func TestSessionStoreReportsToTheRequestLog(t *testing.T) {
	server := newMiniredis(t)
	remote := &slowStore{sessionStore: testValkeyStore(t, server)}
	s := newFallbackStore(remote, &memoryStore{})
	defer s.close()
	d := detachedDiagnostic(t)
	ctx := withStoreReport(context.Background(), d)
	tools, err := s.loadTools(ctx, "s1", time.Hour)
	require.NoError(t, err)
	require.Nil(t, tools)
	remote.fail.Store(true)
	_, err = s.loadTools(ctx, "s2", time.Hour)
	require.Error(t, err)
	directory := d.directory
	finishLog(d)
	raw, err := os.ReadFile(directory + "/events.jsonl")
	require.NoError(t, err)
	var events []map[string]any
	for _, line := range strings.Split(strings.TrimSpace(string(raw)), "\n") {
		var event map[string]any
		require.NoError(t, json.Unmarshal([]byte(line), &event))
		if event["event"] == "session_store" {
			events = append(events, event["detail"].(map[string]any))
		}
	}
	require.Len(t, events, 2)
	require.Equal(t, "valkey", events[0]["backend"])
	require.Equal(t, "load_tools", events[0]["op"])
	require.NotContains(t, events[0], "error")
	require.Equal(t, "connection refused", events[1]["error"])
	require.Contains(t, events[1], "ms")
}

// The store signs in as the account's ACL user (HELLO, else AUTH).
func TestValkeyStoreSignsInAsTheAccountUser(t *testing.T) {
	ctx := context.Background()
	server := newMiniredis(t)
	server.RequireUserAuth("acct-abc", "secret")
	s := newValkeyStoreWith("tcp", server.Addr(), "acct-abc", "secret", "abc", time.Second)
	defer s.close()
	require.NoError(t, s.mergeTools(ctx, "s1", []string{"Bash"}, time.Hour))
	tools, err := s.loadTools(ctx, "s1", time.Hour)
	require.NoError(t, err)
	require.Equal(t, []string{"Bash"}, tools)
	wrong := newValkeyStoreWith("tcp", server.Addr(), "acct-abc", "wrong", "abc", time.Second)
	defer wrong.close()
	_, err = wrong.loadTools(ctx, "s1", time.Hour)
	require.Error(t, err)
}

// A thread's answers go into the stored form and come back; a stored value
// without them (an earlier Worker's) has none, and a bad one is no memory.
func TestThreadRecordKeepsTheAnswers(t *testing.T) {
	entry := testEntry("req_1", time.Now())
	entry.answers = []answerRecord{{key: [32]byte{1}, requestID: "req_0", messageID: "msg_0"}, {key: [32]byte{2}, requestID: "req_1"}}
	raw, err := encodeThread(entry)
	require.NoError(t, err)
	require.Equal(t, entry.answers, decodeThread(raw).answers)
	var record map[string]any
	require.NoError(t, json.Unmarshal(raw, &record))
	delete(record, "answers")
	old, _ := json.Marshal(record)
	require.Nil(t, decodeThread(old).answers)
	record["answers"] = []any{map[string]any{"key": "zz", "request_id": "req_0"}}
	bad, _ := json.Marshal(record)
	require.Nil(t, decodeThread(bad))
}
