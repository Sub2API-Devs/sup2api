package volcengine

// Upstream calls of the asset library: the Ark control-plane OpenAPI, signed
// with volcengine V4 (arksign.go) and sent through the host egress tunnel.
//
// The official Volcengine Go SDK used to do this and was removed; arksign.go's
// header says why, and what replaced the assurance it gave.
//
// TWO THINGS THIS FILE HAS TO GET RIGHT
//
//  1. Egress. A plugin in strict network mode cannot open a socket itself;
//     every connection has to be dialled through the host tunnel
//     (sdk/pluginsdk/egress). The client below carries a Transport whose
//     DialContext is the egress dialler. NOTHING in this file may use
//     http.DefaultClient or build a Transport of its own.
//
//  2. Cancellation. Every request carries the caller's context, so a console
//     request that goes away takes its upstream call with it. This is the
//     defect §10.3 recorded against the vendor SDK: universal.DoCall had no
//     context parameter, so an abandoned request kept a goroutine and a socket
//     until the client timeout - and this plugin is allowed 128 open files.

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"time"
)

// Actions of the asset library OpenAPI (ServiceName ark, Version
// 2024-01-01). Ten Actions, five per resource.
const (
	ActionCreateAssetGroup = "CreateAssetGroup"
	ActionGetAssetGroup    = "GetAssetGroup"
	ActionListAssetGroups  = "ListAssetGroups"
	ActionUpdateAssetGroup = "UpdateAssetGroup"
	ActionDeleteAssetGroup = "DeleteAssetGroup"

	ActionCreateAsset = "CreateAsset"
	ActionGetAsset    = "GetAsset"
	ActionListAssets  = "ListAssets"
	ActionUpdateAsset = "UpdateAsset"
	ActionDeleteAsset = "DeleteAsset"
)

// AssetActions lists every Action the plugin may send upstream. Any other
// value is refused before a request is built, so a route can never be talked
// into signing an arbitrary control-plane call with an account's AK/SK.
var AssetActions = []string{
	ActionCreateAssetGroup, ActionGetAssetGroup, ActionListAssetGroups, ActionUpdateAssetGroup, ActionDeleteAssetGroup,
	ActionCreateAsset, ActionGetAsset, ActionListAssets, ActionUpdateAsset, ActionDeleteAsset,
}

// assetCallTimeout bounds one upstream Action (all attempts together) when the
// caller's context has no earlier deadline.
const assetCallTimeout = 30 * time.Second

// assetMaxAttempts is how many times one Action may be sent. Retries cover a
// transport error, a 429 and a 5xx; see retryableAction for the Actions that
// are never retried at all.
const assetMaxAttempts = 3

// assetRetryDelay is the pause before a retry. These calls sit inside a
// console request, so the ladder is short on purpose.
const assetRetryDelay = 200 * time.Millisecond

// assetMaxResponseBody caps what is read back. A control-plane answer is a
// small JSON document; anything larger is not one, and reading it into the
// plugin's 64 MiB would be the wrong way to find that out.
const assetMaxResponseBody = 1 << 20 // 1 MiB

// assetContentType is both sent and signed. The charset is part of it because
// that is what the value has to be byte-identical to on both sides.
const assetContentType = "application/json; charset=utf-8"

// DialFunc opens a TCP connection. In production it is egress.DialContext
// (the host tunnel); tests pass their own.
type DialFunc func(ctx context.Context, network, address string) (net.Conn, error)

// arkAPI calls the asset library OpenAPI. One instance per plugin, the
// account's credentials are passed per call.
type arkAPI struct {
	transport *http.Transport
	// now is time.Now in production; the signature tests fix it.
	now func() time.Time
}

// newArkAPI builds the upstream caller over dial. A nil dial means "no
// outbound network configured", and every call fails with a clear error
// rather than falling back to a direct socket the sandbox would kill.
func newArkAPI(dial DialFunc) *arkAPI {
	a := &arkAPI{now: time.Now}
	if dial == nil {
		return a
	}
	a.transport = &http.Transport{
		// The host resolves names and applies the egress policy, so no proxy
		// from the environment and no local DNS.
		Proxy:                 nil,
		DialContext:           dial,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          8,
		MaxIdleConnsPerHost:   4,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: time.Second,
	}
	return a
}

