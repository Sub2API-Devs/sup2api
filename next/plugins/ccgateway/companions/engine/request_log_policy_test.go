package engine

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/stretchr/testify/require"
)

// Request log levels sent with the request (REQUEST-LOG-POLICY-DESIGN.md §3).

// policyStore is a store at the given local level, set as the core did
// before the levels came with the request.
func policyStore(t *testing.T, local string) (*requestLogStore, string) {
	t.Helper()
	root := t.TempDir()
	store, err := newRequestLogStore(root)
	require.NoError(t, err)
	body := `{"level":"` + local + `"}`
	if local == logLevelFull {
		body = `{"level":"full","full_for_hours":1}`
	}
	code, _ := putLogs(t, store, body)
	require.Equal(t, 200, code)
	return store, root
}

// policyRequest logs one request whose policy header is policy ("" for none)
// and returns its diagnostic once finished.
func policyRequest(t *testing.T, store *requestLogStore, policy string) *requestDiagnostic {
	t.Helper()
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	if policy != "" {
		r.Header.Set(features.PolicyHeader, policy)
	}
	d := newRequestDiagnostic(w, r)
	d.store = store
	out := d.capture(w, r)
	d.request(parseRequestBody([]byte(`{"model":"claude-test","messages":[{"role":"user","content":"`+privateMarker+`"}]}`)), r.Header)
	d.save("build-components.json", []byte(`{"system":"`+privateMarker+`"}`))
	_, _ = out.Write([]byte(privateMarker))
	d.finish()
	return d
}

func logDirectories(t *testing.T, store *requestLogStore) []string {
	t.Helper()
	entries, err := os.ReadDir(store.root)
	if os.IsNotExist(err) {
		return nil
	}
	require.NoError(t, err)
	var out []string
	for _, e := range entries {
		out = append(out, e.Name())
	}
	return out
}

func readMetadata(t *testing.T, dir string) Object {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join(dir, "metadata.json"))
	require.NoError(t, err)
	var m Object
	require.NoError(t, json.Unmarshal(raw, &m))
	return m
}

// Every policy level against every local level: the policy decides alone,
// without one the local level does; the local level is neither read for a
// policy request nor changed by one, and the viewer lists what was logged
// whatever the local level.
func TestRequestLogPolicyLevelMatrix(t *testing.T) {
	for _, local := range []string{logLevelOff, logLevelSummary, logLevelFull} {
		for _, policy := range []string{"", logLevelOff, logLevelSummary, logLevelFull} {
			t.Run("local="+local+"/policy="+policy, func(t *testing.T) {
				store, root := policyStore(t, local)
				stateBefore, err := os.ReadFile(filepath.Join(root, requestLogStateFile))
				require.NoError(t, err)
				header := ""
				if policy != "" {
					header = `{"relay_mode":"build","request_log":"` + policy + `"}`
				}
				d := policyRequest(t, store, header)

				effective, source := policy, logLevelFromPolicy
				if policy == "" {
					effective, source = local, logLevelFromLocal
				}
				dirs := logDirectories(t, store)
				list := listLogs(t, store, `{}`)
				if effective == logLevelOff {
					require.Empty(t, d.directory)
					require.Empty(t, dirs, "an off request created a log directory")
					require.Empty(t, list.Items)
				} else {
					require.Len(t, dirs, 1)
					dir := filepath.Join(store.root, dirs[0])
					m := readMetadata(t, dir)
					require.Equal(t, effective, m["log_level"])
					require.Equal(t, source, m["log_level_source"])
					require.Equal(t, effective == logLevelSummary, d.summaryOnly)
					for _, name := range []string{"request.body", "response.body", "build-components.json"} {
						_, err := os.Stat(filepath.Join(dir, name))
						require.Equal(t, effective == logLevelFull, err == nil, name)
					}
					require.Len(t, list.Items, 1, "the viewer must list a log whatever the local level")
					require.Equal(t, effective, list.Items[0].Level)
					code, _, _ := viewer(t, store, "detail", `{"id":"`+dirs[0]+`"}`)
					require.Equal(t, 200, code)
					if effective == logLevelFull {
						code, raw, _ := viewer(t, store, "read", `{"id":"`+dirs[0]+`","name":"request.body"}`)
						require.Equal(t, 200, code)
						require.Contains(t, string(raw), privateMarker)
					}
				}
				stateAfter, err := os.ReadFile(filepath.Join(root, requestLogStateFile))
				require.NoError(t, err)
				require.Equal(t, string(stateBefore), string(stateAfter), "a request changed the local level")
				store.mu.Lock()
				require.Equal(t, local, store.level)
				require.Equal(t, local != logLevelOff, store.enabled)
				store.mu.Unlock()
			})
		}
	}
}

