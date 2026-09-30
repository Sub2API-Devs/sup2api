package volcengine

// Cross-validation of signV4 against the implementation it replaced.
//
// GOLDEN VECTORS. The two requests below are not derived from the signing
// documentation: they are complete requests that the official
// github.com/volcengine/volcengine-go-sdk v1.2.54 really produced, captured
// on the commit that removed it (2026-09-30, Go 1.27) by recording what the
// fake control plane received. Every input that goes into the signature is
// frozen with them - the access key, the secret key, the region, the service,
// X-Date, the host, the query, the body and every header the SDK happened to
// send - so replaying them through signV4 compares this file's algorithm with
// the vendor's own, byte for byte.
//
// A note on the two extra headers. X-Sdk-Invocation-Id and X-Sdk-Request are
// the SDK's, and this plugin does not send them - but they were signed,
// because the rule is "every X- header joins the signature", not "a fixed
// list". Keeping them in the vectors is the only test of that rule, and it is
// a rule with teeth: a future header named X-Anything silently changes the
// signature, and one added to the wire but not to the signer is a 403.
//
// If a vector ever has to be regenerated, it has to come from the vendor SDK
// again. Recomputing it with signV4 would turn this test into a tautology.

import (
	"bytes"
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"
)

// goldenVector is one request the official SDK signed.
type goldenVector struct {
	name    string
	url     string
	body    string
	headers map[string]string
	// wantSignedHeaders and wantSignature are what the SDK put in
	// Authorization.
	wantSignedHeaders string
	wantSignature     string
	// wantPayloadHash is the X-Content-Sha256 the SDK sent, i.e. the body hash
	// the signature is bound to.
	wantPayloadHash string
}

var goldenVectors = []goldenVector{
	{
		name: "default port absent from the host",
		url:  "http://ark.cn-beijing.volcengineapi.com/?Action=CreateAssetGroup&Version=2024-01-01",
		body: `{"GroupType":"AIGC","Name":"shots"}`,
		headers: map[string]string{
			"Content-Type":        "application/json; charset=utf-8",
			"X-Date":              "20260930T075501Z",
			"X-Sdk-Invocation-Id": "8b0095c6-31d7-4191-98f4-7c4586d0dae8",
			"X-Sdk-Request":       "attempt=1; max=3",
			// Not signed, and here to prove it: neither is in the four named
			// headers nor under the X- prefix.
			"Accept":          "application/json",
			"Accept-Encoding": "gzip",
			"User-Agent":      "volcengine-go-sdk/1.2.54/(go1.27.0; windows; amd64)",
		},
		wantSignedHeaders: "content-type;host;x-content-sha256;x-date;x-sdk-invocation-id;x-sdk-request",
		wantSignature:     "527a9b6e7c3d67251854be7a9504a5f5397d20e863681b89bdcc0d149a4dcc5f",
		wantPayloadHash:   "5a531d8978c642c1dbdc5d3d05b03c4163e5451b34c0d3594d6dd0a53496ebed",
	},
	{
		// The same call to a host spelling out port 80. The port is signed
		// away, which is the detail a from-the-docs reimplementation misses.
		name: "explicit default port",
		url:  "http://ark.cn-beijing.volcengineapi.com:80/?Action=CreateAssetGroup&Version=2024-01-01",
		body: `{"GroupType":"AIGC","Name":"shots"}`,
		headers: map[string]string{
			"Content-Type":        "application/json; charset=utf-8",
			"X-Date":              "20260930T075501Z",
			"X-Sdk-Invocation-Id": "e4f52642-6abf-4138-b652-cf6e4e5b3b6e",
			"X-Sdk-Request":       "attempt=1; max=3",
			"Accept":              "application/json",
			"Accept-Encoding":     "gzip",
			"User-Agent":          "volcengine-go-sdk/1.2.54/(go1.27.0; windows; amd64)",
		},
		wantSignedHeaders: "content-type;host;x-content-sha256;x-date;x-sdk-invocation-id;x-sdk-request",
		wantSignature:     "3d61934c796740a7e2c1dd9f70107ae16421704b2302615b7e7e9381bd036f15",
		wantPayloadHash:   "5a531d8978c642c1dbdc5d3d05b03c4163e5451b34c0d3594d6dd0a53496ebed",
	},
}

// signGolden runs one vector through signV4 and returns the request.
func signGolden(t *testing.T, v goldenVector, ak, sk, region, service string) *http.Request {
	t.Helper()
	payload := []byte(v.body)
	req, err := http.NewRequest(http.MethodPost, v.url, bytes.NewReader(payload))
	if err != nil {
		t.Fatal(err)
	}
	for k, val := range v.headers {
		req.Header.Set(k, val)
	}
	// The clock is unused here: every vector fixes X-Date, and signV4 must not
	// overwrite one the caller set. A time far from the vector's date is what
	// proves it does not.
	signV4(req, payload, ak, sk, region, service, time.Date(2001, 2, 3, 4, 5, 6, 0, time.UTC))
	return req
}