func (a *arkAPI) close() {
	if a.transport != nil {
		a.transport.CloseIdleConnections()
	}
}

// ArkError is a failed upstream Action. Status is 0 for transport errors;
// Code and Message come from the volcengine ResponseMetadata.Error.
type ArkError struct {
	Action  string
	Status  int
	Code    string
	Message string
}

func (e *ArkError) Error() string {
	if e.Code == "" {
		return fmt.Sprintf("%s: %s", e.Action, e.Message)
	}
	return fmt.Sprintf("%s: %s: %s", e.Action, e.Code, e.Message)
}

// NotFound reports whether the Action failed because the addressed resource
// does not exist upstream. Volcengine spells this several ways depending on
// the service, so the HTTP status and the code shape are both consulted.
// This is the single place the "upstream is the truth" rule keys off, so it
// is deliberately generous: a missed NotFound leaves a stale index row
// behind, which is visible, while a false positive would delete an index row
// for a resource that still exists.
func (e *ArkError) NotFound() bool {
	if e == nil {
		return false
	}
	if e.Status == http.StatusNotFound {
		return true
	}
	c := e.Code
	return strings.HasPrefix(c, "NotFound") || strings.Contains(c, ".NotFound") ||
		strings.Contains(c, "ResourceNotFound") || strings.Contains(c, "NotExist")
}

// Throttled reports whether the Action was rate limited upstream.
func (e *ArkError) Throttled() bool {
	return e != nil && (e.Status == http.StatusTooManyRequests || strings.Contains(e.Code, "Throttl") ||
		strings.Contains(e.Code, "QuotaExceeded") || strings.Contains(e.Code, "FlowLimit"))
}

// Denied reports whether upstream rejected the credentials themselves (a
// wrong AK/SK, a wrong region in the credential scope, or an AK without
// permission for ark). Worth distinguishing: it is an account configuration
// problem, not a transient failure.
func (e *ArkError) Denied() bool {
	return e != nil && (e.Status == http.StatusUnauthorized || e.Status == http.StatusForbidden ||
		strings.Contains(e.Code, "SignatureDoesNotMatch") || strings.Contains(e.Code, "AccessDenied") ||
		strings.Contains(e.Code, "InvalidAccessKey") || strings.Contains(e.Code, "AuthFailure"))
}

// retryableAction reports whether sending this Action twice is safe.
//
// Everything except a create is: Get and List read, Update and Delete address
// a resource by id and land on the same state twice. A create does not - it
// mints a new id every time, so a retry after a 5xx or a lost connection can
// leave a SECOND group or asset upstream that nothing here knows about, and
// the compensation path only ever hears about the id of the last attempt. The
// vendor SDK retried these too (WithMaxRetries), which was a quiet hazard:
// the create route's whole design is "upstream first, then index, compensate
// if the index write fails", and it cannot compensate for a resource it was
// never told about.
func retryableAction(action string) bool {
	return !strings.HasPrefix(action, "Create")
}

