package mailer

import (
	"bufio"
	"context"
	"encoding/base64"
	"encoding/json"
	"mime"
	"net"
	"strings"
	"sync"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// smtpServer is a minimal SMTP server: it accepts everything except the
// recipients in refuse, and records the envelope and the message.
type smtpServer struct {
	addr   string
	refuse string

	mu        sync.Mutex
	quitFails bool // answer QUIT with an error
	from      string
	to        []string
	data      string
}

func startSMTP(t *testing.T, refuse string) *smtpServer {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = ln.Close() })
	s := &smtpServer{addr: ln.Addr().String(), refuse: refuse}
	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			go s.serve(conn)
		}
	}()
	return s
}

func (s *smtpServer) serve(conn net.Conn) {
	defer conn.Close()
	r := bufio.NewReader(conn)
	reply := func(line string) { _, _ = conn.Write([]byte(line + "\r\n")) }
	reply("220 test ESMTP")
	for {
		line, err := r.ReadString('\n')
		if err != nil {
			return
		}
		cmd := strings.TrimSpace(line)
		upper := strings.ToUpper(cmd)
		switch {
		case strings.HasPrefix(upper, "EHLO"):
			reply("250 test")
		case strings.HasPrefix(upper, "MAIL FROM:"):
			from := strings.Trim(cmd[len("MAIL FROM:"):], "<> ")
			if from == s.refuse {
				reply("550 sender not allowed")
				continue
			}
			s.mu.Lock()
			s.from = from
			s.mu.Unlock()
			reply("250 ok")
		case strings.HasPrefix(upper, "RCPT TO:"):
			to := strings.Trim(cmd[len("RCPT TO:"):], "<> ")
			if to == s.refuse {
				reply("550 mailbox unavailable")
				continue
			}
			s.mu.Lock()
			s.to = append(s.to, to)
			s.mu.Unlock()
			reply("250 ok")
		case upper == "DATA":
			reply("354 go ahead")
			var b strings.Builder
			for {
				l, err := r.ReadString('\n')
				if err != nil || l == ".\r\n" {
					break
				}
				b.WriteString(l)
			}
			s.mu.Lock()
			s.data = b.String()
			s.mu.Unlock()
			reply("250 queued")
		case upper == "QUIT":
			s.mu.Lock()
			fails := s.quitFails
			s.mu.Unlock()
			if fails {
				reply("421 closing")
				return
			}
			reply("221 bye")
			return
		default:
			reply("250 ok")
		}
	}
}

func configured(t *testing.T, srv *smtpServer, extra map[string]any) *Plugin {
	t.Helper()
	host, port, _ := net.SplitHostPort(srv.addr)
	settings := map[string]any{"host": host, "port": json.Number(port), "security": "none", "from_address": "noreply@example.com", "from_name": "Ops"}
	for k, v := range extra {
		settings[k] = v
	}
	raw, _ := json.Marshal(settings)
	p := New()
	if err := p.Configure(context.Background(), pluginsdk.Config{JSON: raw}); err != nil {
		t.Fatal(err)
	}
	return p
}

func request() *pluginv1.DeliverNotificationRequest {
	return &pluginv1.DeliverNotificationRequest{Id: 42, Channel: Channel, Recipients: []string{"ops@example.com", "dev@example.com"},
		Subject: "账号权重已降到 0", Body: "account 7 / group 2 / claude-sonnet-5", Severity: "critical", Source: "dynweight", Attempt: 1}
}

func TestDeliver(t *testing.T) {
	srv := startSMTP(t, "")
	resp, err := configured(t, srv, nil).DeliverNotification(context.Background(), request())
	if err != nil || resp.GetRejected() != "" {
		t.Fatalf("deliver: %v %v", resp, err)
	}
	srv.mu.Lock()
	defer srv.mu.Unlock()
	if srv.from != "noreply@example.com" || strings.Join(srv.to, ",") != "ops@example.com,dev@example.com" {
		t.Fatalf("envelope: %s %v", srv.from, srv.to)
	}
	head, body, _ := strings.Cut(srv.data, "\r\n\r\n")
	for _, want := range []string{`From: "Ops" <noreply@example.com>`, "To: ops@example.com,\r\n dev@example.com",
		"Message-ID: <sub2api-notification-42@example.com>", "X-Sub2API-Source: dynweight", "Subject: =?utf-8?b?"} {
		if !strings.Contains(head, want) {
			t.Errorf("header %q missing in\n%s", want, head)
		}
	}
	plain, err := base64.StdEncoding.DecodeString(strings.ReplaceAll(body, "\r\n", ""))
	if err != nil || string(plain) != "account 7 / group 2 / claude-sonnet-5" {
		t.Fatalf("body: %q %v", plain, err)
	}
}

