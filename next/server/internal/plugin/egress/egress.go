// Package egress implements the host side of EgressService: every outbound
// connection of a plugin is tunnelled through the core, checked against the
// plugin's egress policy, forwarded and logged to plugin_egress_logs.
package egress

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net"
	"net/netip"
	"strconv"
	"strings"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// DNSHost/DNSPort is the in-process DNS-over-TCP endpoint the plugin SDK
// resolver dials.
const (
	DNSHost = "dns.sub2api"
	DNSPort = 53
)

// MaxFrameData is the largest data payload per frame.
const MaxFrameData = 32 << 10

// Policy modes.
const (
	PolicyAllowAll  = "allow_all"
	PolicyAllowlist = "allowlist"
)

// Log results (plugin_egress_logs.result).
const (
	ResultOK        = "ok"
	ResultDenied    = "denied"
	ResultDialError = "dial_error"
	ResultReset     = "reset"
)

// Options configures a Provider. Zero values use the defaults.
type Options struct {
	NodeID      string
	DialTimeout time.Duration // default 10 s
	// AlwaysAllow lists "host:port" targets allowed regardless of policy,
	// e.g. the PostgreSQL address handed out by HostService.GetDSN.
	AlwaysAllow []string
	// Dial overrides the outbound dialer (tests).
	Dial func(ctx context.Context, network, address string) (net.Conn, error)
	// LookupIP overrides the resolver used for dns.sub2api (tests).
	LookupIP      func(ctx context.Context, host string) ([]netip.Addr, error)
	FlushInterval time.Duration // log batch interval, default 2 s
	BatchSize     int           // default 500
	QueueSize     int           // default 10000; entries beyond are dropped
	Retention     time.Duration // default 7 days; 0 keeps the default, <0 disables pruning
	// DomainUpdateInterval bounds how often the plugin_egress_domains row of
	// a known host is updated by this node (default 1 minute). A host this
	// node has not written yet is written at the next flush.
	DomainUpdateInterval time.Duration
	// Events receives plugin.egress_new_domain when a plugin connects to a
	// host for the first time (optional; without it only a WARN is logged).
	Events core.EventPublisher
	Logger *slog.Logger
}

// Provider implements core.EgressProvider.
type Provider struct {
	opts   Options
	log    *slog.Logger
	logs   *logWriter
	always map[string]bool
}

var _ core.EgressProvider = (*Provider)(nil)

// New builds a provider and starts its log writer. db may be nil (logs are
// discarded). Call Close on shutdown to flush pending logs.
func New(db *store.DB, opts Options) *Provider {
	var st logStore
	if db != nil {
		st = pgStore{db: db}
	}
	return newProvider(st, opts)
}

func newProvider(st logStore, opts Options) *Provider {
	if opts.DialTimeout <= 0 {
		opts.DialTimeout = 10 * time.Second
	}
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	if opts.Dial == nil {
		d := &net.Dialer{Timeout: opts.DialTimeout, KeepAlive: 30 * time.Second}
		opts.Dial = d.DialContext
	}
	if opts.LookupIP == nil {
		opts.LookupIP = func(ctx context.Context, host string) ([]netip.Addr, error) {
			return net.DefaultResolver.LookupNetIP(ctx, "ip", host)
		}
	}
	p := &Provider{opts: opts, log: opts.Logger, always: map[string]bool{}}
	for _, a := range opts.AlwaysAllow {
		p.always[strings.ToLower(a)] = true
	}
	p.logs = newLogWriter(st, opts)
	return p
}

// Close stops the log writer after flushing pending entries; rows of
// connections still open are marked reset.
func (p *Provider) Close() { p.logs.shutdown() }

// Flush writes pending log entries now.
func (p *Provider) Flush(ctx context.Context) error { return p.logs.flushNow(ctx) }

