package engine

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestModControlAcknowledgementsAndIsolation(t *testing.T) {
	c, err := startModControl(&runConfig{env: map[string]string{}, systems: []string{"one", "two"}}, "http://127.0.0.1:8787")
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	call := func(token, remote, body string) int {
		r := httptest.NewRequest("POST", c.URL, strings.NewReader(body))
		r.RemoteAddr = remote
		r.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		if !serveModControl(w, r) {
			t.Fatal("callback route missing")
		}
		return w.Code
	}
	if call("wrong", "127.0.0.1:1234", `{"event":"ready","version":"ccgateway-v2"}`) != 404 {
		t.Fatal("wrong token accepted")
	}
	if call(c.token, "10.0.0.2:1234", `{"event":"ready","version":"ccgateway-v2"}`) != 404 {
		t.Fatal("non-loopback accepted")
	}
	if c.verify() == nil {
		t.Fatal("missing ready accepted")
	}
	if call(c.token, "127.0.0.1:1234", `{"event":"system","systems":2}`) != 400 {
		t.Fatal("system ack accepted before ready")
	}
	if call(c.token, "127.0.0.1:1234", `{"event":"ready","version":"ccgateway-v2"} {}`) != 400 {
		t.Fatal("extra JSON accepted")
	}
	if call(c.token, "127.0.0.1:1234", `{"event":"ready","version":"ccgateway-v2"}`) != 200 {
		t.Fatal("ready rejected")
	}
	if c.verify() == nil {
		t.Fatal("missing system ack accepted")
	}
	if call(c.token, "127.0.0.1:1234", `{"event":"system","systems":1}`) != 400 {
		t.Fatal("wrong count accepted")
	}
	if call(c.token, "127.0.0.1:1234", `{"event":"system","systems":2}`) != 200 {
		t.Fatal("matching system ack rejected")
	}
	if err := c.verify(); err != nil {
		t.Fatal(err)
	}
	c.Close()
	if serveModControl(httptest.NewRecorder(), httptest.NewRequest("GET", c.URL, nil)) {
		t.Fatal("closed route retained")
	}
}

func TestModConfigurationLargeSystemsAndDeferredTools(t *testing.T) {
	text := strings.Repeat("large system ", 20000)
	c, err := startModControl(&runConfig{env: map[string]string{"CCGATEWAY_TOOL_SEARCH": "1"}, systems: []string{text}, deferral: []byte(`{"mcp__ccgateway__echo":true}`)}, "")
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	r, _ := http.NewRequest("GET", c.URL, nil)
	r.Header.Set("Authorization", "Bearer "+c.token)
	res, err := http.DefaultClient.Do(r)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	data, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != 200 || !strings.Contains(string(data), text) || !strings.Contains(string(data), `"mcp__ccgateway__echo":true`) {
		t.Fatal("configuration lost")
	}
}
