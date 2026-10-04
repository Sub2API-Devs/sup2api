// Package classify is a declarative ClassifyError: a Policy parses the
// upstream error body once and walks an ordered list of Rules; the first rule
// whose When matches decides the action, the account effect and the reason.
// Nothing matched means the client sent a bad request: it is returned as-is.
//
// Vendor policies (pluginsdk/providers/...) are built from the shared rules
// here, so the Anthropic-compatible plugins (anthropic, relay, ccgateway)
// share one classifier and the others only add their own codes:
//
//	func (p *Plugin) ClassifyError(_ context.Context, in *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
//		return anthropic.Policy.Classify(p.now(), in), nil
//	}
//
// The core still decides what a classification means for scheduling (CONTRACTS
// §42: administrators may add their own disable rules on top); a plugin only
// reports DISABLE for errors that prove the credentials or the quota unusable.
package classify

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/textutil"
)

// Cooldown defaults (ARCHITECTURE 15.1).
const (
	// DefaultRateLimit is the cooldown of a 429 whose reset is unknown.
	DefaultRateLimit = 60 * time.Second
	// DefaultTransport is the cooldown after a transport error (no response).
	DefaultTransport = 10 * time.Second
	// MaxCooldown bounds every computed reset.
	MaxCooldown = 7 * 24 * time.Hour
	// MaxReasonMessage bounds the upstream text copied into a reason.
	MaxReasonMessage = 200
)

// Effect is what a rule does to the account.
type Effect int

const (
	// None leaves the account alone.
	None Effect = iota
	// Cooldown takes the account out of scheduling for a while.
	Cooldown
	// Disable reports the credentials or the quota as unusable.
	Disable
)

// Error is the parsed upstream error body. Fields a vendor does not have stay
// empty.
type Error struct {
	Message string
	// Type is the vendor's error type (OpenAI "type", Google "status").
	Type string
	// Code is the vendor's error code (OpenAI / Ark "code").
	Code string
	// Reasons are machine reasons (google.rpc.ErrorInfo.reason).
	Reasons []string
	// QuotaIDs are the violated quotas (google.rpc.QuotaFailure).
	QuotaIDs []string
	// RetryDelay is a retry hint in the body (google.rpc.RetryInfo), 0 = none.
	RetryDelay time.Duration
}

// Input is one upstream failure as the rules see it.
type Input struct {
	Now    time.Time
	Status int // 0 = transport error
	// Headers are lower-cased with trimmed values.
	Headers        map[string]string
	Body           []byte // first 4 KiB
	Protocol       string // RequestMeta.protocol (the upstream protocol)
	TransportError string
	Error          Error
}

// Match selects the failures a rule applies to.
type Match func(in *Input) bool

// Reset works out when a cooled-down account may be used again. ok=false
// means "no information", src names where the time came from.
type Reset func(in *Input) (until time.Time, src string, ok bool)

// Rule is one line of a Policy.
type Rule struct {
	When Match
	// Return sends the error back to the client instead of failing over.
	Return bool
	Effect Effect
	// Cooldown is the fixed cooldown of an Effect Cooldown rule without Until.
	Cooldown time.Duration
	// Until computes the cooldown end (clamped to [now+1s, now+MaxCooldown],
	// DefaultRateLimit when it has nothing); the reason then reads
	// "<Reason> until <time> (<src>)".
	Until Reset
	// Reason is shown on the account row; "%d" is replaced by the status.
	Reason string
	// NoDetail skips Policy.Detail for this rule.
	NoDetail bool
}

// Policy classifies the failures of one vendor.
type Policy struct {
	// Parse reads the upstream error body (nil = no body parsing).
	Parse func(body []byte) Error
	// ErrorType is the client error type in the client's protocol vocabulary.
	ErrorType func(in *Input) string
	// Detail is appended to every rule reason (nil = DetailMessage).
	Detail func(in *Input) string
	// Transport is the cooldown after a transport error (0 = DefaultTransport).
	Transport time.Duration
	Rules     []Rule
}

// With returns a copy of p whose rules start with rules: plugin-specific
// codes take precedence over the vendor defaults.
func (p Policy) With(rules ...Rule) Policy {
	p.Rules = append(append([]Rule(nil), rules...), p.Rules...)
	return p
}

// Classify implements PlatformService.ClassifyError.
func (p Policy) Classify(now time.Time, req *pluginv1.ClassifyErrorRequest) *pluginv1.ClassifyErrorResponse {
	in := p.input(now, req)
	resp := &pluginv1.ClassifyErrorResponse{ClientMessage: in.Error.Message}
	if p.ErrorType != nil {
		resp.ClientErrorType = p.ErrorType(in)
	}
	if in.Status == 0 {
		p.transport(in, resp)
		return resp
	}
	for _, r := range p.Rules {
		if r.When(in) {
			p.apply(r, in, resp)
			return resp
		}
	}
	resp.Action = pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT
	return resp
}

