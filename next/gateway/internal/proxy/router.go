// Package proxy implements a single-hop streaming router. Business requests are
// never replayed; each outgoing request uses a fresh HTTP/1 connection.
package proxy

import (
	"crypto/tls"
	"crypto/x509"
	"errors"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/gateway/internal/peer"
)

const prefix = "/internal/forward"
const revisionHeader = "X-Sub2api-Route-Revision"
const bootHeader = "X-Sub2api-Core-Boot"
const hopHeader = "X-Sub2api-Hop"
const entryNodeHeader = "X-Sub2api-Entry-Node"

type Route struct {
	Mode         string
	LocalURL     string
	PeerURL      string
	Revision     int64
	PeerRevision int64
	CoreBootID   string
}
type Config struct {
	NodeID         string
	PeerTLS        *tls.Config
	PeerTransport  http.RoundTripper
	LocalReady     func() bool
	PeerReady      func(Route) bool
	TrustedProxies []*net.IPNet
}
type Router struct {
	mu      sync.RWMutex
	route   Route
	config  Config
	local   *http.Transport
	peer    http.RoundTripper
	active  atomic.Int64
	offload atomic.Pointer[offloadSet]
	next    atomic.Uint64
}

// Target is a serving node that takes new requests while this node's CPU is
// overloaded. Revision is the target's route revision.
type Target struct {
	PeerURL    string
	CoreBootID string
	Revision   int64
}
type offloadSet struct {
	targets []Target
	until   time.Time
}

func New(c Config) *Router {
	transport := c.PeerTransport
	if transport == nil {
		transport = singleSendTransport(c.PeerTLS)
	}
	return &Router{config: c, local: singleSendTransport(nil), peer: transport}
}
func PeerTransport(c *tls.Config) *http.Transport { return singleSendTransport(c) }
func singleSendTransport(c *tls.Config) *http.Transport {
	return &http.Transport{Proxy: nil, DialContext: (&net.Dialer{Timeout: 15 * time.Second, KeepAlive: 30 * time.Second}).DialContext, TLSClientConfig: c, TLSHandshakeTimeout: 15 * time.Second, DisableKeepAlives: true, DisableCompression: true, ForceAttemptHTTP2: false, TLSNextProto: map[string]func(string, *tls.Conn) http.RoundTripper{}, ResponseHeaderTimeout: 0}
}
func (r *Router) SetRoute(v Route) error {
	if v.Mode != "maintenance" && v.Mode != "candidate" && v.Mode != "local-serving" && v.Mode != "forward-only" {
		return errors.New("invalid route mode")
	}
	if v.Mode == "local-serving" {
		u, e := url.Parse(v.LocalURL)
		if e != nil || u.Scheme != "http" || u.User != nil || !loopback(u.Hostname()) || u.Path != "" || u.RawQuery != "" || v.CoreBootID == "" {
			return errors.New("local route must identify a loopback core")
		}
	}
	if v.Mode == "forward-only" {
		if err := r.validPeer(v.PeerURL, v.CoreBootID); err != nil {
			return err
		}
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if v.Revision < r.route.Revision {
		return errors.New("stale route revision")
	}
	r.route = v
	return nil
}
func (r *Router) validPeer(peerURL, boot string) error {
	u, e := url.Parse(peerURL)
	if e != nil || u.Scheme != "https" || u.Host == "" || u.User != nil || u.Path != "" || u.RawQuery != "" || boot == "" {
		return errors.New("peer route must identify an HTTPS node")
	}
	if r.config.PeerTLS == nil || r.config.PeerTLS.InsecureSkipVerify || r.config.PeerTransport == nil {
		return errors.New("peer routing requires verified HTTPS and node authentication transport")
	}
	return nil
}

// SetOffload sends new business requests arriving while this node serves
// locally to targets, in turn, until ttl passes; the caller keeps renewing it.
// No targets serves everything locally again. In-flight requests stay put.
func (r *Router) SetOffload(targets []Target, ttl time.Duration) error {
	if len(targets) == 0 {
		r.offload.Store(nil)
		return nil
	}
	for _, t := range targets {
		if err := r.validPeer(t.PeerURL, t.CoreBootID); err != nil {
			return err
		}
		if t.Revision == 0 {
			return errors.New("offload target has no route revision")
		}
	}
	r.offload.Store(&offloadSet{targets: append([]Target(nil), targets...), until: time.Now().Add(ttl)})
	return nil
}

// Offloading reports whether new requests currently leave this node.
func (r *Router) Offloading() bool { return r.offload.Load().live() }
func (s *offloadSet) live() bool {
	return s != nil && len(s.targets) > 0 && time.Now().Before(s.until)
}
func (r *Router) offloadTarget() (Target, bool) {
	set := r.offload.Load()
	if !set.live() {
		return Target{}, false
	}
	return set.targets[r.next.Add(1)%uint64(len(set.targets))], true
}
func loopback(s string) bool    { ip := net.ParseIP(s); return ip != nil && ip.IsLoopback() }
func (r *Router) Route() Route  { r.mu.RLock(); defer r.mu.RUnlock(); return r.route }
func (r *Router) Active() int64 { return r.active.Load() }
func (r *Router) ready(v Route) bool {
	return (v.Mode == "forward-only" && (r.config.PeerReady == nil || r.config.PeerReady(v))) || (v.Mode == "local-serving" && (r.config.LocalReady == nil || r.config.LocalReady()))
}
func (r *Router) Public() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		v := r.Route()
		if q.URL.Path == "/livez" {
			w.WriteHeader(200)
			return
		}
		if q.URL.Path == "/readyz" || q.URL.Path == "/healthz" {
			if r.ready(v) {
				w.WriteHeader(200)
			} else {
				unavailable(w)
			}
			return
		}
		if strings.HasPrefix(q.URL.Path, "/internal/") {
			http.NotFound(w, q)
			return
		}
		if !r.ready(v) {
			unavailable(w)
			return
		}
		clientIP := r.clientIP(q)
		proto := r.clientScheme(q)
		q = q.Clone(q.Context())
		scrub(q.Header)
		q.Header.Set("X-Forwarded-For", clientIP)
		q.Header.Set("X-Forwarded-Proto", proto)
		if v.Mode == "forward-only" {
			q.Header.Set(revisionHeader, strconv.FormatInt(v.PeerRevision, 10))
			q.Header.Set(bootHeader, v.CoreBootID)
			q.Header.Set(hopHeader, "1")
			r.serve(w, q, v.PeerURL, true, r.config.NodeID)
		} else if t, ok := r.offloadTarget(); ok {
			q.Header.Set(revisionHeader, strconv.FormatInt(t.Revision, 10))
			q.Header.Set(bootHeader, t.CoreBootID)
			q.Header.Set(hopHeader, "1")
			r.serve(w, q, t.PeerURL, true, r.config.NodeID)
		} else {
			r.serve(w, q, v.LocalURL, false, r.config.NodeID)
		}
	})
}

