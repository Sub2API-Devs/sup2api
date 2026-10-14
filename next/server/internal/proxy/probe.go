package proxy

import (
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/netguard"
)

// probeProtocols is the order a proxy given without a scheme is tried in:
// the first protocol that works is the proxy's.
var probeProtocols = []string{"socks5", "http", "https"}

// ProbeAttempt is one protocol tried by POST /proxies/probe.
type ProbeAttempt struct {
	Protocol  string `json:"protocol"`
	OK        bool   `json:"ok"`
	Status    int    `json:"status,omitempty"`
	LatencyMs int64  `json:"latency_ms"`
	Message   string `json:"message,omitempty"`
}

// ProbeResult answers POST /proxies/probe. proxy_url is the address with the
// protocol that worked (what the caller should save); location is the exit
// IP's country and timezone when that lookup succeeded too.
type ProbeResult struct {
	OK           bool           `json:"ok"`
	Protocol     string         `json:"protocol,omitempty"`
	ProxyURL     string         `json:"proxy_url,omitempty"`
	IP           string         `json:"ip,omitempty"`
	LatencyMs    int64          `json:"latency_ms,omitempty"`
	Location     *Location      `json:"location,omitempty"`
	Attempts     []ProbeAttempt `json:"attempts"`
	ProxyID      *int64         `json:"proxy_id,omitempty"`
	ProxyCreated bool           `json:"proxy_created"`
}

// probeCandidates parses a pasted proxy: "scheme://user:pass@host:port" is
// that protocol only; "host:port:user:pass", "user:pass@host:port" and
// "host:port" have no scheme and are tried as socks5, http, then https.
func probeCandidates(raw string) ([]Spec, error) {
	raw = strings.TrimSpace(raw)
	if strings.Contains(raw, "://") {
		spec, err := core.ParseProxyURL(raw)
		if err != nil {
			return nil, err
		}
		return []Spec{spec}, nil
	}
	invalid := core.InvalidFields(core.FieldError{Field: "proxy_url", Code: "invalid",
		Message: "invalid proxy URL: use scheme://user:pass@host:port or host:port:user:pass"})
	var hostport, user, pass string
	if at := strings.LastIndex(raw, "@"); at >= 0 {
		hostport = raw[at+1:]
		user, pass, _ = strings.Cut(raw[:at], ":")
	} else {
		parts := strings.SplitN(raw, ":", 4)
		switch len(parts) {
		case 2:
			hostport = raw
		case 4:
			hostport, user, pass = parts[0]+":"+parts[1], parts[2], parts[3]
		default:
			return nil, invalid
		}
	}
	if hostport == "" || strings.Count(hostport, ":") != 1 {
		return nil, invalid
	}
	out := make([]Spec, 0, len(probeProtocols))
	for _, protocol := range probeProtocols {
		u := url.URL{Scheme: protocol, Host: hostport}
		if user != "" || pass != "" {
			u.User = url.UserPassword(user, pass)
		}
		spec, err := core.ParseProxyURL(u.String())
		if err != nil {
			return nil, err
		}
		out = append(out, spec)
	}
	return out, nil
}

// specURL is the proxy URL of spec, credentials included.
func specURL(spec Spec) *url.URL {
	u := &url.URL{Scheme: spec.Protocol, Host: net.JoinHostPort(spec.Host, strconv.Itoa(spec.Port))}
	if spec.Username != "" || spec.Password != "" {
		u.User = url.UserPassword(spec.Username, spec.Password)
	}
	return u
}

// probeURL serves POST /proxies/probe {proxy_url, save?}: tests a pasted
// proxy without saving it, detecting the protocol when none is given, and
// looks up the exit IP's location. With save the working proxy is found or
// created (the account proxy_url rule, CONTRACTS §21.4) and its id returned,
// for callers that need a proxy_id (Claude Code draft runtimes). A proxy that
// works with no protocol is 200 {ok:false, attempts}.
func (s *Service) probeURL(c *gin.Context) {
	ctx := audit.Context(c)
	var in struct {
		ProxyURL string `json:"proxy_url"`
		Save     bool   `json:"save"`
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	if !httpapi.BindJSON(c, &in) {
		return
	}
	candidates, err := probeCandidates(in.ProxyURL)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	// A private address needs proxy:manage, as when saving one (§21.5).
	if !s.opts.AllowPrivate && netguard.LiteralPrivate(candidates[0].Host) && !granted(c, "proxy:manage") {
		httpapi.Fail(c, core.ErrPermissionDenied.WithMessage(t(ctx, "proxy address is private and not allowed", "不允许使用私网地址代理")).
			WithDetails(map[string]any{"permission": "proxy:manage"}))
		return
	}
	clients := make([]*http.Client, len(candidates))
	for i, spec := range candidates {
		clients[i] = &http.Client{Transport: newTransport(specURL(spec))}
		defer clients[i].CloseIdleConnections()
	}
	tests := make([]TestResult, len(candidates))
	var wg sync.WaitGroup
	for i := range candidates {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			tests[i] = s.probe(ctx, clients[i])
		}(i)
	}
	wg.Wait()
	out := ProbeResult{Attempts: make([]ProbeAttempt, 0, len(candidates))}
	winner := -1
	for i, spec := range candidates {
		r := tests[i]
		out.Attempts = append(out.Attempts, ProbeAttempt{Protocol: spec.Protocol, OK: r.OK, Status: r.Status, LatencyMs: r.LatencyMs, Message: r.Message})
		if r.OK && winner < 0 {
			winner = i
		}
	}
	if winner < 0 {
		httpapi.OK(c, out)
		return
	}
	spec := candidates[winner]
	out.OK, out.Protocol, out.ProxyURL = true, spec.Protocol, specURL(spec).String()
	out.IP, out.LatencyMs = tests[winner].IP, tests[winner].LatencyMs
	if location, err := s.lookupLocation(ctx, clients[winner]); err == nil {
		out.Location = &location
	}
	if in.Save {
		uid, _ := core.UserID(ctx)
		var id int64
		var created bool
		err := s.db.Tx(ctx, func(tx pgx.Tx) error {
			var err error
			if id, created, err = s.FindOrCreate(ctx, tx, spec, uid, core.OwnerScope(ctx, "proxy:read")); err != nil || !created {
				return err
			}
			return audit.Audit(ctx, tx, uid, "proxy.create", "proxy", strconv.FormatInt(id, 10), map[string]any{"auto": true, "probe": true})
		})
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		if created {
			s.changed(ctx, id)
		}
		out.ProxyID, out.ProxyCreated = &id, created
	}
	httpapi.OK(c, out)
}

func granted(c *gin.Context, key string) bool {
	for _, k := range httpapi.Granted(c) {
		if k == key {
			return true
		}
	}
	return false
}
