package engine

import (
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Mod control shares the account HTTP port: isolated accounts only allow that
// loopback destination. Configuration and acknowledgements never use files.
var modControls sync.Map

type modControl struct {
	helperRequest    *Request
	relay            *outboundRelay                       // set by the Runner; answers the Mod's fallback question
	webSearch        func(id string, input Object) Object // passthrough web search, set by the Runner
	searchOnly       bool                                 // the one-shot web search process's control
	searchResult     Object
	scope            *mainRequestScope
	sessionContexts  map[string]bool
	reminderMarker   string
	nativeReminders  map[string]int
	reminderAcks     map[string]int
	diagnostic       *requestDiagnostic
	path, URL, token string
	config           []byte
	systems          int
	mu               sync.Mutex
	ready, attached  bool
	server           *http.Server
}

func startModControl(cfg *runConfig, internalBase string) (*modControl, error) {
	deferred := Object{}
	if len(cfg.deferral) != 0 {
		if err := json.Unmarshal(cfg.deferral, &deferred); err != nil {
			return nil, err
		}
	}
	var additionalDirs []string
	if cfg.helperRequest != nil {
		additionalDirs = cfg.helperRequest.AdditionalDirectories
	}
	var webSearch any
	if cfg.helperRequest != nil && cfg.helperRequest.webSearch != nil {
		webSearch = true
	}
	data, err := json.Marshal(Object{"web_search": webSearch, "attachments": cfg.attachments, "systems": cfg.systems, "deferred": deferred, "tools": cfg.tools, "trace": cfg.diagnostic.enabled(), "main_request_scope": cfg.scope != nil, "continuation_attachment_ack": cfg.reminderMarker != "", "helper_attachment_ack": cfg.helperRequest != nil && cfg.helperRequest.helperHistory != nil, "additional_directories": additionalDirs, "passthrough": cfg.passthrough})
	if err != nil {
		return nil, err
	}
	if len(data) > 4<<20 {
		return nil, fmt.Errorf("Mod configuration exceeds the CLI HTTP limit")
	}
	c := &modControl{path: "/ccg-mod/" + uuid(), token: uuid() + uuid(), config: data, systems: len(cfg.systems)}
	c.reminderMarker = cfg.reminderMarker
	c.nativeReminders = cfg.nativeReminders
	c.diagnostic = cfg.diagnostic
	c.scope = cfg.scope
	c.helperRequest = cfg.helperRequest
	c.diagnostic.artifact("mod-config.json", Object{"attachments": cfg.attachments, "systems": cfg.systems, "deferred": deferred, "tools": cfg.tools, "additional_directories": additionalDirs})
	if internalBase != "" {
		modControls.Store(c.path, c)
		c.URL = strings.TrimRight(internalBase, "/") + c.path
		return c, nil
	}
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, err
	}
	c.URL = "http://" + listener.Addr().String() + c.path
	c.server = &http.Server{Handler: c, ReadHeaderTimeout: 10 * time.Second}
	go func() { _ = c.server.Serve(listener) }()
	return c, nil
}

func serveModControl(w http.ResponseWriter, r *http.Request) bool {
	control, ok := modControls.Load(r.URL.Path)
	if !ok {
		return false
	}
	control.(*modControl).ServeHTTP(w, r)
	return true
}

