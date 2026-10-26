package engine

import (
	"bytes"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"slices"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/stretchr/testify/require"
)

// bodies are the request shapes request preparation must treat alike before
// and after the body was parsed once. Each is also a case the older code
// answered: a plain Claude Code request, one with metadata.user_id in each
// carrier, credential keys (also escaped ones), and bodies that are not a
// Messages object.
func requestBodies() map[string]string {
	return map[string]string{
		"plain":         `{"model":"claude-sonnet-4-6","max_tokens":64,"stream":true,"system":"s","messages":[{"role":"user","content":"hi"}]}`,
		"spacing":       "{ \"model\" : \"m\" ,\n \"messages\" : [ { \"role\" : \"user\" , \"content\" : \"x\" } ] , \"max_tokens\" : 9007199254740993 }",
		"user id json":  `{"model":"m","metadata":{"user_id":"{\"device_id\":\"d\",\"session_id\":\"3f2a1b0c-4d5e-4f70-8192-a3b4c5d6e7f8\"}"},"messages":[{"role":"user","content":"hi"}]}`,
		"user id obj":   `{"model":"m","metadata":{"user_id":{"device_id":"d","session_id":"s"}},"messages":[{"role":"user","content":"hi"}]}`,
		"user id flat":  `{"model":"m","metadata":{"user_id":"user_` + strings.Repeat("a", 64) + `_account__session_4c9d7f1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f"},"messages":[{"role":"user","content":"hi"}]}`,
		"user id null":  `{"model":"m","metadata":{"user_id":null},"messages":[{"role":"user","content":"hi"}]}`,
		"user id int":   `{"model":"m","metadata":{"user_id":7},"messages":[{"role":"user","content":"hi"}]}`,
		"two metadata":  `{"model":"m","metadata":{"user_id":"a"},"metadata":{"user_id":"b"},"messages":[{"role":"user","content":"hi"}]}`,
		"credential":    `{"model":"m","mcp_servers":[{"authorization_token":"SENTINEL"}],"messages":[{"role":"user","content":"hi"}]}`,
		"credential cs": `{"model":"m","stop_details":{"Fallback_Credit_Token":{"token":"SENTINEL"}},"messages":[{"role":"user","content":"hi"}]}`,
		"credential esc": `{"model":"m","stop_details":{"authorization_token":"SENTINEL"},` +
			`"messages":[{"role":"user","content":"hi"}]}`,
		"escape elsewhere": `{"model":"m","messages":[{"role":"user","content":"A plain text mentioning authorization_token"}]}`,
		"two tokens":       `{"authorization_token":"A","nested":{"fallback_credit_token":"B"},"messages":[]}`,
		"invalid":          `{"model":"m","messages":[`,
		"invalid object":   `{"model":"m","messages":[]} trailing`,
		"null":             `null`,
		"array":            `[{"model":"m"}]`,
		"empty object":     `{}`,
		"no model":         `{"model":" ","messages":[]}`,
		"tools": `{"model":"m","tools":[{"name":"Bash","input_schema":{"type":"object"}},{"type":"web_search_20250305","name":"web_search"}],` +
			`"messages":[{"role":"user","content":[{"type":"text","text":"x"}]}]}`,
		"number precision":   `{"model":"m","messages":[{"role":"user","content":"x"}],"max_tokens":9007199254740993}`,
		"null system":        `{"model":"m","system":null,"messages":[{"role":"user","content":"x"}]}`,
		"stream not bool":    `{"model":"m","stream":"yes","messages":[{"role":"user","content":"x"}]}`,
		"model not string":   `{"model":7,"messages":[{"role":"user","content":"x"}]}`,
		"messages not array": `{"model":"m","messages":{"role":"user"}}`,
		"long messages":      "{\"model\":\"m\",\"messages\":[" + strings.Repeat(`{"role":"user","content":"x"},`, 300) + `{"role":"user","content":"x"}]}`,
		// A number float64 cannot hold made the credential scan call the body
		// malformed, whatever its syntax; that answer must not change.
		"number overflow":   `{"model":"m","max_tokens":1e999,"messages":[{"role":"user","content":"x"}]}`,
		"number underflow":  `{"model":"m","max_tokens":1e-999,"messages":[{"role":"user","content":"x"}]}`,
		"overflow in array": `{"model":"m","messages":[{"role":"user","content":"x","n":-1E400}]}`,
	}
}

