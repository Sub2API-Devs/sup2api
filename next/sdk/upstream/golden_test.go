package upstream

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"testing"
	"time"

	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/platforms"
)

// The golden files (testdata/golden/<plugin>.json, docs/UPSTREAM-DECLARATIVE.md
// §7) hold what the four code plugins the presets replace (openai,
// anthropic, gemini, relay) answered for an input matrix, recorded before
// their platform code was removed. They are frozen: the engine must keep
// answering every recorded input the same.

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

// goldenFile is the content of one golden file.
type goldenFile struct {
	Plugin      string         `json:"plugin"`
	AccountType string         `json:"account_type"`
	Cases       []goldenResult `json:"cases"`
}

// goldenResult is one recorded case: Input and Output are the request and
// answer messages in proto JSON (Output null on error), Error a gRPC status
// (Code is codes.Code.String()), Now the clock of a classify case.
type goldenResult struct {
	Name   string          `json:"name"`
	Kind   string          `json:"kind"`
	Now    string          `json:"now,omitempty"`
	Input  json.RawMessage `json:"input"`
	Output json.RawMessage `json:"output"`
	Error  *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// goldenKind binds a case kind to its request type and Profile entry point.
type goldenKind struct {
	newInput func() proto.Message
	call     func(*Profile, time.Time, proto.Message) (proto.Message, error)
}

func goldenOp[Req, Resp proto.Message](f func(*Profile, time.Time, Req) (Resp, error)) goldenKind {
	return goldenKind{
		newInput: func() proto.Message {
			var zero Req
			return zero.ProtoReflect().New().Interface()
		},
		call: func(p *Profile, now time.Time, in proto.Message) (proto.Message, error) { return f(p, now, in.(Req)) },
	}
}

var goldenKinds = map[string]goldenKind{
	"build": goldenOp(func(p *Profile, _ time.Time, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
		return p.Build(in)
	}),
	"test": goldenOp(func(p *Profile, _ time.Time, in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
		return p.Test(in)
	}),
	"models": goldenOp(func(p *Profile, _ time.Time, in *pluginv1.BuildModelsRequestRequest) (*pluginv1.BuildModelsRequestResponse, error) {
		return p.Models(in)
	}),
	"validate": goldenOp(func(p *Profile, _ time.Time, in *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
		return p.Validate(in), nil
	}),
	"classify": goldenOp(func(p *Profile, now time.Time, in *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
		return p.Classify(now, in), nil
	}),
}

// wrapped matches the prefixes the plugins put around an engine-level
// message: "account N: " and a nested gRPC status ("rpc error: code = X
// desc = ").
var wrapped = regexp.MustCompile(`^(account -?\d+: )?(rpc error: code = \w+ desc = )?`)

// TestGolden replays the recorded cases against the engine. The rules:
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
			b, err := os.ReadFile(filepath.Join("testdata", "golden", plugin+".json"))
			if err != nil {
				t.Fatal(err)
			}
			var want goldenFile
			if err := json.Unmarshal(b, &want); err != nil {
				t.Fatal(err)
			}
			if len(want.Cases) == 0 {
				t.Fatal("the golden file has no cases")
			}
			for _, r := range want.Cases {
				compareGolden(t, plugin, gt.accountType, p, r)
			}
		})
	}
}

func compareGolden(t *testing.T, plugin, accountType string, p *Profile, want goldenResult) {
	t.Helper()
	k, ok := goldenKinds[want.Kind]
	if !ok {
		t.Fatalf("%s: unknown kind %q", want.Name, want.Kind)
	}
	in := k.newInput()
	if err := protojson.Unmarshal(want.Input, in); err != nil {
		t.Fatalf("%s: input: %v", want.Name, err)
	}
	if a, ok := in.(interface{ GetAccount() *pluginv1.Account }); ok {
		if typ := a.GetAccount().GetType(); typ != "" && typ != accountType {
			return
		}
	}
	var now time.Time
	if want.Now != "" {
		var err error
		if now, err = time.Parse(time.RFC3339, want.Now); err != nil {
			t.Fatalf("%s: now: %v", want.Name, err)
		}
	}
	out, err := k.call(p, now, in)
	switch {
	case want.Error != nil && err == nil:
		t.Errorf("%s: no error, want %s", want.Name, want.Error.Message)
	case want.Error != nil:
		if w, g := wrapped.ReplaceAllString(want.Error.Message, ""), status.Convert(err).Message(); w != g {
			t.Errorf("%s: error %q, want %q", want.Name, g, w)
		}
	case err != nil:
		t.Errorf("%s: error %v, want none", want.Name, err)
	default:
		w := compactJSON(t, want.Output)
		if plugin == "relay" && want.Kind == "test" {
			w = relayTestOutput(t, want.Output, marshalGolden(t, out))
		}
		if g := marshalGolden(t, out); !bytes.Equal(w, g) {
			t.Errorf("%s:\n got %s\nwant %s", want.Name, g, w)
		}
	}
}

// marshalGolden encodes m as the golden files do: proto JSON with proto
// field names, re-encoded through encoding/json (sorted keys, no HTML
// escaping, compact).
func marshalGolden(t *testing.T, m proto.Message) []byte {
	t.Helper()
	b, err := protojson.MarshalOptions{UseProtoNames: true}.Marshal(m)
	if err != nil {
		t.Fatal(err)
	}
	dec := json.NewDecoder(bytes.NewReader(b))
	dec.UseNumber()
	var v any
	if err := dec.Decode(&v); err != nil {
		t.Fatal(err)
	}
	return encodeGolden(t, v)
}

func encodeGolden(t *testing.T, v any) []byte {
	t.Helper()
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		t.Fatal(err)
	}
	return bytes.TrimSuffix(buf.Bytes(), []byte("\n"))
}

// compactJSON drops the golden file's indentation.
func compactJSON(t *testing.T, raw json.RawMessage) []byte {
	t.Helper()
	var buf bytes.Buffer
	if err := json.Compact(&buf, raw); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

// relayTestOutput is relay's recorded test answer with the engine's model
// and usage_protocol added (the allowed deviation).
func relayTestOutput(t *testing.T, want, got json.RawMessage) []byte {
	t.Helper()
	var w, g map[string]any
	if err := json.Unmarshal(want, &w); err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(got, &g); err != nil {
		t.Fatal(err)
	}
	w["model"], w["usage_protocol"] = g["model"], g["usage_protocol"]
	return encodeGolden(t, w)
}
