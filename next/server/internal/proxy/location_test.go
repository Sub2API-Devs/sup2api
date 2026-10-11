package proxy

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

type locationTransport func(*http.Request) (*http.Response, error)

func (f locationTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestProxyLocation(t *testing.T) {
	s := New(nil, nil, nil, Options{})
	client := &http.Client{Transport: locationTransport(func(r *http.Request) (*http.Response, error) {
		if r.URL.Scheme != "https" || r.URL.Host != "ipwho.is" || r.Header.Get("Authorization") != "" {
			t.Fatalf("unexpected lookup request: %s", r.URL)
		}
		if _, ok := r.Context().Deadline(); !ok {
			t.Fatal("lookup has no deadline")
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(`{"success":true,"ip":"8.8.8.8","country_code":"US","timezone":{"id":"America/Los_Angeles"}}`))}, nil
	})}
	got, err := s.lookupLocation(context.Background(), client)
	if err != nil || got.IP != "8.8.8.8" || got.CountryCode != "US" || got.Timezone != "America/Los_Angeles" {
		t.Fatalf("location = %+v, err = %v", got, err)
	}
}

func TestProxyLocationRejectsInvalidResponses(t *testing.T) {
	for _, tc := range []struct {
		name, body string
		status     int
	}{
		{"rate limit", `{}`, 429},
		{"redirect", `{}`, 302},
		{"provider error", `{"success":false}`, 200},
		{"invalid JSON", `not-json`, 200},
		{"missing IP", `{"success":true,"country_code":"US","timezone":{"id":"UTC"}}`, 200},
		{"invalid zone", `{"success":true,"ip":"8.8.8.8","country_code":"US","timezone":{"id":"Mars/Olympus"}}`, 200},
		{"local zone", `{"success":true,"ip":"8.8.8.8","country_code":"US","timezone":{"id":"Local"}}`, 200},
	} {
		t.Run(tc.name, func(t *testing.T) {
			s := New(nil, nil, nil, Options{})
			client := &http.Client{Transport: locationTransport(func(*http.Request) (*http.Response, error) {
				return &http.Response{StatusCode: tc.status, Header: http.Header{"Location": {"http://127.0.0.1/"}}, Body: io.NopCloser(strings.NewReader(tc.body))}, nil
			})}
			if _, err := s.lookupLocation(context.Background(), client); err == nil {
				t.Fatal("invalid response accepted")
			}
		})
	}
}

func TestProxyLocationTimeoutDoesNotExposeCredentials(t *testing.T) {
	s := New(nil, nil, nil, Options{ProbeTimeout: time.Millisecond})
	client := &http.Client{Transport: locationTransport(func(r *http.Request) (*http.Response, error) {
		<-r.Context().Done()
		return nil, fmt.Errorf("proxy https://user:secret@example.test:1234: %w", r.Context().Err())
	})}
	if _, err := s.lookupLocation(context.Background(), client); err == nil || strings.Contains(err.Error(), "secret") {
		t.Fatalf("unsafe error: %v", err)
	}
}
