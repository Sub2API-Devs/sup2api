package engine

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/stretchr/testify/require"
)

const (
	upstreamTestSession = "upstream-session-1"
	upstreamTestClient  = "client-session-1"
)

// upstreamCapturePeer is the fake CLI's side of request_capture_v1: it records
// its arguments (CCG_TEST_REQUEST_ARGS), fails before sending when asked
// (CCG_TEST_SENT_INPUT_ERROR), and writes <prefix>.json and, with
// --capture-body, <prefix>.body for the body it "sent": its stdin, or
// CCG_TEST_SENT_BODY. CCG_TEST_SENT_SKIP is a CLI that wrote nothing.
func upstreamCapturePeer(raw []byte) {
	if target := os.Getenv("CCG_TEST_REQUEST_ARGS"); target != "" {
		data, _ := json.Marshal(os.Args[1:])
		_ = os.WriteFile(target, data, 0600)
	}
	if os.Getenv("CCG_TEST_SENT_INPUT_ERROR") == "1" {
		_, _ = io.WriteString(os.Stderr, requestErrorPrefix+`{"protocol":"ccgateway.request.error.v1","source":"input","status":400,"error":{"type":"invalid_request_error","code":"fixture_input","message":"fixture"}}`+"\n")
		os.Exit(1)
	}
	prefix := ""
	for i, arg := range os.Args {
		if arg == "--capture-request" && i+1 < len(os.Args) {
			prefix = os.Args[i+1]
		}
	}
	if prefix == "" || os.Getenv("CCG_TEST_SENT_SKIP") == "1" {
		return
	}
	body := raw
	if sent := os.Getenv("CCG_TEST_SENT_BODY"); sent != "" {
		body = []byte(sent)
	}
	// CC's transport pads a large first-party body (CCG_TEST_SENT_PAD).
	if os.Getenv("CCG_TEST_SENT_PAD") == "1" {
		body = append(append([]byte(nil), body...), "\n \t  "...)
	}
	sum := sha256.Sum256(body)
	_, content := bodyDigests(body)
	facts, _ := json.MarshalIndent(struct {
		Schema        int               `json:"schema"`
		Mode          string            `json:"mode"`
		Attempts      int               `json:"attempts"`
		SentAt        string            `json:"sent_at"`
		Method        string            `json:"method"`
		URL           string            `json:"url"`
		Headers       map[string]string `json:"headers"`
		BodyEncoding  string            `json:"body_encoding"`
		BodyBytes     int               `json:"body_bytes"`
		BodySHA256    string            `json:"body_sha256"`
		ContentSHA256 string            `json:"content_sha256"`
		Model         string            `json:"model"`
		Stream        bool              `json:"stream"`
	}{1, "direct", 2, time.Now().UTC().Format(time.RFC3339Nano), "POST", "https://api.anthropic.com/v1/messages?beta=true",
		map[string]string{"anthropic-beta": "beta-one, beta-two", "authorization": "[REDACTED]", "x-claude-code-request-class": "main_thread",
			"x-claude-code-session-id": upstreamTestSession}, "identity", len(body), hex.EncodeToString(sum[:]), content, "fixture-upstream", true}, "", "  ")
	_ = os.WriteFile(prefix+".json", facts, 0600)
	if slices.Contains(os.Args, "--capture-body") {
		_ = os.WriteFile(prefix+".body", body, 0600)
	}
}

// upstreamGateway is a direct Worker whose fake CLI captures its request when
// capture says the CLI has request_capture_v1; env adds to the CLI's.
func upstreamGateway(t *testing.T, store *requestLogStore, capture bool, env map[string]string) (*Gateway, string) {
	t.Helper()
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	root := t.TempDir()
	capabilities := []string{"request_direct"}
	if capture {
		capabilities = append(capabilities, features.RequestCaptureCapability)
	}
	args := filepath.Join(root, "args.json")
	base := map[string]string{"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": filepath.Join(root, "input.jsonl"), "CCG_TEST_REQUEST_ARGS": args}
	for key, value := range env {
		base[key] = value
	}
	g := &Gateway{RequestMode: "direct", Key: "fixture", Slots: make(chan struct{}, 1), Timeout: 10 * time.Second, RequestLogs: store,
		CLIInfo: cliRequestInfo{Version: "2.1.304", Capabilities: capabilities},
		Runner:  &Runner{CLI: exe, Version: "2.1.304", Work: root, Env: envWith(os.Environ(), base)}}
	return g, args
}