// legacyBodyParse is what preparing a request did before the body was parsed
// once: the top-level members, and whether the credential scan's tree decode
// read the whole document.
func legacyBodyParse(t *testing.T, raw []byte) (top map[string]json.RawMessage, tree any, scannable bool) {
	t.Helper()
	_ = json.Unmarshal(raw, &top)
	scannable = json.Unmarshal(raw, &tree) == nil
	return top, tree, scannable
}

func legacySecrets(raw []byte, betaHeaders ...string) (capture bool, tokens []string) {
	d := &requestDiagnostic{fields: Object{}}
	legacyPrepareSecrets(d, raw, betaHeaders...)
	return d.secretCapture, d.secretTokens
}

// legacyPrepareSecrets is the credential scan as it ran on the body bytes.
func legacyPrepareSecrets(d *requestDiagnostic, body []byte, betaHeaders ...string) {
	for _, header := range betaHeaders {
		for _, beta := range strings.Split(header, ",") {
			beta = strings.TrimSpace(beta)
			if strings.HasPrefix(beta, "fallback-credit-") || strings.HasPrefix(beta, "server-side-fallback-") {
				d.secretCapture = true
			}
		}
	}
	var value any
	if json.Unmarshal(body, &value) != nil {
		d.secretCapture = true
		return
	}
	var visit func(any)
	visit = func(v any) {
		switch v := v.(type) {
		case map[string]any:
			for key, child := range v {
				if strings.EqualFold(key, "authorization_token") || strings.EqualFold(key, "fallback_credit_token") {
					d.secretCapture = true
					if object, ok := child.(map[string]any); ok {
						if text, ok := object["token"].(string); ok && text != "" {
							d.secretTokens = append(d.secretTokens, text)
						}
					}
					if text, ok := child.(string); ok && text != "" {
						d.secretTokens = append(d.secretTokens, text)
					}
				}
				visit(child)
			}
		case []any:
			for _, child := range v {
				visit(child)
			}
		}
	}
	visit(value)
}

// The one parse reads exactly what the tree decode read: the same top-level
// members with the same bytes, the same answer on whether the credential scan
// can read the body, and the same refusal. valid is that scan's answer, not
// json.Valid: a number float64 cannot hold is valid JSON the scan refuses.
func TestRequestBodyParseMatchesTheWholeBodyRead(t *testing.T) {
	for name, raw := range requestBodies() {
		raw := []byte(raw)
		top, tree, scannable := legacyBodyParse(t, raw)
		_ = tree
		body := parseRequestBody(raw)
		require.Equal(t, scannable, body.valid, name)
		if top == nil {
			require.Error(t, body.err, name)
			continue
		}
		require.NoError(t, body.err, name)
		require.Equal(t, len(top), len(body.top), name)
		for key, want := range top {
			require.Equal(t, string(want), string(body.top[key]), "%s: %s", name, key)
		}
	}
}

// A value keeps its bytes exactly as the client wrote them, spacing included:
// the build envelope and the log's summary are computed from these bytes.
func TestRequestBodyKeepsEachValueByteForByte(t *testing.T) {
	raw := []byte("{\n  \"model\" : \"m\" ,\n  \"messages\" : [ {\n    \"role\": \"user\" } ]\n}\n")
	body := parseRequestBody(raw)
	var want map[string]json.RawMessage
	require.NoError(t, json.Unmarshal(raw, &want))
	require.Equal(t, len(want), len(body.top))
	for key, value := range want {
		require.Equal(t, string(value), string(body.top[key]), key)
	}
	require.Equal(t, `"m"`, string(body.top["model"]))
	require.Contains(t, string(body.top["messages"]), "\n    \"role\"")
}

// The credential scan answers exactly what it answered on the bytes, whether
// or not it could take the shortcut, and no escape spelling of a key slips by
// it. The tree walk visits a map's keys in map order, so two credentials of
// one body were never collected in a fixed order: the sets are compared.
func TestPrepareSecretsMatchesTheTreeWalk(t *testing.T) {
	headers := [][]string{nil, {"fallback-credit-2026-07-01"}, {"test-beta, server-side-fallback-2026-07-01"}}
	for name, raw := range requestBodies() {
		for _, beta := range headers {
			wantCapture, wantTokens := legacySecrets([]byte(raw), beta...)
			d := &requestDiagnostic{fields: Object{}}
			d.prepareSecrets(parseRequestBody([]byte(raw)), beta...)
			require.Equal(t, wantCapture, d.secretCapture, name)
			require.Equal(t, slices.Sorted(slices.Values(wantTokens)), slices.Sorted(slices.Values(d.secretTokens)), name)
		}
	}
}

