package httpfacts

import (
	"net/http"
	"testing"
)

func TestProviderFactsExcludeSecretsAndHopHeaders(t *testing.T) {
	source := http.Header{"Request-Id": []string{"provider"}, "Retry-After": []string{"4"}, "Anthropic-Ratelimit-Tokens-Remaining": []string{"18"}, "Authorization": []string{"secret"}, "Set-Cookie": []string{"secret"}, "X-Internal-Route": []string{"private"}, "Anthropic-Fast-Input-Tokens-Limit": []string{"100"}, "Connection": []string{"Retry-After"}, "X-Should-Retry": []string{"bad\r\nvalue"}}
	out := Select(source)
	if out.Get("Request-Id") != "provider" || out.Get("Anthropic-Ratelimit-Tokens-Remaining") != "18" || out.Get("Anthropic-Fast-Input-Tokens-Limit") != "100" || len(out) != 3 {
		t.Fatal("unsafe or incomplete provider headers", out)
	}
	source["Request-Id"][0] = "changed"
	if out.Get("Request-Id") != "provider" {
		t.Fatal("aliased source")
	}
}