// call sends one Action for cfg and returns its Result object.
func (a *arkAPI) call(ctx context.Context, cfg *AssetConfig, action string, body map[string]any) (map[string]any, *ArkError) {
	if cfg == nil {
		return nil, &ArkError{Action: action, Code: "InternalError", Message: "no asset library credentials"}
	}
	if !knownAction(action) {
		return nil, &ArkError{Action: action, Code: "InvalidAction", Message: "unsupported asset library action"}
	}
	if a.transport == nil {
		return nil, &ArkError{Action: action, Code: "EgressUnavailable",
			Message: "the plugin has no outbound network: the asset library needs the \"net\" grant"}
	}
	if err := ctx.Err(); err != nil {
		return nil, &ArkError{Action: action, Code: "Canceled", Message: err.Error()}
	}
	payload, err := json.Marshal(bodyOrEmpty(body))
	if err != nil {
		return nil, &ArkError{Action: action, Code: "InternalError", Message: "cannot encode the request: " + err.Error()}
	}
	// One budget for the whole Action, retries included, so a retry ladder can
	// never outlive the console request that started it.
	ctx, cancel := context.WithTimeout(ctx, assetCallTimeout)
	defer cancel()

	attempts := 1
	if retryableAction(action) {
		attempts = assetMaxAttempts
	}
	var last *ArkError
	for attempt := 1; attempt <= attempts; attempt++ {
		if attempt > 1 {
			select {
			case <-ctx.Done():
				return nil, contextError(action, ctx, last)
			case <-time.After(assetRetryDelay):
			}
		}
		result, callErr := a.attempt(ctx, cfg, action, payload)
		if callErr == nil {
			return result, nil
		}
		last = callErr
		if ctx.Err() != nil {
			return nil, contextError(action, ctx, last)
		}
		// A transport error, a throttle and a 5xx are the three worth asking
		// again about. Everything else - a wrong signature, a bad argument, a
		// resource that is not there - answers the same way every time.
		if !(callErr.Status == 0 || callErr.Status == http.StatusTooManyRequests || callErr.Status >= 500) {
			return nil, callErr
		}
	}
	return nil, last
}

// contextError reports a cancelled or expired context, keeping the last
// upstream failure in the message when there was one: "deadline exceeded" on
// its own hides the 503 that used the budget up.
func contextError(action string, ctx context.Context, last *ArkError) *ArkError {
	msg := ctx.Err().Error()
	if last != nil {
		msg += " (last attempt: " + last.Error() + ")"
	}
	return &ArkError{Action: action, Code: "Canceled", Message: msg}
}

// attempt sends the Action once.
func (a *arkAPI) attempt(ctx context.Context, cfg *AssetConfig, action string, payload []byte) (map[string]any, *ArkError) {
	u := strings.TrimSuffix(cfg.BaseURL, "/") + "/?Action=" + action + "&Version=" + AssetAPIVersion
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, bytes.NewReader(payload))
	if err != nil {
		return nil, &ArkError{Action: action, Code: "InternalError", Message: err.Error()}
	}
	req.Header.Set("Content-Type", assetContentType)
	req.Header.Set("Accept", "application/json")
	signV4(req, payload, cfg.AccessKey, cfg.SecretKey, cfg.Region, AssetServiceName, a.now())

	resp, err := (&http.Client{Transport: a.transport}).Do(req)
	if err != nil {
		// The error text can carry the URL but never a credential: the AK/SK
		// only ever appear in the Authorization header, which is not in it.
		return nil, &ArkError{Action: action, Code: "TransportError", Message: err.Error()}
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, assetMaxResponseBody))
	if err != nil {
		return nil, &ArkError{Action: action, Status: resp.StatusCode, Code: "TransportError",
			Message: "cannot read the response: " + err.Error()}
	}
	return parseArkEnvelope(action, resp.StatusCode, raw)
}

// parseArkEnvelope reads the {ResponseMetadata, Result} answer.
//
// The error is NOT decided by the HTTP status alone: volcengine reports a
// missing resource inside a 200 with ResponseMetadata.Error filled in, which
// is why the index's "upstream is the truth" rule would break on a status-code
// check (there is a test for exactly this).
func parseArkEnvelope(action string, status int, raw []byte) (map[string]any, *ArkError) {
	var env struct {
		ResponseMetadata struct {
			RequestID string `json:"RequestId"`
			Error     *struct {
				Code    string `json:"Code"`
				Message string `json:"Message"`
			} `json:"Error"`
		} `json:"ResponseMetadata"`
		Result map[string]any `json:"Result"`
	}
	dec := json.NewDecoder(bytes.NewReader(raw))
	// Ids and counts survive the round trip unrounded, and resultItems/totalOf
	// already read json.Number.
	dec.UseNumber()
	if err := dec.Decode(&env); err != nil {
		if status < 200 || status >= 300 {
			return nil, &ArkError{Action: action, Status: status, Code: "HTTPError",
				Message: "HTTP " + itoa(status) + ": " + snippet(raw)}
		}
		return nil, &ArkError{Action: action, Status: status, Code: "InternalError",
			Message: "the answer is not a volcengine envelope: " + snippet(raw)}
	}
	if e := env.ResponseMetadata.Error; e != nil && (e.Code != "" || e.Message != "") {
		return nil, &ArkError{Action: action, Status: status, Code: e.Code, Message: e.Message}
	}
	if status < 200 || status >= 300 {
		return nil, &ArkError{Action: action, Status: status, Code: "HTTPError",
			Message: "HTTP " + itoa(status) + ": " + snippet(raw)}
	}
	if env.Result == nil {
		return map[string]any{}, nil
	}
	return env.Result, nil
}