// TestSignV4MatchesTheOfficialSDK is the whole reason the vendor SDK could be
// removed: the same inputs produce the same Authorization header, down to the
// signed header list and the signature.
func TestSignV4MatchesTheOfficialSDK(t *testing.T) {
	for _, v := range goldenVectors {
		t.Run(v.name, func(t *testing.T) {
			req := signGolden(t, v, testAK, testSK, DefaultAssetRegion, AssetServiceName)

			if got := req.Header.Get("X-Date"); got != v.headers["X-Date"] {
				t.Fatalf("X-Date = %q; signV4 must not overwrite one the caller fixed", got)
			}
			if got := req.Header.Get("X-Content-Sha256"); got != v.wantPayloadHash {
				t.Fatalf("X-Content-Sha256 = %q, want %q", got, v.wantPayloadHash)
			}
			want := "HMAC-SHA256 Credential=" + testAK + "/20260930/" + DefaultAssetRegion + "/" +
				AssetServiceName + "/request, SignedHeaders=" + v.wantSignedHeaders +
				", Signature=" + v.wantSignature
			if got := req.Header.Get("Authorization"); got != want {
				t.Fatalf("Authorization mismatch with the official SDK\n got: %s\nwant: %s", got, want)
			}
		})
	}
}

// TestSignV4GoldenIsNotIndifferent: the golden test above would also pass
// against a signer that ignored half its inputs, so each input is changed on
// its own and the signature must move. A signature that does not cover the
// region is one that can be replayed into another region's endpoint; one that
// does not cover the query is one that can be replayed onto another Action.
func TestSignV4GoldenIsNotIndifferent(t *testing.T) {
	v := goldenVectors[0]
	base := signGolden(t, v, testAK, testSK, DefaultAssetRegion, AssetServiceName).Header.Get("Authorization")

	vary := map[string]func(*goldenVector) (ak, sk, region, service string){
		"access key": func(*goldenVector) (string, string, string, string) {
			return testAK + "X", testSK, DefaultAssetRegion, AssetServiceName
		},
		"secret key": func(*goldenVector) (string, string, string, string) {
			return testAK, testSK + "X", DefaultAssetRegion, AssetServiceName
		},
		"region": func(*goldenVector) (string, string, string, string) {
			return testAK, testSK, BytePlusAssetRegion, AssetServiceName
		},
		"service": func(*goldenVector) (string, string, string, string) {
			return testAK, testSK, DefaultAssetRegion, "not-ark"
		},
	}
	for name, f := range vary {
		cp := v
		ak, sk, region, service := f(&cp)
		if got := signGolden(t, cp, ak, sk, region, service).Header.Get("Authorization"); got == base {
			t.Errorf("the signature does not depend on the %s", name)
		}
	}

	// The request itself: body, query, path, method, X-Date, and an added X-
	// header.
	mutations := map[string]func(*goldenVector){
		"body":  func(g *goldenVector) { g.body = `{"GroupType":"AIGC","Name":"other"}` },
		"query": func(g *goldenVector) { g.url = strings.Replace(g.url, "CreateAssetGroup", "DeleteAssetGroup", 1) },
		"path":  func(g *goldenVector) { g.url = strings.Replace(g.url, ".com/?", ".com/v2?", 1) },
		"date": func(g *goldenVector) {
			h := map[string]string{}
			for k, val := range g.headers {
				h[k] = val
			}
			h["X-Date"] = "20260930T075502Z"
			g.headers = h
		},
		"an added X- header": func(g *goldenVector) {
			h := map[string]string{}
			for k, val := range g.headers {
				h[k] = val
			}
			h["X-Something-Else"] = "1"
			g.headers = h
		},
		"content-type": func(g *goldenVector) {
			h := map[string]string{}
			for k, val := range g.headers {
				h[k] = val
			}
			h["Content-Type"] = "application/json"
			g.headers = h
		},
	}
	for name, mutate := range mutations {
		cp := v
		mutate(&cp)
		if got := signGolden(t, cp, testAK, testSK, DefaultAssetRegion, AssetServiceName).Header.Get("Authorization"); got == base {
			t.Errorf("the signature does not cover the %s", name)
		}
	}

	// And the other way round: a header that is NOT signed must not move it.
	for _, name := range []string{"User-Agent", "Accept", "Accept-Encoding"} {
		cp := v
		h := map[string]string{}
		for k, val := range v.headers {
			h[k] = val
		}
		h[name] = "changed"
		cp.headers = h
		if got := signGolden(t, cp, testAK, testSK, DefaultAssetRegion, AssetServiceName).Header.Get("Authorization"); got != base {
			t.Errorf("%s is not a signed header but changed the signature", name)
		}
	}
}