// Once the server accepted the message, a failed QUIT is not a failure: a
// retry would send the mail twice.
func TestDeliverQuitFails(t *testing.T) {
	srv := startSMTP(t, "")
	srv.quitFails = true
	resp, err := configured(t, srv, nil).DeliverNotification(context.Background(), request())
	if err != nil || resp.GetRejected() != "" {
		t.Fatalf("deliver: %v %v", resp, err)
	}
}

func TestDeliverOutcomes(t *testing.T) {
	ctx := context.Background()
	if _, err := New().DeliverNotification(ctx, request()); err == nil || !strings.Contains(err.Error(), "not configured") {
		t.Fatalf("unconfigured: %v", err)
	}
	srv := startSMTP(t, "dev@example.com")
	p := configured(t, srv, nil)
	resp, err := p.DeliverNotification(ctx, request())
	if err != nil || !strings.HasPrefix(resp.GetRejected(), "SMTP 550") {
		t.Fatalf("refused recipient: %v %v", resp, err)
	}
	// A refused sender is a setup problem: retried, not a final rejection.
	p = configured(t, srv, map[string]any{"from_address": "dev@example.com"})
	if _, err := p.DeliverNotification(ctx, request()); err == nil || !strings.Contains(err.Error(), "550") {
		t.Fatalf("refused sender: %v", err)
	}
	// STARTTLS is required when chosen; the test server does not offer it.
	p = configured(t, srv, map[string]any{"security": "starttls"})
	if _, err := p.DeliverNotification(ctx, request()); err == nil || !strings.Contains(err.Error(), "STARTTLS") {
		t.Fatalf("starttls: %v", err)
	}
	// An unreachable server is retried by the core (an error, not a rejection).
	p.cfg.Load().Port = 1
	p.cfg.Load().Security = SecurityNone
	p.cfg.Load().TimeoutSeconds = 5
	if _, err := p.DeliverNotification(ctx, request()); err == nil {
		t.Fatal("unreachable server delivered")
	}
}

func TestConfigure(t *testing.T) {
	p := New()
	for name, raw := range map[string]string{
		"from":     `{"host":"smtp.example.com","from_address":"Ops <ops@example.com>"}`,
		"security": `{"host":"smtp.example.com","from_address":"ops@example.com","security":"ssl"}`,
		"port":     `{"port":0}`,
	} {
		if _, ok := pluginsdk.AsFieldErrors(p.Configure(context.Background(), pluginsdk.Config{JSON: json.RawMessage(raw)})); !ok {
			t.Errorf("%s accepted", name)
		}
	}
	if err := p.Configure(context.Background(), pluginsdk.Config{JSON: json.RawMessage(`{"timeout_seconds":1000}`)}); err != nil {
		t.Fatal(err)
	}
	if s := p.cfg.Load(); s.TimeoutSeconds != maxTimeoutSeconds || s.Port != 587 || s.Security != SecuritySTARTTLS || s.Host != "" {
		t.Fatalf("defaults: %+v", s)
	}
}

func TestCompose(t *testing.T) {
	msg := string(compose(&Settings{FromAddress: "a@b.co"}, &pluginv1.DeliverNotificationRequest{Subject: "x", Severity: "info", Body: strings.Repeat("y", 200)}, time.Unix(0, 0)))
	if !strings.Contains(msg, "Subject: x\r\n") {
		t.Fatalf("plain subject: %s", msg)
	}
	_, body, _ := strings.Cut(msg, "\r\n\r\n")
	for _, line := range strings.Split(strings.TrimSpace(body), "\r\n") {
		if len(line) > 76 {
			t.Fatalf("line of %d", len(line))
		}
	}
}

// A long non-ASCII subject is folded into encoded words on short lines and
// decodes back; an ASCII subject is left alone.
func TestEncodeSubject(t *testing.T) {
	var dec mime.WordDecoder
	for _, subject := range []string{strings.Repeat("动态权重通知", 34), strings.Repeat("账号🔥", 40)} {
		enc := encodeSubject(subject)
		for _, line := range strings.Split(enc, "\r\n") {
			if len(line) > 76 {
				t.Fatalf("line of %d characters: %s", len(line), line)
			}
		}
		if got, err := dec.DecodeHeader(enc); err != nil || got != subject {
			t.Fatalf("decode: %q %v", got, err)
		}
	}
	if got := encodeSubject("Weight degraded"); got != "Weight degraded" {
		t.Fatalf("ascii: %q", got)
	}
}
