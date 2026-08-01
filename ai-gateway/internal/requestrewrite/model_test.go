package requestrewrite

import (
	"io"
	"strings"
	"testing"
)

func TestReplaceModelStreamsOnlyLocatedValue(t *testing.T) {
	body := `{"input":"large-content","model":"client-model","stream":true}`
	start := int64(strings.Index(body, `"client-model"`))
	end := start + int64(len(`"client-model"`))
	rewritten, delta, err := ReplaceModel(io.NopCloser(strings.NewReader(body)), start, end, "upstream-model-long")
	if err != nil {
		t.Fatalf("ReplaceModel: %v", err)
	}
	result, err := io.ReadAll(rewritten)
	if err != nil {
		t.Fatalf("ReadAll: %v", err)
	}
	want := `{"input":"large-content","model":"upstream-model-long","stream":true}`
	if string(result) != want || int64(len(result)-len(body)) != delta {
		t.Fatalf("result=%s delta=%d", result, delta)
	}
}
