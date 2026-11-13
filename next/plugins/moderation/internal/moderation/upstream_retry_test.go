package moderation

import (
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// flakyDialChannel is a channel to srv whose first fail dials fail as a
// refused TCP connect does; dials counts every dial.
func flakyDialChannel(srv *httptest.Server, fail int32, dials *atomic.Int32) *liveChannel {
	var d net.Dialer
	t := &http.Transport{DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
		if dials.Add(1) <= fail {
			return nil, &net.OpError{Op: "dial", Net: network, Err: errors.New("connect: connection refused")}
		}
		return d.DialContext(ctx, network, addr)
	}}
	return &liveChannel{Type: ChannelOpenAI, BaseURL: srv.URL, Key: "k", Timeout: 5 * time.Second, client: &http.Client{Transport: t}}
}

func moderationsServer(t *testing.T, calls *atomic.Int32) *httptest.Server {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		if b, _ := io.ReadAll(r.Body); !strings.Contains(string(b), `"hello"`) {
			t.Errorf("body = %s", b)
		}
		_, _ = io.WriteString(w, `{"model":"m","results":[{"category_scores":{"hate":0.1}}]}`)
	}))
	t.Cleanup(srv.Close)
	return srv
}

// A connect that fails before the request is sent is retried once, with the
// whole body; a second failure is the error.
func TestConnectFailureRetriedOnce(t *testing.T) {
	var calls, dials atomic.Int32
	srv := moderationsServer(t, &calls)
	scores, _, err := callModerations(context.Background(), flakyDialChannel(srv, 1, &dials), "hello", "")
	if err != nil || scores["hate"] != 0.1 || dials.Load() != 2 || calls.Load() != 1 {
		t.Fatalf("err = %v, scores = %v, dials = %d, calls = %d", err, scores, dials.Load(), calls.Load())
	}
	dials.Store(0)
	_, _, err = callModerations(context.Background(), flakyDialChannel(srv, 2, &dials), "hello", "")
	if ErrType(err) != ErrTypeNetwork || dials.Load() != 2 || calls.Load() != 1 {
		t.Fatalf("err = %v, dials = %d, calls = %d: want one retry", err, dials.Load(), calls.Load())
	}
}

// The LLM protocols send through the same retry.
func TestLLMConnectFailureRetriedOnce(t *testing.T) {
	var calls, dials atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		_, _ = io.WriteString(w, `{"model":"m","choices":[{"message":{"role":"assistant","content":"ok"}}]}`)
	}))
	defer srv.Close()
	ch := flakyDialChannel(srv, 1, &dials)
	ch.Type, ch.Protocol, ch.Model = ChannelLLM, ProtocolOpenAIChat, "m"
	turn, err := protocolOf(ch).call(context.Background(), ch, llmRequest{Messages: []any{llmUserMessage("hi")}, MaxTokens: 16})
	if err != nil || turn.Text != "ok" || dials.Load() != 2 || calls.Load() != 1 {
		t.Fatalf("err = %v, turn = %+v, dials = %d, calls = %d", err, turn, dials.Load(), calls.Load())
	}
}

// No retry once the context is over: the call has no time left.
func TestConnectFailureNotRetriedAfterDeadline(t *testing.T) {
	var calls, dials atomic.Int32
	srv := moderationsServer(t, &calls)
	ctx, cancel := context.WithCancel(context.Background())
	ch := flakyDialChannel(srv, 1, &dials)
	inner := ch.client.Transport.(*http.Transport).DialContext
	ch.client.Transport.(*http.Transport).DialContext = func(c context.Context, network, addr string) (net.Conn, error) {
		cancel()
		return inner(c, network, addr)
	}
	_, _, err := callModerations(ctx, ch, "hello", "")
	if err == nil || dials.Load() != 1 || calls.Load() != 0 {
		t.Fatalf("err = %v, dials = %d, calls = %d", err, dials.Load(), calls.Load())
	}
}

// A failure after the request went out is not retried: the upstream may
// have taken it.
func TestFailureAfterSendNotRetried(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		conn, _, err := w.(http.Hijacker).Hijack()
		if err == nil {
			_ = conn.Close()
		}
	}))
	defer srv.Close()
	ch := &liveChannel{Type: ChannelOpenAI, BaseURL: srv.URL, Timeout: 5 * time.Second, client: &http.Client{Transport: &http.Transport{}}}
	_, _, err := callModerations(context.Background(), ch, "hello", "")
	if ErrType(err) != ErrTypeNetwork || calls.Load() != 1 {
		t.Fatalf("err = %v, calls = %d: want one call", err, calls.Load())
	}
}

// The production failure: a SOCKS5 proxy accepts the greeting, then hangs up
// without answering CONNECT. Nothing reached the upstream, so the call is
// tried once more through the proxy.
func TestSOCKSHandshakeFailureRetriedOnce(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	var conns atomic.Int32
	go func() {
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			conns.Add(1)
			go func() {
				defer c.Close()
				buf := make([]byte, 512)
				if _, err := c.Read(buf); err != nil { // greeting
					return
				}
				_, _ = c.Write([]byte{5, 0}) // no authentication
				_, _ = c.Read(buf)           // CONNECT, never answered
			}()
		}
	}()
	var calls atomic.Int32
	srv := moderationsServer(t, &calls)
	proxy, _ := url.Parse("socks5://" + ln.Addr().String())
	ch := &liveChannel{Type: ChannelOpenAI, BaseURL: srv.URL, Timeout: 5 * time.Second, client: &http.Client{Transport: &http.Transport{Proxy: http.ProxyURL(proxy)}}}
	_, _, err = callModerations(context.Background(), ch, "hello", "")
	if ErrType(err) != ErrTypeNetwork || conns.Load() != 2 || calls.Load() != 0 {
		t.Fatalf("err = %v, proxy connections = %d, calls = %d: want two connections", err, conns.Load(), calls.Load())
	}
	if d := errDetail(err); !strings.Contains(d, "socks") || strings.Contains(d, "?") {
		t.Fatalf("detail = %q", d)
	}
}

func TestErrDetail(t *testing.T) {
	for _, c := range []struct {
		err       error
		want, not []string
	}{
		{&networkError{errors.New(`Post "https://u:pw@api.example.com/v1/chat?key=SECRET123&x=1#f": dial tcp 1.2.3.4:443: connect: connection refused`)},
			[]string{`network: Post "https://api.example.com/v1/chat": dial tcp 1.2.3.4:443: connect: connection refused`}, []string{"SECRET123", "pw", "key="}},
		{errors.New("Authorization: Bearer abc.def.ghi failed; api_key=xyz123 token: \"tok\""), []string{"Authorization: …", "api_key=…", "token: \"…"}, []string{"abc.def", "xyz123", "tok\""}},
		{errors.New("bad key sk-AbCdEf0123456789xyz and a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7"), []string{"bad key … and …"}, []string{"sk-", "a1B2"}},
		{&UpstreamError{Status: 502, message: "echo of the user's input"}, []string{"upstream returned status 502"}, []string{"echo"}},
		// words and paths stay
		{errors.New("invalid upstream JSON: /v1/moderations/very-long-path-without-digits-at-all"), []string{"very-long-path-without-digits-at-all"}, nil},
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
	if got := errDetail(errors.New(strings.Repeat("长", 300))); len([]rune(got)) != errDetailRunes {
		t.Fatalf("detail of %d runes", len([]rune(got)))
	}
	if errDetail(nil) != "" {
		t.Fatal("detail of no error")
	}
}
