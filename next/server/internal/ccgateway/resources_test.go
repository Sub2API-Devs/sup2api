package ccgateway

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	resourcecontract "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestResourceTransportRejectsArbitraryDestinations(t *testing.T) {
	binding := core.ResourceBinding{AccountID: 22, PrincipalID: "issuer", Generation: "epoch"}
	for _, target := range []string{"https://other.test/v1/files", "http://ccgateway.internal/v1/files", "https://ccgateway.internal/v1/messages", "https://ccgateway.internal/v1/files/../messages", "https://ccgateway.internal/v1/files/file_x?target=http://localhost", "https://u:p@ccgateway.internal/v1/files", "https://ccgateway.internal/v1/files#secret"} {
		r, _ := http.NewRequest(http.MethodGet, target, nil)
		if _, err := (resourceTransport{}).RoundTrip(22, binding, r); err == nil {
			t.Fatalf("unapproved resource request accepted: %s", target)
		}
	}
	r, _ := http.NewRequest(http.MethodGet, "https://ccgateway.internal/v1/files/file_x/content", nil)
	if err := validateResourceRequest(22, binding, r); err != nil {
		t.Fatal(err)
	}
	if err := validateResourceRequest(21, binding, r); err == nil {
		t.Fatal("cross-account binding accepted")
	}
	h := http.Header{"Authorization": {"Bearer caller"}, "Cookie": {"private"}, "X-Api-Key": {"caller-key"}, "X-Ccgateway-Resource-Principal": {"fake"}, "Anthropic-Version": {"2023-06-01"}, "Content-Type": {"multipart/form-data; boundary=fixture"}}
	clean := resourceRequestHeaders(h)
	if clean.Get("Authorization") != "" || clean.Get("Cookie") != "" || clean.Get("X-Api-Key") != "" || clean.Get(resourcecontract.PrincipalHeader) != "" || clean.Get("Anthropic-Version") != "2023-06-01" || clean.Get("Content-Type") == "" {
		t.Fatal("resource request credentials were not isolated")
	}
}

func TestResourceTransportDBReusesAccountDiscoveryWithoutControllerBody(t *testing.T) {
	controlCalls := 0
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
		controlCalls++
		if r.Method != "GET" || !strings.HasSuffix(r.URL.Path, "/connection") || r.Header.Get("Authorization") != "Bearer controller-secret" {
			t.Error("resource payload reached controller")
		}
		_ = json.NewEncoder(w).Encode(accountConnection{IP: "10.52.74.181", Port: 8787, Key: strings.Repeat("k", 32), Revision: r.Header.Get("X-CCG-Revision")})
	})
	id := f.account(true)
	closed, calls := 0, 0
	wrongIssuer := false
	f.s.openAccount = func(_ context.Context, _ Config, target string) (*http.Client, func() error, error) {
		if target != "10.52.74.181:8787" {
			t.Error("unexpected discovered destination")
		}
		return &http.Client{Transport: accountTransportFunc(func(r *http.Request) (*http.Response, error) {
			calls++
			if r.Header.Get("x-api-key") != strings.Repeat("k", 32) || r.Header.Get("Authorization") != "" || r.Header.Get("Cookie") != "" {
				t.Error("worker call key not isolated")
			}
			headers := http.Header{"Content-Type": {"application/json"}}
			body := `{"principal_id":"issuer","generation":"epoch"}`
			if r.URL.Path != resourcecontract.IdentityPath {
				if r.URL.Path != resourcecontract.InternalPrefix+"/v1/files" || r.URL.RawQuery != "page=cursor" || r.Method != "GET" || r.Header.Get(resourcecontract.PrincipalHeader) != "issuer" || r.Header.Get(resourcecontract.GenerationHeader) != "epoch" {
					t.Error("resource operation or expected identity changed")
				}
				if wrongIssuer {
					headers.Set(resourcecontract.PrincipalHeader, "changed")
				} else {
					headers.Set(resourcecontract.PrincipalHeader, "issuer")
				}
				headers.Set(resourcecontract.GenerationHeader, "epoch")
				body = `{"data":[],"next_page":null}`
			}
			return &http.Response{StatusCode: 200, Header: headers, Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
		})}, func() error { closed++; return nil }, nil
	}
	transport := f.s.ResourceTransport()
	binding, err := transport.Identity(context.Background(), id)
	if err != nil || binding.AccountID != id || binding.PrincipalID != "issuer" || binding.Generation != "epoch" {
		t.Fatalf("identity: %+v %v", binding, err)
	}
	request, _ := http.NewRequest("GET", "https://ccgateway.internal/v1/files?page=cursor", nil)
	request.Header.Set("Authorization", "Bearer untrusted")
	request.Header.Set("Cookie", "untrusted")
	request.Header.Set(resourcecontract.PrincipalHeader, "untrusted")
	response, err := transport.RoundTrip(id, binding, request)
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
	wrongIssuer = true
	if response, err := transport.RoundTrip(id, binding, request); err == nil {
		response.Body.Close()
		t.Fatal("changed issuer response accepted")
	}
	if calls != 3 || controlCalls != 3 || closed != 3 {
		t.Fatalf("resource connection lifecycle: worker=%d controller=%d closed=%d", calls, controlCalls, closed)
	}
}
