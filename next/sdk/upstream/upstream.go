// Package upstream is the engine of declared upstreams
// (docs/UPSTREAM-DECLARATIVE.md §3): it resolves an account type's
// accountTypes[].upstream against its core preset and builds what a platform
// plugin would answer - credential validation, the upstream request, the test
// and model listing requests, the error classification - from the
// declaration alone. The core runs it in place of a plugin process; the
// packaging CLI and plugin tests run the same code through manifest/check,
// so a declaration that checks here behaves the same in the core.
//
// It is pure computation over the plugin protocol messages: no I/O, no
// state beyond the resolved declaration.
package upstream

import (
	"bytes"
	"encoding/json"
	"fmt"
	"maps"
	"slices"
	"strings"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/paramoverride"
	presets "github.com/Sub2API-Devs/sup2api/next/sdk/platforms/upstream"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/apikey"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/classify"
)

// SettingsField is the account settings field holding the account layer of
// a type declaring accountConfig (§2.3).
const SettingsField = "upstream"

// Profile is a resolved declaration: preset, manifest and optionally an
// account layer merged, checked and ready to build requests. It is
// immutable and safe for concurrent use.
type Profile struct {
	accountType string
	passHeaders []string
	// layer is the merged declaration as a JSON object: an account layer is
	// merged onto it.
	layer    map[string]any
	up       manifest.Upstream
	spec     apikey.Spec
	policy   classify.Policy
	override *paramoverride.Override
	// allow are the filterFields the account layer lets through.
	allow []string
	// layered marks a profile with an account layer applied: forAccount
	// applies no further one.
	layered bool
}

// Resolve merges the preset named by at.Upstream, the declaration itself
// and, when account is not empty, an account layer (the value of the
// account's settings field "upstream", only for accountConfig types), and
// checks the result. passHeaders are the client headers the account type
// receives (accountTypes[].platforms[].passHeaders, else the platforms'):
// the request carries those only, and {client_header.<name>} may read them.
// Problems are reported as Problems.
func Resolve(at *manifest.AccountType, passHeaders []string, account json.RawMessage) (*Profile, error) {
	if at == nil || at.Upstream == nil {
		return nil, Problems{{Path: "", Code: "required", Message: "the account type declares no upstream"}}
	}
	if at.Upstream.Preset == "" {
		return nil, Problems{{Path: "preset", Code: "required", Message: "preset is required (openai, anthropic or gemini)"}}
	}
	preset, ok := presets.Preset(at.Upstream.Preset)
	if !ok {
		return nil, Problems{{Path: "preset", Code: "unknown", Message: fmt.Sprintf("unknown preset %q (openai, anthropic or gemini)", at.Upstream.Preset)}}
	}
	layer := map[string]any{}
	for _, raw := range []json.RawMessage{preset.Layer(), at.Upstream.Layer()} {
		patch, err := decodeObject(raw)
		if err != nil {
			return nil, Problems{{Code: "invalid", Message: "upstream must be a JSON object"}}
		}
		layer = merge(layer, patch, false)
	}
	p, probs := newProfile(at.ID, passHeaders, layer)
	if len(probs) == 0 {
		var errs []paramoverride.FieldError
		p.override, errs = paramoverride.Compile("paramOverride", p.up.ParamOverride, false)
		for _, e := range errs {
			probs = append(probs, Problem{Path: e.Field, Code: e.Code, Message: e.Message})
		}
	}
	if len(probs) > 0 {
		return nil, probs
	}
	if len(account) == 0 {
		return p, nil
	}
	return p.withAccount(account)
}

// newProfile decodes and checks a merged layer.
func newProfile(accountType string, passHeaders []string, layer map[string]any) (*Profile, Problems) {
	b, _ := json.Marshal(layer)
	// A type without manifest.Upstream's UnmarshalJSON, so that unknown
	// fields (a misspelt key would silently change requests) are rejected.
	type strict manifest.Upstream
	var st strict
	dec := json.NewDecoder(bytes.NewReader(b))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&st); err != nil {
		return nil, Problems{{Code: "invalid", Message: err.Error()}}
	}
	up := manifest.Upstream(st)
	if probs := check(&up, passHeaders); len(probs) > 0 {
		return nil, probs
	}
	return &Profile{
		accountType: accountType,
		passHeaders: passHeaders,
		layer:       layer,
		up:          up,
		spec:        specOf(accountType, &up),
		policy:      policies[up.Classify],
	}, nil
}

// specOf is the apikey.Spec the declaration describes.
func specOf(accountType string, up *manifest.Upstream) apikey.Spec {
	s := apikey.Spec{AccountType: accountType}
	if b := up.BaseURL; b != nil {
		s.DefaultBaseURL, s.StripSuffixes, s.RequireBaseURL = b.Default, b.StripSuffixes, b.Required
	}
	if c := up.Credentials; c != nil {
		if kv := c.KeyValidator; kv != nil {
			s.KeyValidator = &apikey.Validator{Prefixes: kv.Prefixes, MinLength: kv.MinLength, Field: "api_key"}
		}
		if c.Texts != nil {
			s.Texts = apikey.Texts(*c.Texts)
		}
	}
	return s
}

// Upstream returns the resolved declaration (without an account layer
// unless Resolve was given one): what the console offers as the defaults of
// an account layer, and the flags (extend, accountConfig) the core binds by.
// Its maps are the profile's: read them, do not modify them.
func (p *Profile) Upstream() manifest.Upstream { return p.up }

