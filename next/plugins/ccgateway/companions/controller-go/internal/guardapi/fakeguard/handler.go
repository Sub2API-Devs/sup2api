package fakeguard

import (
	"archive/tar"
	"bytes"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/netip"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
)

// routeOf maps a request to its route template and account key.
func routeOf(method, p, fields string) (route, aid string) {
	parts := strings.Split(strings.TrimPrefix(p, "/"), "/")
	if len(parts) < 2 || parts[0] != "v1" {
		return "", ""
	}
	rest := parts[1:]
	switch rest[0] {
	case "health", "subnets", "inventory":
		if len(rest) == 1 {
			return method + " /v1/" + rest[0], ""
		}
	case "images":
		if len(rest) == 2 {
			return method + " /v1/images/" + rest[1], ""
		}
	case "controller":
		if len(rest) == 2 && rest[1] == "upgrade" {
			return method + " /v1/controller/upgrade", ""
		}
	case "gateway":
		switch {
		case len(rest) == 1:
			return method + " /v1/gateway", ""
		case len(rest) == 2:
			return method + " /v1/gateway/" + rest[1], ""
		case len(rest) == 3 && rest[1] == "networks" && rest[2] != "":
			return method + " /v1/gateway/networks/{aid}", rest[2]
		case len(rest) == 3 && rest[1] == "files" && rest[2] != "":
			return method + " /v1/gateway/files/{name}", ""
		}
	case "accounts":
		if len(rest) < 2 || rest[1] == "" {
			return "", ""
		}
		aid = rest[1]
		sub := rest[2:]
		switch {
		case len(sub) == 0:
			if fields == "state" {
				return method + " /v1/accounts/{aid}?fields=state", aid
			}
			return method + " /v1/accounts/{aid}", aid
		case len(sub) == 1:
			return method + " /v1/accounts/{aid}/" + sub[0], aid
		case len(sub) == 2 && sub[0] == "app" && (sub[1] == "exec" || sub[1] == "archive" || sub[1] == "top"):
			return method + " /v1/accounts/{aid}/app/" + sub[1], aid
		case len(sub) == 2 && sub[0] == "app" && sub[1] != "":
			return method + " /v1/accounts/{aid}/app/{action}", aid
		case len(sub) == 2 && sub[0] == "containers" && sub[1] != "":
			return method + " /v1/accounts/{aid}/containers/{suffix}", aid
		}
	}
	return "", ""
}

var knownRoutes = map[string]bool{
	"GET /v1/health": true, "GET /v1/subnets": true, "GET /v1/inventory": true,
	"GET /v1/images/inspect": true, "POST /v1/images/pull": true, "GET /v1/images/file": true, "POST /v1/images/load": true,
	"GET /v1/accounts/{aid}": true, "GET /v1/accounts/{aid}?fields=state": true,
	"PUT /v1/accounts/{aid}/network": true, "DELETE /v1/accounts/{aid}/network": true,
	"PUT /v1/accounts/{aid}/volume": true, "DELETE /v1/accounts/{aid}/volume": true,
	"PUT /v1/accounts/{aid}/app": true, "POST /v1/accounts/{aid}/app/{action}": true,
	"DELETE /v1/accounts/{aid}/containers/{suffix}": true, "POST /v1/accounts/{aid}/app/exec": true,
	"GET /v1/accounts/{aid}/app/archive": true, "PUT /v1/accounts/{aid}/app/archive": true,
	"GET /v1/accounts/{aid}/app/top": true, "PUT /v1/accounts/{aid}/resolv": true,
	"PUT /v1/accounts/{aid}/firewall": true, "POST /v1/accounts/{aid}/jobs": true,
	"GET /v1/gateway": true, "POST /v1/gateway/ensure": true, "POST /v1/gateway/recreate": true,
	"POST /v1/gateway/exec": true, "PUT /v1/gateway/networks/{aid}": true, "DELETE /v1/gateway/networks/{aid}": true,
	"PUT /v1/gateway/files/{name}": true, "POST /v1/controller/upgrade": true, "GET /v1/controller/upgrade": true,
}

func pathExists(route string) bool {
	_, rest, _ := strings.Cut(route, " ")
	for r := range knownRoutes {
		if _, rr, _ := strings.Cut(r, " "); rr == rest {
			return true
		}
	}
	return false
}

// writeJSON writes a JSON answer as the guard does (one value, a newline).
func writeJSON(w http.ResponseWriter, status int, v any) {
	b, err := pyjson.Marshal(v)
	if err != nil {
		status, b = 502, []byte(`{"error":"docker_error","message":"encode failed"}`)
	}
	b = append(b, '\n')
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Length", strconv.Itoa(len(b)))
	w.WriteHeader(status)
	w.Write(b)
}

// writeError writes {"error", "reason"?, "message", "names"?} (03 §3.3).
func writeError(w http.ResponseWriter, e *apiError) {
	body := pyjson.Ordered{{Key: "error", Value: e.code}}
	if e.reason != "" {
		body = append(body, pyjson.KV{Key: "reason", Value: e.reason})
	}
	body = append(body, pyjson.KV{Key: "message", Value: e.message})
	if len(e.names) > 0 {
		body = append(body, pyjson.KV{Key: "names", Value: strList(e.names)})
	}
	writeJSON(w, e.status, body)
}

func noContent(w http.ResponseWriter) { w.WriteHeader(http.StatusNoContent) }

// decodeStrict is the guard's JSON request rule (03 §3.3): media type
// application/json, at most 1 MiB, no unknown fields, exactly one value.
// allowEmpty accepts a request without a body (Content-Length 0).
func decodeStrict(r *http.Request, body []byte, out any, allowEmpty bool) *apiError {
	if allowEmpty && r.ContentLength == 0 {
		return nil
	}
	if mediaType(r) != "application/json" {
		return badRequest("content type must be application/json")
	}
	if r.ContentLength > maxJSONBody || len(body) > maxJSONBody {
		return tooLarge("request body too large")
	}
	dec := json.NewDecoder(bytes.NewReader(body))
	dec.DisallowUnknownFields()
	if err := dec.Decode(out); err != nil {
		return badRequest("invalid JSON body")
	}
	if dec.More() {
		return badRequest("trailing data after JSON body")
	}
	if _, err := dec.Token(); err != io.EOF {
		return badRequest("trailing data after JSON body")
	}
	return nil
}

// authorized is 03 §3.2 items 1 and 2: the source address (when
// SetControllerAddr is set) and exactly one "Bearer <64 lowercase hex>"
// header equal to the token.
func (g *Guard) authorized(r *http.Request) bool {
	g.mu.Lock()
	token, addr := g.token, g.controllerAddr
	g.mu.Unlock()
	if addr != "" {
		host, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			return false
		}
		ip, err := netip.ParseAddr(host)
		if err != nil || ip.Unmap().String() != addr {
			return false
		}
	}
	vals := r.Header.Values("Authorization")
	if len(vals) != 1 {
		return false
	}
	tok, ok := strings.CutPrefix(vals[0], "Bearer ")
	if !ok || !validToken(tok) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(tok), []byte(token)) == 1
}

