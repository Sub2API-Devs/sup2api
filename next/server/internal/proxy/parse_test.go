package proxy

import (
	"net/http"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestParseURL(t *testing.T) {
	const secret = "p4ssw0rd-NEVER-ECHO"
	cases := []struct {
		name string
		raw  string
		want Spec
		err  bool
	}{
		{"http", "http://proxy.example.com:8080", Spec{Protocol: "http", Host: "proxy.example.com", Port: 8080}, false},
		{"https with auth", "https://bob:" + secret + "@Proxy.Example.com:443/",
			Spec{Protocol: "https", Host: "proxy.example.com", Port: 443, Username: "bob", Password: secret}, false},
		{"socks5", "SOCKS5://10.0.0.1:1080", Spec{Protocol: "socks5", Host: "10.0.0.1", Port: 1080}, false},
		{"socks5h normalised", "socks5h://u:p@h.example:1080", Spec{Protocol: "socks5", Host: "h.example", Port: 1080, Username: "u", Password: "p"}, false},
		{"ipv6 brackets removed", "http://[2001:db8::1]:3128", Spec{Protocol: "http", Host: "2001:db8::1", Port: 3128}, false},
		{"url-decoded credentials", "http://us%40er:p%3Ass@h:1/", Spec{Protocol: "http", Host: "h", Port: 1, Username: "us@er", Password: "p:ss"}, false},
		{"whitespace trimmed", "  http://h:80 \n", Spec{Protocol: "http", Host: "h", Port: 80}, false},
		{"username only", "http://only@h:80", Spec{Protocol: "http", Host: "h", Port: 80, Username: "only"}, false},
		// url.Parse splits user info at the last "@": a raw "@" in the
		// password is tolerated.
		{"at sign in password", "http://a:" + secret + "@b@h:8080", Spec{Protocol: "http", Host: "h", Port: 8080, Username: "a", Password: secret + "@b"}, false},

		{"empty", "   ", Spec{}, true},
		{"no scheme", "proxy.example.com:8080", Spec{}, true},
		{"bad scheme", "ftp://h:21", Spec{}, true},
		{"socks4", "socks4://h:1080", Spec{}, true},
		{"missing port", "http://h", Spec{}, true},
		{"port zero", "http://h:0", Spec{}, true},
		{"port too big", "http://h:65536", Spec{}, true},
		{"missing host", "http://:8080", Spec{}, true},
		{"path", "http://h:8080/path", Spec{}, true},
		{"query", "http://h:8080/?x=1", Spec{}, true},
		{"empty query", "http://h:8080?", Spec{}, true},
		{"fragment", "http://h:8080#frag", Spec{}, true},
		{"opaque", "http:h:8080", Spec{}, true},
		{"host too long", "http://" + strings.Repeat("a", 256) + ":80", Spec{}, true},
		{"username too long", "http://" + strings.Repeat("u", 256) + "@h:80", Spec{}, true},
		{"password too long", "http://u:" + strings.Repeat("p", 1025) + "@h:80", Spec{}, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := ParseURL(tc.raw)
			if tc.err {
				if err == nil {
					t.Fatalf("accepted %+v", got)
				}
				e := core.AsError(err)
				if e.Code != "invalid_argument" {
					t.Fatalf("code %s", e.Code)
				}
				fields, _ := e.Details["fields"].([]core.FieldError)
				if len(fields) != 1 || fields[0].Field != "proxy_url" || fields[0].Code != "invalid" {
					t.Fatalf("fields %+v", e.Details)
				}
				if raw := strings.TrimSpace(tc.raw); strings.Contains(fields[0].Message, secret) ||
					raw != "" && strings.Contains(fields[0].Message, raw) {
					t.Fatalf("message echoes input: %q", fields[0].Message)
				}
				return
			}
			if err != nil {
				t.Fatalf("rejected: %v", err)
			}
			if got != tc.want {
				t.Fatalf("got %+v, want %+v", got, tc.want)
			}
		})
	}
}

func TestAutoName(t *testing.T) {
	if n := autoName(Spec{Protocol: "socks5", Host: "2001:db8::1", Port: 1080}); n != "socks5://[2001:db8::1]:1080" {
		t.Fatalf("ipv6 name %q", n)
	}
	long := autoName(Spec{Protocol: "http", Host: strings.Repeat("h", 200), Port: 80})
	if len(long) != 100 {
		t.Fatalf("name not truncated: %d", len(long))
	}
}

func TestHTTPClientFor(t *testing.T) {
	svc := New(nil, nil, nil, Options{})
	c, err := svc.HTTPClientFor(t.Context(), Spec{Protocol: "socks5", Host: "127.0.0.1", Port: 1080, Username: "u", Password: "p"})
	if err != nil {
		t.Fatal(err)
	}
	pu, _ := c.Transport.(*http.Transport).Proxy(nil)
	if pu.Scheme != "socks5" || pu.Host != "127.0.0.1:1080" || pu.User.String() != "u:p" {
		t.Fatalf("proxy url %v", pu)
	}
	if _, err := svc.HTTPClientFor(t.Context(), Spec{Protocol: "ftp", Host: "h", Port: 1}); err == nil {
		t.Fatal("bad spec accepted")
	}
}
