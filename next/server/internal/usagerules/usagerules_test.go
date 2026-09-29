package usagerules

import (
	"bytes"
	"log/slog"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// captureLogs redirects slog to a buffer for the duration of the test.
func captureLogs(t *testing.T) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	prev := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelWarn})))
	t.Cleanup(func() { slog.SetDefault(prev) })
	return &buf
}

func factRules(f manifest.UsageFact) manifest.UsageRules {
	return manifest.UsageRules{
		Semantics: "exclusive",
		JSON:      &manifest.UsageMap{Map: map[string]string{}},
		Facts:     map[string]manifest.UsageFact{"quality": f},
	}
}

// ---------------------------------------------------------------- facts[].enum

func TestFactEnumAccepted(t *testing.T) {
	buf := captureLogs(t)
	u := New(factRules(manifest.UsageFact{Type: "enum", Enum: []string{"low", "high"}, Path: "q"}))
	u.ApplyJSON([]byte(`{"q":"high"}`))
	if u.Metrics["quality"] != "high" {
		t.Fatalf("metrics = %#v", u.Metrics)
	}
	if s := buf.String(); s != "" {
		t.Fatalf("unexpected warning: %s", s)
	}
}

func TestFactEnumRejectsUndeclaredValue(t *testing.T) {
	buf := captureLogs(t)
	u := New(factRules(manifest.UsageFact{Type: "enum", Enum: []string{"low", "high"}, Path: "q"})).
		WithLog("request_id", "req-enum")
	u.ApplyJSON([]byte(`{"q":"ultra"}`))
	if _, ok := u.Metrics["quality"]; ok {
		t.Fatalf("value outside the enum was recorded: %#v", u.Metrics)
	}
	s := buf.String()
	if !strings.Contains(s, "outside the declared enum") || !strings.Contains(s, "ultra") ||
		!strings.Contains(s, "req-enum") || !strings.Contains(s, "quality") {
		t.Fatalf("warning = %s", s)
	}
}

// A non-string value can never be one of the declared strings either.
func TestFactEnumRejectsNonString(t *testing.T) {
	captureLogs(t)
	u := New(factRules(manifest.UsageFact{Type: "enum", Enum: []string{"1", "2"}, Path: "q"}))
	u.ApplyJSON([]byte(`{"q":1}`))
	if _, ok := u.Metrics["quality"]; ok {
		t.Fatalf("numeric value stored for an enum fact: %#v", u.Metrics)
	}
}

// The rules run again for every SSE event; one bad value must not log a line
// per chunk, and a previously accepted value must not be overwritten by a
// rejected one.
func TestFactEnumWarnsOncePerRequest(t *testing.T) {
	buf := captureLogs(t)
	u := New(factRules(manifest.UsageFact{Type: "enum", Enum: []string{"low"}, Path: "q"}))
	u.ApplySSE("", []byte(`{"q":"low"}`))
	for range 20 {
		u.ApplySSE("", []byte(`{"q":"ultra"}`))
	}
	if n := strings.Count(buf.String(), "outside the declared enum"); n != 1 {
		t.Fatalf("warnings = %d, want 1:\n%s", n, buf.String())
	}
	if u.Metrics["quality"] != "low" {
		t.Fatalf("accepted value was clobbered: %#v", u.Metrics)
	}
}

// A fact without type "enum" is untouched by the enum check.
func TestFactNumberAndBooleanUnchanged(t *testing.T) {
	captureLogs(t)
	u := New(manifest.UsageRules{Facts: map[string]manifest.UsageFact{
		"images": {Type: "number", Path: "n"},
		"cached": {Type: "boolean", Path: "c"},
		"size":   {Type: "enum", Enum: []string{"2848x1600"}, Path: "s"},
	}})
	u.ApplyJSON([]byte(`{"n":3,"c":true,"s":"2848x1600"}`))
	if u.Metrics["images"] != float64(3) || u.Metrics["cached"] != true || u.Metrics["size"] != "2848x1600" {
		t.Fatalf("metrics = %#v", u.Metrics)
	}
}

// ---------------------------------------------------------------- standard fields

