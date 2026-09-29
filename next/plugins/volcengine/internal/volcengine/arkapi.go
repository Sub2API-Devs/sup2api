package volcengine

// Upstream calls of the asset library. Everything here goes through the
// official Volcengine Go SDK (github.com/volcengine/volcengine-go-sdk,
// Apache-2.0): universal.DoCall signs the request with volcengine V4
// (HMAC-SHA256) and unwraps the {ResponseMetadata, Result} envelope. The
// signature is never hand-rolled - it hashes the whole canonical request
// including the body, and a hand-written version is the classic place to
// lose an afternoon.
//
// TWO THINGS THIS FILE HAS TO GET RIGHT
//
//  1. Egress. A plugin in strict network mode cannot open a socket itself;
//     every connection has to be dialled through the host tunnel
//     (sdk/pluginsdk/egress). The vendor SDK accepts a custom *http.Client,
//     so the client below carries a Transport whose DialContext is the
//     egress dialler. NOTHING in this file may use http.DefaultClient or
//     build a Transport of its own.
//
//  2. Context. universal.DoCall takes no context.Context (the vendor API
//     simply has no parameter for it), so a cancelled console request cannot
//     abort an in-flight upstream call. The deadline is therefore enforced
//     on the *http.Client instead, derived from the caller's context when it
//     has a deadline. ctx is still checked before the call so a request that
//     is already dead does not reach upstream.

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/volcengine/volcengine-go-sdk/volcengine"
	"github.com/volcengine/volcengine-go-sdk/volcengine/credentials"
	"github.com/volcengine/volcengine-go-sdk/volcengine/session"
	"github.com/volcengine/volcengine-go-sdk/volcengine/universal"
	"github.com/volcengine/volcengine-go-sdk/volcengine/volcengineerr"
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

// assetCallTimeout bounds one upstream Action when the caller's context has
// no earlier deadline.
const assetCallTimeout = 30 * time.Second

// assetMaxRetries is handed to the SDK retryer, which retries transport
// errors, 429 and 5xx. Kept low: these calls sit in a console request.
const assetMaxRetries = 2

// DialFunc opens a TCP connection. In production it is egress.DialContext
// (the host tunnel); tests pass their own.
type DialFunc func(ctx context.Context, network, address string) (net.Conn, error)

// arkAPI calls the asset library OpenAPI. One instance per plugin, the
// account's credentials are passed per call.
type arkAPI struct {
	transport *http.Transport
}

// newArkAPI builds the upstream caller over dial. A nil dial means "no
// outbound network configured", and every call fails with a clear error
// rather than falling back to a direct socket the sandbox would kill.
func newArkAPI(dial DialFunc) *arkAPI {
	if dial == nil {
		return &arkAPI{}
	}
	t := &http.Transport{
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
	return &arkAPI{transport: t}
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
	timeout := assetCallTimeout
	if dl, ok := ctx.Deadline(); ok {
		if left := time.Until(dl); left < timeout {
			timeout = left
		}
	}
	if timeout <= 0 {
		return nil, &ArkError{Action: action, Code: "Canceled", Message: "deadline exceeded"}
	}
	sess, err := session.NewSession(volcengine.NewConfig().
		WithCredentials(credentials.NewStaticCredentials(cfg.AccessKey, cfg.SecretKey, "")).
		WithRegion(cfg.Region).
		WithEndpoint(cfg.BaseURL).
		// The tunnelled client. Without it the SDK would build its own
		// transport and dial directly, which strict network mode kills.
		WithHTTPClient(&http.Client{Transport: a.transport, Timeout: timeout}).
		WithMaxRetries(assetMaxRetries))
	if err != nil {
		return nil, &ArkError{Action: action, Code: "InternalError", Message: err.Error()}
	}
	// The SDK keeps the pointer to this map and marshals it as the request
	// body, so it gets a copy instead of the caller's map.
	input := make(map[string]any, len(body)+1)
	for k, v := range body {
		input[k] = v
	}
	out, err := universal.New(sess).DoCall(universal.RequestUniversal{
		ServiceName: AssetServiceName,
		Action:      action,
		Version:     AssetAPIVersion,
		HttpMethod:  universal.POST,
		ContentType: universal.ApplicationJSON,
	}, &input)
	if err != nil {
		return nil, arkErrorFrom(action, err)
	}
	result := map[string]any{}
	if out != nil {
		if r, ok := (*out)["Result"].(map[string]any); ok {
			result = r
		}
	}
	return result, nil
}

func knownAction(a string) bool {
	for _, k := range AssetActions {
		if k == a {
			return true
		}
	}
	return false
}

// arkErrorFrom maps an SDK error onto ArkError. The message is not passed to
// clients verbatim anywhere it could carry a credential: the SDK puts the
// request id and the upstream message in it, never the secret.
func arkErrorFrom(action string, err error) *ArkError {
	var failure volcengineerr.RequestFailure
	if errors.As(err, &failure) {
		return &ArkError{Action: action, Status: failure.StatusCode(), Code: failure.Code(), Message: failure.Message()}
	}
	var sdkErr volcengineerr.Error
	if errors.As(err, &sdkErr) {
		return &ArkError{Action: action, Code: sdkErr.Code(), Message: sdkErr.Message()}
	}
	return &ArkError{Action: action, Code: "InternalError", Message: err.Error()}
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