// AuthHeader is the lower-case name of the header auth writes for acc
// (empty for query or no auth). The core writes it last, after every other
// header source, so nothing but the declaration decides the credential the
// upstream receives (§0.2, §4.3). It takes the account because an account
// layer may rename it; an invalid account layer gives "" (Build refuses
// that account).
func (p *Profile) AuthHeader(acc *pluginv1.Account) string {
	ap, err := p.forAccount(acc)
	if err != nil || ap.up.Auth == nil || ap.up.Auth.Type != manifest.UpstreamAuthHeader {
		return ""
	}
	return strings.ToLower(ap.up.Auth.Name)
}

// ForAccount is the profile of acc: p with the account layer stored in
// acc's settings (or credentials) applied when the declaration takes one,
// otherwise p itself. The result applies no further layer, so a caller may
// keep it for as long as acc's settings and credentials are unchanged and
// call it with acc instead of resolving the layer on every call.
func (p *Profile) ForAccount(acc *pluginv1.Account) (*Profile, error) { return p.forAccount(acc) }

// forAccount applies the account layer stored in acc's settings (or
// credentials) when the declaration takes one; otherwise it is p itself.
func (p *Profile) forAccount(acc *pluginv1.Account) (*Profile, error) {
	if !p.up.AccountConfig || acc == nil || p.layered {
		return p, nil
	}
	raw, err := accountLayer(acc.GetCredentialsJson(), acc.GetSettingsJson())
	if err != nil || raw == nil {
		return p, err
	}
	ap, err := p.withAccount(raw)
	if err != nil {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: invalid upstream settings: %v", acc.GetId(), err)
	}
	return ap, nil
}

// accountLayer reads the account layer from settings, else credentials (the
// order apikey.Spec reads base_url in). nil when there is none.
func accountLayer(credentials, settings string) (json.RawMessage, error) {
	creds, err := apikey.DecodeObject(credentials)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid credentials JSON: %v", err)
	}
	set, err := apikey.DecodeObject(settings)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid settings JSON: %v", err)
	}
	v, ok := apikey.Lookup(SettingsField, set, creds)
	if !ok {
		return nil, nil
	}
	b, _ := json.Marshal(v)
	return b, nil
}

// withAccount merges an account layer onto p. The layer may only write
// auth, headers, the path of existing routes and allowFields (§2.3): the
// rest - credentials, classification, transports, patches, the fixed
// rewrite - is the account type's contract with its upstream.
func (p *Profile) withAccount(raw json.RawMessage) (*Profile, error) {
	patch, err := decodeObject(raw)
	if err != nil {
		return nil, Problems{{Code: "invalid", Message: "the account upstream must be a JSON object"}}
	}
	allow, probs := p.accountPatch(patch)
	if len(probs) > 0 {
		return nil, probs
	}
	delete(patch, "allowFields")
	ap, probs := newProfile(p.accountType, p.passHeaders, merge(p.layer, patch, false))
	if len(probs) > 0 {
		return nil, probs
	}
	ap.override, ap.allow, ap.layered = p.override, allow, true
	return ap, nil
}

// accountPatch checks the shape of an account layer and returns its
// allowFields.
func (p *Profile) accountPatch(patch map[string]any) ([]string, Problems) {
	var probs Problems
	bad := func(path, msg string) { probs = append(probs, Problem{Path: path, Code: "not_allowed", Message: msg}) }
	var allow []string
	for _, k := range sortedKeys(patch) {
		switch k {
		case "auth", "headers":
		case "routes":
			routes, ok := patch[k].(map[string]any)
			if !ok {
				bad(k, "routes must be an object of protocol to {\"path\": ...}")
				continue
			}
			for _, proto := range sortedKeys(routes) {
				r, ok := routes[proto].(map[string]any)
				switch {
				case p.up.Routes[proto] == nil:
					bad("routes."+proto, "an account can only change the path of a route the account type declares")
				case !ok || len(r) != 1 || r["path"] == nil:
					bad("routes."+proto, "an account can only change the path of a route")
				}
			}
		case "allowFields":
			list, _ := patch[k].([]any)
			for _, f := range list {
				s, _ := f.(string)
				if !slices.Contains(p.up.FilterFields, s) {
					bad(k, fmt.Sprintf("%v is not a filtered field of the account type", f))
				}
				allow = append(allow, s)
			}
			if list == nil && patch[k] != nil {
				bad(k, "allowFields must be a list of field names")
			}
		default:
			bad(k, "an account can only set auth, headers, route paths and allowFields")
		}
	}
	return allow, probs
}

// merge applies patch onto base like a JSON merge patch (RFC 7386): objects
// merge by key, null deletes, anything else replaces. A header write (an
// entry of a "headers" object) and paramOverride are replaced whole: their
// keys are a choice of mode, not fields to combine. A null header write is
// kept as a tombstone, so that a route's null also removes the shared write
// of that header when the two are combined (call.headers). base is not
// modified.
func merge(base, patch map[string]any, headers bool) map[string]any {
	out := maps.Clone(base)
	if out == nil {
		out = map[string]any{}
	}
	for k, pv := range patch {
		po, isObj := pv.(map[string]any)
		switch {
		case pv == nil && !headers:
			delete(out, k)
		case !isObj || headers || k == "paramOverride":
			out[k] = pv
		default:
			bo, _ := out[k].(map[string]any)
			out[k] = merge(bo, po, k == "headers")
		}
	}
	return out
}

func decodeObject(raw json.RawMessage) (map[string]any, error) {
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil || m == nil {
		return nil, fmt.Errorf("not a JSON object")
	}
	return m, nil
}