// ServerFor returns the EgressService served to one plugin instance.
// policy is read on every new connection so policy changes apply at once.
func (p *Provider) ServerFor(pluginKey string, policy func() core.EgressPolicy) pluginv1.EgressServiceServer {
	if policy == nil {
		policy = func() core.EgressPolicy { return core.EgressPolicy{Mode: PolicyAllowAll} }
	}
	return &server{p: p, key: pluginKey, policy: policy}
}

type server struct {
	pluginv1.UnimplementedEgressServiceServer
	p      *Provider
	key    string
	policy func() core.EgressPolicy
}

func sendResult(stream pluginv1.EgressService_DialServer, ok bool, errMsg, remote string) error {
	return stream.Send(&pluginv1.EgressFrame{Kind: &pluginv1.EgressFrame_Result{
		Result: &pluginv1.DialResult{Ok: ok, Error: errMsg, RemoteAddr: remote},
	}})
}

// Dial serves one tunnelled connection.
func (s *server) Dial(stream pluginv1.EgressService_DialServer) error {
	ctx := stream.Context()
	first, err := stream.Recv()
	if err != nil {
		return err
	}
	open := first.GetOpen()
	if open == nil {
		_ = sendResult(stream, false, "first frame must be open", "")
		return status.Error(codes.InvalidArgument, "egress: first frame must be open")
	}
	start := time.Now()
	entry := logEntry{PluginKey: s.key, NodeID: s.p.opts.NodeID, Network: open.Network, StartedAt: start}
	finish := func(result, msg string) {
		entry.Result, entry.Error = result, msg
		entry.DurationMS = int(time.Since(start).Milliseconds())
		s.p.logs.add(entry)
	}

	host, portStr, err := net.SplitHostPort(open.Address)
	port, perr := strconv.Atoi(portStr)
	if err != nil || perr != nil || host == "" || port <= 0 || port > 65535 {
		entry.Host = truncate(open.Address, 255)
		finish(ResultDenied, "invalid address")
		return sendResult(stream, false, "egress: invalid address "+strconv.Quote(open.Address), "")
	}
	host = normalizeHost(host)
	entry.Host, entry.Port = truncate(host, 255), port
	switch open.Network {
	case "tcp", "tcp4", "tcp6":
	default:
		finish(ResultDenied, "unsupported network")
		return sendResult(stream, false, "egress: only tcp is supported", "")
	}
	pol := s.policy()
	isDNS := host == DNSHost && port == DNSPort
	if !isDNS {
		// Every connection attempt counts for the plugin's domain list
		// (denied ones included: they show what the plugin tries to reach).
		s.p.logs.observe(s.key, entry.Host, port)
	}

	var conn net.Conn
	if isDNS {
		// In-process DNS-over-TCP; queries are logged individually.
		c1, c2 := net.Pipe()
		go s.p.serveDNS(ctx, c2, s.key, pol)
		conn = c1
	} else {
		if !s.p.allowed(pol, host, port) {
			finish(ResultDenied, "blocked by egress policy")
			return sendResult(stream, false, "egress: "+host+" is not allowed by the plugin egress policy", "")
		}
		dctx, cancel := context.WithTimeout(ctx, s.p.opts.DialTimeout)
		conn, err = s.p.opts.Dial(dctx, open.Network, net.JoinHostPort(host, portStr))
		cancel()
		if err != nil {
			finish(ResultDialError, err.Error())
			return sendResult(stream, false, "egress: "+err.Error(), "")
		}
	}
	defer conn.Close()
	// The connection is logged at once (result 'open') and updated when it
	// closes, so long-lived connections are visible while they last.
	var oc *openConn
	if !isDNS {
		oc = s.p.logs.open(entry)
	}
	remote := ""
	if a := conn.RemoteAddr(); a != nil {
		remote = a.String()
	}
	if err := sendResult(stream, true, "", remote); err != nil {
		if oc != nil {
			s.p.logs.close(oc, ResultReset, err.Error(), 0, 0, start)
		}
		return err
	}
	in, out, ferr := pump(ctx, stream, conn)
	if isDNS {
		return nil
	}
	if ferr != nil {
		s.p.logs.close(oc, ResultReset, ferr.Error(), in, out, start)
	} else {
		s.p.logs.close(oc, ResultOK, "", in, out, start)
	}
	return nil
}

