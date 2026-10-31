// Package notify is the core's notification service (CONTRACTS §74.4).
// Plugins declaring "notify.channel.v1" provide channels (the mailer's
// "email", for example); the core and plugins holding "notify.send" send by
// channel id. Notify validates, deduplicates, rate limits and queues; the
// worker delivers through the channel's provider with retries and keeps the
// record the console shows.
package notify

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Limits of one notification.
const (
	MaxRecipients    = 20
	MaxRecipientLen  = 320
	MaxSubjectRunes  = 200
	MaxBodyBytes     = 64 << 10
	MaxDedupeKey     = 200
	MaxDedupeSeconds = 86400
	// DefaultDedupeSeconds is the window of a dedupe key sent without one.
	DefaultDedupeSeconds = 600
)

// Options tunes the service; zero values take the defaults.
type Options struct {
	CanRun       func() bool   // node admission; nil runs everywhere
	PollInterval time.Duration // idle poll period (2s)
	Lease        time.Duration // how long a claimed row is held (2min)
	MaxAttempts  int           // deliveries before a row fails (8)
	BackoffMin   time.Duration // first retry delay (30s)
	BackoffMax   time.Duration // retry delay cap (1h)
	RateLimit    int           // notifications per source and RateWindow (20)
	RateWindow   time.Duration // (5min)
	Retention    time.Duration // sent and failed rows are kept this long (30d)
	// UnboundFor is how long a row waits for the plugin that provided its
	// channel to be bound and running again (24h from created_at);
	// meanwhile it is retried every BackoffMin without using an attempt.
	UnboundFor time.Duration
	// DrainTimeout is how long Stop lets the delivery in progress finish
	// before cancelling it (35s: the 30s deadline of a delivery call plus
	// recording its outcome). The app's teardown shares a 90s budget
	// (app.run); the plugin instances are stopped after this service.
	DrainTimeout time.Duration
	// Locker elects the node that purges; nil purges on every node.
	Locker core.Locker
}

func (o *Options) defaults() {
	def := func(d *time.Duration, v time.Duration) {
		if *d <= 0 {
			*d = v
		}
	}
	def(&o.PollInterval, 2*time.Second)
	def(&o.Lease, 2*time.Minute)
	def(&o.BackoffMin, 30*time.Second)
	def(&o.BackoffMax, time.Hour)
	def(&o.RateWindow, 5*time.Minute)
	def(&o.Retention, 30*24*time.Hour)
	def(&o.UnboundFor, 24*time.Hour)
	def(&o.DrainTimeout, 35*time.Second)
	if o.MaxAttempts <= 0 {
		o.MaxAttempts = 8
	}
	if o.RateLimit <= 0 {
		o.RateLimit = 20
	}
}

// Service implements core.Notifier and serves the console routes.
type Service struct {
	db   *store.DB
	reg  core.PluginRegistry
	opts Options
	wake chan struct{}

	mu     sync.Mutex
	cancel context.CancelFunc // ends claiming
	abort  context.CancelFunc // cancels the delivery in progress
	done   chan struct{}
}

var _ core.Notifier = (*Service)(nil)

func New(db *store.DB, reg core.PluginRegistry, opts Options) *Service {
	opts.defaults()
	return &Service{db: db, reg: reg, opts: opts, wake: make(chan struct{}, 1)}
}

// NotificationChannels lists the channels of the current generation.
func (s *Service) NotificationChannels() []core.NotificationChannelBinding {
	if gen, ok := s.reg.Current().(core.NotificationGeneration); ok {
		return gen.NotificationChannels()
	}
	return nil
}

func (s *Service) channel(id string) (core.NotificationChannelBinding, bool) {
	for _, b := range s.NotificationChannels() {
		if b.Channel.ID == id {
			return b, true
		}
	}
	return core.NotificationChannelBinding{}, false
}