// upstreamPost sends one request and returns the answer and its log directory
// ("" when none was written).
func upstreamPost(t *testing.T, g *Gateway, body string, headers map[string]string) (*httptest.ResponseRecorder, string) {
	t.Helper()
	before := map[string]bool{}
	if entries, err := os.ReadDir(g.RequestLogs.root); err == nil {
		for _, e := range entries {
			before[e.Name()] = true
		}
	}
	request := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(body))
	request.Header.Set("x-api-key", "fixture")
	for name, value := range headers {
		request.Header.Set(name, value)
	}
	response := httptest.NewRecorder()
	g.ServeHTTP(response, request)
	g.RequestLogs.flush()
	if paths, _ := filepath.Glob(filepath.Join(g.Runner.Work, "request-*")); len(paths) != 0 {
		t.Fatal("temporary request directories leaked", paths)
	}
	entries, _ := os.ReadDir(g.RequestLogs.root)
	for _, e := range entries {
		if e.IsDir() && !before[e.Name()] {
			return response, filepath.Join(g.RequestLogs.root, e.Name())
		}
	}
	return response, ""
}

func upstreamMetadata(t *testing.T, dir string) Object {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join(dir, "metadata.json"))
	require.NoError(t, err)
	var m Object
	require.NoError(t, json.Unmarshal(raw, &m))
	return m
}

func storeAt(t *testing.T, level string) *requestLogStore {
	t.Helper()
	switch level {
	case logLevelFull:
		return fullLogStore(t, t.TempDir())
	case logLevelOff:
		store, err := openTestLogStore(t, t.TempDir())
		require.NoError(t, err)
		code, _ := putLogs(t, store, `{"level":"off"}`)
		require.Equal(t, 200, code)
		return store
	}
	return summaryLogStore(t, t.TempDir())
}

const upstreamTestBody = `{"model":"fixture","messages":[{"role":"user","content":"hello"}],"metadata":{"user_id":"{\"device_id\":\"d\",\"session_id\":\"` + upstreamTestClient + `\"}"}}`

// The CLI is asked to capture only when it can and the request is logged, and
// for the body only at the full level of a request whose content is kept raw;
// what it wrote lands in the log by the same rules.
func TestUpstreamCaptureArgumentsAndFilesFollowLevel(t *testing.T) {
	for _, capability := range []bool{false, true} {
		for _, level := range []string{logLevelOff, logLevelSummary, logLevelFull} {
			for _, secret := range []bool{false, true} {
				name := map[bool]string{false: "old-cli", true: "capture-cli"}[capability] + "/" + level + map[bool]string{false: "", true: "/secret"}[secret]
				t.Run(name, func(t *testing.T) {
					g, argsFile := upstreamGateway(t, storeAt(t, level), capability, nil)
					body := upstreamTestBody
					if secret {
						body = `{"model":"fixture","messages":[{"role":"user","content":"hello"}],"authorization_token":"tok-secret-value"}`
					}
					response, dir := upstreamPost(t, g, body, nil)
					require.Equal(t, 200, response.Code, response.Body.String())
					raw, err := os.ReadFile(argsFile)
					require.NoError(t, err)
					var args []string
					require.NoError(t, json.Unmarshal(raw, &args))
					wantRequest := capability && level != logLevelOff
					wantBody := wantRequest && level == logLevelFull && !secret
					require.Equal(t, wantRequest, slices.Contains(args, "--capture-request"), args)
					require.Equal(t, wantBody, slices.Contains(args, "--capture-body"), args)
					if wantRequest {
						i := slices.Index(args, "--capture-request")
						require.Equal(t, "sent", filepath.Base(args[i+1]))
						require.True(t, strings.HasPrefix(filepath.Base(filepath.Dir(args[i+1])), "request-"), args[i+1])
					}
					if level == logLevelOff {
						require.Empty(t, dir)
						return
					}
					require.NotEmpty(t, dir)
					facts, factsErr := os.ReadFile(filepath.Join(dir, upstreamRequestFile))
					sentBody, bodyErr := os.ReadFile(filepath.Join(dir, upstreamBodyFile))
					metadata := upstreamMetadata(t, dir)
					require.Equal(t, wantRequest, factsErr == nil, factsErr)
					require.Equal(t, wantRequest, metadata["upstream_captured"])
					require.Equal(t, wantBody, bodyErr == nil, bodyErr)
					if wantBody {
						require.Equal(t, body, string(sentBody), "the sent body is kept byte for byte")
					}
					if wantRequest {
						require.Contains(t, string(facts), upstreamTestSession)
						require.NotContains(t, string(facts), "tok-secret-value")
					}
					require.Equal(t, "direct", metadata["mode"])
				})
			}
		}
	}
}