// snippet is a short, single-line excerpt of an answer that could not be
// read, for an operator's error message.
func snippet(raw []byte) string {
	s := strings.TrimSpace(strings.Map(func(r rune) rune {
		if r == '\n' || r == '\r' || r == '\t' {
			return ' '
		}
		return r
	}, string(raw)))
	if len(s) > 200 {
		return s[:200] + "..."
	}
	if s == "" {
		return "(empty body)"
	}
	return s
}

func itoa(n int) string { return fmt.Sprintf("%d", n) }

// bodyOrEmpty makes sure the request body is a JSON object, never "null":
// an Action with no parameters still has to be sent as {}.
func bodyOrEmpty(body map[string]any) map[string]any {
	if body == nil {
		return map[string]any{}
	}
	return body
}

func knownAction(a string) bool {
	for _, k := range AssetActions {
		if k == a {
			return true
		}
	}
	return false
}

// ---------------------------------------------------------------- typed views

// UpstreamGroup is the part of an asset group the index keeps. Field names
// follow the OpenAPI (PascalCase).
type UpstreamGroup struct {
	ID          string
	Name        string
	Title       string
	Description string
	GroupType   string
}

// UpstreamAsset is the part of an asset the index keeps.
type UpstreamAsset struct {
	ID        string
	Name      string
	AssetType string
	URL       string
	Status    string
	GroupID   string
}

// strField reads the first non-empty string field of an OpenAPI result,
// tolerating the absence of the key and a non-string value (upstream adds
// fields over time; a wrong type must not take a whole page down). Several
// names are accepted per field because volcengine spells ids both "Id" and
// "<Resource>Id" depending on the Action.
func strField(m map[string]any, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k]; ok {
			if s, isStr := v.(string); isStr && s != "" {
				return s
			}
		}
	}
	return ""
}

func groupFromResult(m map[string]any) UpstreamGroup {
	return UpstreamGroup{
		ID:          strField(m, "Id", "ID", "GroupId"),
		Name:        strField(m, "Name"),
		Title:       strField(m, "Title"),
		Description: strField(m, "Description"),
		GroupType:   strField(m, "GroupType"),
	}
}

func assetFromResult(m map[string]any) UpstreamAsset {
	return UpstreamAsset{
		ID:        strField(m, "Id", "ID", "AssetId"),
		Name:      strField(m, "Name"),
		AssetType: strField(m, "AssetType", "Type"),
		URL:       strField(m, "URL", "Url"),
		Status:    strField(m, "Status"),
		GroupID:   strField(m, "GroupId", "GroupID"),
	}
}

// resultItems returns the list part of a List* result. Volcengine list
// results name the array differently per resource, so the resource-specific
// spellings are tried first and the generic ones after.
func resultItems(m map[string]any, keys ...string) []map[string]any {
	candidates := make([]string, 0, len(keys)+3)
	candidates = append(candidates, keys...)
	candidates = append(candidates, "Items", "List", "Data")
	for _, k := range candidates {
		raw, ok := m[k]
		if !ok {
			continue
		}
		arr, isArr := raw.([]any)
		if !isArr {
			continue
		}
		out := make([]map[string]any, 0, len(arr))
		for _, e := range arr {
			if obj, isObj := e.(map[string]any); isObj {
				out = append(out, obj)
			}
		}
		return out
	}
	return nil
}
