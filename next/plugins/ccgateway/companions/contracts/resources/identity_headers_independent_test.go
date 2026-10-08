package resources

import (
	"bufio"
	"net/http"
	"strings"
	"testing"
)

func TestIdentityHeadersIndependentHTTPParsing(t *testing.T) {
	id := Identity{PrincipalID: "issuer", Generation: "generation"}
	for _, name := range []string{PrincipalHeader, GenerationHeader} {
		for _, value := range []string{"issuer", "generation", "other"} {
			for _, first := range []bool{false, true} {
				base := PrincipalHeader + ": issuer\r\n" + GenerationHeader + ": generation\r\n"
				extra := strings.ToLower(name) + ": " + value + "\r\n"
				if first {
					base = extra + base
				} else {
					base += extra
				}
				response, err := http.ReadResponse(bufio.NewReader(strings.NewReader("HTTP/1.1 200 OK\r\n"+base+"Content-Length: 0\r\n\r\n")), nil)
				if err != nil {
					t.Fatal(err)
				}
				response.Body.Close()
				if len(response.Header.Values(name)) != 2 {
					t.Fatal("HTTP parser did not preserve duplicate assertions")
				}
				if ValidateIdentityHeaders(response.Header, id) == nil {
					t.Fatal("accepted case-insensitive duplicate", name, first)
				}
			}
		}
	}
	for _, id := range []Identity{{}, {PrincipalID: "issuer"}, {Generation: "generation"}} {
		h := http.Header{}
		h.Set(PrincipalHeader, id.PrincipalID)
		h.Set(GenerationHeader, id.Generation)
		if ValidateIdentityHeaders(h, id) == nil {
			t.Fatal("accepted missing trusted identity")
		}
	}
}
