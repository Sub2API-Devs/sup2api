package volcengine

// The volcengine V4 request signature (HMAC-SHA256), the one thing the asset
// library needs from a Volcengine SDK.
//
// WHY THIS IS HERE AND NOT THE OFFICIAL SDK. Stage three used
// github.com/volcengine/volcengine-go-sdk for exactly this, and paid three
// prices for it (PLUGIN-VOLCENGINE-ARK.md §10.3): universal.DoCall takes no
// context.Context, so a cancelled console request could not abort an upstream
// call in flight; the SDK and its own dependency volc-sdk-golang are
// unpruned go1.14/go1.4 modules that dragged the pre-split monolithic
// genproto into the module graph and broke every module in the workspace with
// an ambiguous import until it was pinned; and five modules came in for one
// algorithm. None of that bought anything the code below does not do.
//
// WHY WRITING A SIGNATURE BY HAND IS NORMALLY A BAD IDEA, AND WHAT MAKES IT
// SAFE HERE. A wrong V4 signature does not crash, it 403s - possibly months
// later, on one deployment, in a region nobody tested. Two things retire that
// risk, both in arksign_test.go:
//
//  1. GOLDEN VECTORS CAPTURED FROM THE OFFICIAL SDK. Two complete requests
//     that volcengine-go-sdk v1.2.54 really produced (recorded on the commit
//     that removed it) are replayed through signV4 with the same inputs, and
//     the Authorization header must match byte for byte. That is a comparison
//     against the vendor's own implementation, not against a reading of the
//     documentation.
//  2. AN INDEPENDENT RECOMPUTATION of every live call (verifySignature in
//     arkapi_test.go), which predates this file: it rebuilds the canonical
//     request from what the fake control plane received and re-derives the
//     signing key, and it is run on all ten Actions.
//
// The algorithm is volc-sdk-golang/base.Sign4. Three details in it are not
// guessable and are the reason the golden vectors exist rather than a
// from-the-docs reimplementation:
//
//   - the signed header set is Content-Type, Content-Md5, Host,
//     X-Security-Token and EVERY header beginning with "X-" - not a fixed
//     list, so a header added to a request joins the signature;
//   - a Host value carrying port 80 or 443 is signed without the port, while
//     any other port is signed with it;
//   - path segments are escaped with an RFC 3986 unreserved set (alphanumeric
//     and -_.~), which is not net/url's PathEscape.

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"
)

// signAlgorithm is the value of the Authorization scheme and the first line
// of the string to sign.
const signAlgorithm = "HMAC-SHA256"

// signTimeFormat is the X-Date layout; its first 8 bytes are the credential
// scope's date.
const signTimeFormat = "20060102T150405Z"

// signV4 signs req in place: it sets X-Content-Sha256, X-Date (unless the
// caller already fixed one) and Authorization. payload is the exact body
// bytes req will send - it is hashed into the signature, so the two cannot be
// allowed to drift, which is why it is a parameter rather than something read
// back out of req.Body.
func signV4(req *http.Request, payload []byte, ak, sk, region, service string, now time.Time) {
	payloadHash := sha256Hex(payload)
	req.Header.Set("X-Content-Sha256", payloadHash)
	if req.Header.Get("X-Date") == "" {
		req.Header.Set("X-Date", now.UTC().Format(signTimeFormat))
	}
	xDate := req.Header.Get("X-Date")
	date := xDate[:8]

	names := signedHeaderNames(req.Header)
	var headersToSign strings.Builder
	for _, name := range names {
		value := ""
		if name == "host" {
			value = canonicalHost(hostOf(req))
		} else {
			value = strings.TrimSpace(req.Header.Get(name))
		}
		headersToSign.WriteString(name + ":" + value + "\n")
	}
	signedHeaders := strings.Join(names, ";")

	path := req.URL.Path
	if path == "" {
		path = "/"
	}
	canonical := strings.Join([]string{
		req.Method,
		normalizeURIPath(path),
		normalizeQuery(req.URL.Query()),
		headersToSign.String(),
		signedHeaders,
		payloadHash,
	}, "\n")

	scope := strings.Join([]string{date, region, service, "request"}, "/")
	stringToSign := strings.Join([]string{signAlgorithm, xDate, scope, sha256Hex([]byte(canonical))}, "\n")

	key := hmacSHA256(hmacSHA256(hmacSHA256(hmacSHA256([]byte(sk), date), region), service), "request")
	signature := hex.EncodeToString(hmacSHA256(key, stringToSign))

	req.Header.Set("Authorization", signAlgorithm+
		" Credential="+ak+"/"+scope+
		", SignedHeaders="+signedHeaders+
		", Signature="+signature)
}

// signedHeaderNames is the sorted, lower-cased list of headers that go into
// the signature: four named ones plus everything under the X- prefix.
//
// "host" is added from the request rather than read out of the header map.
// net/http keeps the host in Request.Host and excludes a "Host" entry of the
// map when writing the request, so a signer that relied on the map would
// depend on the caller having put a copy there - and would sign nothing if it
// had not, silently producing a signature the server rejects.
func signedHeaderNames(h http.Header) []string {
	names := []string{"host"}
	for key := range h {
		switch key {
		case "Content-Type", "Content-Md5", "X-Security-Token":
		case "Host": // already added, and never taken from the map
			continue
		default:
			if !strings.HasPrefix(key, "X-") {
				continue
			}
		}
		names = append(names, strings.ToLower(key))
	}
	sort.Strings(names)
	return names
}

// hostOf is the authority the request is addressed to: Request.Host when the
// caller set one, otherwise the URL's.
func hostOf(req *http.Request) string {
	if req.Host != "" {
		return req.Host
	}
	return req.URL.Host
}

// canonicalHost drops an explicit default port, which is how the signer on the
// Volcengine side sees it. Any other port stays: it is part of the authority.
func canonicalHost(host string) string {
	i := strings.LastIndexByte(host, ':')
	if i < 0 {
		return host
	}
	switch host[i+1:] {
	case "80", "443":
		return host[:i]
	}
	return host
}

// normalizeQuery is url.Values.Encode with "+" spelt "%20": the canonical
// request uses percent encoding throughout, and a space signed as "+" would
// not match what the server canonicalises.
func normalizeQuery(v url.Values) string {
	return strings.ReplaceAll(v.Encode(), "+", "%20")
}

// normalizeURIPath percent-encodes each path segment, keeping the separators.
func normalizeURIPath(path string) string {
	parts := strings.Split(path, "/")
	for i := range parts {
		parts[i] = encodePathSegment(parts[i])
	}
	return strings.Join(parts, "/")
}

// encodePathSegment escapes everything outside the RFC 3986 unreserved set.
// net/url's PathEscape is NOT equivalent: it leaves sub-delimiters such as
// "$&+,:;=@" alone, so a path containing one would be signed differently from
// the way the server canonicalises it.
func encodePathSegment(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if 'a' <= c && c <= 'z' || 'A' <= c && c <= 'Z' || '0' <= c && c <= '9' ||
			c == '-' || c == '_' || c == '.' || c == '~' {
			b.WriteByte(c)
			continue
		}
		const hexDigits = "0123456789ABCDEF"
		b.WriteByte('%')
		b.WriteByte(hexDigits[c>>4])
		b.WriteByte(hexDigits[c&15])
	}
	return b.String()
}

func hmacSHA256(key []byte, content string) []byte {
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(content))
	return mac.Sum(nil)
}

func sha256Hex(b []byte) string {
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}
