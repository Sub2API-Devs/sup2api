package healthcheck

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

// covers: C6 02-§7.5 (healthy only on 200 with the expected controller_image)
func TestCheck(t *testing.T) {
	key := strings.Repeat("k", 32)
	body, status := `{"controller_image": "ctl:2"}`, 200
	var auth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth = r.Header.Get("Authorization")
		if r.URL.Path != "/health" {
			w.WriteHeader(404)
			return
		}
		w.WriteHeader(status)
		w.Write([]byte(body))
	}))
	defer srv.Close()
	u, _ := url.Parse(srv.URL)
	env := map[string]string{"CCG_CONTROLLER_KEY": key, "CCG_CONTROLLER_IMAGE": "ctl:2", "CCG_CONTROLLER_PORT": u.Port()}
	get := func(k string) string { return env[k] }
	if code := check(context.Background(), get, "127.0.0.1"); code != 0 || auth != "Bearer "+key {
		t.Fatal(code, auth)
	}
	for _, c := range []struct {
		body   string
		status int
	}{{`{"controller_image": "ctl:1"}`, 200}, {`{}`, 200}, {`nope`, 200}, {`{"controller_image": "ctl:2"}`, 401}} {
		body, status = c.body, c.status
		if check(context.Background(), get, "127.0.0.1") != 1 {
			t.Errorf("%s %d is unhealthy", c.body, c.status)
		}
	}
	body, status = `{"controller_image": ""}`, 200
	env["CCG_CONTROLLER_IMAGE"] = ""
	if check(context.Background(), get, "127.0.0.1") != 0 {
		t.Fatal("an empty image matches an empty report")
	}
	env["CCG_CONTROLLER_KEY"] = ""
	if check(context.Background(), get, "127.0.0.1") != 1 {
		t.Fatal("no key")
	}
	env["CCG_CONTROLLER_KEY"], env["CCG_CONTROLLER_PORT"] = key, "x"
	if check(context.Background(), get, "127.0.0.1") != 1 {
		t.Fatal("bad port")
	}
	env["CCG_CONTROLLER_PORT"] = "1"
	if Run(context.Background(), get) != 1 {
		t.Fatal("nothing listens")
	}
}