// A body that cannot hold a credential key never walks the tree; one that can
// never misses it. The shortcut only decides how the answer is reached.
func TestCredentialShortcutIsSound(t *testing.T) {
	cases := []struct {
		raw     string
		mayHold bool
	}{
		{`{"model":"m","messages":[]}`, false},
		{`{"model":"m","messages":[{"content":"authorization_token"}]}`, true},
		{`{"authorization_token":"S"}`, true},
		{`{"AUTHORIZATION_TOKEN":"S"}`, true},
		{`{"fallback_credit_token":"S"}`, true},
		{`{"stop":{"authorization_Token":"S"}}`, true},
		{`{"messages":[{"content":"tab\there"}]}`, false}, // an escape, but not of a letter
		{"{\"messages\":[{\"content\":\"中\"}]}", false},   // a literal letter, not an escape
		// The key with one letter written as an escape names the same key.
		{`{"` + escapedCredentialKey + `":"S"}`, true},
		{`{"messages":[{"content":"\n"}]}`, false}, // \n cannot be a key's letter
	}
	for _, tc := range cases {
		require.Equal(t, tc.mayHold, parseRequestBody([]byte(tc.raw)).mayHoldCredential(), tc.raw)
	}
}

// escapedCredentialKey is one credential key with a letter spelled as its
// JSON unicode escape: the same key, written another way.
var escapedCredentialKey = "authorization_" + jsonEscapedLetter + "oken"

// jsonEscapedLetter is a "t" as JSON may spell it, escape and all.
const jsonEscapedLetter = "\\" + "u0074"

// The redaction a captured body gets still hides a credential value whose key
// was spelled with an escape: the escape is not a way around detection.
func TestEscapedCredentialKeyIsStillDetectedAndRedacted(t *testing.T) {
	d := &requestDiagnostic{directory: t.TempDir(), fields: Object{}}
	raw := []byte(`{"model":"m","` + escapedCredentialKey + `":"ESCAPED_SENTINEL"}`)
	d.prepareSecrets(parseRequestBody(raw))
	require.True(t, d.secretCapture)
	require.Equal(t, []string{"ESCAPED_SENTINEL"}, d.secretTokens)
	d.save("request.body", raw)
	data, err := os.ReadFile(filepath.Join(d.directory, "request.body"))
	require.NoError(t, err)
	require.NotContains(t, string(data), "ESCAPED_SENTINEL")
}

// The identity carrier reads the same value either way, including the bodies
// whose metadata the byte-level reader must keep judging (unreadable JSON,
// metadata twice).
func TestClientIdentityMatchesTheWholeBodyRead(t *testing.T) {
	for name, raw := range requestBodies() {
		body := parseRequestBody([]byte(raw))
		require.Equal(t, readClientIdentity([]byte(raw)), body.clientIdentity(), name)
	}
}

// The redemption token is read exactly as before.
func TestCreditTokenMatchesTheWholeBodyRead(t *testing.T) {
	for name, raw := range requestBodies() {
		body := parseRequestBody([]byte(raw))
		require.Equal(t, legacyCreditToken([]byte(raw)), body.creditToken(), name)
	}
}

func legacyCreditToken(raw []byte) any {
	if !bytes.Contains(raw, []byte("fallback_credit_token")) {
		return nil
	}
	var top map[string]json.RawMessage
	if json.Unmarshal(raw, &top) != nil {
		return nil
	}
	field, exists := top["fallback_credit_token"]
	if !exists {
		return nil
	}
	decoder := json.NewDecoder(bytes.NewReader(field))
	decoder.UseNumber()
	var value any
	if decoder.Decode(&value) != nil {
		return nil
	}
	return value
}

// The log's summary fields are the ones the inline summary produced.
func TestRequestSummaryMatchesTheInlineSummary(t *testing.T) {
	for name, raw := range requestBodies() {
		want := legacySummary([]byte(raw))
		got := summarizeRequest(parseRequestBody([]byte(raw)).summaryInput())
		require.Equal(t, want, got, name)
	}
}

