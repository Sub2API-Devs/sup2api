package moderation

import (
	"errors"
	"fmt"
	"strings"
	"testing"
)

func TestErrDetail(t *testing.T) {
	for _, c := range []struct {
		err       error
		want, not []string
	}{
		// a network error: the text without "network: ", redacted
		{&networkError{errors.New(`Post "https://u:pw@api.example.com/v1/chat?key=SECRET123&x=1#f": dial tcp 1.2.3.4:443: connect: connection refused`)},
			[]string{`Post "https://api.example.com/v1/chat": dial tcp 1.2.3.4:443: connect: connection refused`}, []string{"SECRET123", "pw", "key=", "network:"}},
		{&networkError{errors.New(`Authorization: Bearer abc.def.ghi failed; api_key=xyz123 token: "tok"`)}, []string{"Authorization: …", "api_key=…", `token: "…`}, []string{"abc.def", "xyz123", `tok"`}},
		{&networkError{errors.New("refresh_token=r1 client_secret: s2 x-private-key=p3 Bearer 0123abcd")}, []string{"refresh_token=…", "client_secret: …", "x-private-key=…", "Bearer …"}, []string{"r1", "s2", "p3", "0123abcd"}},
		{&networkError{errors.New("bad key sk-AbCdEf0123456789xyz and a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7")}, []string{"bad key … and …"}, []string{"sk-", "a1B2"}},
		// words, paths and request ids stay
		{&networkError{errors.New("basic validation failed at /v1/moderations/very-long-path-without-digits-at-all, request 3f2a9c1e-7b4d-4e8a-9c2b-1d5e6f7a8b9c")},
			[]string{"basic validation failed", "very-long-path-without-digits-at-all", "3f2a9c1e-7b4d-4e8a-9c2b-1d5e6f7a8b9c"}, nil},
		// a network error wrapped further still counts
		{fmt.Errorf("call: %w", &networkError{errors.New("socks connect tcp p:1080->h:443: EOF")}), []string{"socks connect tcp p:1080->h:443: EOF"}, nil},
	} {
		got := errDetail(c.err)
		for _, w := range c.want {
			if !strings.Contains(got, w) {
				t.Errorf("errDetail(%q) = %q, want %q in it", c.err, got, w)
			}
		}
		for _, n := range c.not {
			if strings.Contains(got, n) {
				t.Errorf("errDetail(%q) = %q, keeps %q", c.err, got, n)
			}
		}
	}
	if got := errDetail(&networkError{errors.New(strings.Repeat("长", 300))}); len([]rune(got)) != errDetailRunes {
		t.Fatalf("detail of %d runes", len([]rune(got)))
	}
}

// Only network errors leave a text: the others may carry what the upstream
// returned (and so user input), or say no more than their type.
func TestErrDetailOnlyForNetworkErrors(t *testing.T) {
	for _, err := range []error{
		nil,
		fmt.Errorf("invalid upstream JSON: %s", "echo of the user's input"),
		&UpstreamError{Status: 502, message: "echo of the user's input"},
		errTimeout, errTTFTTimeout, errEmptyResult, errBadScores, errNoChannel, errResponseTooLarge,
		fmt.Errorf("%w: category sexual", errBadScores),
	} {
		if d := errDetail(err); d != "" {
			t.Errorf("errDetail(%v) = %q, want none", err, d)
		}
	}
	o := Outcome{Err: &UpstreamError{Status: 502, message: "echo"}}
	o.describeErr()
	if o.ErrType != ErrTypeUpstreamError || o.Status != 502 || o.ErrDetail != "" {
		t.Fatalf("outcome = %+v", o)
	}
}
