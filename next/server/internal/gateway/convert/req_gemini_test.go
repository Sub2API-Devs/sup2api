package convert

import (
	"context"
	"encoding/json"
	"errors"
	"reflect"
	"strings"
	"testing"
)

// convertWith runs the request side of a built-in pair.
func convertWith(t *testing.T, from, to, body string, opt Options) (jobject, []Loss, error) {
	t.Helper()
	for _, p := range builtinPairs {
		if p.from != from || p.to != to {
			continue
		}
		var l losses
		out, _, err := p.req([]byte(body), opt, &l)
		if err != nil {
			return nil, nil, err
		}
		o, err := decodeJObject(out, "out")
		if err != nil {
			t.Fatal(err)
		}
		return o, l.sorted(), nil
	}
	t.Fatalf("no pair %s -> %s", from, to)
	return nil, nil, nil
}

func jsonOf(t *testing.T, v any) string {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

func TestGeminiThinking(t *testing.T) {
	cases := []struct {
		model, effort string
		visible       bool
		want          string
	}{
		{"gemini-2.5-flash", "minimal", true, `{"includeThoughts":true,"thinkingBudget":0}`},
		{"models/gemini-2.5-pro", "none", true, `{"thinkingBudget":128}`},
		{"gemini-2.5-flash", "xhigh", false, `{"thinkingBudget":-1}`},
		{"gemini-3-flash-preview", "medium", true, `{"includeThoughts":true,"thinkingLevel":"medium"}`},
		{"gemini-3-pro-preview", "medium", true, `{"includeThoughts":true,"thinkingLevel":"high"}`},
		{"gemini-3-pro-preview", "minimal", false, `{"thinkingLevel":"low"}`},
		{"gemini-3-flash-preview", "xhigh", false, `{"thinkingLevel":"high"}`},
		{"gemini-3-flash-preview", "", true, `{"includeThoughts":true}`},
	}
	for _, c := range cases {
		var r *canonReasoning
		if c.effort != "" {
			r = &canonReasoning{path: "reasoning_effort", effort: c.effort}
		}
		var l losses
		if got := jsonOf(t, geminiThinking(c.model, r, c.visible, &l)); got != c.want {
			t.Errorf("%s %s: got %s, want %s", c.model, c.effort, got, c.want)
		}
	}
	var l losses
	if got := geminiThinking("gemini-3-flash", &canonReasoning{path: "p", effort: "max"}, false, &l); got != nil || len(l.list) != 1 {
		t.Errorf("unknown effort: got %v, losses %v", got, l.list)
	}
}

func TestReadGeminiThinking(t *testing.T) {
	cases := map[string]string{
		`{"thinkingLevel":"HIGH"}`: "high",
		`{"thinking_budget":-1}`:   "medium",
		`{"thinkingBudget":1024}`:  "low",
		`{"thinkingBudget":8000}`:  "medium",
		`{"thinkingBudget":20000}`: "high",
		`{"thinkingBudget":0}`:     "",
		`{"includeThoughts":true}`: "",
	}
	for in, want := range cases {
		v, _ := decodeJObject([]byte(in), "x")
		var l losses
		r, err := readGeminiThinking(v, "thinkingConfig", &l)
		if err != nil {
			t.Fatalf("%s: %v", in, err)
		}
		got := ""
		if r != nil {
			got = r.effort
		}
		if got != want {
			t.Errorf("%s: got %q, want %q", in, got, want)
		}
	}
}

func TestOpenAPISchema(t *testing.T) {
	in, _ := decodeJObject([]byte(`{"type":"OBJECT","propertyOrdering":["a"],"properties":{
		"a":{"type":"STRING","nullable":true,"enum":["x"]},
		"b":{"type":"ARRAY","items":{"type":"INTEGER"}},
		"c":{"anyOf":[{"type":"NUMBER"},{"type":"BOOLEAN","nullable":true}]}},"required":["a"]}`), "s")
	var l losses
	got := jsonOf(t, openAPISchema(in, "parameters", &l))
	want := `{"properties":{"a":{"enum":["x"],"type":["string","null"]},"b":{"items":{"type":"integer"},"type":"array"},` +
		`"c":{"anyOf":[{"type":"number"},{"type":["boolean","null"]}]}},"required":["a"],"type":"object"}`
	if got != want {
		t.Errorf("got %s\nwant %s", got, want)
	}
	if want := []Loss{{Category: LossOther, Path: "parameters.propertyOrdering"}}; !reflect.DeepEqual(l.sorted(), want) {
		t.Errorf("losses %v", l.sorted())
	}
}

func TestCamelize(t *testing.T) {
	o := jobject{"system_instruction": 1, "generationConfig": 2, "generation_config": 3, "_private": 4}
	camelize(o)
	if want := (jobject{"systemInstruction": 1, "generationConfig": 2, "_private": 4}); !reflect.DeepEqual(o, want) {
		t.Errorf("got %v", o)
	}
}

func TestUserTextParts(t *testing.T) {
	gif := "data:image/gif;base64,R0lG"
	got := jsonOf(t, userTextParts("a ![x](data:image/png;base64,AAAA) b ![y]("+gif+")"))
	want := `[{"text":"a "},{"inlineData":{"data":"AAAA","mimeType":"image/png"}},{"text":" b ![y](` + gif + `)"}]`
	if got != want {
		t.Errorf("got %s\nwant %s", got, want)
	}
}

func TestChatToGeminiMedia(t *testing.T) {
	body := `{"model":"gemini-2.5-flash","messages":[{"role":"user","content":[{"type":"image_url","image_url":{"url":"https://example.com/a.png"}}]}]}`
	_, _, err := convertWith(t, pChat, "gemini.generate", body, Options{})
	var re *RequestError
	if !errors.As(err, &re) || !strings.Contains(err.Error(), "cannot be downloaded") {
		t.Fatalf("no fetcher: %v", err)
	}
	fetch := func(_ context.Context, _ string) (string, string, error) {
		return "image/png; charset=binary", "QUJD", nil
	}
	out, _, err := convertWith(t, pChat, "gemini.generate", body, Options{Fetch: MediaFetcher(fetch)})
	if err != nil {
		t.Fatal(err)
	}
	if got := jsonOf(t, out["contents"]); !strings.Contains(got, `{"inlineData":{"data":"QUJD","mimeType":"image/png"}}`) {
		t.Errorf("contents %s", got)
	}
}

func TestChatToGeminiToolResults(t *testing.T) {
	body := func(model string) string {
		return `{"model":"` + model + `","messages":[
		{"role":"user","content":"hi"},
		{"role":"assistant","tool_calls":[{"id":"c1","type":"function","function":{"name":"f","arguments":"not json"}}]},
		{"role":"tool","tool_call_id":"c1","content":[{"type":"text","text":"done"},{"type":"image_url","image_url":{"url":"data:image/png;base64,AAAA"}}]},
		{"role":"tool","tool_call_id":"c9","content":"orphan"}]}`
	}
	out, lost, err := convertWith(t, pChat, "gemini.generate", body("gemini-2.5-flash"), Options{})
	if err != nil {
		t.Fatal(err)
	}
	want := `[{"parts":[{"text":"hi"}],"role":"user"},` +
		`{"parts":[{"functionCall":{"args":{},"id":"c1","name":"f"},"thoughtSignature":"context_engineering_is_the_way_to_go"}],"role":"model"},` +
		`{"parts":[{"functionResponse":{"id":"c1","name":"f","response":{"output":"done"}}}],"role":"user"}]`
	if got := jsonOf(t, out["contents"]); got != want {
		t.Errorf("got %s\nwant %s", got, want)
	}
	wantLost := []Loss{{Category: LossTool, Path: "messages[1].tool_calls[0]"},
		{Category: LossImage, Path: "messages[2].content[1]"}, {Category: LossTool, Path: "messages[3]"}}
	if !reflect.DeepEqual(lost, wantLost) {
		t.Errorf("losses %v", lost)
	}
	out, _, err = convertWith(t, pChat, "gemini.generate", body("gemini-3-pro-preview"), Options{})
	if err != nil {
		t.Fatal(err)
	}
	if got := jsonOf(t, out["contents"]); !strings.Contains(got, `"parts":[{"inlineData"`) {
		t.Errorf("Gemini 3 keeps the result image: %s", got)
	}
}

func TestGeminiToolConfig(t *testing.T) {
	cases := map[string]string{
		`{"mode":"ANY"}`: `"required"`,
		`{"mode":"ANY","allowedFunctionNames":["f"]}`:       `{"function":{"name":"f"},"type":"function"}`,
		`{"mode":"ANY","allowed_function_names":["f","g"]}`: `{"allowed_tools":{"mode":"required","tools":[{"function":{"name":"f"},"type":"function"},{"function":{"name":"g"},"type":"function"}]},"type":"allowed_tools"}`,
		`{"mode":"AUTO","allowedFunctionNames":["f"]}`:      `{"allowed_tools":{"mode":"auto","tools":[{"function":{"name":"f"},"type":"function"}]},"type":"allowed_tools"}`,
		`{"mode":"NONE","allowedFunctionNames":["f"]}`:      `"none"`,
		`{"mode":"VALIDATED"}`:                              `"auto"`,
	}
	for cfg, want := range cases {
		body := `{"contents":[{"parts":[{"text":"hi"}]}],"tools":[{"functionDeclarations":[{"name":"f"},{"name":"g"}]}],
			"toolConfig":{"functionCallingConfig":` + cfg + `}}`
		out, _, err := convertWith(t, "gemini.generate", pChat, body, Options{Model: "gpt-5"})
		if err != nil {
			t.Fatalf("%s: %v", cfg, err)
		}
		if got := jsonOf(t, out["tool_choice"]); got != want {
			t.Errorf("%s: got %s, want %s", cfg, got, want)
		}
	}
}

func TestGeminiToChatFunctionResponses(t *testing.T) {
	body := `{"contents":[
		{"role":"model","parts":[{"functionCall":{"id":"x1","name":"f","args":{"a":"<b>"}}},{"functionCall":{"name":"f","args":{}}}]},
		{"role":"user","parts":[{"text":"before"},{"functionResponse":{"name":"f","response":{"error":"boom"}}},
			{"functionResponse":{"id":"x1","name":"f","response":{"output":"ok"}}},{"functionResponse":{"name":"g","response":{}}}]}]}`
	out, lost, err := convertWith(t, "gemini.generate", pChat, body, Options{Model: "gpt-5", Stream: true})
	if err != nil {
		t.Fatal(err)
	}
	msgs := jsonOf(t, out["messages"])
	if args := out["messages"].([]any)[0].(jobject)["tool_calls"].([]any)[0].(jobject)["function"].(jobject)["arguments"]; args != `{"a":"<b>"}` {
		t.Errorf("arguments %v", args)
	}
	for _, want := range []string{`"content":"boom","role":"tool","tool_call_id":"call_`,
		`"content":"ok","role":"tool","tool_call_id":"x1"`, `"content":"before","role":"user"`} {
		if !strings.Contains(msgs, want) {
			t.Errorf("messages lack %s: %s", want, msgs)
		}
	}
	if out["stream"] != true || out["model"] != "gpt-5" {
		t.Errorf("model and stream come from the endpoint: %v %v", out["model"], out["stream"])
	}
	wantLost := []Loss{{Category: LossOther, Path: "contents[1].parts[1].functionResponse.response.error"},
		{Category: LossTool, Path: "contents[1].parts[3]"}}
	if !reflect.DeepEqual(lost, wantLost) {
		t.Errorf("losses %v", lost)
	}
}
