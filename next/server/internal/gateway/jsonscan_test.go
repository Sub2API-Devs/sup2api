package gateway

import (
	"bytes"
	"encoding/base64"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

func TestScanJSONShapeDuplicateKeys(t *testing.T) {
	const uEsc = `\` + "u" // a JSON unicode escape prefix, spelled out
	cases := []struct {
		body string
		dup  string // "" = none
	}{
		{`{"messages":[{"role":"user","content":"a"}],"messages":[{"role":"user","content":"b"}]}`, "messages"},
		{`{"model":"m","messages":[{"role":"user","role":"assistant","content":"x"}]}`, "role"},
		{`{"a":{"b":1,"b":2}}`, "b"},
		{`{"messages":1,"m` + uEsc + `0065ssages":2}`, "messages"}, // escaped spelling of the same key
		{`{"a\"b":1,"a` + uEsc + `0022b":2}`, `a"b`},               // escaped quote inside the key
		{`[{"a":1},{"a":2}]`, ""},                                  // sibling objects are separate
		{`{"a":{"x":1},"b":{"x":1}}`, ""},                          // same key in different objects
		{`{"a":"b","b":"a"}`, ""},                                  // values are not keys
		{`{"a":["a","a"],"b":"a"}`, ""},                            // strings in arrays are not keys
		{`{"a\\":1,"a":2}`, ""},                                    // "a\" differs from "a"
		{`{"x":"he said \"a\":1, \"a\":2","y":1}`, ""},             // quoted JSON inside a string
		{`{"a":1,"b":{"c":[{"d":1,"e":{}}]},"f":[[],{}],"g":2}`, ""},
		{`"plain"`, ""},
		{`[]`, ""},
		{``, ""},
	}
	for _, tc := range cases {
		s := scanJSONShape([]byte(tc.body))
		assert.False(t, s.tooDeep, tc.body)
		assert.Equal(t, tc.dup != "", s.dup, tc.body)
		assert.Equal(t, tc.dup, s.dupKey, tc.body)
	}
}

func TestScanJSONShapeLargeObject(t *testing.T) {
	// Past smallObjectKeys the frame switches to a map; both halves must
	// still see the repeat.
	var b strings.Builder
	b.WriteString("{")
	for i := 0; i < 100; i++ {
		if i > 0 {
			b.WriteString(",")
		}
		b.WriteString(`"k` + itoa(int64(i)) + `":1`)
	}
	ok := b.String() + "}"
	assert.False(t, scanJSONShape([]byte(ok)).dup)
	s := scanJSONShape([]byte(b.String() + `,"k3":2}`))
	assert.True(t, s.dup)
	assert.Equal(t, "k3", s.dupKey)
	s = scanJSONShape([]byte(b.String() + `,"k99":2}`))
	assert.Equal(t, "k99", s.dupKey)
	// A sibling object after a large one starts empty (frames are reused).
	assert.False(t, scanJSONShape([]byte(`[`+ok+`,{"k3":1}]`)).dup)
}

func TestScanJSONShapeDepth(t *testing.T) {
	at := func(n int) []byte {
		return append(bytes.Repeat([]byte("["), n), bytes.Repeat([]byte("]"), n)...)
	}
	assert.False(t, scanJSONShape(at(maxJSONDepth)).tooDeep)
	assert.True(t, scanJSONShape(at(maxJSONDepth+1)).tooDeep)
	// Megabytes of '[' are refused before gjson recurses through them (that
	// overflowed the goroutine stack and killed the process).
	assert.True(t, scanJSONShape(bytes.Repeat([]byte(`{"a":[`), 1<<20)).tooDeep)
}