func (c *modControl) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	ip := net.ParseIP(host)
	key := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	if err != nil || ip == nil || !ip.IsLoopback() || r.URL.Path != c.path || subtle.ConstantTimeCompare([]byte(key), []byte(c.token)) != 1 {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "application/json")
	if r.Method == http.MethodGet {
		c.diagnostic.trace("mod_config_fetched", nil)
		_, _ = w.Write(c.config)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(405)
		return
	}
	var ack struct {
		Event   string          `json:"event"`
		Version string          `json:"version"`
		Systems int             `json:"systems"`
		Detail  json.RawMessage `json:"detail"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&ack); err != nil {
		w.WriteHeader(400)
		return
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		w.WriteHeader(400)
		return
	}
	if c.serveWebSearch(w, ack.Event, ack.Detail) {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	switch {
	case ack.Event == "main_request_begin" && c.ready && c.scope != nil:
		if err := c.scope.enter(); err != nil {
			w.WriteHeader(409)
			return
		}
	case ack.Event == "main_request_end" && c.ready && c.scope != nil:
		if err := c.scope.leave(); err != nil {
			w.WriteHeader(409)
			return
		}
	case ack.Event == "fallback" && c.ready && c.relay != nil:
		if !c.relay.allowFallback() {
			w.WriteHeader(409)
			return
		}
	case ack.Event == "ready" && ack.Version == "ccgateway-v2":
		c.ready = true
	case ack.Event == "system" && c.ready && ack.Systems == c.systems:
		c.attached = true
	case ack.Event == "helper_reminder" && c.ready && c.scope != nil:
		if !c.acknowledgeHelperReminder(ack.Detail) {
			w.WriteHeader(400)
			return
		}
	case ack.Event == "continuation_reminder" && c.ready && c.reminderMarker != "":
		if !c.acknowledgeContinuationReminder(ack.Detail) {
			w.WriteHeader(400)
			return
		}
	case ack.Event == "session_context" && c.ready:
		var detail struct {
			Text string `json:"text"`
		}
		if json.Unmarshal(ack.Detail, &detail) != nil || detail.Text == "" || len(detail.Text) > 64<<10 {
			w.WriteHeader(400)
			return
		}
		if c.sessionContexts == nil {
			c.sessionContexts = map[string]bool{}
		}
		if len(c.sessionContexts) >= 32 && !c.sessionContexts[detail.Text] {
			w.WriteHeader(400)
			return
		}
		c.sessionContexts[detail.Text] = true
	case ack.Event == "trace" && c.ready:
		c.diagnostic.trace("mod_attachment", ack.Detail)
	case ack.Event == "tool" && c.ready:
		c.diagnostic.trace("mod_tool_call", ack.Detail)
	default:
		w.WriteHeader(400)
		return
	}
	if ack.Event != "trace" && ack.Event != "tool" {
		c.diagnostic.trace("mod_"+ack.Event, Object{"systems": ack.Systems, "version": ack.Version})
	}
	_, _ = w.Write([]byte(`{"ok":true}`))
}

// serveWebSearch answers the passthrough web search events, outside the
// lock: a search runs for seconds while other hooks keep reporting.
func (c *modControl) serveWebSearch(w http.ResponseWriter, event string, detail json.RawMessage) bool {
	switch {
	case event == "web_search" && c.webSearch != nil && !c.searchOnly:
		var call struct {
			ID    string `json:"tool_use_id"`
			Input Object `json:"input"`
		}
		if json.Unmarshal(detail, &call) != nil || call.ID == "" || str(call.Input, "query") == "" {
			w.WriteHeader(400)
			return true
		}
		answer, _ := marshalPlain(c.webSearch(call.ID, call.Input))
		_, _ = w.Write(answer)
	case event == "search_result" && c.searchOnly:
		var answer Object
		if json.Unmarshal(detail, &answer) != nil || answer == nil {
			w.WriteHeader(400)
			return true
		}
		c.mu.Lock()
		if c.searchResult == nil {
			c.searchResult = answer
		}
		c.mu.Unlock()
		_, _ = w.Write([]byte(`{"ok":true}`))
	default:
		return false
	}
	return true
}

// searchAnswer is what the search Mod reported, if anything.
func (c *modControl) searchAnswer() Object {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.searchResult
}

func (c *modControl) verify() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.ready {
		return fmt.Errorf("ccgateway Mod did not acknowledge loading")
	}
	if c.systems > 0 && !c.attached {
		return fmt.Errorf("ccgateway Mod did not attach the system messages")
	}
	return nil
}

func (c *modControl) Close() {
	modControls.Delete(c.path)
	if c.server != nil {
		_ = c.server.Close()
	}
}
