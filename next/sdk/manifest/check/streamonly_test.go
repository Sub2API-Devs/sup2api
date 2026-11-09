package check

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func TestAccountStreamOnly(t *testing.T) {
	own := &manifest.Platform{ID: "mine", Endpoints: []manifest.Endpoint{
		{ID: "gen", Protocol: "mine.gen", Kind: manifest.EndpointKindProxy,
			Request: manifest.EndpointRequest{StreamPath: "stream"}, Response: manifest.EndpointResp{Stream: "sse", NonStream: "json"}},
		{ID: "json", Protocol: "mine.json", Kind: manifest.EndpointKindProxy, Response: manifest.EndpointResp{NonStream: "json"}},
		{ID: "always", Protocol: "mine.always", Kind: manifest.EndpointKindProxy,
			Request: manifest.EndpointRequest{Stream: true}, Response: manifest.EndpointResp{Stream: "sse"}},
	}}
	for _, tc := range []struct {
		name      string
		platform  string
		endpoints []string
		protos    []string
		tooling   bool
		code      string
	}{
		{"absent", "openai", nil, nil, false, ""},
		{"responses", "openai", nil, []string{"openai.responses"}, false, ""},
		{"chat and responses", "openai", nil, []string{"openai.chat", "openai.responses"}, false, ""},
		{"subset", "openai", []string{"responses", "responses_websocket"}, []string{"openai.responses"}, false, ""},
		{"empty", "openai", nil, []string{}, false, "required"},
		{"blank", "openai", nil, []string{" "}, false, "required"},
		{"duplicate", "openai", nil, []string{"openai.responses", "openai.responses"}, false, "duplicate"},
		{"other platform", "openai", nil, []string{"anthropic.messages"}, false, "unknown_protocol"},
		{"outside subset", "openai", []string{"responses"}, []string{"openai.chat"}, false, "unknown_protocol"},
		{"websocket", "openai", nil, []string{"openai.responses_ws"}, false, "not_streamable"},
		{"json only", "openai", nil, []string{"openai.embeddings"}, false, "not_streamable"},
		{"own", "mine", nil, []string{"mine.gen"}, false, ""},
		{"own without stream path", "mine", nil, []string{"mine.always"}, false, "not_streamable"},
		{"own json", "mine", nil, []string{"mine.json"}, false, "not_streamable"},
		{"external", "video", nil, []string{"video.generate"}, false, ""},
		{"missing platform", "missing", nil, []string{"missing.gen"}, false, "unknown_platform"},
		{"missing platform offline", "missing", nil, []string{"missing.gen"}, true, ""},
		{"missing platform offline foreign", "missing", nil, []string{"other.gen"}, true, "unknown_protocol"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			v := validator{opt: ValidateOptions{Tooling: tc.tooling, OtherPlatforms: []PlatformOwner{{ID: "video", Endpoints: []manifest.Endpoint{{
				ID: "generate", Protocol: "video.generate", Kind: manifest.EndpointKindProxy,
				Request: manifest.EndpointRequest{StreamPath: "stream"}, Response: manifest.EndpointResp{Stream: "sse"}}}}}}}
			var p *manifest.Platform
			if tc.platform == "mine" {
				p = own
			}
			v.accountStreamOnly("platforms[0]", manifest.AccountPlatform{Platform: tc.platform, Endpoints: tc.endpoints, StreamOnly: tc.protos}, p)
			if tc.code == "" {
				if len(v.errs) != 0 {
					t.Fatalf("unexpected errors: %+v", v.errs)
				}
				return
			}
			if len(v.errs) != 1 || v.errs[0].Code != tc.code {
				t.Fatalf("errors = %+v, want %s", v.errs, tc.code)
			}
		})
	}
}

func TestAccountPlatformStreamsOnly(t *testing.T) {
	ap := manifest.AccountPlatform{Platform: "openai", StreamOnly: []string{"openai.responses"}}
	if !ap.StreamsOnly("openai.responses") || ap.StreamsOnly("openai.chat") || (manifest.AccountPlatform{}).StreamsOnly("openai.responses") {
		t.Fatal("StreamsOnly")
	}
}