// The metadata carries the searchable facts: the mode, both sessions, both
// digests and whether the body changed.
func TestUpstreamCaptureMetadataFields(t *testing.T) {
	store := storeAt(t, logLevelSummary)
	g, _ := upstreamGateway(t, store, true, nil)
	response, dir := upstreamPost(t, g, upstreamTestBody, nil)
	require.Equal(t, 200, response.Code, response.Body.String())
	m := upstreamMetadata(t, dir)
	sum := sha256.Sum256([]byte(upstreamTestBody))
	digest := hex.EncodeToString(sum[:])
	require.Equal(t, "direct", m["mode"])
	require.Equal(t, upstreamTestClient, m["client_session_id"])
	require.Equal(t, true, m["upstream_captured"])
	require.Equal(t, float64(2), m["upstream_attempts"])
	require.Equal(t, "fixture-upstream", m["upstream_model"])
	require.Equal(t, true, m["upstream_stream"])
	require.Equal(t, float64(len(upstreamTestBody)), m["upstream_body_bytes"])
	require.Equal(t, digest, m["upstream_body_sha256"])
	require.Equal(t, digest, m["body_sha256"])
	require.Equal(t, false, m["body_changed"])
	require.Equal(t, upstreamTestSession, m["upstream_session_id"])
	require.Equal(t, "main_thread", m["upstream_request_class"])
	require.Equal(t, []any{"beta-one", "beta-two"}, m["upstream_betas"])
	_, err := os.Stat(filepath.Join(dir, upstreamBodyFile))
	require.True(t, os.IsNotExist(err), "the summary keeps no sent body")

	// A changed body, and a session only in the header.
	g, _ = upstreamGateway(t, store, true, map[string]string{"CCG_TEST_SENT_BODY": `{"model":"other"}`})
	response, dir = upstreamPost(t, g, `{"model":"fixture","messages":[{"role":"user","content":"hello"}]}`, map[string]string{"X-Claude-Code-Session-Id": "header-session"})
	require.Equal(t, 200, response.Code, response.Body.String())
	m = upstreamMetadata(t, dir)
	require.Equal(t, true, m["body_changed"])
	require.Equal(t, "header-session", m["client_session_id"])

	// The padding CC's transport adds after a body is not a change: the
	// content digests agree while the sent bytes differ.
	g, _ = upstreamGateway(t, store, true, map[string]string{"CCG_TEST_SENT_PAD": "1"})
	response, dir = upstreamPost(t, g, upstreamTestBody+"\n", nil)
	require.Equal(t, 200, response.Code, response.Body.String())
	m = upstreamMetadata(t, dir)
	require.Equal(t, false, m["body_changed"])
	require.Equal(t, digest, m["upstream_content_sha256"])
	require.NotEqual(t, m["body_sha256"], m["upstream_body_sha256"])

	// A session of another shape is left out; a CLI without the capability
	// still logs the mode and that nothing was captured.
	g, _ = upstreamGateway(t, store, false, nil)
	response, dir = upstreamPost(t, g, `{"model":"fixture","messages":[{"role":"user","content":"hello"}]}`, map[string]string{"X-Claude-Code-Session-Id": "not a session"})
	require.Equal(t, 200, response.Code, response.Body.String())
	m = upstreamMetadata(t, dir)
	require.NotContains(t, m, "client_session_id")
	require.Equal(t, false, m["upstream_captured"])
	require.NotContains(t, m, "body_changed")
	require.NotContains(t, m, "upstream_body_sha256")
	require.Equal(t, "direct", m["mode"])
}

