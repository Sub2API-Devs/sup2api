package volcengine

// Tests of the asset library's upstream calls. The signature is the part
// that has to be right and cannot be eyeballed, so it is verified by
// RECOMPUTING it from the request the server received: the canonical request
// of volcengine V4 (github.com/volcengine/volc-sdk-golang/base sign.go) is
// rebuilt here from the wire, signed with the test secret key and compared
// byte for byte. A test that only asserted "an Authorization header is
// present" would pass with a signature over the wrong region, the wrong
// service or an empty body.

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"

	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"
)

const (
	testAK = "AKLTtest0000000000000000"
	testSK = "c2VjcmV0LWtleS1mb3ItdGVzdHMtb25seQ=="
)

// capturedRequest is what the fake Ark control plane saw.
type capturedRequest struct {
	Method string
	Path   string
	Query  url.Values
	Header http.Header
	Host   string
	Body   []byte
}

// fakeArk is an httptest server standing in for the Ark asset OpenAPI,
// reached only through the recording dialler.
type fakeArk struct {
	srv *httptest.Server

	mu       sync.Mutex
	requests []capturedRequest
	dialed   []string

	// reply is called for every request; nil means "empty Result".
	reply func(c capturedRequest) (status int, body string)
}

func newFakeArk(t *testing.T) *fakeArk {
	t.Helper()
	f := &fakeArk{}
	f.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		c := capturedRequest{
			Method: r.Method, Path: r.URL.Path, Query: r.URL.Query(),
			Header: r.Header.Clone(), Host: r.Host, Body: body,
		}
		f.mu.Lock()
		f.requests = append(f.requests, c)
		reply := f.reply
		f.mu.Unlock()
		status, payload := http.StatusOK, `{"ResponseMetadata":{"RequestId":"req-1"},"Result":{}}`
		if reply != nil {
			status, payload = reply(c)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = io.WriteString(w, payload)
	}))
	t.Cleanup(f.srv.Close)
	return f
}

// dialer records every address and then dials the fake server. In production
// this function is egress.DialContext, so "every upstream call goes through
// the dialler the plugin was given" is exactly what the recording proves.
func (f *fakeArk) dialer() DialFunc {
	return func(ctx context.Context, network, address string) (net.Conn, error) {
		f.mu.Lock()
		f.dialed = append(f.dialed, address)
		f.mu.Unlock()
		var d net.Dialer
		return d.DialContext(ctx, network, address)
	}
}

func (f *fakeArk) config() *AssetConfig {
	return &AssetConfig{
		AccountID: 7, Name: "ark-1", AccessKey: testAK, SecretKey: testSK,
		BaseURL: f.srv.URL, Region: DefaultAssetRegion,
	}
}

func (f *fakeArk) last(t *testing.T) capturedRequest {
	t.Helper()
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.requests) == 0 {
		t.Fatal("upstream received no request")
	}
	return f.requests[len(f.requests)-1]
}

// ---------------------------------------------------------------- signature

var authRe = regexp.MustCompile(`^HMAC-SHA256 Credential=([^/]+)/(\d{8})/([^/]+)/([^/]+)/request, SignedHeaders=([a-z0-9;.\-]+), Signature=([0-9a-f]{64})$`)