// pump copies both directions until both are finished or the stream ends.
// in counts remote->plugin bytes, out plugin->remote bytes.
func pump(ctx context.Context, stream pluginv1.EgressService_DialServer, conn net.Conn) (in, out int64, err error) {
	stop := context.AfterFunc(ctx, func() { _ = conn.Close() })
	defer stop()
	upErr := make(chan error, 1)
	downErr := make(chan error, 1)

	// plugin -> remote
	go func() {
		for {
			f, err := stream.Recv()
			if err == io.EOF {
				closeWrite(conn)
				upErr <- nil
				return
			}
			if err != nil {
				_ = conn.Close()
				upErr <- err
				return
			}
			switch k := f.Kind.(type) {
			case *pluginv1.EgressFrame_Data:
				n, werr := conn.Write(k.Data)
				out += int64(n)
				if werr != nil {
					_ = conn.Close()
					upErr <- werr
					return
				}
			case *pluginv1.EgressFrame_Close:
				if k.Close.GetError() != "" {
					_ = conn.Close()
				} else {
					closeWrite(conn)
				}
				upErr <- nil
				return
			}
		}
	}()

	// remote -> plugin
	go func() {
		buf := make([]byte, MaxFrameData)
		for {
			n, rerr := conn.Read(buf)
			if n > 0 {
				data := make([]byte, n)
				copy(data, buf[:n])
				if serr := stream.Send(&pluginv1.EgressFrame{Kind: &pluginv1.EgressFrame_Data{Data: data}}); serr != nil {
					_ = conn.Close()
					downErr <- serr
					return
				}
				in += int64(n)
			}
			if rerr != nil {
				msg := ""
				var res error
				if !errors.Is(rerr, io.EOF) {
					msg, res = rerr.Error(), rerr
				}
				_ = stream.Send(&pluginv1.EgressFrame{Kind: &pluginv1.EgressFrame_Close{Close: &pluginv1.DialClose{Error: msg}}})
				downErr <- res
				return
			}
		}
	}()

	e1 := <-upErr
	e2 := <-downErr
	if ctx.Err() != nil {
		// The plugin tore the stream down; not an error of the target.
		return in, out, nil
	}
	if e2 != nil && !errors.Is(e2, net.ErrClosed) {
		return in, out, e2
	}
	if e1 != nil && !errors.Is(e1, net.ErrClosed) && status.Code(e1) != codes.Canceled {
		return in, out, e1
	}
	return in, out, nil
}

func closeWrite(c net.Conn) {
	if cw, ok := c.(interface{ CloseWrite() error }); ok {
		_ = cw.CloseWrite()
		return
	}
	_ = c.Close()
}

func normalizeHost(h string) string {
	return strings.TrimSuffix(strings.ToLower(strings.TrimSpace(h)), ".")
}

func truncate(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}

// allowed applies the plugin policy plus the provider-wide AlwaysAllow list.
func (p *Provider) allowed(pol core.EgressPolicy, host string, port int) bool {
	if p.always[net.JoinHostPort(host, strconv.Itoa(port))] {
		return true
	}
	return AllowedHost(pol, host)
}

// AllowedHost reports whether host may be reached under pol. In allowlist
// mode host must equal an entry or match a "*.example.com" wildcard (any
// subdomain depth, not the apex). Matching is case-insensitive.
func AllowedHost(pol core.EgressPolicy, host string) bool {
	if pol.Mode != PolicyAllowlist {
		return true
	}
	host = normalizeHost(host)
	if host == "" {
		return false
	}
	for _, d := range pol.AllowedDomains {
		d = normalizeHost(d)
		if d == "" {
			continue
		}
		if d == "*" {
			return true
		}
		if suffix, ok := strings.CutPrefix(d, "*."); ok {
			if strings.HasSuffix(host, "."+suffix) {
				return true
			}
			continue
		}
		if host == d {
			return true
		}
	}
	return false
}
