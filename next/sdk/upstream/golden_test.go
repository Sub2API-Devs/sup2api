package upstream

import (
	"bytes"
	"encoding/json"
	"regexp"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/platforms"
	"github.com/Sub2API-Devs/sup2api/next/sdk/upstream/goldentest"
)

// goldenTypes are the account types of the four code plugins as their
// rewritten manifests declare them (docs/UPSTREAM-DECLARATIVE.md §6): the
// preset, no default body filter, and relay's differences from the
// anthropic preset (base URL required, its wording, its two client headers,
// no default protocol).
var goldenTypes = map[string]struct {
	accountType string
	upstream    string
	passHeaders []string
}{
	"openai":    {"apikey", `{"preset":"openai","filterFields":[]}`, builtinPassHeaders("openai")},
	"anthropic": {"apikey", `{"preset":"anthropic","filterFields":[]}`, builtinPassHeaders("anthropic")},
	"gemini":    {"apikey", `{"preset":"gemini","filterFields":[]}`, builtinPassHeaders("gemini")},
	"relay": {"relay_key", `{
		"preset": "anthropic",
		"baseURL": {"default": null, "required": true},
		"credentials": {"texts": {"baseURLRequired": "Base URL of the relay is required / 请填写中转站的 Base URL"}},
		"defaultProtocol": null,
		"filterFields": []
	}`, []string{"anthropic-version", "anthropic-beta"}},
}

func builtinPassHeaders(platform string) []string {
	for _, p := range platforms.Builtin() {
		if p.ID == platform {
			return p.PassHeaders
		}
	}
	panic("no builtin platform " + platform)
}

// subject adapts a Profile to goldentest.Subject.
type subject struct{ p *Profile }

func (s subject) Validate(in *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	return s.p.Validate(in), nil
}
func (s subject) Build(in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	return s.p.Build(in)
}
func (s subject) Test(in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	return s.p.Test(in)
}
func (s subject) Models(in *pluginv1.BuildModelsRequestRequest) (*pluginv1.BuildModelsRequestResponse, error) {
	return s.p.Models(in)
}
func (s subject) Classify(now time.Time, in *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
	return s.p.Classify(now, in), nil
}

// wrapped matches the prefixes the plugins put around an engine-level
// message: "account N: " and a nested gRPC status ("rpc error: code = X
// desc = ").
var wrapped = regexp.MustCompile(`^(account -?\d+: )?(rpc error: code = \w+ desc = )?`)

// TestGolden replays the cases recorded from the four code plugins
// (goldentest) against the engine. The rules:
//
//   - validate and classify answers, and every successful build, test and
//     models answer, must be identical;
//   - where the plugin failed, the engine must fail too, with the plugin's
//     message once the plugin's own wrapping is removed (anthropic's
//     "account N: rpc error: ... desc = ", relay's missing account prefix
//     only shows on the type mismatch below); the gRPC code is not
//     compared: the core treats every build error the same way;
//   - account type mismatches are skipped: the core binds a profile per
//     account type, so a declarative type never sees another type's account;
//   - relay's test request now carries model and usage_protocol, which the
//     plugin left empty (the only allowed deviation: the console shows the
//     model tested and reports usage, as for every other type).
func TestGolden(t *testing.T) {
	for plugin, gt := range goldenTypes {
		t.Run(plugin, func(t *testing.T) {
			at := &manifest.AccountType{ID: gt.accountType, Upstream: &manifest.Upstream{}}
			if err := json.Unmarshal([]byte(gt.upstream), at.Upstream); err != nil {
				t.Fatal(err)
			}
			p, err := Resolve(at, gt.passHeaders, nil)
			if err != nil {
				t.Fatal(err)
			}
			want, err := goldentest.Load(plugin)
			if err != nil {
				t.Fatal(err)
			}
			for _, r := range want.Cases {
				compareGolden(t, plugin, gt.accountType, subject{p}, r)
			}
		})
	}
}

func compareGolden(t *testing.T, plugin, accountType string, s subject, want goldentest.Result) {
	t.Helper()
	c, err := want.Case()
	if err != nil {
		t.Fatal(err)
	}
	if typ := caseAccount(c).GetType(); typ != "" && typ != accountType {
		return
	}
	got, err := goldentest.Run(s, c)
	if err != nil {
		t.Fatal(err)
	}
	switch {
	case want.Error != nil && got.Error == nil:
		t.Errorf("%s: no error, want %s", want.Name, want.Error.Message)
	case want.Error != nil:
		if w := wrapped.ReplaceAllString(want.Error.Message, ""); w != got.Error.Message {
			t.Errorf("%s: error %q, want %q", want.Name, got.Error.Message, w)
		}
	case got.Error != nil:
		t.Errorf("%s: error %s, want none", want.Name, got.Error.Message)
	default:
		w := compactJSON(t, want.Output)
		if plugin == "relay" && want.Kind == goldentest.KindTest {
			w = relayTestOutput(t, want.Output, got.Output)
		}
		if g := compactJSON(t, got.Output); !bytes.Equal(w, g) {
			t.Errorf("%s:\n got %s\nwant %s", want.Name, g, w)
		}
	}
}

// compactJSON drops the golden file's indentation; both sides are encoded
// by goldentest.Marshal (sorted keys, no HTML escaping), so the compact
// forms compare byte for byte.
func compactJSON(t *testing.T, raw json.RawMessage) []byte {
	var buf bytes.Buffer
	if err := json.Compact(&buf, raw); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

// relayTestOutput is relay's recorded test answer with the engine's model
// and usage_protocol added (the allowed deviation), re-encoded like
// goldentest.Marshal.
func relayTestOutput(t *testing.T, want, got json.RawMessage) []byte {
	var w, g map[string]any
	if err := json.Unmarshal(want, &w); err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(got, &g); err != nil {
		t.Fatal(err)
	}
	w["model"], w["usage_protocol"] = g["model"], g["usage_protocol"]
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(w); err != nil {
		t.Fatal(err)
	}
	return bytes.TrimSuffix(buf.Bytes(), []byte("\n"))
}

func caseAccount(c goldentest.Case) *pluginv1.Account {
	switch in := c.Input.(type) {
	case *pluginv1.BuildUpstreamRequestRequest:
		return in.GetAccount()
	case *pluginv1.BuildTestRequestRequest:
		return in.GetAccount()
	case *pluginv1.BuildModelsRequestRequest:
		return in.GetAccount()
	}
	return nil
}