// verifySignature recomputes the volcengine V4 signature of c and returns the
// credential scope it was signed under.
func verifySignature(t *testing.T, c capturedRequest, ak, sk, region, service string) {
	t.Helper()
	auth := c.Header.Get("Authorization")
	m := authRe.FindStringSubmatch(auth)
	if m == nil {
		t.Fatalf("Authorization is not a volcengine V4 header: %q", auth)
	}
	gotAK, date, gotRegion, gotService, signedHeaders, signature := m[1], m[2], m[3], m[4], m[5], m[6]
	if gotAK != ak {
		t.Errorf("credential access key = %q, want %q", gotAK, ak)
	}
	if gotRegion != region {
		t.Errorf("credential scope region = %q, want %q", gotRegion, region)
	}
	if gotService != service {
		t.Errorf("credential scope service = %q, want %q", gotService, service)
	}
	xDate := c.Header.Get("X-Date")
	if _, err := time.Parse("20060102T150405Z", xDate); err != nil {
		t.Fatalf("X-Date = %q: %v", xDate, err)
	}
	if !strings.HasPrefix(xDate, date) {
		t.Errorf("credential scope date %q does not match X-Date %q", date, xDate)
	}
	// The body hash is both a header and the last line of the canonical
	// request: this is what binds the request body into the signature.
	payloadHash := sha256hex(c.Body)
	if got := c.Header.Get("X-Content-Sha256"); got != payloadHash {
		t.Fatalf("X-Content-Sha256 = %q, want the body hash %q", got, payloadHash)
	}

	headerValue := func(name string) string {
		switch name {
		case "host":
			return c.Host
		default:
			return strings.TrimSpace(c.Header.Get(name))
		}
	}
	names := strings.Split(signedHeaders, ";")
	if !sort.StringsAreSorted(names) {
		t.Errorf("SignedHeaders is not sorted: %q", signedHeaders)
	}
	for _, must := range []string{"host", "x-content-sha256", "x-date"} {
		if !contains(names, must) {
			t.Errorf("SignedHeaders %q does not cover %q", signedHeaders, must)
		}
	}
	var headersToSign strings.Builder
	for _, n := range names {
		headersToSign.WriteString(n + ":" + headerValue(n) + "\n")
	}
	query := strings.ReplaceAll(c.Query.Encode(), "+", "%20")
	canonical := strings.Join([]string{
		c.Method, c.Path, query, headersToSign.String(), signedHeaders, payloadHash,
	}, "\n")
	scope := strings.Join([]string{date, region, service, "request"}, "/")
	stringToSign := strings.Join([]string{"HMAC-SHA256", xDate, scope, sha256hex([]byte(canonical))}, "\n")

	key := hmacSHA256(hmacSHA256(hmacSHA256(hmacSHA256([]byte(sk), date), region), service), "request")
	want := hex.EncodeToString(hmacSHA256(key, stringToSign))
	if signature != want {
		t.Fatalf("signature = %s, recomputed %s\ncanonical request:\n%s", signature, want, canonical)
	}
}

func hmacSHA256(key []byte, content string) []byte {
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(content))
	return mac.Sum(nil)
}

func sha256hex(b []byte) string {
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}

func contains(ss []string, s string) bool {
	for _, v := range ss {
		if v == s {
			return true
		}
	}
	return false
}

// ---------------------------------------------------------------- tests

// TestSignedCallShape is the core signing test: one CreateAssetGroup goes out
// through the injected dialler, carries a volcengine V4 Authorization header
// whose signature recomputes exactly, and puts Action/Version in the query
// with the parameters in a JSON body.
func TestSignedCallShape(t *testing.T) {
	f := newFakeArk(t)
	f.reply = func(capturedRequest) (int, string) {
		return http.StatusOK, `{"ResponseMetadata":{"RequestId":"req-1"},"Result":{"Id":"g-123","Name":"shots"}}`
	}
	api := newArkAPI(f.dialer())
	defer api.close()

	result, callErr := api.call(context.Background(), f.config(), ActionCreateAssetGroup, map[string]any{
		"Name": "shots", "GroupType": "AIGC",
	})
	if callErr != nil {
		t.Fatalf("call: %v", callErr)
	}
	if g := groupFromResult(result); g.ID != "g-123" || g.Name != "shots" {
		t.Fatalf("result = %+v", g)
	}

	c := f.last(t)
	verifySignature(t, c, testAK, testSK, DefaultAssetRegion, AssetServiceName)

	if c.Method != http.MethodPost || c.Path != "/" {
		t.Errorf("request line = %s %s, want POST /", c.Method, c.Path)
	}
	if c.Query.Get("Action") != ActionCreateAssetGroup || c.Query.Get("Version") != AssetAPIVersion {
		t.Errorf("query = %v", c.Query)
	}
	if ct := c.Header.Get("Content-Type"); !strings.Contains(ct, "application/json") {
		t.Errorf("content-type = %q", ct)
	}
	var body map[string]any
	if err := json.Unmarshal(c.Body, &body); err != nil {
		t.Fatalf("body %q: %v", c.Body, err)
	}
	if body["Name"] != "shots" || body["GroupType"] != "AIGC" {
		t.Errorf("body = %v", body)
	}
	// Everything went through the dialler the plugin was handed - in
	// production the host egress tunnel.
	f.mu.Lock()
	dialed := append([]string(nil), f.dialed...)
	f.mu.Unlock()
	if len(dialed) == 0 {
		t.Fatal("the upstream call did not use the injected dialler")
	}
	wantHost := strings.TrimPrefix(f.srv.URL, "http://")
	for _, d := range dialed {
		if d != wantHost {
			t.Errorf("dialled %q, want %q", d, wantHost)
		}
	}
}