// Notify validates n and queues it for source.
func (s *Service) Notify(ctx context.Context, source string, n core.Notification) (core.NotifyResult, error) {
	n, provider, err := s.validate(n)
	if err != nil {
		return core.NotifyResult{}, err
	}
	var out core.NotifyResult
	err = s.db.Tx(ctx, func(tx pgx.Tx) error {
		// One sender at a time per source, so the dedupe and rate checks
		// below see each other's rows.
		if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext('notify:' || $1))`, source); err != nil {
			return err
		}
		if n.DedupeKey != "" {
			// A failed notification does not hold its key: the next one may get through.
			err := tx.QueryRow(ctx, `SELECT id FROM notifications WHERE source = $1 AND dedupe_key = $2 AND status <> 'failed'
				AND created_at > now() - make_interval(secs => $3) ORDER BY id DESC LIMIT 1`, source, n.DedupeKey, n.DedupeSeconds).Scan(&out.ID)
			if err == nil {
				out.Deduplicated = true
				return nil
			}
			if !store.IsNoRows(err) {
				return err
			}
		}
		var recent int
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM notifications WHERE source = $1 AND created_at > now() - make_interval(secs => $2)`,
			source, s.opts.RateWindow.Seconds()).Scan(&recent); err != nil {
			return err
		}
		if recent >= s.opts.RateLimit {
			return core.ErrRateLimited.WithMessage("notification rate limit exceeded")
		}
		return tx.QueryRow(ctx, `INSERT INTO notifications (source, channel, recipients, subject, body, severity, dedupe_key, provider)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
			source, n.Channel, n.Recipients, n.Subject, n.Body, n.Severity, n.DedupeKey, provider).Scan(&out.ID)
	})
	if err == nil && !out.Deduplicated {
		s.poke()
	}
	return out, err
}

// Field error codes of a notification (details.fields[].code), stable for
// clients to translate; the messages stay English (CONTRACTS §74.4).
const (
	CodeUnknownChannel    = "unknown_channel"     // channel: no channel with this id
	CodeRecipientsCount   = "recipients_count"    // recipients: none, or more than MaxRecipients
	CodeRecipientTooLong  = "recipient_too_long"  // recipients: one longer than MaxRecipientLen bytes
	CodeInvalidRecipient  = "invalid_recipient"   // recipients: one not in the channel's recipient format
	CodeSubjectRequired   = "subject_required"    // subject: empty after trimming
	CodeSubjectTooLong    = "subject_too_long"    // subject: more than MaxSubjectRunes characters
	CodeSubjectMultiline  = "subject_multiline"   // subject: a line break or NUL
	CodeBodyTooLarge      = "body_too_large"      // body: more than MaxBodyBytes
	CodeBodyNUL           = "body_nul"            // body: a NUL byte
	CodeInvalidSeverity   = "invalid_severity"    // severity: not info, warning or critical
	CodeDedupeKeyTooLong  = "dedupe_key_too_long" // dedupe_key: more than MaxDedupeKey bytes
	CodeDedupeWindowRange = "dedupe_window_range" // dedupe_seconds: below 0 or above MaxDedupeSeconds
)

// validate checks n and returns it normalized (trimmed recipients, default
// severity and dedupe window) with the key of the plugin providing its
// channel, the only one that may deliver it.
func (s *Service) validate(n core.Notification) (core.Notification, string, error) {
	var fe []core.FieldError
	bad := func(field, code, msg string) {
		fe = append(fe, core.FieldError{Field: field, Code: code, Message: msg})
	}
	b, ok := s.channel(n.Channel)
	if !ok {
		bad("channel", CodeUnknownChannel, "unknown notification channel")
	}
	recipients := make([]string, 0, len(n.Recipients))
	for _, r := range n.Recipients {
		if r = strings.TrimSpace(r); r != "" {
			recipients = append(recipients, r)
		}
	}
	n.Recipients = recipients
	if len(recipients) == 0 || len(recipients) > MaxRecipients {
		bad("recipients", CodeRecipientsCount, fmt.Sprintf("between 1 and %d recipients", MaxRecipients))
	}
	for _, r := range recipients {
		if len(r) > MaxRecipientLen {
			bad("recipients", CodeRecipientTooLong, fmt.Sprintf("a recipient of at most %d bytes", MaxRecipientLen))
			break
		}
		if ok && !manifest.ValidRecipient(b.Channel.RecipientFormat(), r) {
			bad("recipients", CodeInvalidRecipient, "invalid recipient "+r)
			break
		}
	}
	n.Subject = strings.TrimSpace(n.Subject)
	switch {
	case n.Subject == "":
		bad("subject", CodeSubjectRequired, "a subject is required")
	case utf8.RuneCountInString(n.Subject) > MaxSubjectRunes:
		bad("subject", CodeSubjectTooLong, fmt.Sprintf("at most %d characters", MaxSubjectRunes))
	case strings.ContainsAny(n.Subject, "\r\n\x00"):
		bad("subject", CodeSubjectMultiline, "one line, without NUL")
	}
	switch {
	case len(n.Body) > MaxBodyBytes:
		bad("body", CodeBodyTooLarge, fmt.Sprintf("at most %d KiB", MaxBodyBytes>>10))
	case strings.ContainsRune(n.Body, 0):
		bad("body", CodeBodyNUL, "without NUL")
	}
	switch n.Severity {
	case "":
		n.Severity = core.SeverityInfo
	case core.SeverityInfo, core.SeverityWarning, core.SeverityCritical:
	default:
		bad("severity", CodeInvalidSeverity, "info, warning or critical")
	}
	if len(n.DedupeKey) > MaxDedupeKey {
		bad("dedupe_key", CodeDedupeKeyTooLong, fmt.Sprintf("a key of at most %d bytes", MaxDedupeKey))
	}
	if n.DedupeSeconds < 0 || n.DedupeSeconds > MaxDedupeSeconds {
		bad("dedupe_seconds", CodeDedupeWindowRange, fmt.Sprintf("a window of 0 to %d seconds", MaxDedupeSeconds))
	}
	if n.DedupeSeconds == 0 {
		n.DedupeSeconds = DefaultDedupeSeconds
	}
	if len(fe) > 0 {
		return n, "", core.InvalidFields(fe...)
	}
	return n, b.Plugin.Key, nil
}

// poke wakes the local worker after a new row.
func (s *Service) poke() {
	select {
	case s.wake <- struct{}{}:
	default:
	}
}
