package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
)

func TestNativeToolsRequireExactVerifiedDefinition(t *testing.T) {
	known, ok := verifiedNativeTools["Read"]
	if !ok || known.Description == "" || known.Schema == nil {
		t.Fatal("missing verified Read definition")
	}
	for _, tc := range []struct {
		name    string
		version string
		optIn   bool
		change  func(*Tool)
		matched bool
	}{
		{"exact", "2.1.288", true, nil, true},
		{"automatic", "2.1.288", false, nil, true},
		{"deferred", "2.1.288", false, func(tool *Tool) { value := true; tool.DeferLoading = &value }, true},
		{"unknown-version", "2.1.289", true, nil, false},
		{"description", "2.1.288", true, func(tool *Tool) { tool.Description += " Client override" }, true},
		{"empty-description", "2.1.288", false, func(tool *Tool) { tool.Description = "" }, true},
		{"description-whitespace", "2.1.288", true, func(tool *Tool) { tool.Description += " " }, true},
		{"parameter-description", "2.1.288", true, func(tool *Tool) {
			tool.Schema["properties"].(map[string]any)["file_path"].(map[string]any)["description"] = "different"
		}, false},
		{"schema", "2.1.288", true, func(tool *Tool) { tool.Schema["additionalProperties"] = true }, false},
		{"unknown-name", "2.1.288", true, func(tool *Tool) { tool.Name = "ClientRead" }, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			data, _ := json.Marshal(known)
			var tool Tool
			if err := json.Unmarshal(data, &tool); err != nil {
				t.Fatal(err)
			}
			if tc.change != nil {
				tc.change(&tool)
			}
			before := digest(tool)
			r := &Request{Tools: []Tool{tool}, Native: map[string]bool{tool.Name: tc.optIn}}
			matchNativeTools(r, tc.version)
			if r.Native[tool.Name] != tc.matched {
				t.Fatalf("native match=%v, want %v", r.Native, tc.matched)
			}
			if digest(r.Tools[0]) != before {
				t.Fatal("matching changed the client definition")
			}
			wantName := "mcp__ccgateway__" + tool.Name
			if tc.matched {
				wantName = tool.Name
			}
			if r.wireName(tool.Name) != wantName {
				t.Fatalf("wire name=%q, want %q", r.wireName(tool.Name), wantName)
			}
		})
	}
}

func TestNativeDefinitionsCheckedAtWireBoundary(t *testing.T) {
	read := verifiedNativeTools["Read"]
	r := &Request{Tools: []Tool{read}}
	matchNativeTools(r, "2.1.288")
	for _, tc := range []struct {
		name   string
		change func(Object)
		fail   bool
	}{
		{"exact", func(Object) {}, false},
		{"cache-control", func(v Object) { v["tools"].([]any)[0].(Object)["cache_control"] = Object{"type": "ephemeral"} }, false},
		{"missing", func(v Object) { v["tools"] = []any{} }, true},
		{"duplicate", func(v Object) { v["tools"] = append(v["tools"].([]any), v["tools"].([]any)[0]) }, true},
		{"schema-drift", func(v Object) { v["tools"].([]any)[0].(Object)["input_schema"].(Object)["required"] = []any{} }, true},
		{"description-drift", func(v Object) { v["tools"].([]any)[0].(Object)["description"] = "different" }, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			data, _ := json.Marshal(Object{"tools": []Tool{read}})
			v, _ := decodeObject(data)
			tc.change(v)
			if err := verifyNativeWireTools(r, v); (err != nil) != tc.fail {
				t.Fatalf("error=%v", err)
			}
		})
	}
	// tool_choice:none is allowed to omit every tool.
	r.NoTools = true
	if err := verifyNativeWireTools(r, Object{}); err != nil {
		t.Fatal(err)
	}
}