func TestScanJSONShapeInvalidInput(t *testing.T) {
	// Not a validator: garbage never panics and is left to gjson.
	for _, b := range []string{`{"a`, `}}}]]]`, `{"a":1,"a`, `"\`, `{"\u12":1,"\u12":2}`, `{:,,"a"::"a"}`} {
		s := scanJSONShape([]byte(b))
		_ = s
	}
}

func TestReadBodyRejectsDuplicateKeys(t *testing.T) {
	for _, tc := range []struct {
		format, want string
	}{
		{FormatAnthropic, `{"type":"error","error":{"type":"invalid_request_error","message":"request body contains duplicate key \"messages\": each object key may appear only once","code":"invalid_argument"}}`},
		{FormatOpenAI, `{"error":{"message":"request body contains duplicate key \"messages\": each object key may appear only once","type":"invalid_request_error","code":"invalid_argument","param":null}}`},
	} {
		e := (&call{body: []byte(`{"messages":[],"messages":[]}`)}).checkBodyJSON()
		if assert.NotNil(t, e) {
			c, w := testGinContext()
			writeError(c, tc.format, e)
			assert.Equal(t, 400, w.Code)
			assert.JSONEq(t, tc.want, w.Body.String())
			assert.Equal(t, errTypeInvalidRequest, e.RecordType)
		}
	}
	deep := append(bytes.Repeat([]byte("["), 5<<20), bytes.Repeat([]byte("]"), 5<<20)...)
	e := (&call{body: deep}).checkBodyJSON()
	if assert.NotNil(t, e) {
		assert.Equal(t, "request body is nested too deeply", e.Message)
	}
	e = (&call{body: []byte(`{"messages":[],"messages":`)}).checkBodyJSON()
	if assert.NotNil(t, e) {
		assert.Equal(t, "request body is not valid JSON", e.Message, "invalid JSON reads as invalid, not as a duplicate")
	}
	assert.Nil(t, (&call{body: []byte(`{"messages":[{"role":"user","content":"hi"}]}`)}).checkBodyJSON())
	assert.Nil(t, (&call{}).checkBodyJSON())
}

func TestPatchValueWithDuplicateKeyRejected(t *testing.T) {
	_, err := applyHookPatches([]byte(`{"messages":[]}`), []*pluginv1.BodyPatch{
		{Path: "messages", Op: pluginv1.BodyPatch_OP_SET, ValueJson: `[{"role":"user","role":"assistant"}]`},
	}, []string{"messages"})
	assert.ErrorContains(t, err, "repeats the object key")
	deep := strings.Repeat("[", 2*maxJSONDepth) + strings.Repeat("]", 2*maxJSONDepth)
	_, err = applyHookPatches([]byte(`{"messages":[]}`), []*pluginv1.BodyPatch{
		{Path: "messages", Op: pluginv1.BodyPatch_OP_SET, ValueJson: deep},
	}, []string{"messages"})
	assert.ErrorContains(t, err, "not valid JSON")
}

func testGinContext() (*gin.Context, *httptest.ResponseRecorder) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	return c, w
}

// largeBody is a Messages request carrying an image of n bytes in base64
// and a long conversation.
func largeBody(n int) []byte {
	img := base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{0xA5, 0x13, 0x7F}, n/3))
	var b strings.Builder
	b.WriteString(`{"model":"claude-x","max_tokens":1024,"stream":true,"system":[{"type":"text","text":"be nice"}],"messages":[`)
	for i := 0; i < 400; i++ {
		b.WriteString(`{"role":"user","content":[{"type":"text","text":"message number ` + itoa(int64(i)) + ` with some \"quoted\" text and \\n escapes"}]},`)
		b.WriteString(`{"role":"assistant","content":[{"type":"tool_use","id":"t","name":"bash","input":{"command":"ls -la","timeout":10}}]},`)
	}
	b.WriteString(`{"role":"user","content":[{"type":"image","source":{"type":"base64","media_type":"image/png","data":"` + img + `"}}]}]}`)
	return []byte(b.String())
}

func benchShape(b *testing.B, n int) {
	body := largeBody(n)
	b.SetBytes(int64(len(body)))
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if s := scanJSONShape(body); s.dup || s.tooDeep {
			b.Fatal("unexpected", s)
		}
	}
}

func BenchmarkScanJSONShape1MB(b *testing.B)  { benchShape(b, 1<<20) }
func BenchmarkScanJSONShape30MB(b *testing.B) { benchShape(b, 30<<20) }

// BenchmarkScanJSONShapeKeyHeavy is the worst shape for the scan: about
// 8 MB of small objects and short strings, no base64.
func BenchmarkScanJSONShapeKeyHeavy(b *testing.B) {
	var sb strings.Builder
	sb.WriteString(`{"model":"m","messages":[`)
	for i := 0; i < 40000; i++ {
		sb.WriteString(`{"role":"user","content":[{"type":"text","text":"hi \"there\""},{"type":"tool_result","tool_use_id":"x","content":"ok","is_error":false}]},`)
	}
	sb.WriteString(`{"role":"user","content":"end"}]}`)
	body := []byte(sb.String())
	b.SetBytes(int64(len(body)))
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if s := scanJSONShape(body); s.dup || s.tooDeep {
			b.Fatal("unexpected", s)
		}
	}
}

// BenchmarkGJSONValid30MB is the validation readBody already did, for
// comparison.
func BenchmarkGJSONValid30MB(b *testing.B) {
	body := largeBody(30 << 20)
	b.SetBytes(int64(len(body)))
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if !gjson.ValidBytes(body) {
			b.Fatal("invalid")
		}
	}
}