// serve checks in the guard's order: authentication, route (404, 405),
// controller identity (403) and start-up (503) for every route but health,
// account key, query parameters; then faults and the handler.
func (g *Guard) serve(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	route, aid := routeOf(r.Method, r.URL.Path, q.Get("fields"))
	var body []byte
	if r.Body != nil {
		body, _ = io.ReadAll(io.LimitReader(r.Body, maxLoad+1))
	}
	call := Call{Method: r.Method, Route: route, Path: r.URL.Path, Query: r.URL.RawQuery, AID: aid}
	if mediaType(r) == "application/json" {
		call.Body = append([]byte(nil), body...)
	}
	g.record(call)
	if !g.authorized(r) {
		writeError(w, &apiError{status: 401, code: "unauthorized", message: "unauthorized"})
		return
	}
	if !knownRoutes[route] {
		if route != "" && pathExists(route) {
			writeError(w, &apiError{status: 405, code: "method_not_allowed", message: "method not allowed"})
			return
		}
		writeError(w, &apiError{status: 404, code: "not_found", message: "no such endpoint"})
		return
	}
	if route != "GET /v1/health" {
		g.mu.Lock()
		unguarded, starting := g.unguarded, g.starting
		g.mu.Unlock()
		if unguarded {
			writeError(w, forbidden("controller_unguarded", "the control network endpoint is not the compose controller"))
			return
		}
		if starting {
			writeError(w, &apiError{status: 503, code: "unavailable", reason: "starting", message: "guard is starting"})
			return
		}
	}
	if aid != "" {
		if e := checkAID(aid); e != nil {
			writeError(w, e)
			return
		}
	}
	if e := checkQuery(route, r.URL.RawQuery); e != nil {
		writeError(w, e)
		return
	}
	if f := g.fault(route, aid); f != nil {
		writeError(w, &apiError{status: f.Status, code: f.Code, reason: f.Reason, message: f.Message, names: f.Names})
		return
	}
	if e := g.dispatch(w, r, route, aid, body); e != nil {
		writeError(w, e)
	}
}

func lastSegment(p string) string { return p[strings.LastIndexByte(p, '/')+1:] }

func (g *Guard) dispatch(w http.ResponseWriter, r *http.Request, route, aid string, body []byte) *apiError {
	q := r.URL.Query()
	switch route {
	case "GET /v1/health":
		g.mu.Lock()
		h := g.health
		if g.unguarded {
			h.Controller = "unguarded"
		}
		h.Starting = h.Starting || g.starting
		g.mu.Unlock()
		writeJSON(w, 200, h)
	case "GET /v1/subnets":
		writeJSON(w, 200, g.subnets())
	case "GET /v1/inventory":
		writeJSON(w, 200, g.inventory())
	case "GET /v1/images/inspect":
		return g.imageInspect(w, q.Get("ref"))
	case "POST /v1/images/pull":
		return g.imagePull(w, r, body)
	case "GET /v1/images/file":
		return g.imageFile(w, q.Get("ref"), q.Get("path"), q.Get("limit"))
	case "POST /v1/images/load":
		return g.imageLoad(w, r, body)
	case "GET /v1/accounts/{aid}":
		if q.Get("fields") != "" {
			return badRequest("fields must be state")
		}
		return g.account(w, aid)
	case "GET /v1/accounts/{aid}?fields=state":
		return g.accountState(w, aid)
	case "PUT /v1/accounts/{aid}/network":
		return g.createNetwork(w, r, aid, body)
	case "DELETE /v1/accounts/{aid}/network":
		return g.deleteNetwork(w, aid, q.Get("role"))
	case "PUT /v1/accounts/{aid}/volume":
		return g.ensureVolume(w, r, aid, body)
	case "DELETE /v1/accounts/{aid}/volume":
		return g.deleteVolume(w, aid)
	case "PUT /v1/accounts/{aid}/app":
		return g.createApp(w, r, aid, body)
	case "POST /v1/accounts/{aid}/app/{action}":
		return g.appAction(w, r, aid, lastSegment(r.URL.Path), body)
	case "DELETE /v1/accounts/{aid}/containers/{suffix}":
		return g.deleteContainer(w, aid, lastSegment(r.URL.Path))
	case "POST /v1/accounts/{aid}/app/exec":
		return g.appExec(w, r, aid, body)
	case "GET /v1/accounts/{aid}/app/archive":
		return g.archiveGet(w, aid, q.Get("path"))
	case "PUT /v1/accounts/{aid}/app/archive":
		return g.archivePut(w, r, aid, q.Get("path"), body)
	case "GET /v1/accounts/{aid}/app/top":
		return g.appTop(w, aid)
	case "PUT /v1/accounts/{aid}/resolv":
		return g.writeResolv(w, r, aid, body)
	case "PUT /v1/accounts/{aid}/firewall":
		return g.installFirewall(w, r, aid, body)
	case "POST /v1/accounts/{aid}/jobs":
		return g.runJob(w, r, aid, body)
	case "GET /v1/gateway":
		return g.gatewayGet(w)
	case "POST /v1/gateway/ensure":
		return g.gatewayEnsure(w, r, body)
	case "POST /v1/gateway/recreate":
		return g.gatewayRecreate(w, r, body)
	case "POST /v1/gateway/exec":
		return g.gatewayExec(w, r, body)
	case "PUT /v1/gateway/networks/{aid}":
		return g.gatewayConnect(w, r, aid, body)
	case "DELETE /v1/gateway/networks/{aid}":
		return g.gatewayDisconnect(w, aid)
	case "PUT /v1/gateway/files/{name}":
		return g.gatewayFile(w, r, lastSegment(r.URL.Path), body)
	case "POST /v1/controller/upgrade":
		return g.controllerUpgrade(w, r, body)
	case "GET /v1/controller/upgrade":
		g.mu.Lock()
		s := g.upgrade
		g.mu.Unlock()
		writeJSON(w, 200, s)
	}
	return nil
}

// subnets: every network with its IPv4 subnets; labels carry the account
// label only for this prefix's account networks <p>-<aid>-net.
func (g *Guard) subnets() guardapi.Subnets {
	g.mu.Lock()
	defer g.mu.Unlock()
	out := guardapi.Subnets{HostRoutes: []string{}, Networks: []guardapi.NetSubnets{}}
	for _, r := range g.hostRoutes {
		out.HostRoutes = append(out.HostRoutes, r.String())
	}
	for _, name := range sortedKeys(g.networks) {
		n := g.networks[name]
		labels := map[string]string{}
		if acct := n.labels[names.LabelAccount]; names.Key.MatchString(acct) && name == names.Name(g.prefix, acct, "net") {
			labels[names.LabelAccount] = acct
		}
		out.Networks = append(out.Networks, guardapi.NetSubnets{Name: name, Labels: labels, Subnets: []string{n.subnet.String()}})
	}
	return out
}

func (g *Guard) inventory() pyjson.Ordered {
	g.mu.Lock()
	defer g.mu.Unlock()
	containers, nets, vols := []any{}, []any{}, []any{}
	for _, name := range sortedKeys(g.containers) {
		c := g.containers[name]
		acct, ok := c.labels[names.LabelAccount]
		if ok && names.Key.MatchString(acct) && names.ContainerOf(g.prefix, acct, name) {
			containers = append(containers, g.rawContainer(c))
		}
	}
	for _, name := range sortedKeys(g.networks) {
		n := g.networks[name]
		acct := n.labels[names.LabelAccount]
		if names.Key.MatchString(acct) && (name == names.Name(g.prefix, acct, "net") || name == names.Name(g.prefix, acct, "uplink")) {
			nets = append(nets, g.rawNetwork(n))
		}
	}
	for _, name := range sortedKeys(g.volumes) {
		v := g.volumes[name]
		acct := v.labels[names.LabelAccount]
		if names.Key.MatchString(acct) && name == names.Name(g.prefix, acct, "data") {
			vols = append(vols, g.rawVolume(v))
		}
	}
	return pyjson.Ordered{{Key: "containers", Value: containers}, {Key: "networks", Value: nets}, {Key: "volumes", Value: vols}}
}

