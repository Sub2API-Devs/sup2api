package ccgateway

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAccountModelConnectsDirectlyWithoutControllerBody(t *testing.T) {
	const revision = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	connection := accountConnection{IP: "10.52.74.181", Port: 8787, Key: strings.Repeat("k", 32), Revision: revision}
	controlCalls := 0
	controller := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		controlCalls++
		if r.Method != "GET" || (r.URL.Path != "/accounts/21/connection" && r.URL.Path != "/accounts/22/connection") || r.Header.Get("Authorization") != "Bearer admin" || r.Header.Get("X-CCG-Revision") != revision {
			t.Error("incorrect control-plane request")
		}
		_ = json.NewEncoder(w).Encode(connection)
	}))
	defer controller.Close()
	accountOpened := false
	s := &Service{openController: func(context.Context, Config) (*http.Client, string, func() error, error) {
		return controller.Client(), controller.URL, func() error { return nil }, nil
	}, openAccount: func(_ context.Context, _ Config, target string) (*http.Client, func() error, error) {
		accountOpened = target == "10.52.74.181:8787"
		return &http.Client{}, func() error { return nil }, nil
	}}
	_, base, key, close, err := s.openAccountModel(context.Background(), Config{Mode: "ssh", AdminKey: "admin"}, "21", revision)
	if err != nil {
		t.Fatal(err)
	}
	defer close()
	if !accountOpened || controlCalls != 1 || base != "http://10.52.74.181:8787" || key != connection.Key {
		t.Fatal("direct account connection not selected")
	}
	for _, ip := range []string{"169.254.169.254", "127.0.0.1", "8.8.8.8", "172.16.0.10", "192.168.0.10", "::ffff:10.52.74.181"} {
		connection.IP = ip
		if _, _, _, _, err := s.openAccountModel(context.Background(), Config{Mode: "ssh", AdminKey: "admin"}, "21", revision); err == nil {
			t.Fatal("invalid address accepted", ip)
		}
	}
	// New accounts and changed addresses are discovered each time, without a
	// per-account allowlist. A configured smaller pool still constrains them.
	cfg := Config{Mode: "ssh", AdminKey: "admin", Network: &RuntimeNetwork{Pool: "10.77.0.0/16", Allocation: "random"}}
	for _, ip := range []string{"10.77.1.12", "10.77.201.94"} {
		connection.IP = ip
		_, base, _, close, err := s.openAccountModel(context.Background(), cfg, "22", revision)
		if err != nil {
			t.Fatal(err)
		}
		close()
		if base != "http://"+ip+":8787" {
			t.Fatal("dynamic endpoint not discovered")
		}
	}
	connection.IP = "10.78.1.12"
	if _, _, _, _, err := s.openAccountModel(context.Background(), cfg, "22", revision); err == nil {
		t.Fatal("endpoint outside configured account pool accepted")
	}
	connection.IP = "10.52.74.181"
	connection.Revision = strings.Repeat("b", 64)
	if _, _, _, _, err := s.openAccountModel(context.Background(), Config{Mode: "ssh", AdminKey: "admin"}, "21", revision); err == nil {
		t.Fatal("stale revision accepted")
	}
}

type accountTransportFunc func(*http.Request) (*http.Response, error)

func (f accountTransportFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
