// Package mailer is the "email" notification channel (CONTRACTS §74.4): the
// core hands it notifications and it sends them over SMTP.
package mailer

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/smtp"
	"net/textproto"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/egress"
)

// Channel is the notification channel the plugin declares.
const Channel = "email"

// maxTimeoutSeconds stays under the host's 30 s deadline of a delivery.
const maxTimeoutSeconds = 25

// Security modes of the SMTP connection.
const (
	SecuritySTARTTLS = "starttls"
	SecurityTLS      = "tls"
	SecurityNone     = "none"
)

// Settings are the plugin settings (forms/settings.schema.json).
type Settings struct {
	Host           string `json:"host"`
	Port           int    `json:"port"`
	Security       string `json:"security"`
	Username       string `json:"username"`
	Password       string `json:"password"`
	FromAddress    string `json:"from_address"`
	FromName       string `json:"from_name"`
	TimeoutSeconds int    `json:"timeout_seconds"`
}

// Plugin implements pluginsdk.NotificationChannel and pluginsdk.Configurer.
type Plugin struct {
	cfg atomic.Pointer[Settings]
	// dial opens the TCP connection; tests replace it.
	dial func(ctx context.Context, address string) (net.Conn, error)
}

func New() *Plugin { return &Plugin{dial: dialEgress} }

// dialEgress dials through the host tunnel when it is installed (strict
// network mode), directly otherwise.
func dialEgress(ctx context.Context, address string) (net.Conn, error) {
	conn, err := egress.DialContext(ctx, "tcp", address)
	if errors.Is(err, egress.ErrNotInstalled) {
		var d net.Dialer
		return d.DialContext(ctx, "tcp", address)
	}
	return conn, err
}

// Configure implements pluginsdk.Configurer.
func (p *Plugin) Configure(_ context.Context, cfg pluginsdk.Config) error {
	s := Settings{Port: 587, Security: SecuritySTARTTLS, FromName: "Sub2API", TimeoutSeconds: 20}
	if err := cfg.Decode(&s); err != nil {
		return pluginsdk.FieldErrors{}.Add("", "invalid_json", "settings must be a JSON object / 设置必须是 JSON 对象").Err()
	}
	s.Host, s.FromAddress = strings.TrimSpace(s.Host), strings.TrimSpace(s.FromAddress)
	fe := pluginsdk.FieldErrors{}
	if s.Host != "" && !manifest.ValidRecipient(manifest.RecipientEmail, s.FromAddress) {
		fe = fe.Add("from_address", "invalid", "a plain address such as noreply@example.com / 请填写发件地址，例如 noreply@example.com")
	}
	if s.Security != SecuritySTARTTLS && s.Security != SecurityTLS && s.Security != SecurityNone {
		fe = fe.Add("security", "invalid", "starttls, tls or none")
	}
	if s.Port < 1 || s.Port > 65535 {
		fe = fe.Add("port", "invalid", "1-65535")
	}
	if len(fe) > 0 {
		return fe.Err()
	}
	s.TimeoutSeconds = min(max(s.TimeoutSeconds, 5), maxTimeoutSeconds)
	p.cfg.Store(&s)
	return nil
}

// DeliverNotification implements pluginsdk.NotificationChannel. A refusal
// of the message by the server (a 5xx reply to RCPT or DATA) is final;
// anything else, a refused login or sender included, is a setup problem the
// core retries until it is fixed.
func (p *Plugin) DeliverNotification(ctx context.Context, in *pluginv1.DeliverNotificationRequest) (*pluginv1.DeliverNotificationResponse, error) {
	s := p.cfg.Load()
	if s == nil || s.Host == "" {
		return nil, errors.New("SMTP is not configured")
	}
	if in.GetChannel() != Channel {
		return &pluginv1.DeliverNotificationResponse{Rejected: "unknown channel " + in.GetChannel()}, nil
	}
	// One bad recipient refuses the whole message: the core validates them,
	// this is the plugin's own boundary.
	for _, r := range in.GetRecipients() {
		if !manifest.ValidRecipient(manifest.RecipientEmail, r) {
			return &pluginv1.DeliverNotificationResponse{Rejected: "invalid recipient " + r}, nil
		}
	}
	ctx, cancel := context.WithTimeout(ctx, time.Duration(s.TimeoutSeconds)*time.Second)
	defer cancel()
	msg := compose(s, in, time.Now())
	err := p.send(ctx, s, in.GetRecipients(), msg)
	var refused messageRefused
	if errors.As(err, &refused) {
		return &pluginv1.DeliverNotificationResponse{Rejected: fmt.Sprintf("SMTP %d %s", refused.reply.Code, refused.reply.Msg)}, nil
	}
	if err != nil {
		return nil, err
	}
	return &pluginv1.DeliverNotificationResponse{}, nil
}

func (p *Plugin) send(ctx context.Context, s *Settings, to []string, msg []byte) error {
	conn, err := p.dial(ctx, net.JoinHostPort(s.Host, strconv.Itoa(s.Port)))
	if err != nil {
		return err
	}
	defer conn.Close()
	if deadline, ok := ctx.Deadline(); ok {
		_ = conn.SetDeadline(deadline)
	}
	tlsConfig := &tls.Config{ServerName: s.Host, MinVersion: tls.VersionTLS12}
	if s.Security == SecurityTLS {
		conn = tls.Client(conn, tlsConfig)
	}
	c, err := smtp.NewClient(conn, s.Host)
	if err != nil {
		return err
	}
	defer c.Close()
	if s.Security == SecuritySTARTTLS {
		if ok, _ := c.Extension("STARTTLS"); !ok {
			return errors.New("the SMTP server does not offer STARTTLS")
		}
		if err := c.StartTLS(tlsConfig); err != nil {
			return err
		}
	}
	if s.Username != "" {
		// PlainAuth refuses to send the password without TLS (except to
		// localhost).
		if err := c.Auth(smtp.PlainAuth("", s.Username, s.Password, s.Host)); err != nil {
			return err
		}
	}
	if err := c.Mail(s.FromAddress); err != nil {
		return err
	}
	for _, r := range to {
		if err := c.Rcpt(r); err != nil {
			return refusal(err)
		}
	}
	w, err := c.Data()
	if err != nil {
		return refusal(err)
	}
	if _, err := w.Write(msg); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return refusal(err)
	}
	// The server accepted the message: a failed QUIT must not make the core
	// send it again.
	_ = c.Quit()
	return nil
}

// messageRefused is a 5xx reply to the message itself (its recipients or
// content), which retrying cannot change.
type messageRefused struct{ reply *textproto.Error }

func (e messageRefused) Error() string { return e.reply.Error() }

// refusal marks a 5xx reply of a message step as final.
func refusal(err error) error {
	var reply *textproto.Error
	if errors.As(err, &reply) && reply.Code >= 500 {
		return messageRefused{reply}
	}
	return err
}