func TestNative21292CatalogVariantsAndMixedNames(t *testing.T) {
	catalogue := verifiedNativeToolCatalogues["2.1.292"]
	for _, name := range []string{"Read", "Bash", "Write", "Edit", "Glob", "Grep"} {
		variants := catalogue[name]
		if len(variants) == 0 {
			t.Fatalf("missing captured %s", name)
		}
		for _, known := range variants {
			data, _ := json.Marshal(known)
			var client Tool
			if err := json.Unmarshal(data, &client); err != nil {
				t.Fatal(err)
			}
			r := &Request{Tools: []Tool{client, {Name: "mcp__files__lookup", Schema: Object{"type": "object"}}, {Name: "custom", Schema: Object{"type": "object"}}}}
			matchNativeTools(r, "2.1.292")
			if !r.Native[name] || r.wireName(name) != name || r.wireName("mcp__files__lookup") != "mcp__files__lookup" || r.wireName("custom") != "mcp__ccgateway__custom" {
				t.Fatal("incorrect mixed native mapping", name, r.Native)
			}
			client.Description += " Client override"
			r.Tools[0] = client
			matchNativeTools(r, "2.1.292")
			if !r.Native[name] || r.wireName(name) != name {
				t.Fatalf("changed %s description lost schema-compatible native identity", name)
			}
			client.Description = known.Description
			client.Schema["x-client-different-definition"] = true
			r.Tools[0] = client
			matchNativeTools(r, "2.1.292")
			if r.Native[name] {
				t.Fatalf("changed %s schema retained native identity", name)
			}
		}
	}
	for _, name := range []string{"Agent", "SendMessage"} {
		if len(catalogue[name]) < 2 {
			t.Fatal("capture variants collapsed", name)
		}
		for _, tool := range catalogue[name] {
			r := &Request{Tools: []Tool{tool}}
			matchNativeTools(r, "2.1.292")
			if !r.Native[name] {
				t.Fatal("captured variant was not matched", name)
			}
		}
	}
	read := catalogue["Read"][0]
	r := &Request{Tools: []Tool{read}}
	matchNativeTools(r, "2.1.293")
	if len(r.Native) != 0 {
		t.Fatal("unverified version reused catalogue")
	}
}

func TestNativeProfilesSelectOneCompleteConfiguration(t *testing.T) {
	base := newCLIToolProfile("named", "default")
	teams := newCLIToolProfile("teams", "default")
	teams.Env["CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"] = "1"
	plan := newCLIToolProfile("plan", "plan")
	definition := func(name, kind string, profiles ...cliToolProfile) Tool {
		return Tool{Name: name, Description: "original", Schema: Object{"type": "object", "properties": Object{kind: Object{"type": "string", "description": "unchanged parameter description"}}}, Metadata: Object{"catalog_profiles": profiles}}
	}
	read := definition("Read", "file_path", base, teams, plan)
	agent := definition("Agent", "team_name", teams)
	plainTasks := definition("TaskList", "plain", base)
	teamTasks := definition("TaskList", "team", teams)
	planOnly := definition("EnterPlanMode", "planning", plan)
	snapshot := &cliSnapshot{version: "2.1.296", tools: nativeCatalogue{"Read": {read}, "Agent": {agent}, "TaskList": {plainTasks, teamTasks}, "EnterPlanMode": {planOnly}}}
	for _, tools := range [][]Tool{{read, agent, teamTasks}, {teamTasks, read, agent}} {
		r := &Request{Tools: tools, cliSnapshot: snapshot}
		r.Tools[0].Description = " client\nexact description "
		before := digest(r.Tools)
		matchNativeTools(r, snapshot.version)
		if len(r.Native) != 3 || r.nativeProfile == nil || r.nativeProfile.Name != "teams" || r.catalogueEnv["CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"] != "1" || digest(r.Tools) != before {
			t.Fatalf("coherent profile not selected: %+v %+v", r.Native, r.nativeProfile)
		}
	}
	r := &Request{Tools: []Tool{agent, plainTasks}, cliSnapshot: snapshot}
	matchNativeTools(r, snapshot.version)
	if r.Native["Agent"] && r.Native["TaskList"] {
		t.Fatal("incompatible profiles were merged")
	}
	r = &Request{Tools: []Tool{read}, cliSnapshot: snapshot}
	matchNativeTools(r, snapshot.version)
	if r.nativeProfile == nil || r.nativeProfile.Name != "named" || r.catalogueEnv["CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"] != "" {
		t.Fatal("equivalent tools unnecessarily enabled team mode")
	}
	r = &Request{Tools: []Tool{planOnly}, cliSnapshot: snapshot}
	matchNativeTools(r, snapshot.version)
	args := cliArgs(r, &Prepared{SessionID: "fixture"}, "fixture-plugin")
	if !strings.Contains(strings.Join(args, " "), "--permission-mode plan") {
		t.Fatal("selected permission mode was not applied", args)
	}
	r = &Request{Tools: []Tool{read}, cliSnapshot: &cliSnapshot{version: snapshot.version, tools: nativeCatalogue{"Read": {{Name: "Read", Schema: read.Schema}}}}}
	matchNativeTools(r, snapshot.version)
	if len(r.Native) != 0 {
		t.Fatal("unbound runtime catalogue variant accepted")
	}
}

