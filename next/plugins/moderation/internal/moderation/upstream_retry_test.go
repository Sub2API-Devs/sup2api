package moderation

import (
	"context"
	"errors"
	"io"
	"log"
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

// countingTransport counts the round trips of a client.
type countingTransport struct {
	http.RoundTripper
	n atomic.Int32
}

func (c *countingTransport) RoundTrip(r *http.Request) (*http.Response, error) {
	c.n.Add(1)
	return c.RoundTripper.RoundTrip(r)
}

// Failures another attempt would meet the same way are not retried: a host
// that does not exist, a certificate that does not verify, a proxy refusing
// CONNECT, a URL the client cannot send.
func TestPermanentConnectFailuresNotRetried(t *testing.T) {
	call := func(base string, rt http.RoundTripper) (int32, error) {
		ct := &countingTransport{RoundTripper: rt}
		ch := &liveChannel{Type: ChannelOpenAI, BaseURL: base, Timeout: 5 * time.Second, client: &http.Client{Transport: ct}}
		_, _, err := callModerations(context.Background(), ch, "hello", "")
		return ct.n.Load(), err
	}
	before := connectRetries.Load()

	nx := &http.Transport{DialContext: func(context.Context, string, string) (net.Conn, error) {
		return nil, &net.OpError{Op: "dial", Net: "tcp", Err: &net.DNSError{Err: "no such host", Name: "nx.example", IsNotFound: true}}
	}}
	if n, err := call("http://nx.example", nx); err == nil || n != 1 {
		t.Errorf("NXDOMAIN: %d attempts, err %v", n, err)
	}

	var handshakes atomic.Int32
	tlsSrv := httptest.NewUnstartedServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	tlsSrv.Config.ConnState = func(_ net.Conn, s http.ConnState) {
		if s == http.StateNew {
			handshakes.Add(1)
		}
	}
	tlsSrv.Config.ErrorLog = log.New(io.Discard, "", 0)
	tlsSrv.StartTLS()
	defer tlsSrv.Close()
	if n, err := call(tlsSrv.URL, &http.Transport{}); err == nil || n != 1 || handshakes.Load() != 1 {
		t.Errorf("untrusted certificate: %d attempts, %d connections, err %v", n, handshakes.Load(), err)
	}

	var connects atomic.Int32
	proxy := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodConnect {
			connects.Add(1)
		}
		w.WriteHeader(http.StatusForbidden)
	}))
	defer proxy.Close()
	pu, _ := url.Parse(proxy.URL)
	if n, err := call("https://up.example", &http.Transport{Proxy: http.ProxyURL(pu)}); err == nil || n != 1 || connects.Load() != 1 {
		t.Errorf("CONNECT refused: %d attempts, %d CONNECTs, err %v", n, connects.Load(), err)
	}

	if n, err := call("ftp://up.example", &http.Transport{}); err == nil || n != 1 {
		t.Errorf("unsupported scheme: %d attempts, err %v", n, err)
	}
	if connectRetries.Load() != before {
		t.Errorf("connect retries counted %d", connectRetries.Load()-before)
	}
}

// Every retry is counted (GET /status connect_retries).
func TestConnectRetryCounted(t *testing.T) {
	var calls, dials atomic.Int32
	srv := moderationsServer(t, &calls)
	before := connectRetries.Load()
	if _, _, err := callModerations(context.Background(), flakyDialChannel(srv, 1, &dials), "hello", ""); err != nil {
		t.Fatal(err)
	}
	if connectRetries.Load() != before+1 {
		t.Fatalf("connect retries = %d, want %d", connectRetries.Load(), before+1)
	}
}