// TestSignatureBindsSecretRegionAndBody: the signature is not a constant. A
// different secret key, a different signing region and a different body each
// change it - which is what makes it a signature and not decoration.
func TestSignatureBindsSecretRegionAndBody(t *testing.T) {
	f := newFakeArk(t)
	api := newArkAPI(f.dialer())
	defer api.close()
	ctx := context.Background()

	sig := func() string {
		return authRe.FindStringSubmatch(f.last(t).Header.Get("Authorization"))[6]
	}

	base := f.config()
	if _, err := api.call(ctx, base, ActionListAssetGroups, map[string]any{"PageNumber": 1, "PageSize": 10}); err != nil {
		t.Fatalf("call: %v", err)
	}
	first := sig()
	verifySignature(t, f.last(t), testAK, testSK, DefaultAssetRegion, AssetServiceName)

	other := *base
	other.SecretKey = testSK + "x"
	if _, err := api.call(ctx, &other, ActionListAssetGroups, map[string]any{"PageNumber": 1, "PageSize": 10}); err != nil {
		t.Fatalf("call: %v", err)
	}
	if sig() == first {
		t.Error("the signature does not depend on the secret key")
	}

	region := *base
	region.Region = BytePlusAssetRegion
	if _, err := api.call(ctx, &region, ActionListAssetGroups, map[string]any{"PageNumber": 1, "PageSize": 10}); err != nil {
		t.Fatalf("call: %v", err)
	}
	verifySignature(t, f.last(t), testAK, testSK, BytePlusAssetRegion, AssetServiceName)
	if sig() == first {
		t.Error("the signature does not depend on the signing region")
	}

	if _, err := api.call(ctx, base, ActionListAssetGroups, map[string]any{"PageNumber": 2, "PageSize": 10}); err != nil {
		t.Fatalf("call: %v", err)
	}
	if sig() == first {
		t.Error("the signature does not cover the request body")
	}
	verifySignature(t, f.last(t), testAK, testSK, DefaultAssetRegion, AssetServiceName)
}

// TestEveryActionIsSigned walks all ten Actions: each one is accepted, sent
// with its own Action parameter and correctly signed.
func TestEveryActionIsSigned(t *testing.T) {
	f := newFakeArk(t)
	api := newArkAPI(f.dialer())
	defer api.close()
	if len(AssetActions) != 10 {
		t.Fatalf("AssetActions = %v, want ten (five per resource)", AssetActions)
	}
	for _, action := range AssetActions {
		if _, err := api.call(context.Background(), f.config(), action, map[string]any{"Id": "x-1"}); err != nil {
			t.Fatalf("%s: %v", action, err)
		}
		c := f.last(t)
		if c.Query.Get("Action") != action {
			t.Errorf("%s: query Action = %q", action, c.Query.Get("Action"))
		}
		verifySignature(t, c, testAK, testSK, DefaultAssetRegion, AssetServiceName)
	}
}

// TestUnknownActionNeverReachesUpstream: a route can never talk the plugin
// into signing an arbitrary control-plane call with an account's AK/SK.
func TestUnknownActionNeverReachesUpstream(t *testing.T) {
	f := newFakeArk(t)
	api := newArkAPI(f.dialer())
	defer api.close()
	_, err := api.call(context.Background(), f.config(), "DeleteEndpoint", map[string]any{})
	if err == nil || err.Code != "InvalidAction" {
		t.Fatalf("err = %v, want InvalidAction", err)
	}
	f.mu.Lock()
	n := len(f.requests)
	f.mu.Unlock()
	if n != 0 {
		t.Fatalf("upstream saw %d requests for an unknown action", n)
	}
}

// TestNoDialerNoCall: without an outbound dialler (no "net" grant, or Init
// never ran) the call fails loudly instead of falling back to a direct
// socket the sandbox would kill anyway.
func TestNoDialerNoCall(t *testing.T) {
	f := newFakeArk(t)
	api := newArkAPI(nil)
	_, err := api.call(context.Background(), f.config(), ActionListAssets, nil)
	if err == nil || err.Code != "EgressUnavailable" {
		t.Fatalf("err = %v, want EgressUnavailable", err)
	}
}