// Private accepts forwarded traffic only from Redis-authenticated node
// identities. It never consults PeerURL and therefore cannot form proxy loops.
func (r *Router) Private() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		if _, ok := peer.FromContext(q.Context()); !ok {
			peer.Failure(w, 401)
			return
		}
		v := r.Route()
		if !strings.HasPrefix(q.URL.Path, prefix+"/") {
			http.NotFound(w, q)
			return
		}
		if v.Mode != "local-serving" || !r.ready(v) || q.Header.Get(hopHeader) != "1" || q.Header.Get(bootHeader) != v.CoreBootID || q.Header.Get(revisionHeader) != strconv.FormatInt(v.Revision, 10) {
			peer.Failure(w, 409)
			return
		}
		q = q.Clone(q.Context())
		q.URL.Path = strings.TrimPrefix(q.URL.Path, prefix)
		if q.URL.RawPath != "" {
			q.URL.RawPath = strings.TrimPrefix(q.URL.RawPath, prefix)
		}
		q.Header.Del(hopHeader)
		q.Header.Del(bootHeader)
		q.Header.Del(revisionHeader)
		q.Header.Del(entryNodeHeader)
		r.serve(w, q, v.LocalURL, false, "")
	})
}
func (r *Router) serve(w http.ResponseWriter, q *http.Request, target string, remote bool, entryNode string) {
	u, e := url.Parse(target)
	if e != nil {
		unavailable(w)
		return
	}
	r.active.Add(1)
	defer r.active.Add(-1)
	var transport http.RoundTripper = r.local
	if remote {
		transport = r.peer
	}
	p := httputil.ReverseProxy{Transport: transport, FlushInterval: -1, Rewrite: func(p *httputil.ProxyRequest) {
		p.SetURL(u)
		p.Out.Host = p.In.Host
		p.Out.Header.Set("X-Forwarded-For", p.In.Header.Get("X-Forwarded-For"))
		p.Out.Header.Set("X-Forwarded-Host", p.In.Host)
		proto := p.In.Header.Get("X-Forwarded-Proto")
		if proto != "https" {
			proto = "http"
		}
		p.Out.Header.Set("X-Forwarded-Proto", proto)
		if remote {
			p.Out.URL.Path = prefix + p.Out.URL.Path
			if p.Out.URL.RawPath != "" {
				p.Out.URL.RawPath = prefix + p.Out.URL.RawPath
			}
		}
		// A fresh connection prevents net/http's reused-connection retry. Also
		// remove GetBody, so no future transport can silently rewind this body.
		p.Out.GetBody = nil
	}, ModifyResponse: func(res *http.Response) error {
		internalFailure := remote && res.Header.Get(peer.ErrorHeader) != ""
		peer.ScrubResponse(res.Header)
		// Only the public ingress knows which gateway the browser contacted.
		// Private hops never claim to be that ingress, including mixed versions.
		// Override rather than trusting a client or downstream response header.
		res.Header.Del(entryNodeHeader)
		if q.Method == http.MethodGet && q.URL.Path == "/api/v1/system/version" && res.StatusCode >= 200 && res.StatusCode < 300 && entryNode != "" && !internalFailure {
			res.Header.Set(entryNodeHeader, entryNode)
			res.Header.Set("Cache-Control", "no-store")
		}
		if internalFailure {
			res.StatusCode = 503
			res.Status = "503 Service Unavailable"
			res.Header.Set("Retry-After", "1")
		}
		return nil
	}, ErrorHandler: func(w http.ResponseWriter, _ *http.Request, err error) {
		if errors.Is(err, peer.ErrForbidden) || errors.Is(err, peer.ErrUnauthorized) || errors.Is(err, peer.ErrUnavailable) || errors.Is(err, peer.ErrConflict) {
			unavailable(w)
			return
		}
		http.Error(w, "upstream unavailable", http.StatusBadGateway)
	}}
	p.ServeHTTP(w, q)
}
func scrub(h http.Header) {
	for k := range h {
		if strings.HasPrefix(strings.ToLower(k), "x-sub2api-") {
			h.Del(k)
		}
	}
	for _, k := range []string{"Forwarded", "X-Forwarded-For", "X-Forwarded-Host", "X-Forwarded-Proto", "X-Real-IP"} {
		h.Del(k)
	}
}
func (r *Router) clientIP(q *http.Request) string {
	host := directPeer(q)
	if r.trustedIP(net.ParseIP(host)) {
		parts := strings.Split(strings.Join(q.Header.Values("X-Forwarded-For"), ","), ",")
		for i := len(parts) - 1; i >= 0; i-- {
			candidate := net.ParseIP(strings.TrimSpace(parts[i]))
			if candidate == nil {
				break
			}
			host = candidate.String()
			if !r.trustedIP(candidate) {
				break
			}
		}
	}
	return host
}
func directPeer(q *http.Request) string {
	host, _, err := net.SplitHostPort(q.RemoteAddr)
	if err != nil {
		return q.RemoteAddr
	}
	return host
}
func (r *Router) trustedIP(ip net.IP) bool {
	if ip == nil {
		return false
	}
	for _, network := range r.config.TrustedProxies {
		if network != nil && network.Contains(ip) {
			return true
		}
	}
	return false
}

// A trusted TLS terminator must overwrite X-Forwarded-Proto with one value.
// Ambiguous lists, duplicate headers and untrusted peers use the actual socket.
func (r *Router) clientScheme(q *http.Request) string {
	actual := "http"
	if q.TLS != nil {
		actual = "https"
	}
	if !r.trustedIP(net.ParseIP(directPeer(q))) {
		return actual
	}
	values := q.Header.Values("X-Forwarded-Proto")
	if len(values) != 1 {
		return actual
	}
	scheme := strings.ToLower(strings.TrimSpace(values[0]))
	if scheme == "http" || scheme == "https" {
		return scheme
	}
	return actual
}
func unavailable(w http.ResponseWriter) {
	w.Header().Set("Retry-After", "1")
	http.Error(w, "temporarily unavailable", 503)
}
func ServerTLS(cert tls.Certificate, ca *x509.CertPool) *tls.Config {
	return &tls.Config{MinVersion: tls.VersionTLS13, Certificates: []tls.Certificate{cert}, NextProtos: []string{"http/1.1"}}
}