func TestNativeProfileEnvironmentCannotBeContaminated(t *testing.T) {
	profile := newCLIToolProfile("named", "default")
	r := &Request{nativeProfile: &profile, catalogueEnv: profile.environment(), Native: map[string]bool{"Agent": true, "PowerShell": true}, Tools: []Tool{{Name: "Agent", Schema: Object{"properties": Object{"team_name": Object{}}}}}}
	cfg := &runConfig{env: cliEnv(r, false)}
	for key, value := range r.catalogueEnv {
		cfg.env[key] = value
	}
	actual := cfg.processEnv([]string{"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1", "CLAUDE_CODE_USE_POWERSHELL_TOOL=1", "CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1", "CLAUDE_CODE_SUBAGENT_MODEL=other", "BASH_DEFAULT_TIMEOUT_MS=99999"})
	for key, value := range profile.Env {
		if environmentValue(actual, key) != value {
			t.Fatal("inherited profile leaked", key)
		}
	}
	if environmentValue(actual, "BASH_DEFAULT_TIMEOUT_MS") != "" {
		t.Fatal("inherited timeout leaked")
	}
	key := r.configKey()
	r.nativeProfile = &cliToolProfile{Name: "plan", PermissionMode: "plan", Env: profile.Env}
	if key == r.configKey() {
		t.Fatal("configuration changes reused history key")
	}
}

func TestNativeWhitelistRejectsExtrasMissingToolsAndDrift(t *testing.T) {
	client := Tool{Name: "lookup", Description: " client\nexact ", Schema: Object{"type": "object", "properties": Object{"q": Object{"type": "string"}}}}
	r := &Request{Tools: []Tool{client}, Native: map[string]bool{}}
	wire := Tool{Name: r.wireName(client.Name), Description: client.Description, Schema: client.Schema}
	for _, tc := range []struct {
		name  string
		tools []Tool
		fail  bool
	}{
		{"exact", []Tool{wire}, false},
		{"missing", []Tool{}, true},
		{"extra-native", []Tool{wire, {Name: "Bash", Schema: Object{"type": "object"}}}, true},
		{"duplicate", []Tool{wire, wire}, true},
		{"description", []Tool{{Name: wire.Name, Description: "wrong", Schema: wire.Schema}}, true},
		{"schema", []Tool{{Name: wire.Name, Description: wire.Description, Schema: Object{"type": "object"}}}, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			raw, _ := json.Marshal(Object{"tools": tc.tools})
			body, _ := decodeObject(raw)
			if err := verifyToolWhitelist(r, body); (err != nil) != tc.fail {
				t.Fatal("whitelist verification", err)
			}
		})
	}
}

// With tool search the CLI sends its own DeferredToolPlaceholder next to
// ToolSearch (Claude desktop 2026-10-14 sent a deferred placeholder of its own,
// which turns tool search on); without tool search it stays an extra tool.
func TestNativeWhitelistAcceptsDeferredPlaceholderWithToolSearch(t *testing.T) {
	deferred := true
	client := Tool{Name: "lookup", Description: "client", Schema: Object{"type": "object"}, DeferLoading: &deferred}
	for _, tc := range []struct {
		search string
		names  []string
		fail   bool
	}{
		{"true", []string{"ToolSearch", "DeferredToolPlaceholder"}, false},
		{"true", []string{"ToolSearch"}, false},
		{"true", []string{"ToolSearch", "DeferredToolPlaceholder", "DeferredToolPlaceholder"}, true},
		{"false", []string{"DeferredToolPlaceholder"}, true},
	} {
		r := &Request{Tools: []Tool{client}, Native: map[string]bool{}, ToolSearch: tc.search}
		var tools []Tool
		for _, name := range tc.names {
			tools = append(tools, Tool{Name: name, Schema: Object{"type": "object"}})
		}
		if tc.search == "false" {
			tools = append(tools, Tool{Name: r.wireName(client.Name), Description: client.Description, Schema: client.Schema})
		}
		raw, _ := json.Marshal(Object{"tools": tools})
		body, _ := decodeObject(raw)
		if err := verifyToolWhitelist(r, body); (err != nil) != tc.fail {
			t.Fatalf("%s %v: %v", tc.search, tc.names, err)
		}
	}
}

func TestCLIValidationCacheSerializesAndCanCancel(t *testing.T) {
	var cache cliValidationCache
	var calls atomic.Int32
	var work sync.WaitGroup
	for range 8 {
		work.Add(1)
		go func() {
			defer work.Done()
			if err := cache.verify(context.Background(), "same", func() error { calls.Add(1); return nil }); err != nil {
				t.Error(err)
			}
		}()
	}
	work.Wait()
	if calls.Load() != 1 {
		t.Fatal("duplicate config probes", calls.Load())
	}
	entered, release := make(chan struct{}), make(chan struct{})
	work.Add(1)
	go func() {
		defer work.Done()
		_ = cache.verify(context.Background(), "held", func() error { close(entered); <-release; return nil })
	}()
	<-entered
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if cache.verify(ctx, "other", func() error { t.Error("cancelled probe ran"); return nil }) == nil {
		t.Error("cancelled waiter succeeded")
	}
	close(release)
	work.Wait()
	for range 2 {
		_ = cache.verify(context.Background(), "transient", func() error { calls.Add(1); return fmt.Errorf("fixture unavailable") })
	}
	if calls.Load() != 3 {
		t.Fatal("transient failures were cached", calls.Load())
	}
}