func TestStandardFieldNotANumberWarnsAndCountsZero(t *testing.T) {
	buf := captureLogs(t)
	u := New(manifest.UsageRules{JSON: &manifest.UsageMap{Map: map[string]string{
		manifest.UsageInputTokens:  "usage.label",
		manifest.UsageOutputTokens: "usage.out",
	}}}).WithLog("request_id", "req-str")
	u.ApplyJSON([]byte(`{"usage":{"label":"a lot","out":12}}`))
	if got := u.Tokens(); got.Input != 0 || got.Output != 12 {
		t.Fatalf("tokens = %+v", got)
	}
	s := buf.String()
	if !strings.Contains(s, "not a number") || !strings.Contains(s, manifest.UsageInputTokens) ||
		!strings.Contains(s, "a lot") || !strings.Contains(s, "req-str") {
		t.Fatalf("warning = %s", s)
	}
	if strings.Contains(s, manifest.UsageOutputTokens) {
		t.Fatalf("the numeric field was warned about too: %s", s)
	}
}

// A JSON string holding a number keeps counting as it always did, without a
// warning: gjson reads it and the plugin's intent is unambiguous.
func TestStandardFieldNumericStringIsNotAWarning(t *testing.T) {
	buf := captureLogs(t)
	u := New(manifest.UsageRules{JSON: &manifest.UsageMap{Map: map[string]string{
		manifest.UsageInputTokens: "in",
	}}})
	u.ApplyJSON([]byte(`{"in":"1234"}`))
	if u.Tokens().Input != 1234 {
		t.Fatalf("tokens = %+v", u.Tokens())
	}
	if s := buf.String(); s != "" {
		t.Fatalf("unexpected warning: %s", s)
	}
}

func TestStandardFieldBooleanWarns(t *testing.T) {
	buf := captureLogs(t)
	u := New(manifest.UsageRules{JSON: &manifest.UsageMap{Map: map[string]string{
		manifest.UsageCacheReadTokens: "cr",
	}}})
	u.ApplyJSON([]byte(`{"cr":true}`))
	// gjson coerces true to 1; the count stays whatever it always was - this
	// round only makes the nonsense visible, it does not change what is billed.
	if u.Tokens().CacheRead != 1 {
		t.Fatalf("tokens = %+v", u.Tokens())
	}
	if !strings.Contains(buf.String(), "not a number") {
		t.Fatalf("warning = %s", buf.String())
	}
}

func TestStandardFieldWarnsOncePerRequest(t *testing.T) {
	buf := captureLogs(t)
	u := New(manifest.UsageRules{SSE: []manifest.SSEUsageMap{{Map: map[string]string{
		manifest.UsageOutputTokens: "usage.out",
	}}}})
	for range 20 {
		u.ApplySSE("message_delta", []byte(`{"usage":{"out":"none"}}`))
	}
	if n := strings.Count(buf.String(), "not a number"); n != 1 {
		t.Fatalf("warnings = %d, want 1:\n%s", n, buf.String())
	}
}

// model is a string field: it must never be warned about.
func TestModelFieldIsNotWarnedAbout(t *testing.T) {
	buf := captureLogs(t)
	u := New(manifest.UsageRules{JSON: &manifest.UsageMap{Map: map[string]string{
		manifest.UsageModel: "model",
	}}})
	u.ApplyJSON([]byte(`{"model":"claude-x"}`))
	if u.Model != "claude-x" || buf.String() != "" {
		t.Fatalf("model=%q warnings=%s", u.Model, buf.String())
	}
}

// ---------------------------------------------------------------- Path trimming

func TestPathTrimsBothForms(t *testing.T) {
	doc := []byte(`{"usage":{"a":3,"b":4}}`)
	cases := []struct {
		spec string
		want float64
	}{
		{"usage.a", 3},
		{" usage.a", 3},
		{"usage.a ", 3},
		{"  usage.a  ", 3},
		{"usage.a+usage.b", 7},
		{" usage.a + usage.b ", 7},
	}
	for _, tc := range cases {
		if r := Path(doc, tc.spec); !r.Exists() || r.Float() != tc.want {
			t.Errorf("%q: exists=%v value=%v", tc.spec, r.Exists(), r.Float())
		}
	}
}
