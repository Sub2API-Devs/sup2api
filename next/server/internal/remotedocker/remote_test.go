package remotedocker

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/pem"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"golang.org/x/crypto/ssh"
)

type fakeHost struct {
	cfg      Config
	auth     atomic.Int32
	commands chan string
	output   string
	stall    bool
	// readStdin makes the host read the session's stdin to EOF (into
	// stdins) before answering with output and exit status exit.
	readStdin bool
	stdins    chan []byte
	exit      uint32
}

func newHost(t *testing.T, output string, stall bool) *fakeHost {
	t.Helper()
	_, key, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	signer, err := ssh.NewSignerFromKey(key)
	if err != nil {
		t.Fatal(err)
	}
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = l.Close() })
	f := &fakeHost{output: output, stall: stall, commands: make(chan string, 8), stdins: make(chan []byte, 8)}
	f.cfg = Config{Host: "127.0.0.1", Port: l.Addr().(*net.TCPAddr).Port, User: "tester", AuthMode: "password", Password: "test-secret", HostKeyFingerprint: ssh.FingerprintSHA256(signer.PublicKey())}
	sc := &ssh.ServerConfig{PasswordCallback: func(_ ssh.ConnMetadata, p []byte) (*ssh.Permissions, error) {
		f.auth.Add(1)
		if string(p) != f.cfg.Password {
			return nil, context.Canceled
		}
		return nil, nil
	}, PublicKeyCallback: func(_ ssh.ConnMetadata, _ ssh.PublicKey) (*ssh.Permissions, error) { f.auth.Add(1); return nil, nil }}
	sc.AddHostKey(signer)
	go func() {
		for {
			raw, e := l.Accept()
			if e != nil {
				return
			}
			go func() {
				defer raw.Close()
				server, channels, requests, e := ssh.NewServerConn(raw, sc)
				if e != nil {
					return
				}
				defer server.Close()
				go ssh.DiscardRequests(requests)
				for channel := range channels {
					if channel.ChannelType() == "direct-tcpip" {
						var target struct {
							Host       string
							Port       uint32
							Origin     string
							OriginPort uint32
						}
						if ssh.Unmarshal(channel.ExtraData(), &target) != nil {
							_ = channel.Reject(ssh.ConnectionFailed, "invalid target")
							continue
						}
						conn, err := net.Dial("tcp", net.JoinHostPort(target.Host, fmt.Sprint(target.Port)))
						if err != nil {
							_ = channel.Reject(ssh.ConnectionFailed, "connection failed")
							continue
						}
						ch, reqs, err := channel.Accept()
						if err != nil {
							conn.Close()
							continue
						}
						go ssh.DiscardRequests(reqs)
						go func() { defer conn.Close(); defer ch.Close(); _, _ = io.Copy(conn, ch) }()
						go func() { defer conn.Close(); defer ch.Close(); _, _ = io.Copy(ch, conn) }()
						continue
					}
					ch, requests, e := channel.Accept()
					if e != nil {
						return
					}
					go func() {
						defer ch.Close()
						for req := range requests {
							if req.Type != "exec" {
								_ = req.Reply(false, nil)
								continue
							}
							var payload struct{ Command string }
							if ssh.Unmarshal(req.Payload, &payload) != nil {
								return
							}
							f.commands <- payload.Command
							_ = req.Reply(true, nil)
							if f.stall {
								continue
							}
							if f.readStdin {
								data, _ := io.ReadAll(ch)
								f.stdins <- data
							}
							_, _ = ch.Write([]byte(f.output))
							_, _ = ch.SendRequest("exit-status", false, ssh.Marshal(struct{ Status uint32 }{f.exit}))
							return
						}
					}()
				}
			}()
		}
	}()
	return f
}

func TestHTTPForward(t *testing.T) {
	f := newHost(t, "", false)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/redirect" {
			http.Redirect(w, r, "http://127.0.0.1:1/escape", http.StatusFound)
			return
		}
		_, _ = w.Write([]byte("forwarded"))
	}))
	defer upstream.Close()
	target := strings.TrimPrefix(upstream.URL, "http://")
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	client, closeClient, err := NewHTTPClient(ctx, f.cfg, target)
	if err != nil {
		t.Fatal(err)
	}
	defer closeClient()
	res, err := client.Get(upstream.URL)
	if err != nil {
		t.Fatal(err)
	}
	data, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if string(data) != "forwarded" {
		t.Fatalf("body %q", data)
	}
	if res, err := client.Get(upstream.URL + "/redirect"); err == nil {
		res.Body.Close()
		t.Fatal("redirect accepted")
	}
	if _, err := client.Get("http://127.0.0.1:1/"); err == nil {
		t.Fatal("different target accepted")
	}
	if _, err := client.Get(strings.Replace(upstream.URL, "http:", "https:", 1)); err == nil {
		t.Fatal("HTTPS accepted")
	}
	cancel()
	_ = closeClient()
	if _, err := client.Get(upstream.URL); err == nil {
		t.Fatal("closed forwarding still works")
	}
	if _, _, err := NewHTTPClient(context.Background(), f.cfg, "169.254.169.254:80"); err == nil {
		t.Fatal("non-loopback target accepted")
	}
}

func TestPinnedOperations(t *testing.T) {
	f := newHost(t, "running", false)
	for _, action := range []string{"test", "status", "start", "stop", "restart", "logs"} {
		out, err := Execute(context.Background(), f.cfg, "ccgateway", action)
		if err != nil || out != "running" {
			t.Fatalf("%s: %q %v", action, out, err)
		}
		got := <-f.commands
		want, _ := command("ccgateway", action)
		if got != want {
			t.Fatalf("command %q != %q", got, want)
		}
	}
}

