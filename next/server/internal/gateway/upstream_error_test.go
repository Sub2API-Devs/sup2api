package gateway

import (
	"bytes"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestUpstreamHTTPErrorVerbatim(t *testing.T) {
	for _, tc := range []struct {
		name, ct string
		body     []byte
	}{
		{"json", "application/problem+json", []byte("{ \"error\": {\"type\":\"invalid_request_error\",\"message\":\"actual upstream reason\"} }\n")},
		{"html", "text/html; charset=utf-8", []byte("<h1>bad request</h1>\n")},
		{"empty", "", []byte{}},
		{"binary", "application/octet-stream", []byte{0xff, 0x00, 0x80, 0x0a}},
		{"large", "text/plain", bytes.Repeat([]byte("original\x00\xff"), 20000)},
	} {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(w)
			c := &call{c: ctx, rec: &core.UsageRecord{ErrorMessage: "inferred reason"}}
			defer c.closeErrorBodies()
			body, err := c.readUpstreamError(bytes.NewReader(tc.body))
			require.NoError(t, err)
			e := &gwError{Status: 502, Message: "wrapper", Code: "plugin_override"}
			h := http.Header{"Retry-After": {"7"}}
			if tc.ct != "" {
				h.Set("Content-Type", tc.ct)
			}
			c.preserveHTTPError(e, 400, h, body)
			writeError(ctx, FormatAnthropic, e)
			require.Equal(t, 400, w.Code)
			require.True(t, bytes.Equal(tc.body, w.Body.Bytes()), "upstream bytes changed")
			require.Equal(t, tc.ct, w.Header().Get("Content-Type"))
			require.Equal(t, "7", w.Header().Get("Retry-After"))
			if tc.name == "json" {
				require.Equal(t, "actual upstream reason", c.rec.ErrorMessage)
			}
			require.True(t, utf8.ValidString(c.rec.ErrorMessage))
			require.False(t, strings.ContainsRune(c.rec.ErrorMessage, 0))
			if body.file != nil {
				path := body.file.Name()
				c.closeErrorBodies()
				_, err = os.Stat(path)
				require.True(t, os.IsNotExist(err))
			}
		})
	}
}

type failedErrorRead struct{}

func (failedErrorRead) Read([]byte) (int, error) { return 0, errors.New("broken connection") }

func TestUpstreamHTTPErrorReadFailureDoesNotBecomeCompleteBody(t *testing.T) {
	c := &call{}
	defer c.closeErrorBodies()
	b, err := c.readUpstreamError(io.MultiReader(bytes.NewReader(bytes.Repeat([]byte("x"), maxErrorBody+10)), failedErrorRead{}))
	require.Error(t, err)
	require.Nil(t, b)
}

func TestUpstreamHTTPErrorPipelinePreservesBodyAndLogMessage(t *testing.T) {
	for _, policy := range []bool{false, true} {
		t.Run(map[bool]string{false: "plugin", true: "policy"}[policy], func(t *testing.T) {
			e := newEnv(t)
			if policy {
				p := simpleTestPolicy()
				p.RetryEnabled = false
				e.setFailurePolicy(p)
			}
			for _, raw := range []string{`{ "error":{"type":"invalid_request_error","message":"actual upstream reason"},"extra":true }`, "<h1>bad request</h1>", string(bytes.Repeat([]byte("original\xff"), 20000))} {
				e.up.set("acc-1", &upstreamRule{status: 400, body: raw})
				r := e.messages(body(testModel, false))
				require.Equal(t, 400, r.status)
				require.Equal(t, raw, string(r.body))
				require.Equal(t, truncateUTF8(upstreamErrorMessage([]byte(raw)), 1000), e.record().ErrorMessage)
			}
		})
	}
}