func legacySummary(raw []byte) Object {
	fields := Object{}
	o, err := decodeObject(raw)
	if err != nil {
		fields["invalid_json"] = true
		return fields
	}
	fields["model"] = logValue(str(o, "model"))
	if stream, ok := o["stream"].(bool); ok {
		fields["stream"] = stream
	}
	fields["has_system"] = o["system"] != nil
	messages, _ := o["messages"].([]any)
	fields["message_count"] = len(messages)
	summaries, truncated := messageSummaries(messages)
	fields["messages"] = summaries
	if truncated {
		fields["messages_truncated"] = true
	}
	return fields
}

// The CLI's stdin is the same envelope as when the body was parsed whole.
func TestBuildEnvelopeMatchesTheWholeBodyParse(t *testing.T) {
	policy := &features.CLIPolicy{ContractVersion: 2}
	bodies := requestBodies()
	bodies["system blocks"] = `{"model":"m","system":[{"type":"text","text":"p","cache_control":{"type":"ephemeral"}}],"messages":[{"role":"user","content":[{"type":"text","text":"x"}]}],"stream":false}`
	bodies["empty tools"] = `{"model":"m","tools":[],"messages":[{"role":"user","content":"x"}]}`
	bodies["non custom tool"] = `{"model":"m","tools":[{"type":"web_search_20250305","name":"w","input_schema":null}],"messages":[{"role":"user","content":"x"}]}`
	for name, raw := range bodies {
		want, wantErr := legacyBuildComponents([]byte(raw), policy, "/work")
		got, gotErr := messagesBuildComponentsFrom(parseRequestBody([]byte(raw)), policy, "/work")
		if wantErr != nil || gotErr != nil {
			require.Equal(t, wantErr == nil, gotErr == nil, name)
			require.Equal(t, errorText(wantErr), errorText(gotErr), name)
			continue
		}
		require.Equal(t, string(want), string(got), name)
	}
}

func errorText(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}

// legacyBuildComponents is the envelope built from the body parsed whole.
func legacyBuildComponents(raw []byte, policy *features.CLIPolicy, workingDirectory string) ([]byte, error) {
	var body map[string]json.RawMessage
	if err := json.Unmarshal(raw, &body); err != nil || body == nil {
		return nil, errNotMessagesObject
	}
	var model string
	if json.Unmarshal(body["model"], &model) != nil || strings.TrimSpace(model) == "" {
		return nil, errors.New("model must be a non-empty string")
	}
	messages, err := validateBuildContent(body)
	if err != nil {
		return nil, err
	}
	system, hasSystem, err := buildSystemComponent(body)
	if err != nil {
		return nil, err
	}
	tools, hasTools, err := buildToolComponents(body)
	if err != nil {
		return nil, err
	}
	stream, hasStream := body["stream"]
	for _, key := range []string{"model", "system", "messages", "tools", "stream"} {
		delete(body, key)
	}
	components := map[string]any{"model": model, "messages": messages, "attachments": []any{}, "parameters": body}
	if hasSystem {
		components["systemPrompt"] = system
	}
	if hasStream {
		components["stream"] = stream
	}
	if hasTools {
		components["tools"] = tools
	}
	components["requestPolicy"] = policy
	components["runtimeContext"] = map[string]any{"workingDirectory": workingDirectory, "additionalWorkingDirectories": []string{}}
	return json.Marshal(components)
}

// A 1 MiB request body -- the shape that made the repeated parses expensive --
// still prepares into exactly the same envelope.
func TestLargeRequestPreparesTheSameEnvelope(t *testing.T) {
	if testing.Short() {
		t.Skip("large body")
	}
	var messages []string
	for i := 0; i < 450; i++ {
		messages = append(messages, `{"role":"user","content":"`+strings.Repeat("x", 2400)+`"}`)
	}
	raw := []byte(`{"model":"claude-sonnet-4-6","max_tokens":32,"system":"s","tools":[{"name":"Bash","input_schema":{"type":"object"}}],"messages":[` + strings.Join(messages, ",") + `]}`)
	require.Greater(t, len(raw), 1<<20)
	policy := &features.CLIPolicy{ContractVersion: 2}
	want, wantErr := legacyBuildComponents(raw, policy, "/work")
	got, gotErr := messagesBuildComponents(raw, policy, "/work")
	require.NoError(t, wantErr)
	require.NoError(t, gotErr)
	require.True(t, reflect.DeepEqual(want, got))
}
