package gateway

import (
	"encoding/json"
	"io"
	"net/http"
	"testing"
	"time"
)

// A body that arrives slowly is timed from the request's start to its last
// byte (CONTRACTS §63), and that time is part of the latency the row shows.
func TestUsageRecordsTheBodyUploadTime(t *testing.T) {
	e := newEnv(t)
	raw, _ := json.Marshal(body(testModel, false))
	r, w := io.Pipe()
	go func() {
		w.Write(raw[:len(raw)/2])
		time.Sleep(300 * time.Millisecond)
		w.Write(raw[len(raw)/2:])
		w.Close()
	}()
	req, _ := http.NewRequest(http.MethodPost, e.srv.URL+"/v1/messages", r)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", testKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	io.Copy(io.Discard, resp.Body)
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}
	rec := e.record()
	if rec.UploadMs < 250 || rec.UploadMs > rec.LatencyMs {
		t.Fatalf("upload %d ms, latency %d ms", rec.UploadMs, rec.LatencyMs)
	}
}