func (g *Guard) imageView(img *image) pyjson.Ordered {
	return pyjson.Ordered{{Key: "Id", Value: img.id}, {Key: "RepoTags", Value: anyStrings(img.repoTags)},
		{Key: "Config", Value: pyjson.Ordered{{Key: "Env", Value: anyStrings(img.env)}, {Key: "Labels", Value: strDict(img.labels)}}}}
}

func anyStrings(list []string) []any {
	out := make([]any, len(list))
	for i, s := range list {
		out[i] = s
	}
	return out
}

func (g *Guard) imageInspect(w http.ResponseWriter, ref string) *apiError {
	if e := checkImageRef(ref); e != nil {
		return e
	}
	g.mu.Lock()
	img := g.images[ref]
	var view pyjson.Ordered
	if img != nil {
		view = g.imageView(img)
	}
	g.mu.Unlock()
	if img == nil {
		return notFound("image")
	}
	writeJSON(w, 200, view)
	return nil
}

func (g *Guard) imagePull(w http.ResponseWriter, r *http.Request, body []byte) *apiError {
	var req struct {
		Ref string `json:"ref"`
	}
	if e := decodeStrict(r, body, &req, false); e != nil {
		return e
	}
	if e := checkImageRef(req.Ref); e != nil || names.ImageID.MatchString(req.Ref) {
		return badRequest("invalid image reference")
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if !strings.Contains(req.Ref, "@") && !repoAllowed(req.Ref, g.pullRepos) {
		return forbidden("image_not_allowed", "pulling this repository by tag is not allowed")
	}
	img := g.pullable[req.Ref]
	if img == nil {
		return dockerError("pull_failed", "image pull failed")
	}
	g.images[req.Ref] = img
	g.images[img.id] = img
	noContent(w)
	return nil
}

func (g *Guard) imageFile(w http.ResponseWriter, ref, p, limitText string) *apiError {
	if e := checkImageRef(ref); e != nil {
		return e
	}
	if e := checkAbsPath(p); e != nil || p == "/" {
		return badRequest("path must be absolute, clean, at most 4096 bytes")
	}
	limit, err := strconv.ParseInt(limitText, 10, 64)
	if err != nil || limit < 1 || limit > maxImageFile {
		return badRequest("limit must be 1 to 512 MiB")
	}
	g.mu.Lock()
	img := g.images[ref]
	var data []byte
	var isDir, found bool
	if img != nil {
		data, found = img.files[p]
		isDir = img.dirs[p]
		for f := range img.files {
			if strings.HasPrefix(f, p+"/") {
				isDir = true
			}
		}
	}
	g.mu.Unlock()
	switch {
	case img == nil:
		return notFound("image")
	case isDir && !found:
		return &apiError{status: 422, code: "unprocessable", reason: "not_regular_file", message: "path is not a regular file"}
	case !found:
		return notFound("path")
	case int64(len(data)) > limit:
		return &apiError{status: 422, code: "unprocessable", reason: "too_large", message: "file exceeds limit"}
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	w.WriteHeader(200)
	w.Write(data)
	return nil
}

// imageLoad: Content-Length and media type, free space, the archive checks
// (scanArchive), the load whitelist, then the load itself.
func (g *Guard) imageLoad(w http.ResponseWriter, r *http.Request, body []byte) *apiError {
	if e := rawBody(r, maxLoad, "application/x-tar", "application/gzip"); e != nil {
		return e
	}
	g.mu.Lock()
	full, repos := g.diskFull, g.loadRepos
	g.mu.Unlock()
	if full {
		return &apiError{status: 503, code: "busy", message: "guard is busy"}
	}
	if e := exactBody(r, body); e != nil {
		return e
	}
	arch, data, e := scanArchive(body)
	if e != nil {
		return e
	}
	if e := arch.check(repos); e != nil {
		return e
	}
	g.hooksMu.Lock()
	hook := g.loadHook
	g.hooksMu.Unlock()
	var loaded []guardapi.LoadedImage
	if hook != nil {
		var err error
		if loaded, err = hook(data); err != nil {
			if ae, ok := err.(*apiError); ok {
				return ae
			}
			return dockerError("load_failed", "image load failed")
		}
		for _, l := range loaded {
			for _, t := range l.Tags {
				if !arch.allowed(t) {
					return dockerError("load_failed", "loaded names differ from the archive")
				}
			}
		}
	} else {
		for _, m := range arch.manifest {
			if hex := sha256HexRe.FindString(m.Config); hex != "" {
				loaded = append(loaded, guardapi.LoadedImage{ID: "sha256:" + hex, Tags: arch.names(hex)})
			}
		}
	}
	g.mu.Lock()
	images := []any{}
	for _, l := range loaded {
		if l.Tags == nil {
			l.Tags = []string{}
		}
		img := g.images[l.ID]
		if img == nil {
			img = &image{id: l.ID, labels: map[string]string{}, files: map[string][]byte{}, dirs: map[string]bool{}}
			g.images[l.ID] = img
		}
		for _, t := range l.Tags {
			if !contains(img.repoTags, t) {
				img.repoTags = append(img.repoTags, t)
			}
			g.images[t] = img
		}
		images = append(images, l)
	}
	g.mu.Unlock()
	writeJSON(w, 200, pyjson.Ordered{{Key: "images", Value: images}})
	return nil
}

// account answers GET /v1/accounts/{aid}.
func (g *Guard) account(w http.ResponseWriter, aid string) *apiError {
	g.mu.Lock()
	defer g.mu.Unlock()
	appName := names.Name(g.prefix, aid, "app")
	var app any
	if c := g.containers[appName]; c != nil {
		if c.labels[names.LabelAccount] != aid {
			return conflict("ownership_mismatch", "resource belongs to another owner", appName)
		}
		app = g.rawContainer(c)
	}
	others := []any{}
	for _, name := range sortedKeys(g.containers) {
		c := g.containers[name]
		if name == appName || c.labels[names.LabelAccount] != aid || !names.ContainerOf(g.prefix, aid, name) {
			continue
		}
		others = append(others, g.rawContainer(c))
	}
	owned := func(n string, labels map[string]string) *apiError {
		if labels[names.LabelAccount] != aid {
			return conflict("ownership_mismatch", "resource belongs to another owner", n)
		}
		return nil
	}
	var netRaw, upRaw, volRaw any
	netName := names.Name(g.prefix, aid, "net")
	if n := g.networks[netName]; n != nil {
		if e := owned(netName, n.labels); e != nil {
			return e
		}
		netRaw = g.rawNetwork(n)
	}
	upName := names.Name(g.prefix, aid, "uplink")
	if n := g.networks[upName]; n != nil {
		if e := owned(upName, n.labels); e != nil {
			return e
		}
		upRaw = g.rawNetwork(n)
	}
	volName := names.Name(g.prefix, aid, "data")
	if v := g.volumes[volName]; v != nil {
		if e := owned(volName, v.labels); e != nil {
			return e
		}
		volRaw = g.rawVolume(v)
	}
	users, foreign := []any{}, []any{}
	gwName := names.SharedGateway(g.prefix)
	attached := false
	for _, name := range sortedKeys(g.containers) {
		c := g.containers[name]
		ref := pyjson.Ordered{{Key: "Id", Value: c.id}, {Key: "Name", Value: c.name}, {Key: "Status", Value: c.status}}
		if g.volumes[volName] != nil && c.usesVolume(volName) && !g.isEndedHelper(c) {
			users = append(users, ref)
		}
		if _, on := c.onNetwork(netName); on {
			switch {
			case name == gwName:
				attached = true
			case c.labels[names.LabelAccount] == aid && names.ContainerOf(g.prefix, aid, name):
			case g.isEndedHelper(c):
			default:
				foreign = append(foreign, ref)
			}
		}
	}
	writeJSON(w, 200, pyjson.Ordered{
		{Key: "app", Value: app}, {Key: "others", Value: others}, {Key: "network", Value: netRaw},
		{Key: "uplink", Value: upRaw}, {Key: "volume", Value: volRaw}, {Key: "volume_users", Value: users},
		{Key: "network_foreign", Value: foreign}, {Key: "gateway_attached", Value: attached},
	})
	return nil
}

// gatewayLocked is the shared gateway (nil when absent); 409
// ownership_mismatch when its shared label is not the prefix.
func (g *Guard) gatewayLocked() (*container, *apiError) {
	name := names.SharedGateway(g.prefix)
	c := g.containers[name]
	if c != nil && c.labels[names.LabelSharedOwner] != g.prefix {
		return nil, conflict("ownership_mismatch", "gateway is owned by another instance", name)
	}
	return c, nil
}

func (g *Guard) accountState(w http.ResponseWriter, aid string) *apiError {
	g.mu.Lock()
	defer g.mu.Unlock()
	netName := names.Name(g.prefix, aid, "net")
	out := guardapi.AccountState{}
	appName := names.Name(g.prefix, aid, "app")
	if c := g.containers[appName]; c != nil {
		if c.labels[names.LabelAccount] != aid {
			return conflict("ownership_mismatch", "resource belongs to another owner", appName)
		}
		ip, _ := c.onNetwork(netName)
		out.App = &guardapi.StateApp{ID: c.id, Image: c.image, Status: c.status, StartedAt: c.startedAt, IP: ip}
	}
	c, e := g.gatewayLocked()
	if e != nil {
		return e
	}
	if c != nil {
		ip, _ := c.onNetwork(netName)
		out.Gateway = &guardapi.StateGateway{ID: c.id, Status: c.status, StartedAt: c.startedAt, IP: ip}
	}
	writeJSON(w, 200, out)
	return nil
}

func (g *Guard) occupiedLocked(except string) []netip.Prefix {
	out := append([]netip.Prefix{g.controlSubnet}, g.hostRoutes...)
	for name, n := range g.networks {
		if name != except {
			out = append(out, n.subnet)
		}
	}
	return out
}

// createNetworkLocked is the guard's CreateNetwork: exists (409
// ownership_mismatch or exists), then overlap with the control network,
// Docker networks and host routes (409 subnet_overlap).
func (g *Guard) createNetworkLocked(name, owner string, p netip.Prefix, gateway, label string, internal bool) (*network, *apiError) {
	if n := g.networks[name]; n != nil {
		if n.labels[names.LabelAccount] != owner {
			return nil, conflict("ownership_mismatch", "resource belongs to another owner", name)
		}
		return nil, conflict("exists", "network already exists", name)
	}
	for _, o := range g.occupiedLocked("") {
		if o.Overlaps(p) {
			return nil, conflict("subnet_overlap", "subnet overlaps an existing network or route")
		}
	}
	n := &network{id: g.nextID(), name: name, created: g.nextTime(), internal: internal, subnet: p, gateway: gateway,
		labels: map[string]string{names.LabelAccount: owner, names.LabelNetwork: label}}
	g.networks[name] = n
	return n, nil
}

func (g *Guard) createNetwork(w http.ResponseWriter, r *http.Request, aid string, body []byte) *apiError {
	if aid == names.UplinkKey {
		return forbidden("policy", "the uplink network is created by gateway ensure")
	}
	var req guardapi.NetworkRequest
	if e := decodeStrict(r, body, &req, false); e != nil {
		return e
	}
	p, e := checkSubnet(req.Subnet, req.Gateway)
	if e != nil {
		return e
	}
	if e := checkPolicyLabel(req.PolicyLabel); e != nil {
		return e
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	n, e := g.createNetworkLocked(names.Name(g.prefix, aid, "net"), aid, p, req.Gateway, req.PolicyLabel, true)
	if e != nil {
		return e
	}
	writeJSON(w, 201, g.rawNetwork(n))
	return nil
}

func (g *Guard) removeEndedHelpersLocked(match func(*container) bool) {
	for name, c := range g.containers {
		if g.isEndedHelper(c) && match(c) {
			delete(g.containers, name)
		}
	}
}

// deleteNetwork: ended Python helpers are removed; any other container but
// the gateway is a user (409 resource_in_use); the gateway is disconnected
// first.
func (g *Guard) deleteNetwork(w http.ResponseWriter, aid, role string) *apiError {
	if role != "net" && role != "uplink" {
		return badRequest("role must be net or uplink")
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	name := names.Name(g.prefix, aid, role)
	n := g.networks[name]
	if n == nil {
		return notFound("network")
	}
	if n.labels[names.LabelAccount] != aid {
		return conflict("ownership_mismatch", "resource belongs to another owner", name)
	}
	g.removeEndedHelpersLocked(func(c *container) bool { _, on := c.onNetwork(name); return on })
	gwName := names.SharedGateway(g.prefix)
	var users []string
	for _, cn := range sortedKeys(g.containers) {
		if _, on := g.containers[cn].onNetwork(name); on && cn != gwName {
			users = append(users, cn)
		}
	}
	if len(users) > 0 {
		return conflict("resource_in_use", "network has other endpoints", users...)
	}
	if gw := g.containers[gwName]; gw != nil {
		gw.detach(name)
	}
	delete(g.networks, name)
	noContent(w)
	return nil
}

func (c *container) detach(network string) {
	var keep []endpoint
	for _, e := range c.endpoints {
		if e.network != network {
			keep = append(keep, e)
		}
	}
	c.endpoints = keep
}

func (g *Guard) ensureVolume(w http.ResponseWriter, r *http.Request, aid string, body []byte) *apiError {
	var req guardapi.VolumeRequest
	if e := decodeStrict(r, body, &req, false); e != nil {
		return e
	}
	if req.SizeBytes < minVolume || req.SizeBytes > maxVolume {
		return badRequest("size_bytes must be 1 GiB to 1 TiB")
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	name := names.Name(g.prefix, aid, "data")
	if v := g.volumes[name]; v != nil {
		if v.labels[names.LabelAccount] != aid {
			return conflict("ownership_mismatch", "resource belongs to another owner", name)
		}
		writeJSON(w, 200, pyjson.Ordered{{Key: "volume", Value: g.rawVolume(v)}, {Key: "created", Value: false},
			{Key: "quota_supported", Value: nil}})
		return nil
	}
	size := strconv.FormatInt(req.SizeBytes, 10)
	v := &volume{name: name, driver: "local", created: g.nextTime(), options: map[string]string{"size": size},
		labels: map[string]string{names.LabelAccount: aid, names.LabelDiskQuota: size}}
	supported := true
	if !g.quota {
		if !req.AllowUnbounded {
			return &apiError{status: 503, code: "disk_quota_unavailable", message: "storage does not support volume quotas"}
		}
		supported = false
		v.options = map[string]string{}
		v.labels = map[string]string{names.LabelAccount: aid}
	}
	g.volumes[name] = v
	writeJSON(w, 201, pyjson.Ordered{{Key: "volume", Value: g.rawVolume(v)}, {Key: "created", Value: true},
		{Key: "quota_supported", Value: supported}})
	return nil
}

func (g *Guard) deleteVolume(w http.ResponseWriter, aid string) *apiError {
	g.mu.Lock()
	defer g.mu.Unlock()
	name := names.Name(g.prefix, aid, "data")
	v := g.volumes[name]
	if v == nil {
		return notFound("volume")
	}
	if v.labels[names.LabelAccount] != aid {
		return conflict("ownership_mismatch", "resource belongs to another owner", name)
	}
	g.removeEndedHelpersLocked(func(c *container) bool { return c.usesVolume(name) })
	var users []string
	for _, cn := range sortedKeys(g.containers) {
		if g.containers[cn].usesVolume(name) {
			users = append(users, cn)
		}
	}
	if len(users) > 0 {
		return conflict("resource_in_use", "volume is in use", users...)
	}
	delete(g.volumes, name)
	noContent(w)
	return nil
}

// accountNetLocked is <p>-<aid>-net: 409 ownership_mismatch, 404 network.
func (g *Guard) accountNetLocked(aid string) (*network, *apiError) {
	name := names.Name(g.prefix, aid, "net")
	n := g.networks[name]
	if n == nil {
		return nil, notFound("network")
	}
	if n.labels[names.LabelAccount] != aid {
		return nil, conflict("ownership_mismatch", "resource belongs to another owner", name)
	}
	return n, nil
}

// resolvLocked is the guard's VerifyResolv: missing or rejected is 403.
func (g *Guard) resolvLocked(aid string) *apiError {
	_, bad := g.rejected[aid+"/resolv.conf"]
	if _, ok := g.resolv[aid]; bad || !ok {
		return forbidden("mount_source_rejected", "mount source rejected")
	}
	return nil
}

func (g *Guard) addressInUseLocked(network string, ip netip.Addr, except string) bool {
	for name, c := range g.containers {
		if addr, on := c.onNetwork(network); on && addr == ip.String() && name != except {
			return true
		}
	}
	return false
}

// createApp follows the guard's order: request checks, network, address,
// volume, resolv.conf, image, existing container.
func (g *Guard) createApp(w http.ResponseWriter, r *http.Request, aid string, body []byte) *apiError {
	var req guardapi.AppRequest
	if e := decodeStrict(r, body, &req, false); e != nil {
		return e
	}
	ip, e := parseIPv4(req.IPv4, "ipv4")
	if e != nil {
		return e
	}
	if e := checkImageRef(req.Image); e != nil {
		return e
	}
	if e := checkEnv(req.Env); e != nil {
		return e
	}
	if e := checkAuthLabel(req.AuthLabel); e != nil {
		return e
	}
	if !names.ImageID.MatchString(req.ImageLabel) {
		return badRequest("invalid image_label")
	}
	if req.MemoryBytes != 0 && (req.MemoryBytes < minAppMemory || req.MemoryBytes > maxAppMemory) {
		return badRequest("memory_bytes out of range")
	}
	if req.NanoCPUs != 0 && (req.NanoCPUs < minNanoCPUs || req.NanoCPUs > maxNanoCPUs) {
		return badRequest("nano_cpus out of range")
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	n, e := g.accountNetLocked(aid)
	if e != nil {
		return e
	}
	if e := inSubnet(ip, n.subnet, "ipv4"); e != nil {
		return e
	}
	if g.addressInUseLocked(n.name, ip, "") {
		return badRequest("ipv4 already in use on the account network")
	}
	volName := names.Name(g.prefix, aid, "data")
	if v := g.volumes[volName]; v == nil {
		return notFound("volume")
	} else if v.labels[names.LabelAccount] != aid {
		return conflict("ownership_mismatch", "resource belongs to another owner", volName)
	}
	if e := g.resolvLocked(aid); e != nil {
		return e
	}
	img := g.images[req.Image]
	if img == nil {
		return notFound("image")
	}
	name := names.Name(g.prefix, aid, "app")
	if c := g.containers[name]; c != nil {
		if c.labels[names.LabelAccount] != aid {
			return conflict("ownership_mismatch", "resource belongs to another owner", name)
		}
		return conflict("exists", "account container already exists", name)
	}
	env := make([]string, 0, len(req.Env))
	for _, k := range sortedKeys(req.Env) {
		env = append(env, k+"="+req.Env[k])
	}
	c := &container{id: g.nextID(), name: name, image: img.id, configImage: req.Image, user: "1000:1000",
		created: g.nextTime(), startedAt: "0001-01-01T00:00:00Z", status: "created",
		path: "/usr/local/bin/docker-entrypoint.sh", args: []string{"worker"},
		labels: map[string]string{names.LabelAccount: aid, names.LabelAuth: req.AuthLabel, names.LabelImage: req.ImageLabel},
		env:    env, networkMode: n.name, endpoints: []endpoint{{network: n.name, ip: ip.String()}},
		mounts: []mount{
			{typ: "volume", name: volName, source: "/var/lib/docker/volumes/" + volName + "/_data", destination: "/work", driver: "local", mode: "rw", rw: true},
			{typ: "bind", source: RuntimeHostRoot + "/" + aid + "/resolv.conf", destination: "/etc/resolv.conf", mode: "ro", propagation: "rprivate"},
		},
		files: map[string]*file{}, dirs: defaultDirs()}
	for p, data := range img.files {
		c.files[p] = &file{data: append([]byte(nil), data...), mode: 0o755}
		c.dirs[parentDir(p)] = true
	}
	g.containers[name] = c
	writeJSON(w, 201, g.rawContainer(c))
	return nil
}

// appMountsOK: exactly the resolv.conf bind (read-only) and the account
// volume at /work (03 §3.5.7).
func (g *Guard) appMountsOK(aid string, c *container) bool {
	if len(c.mounts) != 2 {
		return false
	}
	var bind, vol bool
	for _, m := range c.mounts {
		switch {
		case m.typ == "bind" && m.source == RuntimeHostRoot+"/"+aid+"/resolv.conf" && m.destination == "/etc/resolv.conf" && !m.rw:
			bind = true
		case m.typ == "volume" && m.name == names.Name(g.prefix, aid, "data") && m.destination == "/work":
			vol = true
		}
	}
	return bind && vol
}

func (g *Guard) appAction(w http.ResponseWriter, r *http.Request, aid, action string, body []byte) *apiError {
	if action != "start" && action != "stop" && action != "restart" {
		return &apiError{status: 404, code: "not_found", message: "no such endpoint"}
	}
	var req struct {
		Timeout *int64 `json:"timeout,omitempty"`
	}
	if e := decodeStrict(r, body, &req, true); e != nil {
		return e
	}
	if req.Timeout != nil && (*req.Timeout < 0 || *req.Timeout > 120) {
		return badRequest("timeout must be 0 to 120")
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	c, e := g.appContainerLocked(aid)
	if e != nil {
		return e
	}
	if action != "stop" {
		if !g.appMountsOK(aid, c) {
			return forbidden("mount_source_rejected", "unexpected container mounts")
		}
		if e := g.resolvLocked(aid); e != nil {
			return e
		}
	}
	switch action {
	case "start":
		if c.status != "running" {
			c.status = "running"
			c.startedAt = g.nextTime()
		}
	case "stop":
		c.status = "exited"
	case "restart":
		c.status = "running"
		c.startedAt = g.nextTime()
	}
	noContent(w)
	return nil
}

func (g *Guard) deleteContainer(w http.ResponseWriter, aid, suffix string) *apiError {
	if !names.AccountContainerRole.MatchString(suffix) {
		return badRequest("invalid container suffix")
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	name := names.Name(g.prefix, aid, suffix)
	c := g.containers[name]
	if c == nil {
		return notFound("container")
	}
	if c.labels[names.LabelAccount] != aid {
		return conflict("ownership_mismatch", "resource belongs to another owner", name)
	}
	delete(g.containers, name)
	noContent(w)
	return nil
}

func (g *Guard) appContainerLocked(aid string) (*container, *apiError) {
	name := names.Name(g.prefix, aid, "app")
	c := g.containers[name]
	if c == nil {
		return nil, notFound("container")
	}
	if c.labels[names.LabelAccount] != aid {
		return nil, conflict("ownership_mismatch", "resource belongs to another owner", name)
	}
	return c, nil
}

func (g *Guard) appExec(w http.ResponseWriter, r *http.Request, aid string, body []byte) *apiError {
	var req struct {
		Argv []string `json:"argv"`
		User string   `json:"user"`
	}
	if e := decodeStrict(r, body, &req, false); e != nil {
		return e
	}
	if e := checkArgv(req.Argv, 1, maxArgv); e != nil {
		return e
	}
	if req.User != "" && req.User != "0" && req.User != "1000" {
		return badRequest(`user must be "", "0" or "1000"`)
	}
	g.mu.Lock()
	c, e := g.appContainerLocked(aid)
	if e == nil && c.status != "running" {
		e = conflict("not_running", "account container is not running")
	}
	g.mu.Unlock()
	if e != nil {
		return e
	}
	return writeExec(w, g.runExecTarget("app:"+aid, aid, req.Argv, req.User))
}

type execOutcome struct {
	code int
	out  []byte
}

func (g *Guard) runExecTarget(target, aid string, argv []string, user string) execOutcome {
	code, out := g.runExec(target, aid, argv, user)
	return execOutcome{code, out}
}

// writeExec answers an exec with the guard's limits: the time limit (504
// exec_timeout), 16 MiB of output (502 output_too_large).
func writeExec(w http.ResponseWriter, o execOutcome) *apiError {
	switch {
	case o.code == ExitTimeout:
		return &apiError{status: 504, code: "timeout", reason: "exec_timeout", message: "exec exceeded the time limit"}
	case o.code < 0:
		return dockerError("", "docker request failed")
	case len(o.out) > maxExecOutput:
		return dockerError("output_too_large", "exec output exceeds 16 MiB")
	}
	writeJSON(w, 200, pyjson.Ordered{{Key: "exit_code", Value: int64(o.code)},
		{Key: "output", Value: base64.StdEncoding.EncodeToString(o.out)}})
	return nil
}

// pathStat is Docker's X-Docker-Container-Path-Stat: base64 of
// {"name","size","mode","mtime","linkTarget"} (mode is a Go os.FileMode).
func pathStat(name string, size int64, mode uint32) string {
	b, _ := json.Marshal(struct {
		Name       string `json:"name"`
		Size       int64  `json:"size"`
		Mode       uint32 `json:"mode"`
		Mtime      string `json:"mtime"`
		LinkTarget string `json:"linkTarget"`
	}{name, size, mode, time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC).Format(time.RFC3339Nano), ""})
	return base64.StdEncoding.EncodeToString(b)
}

func (g *Guard) archiveGet(w http.ResponseWriter, aid, p string) *apiError {
	if e := checkAbsPath(p); e != nil {
		return e
	}
	g.mu.Lock()
	c, e := g.appContainerLocked(aid)
	var buf bytes.Buffer
	stat := ""
	if e == nil {
		stat, e = c.tarOf(p, &buf)
	}
	g.mu.Unlock()
	if e != nil {
		return e
	}
	w.Header().Set("Content-Type", "application/x-tar")
	w.Header().Set("X-Docker-Container-Path-Stat", stat)
	w.WriteHeader(200)
	w.Write(buf.Bytes())
	return nil
}

// tarOf is Docker's archive of p and its path stat.
func (c *container) tarOf(p string, buf *bytes.Buffer) (string, *apiError) {
	tw := tar.NewWriter(buf)
	base := p[strings.LastIndexByte(p, '/')+1:]
	if p == "/" {
		base = "/"
	}
	if f, ok := c.files[p]; ok {
		tw.WriteHeader(&tar.Header{Name: base, Mode: f.mode, Size: int64(len(f.data)), Uid: f.uid, Gid: f.gid, Typeflag: tar.TypeReg})
		tw.Write(f.data)
		tw.Close()
		return pathStat(base, int64(len(f.data)), uint32(f.mode)), nil
	}
	if c.dirs[p] {
		tw.WriteHeader(&tar.Header{Name: strings.TrimSuffix(base, "/") + "/", Mode: 0o755, Typeflag: tar.TypeDir})
		for _, fp := range sortedKeys(c.files) {
			if strings.HasPrefix(fp, strings.TrimSuffix(p, "/")+"/") {
				f := c.files[fp]
				tw.WriteHeader(&tar.Header{Name: strings.TrimSuffix(base, "/") + fp[len(strings.TrimSuffix(p, "/")):], Mode: f.mode,
					Size: int64(len(f.data)), Typeflag: tar.TypeReg})
				tw.Write(f.data)
			}
		}
		tw.Close()
		return pathStat(base, 4096, 1<<31|0o755), nil
	}
	return "", notFound("path")
}

func (g *Guard) archivePut(w http.ResponseWriter, r *http.Request, aid, p string, body []byte) *apiError {
	if e := checkAbsPath(p); e != nil {
		return e
	}
	if e := rawBody(r, maxArchivePut, "application/x-tar"); e != nil {
		return e
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	c, e := g.appContainerLocked(aid)
	if e != nil {
		return e
	}
	if e := exactBody(r, body); e != nil {
		return e
	}
	if !c.dirs[p] {
		return notFound("path")
	}
	tr := tar.NewReader(bytes.NewReader(body))
	for {
		h, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return dockerError("", "docker request failed")
		}
		target := strings.TrimSuffix(p, "/") + "/" + strings.TrimPrefix(h.Name, "./")
		switch h.Typeflag {
		case tar.TypeDir:
			c.dirs[strings.TrimSuffix(target, "/")] = true
		case tar.TypeReg:
			data, _ := io.ReadAll(tr)
			c.files[target] = &file{data: data, mode: h.Mode & 0o7777, uid: h.Uid, gid: h.Gid}
		}
	}
	noContent(w)
	return nil
}

func (g *Guard) appTop(w http.ResponseWriter, aid string) *apiError {
	g.mu.Lock()
	defer g.mu.Unlock()
	c, e := g.appContainerLocked(aid)
	if e != nil {
		return e
	}
	if c.status != "running" {
		return conflict("not_running", "account container is not running")
	}
	procs := c.processes
	if procs == nil {
		procs = [][]string{{"1", "docker-init"}, {"7", "worker"}}
	}
	rows := []any{}
	for _, p := range procs {
		rows = append(rows, anyStrings(p))
	}
	writeJSON(w, 200, pyjson.Ordered{{Key: "Titles", Value: []any{"PID", "COMMAND"}}, {Key: "Processes", Value: rows}})
	return nil
}

// writeResolv: a rejected resolv.conf (a link, hard link, special file) is
// replaced by a new file and answered 409 mount_source_replaced: the
// running container still has the old inode and must be recreated.
func (g *Guard) writeResolv(w http.ResponseWriter, r *http.Request, aid string, body []byte) *apiError {
	var req struct {
		Nameserver string `json:"nameserver"`
	}
	if e := decodeStrict(r, body, &req, false); e != nil {
		return e
	}
	ip, e := parseIPv4(req.Nameserver, "nameserver")
	if e != nil {
		return e
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	n, e := g.accountNetLocked(aid)
	if e != nil {
		return e
	}
	if e := inSubnet(ip, n.subnet, "nameserver"); e != nil {
		return e
	}
	g.resolv[aid] = names.ResolvConf(ip.String())
	rel := aid + "/resolv.conf"
	if _, bad := g.rejected[rel]; bad {
		delete(g.rejected, rel)
		return conflict("mount_source_replaced", "resolv.conf was replaced; the running container must be recreated",
			names.Name(g.prefix, aid, "app"))
	}
	noContent(w)
	return nil
}

// installFirewall follows the guard's order; app.nft is written (Firewall)
// before the helper runs (OnFirewall).
func (g *Guard) installFirewall(w http.ResponseWriter, r *http.Request, aid string, body []byte) *apiError {
	var req struct {
		Rules          string `json:"rules"`
		DefaultGateway string `json:"default_gateway"`
	}
	if e := decodeStrict(r, body, &req, false); e != nil {
		return e
	}
	if len(req.Rules) > maxRules || !utf8.ValidString(req.Rules) || strings.ContainsRune(req.Rules, 0) {
		return badRequest("rules must be UTF-8 without NUL, at most 64 KiB")
	}
	gwIP, e := parseIPv4(req.DefaultGateway, "default_gateway")
	if e != nil {
		return e
	}
	g.mu.Lock()
	n, e := g.accountNetLocked(aid)
	if e == nil {
		e = inSubnet(gwIP, n.subnet, "default_gateway")
	}
	var c *container
	if e == nil {
		c, e = g.appContainerLocked(aid)
	}
	if e == nil && c.status != "running" {
		e = conflict("not_running", "account container is not running")
	}
	if e == nil {
		if appIP, _ := c.onNetwork(n.name); appIP == gwIP.String() {
			e = badRequest("default_gateway is the account container's own address")
		}
	}
	var gw *container
	if e == nil {
		gw, e = g.gatewayLocked()
	}
	if e == nil && gw == nil {
		e = conflict("not_running", "shared gateway does not exist", names.SharedGateway(g.prefix))
	}
	var rec FirewallRecord
	if e == nil {
		rec = FirewallRecord{Rules: req.Rules, DefaultGateway: gwIP.String(), HelperImage: gw.image, AppID: c.id}
		g.firewall[aid] = rec
	}
	g.mu.Unlock()
	if e != nil {
		return e
	}
	g.hooksMu.Lock()
	hook := g.firewallHook
	g.hooksMu.Unlock()
	code := 0
	if hook != nil {
		code = hook(aid, rec)
	}
	switch {
	case code == ExitTimeout:
		return &apiError{status: 504, code: "timeout", reason: "job_timeout", message: "firewall helper exceeded the time limit"}
	case code < 0:
		return dockerError("helper_failed", "firewall helper could not run")
	case code != 0:
		return dockerError("helper_failed", "helper exited with "+strconv.Itoa(code))
	}
	noContent(w)
	return nil
}

func (g *Guard) runJob(w http.ResponseWriter, r *http.Request, aid string, body []byte) *apiError {
	var job guardapi.Job
	if e := decodeStrict(r, body, &job, false); e != nil {
		return e
	}
	if e := checkImageRef(job.Image); e != nil {
		return e
	}
	if e := checkArgv(job.Entrypoint, 1, 4); e != nil {
		return badRequest("entrypoint must have 1 to 4 valid items")
	}
	if e := checkArgv(job.Argv, 0, maxJobArgv); e != nil {
		return e
	}
	if job.User != "0" && job.User != "1000:1000" {
		return badRequest("user must be 0 or 1000:1000")
	}
	if job.Volume != "none" && job.Volume != "ro" && job.Volume != "rw" {
		return badRequest("volume must be none, ro or rw")
	}
	if e := validCaps(job.Caps, job.Volume); e != nil {
		return e
	}
	if job.MemoryBytes != 0 && (job.MemoryBytes < minJobMemory || job.MemoryBytes > maxJobMemory) {
		return badRequest("memory_bytes out of range")
	}
	g.mu.Lock()
	var e *apiError
	if job.Volume != "none" {
		volName := names.Name(g.prefix, aid, "data")
		if v := g.volumes[volName]; v == nil {
			e = notFound("volume")
		} else if v.labels[names.LabelAccount] != aid {
			e = conflict("ownership_mismatch", "resource belongs to another owner", volName)
		}
	}
	img := g.images[job.Image]
	g.mu.Unlock()
	if e != nil {
		return e
	}
	if img == nil {
		return dockerError("job_failed", "job container could not run")
	}
	g.hooksMu.Lock()
	g.jobs = append(g.jobs, JobRecord{AID: aid, Job: job})
	hook := g.jobHook
	g.hooksMu.Unlock()
	code, out := 0, []byte(nil)
	if hook != nil {
		code, out = hook(aid, job)
	}
	switch {
	case code == ExitTimeout:
		return &apiError{status: 504, code: "timeout", reason: "job_timeout", message: "job exceeded the time limit"}
	case code < 0:
		return dockerError("job_failed", "job container could not run")
	case len(out) > maxJobStdout:
		return dockerError("output_too_large", "job stdout exceeds 64 KiB")
	}
	writeJSON(w, 200, pyjson.Ordered{{Key: "exit_code", Value: int64(code)},
		{Key: "stdout", Value: base64.StdEncoding.EncodeToString(out)}})
	return nil
}

func (g *Guard) gatewayGet(w http.ResponseWriter) *apiError {
	g.mu.Lock()
	defer g.mu.Unlock()
	c, e := g.gatewayLocked()
	if e != nil {
		return e
	}
	if c == nil {
		writeJSON(w, 200, pyjson.Ordered{{Key: "gateway", Value: nil}, {Key: "managed_by", Value: ""}})
		return nil
	}
	writeJSON(w, 200, pyjson.Ordered{{Key: "gateway", Value: g.rawContainer(c)}, {Key: "managed_by", Value: c.managedBy}})
	return nil
}

func (g *Guard) busyLocked() bool { return g.lifecycleBusy || g.upgrade.State == "running" }

func (g *Guard) gatewayDirLocked() *apiError {
	if _, bad := g.rejected["shared-egress"]; bad {
		return forbidden("mount_source_rejected", "gateway configuration directory rejected")
	}
	return nil
}

// gatewayEnsure never recreates a running gateway: none, started (a
// stopped one, compose or not) or created (by compose, with the uplink
// created first when given).
func (g *Guard) gatewayEnsure(w http.ResponseWriter, r *http.Request, body []byte) *apiError {
	var req struct {
		Uplink *guardapi.UplinkRequest `json:"uplink,omitempty"`
	}
	if e := decodeStrict(r, body, &req, true); e != nil {
		return e
	}
	var upNet netip.Prefix
	if req.Uplink != nil {
		p, e := checkSubnet(req.Uplink.Subnet, req.Uplink.Gateway)
		if e != nil {
			return e
		}
		if e := checkPolicyLabel(req.Uplink.PolicyLabel); e != nil {
			return e
		}
		upNet = p
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	c, e := g.gatewayLocked()
	if e != nil {
		return e
	}
	action := "none"
	switch {
	case c != nil && c.status == "running":
	case c != nil:
		if len(c.mounts) != 1 || c.mounts[0].typ != "bind" || c.mounts[0].destination != "/config" ||
			c.mounts[0].source != RuntimeHostRoot+"/shared-egress" {
			return forbidden("mount_source_rejected", "gateway mounts are not the expected configuration directory")
		}
		if e := g.gatewayDirLocked(); e != nil {
			return e
		}
		c.status = "running"
		c.startedAt = g.nextTime()
		g.resetXray()
		action = "started"
	default:
		if g.networks[g.uplinkName()] == nil {
			if req.Uplink == nil {
				return conflict("uplink_missing", "the gateway uplink network does not exist")
			}
			if _, e := g.createNetworkLocked(g.uplinkName(), names.UplinkKey, upNet, req.Uplink.Gateway, req.Uplink.PolicyLabel, false); e != nil {
				return e
			}
		}
		if e := g.gatewayDirLocked(); e != nil {
			return e
		}
		if g.busyLocked() {
			return conflict("upgrade_in_progress", "a controller upgrade is running")
		}
		if g.images[g.gatewayImage] == nil || g.composeFails[g.gatewayImage] {
			return dockerError("compose_failed", "compose could not create the gateway")
		}
		c = g.createGatewayLocked(guardapi.ManagedByCompose)
		action = "created"
	}
	writeJSON(w, 200, pyjson.Ordered{{Key: "gateway", Value: g.rawContainer(c)}, {Key: "action", Value: action}})
	return nil
}

// gatewayRecreate replaces a compose gateway (explicit maintenance). When
// compose fails, the previous image is restored, which recreates the
// gateway with it as well (a new container, account networks detached).
func (g *Guard) gatewayRecreate(w http.ResponseWriter, r *http.Request, body []byte) *apiError {
	var req struct {
		Image string `json:"image"`
	}
	if e := decodeStrict(r, body, &req, false); e != nil {
		return e
	}
	if e := checkImageRef(req.Image); e != nil {
		return e
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	img := g.images[req.Image]
	if img == nil {
		return notFound("image")
	}
	if img.labels[names.LabelSharedSchema] != "1" {
		return forbidden("image_not_gateway", "image lacks the shared-egress label")
	}
	c, e := g.gatewayLocked()
	if e != nil {
		return e
	}
	if c != nil && c.managedBy != guardapi.ManagedByCompose {
		return conflict("gateway_not_compose", "the running gateway is not managed by compose")
	}
	if g.networks[g.uplinkName()] == nil {
		return conflict("uplink_missing", "the gateway uplink network does not exist")
	}
	if e := g.gatewayDirLocked(); e != nil {
		return e
	}
	if g.busyLocked() {
		return conflict("upgrade_in_progress", "a controller upgrade is running")
	}
	if g.composeFails[req.Image] {
		if c != nil {
			g.recreateGatewayLocked(c, g.gatewayImage)
		}
		return dockerError("compose_failed", "gateway recreate failed; previous image restored")
	}
	g.gatewayImage = req.Image
	if c == nil {
		c = g.createGatewayLocked(guardapi.ManagedByCompose)
	} else {
		g.recreateGatewayLocked(c, req.Image)
	}
	writeJSON(w, 200, pyjson.Ordered{{Key: "gateway", Value: g.rawContainer(c)}})
	return nil
}

func (g *Guard) gatewayExec(w http.ResponseWriter, r *http.Request, body []byte) *apiError {
	var req struct {
		Argv []string `json:"argv"`
	}
	if e := decodeStrict(r, body, &req, false); e != nil {
		return e
	}
	if e := checkArgv(req.Argv, 1, maxArgv); e != nil {
		return e
	}
	g.mu.Lock()
	c, e := g.gatewayLocked()
	if e == nil && (c == nil || c.status != "running") {
		e = conflict("not_running", "shared gateway is not running", names.SharedGateway(g.prefix))
	}
	g.mu.Unlock()
	if e != nil {
		return e
	}
	return writeExec(w, g.runExecTarget("gateway", "", req.Argv, ""))
}

func (g *Guard) gatewayConnect(w http.ResponseWriter, r *http.Request, aid string, body []byte) *apiError {
	var req struct {
		IPv4 string `json:"ipv4"`
	}
	if e := decodeStrict(r, body, &req, false); e != nil {
		return e
	}
	ip, e := parseIPv4(req.IPv4, "ipv4")
	if e != nil {
		return e
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	gw, e := g.gatewayLocked()
	if e != nil {
		return e
	}
	if gw == nil {
		return notFound("gateway")
	}
	n, e := g.accountNetLocked(aid)
	if e != nil {
		return e
	}
	if e := inSubnet(ip, n.subnet, "ipv4"); e != nil {
		return e
	}
	if cur, on := gw.onNetwork(n.name); on {
		if cur == ip.String() {
			noContent(w)
			return nil
		}
		return conflict("exists", "gateway is attached with another address", gw.name)
	}
	if g.addressInUseLocked(n.name, ip, gw.name) {
		return badRequest("ipv4 already in use on the account network")
	}
	gw.endpoints = append(gw.endpoints, endpoint{network: n.name, ip: ip.String()})
	noContent(w)
	return nil
}

// gatewayDisconnect succeeds when the gateway, the network or the
// attachment is absent; a gateway or network of another owner is 409.
func (g *Guard) gatewayDisconnect(w http.ResponseWriter, aid string) *apiError {
	g.mu.Lock()
	defer g.mu.Unlock()
	gw, e := g.gatewayLocked()
	if e != nil {
		return e
	}
	if gw == nil {
		noContent(w)
		return nil
	}
	name := names.Name(g.prefix, aid, "net")
	n := g.networks[name]
	if n == nil {
		noContent(w)
		return nil
	}
	if n.labels[names.LabelAccount] != aid {
		return conflict("ownership_mismatch", "resource belongs to another owner", name)
	}
	gw.detach(name)
	noContent(w)
	return nil
}

func (g *Guard) gatewayFile(w http.ResponseWriter, r *http.Request, name string, body []byte) *apiError {
	allowed := false
	for _, f := range guardapi.GatewayFiles {
		if f == name {
			allowed = true
		}
	}
	if !allowed {
		return badRequest("unknown gateway file")
	}
	if e := rawBody(r, maxGatewayFile, "application/octet-stream"); e != nil {
		return e
	}
	if e := exactBody(r, body); e != nil {
		return e
	}
	g.mu.Lock()
	g.gatewayFiles[name] = append([]byte(nil), body...)
	g.mu.Unlock()
	noContent(w)
	return nil
}

func (g *Guard) controllerUpgrade(w http.ResponseWriter, r *http.Request, body []byte) *apiError {
	var req struct {
		Image string `json:"image"`
	}
	if e := decodeStrict(r, body, &req, false); e != nil {
		return e
	}
	if e := checkImageRef(req.Image); e != nil {
		return e
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	img := g.images[req.Image]
	if img == nil {
		return notFound("image")
	}
	if img.labels[names.LabelGuardAPI] != "1" || img.labels[names.LabelSharedSchema] != "1" {
		return forbidden("image_not_guarded", "controller image lacks the guard-api and shared-egress labels")
	}
	if g.busyLocked() {
		return conflict("upgrade_in_progress", "an upgrade or gateway recreate is running")
	}
	g.upgrade = guardapi.UpgradeStatus{State: "done", Image: req.Image, Step: "finished", Result: "started"}
	writeJSON(w, 202, pyjson.Ordered{{Key: "accepted", Value: true}})
	return nil
}

// sha256Hex is the hex SHA-256 of data.
func sha256Hex(data []byte) string {
	s := sha256.Sum256(data)
	return hex.EncodeToString(s[:])
}