// TestUpstreamErrorClassification covers the three cases the routes branch
// on. Note the first one: volcengine reports a missing resource inside an
// HTTP 200 as well, so NotFound cannot be a status-code check alone.
func TestUpstreamErrorClassification(t *testing.T) {
	cases := []struct {
		name          string
		status        int
		body          string
		notFound      bool
		denied        bool
		throttled     bool
		wantCode      string
		wantSubstring string
	}{
		{
			name:     "not found inside a 200",
			status:   http.StatusOK,
			body:     `{"ResponseMetadata":{"RequestId":"r","Error":{"Code":"NotFound.AssetGroup","Message":"group not found"}}}`,
			notFound: true, wantCode: "NotFound.AssetGroup", wantSubstring: "group not found",
		},
		{
			name:     "404",
			status:   http.StatusNotFound,
			body:     `{"ResponseMetadata":{"RequestId":"r","Error":{"Code":"ResourceNotFound","Message":"gone"}}}`,
			notFound: true, wantCode: "ResourceNotFound",
		},
		{
			name:   "wrong signature",
			status: http.StatusForbidden,
			body:   `{"ResponseMetadata":{"RequestId":"r","Error":{"Code":"SignatureDoesNotMatch","Message":"bad signature"}}}`,
			denied: true, wantCode: "SignatureDoesNotMatch",
		},
		{
			name:      "throttled",
			status:    http.StatusTooManyRequests,
			body:      `{"ResponseMetadata":{"RequestId":"r","Error":{"Code":"FlowLimitExceeded","Message":"slow down"}}}`,
			throttled: true, wantCode: "FlowLimitExceeded",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			f := newFakeArk(t)
			f.reply = func(capturedRequest) (int, string) { return tc.status, tc.body }
			api := newArkAPI(f.dialer())
			defer api.close()
			_, err := api.call(context.Background(), f.config(), ActionGetAssetGroup, map[string]any{"Id": "g-1"})
			if err == nil {
				t.Fatal("want an error")
			}
			if err.Code != tc.wantCode {
				t.Errorf("code = %q, want %q", err.Code, tc.wantCode)
			}
			if tc.wantSubstring != "" && !strings.Contains(err.Message, tc.wantSubstring) {
				t.Errorf("message = %q, want it to contain %q", err.Message, tc.wantSubstring)
			}
			if err.NotFound() != tc.notFound {
				t.Errorf("NotFound() = %v, want %v (%+v)", err.NotFound(), tc.notFound, err)
			}
			if err.Denied() != tc.denied {
				t.Errorf("Denied() = %v, want %v (%+v)", err.Denied(), tc.denied, err)
			}
			if err.Throttled() != tc.throttled {
				t.Errorf("Throttled() = %v, want %v (%+v)", err.Throttled(), tc.throttled, err)
			}
			// The error text must not carry the secret key.
			if strings.Contains(err.Error(), testSK) {
				t.Fatal("the upstream error message leaks the secret key")
			}
		})
	}
}

// TestCanceledContextNeverDials: universal.DoCall takes no context, so the
// check has to happen before the call. A dead request must not reach
// upstream.
func TestCanceledContextNeverDials(t *testing.T) {
	f := newFakeArk(t)
	api := newArkAPI(f.dialer())
	defer api.close()
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := api.call(ctx, f.config(), ActionListAssets, nil); err == nil || err.Code != "Canceled" {
		t.Fatalf("err = %v, want Canceled", err)
	}
	f.mu.Lock()
	n := len(f.requests)
	f.mu.Unlock()
	if n != 0 {
		t.Fatalf("upstream saw %d requests for a cancelled context", n)
	}
}

// TestResultItemsAndTotal pins the tolerant reading of list results: the
// array key differs per resource upstream and TotalCount may be absent.
func TestResultItemsAndTotal(t *testing.T) {
	var result map[string]any
	dec := json.NewDecoder(strings.NewReader(
		`{"TotalCount":42,"Items":[{"Id":"a-1","Name":"one","Status":"Succeeded"},{"Id":"a-2"}]}`))
	dec.UseNumber()
	if err := dec.Decode(&result); err != nil {
		t.Fatal(err)
	}
	items := resultItems(result, "Assets")
	if len(items) != 2 {
		t.Fatalf("items = %v", items)
	}
	if a := assetFromResult(items[0]); a.ID != "a-1" || a.Name != "one" || a.Status != "Succeeded" {
		t.Fatalf("asset = %+v", a)
	}
	if got := totalOf(result, len(items)); got != 42 {
		t.Fatalf("total = %d, want 42", got)
	}
	if got := totalOf(map[string]any{}, 3); got != 3 {
		t.Fatalf("total without TotalCount = %d, want the item count 3", got)
	}
	if resultItems(map[string]any{"Items": "not an array"}) != nil {
		t.Error("a non-array Items must not be read as a list")
	}
}
