package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"testing"
)

func proxyStore(t *testing.T) *ProxyConfigStore {
	t.Helper()
	s, e := NewProxyConfigStore(t.TempDir(), "management-secret")
	if e != nil {
		t.Fatal(e)
	}
	return s
}

func TestProxyEncryptedPersistence(t *testing.T) {
	s := proxyStore(t)
	raw := "http://username:password-secret@proxy.example:8080"
	v, e := s.Update("proxy", raw)
	if e != nil {
		t.Fatal(e)
	}
	if v["url_redacted"] != "http://proxy.example:8080" || v["revision"] != uint64(1) {
		t.Fatalf("view: %v", v)
	}
	data, e := os.ReadFile(s.path)
	if e != nil {
		t.Fatal(e)
	}
	if strings.Contains(string(data), "password-secret") || strings.Contains(string(data), "proxy.example") {
		t.Fatal("plaintext configuration persisted")
	}
	if runtime.GOOS != "windows" {
		info, _ := os.Stat(s.path)
		if info.Mode().Perm() != 0600 {
			t.Fatal("insecure config permissions")
		}
	}
	reloaded, e := NewProxyConfigStore(filepath.Dir(s.path), "management-secret")
	if e != nil {
		t.Fatal(e)
	}
	if reloaded.config.URL != raw || reloaded.config.Revision != 1 {
		t.Fatal("encrypted roundtrip failed")
	}
	if _, e := NewProxyConfigStore(filepath.Dir(s.path), "wrong-key"); e == nil {
		t.Fatal("wrong key accepted")
	}
	data[len(data)-1] ^= 1
	_ = os.WriteFile(s.path, data, 0600)
	if _, e := NewProxyConfigStore(filepath.Dir(s.path), "management-secret"); e == nil {
		t.Fatal("tampering accepted")
	}
}

func TestProxyValidationAndRetain(t *testing.T) {
	s := proxyStore(t)
	for _, raw := range []string{"socks5://user:password-secret@host:1234", "http://user:password-secret@host:0", "http://user:password-secret@host:65536", "http://host/path", "http://host?secret=x", "http://host#secret", "http://host:", "http://host\n", "https://:password@host", "http://host:abc", "http://user:password-secret@bad_host"} {
		_, e := s.Update("proxy", raw)
		if e == nil {
			t.Fatalf("accepted invalid URL %q", raw)
		}
		if strings.Contains(e.Error(), "password-secret") {
			t.Fatal("error leaked secret")
		}
	}
	if _, e := s.Update("proxy", ""); e == nil {
		t.Fatal("empty first proxy accepted")
	}
	if _, e := s.Update("proxy", "https://user:password-secret@proxy.example:443"); e != nil {
		t.Fatal(e)
	}
	if _, e := s.Update("proxy", ""); e != nil {
		t.Fatal(e)
	}
	if !strings.Contains(s.config.URL, "password-secret") {
		t.Fatal("existing proxy not retained")
	}
	if _, e := s.Update("direct", ""); e != nil {
		t.Fatal(e)
	}
	if s.config.URL != "" {
		t.Fatal("direct retained credentials")
	}
	if _, e := s.Update("proxy", ""); e == nil {
		t.Fatal("empty proxy after direct accepted")
	}
}

func TestProxyConcurrentSnapshots(t *testing.T) {
	s := proxyStore(t)
	base := []string{"HTTP_PROXY=http://old", "https_proxy=http://old", "ALL_PROXY=socks5://old", "NO_PROXY=localhost", "KEEP=value"}
	if got := s.Environment(base); strings.Join(got, ";") != strings.Join(base, ";") {
		t.Fatal("inherit changed env")
	}
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for n := 0; n < 25; n++ {
				mode := "proxy"
				raw := "http://user:secret@proxy.example:8080"
				if n%2 == 0 {
					mode = "direct"
					raw = ""
				}
				if _, e := s.Update(mode, raw); e != nil {
					t.Error(e)
					return
				}
				env := s.Environment(base)
				values := map[string]string{}
				for _, v := range env {
					k, value, _ := strings.Cut(v, "=")
					values[k] = value
				}
				if values["ALL_PROXY"] != "" || values["HTTP_PROXY"] != values["HTTPS_PROXY"] || values["HTTP_PROXY"] != values["http_proxy"] || values["HTTP_PROXY"] != values["https_proxy"] {
					t.Error("mixed configuration snapshot")
					return
				}
			}
		}()
	}
	wg.Wait()
	if base[0] != "HTTP_PROXY=http://old" {
		t.Fatal("snapshot mutated caller env")
	}
}

func TestProxyManagementAPI(t *testing.T) {
	s := proxyStore(t)
	a := &authManager{key: "admin-secret", proxy: s}
	if w := authRequest(a, "PUT", "/admin/proxy", `{"mode":"proxy","url":"http://u:password-secret@host:8080"}`, "wrong"); w.Code != 401 {
		t.Fatal("missing management auth")
	}
	w := authRequest(a, "PUT", "/admin/proxy", `{"mode":"proxy","url":"http://u:password-secret@host:8080"}`, "admin-secret")
	if w.Code != 200 || strings.Contains(w.Body.String(), "password-secret") || strings.Contains(w.Body.String(), "u@") {
		t.Fatalf("unsafe proxy response %d %s", w.Code, w.Body.String())
	}
	w = authRequest(a, "GET", "/admin/proxy", "", "admin-secret")
	var got Object
	if json.Unmarshal(w.Body.Bytes(), &got) != nil || got["mode"] != "proxy" {
		t.Fatal("GET did not return proxy view")
	}
	for _, body := range []string{`{"mode":"proxy","url":"http://secret:password-secret@host:abc"}`, `{"mode":"direct"} {}`, `{"mode":"direct","unknown":"password-secret"}`} {
		w = authRequest(a, "PUT", "/admin/proxy", body, "admin-secret")
		if w.Code != 400 || strings.Contains(w.Body.String(), "password-secret") {
			t.Fatal("unsafe error response")
		}
	}
	if disabled, e := NewProxyConfigStore(t.TempDir(), ""); e != nil || disabled != nil {
		t.Fatal("empty admin key enabled store")
	}
	if _, e := s.Update("proxy", "http://user:password-secret@host:8080"); e != nil {
		t.Fatal(e)
	}
	before := s.config
	s.path = filepath.Join(t.TempDir(), "missing", "proxy.enc")
	if _, e := s.Update("direct", ""); e == nil || s.config != before {
		t.Fatal("failed persistence changed live configuration")
	}
}