func (p Policy) input(now time.Time, req *pluginv1.ClassifyErrorRequest) *Input {
	in := &Input{
		Now: now, Status: int(req.GetStatus()), Headers: make(map[string]string, len(req.GetHeaders())),
		Body: req.GetBodyPrefix(), Protocol: req.GetMeta().GetProtocol(), TransportError: req.GetTransportError(),
	}
	for k, v := range req.GetHeaders() {
		in.Headers[strings.ToLower(k)] = strings.TrimSpace(v)
	}
	if p.Parse != nil {
		in.Error = p.Parse(in.Body)
	}
	return in
}

func (p Policy) transport(in *Input, resp *pluginv1.ClassifyErrorResponse) {
	d := p.Transport
	if d == 0 {
		d = DefaultTransport
	}
	resp.Action = pluginv1.ClassifyErrorResponse_ACTION_FAILOVER
	resp.AccountEffect = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN
	resp.CooldownUntilUnix = in.Now.Add(d).Unix()
	resp.Reason = "transport error: " + textutil.Clip(in.TransportError, MaxReasonMessage)
	resp.ClientStatus = http.StatusBadGateway
	if resp.ClientMessage == "" {
		resp.ClientMessage = "upstream connection failed"
	}
}

func (p Policy) apply(r Rule, in *Input, resp *pluginv1.ClassifyErrorResponse) {
	resp.Action = pluginv1.ClassifyErrorResponse_ACTION_FAILOVER
	if r.Return {
		resp.Action = pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT
	}
	reason := r.Reason
	if strings.Contains(reason, "%d") {
		reason = fmt.Sprintf(reason, in.Status)
	}
	switch r.Effect {
	case Cooldown:
		until := in.Now.Add(r.Cooldown)
		if r.Until != nil {
			t, src, ok := r.Until(in)
			if ok {
				until = Clamp(in.Now, t)
			} else {
				until, src = in.Now.Add(DefaultRateLimit), "default"
			}
			reason += " until " + until.UTC().Format(time.RFC3339) + " (" + src + ")"
		}
		resp.AccountEffect = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN
		resp.CooldownUntilUnix = until.Unix()
	case Disable:
		resp.AccountEffect = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE
	}
	if reason != "" && !r.NoDetail {
		detail := DetailMessage
		if p.Detail != nil {
			detail = p.Detail
		}
		reason += detail(in)
	}
	resp.Reason = reason
}

// DetailMessage appends ": <upstream message>" (clipped) when there is one.
func DetailMessage(in *Input) string {
	if in.Error.Message == "" {
		return ""
	}
	return ": " + textutil.Clip(in.Error.Message, MaxReasonMessage)
}

// DetailCodeMessage appends " [<code>]: <message>": for vendors whose codes
// say more than their status (the console shows why an account was touched).
func DetailCodeMessage(in *Input) string {
	s := ""
	if in.Error.Code != "" {
		s = " [" + in.Error.Code + "]"
	}
	return s + DetailMessage(in)
}

// ---------------------------------------------------------------- shared rules

// EdgeBlock fails a 403 over WITHOUT touching the account when the 403 came
// from a CDN / WAF in front of the upstream (see EdgeBlocked) rather than from
// the vendor's API: such a page says the path or the egress was blocked, not
// that the key is bad, and disabling on it lets one bad proxy or one bad
// request take a whole group offline (sub2api #5334). Put it before
// Credentials.
func EdgeBlock() Rule {
	return Rule{When: All(Status(http.StatusForbidden), EdgeBlocked), Reason: "upstream edge blocked the request (%d), the account is not at fault"}
}

// Credentials disables the account on 401/403: the vendor rejected the key.
func Credentials() Rule {
	return Rule{When: Status(http.StatusUnauthorized, http.StatusForbidden), Effect: Disable, Reason: "upstream rejected credentials (%d)"}
}

// RateLimit cools a 429'd account down until reset says (DefaultRateLimit
// when it cannot tell).
func RateLimit(reset Reset) Rule {
	return Rule{When: Status(http.StatusTooManyRequests), Effect: Cooldown, Until: reset, Reason: "rate limited"}
}

// ServerErrors fails 408 and 5xx over, cooling the account down for d
// (0 = no account effect: the failure is usually per request or per model).
func ServerErrors(d time.Duration) Rule {
	r := Rule{When: ServerError, Reason: "upstream server error (%d)"}
	if d > 0 {
		r.Effect, r.Cooldown = Cooldown, d
	}
	return r
}

// ---------------------------------------------------------------- matchers

// Status matches the given HTTP statuses.
func Status(codes ...int) Match {
	return func(in *Input) bool {
		for _, c := range codes {
			if in.Status == c {
				return true
			}
		}
		return false
	}
}

