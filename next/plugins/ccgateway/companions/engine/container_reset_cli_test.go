package engine

import (
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"
)

func TestRealCLINullContainerWithoutResourceGrant(t *testing.T) {
	var calls atomic.Int32
	endpoint, _ := executionGatewayFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			t.Fatal("unexpected request", r.URL.Path)
		}
		calls.Add(1)
		raw, _ := io.ReadAll(r.Body)
		body, err := decodeObject(raw)
		if err != nil {
			t.Fatal(err)
		}
		if value, exists := body["container"]; !exists || value != nil {
			t.Error("explicit null reset not preserved")
		}
		writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "RESET"}})
	})
	req, _ := http.NewRequest("POST", endpoint+"/v1/messages", strings.NewReader(`{"model":"claude-opus-5-5","max_tokens":64,"container":null,"messages":[{"role":"user","content":"reset"}]}`))
	req.Header.Set("X-Api-Key", "worker-fixture")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 || calls.Load() != 1 || !strings.Contains(string(raw), "RESET") {
		t.Fatalf("reset without authority: %d calls=%d %s", resp.StatusCode, calls.Load(), raw)
	}
}