// A CLI that sent its request and wrote no capture is reported; one that
// failed before sending had nothing to capture.
func TestUpstreamCaptureMissingOnlyAfterSending(t *testing.T) {
	events := func(dir string) string {
		raw, _ := os.ReadFile(filepath.Join(dir, "events.jsonl"))
		return string(raw)
	}
	g, _ := upstreamGateway(t, storeAt(t, logLevelSummary), true, map[string]string{"CCG_TEST_SENT_SKIP": "1"})
	response, dir := upstreamPost(t, g, upstreamTestBody, nil)
	require.Equal(t, 200, response.Code, response.Body.String())
	require.Contains(t, events(dir), `"upstream_capture_missing"`)
	require.Contains(t, events(dir), `"reason":"absent"`)
	require.Equal(t, false, upstreamMetadata(t, dir)["upstream_captured"])

	g, _ = upstreamGateway(t, storeAt(t, logLevelSummary), true, map[string]string{"CCG_TEST_SENT_INPUT_ERROR": "1"})
	response, dir = upstreamPost(t, g, upstreamTestBody, nil)
	require.Equal(t, 400, response.Code, response.Body.String())
	require.NotContains(t, events(dir), "upstream_capture_missing")
	require.NotContains(t, upstreamMetadata(t, dir), "upstream_captured", "nothing was sent, so nothing was missed")
}

// The index lists the new fields and the query searches by them; an older
// log without them still lists and matches none of the new conditions.
func TestUpstreamCaptureQueryAndDetail(t *testing.T) {
	store := fullLogStore(t, t.TempDir())
	old := viewerRequest(t, store, "rid-old", 200)
	g, _ := upstreamGateway(t, store, true, nil)
	_, same := upstreamPost(t, g, upstreamTestBody, nil)
	g, _ = upstreamGateway(t, store, true, map[string]string{"CCG_TEST_SENT_BODY": `{"model":"other"}`})
	_, changed := upstreamPost(t, g, `{"model":"fixture","messages":[{"role":"user","content":"x"}]}`, nil)
	same, changed = filepath.Base(same), filepath.Base(changed)
	sum := sha256.Sum256([]byte(upstreamTestBody))
	digest := hex.EncodeToString(sum[:])
	sentSum := sha256.Sum256([]byte(`{"model":"other"}`))
	sentDigest := hex.EncodeToString(sentSum[:])

	ids := func(body string) []string {
		out := []string{}
		code, raw, _ := viewer(t, store, "query", body)
		require.Equal(t, 200, code, body+" "+string(raw))
		var list struct {
			Items []struct {
				ID string `json:"id"`
			} `json:"items"`
		}
		require.NoError(t, json.Unmarshal(raw, &list))
		for _, item := range list.Items {
			out = append(out, item.ID)
		}
		slices.Sort(out)
		return out
	}
	sorted := func(values ...string) []string { slices.Sort(values); return values }
	require.Equal(t, sorted(old, same, changed), ids(`{}`))
	require.Equal(t, sorted(same, changed), ids(`{"mode":"direct"}`))
	require.Empty(t, ids(`{"mode":"build"}`))
	require.Equal(t, []string{same}, ids(`{"session_id":"`+upstreamTestClient+`"}`), "the client's session")
	require.Equal(t, sorted(same, changed), ids(`{"session_id":"`+upstreamTestSession+`"}`), "the upstream session")
	require.Equal(t, []string{same}, ids(`{"sha256":"`+digest+`"}`))
	require.Equal(t, []string{changed}, ids(`{"sha256":"`+strings.ToUpper(sentDigest)+`"}`), "the sent body's digest, either case")
	require.Equal(t, []string{changed}, ids(`{"changed":true}`))
	require.Equal(t, []string{same}, ids(`{"changed":false}`), "a log that compared nothing matches neither")
	require.Equal(t, sorted(old, same, changed), ids(`{"changed":null}`))
	require.Equal(t, []string{old}, ids(`{"request_id":"rid-old"}`), "the earlier conditions still apply")
	require.Equal(t, []string{same}, ids(`{"status":"ok","mode":"direct","changed":false}`))
	for _, body := range []string{`{"mode":"relay"}`, `{"mode":1}`, `{"session_id":"a b"}`, `{"session_id":"` + strings.Repeat("s", 129) + `"}`,
		`{"sha256":"abc"}`, `{"sha256":"` + strings.Repeat("g", 64) + `"}`, `{"changed":"true"}`, `{"changed":1}`} {
		code, _, _ := viewer(t, store, "query", body)
		require.Equal(t, 400, code, body)
	}

	// The list item carries the fields back.
	code, raw, _ := viewer(t, store, "query", `{"changed":true}`)
	require.Equal(t, 200, code)
	var list struct {
		Items []map[string]any `json:"items"`
	}
	require.NoError(t, json.Unmarshal(raw, &list))
	item := list.Items[0]
	require.Equal(t, "direct", item["mode"])
	require.Equal(t, upstreamTestSession, item["upstream_session_id"])
	require.Equal(t, sentDigest, item["upstream_body_sha256"])
	require.Equal(t, true, item["body_changed"])
	require.Equal(t, true, item["upstream_captured"])
	require.NotEmpty(t, item["body_sha256"])

	// The detail returns the sent request as an object, with or without
	// content; its body is an upstream content file.
	for _, content := range []string{"false", "true"} {
		code, raw, _ = viewer(t, store, "detail", `{"id":"`+changed+`","content":`+content+`}`)
		require.Equal(t, 200, code, string(raw))
		var detail struct {
			Upstream map[string]any `json:"upstream_request"`
			Files    []Object       `json:"files"`
		}
		require.NoError(t, json.Unmarshal(raw, &detail))
		require.Equal(t, float64(1), detail.Upstream["schema"], content)
		require.Equal(t, sentDigest, detail.Upstream["body_sha256"])
		kinds := map[string]string{}
		for _, f := range detail.Files {
			kinds[f["name"].(string)] = f["kind"].(string)
		}
		require.Equal(t, "upstream", kinds[upstreamBodyFile])
		require.NotContains(t, kinds, upstreamRequestFile, "the facts are a summary file")
	}
	code, raw, _ = viewer(t, store, "detail", `{"id":"`+old+`"}`)
	require.Equal(t, 200, code)
	require.Contains(t, string(raw), `"upstream_request":null`)
	code, _, _ = viewer(t, store, "read", `{"id":"`+changed+`","name":"`+upstreamRequestFile+`"}`)
	require.Equal(t, 400, code, "summary files come with the detail")
	code, raw, _ = viewer(t, store, "read", `{"id":"`+changed+`","name":"`+upstreamBodyFile+`"}`)
	require.Equal(t, 200, code)
	require.Equal(t, `{"model":"other"}`, string(raw))
}