// ServerError matches 408 and every 5xx.
func ServerError(in *Input) bool {
	return in.Status == http.StatusRequestTimeout || in.Status >= 500
}

// CodeIn matches the given upstream error codes.
func CodeIn(codes ...string) Match {
	return func(in *Input) bool {
		for _, c := range codes {
			if in.Error.Code == c {
				return true
			}
		}
		return false
	}
}

// CodePrefix matches upstream error codes starting with prefix.
func CodePrefix(prefix string) Match {
	return func(in *Input) bool { return strings.HasPrefix(in.Error.Code, prefix) }
}

// TypeIn matches the given upstream error types.
func TypeIn(types ...string) Match {
	return func(in *Input) bool {
		for _, t := range types {
			if in.Error.Type == t {
				return true
			}
		}
		return false
	}
}

// MessageContains matches an upstream message containing one of subs
// (case-insensitive).
func MessageContains(subs ...string) Match {
	return func(in *Input) bool {
		m := strings.ToLower(in.Error.Message)
		for _, s := range subs {
			if strings.Contains(m, strings.ToLower(s)) {
				return true
			}
		}
		return false
	}
}

// HasReason matches one of the machine reasons (google.rpc.ErrorInfo).
func HasReason(reasons ...string) Match {
	return func(in *Input) bool {
		for _, have := range in.Error.Reasons {
			for _, r := range reasons {
				if have == r {
					return true
				}
			}
		}
		return false
	}
}

// All matches when every m matches.
func All(ms ...Match) Match {
	return func(in *Input) bool {
		for _, m := range ms {
			if !m(in) {
				return false
			}
		}
		return true
	}
}

// Any matches when one m matches.
func Any(ms ...Match) Match {
	return func(in *Input) bool {
		for _, m := range ms {
			if m(in) {
				return true
			}
		}
		return false
	}
}

// edgeMarkers are Cloudflare challenge / block page fragments.
var edgeMarkers = []string{
	"error code: 1010", // Cloudflare bot block (browser signature banned)
	"window._cf_chl_opt",
	"__cf_chl_",
	"challenge-platform",
	"just a moment",
	"attention required! | cloudflare",
}

// EdgeBlocked reports whether the response is a CDN / WAF page rather than
// a vendor API error: Cloudflare's cf-mitigated: challenge, an HTML page, or a
// Cloudflare block marker in a body that is not a JSON error. A structured
// JSON error always counts as the vendor's own answer. cf-ray alone proves
// nothing: the vendors' real APIs sit behind Cloudflare and send it on every
// response, including genuine 403s.
func EdgeBlocked(in *Input) bool {
	if strings.EqualFold(in.Headers["cf-mitigated"], "challenge") {
		return true
	}
	body := strings.ToLower(strings.TrimSpace(string(in.Body)))
	if strings.HasPrefix(body, "{") || strings.HasPrefix(body, "[") {
		return false
	}
	if strings.HasPrefix(body, "<!doctype html") || strings.HasPrefix(body, "<html") ||
		strings.Contains(strings.ToLower(in.Headers["content-type"]), "text/html") {
		return true
	}
	for _, m := range edgeMarkers {
		if strings.Contains(body, m) {
			return true
		}
	}
	return false
}

// ---------------------------------------------------------------- resets

// RetryAfter reads retry-after-ms, then retry-after (seconds or an HTTP
// date).
func RetryAfter(in *Input) (time.Time, string, bool) {
	if v := in.Headers["retry-after-ms"]; v != "" {
		if ms, err := strconv.ParseFloat(v, 64); err == nil && ms >= 0 {
			return in.Now.Add(time.Duration(ms * float64(time.Millisecond))), "retry-after-ms", true
		}
	}
	v := in.Headers["retry-after"]
	if v == "" {
		return time.Time{}, "", false
	}
	if secs, err := strconv.ParseFloat(v, 64); err == nil && secs >= 0 {
		return in.Now.Add(time.Duration(secs * float64(time.Second))), "retry-after", true
	}
	if t, err := http.ParseTime(v); err == nil {
		return t, "retry-after", true
	}
	return time.Time{}, "", false
}

// FirstReset tries the resets in order and returns the first answer.
func FirstReset(resets ...Reset) Reset {
	return func(in *Input) (time.Time, string, bool) {
		for _, r := range resets {
			if t, src, ok := r(in); ok {
				return t, src, true
			}
		}
		return time.Time{}, "", false
	}
}

// Clamp bounds a reset to [now+1s, now+MaxCooldown].
func Clamp(now, t time.Time) time.Time {
	if lo := now.Add(time.Second); t.Before(lo) {
		return lo
	}
	if hi := now.Add(MaxCooldown); t.After(hi) {
		return hi
	}
	return t
}
