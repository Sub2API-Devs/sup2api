package paramoverride

import (
	"net/http"
	"strings"
	"testing"
)

func compileOverride(t *testing.T, raw string) *Override {
	t.Helper()
	p, errs := Compile("param_override", []byte(raw), false)
	requireEmpty(t, errs)
	return p
}

func TestParamOverrideBody(t *testing.T) {
	cases := []struct {
		name, body, override, want string
	}{
		{"legacy literal keys", `{"model":"m","a":{"b":1}}`, `{"temperature":0.7,"a.b":2,"x*":true}`,
			`{"model":"m","a":{"b":1},"temperature":0.7,"a.b":2,"x*":true}`},
		{"legacy before operations", `{"model":"m"}`, `{"model":"legacy","t":1,"operations":[{"mode":"set","path":"model","value":"op"}]}`,
			`{"model":"op","t":1}`},
		{"set nested", `{}`, `{"operations":[{"mode":"set","path":"a.b","value":[1,2]}]}`, `{"a":{"b":[1,2]}}`},
		{"set keep_origin", `{"a":1}`, `{"operations":[{"mode":"set","path":"a","value":2,"keep_origin":true},{"mode":"set","path":"b","value":3,"keep_origin":true}]}`,
			`{"a":1,"b":3}`},
		{"delete", `{"a":1,"b":2}`, `{"operations":[{"mode":"delete","path":"a"}]}`, `{"b":2}`},
		{"copy", `{"a":{"x":1}}`, `{"operations":[{"mode":"copy","from":"a.x","to":"b"}]}`, `{"a":{"x":1},"b":1}`},
		{"move", `{"a":{"x":1}}`, `{"operations":[{"mode":"move","from":"a.x","to":"b"}]}`, `{"a":{},"b":1}`},
		{"prepend append string", `{"s":"mid"}`, `{"operations":[{"mode":"prepend","path":"s","value":"<"},{"mode":"append","path":"s","value":">"}]}`, `{"s":"<mid>"}`},
		{"prepend append array", `{"a":[2]}`, `{"operations":[{"mode":"prepend","path":"a","value":[0,1]},{"mode":"append","path":"a","value":{"k":3}}]}`, `{"a":[0,1,2,{"k":3}]}`},
		{"append object merge", `{"o":{"a":1,"n":null}}`, `{"operations":[{"mode":"append","path":"o","value":{"a":2,"n":3,"b":4},"keep_origin":true}]}`, `{"o":{"a":1,"n":3,"b":4}}`},
		{"append object override", `{"o":{"a":1}}`, `{"operations":[{"mode":"append","path":"o","value":{"a":2}}]}`, `{"o":{"a":2}}`},
		{"trim prefix suffix", `{"m":"openai/gpt-4-latest"}`, `{"operations":[{"mode":"trim_prefix","path":"m","value":"openai/"},{"mode":"trim_suffix","path":"m","value":"-latest"}]}`, `{"m":"gpt-4"}`},
		{"ensure prefix suffix", `{"a":"x","b":"pre-x-suf"}`, `{"operations":[{"mode":"ensure_prefix","path":"a","value":"pre-"},{"mode":"ensure_suffix","path":"a","value":"-suf"},{"mode":"ensure_prefix","path":"b","value":"pre-"},{"mode":"ensure_suffix","path":"b","value":"-suf"}]}`,
			`{"a":"pre-x-suf","b":"pre-x-suf"}`},
		{"trim_space to_lower to_upper", `{"a":"  Hi ","b":"Hi","c":"Hi"}`, `{"operations":[{"mode":"trim_space","path":"a"},{"mode":"to_lower","path":"b"},{"mode":"to_upper","path":"c"}]}`,
			`{"a":"Hi","b":"hi","c":"HI"}`},
		{"replace", `{"m":"gpt-4o-mini"}`, `{"operations":[{"mode":"replace","path":"m","from":"-mini","to":""}]}`, `{"m":"gpt-4o"}`},
		{"regex_replace", `{"m":"claude-3-5-sonnet-20241022"}`, `{"operations":[{"mode":"regex_replace","path":"m","from":"-\\d{8}$","to":"-latest"}]}`, `{"m":"claude-3-5-sonnet-latest"}`},
		{"negative index", `{"messages":[{"c":"a"},{"c":"b"}]}`, `{"operations":[{"mode":"append","path":"messages.-1.c","value":"!"}]}`, `{"messages":[{"c":"a"},{"c":"b!"}]}`},
		{"wildcard array", `{"tools":[{"t":"A"},{"t":"B","on":false},{"t":"C"}]}`, `{"operations":[{"mode":"set","path":"tools.*.on","value":true,"keep_origin":true}]}`,
			`{"tools":[{"t":"A","on":true},{"t":"B","on":false},{"t":"C","on":true}]}`},
		{"wildcard object and nested", `{"m":{"x":{"s":" a "},"y":{"s":" b "},"z":1}}`, `{"operations":[{"mode":"trim_space","path":"m.*.s"}]}`,
			`{"m":{"x":{"s":"a"},"y":{"s":"b"},"z":1}}`},
		{"wildcard skips missing parents", `{"a":[{"b":{"c":1}},{"x":2}]}`, `{"operations":[{"mode":"delete","path":"a.*.b.c"}]}`, `{"a":[{"b":{}},{"x":2}]}`},
		{"wildcard no match", `{"a":[]}`, `{"operations":[{"mode":"trim_space","path":"a.*.s"}]}`, `{"a":[]}`},
		{"conditions OR default", `{"model":"gpt-4","t":1}`, `{"operations":[{"mode":"set","path":"t","value":2,"conditions":[{"path":"model","mode":"prefix","value":"claude"},{"path":"model","mode":"prefix","value":"gpt"}]}]}`,
			`{"model":"gpt-4","t":2}`},
		{"conditions AND", `{"model":"gpt-4","t":1}`, `{"operations":[{"mode":"set","path":"t","value":2,"logic":"and","conditions":[{"path":"model","mode":"prefix","value":"gpt"},{"path":"t","mode":"gt","value":5}]}]}`,
			`{"model":"gpt-4","t":1}`},
		{"condition invert", `{"model":"gpt-4","t":1}`, `{"operations":[{"mode":"delete","path":"t","conditions":[{"path":"model","mode":"contains","value":"claude","invert":true}]}]}`,
			`{"model":"gpt-4"}`},
		{"condition missing key", `{"t":1}`, `{"operations":[{"mode":"set","path":"a","value":1,"conditions":[{"path":"nope","mode":"full","value":1}]},{"mode":"set","path":"b","value":1,"conditions":[{"path":"nope","mode":"full","value":1,"pass_missing_key":true}]}]}`,
			`{"t":1,"b":1}`},
		{"condition object shorthand", `{"stream":true}`, `{"operations":[{"mode":"set","path":"x","value":1,"conditions":{"stream":true}}]}`, `{"stream":true,"x":1}`},
		{"condition numbers", `{"n":3}`, `{"operations":[{"mode":"set","path":"a","value":1,"conditions":[{"path":"n","mode":"gte","value":3}]},{"mode":"set","path":"b","value":1,"conditions":[{"path":"n","mode":"lt","value":3}]}]}`,
			`{"n":3,"a":1}`},
		{"description kept out of the way", `{}`, `{"operations":[{"mode":"set","path":"a","value":1,"description":"label","extra":{"x":1}}]}`, `{"a":1}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			out, err := compileOverride(t, tc.override).Apply([]byte(tc.body), nil)
			requireNoError(t, err)
			assertJSONEq(t, tc.want, string(out.Body))
		})
	}
}

func TestParamOverrideContextConditions(t *testing.T) {
	in := &Context{Model: "up-model", OriginalModel: "client-model", RequestPath: "/v1/messages", RetryIndex: 1,
		UserID: 7, AccountID: 9, Group: "vip", Stream: true,
		Headers: http.Header{"X-Tier": {"gold"}, "Authorization": {"Bearer secret"}}}
	cond := func(path, mode, value string) string {
		return `{"mode":"set","path":"hit","value":true,"conditions":[{"path":"` + path + `","mode":"` + mode + `","value":` + value + `}]}`
	}
	for _, c := range []string{
		cond("model", "full", `"up-model"`), cond("upstream_model", "full", `"up-model"`), cond("original_model", "full", `"client-model"`),
		cond("request_path", "suffix", `"/messages"`), cond("request_headers.x-tier", "full", `"gold"`),
		cond("retry_index", "full", `1`), cond("is_retry", "full", `true`), cond("retry.index", "gte", `1`), cond("retry.is_retry", "full", `true`),
		cond("user_id", "full", `7`), cond("account_id", "full", `9`), cond("group", "full", `"vip"`), cond("stream", "full", `true`),
	} {
		out, err := compileOverride(t, `{"operations":[`+c+`]}`).Apply([]byte(`{}`), in)
		requireNoError(t, err, c)
		assertJSONEq(t, `{"hit":true}`, string(out.Body), c)
	}
	// The body wins over the context; blocked client headers are not exposed.
	out, err := compileOverride(t, `{"operations":[`+cond("model", "full", `"body-model"`)+`,`+
		`{"mode":"set","path":"auth","value":true,"conditions":[{"path":"request_headers.authorization","mode":"prefix","value":"Bearer"}]}]}`).
		Apply([]byte(`{"model":"body-model"}`), in)
	requireNoError(t, err)
	assertJSONEq(t, `{"model":"body-model","hit":true}`, string(out.Body))
}

func TestParamOverrideHeaders(t *testing.T) {
	in := &Context{Headers: http.Header{
		"Anthropic-Beta": {"advanced-tool-use-2025-11-20, computer-use-2025-01-24"},
		"X-Trace":        {"t1"}, "X-Old": {"o1"}, "X-A": {"a"},
	}}
	run := func(ops string) Result {
		t.Helper()
		out, err := compileOverride(t, `{"operations":[`+ops+`]}`).Apply([]byte(`{}`), in)
		requireNoError(t, err)
		return out
	}

	out := run(`{"mode":"set_header","path":"X-Custom","value":"v1"},{"mode":"set_header","path":"x-custom","value":"v2","keep_origin":true},
		{"mode":"delete_header","path":"X-A"},{"mode":"copy_header","from":"x-trace","to":"x-trace-copy"},{"mode":"move_header","from":"x-old","to":"x-new"},
		{"mode":"copy_header","from":"x-missing","to":"x-none"},{"mode":"move_header","path":"x-missing"},{"mode":"pass_headers","value":"x-trace, x-gone"},
		{"mode":"set_header","path":"x-seen","value":"yes","conditions":[{"path":"header_override.x-custom","mode":"full","value":"v1"}]}`)
	assertEqual(t, map[string]string{"x-custom": "v1", "x-trace-copy": "t1", "x-new": "o1", "x-trace": "t1", "x-seen": "yes"}, out.Headers.Set)
	assertEqual(t, []string{"x-a", "x-old"}, out.Headers.Delete)

	h := http.Header{"X-A": {"plugin"}, "X-Custom": {"plugin"}}
	out.Headers.Apply(h)
	assertEmpty(t, h.Get("X-A"))
	assertEqual(t, "v1", h.Get("X-Custom"))

	cases := []struct{ name, value, want string }{
		{"drop and keep", `{"advanced-tool-use-2025-11-20":null,"computer-use-2025-01-24":"computer-use-2025-01-24"}`, "computer-use-2025-01-24"},
		{"replace with list", `{"advanced-tool-use-2025-11-20":["a","b"]}`, "a,b,computer-use-2025-01-24"},
		{"wildcard", `{"*":"x","computer-use-2025-01-24":"computer-use-2025-01-24"}`, "x,computer-use-2025-01-24"},
		{"append without duplicates", `{"$append":["context-1m-2025-08-07","computer-use-2025-01-24"]}`, "advanced-tool-use-2025-11-20,computer-use-2025-01-24,context-1m-2025-08-07"},
		{"keep only declared", `{"computer-use-2025-01-24":"computer-use-2025-01-24","$append":"c1","$keep_only_declared":true}`, "computer-use-2025-01-24,c1"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			out := run(`{"mode":"set_header","path":"anthropic-beta","value":` + tc.value + `}`)
			assertEqual(t, tc.want, out.Headers.Set["anthropic-beta"])
		})
	}
	// Clearing every token removes the header.
	out = run(`{"mode":"set_header","path":"anthropic-beta","value":{"$keep_only_declared":true}}`)
	assertEqual(t, []string{"anthropic-beta"}, out.Headers.Delete)
	assertEmpty(t, out.Headers.Set)
	// A token mapping on a header the client did not send starts empty.
	out = run(`{"mode":"set_header","path":"x-list","value":{"$append":["a","b"]}}`)
	assertEqual(t, "a,b", out.Headers.Set["x-list"])
}

func TestParamOverrideReturnError(t *testing.T) {
	_, err := compileOverride(t, `{"operations":[{"mode":"set","path":"a","value":1},{"mode":"return_error","value":"blocked"}]}`).Apply([]byte(`{}`), nil)
	var re *Error
	requireErrorAs(t, err, &re)
	assertEqual(t, &Error{Status: 400, Code: "invalid_request", Type: "invalid_request_error", Message: "blocked", SkipRetry: true}, re)

	_, err = compileOverride(t, `{"operations":[{"mode":"return_error","value":{"msg":"slow down","status":429,"code":1001,"type":"rate_limit_error","skip_retry":false},
		"conditions":[{"path":"model","mode":"prefix","value":"gpt"}]}]}`).Apply([]byte(`{"model":"gpt-4"}`), nil)
	requireErrorAs(t, err, &re)
	assertEqual(t, &Error{Status: 429, Code: "1001", Type: "rate_limit_error", Message: "slow down", SkipRetry: false}, re)

	out, err := compileOverride(t, `{"operations":[{"mode":"return_error","value":"x","conditions":[{"path":"model","mode":"prefix","value":"gpt"}]}]}`).Apply([]byte(`{"model":"claude"}`), nil)
	requireNoError(t, err)
	assertJSONEq(t, `{"model":"claude"}`, string(out.Body))
}

func TestParamOverrideRuntimeFailures(t *testing.T) {
	for _, tc := range []struct{ name, body, override, msg string }{
		{"trim on number", `{"a":1}`, `{"operations":[{"mode":"trim_prefix","path":"a","value":"x"}]}`, "operations[0] (trim_prefix): a: value is a number, not a string"},
		{"trim on missing", `{}`, `{"operations":[{"mode":"to_lower","path":"a"}]}`, "value is missing"},
		{"append to number", `{"a":1}`, `{"operations":[{"mode":"append","path":"a","value":"x"}]}`, "cannot prepend or append to a number"},
		{"merge non object", `{"a":{}}`, `{"operations":[{"mode":"append","path":"a","value":"x"}]}`, "only an object merges"},
		{"copy missing source", `{}`, `{"operations":[{"mode":"copy","from":"a","to":"b"}]}`, "source path a does not exist"},
		{"move missing source", `{}`, `{"operations":[{"mode":"move","from":"a","to":"b"}]}`, "source path a does not exist"},
		{"condition types", `{"a":"1"}`, `{"operations":[{"mode":"delete","path":"a","conditions":[{"path":"a","mode":"full","value":1}]}]}`, "cannot compare a string with a number"},
		{"numeric condition", `{"a":"1"}`, `{"operations":[{"mode":"delete","path":"a","conditions":[{"path":"a","mode":"gt","value":0}]}]}`, "gt compares numbers"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			_, err := compileOverride(t, tc.override).Apply([]byte(tc.body), nil)
			requireError(t, err)
			assertContains(t, err.Error(), tc.msg)
		})
	}
	broken := Load([]byte(`{"operations":[{"mode":"prune_objects","path":"a"}]}`))
	_, err := broken.Apply([]byte(`{}`), nil)
	assertErrorContains(t, err, "stored override is invalid")
}

func TestCompileParamOverrideValidation(t *testing.T) {
	cases := []struct {
		name, raw string
		want      []string // code: message prefix
	}{
		{"not an object", `[1]`, []string{"invalid: must be a JSON object"}},
		{"operations not array", `{"operations":{}}`, []string{"invalid: operations: must be an array"}},
		{"missing mode and path", `{"operations":[{"value":1},{"mode":"set","value":1}]}`,
			[]string{"required: operations[0].mode", "required: operations[1].path"}},
		{"set without value", `{"operations":[{"mode":"set","path":"a"}]}`, []string{"required: operations[0].value"}},
		{"unsupported modes", `{"operations":[{"mode":"prune_objects","path":"a"},{"mode":"sync_fields"},{"mode":"bogus"}]}`,
			[]string{"unsupported: operations[0].mode: mode prune_objects is not supported yet", "unsupported: operations[1].mode: mode sync_fields",
				"unsupported: operations[2].mode: unknown mode bogus"}},
		{"bad regex", `{"operations":[{"mode":"regex_replace","path":"a","from":"("}]}`, []string{"invalid: operations[0].from: invalid regular expression"}},
		{"string mode requirements", `{"operations":[{"mode":"replace","path":"a"},{"mode":"ensure_prefix","path":"a","value":""},{"mode":"trim_suffix","path":"a"}]}`,
			[]string{"required: operations[0].from", "required: operations[1].value", "required: operations[2].value"}},
		{"copy without from/to", `{"operations":[{"mode":"copy","from":"a"}]}`, []string{"required: operations[0].to"}},
		{"wrong member types", `{"operations":[{"mode":"set","path":1,"value":1,"keep_origin":"yes","logic":"XOR"}]}`,
			[]string{"invalid: operations[0].path: must be a string", "invalid: operations[0].keep_origin", "invalid: operations[0].logic", "required: operations[0].path"}},
		{"conditions", `{"operations":[{"mode":"delete","path":"a","conditions":[{"path":"a"},{"mode":"regex","path":"b"},1]}]}`,
			[]string{"required: operations[0].conditions[0].mode", "unsupported: operations[0].conditions[1].mode", "invalid: operations[0].conditions[2]"}},
		{"description too long", `{"operations":[{"mode":"delete","path":"a","description":"` + strings.Repeat("x", 201) + `"}]}`,
			[]string{"invalid: operations[0].description"}},
		{"blocked headers", `{"operations":[{"mode":"set_header","path":"Authorization","value":"x"},{"mode":"delete_header","path":"x-forwarded-for"},
			{"mode":"copy_header","from":"cookie","to":"x-c"},{"mode":"move_header","from":"x-a","to":"x-sub2api-node"},{"mode":"pass_headers","value":["x-ok","x-kin-debug"]}]}`,
			[]string{"blocked: operations[0].path: header authorization", "blocked: operations[1].path", "blocked: operations[2].from", "blocked: operations[3].to",
				"blocked: operations[4].value[1]"}},
		{"header values", `{"operations":[{"mode":"set_header","path":"x a","value":"x"},{"mode":"set_header","path":"x-b"},{"mode":"set_header","path":"x-c","value":{}},
			{"mode":"set_header","path":"x-d","value":{"t":{"o":1}}},{"mode":"pass_headers","value":" , "}]}`,
			[]string{"invalid: operations[0].path: invalid header name", "required: operations[1].value", "invalid: operations[2].value: token mapping must not be empty",
				"invalid: operations[3].value.t", "required: operations[4].value"}},
		{"return_error", `{"operations":[{"mode":"return_error"},{"mode":"return_error","value":{"status":600,"message":"m"}},{"mode":"return_error","value":{"code":"x"}}]}`,
			[]string{"invalid: operations[0].value: must be a message or an object", "invalid: operations[1].value.status_code", "required: operations[2].value.message"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			p, errs := Compile("param_override", []byte(tc.raw), false)
			assertNil(t, p)
			requireLen(t, errs, len(tc.want), "%v", errs)
			for i, e := range errs {
				assertEqual(t, "param_override", e.Field)
				assertTrue(t, strings.HasPrefix(e.Code+": "+e.Message, tc.want[i]), "%s: %s, want %s", e.Code, e.Message, tc.want[i])
			}
		})
	}

	_, errs := Compile("param_override", []byte(`{"operations":[`+strings.TrimSuffix(strings.Repeat(`{"mode":"delete","path":"a"},`, 101), ",")+`]}`), false)
	requireLen(t, errs, 1)
	assertEqual(t, "too_many", errs[0].Code)
	_, errs = Compile("param_override", []byte(`{"a":"`+strings.Repeat("x", MaxBytes)+`"}`), false)
	requireLen(t, errs, 1)
	assertEqual(t, "too_large", errs[0].Code)

	_, errs = Compile("param_override", []byte(`{"operations":[{"mode":"set"}]}`), true)
	requireNotEmpty(t, errs)
	assertEqual(t, "operations[0].path: 必填", errs[0].Message)

	for _, raw := range []string{``, `null`, `{}`, `{"operations":[]}`} {
		p, errs := Compile("param_override", []byte(raw), false)
		assertNil(t, p, raw)
		assertEmpty(t, errs, raw)
		assertJSONEq(t, `null`, string(p.Raw()))
	}
	p := compileOverride(t, `{ "operations": [ {"mode":"delete","path":"a","description":"keep me"} ] }`)
	assertEqual(t, `{"operations":[{"mode":"delete","path":"a","description":"keep me"}]}`, string(p.Raw()))
}