// A policy's level is not the local full level's: an expired local full
// level is not touched by a request whose policy names its own.
func TestRequestLogPolicyLeavesExpiredLocalFullAlone(t *testing.T) {
	store, _ := policyStore(t, logLevelFull)
	store.mu.Lock()
	store.fullUntil = time.Now().Add(-time.Minute)
	store.mu.Unlock()
	d := policyRequest(t, store, `{"request_log":"full"}`)
	require.False(t, d.summaryOnly)
	store.mu.Lock()
	require.Equal(t, logLevelFull, store.level, "the local level was read for a policy request")
	store.mu.Unlock()
	d = policyRequest(t, store, "")
	require.True(t, d.summaryOnly, "an expired local full level logs the summary")
}

// Through the gateway: the level is read before the policy is admitted, an
// invalid policy is logged at the local level and refused with 400, and a
// policy that turns logging off leaves nothing even when it is refused.
func TestRequestLogPolicyThroughGateway(t *testing.T) {
	serve := func(store *requestLogStore, policy string) int {
		g := &Gateway{RequestMode: "build", Key: "gateway-key", CLIInfo: buildCLI, Runner: &Runner{}, RequestLogs: store, Slots: make(chan struct{}, 1)}
		r := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"m","messages":[]}`))
		r.Header.Set("x-api-key", "gateway-key")
		r.Header.Set(features.PolicyHeader, policy)
		out := httptest.NewRecorder()
		g.ServeHTTP(out, r)
		return out.Code
	}
	only := func(t *testing.T, store *requestLogStore) Object {
		t.Helper()
		dirs := logDirectories(t, store)
		require.Len(t, dirs, 1)
		return readMetadata(t, filepath.Join(store.root, dirs[0]))
	}

	t.Run("invalid request_log", func(t *testing.T) {
		store, _ := policyStore(t, logLevelSummary)
		require.Equal(t, 400, serve(store, `{"request_log":"verbose"}`))
		m := only(t, store)
		require.Equal(t, logLevelSummary, m["log_level"])
		require.Equal(t, logLevelFromLocal, m["log_level_source"])
		require.EqualValues(t, 400, m["status"])
	})
	t.Run("invalid policy naming a level", func(t *testing.T) {
		store, _ := policyStore(t, logLevelSummary)
		require.Equal(t, 400, serve(store, `{"relay_mode":"other","request_log":"full"}`))
		m := only(t, store)
		require.Equal(t, logLevelSummary, m["log_level"], "an invalid policy's level was followed")
		require.Equal(t, logLevelFromLocal, m["log_level_source"])
	})
	t.Run("invalid policy while local off", func(t *testing.T) {
		store, _ := policyStore(t, logLevelOff)
		require.Equal(t, 400, serve(store, `{"request_log":"verbose"}`))
		require.Empty(t, logDirectories(t, store))
	})
	t.Run("policy summary while local off", func(t *testing.T) {
		store, _ := policyStore(t, logLevelOff)
		// The CLI here lacks the request levels: refused after the log started.
		require.Equal(t, 409, serve(store, `{"relay_mode":"build","request_log":"summary"}`))
		m := only(t, store)
		require.Equal(t, logLevelSummary, m["log_level"])
		require.Equal(t, logLevelFromPolicy, m["log_level_source"])
		require.EqualValues(t, 409, m["status"])
	})
	t.Run("policy off while local full", func(t *testing.T) {
		store, _ := policyStore(t, logLevelFull)
		require.Equal(t, 409, serve(store, `{"relay_mode":"build","request_log":"off"}`))
		require.Empty(t, logDirectories(t, store))
	})
}

// Logs kept at a policy's level while the local level is off survive a
// restart and a prune, and the rebuilt index lists them.
func TestRequestLogPolicyLogsSurviveRestartAndPrune(t *testing.T) {
	store, root := policyStore(t, logLevelOff)
	d := policyRequest(t, store, `{"request_log":"summary"}`)
	id := filepath.Base(d.directory)
	store.prune()
	require.Len(t, listLogs(t, store, `{}`).Items, 1, "a fresh log was pruned")
	reloaded, err := newRequestLogStore(root)
	require.NoError(t, err)
	require.Equal(t, logLevelOff, reloaded.level)
	got := listLogs(t, reloaded, `{}`)
	require.Len(t, got.Items, 1, "a restart removed a log kept at the policy's level")
	require.Equal(t, id, got.Items[0].ID)
	reloaded.prune()
	require.Len(t, listLogs(t, reloaded, `{}`).Items, 1)
	// An old one is still pruned, and leaves the index.
	old := time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)
	require.NoError(t, os.Chtimes(filepath.Join(reloaded.root, id, "metadata.json"), old, old))
	reloaded.prune()
	require.Empty(t, listLogs(t, reloaded, `{}`).Items)
}

// An older Worker's off (its marker alone) removes the logs once and is saved
// as this Worker's level: a log written since is kept at the next start.
func TestRequestLogLegacyMarkerPurgesOnce(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(root, "request-logs", uuid()), 0700))
	require.NoError(t, os.WriteFile(filepath.Join(root, requestLogDisabledMarker), []byte("disabled"), 0600))
	store, err := newRequestLogStore(root)
	require.NoError(t, err)
	require.Empty(t, logDirectories(t, store))
	raw, err := os.ReadFile(filepath.Join(root, requestLogStateFile))
	require.NoError(t, err)
	require.Contains(t, string(raw), `"off"`)
	policyRequest(t, store, `{"request_log":"summary"}`)
	reloaded, err := newRequestLogStore(root)
	require.NoError(t, err)
	require.Len(t, logDirectories(t, reloaded), 1)
	require.Equal(t, logLevelOff, reloaded.level)
}

// The older core's off still removes every log at once, the policy's too.
func TestRequestLogLegacyOffRemovesPolicyLogs(t *testing.T) {
	for _, body := range []string{`{"level":"off"}`, `{"enabled":false}`} {
		store, _ := policyStore(t, logLevelSummary)
		policyRequest(t, store, `{"request_log":"full"}`)
		require.Len(t, logDirectories(t, store), 1)
		code, state := putLogs(t, store, body)
		require.Equal(t, 200, code)
		require.Equal(t, logLevelOff, state["level"])
		require.Empty(t, logDirectories(t, store), body)
		require.Empty(t, listLogs(t, store, `{}`).Items)
	}
}

// clear_all removes every log, summaries and content, ends the running
// requests' logs and keeps the level; logging goes on afterwards.
func TestRequestLogClearAll(t *testing.T) {
	store, root := policyStore(t, logLevelSummary)
	policyRequest(t, store, `{"request_log":"full"}`)
	policyRequest(t, store, "")
	require.Len(t, logDirectories(t, store), 2)
	stateBefore, _ := os.ReadFile(filepath.Join(root, requestLogStateFile))

	// A request running while the logs are cleared.
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	r.Header.Set(features.PolicyHeader, `{"request_log":"full"}`)
	running := newRequestDiagnostic(w, r)
	running.store = store
	out := running.capture(w, r)
	require.NotEmpty(t, running.directory)

	code, state := putLogs(t, store, `{"clear_all":true}`)
	require.Equal(t, 200, code)
	require.Equal(t, logLevelSummary, state["level"], "clear_all changed the level")
	require.Equal(t, true, state["clear_all"])
	stateAfter, _ := os.ReadFile(filepath.Join(root, requestLogStateFile))
	require.Equal(t, string(stateBefore), string(stateAfter))
	require.Empty(t, logDirectories(t, store))
	aside, _ := filepath.Glob(store.root + discardedSuffix + "*")
	require.Empty(t, aside, "cleared logs left aside")

	running.save("request.body", []byte(privateMarker))
	_, _ = out.Write([]byte("after"))
	running.finish()
	require.Equal(t, "after", w.Body.String(), "clearing interrupted the response")
	require.Empty(t, logDirectories(t, store), "a running request's log came back")
	require.Empty(t, listLogs(t, store, `{}`).Items)

	policyRequest(t, store, "")
	require.Len(t, listLogs(t, store, `{}`).Items, 1, "logging stopped after clear_all")

	for _, body := range []string{`{"clear_all":false}`, `{"clear_all":"yes"}`, `{"clear_all":true,"level":"off"}`, `{"clear_all":true,"clear_full":true}`} {
		code, _ := putLogs(t, store, body)
		require.Equal(t, 400, code, body)
	}
	require.Len(t, logDirectories(t, store), 1, "a refused PUT removed logs")
}

// The Worker reports that it follows the policy's level; the core does not
// require it.
func TestRequestLogPolicyCapabilityReported(t *testing.T) {
	g := &Gateway{RequestMode: "build", CLIInfo: cliRequestInfo{Capabilities: []string{"request_build"}}, Runner: &Runner{}, Slots: make(chan struct{}, 1)}
	require.Contains(t, g.requestCapabilities(), features.RequestLogPolicyCapability)
	w := httptest.NewRecorder()
	g.ServeHTTP(w, httptest.NewRequest("GET", "/healthz", nil))
	var health struct {
		Capabilities []string `json:"capabilities"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &health))
	require.Contains(t, health.Capabilities, features.RequestLogPolicyCapability)
	require.Equal(t, 1, strings.Count(strings.Join(health.Capabilities, ","), features.RequestLogPolicyCapability))
	doc := features.RequestRuntimeCatalog(health.Capabilities)
	found := false
	for _, f := range doc.Features {
		found = found || f.ID == "F-REQUEST-LOG-POLICY"
	}
	require.True(t, found, "the runtime catalog lacks the capability")
}