// TestCanonicalHost pins the port rule: a default port is signed away, any
// other port is part of the authority. Getting this backwards is a 403 only
// against a non-standard endpoint, i.e. only for the operators who changed
// asset_base_url.
func TestCanonicalHost(t *testing.T) {
	cases := map[string]string{
		"ark.cn-beijing.volcengineapi.com":      "ark.cn-beijing.volcengineapi.com",
		"ark.cn-beijing.volcengineapi.com:80":   "ark.cn-beijing.volcengineapi.com",
		"ark.cn-beijing.volcengineapi.com:443":  "ark.cn-beijing.volcengineapi.com",
		"ark.cn-beijing.volcengineapi.com:8443": "ark.cn-beijing.volcengineapi.com:8443",
		"127.0.0.1:41234":                       "127.0.0.1:41234",
		"":                                      "",
	}
	for in, want := range cases {
		if got := canonicalHost(in); got != want {
			t.Errorf("canonicalHost(%q) = %q, want %q", in, got, want)
		}
	}
}

// TestEncodePathSegmentIsNotPathEscape: the canonical request uses the RFC 3986
// unreserved set, which net/url's PathEscape does not - it leaves the
// sub-delimiters alone. Reaching for the standard library here looks right and
// signs a different path than the server canonicalises.
func TestEncodePathSegmentIsNotPathEscape(t *testing.T) {
	cases := map[string]string{
		"":         "",
		"assets":   "assets",
		"a-b_c.d~": "a-b_c.d~",
		"a b":      "a%20b",
		"a+b":      "a%2Bb",
		"a=b":      "a%3Db",
		"a&b":      "a%26b",
		"a$b":      "a%24b",
		"a@b":      "a%40b",
		"a/b":      "a%2Fb", // a segment never contains a separator
		"中":        "%E4%B8%AD",
	}
	for in, want := range cases {
		if got := encodePathSegment(in); got != want {
			t.Errorf("encodePathSegment(%q) = %q, want %q", in, got, want)
		}
	}
	// The divergence itself, so nobody "simplifies" this away.
	for _, s := range []string{"a+b", "a=b", "a&b", "a$b", "a@b"} {
		if encodePathSegment(s) == url.PathEscape(s) {
			t.Errorf("encodePathSegment(%q) agrees with url.PathEscape; one of them is now wrong", s)
		}
	}
	if got := normalizeURIPath("/contents/a b/c"); got != "/contents/a%20b/c" {
		t.Errorf("normalizeURIPath = %q", got)
	}
}

// TestNormalizeQuerySpellsSpacesWithPercent20: url.Values.Encode spells a
// space "+", which the canonical request does not.
func TestNormalizeQuerySpellsSpacesWithPercent20(t *testing.T) {
	v := url.Values{"Action": {"ListAssets"}, "Name": {"two words"}}
	if got := normalizeQuery(v); got != "Action=ListAssets&Name=two%20words" {
		t.Fatalf("normalizeQuery = %q", got)
	}
}

// TestSignV4FillsInTheDateWhenTheCallerHasNot: the production path does not
// set X-Date, so the clock is what puts it there - and the credential scope's
// date has to be that same day, not the day the process started.
func TestSignV4FillsInTheDateWhenTheCallerHasNot(t *testing.T) {
	payload := []byte(`{}`)
	req, err := http.NewRequest(http.MethodPost, "https://ark.cn-beijing.volcengineapi.com/?Action=ListAssets", bytes.NewReader(payload))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", assetContentType)
	fixed := time.Date(2026, 12, 31, 23, 59, 58, 0, time.UTC)
	signV4(req, payload, testAK, testSK, DefaultAssetRegion, AssetServiceName, fixed)

	if got := req.Header.Get("X-Date"); got != "20261231T235958Z" {
		t.Fatalf("X-Date = %q", got)
	}
	if auth := req.Header.Get("Authorization"); !strings.Contains(auth, "Credential="+testAK+"/20261231/") {
		t.Fatalf("the credential scope does not carry X-Date's day: %s", auth)
	}
	// A local-time clock must still produce a UTC X-Date.
	req2, _ := http.NewRequest(http.MethodPost, "https://ark.cn-beijing.volcengineapi.com/?Action=ListAssets", bytes.NewReader(payload))
	signV4(req2, payload, testAK, testSK, DefaultAssetRegion, AssetServiceName,
		fixed.In(time.FixedZone("UTC+8", 8*60*60)))
	if got := req2.Header.Get("X-Date"); got != "20261231T235958Z" {
		t.Fatalf("X-Date from a non-UTC clock = %q, want the same instant in UTC", got)
	}
}