func TestRequestLogStateOffersViewerSearch(t *testing.T) {
	store, err := openTestLogStore(t, t.TempDir())
	require.NoError(t, err)
	w := httptest.NewRecorder()
	store.serve(w, httptest.NewRequest(http.MethodGet, "/admin/request-logs", nil))
	var state Object
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &state))
	require.Equal(t, true, state["viewer_search"])
	require.Equal(t, true, state["viewer"])
}

// A full log that clears its content while the CLI runs keeps no sent body.
func TestUpstreamCaptureBodyFollowsClearedContent(t *testing.T) {
	store := fullLogStore(t, t.TempDir())
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.store = store
	d.capture(w, r)
	request, body := d.upstreamCapture()
	require.True(t, request)
	require.True(t, body)
	prefix := filepath.Join(t.TempDir(), "sent")
	require.NoError(t, os.WriteFile(prefix+".json", []byte(`{"schema":1,"body_sha256":"`+strings.Repeat("a", 64)+`"}`), 0600))
	require.NoError(t, os.WriteFile(prefix+".body", []byte("sent"), 0600))
	code, _ := putLogs(t, store, `{"clear_full":true}`)
	require.Equal(t, 200, code)
	d.keepUpstreamRequest(prefix, true, func() bool { return true })
	d.finish()
	d.flushLogs()
	_, err := os.Stat(filepath.Join(d.directory, upstreamBodyFile))
	require.True(t, os.IsNotExist(err))
	_, err = os.Stat(filepath.Join(d.directory, upstreamRequestFile))
	require.NoError(t, err)
}
