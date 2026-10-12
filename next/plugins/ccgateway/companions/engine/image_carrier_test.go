package engine

import (
	"strings"
	"testing"
)

func TestNativeImageTransformationsRejectedBeforeCarrier(t *testing.T) {
	for _, mode := range []string{"error", "downsize"} {
		body := basic()
		body["messages"] = []any{Object{"role": "user", "content": []any{
			Object{"type": "image", "source": Object{"type": "base64", "media_type": "image/png", "data": "YQ=="}, "transformations": Object{"oversized_image": mode}},
			Object{"type": "text", "text": "q"},
		}}}
		if req, err := parsePolicyRequest(mustServerJSON(body), nil); err == nil || req != nil || !strings.Contains(err.Error(), "image transformations") {
			t.Fatalf("unsupported image transformation admitted: %v", err)
		}
	}
}