func TestHTTPStreamLifetime(t *testing.T) {
	f := newHost(t, "", false)
	upstreamCanceled := make(chan struct{})
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Both header wait and the live body exceed the shortened SSH timeout.
		time.Sleep(400 * time.Millisecond)
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = w.Write([]byte("data: one\n\n"))
		w.(http.Flusher).Flush()
		time.Sleep(400 * time.Millisecond)
		_, _ = w.Write([]byte("data: two\n\n"))
		w.(http.Flusher).Flush()
		<-r.Context().Done()
		close(upstreamCanceled)
	}))
	defer upstream.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	client, closeClient, err := newHTTPClient(ctx, f.cfg, strings.TrimPrefix(upstream.URL, "http://"), 250*time.Millisecond)
	if err != nil {
		t.Fatal(err)
	}
	defer closeClient()
	if client.Timeout != 0 || client.Transport.(fixedTargetTransport).transport.ResponseHeaderTimeout != 0 {
		t.Fatal("HTTP inherited SSH timeout")
	}
	resp, err := client.Get(upstream.URL)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	buf := make([]byte, len("data: one\n\ndata: two\n\n"))
	if _, err := io.ReadFull(resp.Body, buf); err != nil {
		t.Fatalf("long stream was cut off: %v", err)
	}
	done := make(chan error, 1)
	go func() { _, err := resp.Body.Read(make([]byte, 1)); done <- err }()
	cancel()
	select {
	case err := <-done:
		if err == nil {
			t.Fatal("body read did not fail after cancellation")
		}
	case <-time.After(2 * time.Second):
		t.Fatal("canceled body remained blocked")
	}
	select {
	case <-upstreamCanceled:
	case <-time.After(2 * time.Second):
		t.Fatal("cancellation did not close remote HTTP connection")
	}
}

func TestProbeDoesNotAuthenticateAndPinMismatch(t *testing.T) {
	f := newHost(t, "", false)
	fp, err := ProbeFingerprint(context.Background(), f.cfg.Host, f.cfg.Port)
	if err != nil || fp != f.cfg.HostKeyFingerprint {
		t.Fatalf("probe: %q %v", fp, err)
	}
	if f.auth.Load() != 0 {
		t.Fatal("probe attempted authentication")
	}
	bad := f.cfg
	bad.HostKeyFingerprint = "SHA256:" + strings.Repeat("A", 43)
	if _, err := Execute(context.Background(), bad, "ccgateway", "status"); err == nil {
		t.Fatal("mismatched pin accepted")
	}
	if f.auth.Load() != 0 {
		t.Fatal("credentials sent before pin verification")
	}
}

func TestPrivateKeys(t *testing.T) {
	f := newHost(t, "ok", false)
	_, key, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	for _, passphrase := range []string{"", "key-passphrase"} {
		var block *pem.Block
		if passphrase == "" {
			block, err = ssh.MarshalPrivateKey(key, "")
		} else {
			block, err = ssh.MarshalPrivateKeyWithPassphrase(key, "", []byte(passphrase))
		}
		if err != nil {
			t.Fatal(err)
		}
		cfg := f.cfg
		cfg.AuthMode = "private_key"
		cfg.Password = ""
		cfg.PrivateKey = string(pem.EncodeToMemory(block))
		cfg.Passphrase = passphrase
		if _, err := Execute(context.Background(), cfg, "ccgateway", "status"); err != nil {
			t.Fatal(err)
		}
		<-f.commands
	}
}

func TestCancellationAndBoundedOutput(t *testing.T) {
	t.Run("cancel running command", func(t *testing.T) {
		f := newHost(t, "", true)
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		done := make(chan error, 1)
		go func() { _, err := Execute(ctx, f.cfg, "ccgateway", "logs"); done <- err }()
		select {
		case <-f.commands:
		case <-time.After(3 * time.Second):
			t.Fatal("command did not start")
		}
		cancel()
		select {
		case err := <-done:
			if err != context.Canceled {
				t.Fatalf("cancel: %v", err)
			}
		case <-time.After(3 * time.Second):
			t.Fatal("cancel failed to close SSH")
		}
	})
	t.Run("bounded and redacted", func(t *testing.T) {
		f := newHost(t, "test-secret"+strings.Repeat("x", maxOutput*2), false)
		out, err := Execute(context.Background(), f.cfg, "ccgateway", "logs")
		if err != nil {
			t.Fatal(err)
		}
		if strings.Contains(out, "test-secret") || !strings.Contains(out, "[output truncated]") || len(out) > maxOutput+64 {
			t.Fatalf("unsafe output len %d", len(out))
		}
	})
}

func TestInvalidInputs(t *testing.T) {
	for _, host := range []string{"a; touch /tmp/x", "-option", "user@host", "https://host", "host:22", " host", "a/../b", "a\n"} {
		if _, err := address(host, 22); err == nil {
			t.Fatalf("host accepted: %q", host)
		}
	}
	for _, action := range []string{"deploy", "start; id", "", "rm"} {
		if _, err := command("ccgateway", action); err == nil {
			t.Fatalf("action accepted %q", action)
		}
	}
	if _, err := address("127.0.0.1", 0); err == nil {
		t.Fatal("zero port accepted")
	}
	if got := shellQuote("a'b"); got != "'a'\"'\"'b'" {
		t.Fatalf("quote: %q", got)
	}
}
