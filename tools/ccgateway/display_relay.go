package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"sync"
	"time"
)

// thinking.display has no CLI setting. A loopback relay adds it to the CLI's
// own model requests and leaves every other field as the CLI wrote it.
type displayRelay struct {
	path       string
	URL        string
	FirstParty bool
	server     *http.Server
	transport  *http.Transport
}

var displayRelayHandlers sync.Map

func serveDisplayRelay(w http.ResponseWriter, r *http.Request) bool {
	parts := strings.SplitN(r.URL.Path, "/", 4)
	if len(parts) != 4 || parts[1] != "ccg-relay" {
		return false
	}
	handler, ok := displayRelayHandlers.Load("/ccg-relay/" + parts[2])
	if !ok {
		return false
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	ip := net.ParseIP(host)
	if err != nil || ip == nil || !ip.IsLoopback() {
		http.NotFound(w, r)
		return true
	}
	handler.(http.Handler).ServeHTTP(w, r)
	return true
}

func (r *displayRelay) Close() {
	displayRelayHandlers.Delete(r.path)
	if r.server != nil {
		_ = r.server.Close()
	}
	r.transport.CloseIdleConnections()
}
func environmentValue(env []string, key string) string {
	for i := len(env) - 1; i >= 0; i-- {
		if strings.HasPrefix(env[i], key+"=") {
			return strings.TrimPrefix(env[i], key+"=")
		}
	}
	return ""
}
func relayProxy(env []string, target *url.URL) (func(*http.Request) (*url.URL, error), error) {
	host := target.Hostname()
	if ip := net.ParseIP(host); ip != nil && ip.IsLoopback() {
		return nil, nil
	}
	if host == "localhost" {
		return nil, nil
	}
	noProxy := environmentValue(env, "NO_PROXY")
	if noProxy == "" {
		noProxy = environmentValue(env, "no_proxy")
	}
	for _, rule := range strings.Split(noProxy, ",") {
		rule = strings.TrimSpace(rule)
		if rule == "*" {
			return nil, nil
		}
		if _, cidr, err := net.ParseCIDR(rule); err == nil && cidr.Contains(net.ParseIP(host)) {
			return nil, nil
		}
		rule = strings.TrimPrefix(rule, "*.")
		rule = strings.TrimPrefix(rule, ".")
		if rule != "" && (target.Host == rule || host == rule || strings.HasSuffix(host, "."+rule)) {
			return nil, nil
		}
	}
	key := "HTTP_PROXY"
	if target.Scheme == "https" {
		key = "HTTPS_PROXY"
	}
	raw := environmentValue(env, key)
	if raw == "" {
		raw = environmentValue(env, strings.ToLower(key))
	}
	if raw == "" {
		return nil, nil
	}
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return nil, fmt.Errorf("invalid relay proxy configuration")
	}
	return http.ProxyURL(u), nil
}
func startDisplayRelay(req *Request, env []string, internalBase ...string) (*displayRelay, error) {
	raw := environmentValue(env, "ANTHROPIC_BASE_URL")
	if raw == "" {
		raw = "https://api.anthropic.com"
	}
	target, err := url.Parse(raw)
	if err != nil || (target.Scheme != "http" && target.Scheme != "https") || target.Host == "" {
		return nil, fmt.Errorf("invalid Anthropic base URL")
	}
	proxyFn, err := relayProxy(env, target)
	if err != nil {
		return nil, err
	}
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.Proxy = proxyFn
	path := "/ccg-relay/" + uuid()
	forward := httputil.NewSingleHostReverseProxy(target)
	forward.Transport = transport
	forward.FlushInterval = -1
	director := forward.Director
	forward.Director = func(r *http.Request) {
		r.URL.Path = strings.TrimPrefix(r.URL.Path, path)
		r.URL.RawPath = ""
		director(r)
		r.Host = target.Host
		r.Header.Del("X-Forwarded-For")
	}
	forward.ErrorHandler = func(w http.ResponseWriter, r *http.Request, e error) {
		apiError(w, 502, "api_error", "Relay upstream unavailable")
	}
	display := str(req.Thinking, "display")
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, path+"/") {
			http.NotFound(w, r)
			return
		}
		if r.Method == "POST" && strings.HasSuffix(r.URL.Path, "/messages") {
			body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 32<<20))
			if err != nil {
				apiError(w, 400, "invalid_request_error", "Invalid relay body")
				return
			}
			message, err := decodeObject(body)
			if err != nil {
				apiError(w, 400, "invalid_request_error", "Invalid thinking display body")
				return
			}
			thinking, ok := message["thinking"].(Object)
			if !ok {
				thinking = Object{"type": str(req.Thinking, "type")}
			}
			thinking["display"] = display
			message["thinking"] = thinking
			body, _ = json.Marshal(message)
			r.Body = io.NopCloser(bytes.NewReader(body))
			if req.diagnostic != nil {
				req.diagnostic.save("upstream-request-"+uuid()+".body", body)
			}
			r.ContentLength = int64(len(body))
			r.Header.Del("Content-Length")
		}
		forward.ServeHTTP(w, r)
	})
	if len(internalBase) > 0 && internalBase[0] != "" {
		displayRelayHandlers.Store(path, handler)
		return &displayRelay{URL: internalBase[0] + path, path: path, FirstParty: strings.EqualFold(target.Hostname(), "api.anthropic.com"), transport: transport}, nil
	}
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, fmt.Errorf("cannot start relay")
	}
	server := &http.Server{Handler: handler, ReadHeaderTimeout: 10 * time.Second}
	go func() { _ = server.Serve(listener) }()
	return &displayRelay{URL: "http://" + listener.Addr().String() + path, FirstParty: strings.EqualFold(target.Hostname(), "api.anthropic.com"), server: server, transport: transport}, nil
}