// accountPlatform runs the streamOnly check for every account type entry.
func TestAccountPlatformChecksStreamOnly(t *testing.T) {
	v := validator{}
	v.accountPlatform("accountTypes[0].platforms[0]", manifest.AccountPlatform{Platform: "openai", StreamOnly: []string{"openai.responses_ws"}}, map[string]bool{}, nil)
	if len(v.errs) != 1 || v.errs[0].Field != "accountTypes[0].platforms[0].streamOnly[0]" || v.errs[0].Code != "not_streamable" {
		t.Fatalf("errors = %+v", v.errs)
	}
}

func floorManifest(hostCompat string, ap manifest.AccountPlatform) *manifest.Manifest {
	m := minimal()
	m.HostCompat = hostCompat
	m.AccountTypes = []manifest.AccountType{{ID: "chatgpt", Label: manifest.LocalizedText{"en": "ChatGPT"}, Platforms: []manifest.AccountPlatform{ap}}}
	return m
}

// A manifest relying on streamOnly or a same-platform conversion must keep
// out the cores that ignore it (CONTRACTS §83.4).
func TestCoreFloors(t *testing.T) {
	last, ok := previousPatch(StreamOnlyFirstCore)
	if !ok {
		t.Fatalf("placeholder %s has no previous patch", StreamOnlyFirstCore)
	}
	streamOnly := manifest.AccountPlatform{Platform: "openai", StreamOnly: []string{"openai.responses"}}
	responsesOnly := manifest.AccountPlatform{Platform: "openai", Endpoints: []string{"responses"}}
	chatOnly := manifest.AccountPlatform{Platform: "openai", Endpoints: []string{"chat_completions"}}
	for _, tc := range []struct {
		name, hostCompat string
		ap               manifest.AccountPlatform
		refused          bool
	}{
		{"streamOnly old range", ">=0.1.0 <0.2.0", streamOnly, true},
		{"streamOnly last core", ">=" + last + " <0.2.0", streamOnly, true},
		{"streamOnly first core", ">=" + StreamOnlyFirstCore + " <0.2.0", streamOnly, false},
		{"same-platform conversion old range", ">=0.1.0 <0.2.0", responsesOnly, true},
		{"same-platform conversion first core", ">=" + StreamOnlyFirstCore + " <0.2.0", responsesOnly, false},
		// responses -> chat came with the conversion matrix (§88).
		{"responses via chat before the matrix", ">=" + StreamOnlyFirstCore + " <0.2.0", chatOnly, true},
		{"responses via chat matrix core", ">=" + ConvertMatrixFirstCore + " <0.2.0", chatOnly, false},
		{"chat kept", ">=0.1.0 <0.2.0", manifest.AccountPlatform{Platform: "openai", Endpoints: []string{"responses", "chat_completions"}}, false},
		{"no subset", ">=0.1.0 <0.2.0", manifest.AccountPlatform{Platform: "openai"}, false},
		{"no converter", ">=0.1.0 <0.2.0", manifest.AccountPlatform{Platform: "openai", Endpoints: []string{"embeddings"}}, false},
	} {
		v := &validator{m: floorManifest(tc.hostCompat, tc.ap)}
		v.checkCoreFloors()
		got := len(v.errs) > 0
		if got != tc.refused || (got && (v.errs[0].Field != "hostCompat" || v.errs[0].Code != "below_feature_core")) {
			t.Errorf("%s: errors %+v", tc.name, v.errs)
		}
	}
	// The whole validation runs it.
	c := codes(Validate(floorManifest(">=0.1.0 <0.2.0", streamOnly), nil, ValidateOptions{Tooling: true}))
	if c["hostCompat"] != "below_feature_core" {
		t.Fatalf("Validate: %v", c)
	}
}
