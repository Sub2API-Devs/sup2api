package fakeguard

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"net/netip"
	"strconv"
	"strings"

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
		case len(rest) == 3 && rest[1] == "networks":
			return method + " /v1/gateway/networks/{aid}", rest[2]
		case len(rest) == 3 && rest[1] == "files":
			return method + " /v1/gateway/files/{name}", ""
		}
	case "accounts":
		if len(rest) < 2 {
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
		case len(sub) == 2 && sub[0] == "app":
			return method + " /v1/accounts/{aid}/app/{action}", aid
		case len(sub) == 2 && sub[0] == "containers":
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

func writeJSON(w http.ResponseWriter, status int, v any) {
	b, err := pyjson.Marshal(v)
	if err != nil {
		status, b = 500, []byte(`{"error":"internal"}`)
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Length", strconv.Itoa(len(b)))
	w.WriteHeader(status)
	w.Write(b)
}

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

// decodeStrict is the guard's JSON request rule: application/json,
// DisallowUnknownFields, one value. An empty body is {} where allowed.
func decodeStrict(r *http.Request, body []byte, out any, allowEmpty bool) *apiError {
	if len(body) == 0 && allowEmpty {
		return nil
	}
	if ct := r.Header.Get("Content-Type"); ct != "application/json" {
		return badRequest("content type must be application/json")
	}
	dec := json.NewDecoder(bytes.NewReader(body))
	dec.DisallowUnknownFields()
	if err := dec.Decode(out); err != nil {
		return badRequest("invalid JSON body")
	}
	if dec.More() {
		return badRequest("one JSON value expected")
	}
	return nil
}

func (g *Guard) serve(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	route, aid := routeOf(r.Method, r.URL.Path, q.Get("fields"))
	var body []byte
	if r.Body != nil {
		body, _ = io.ReadAll(io.LimitReader(r.Body, maxLoad+1))
	}
	call := Call{Method: r.Method, Route: route, Path: r.URL.Path, Query: r.URL.RawQuery, AID: aid}
	if strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
		call.Body = append([]byte(nil), body...)
	}
	g.record(call)
	if r.Header.Get("Authorization") != "Bearer "+g.token {
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
	if aid != "" {
		if e := checkAID(aid); e != nil {
			writeError(w, e)
			return
		}
	}
	if f := g.fault(route, aid); f != nil {
		writeError(w, &apiError{status: f.Status, code: f.Code, reason: f.Reason, message: f.Message, names: f.Names})
		return
	}
	if e := g.dispatch(w, r, route, aid, body); e != nil {
		writeError(w, e)
	}
}

func (g *Guard) dispatch(w http.ResponseWriter, r *http.Request, route, aid string, body []byte) *apiError {
	q := r.URL.Query()
	switch route {
	case "GET /v1/health":
		g.mu.Lock()
		h := g.health
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
		return g.appAction(w, r, aid, r.URL.Path[strings.LastIndexByte(r.URL.Path, '/')+1:], body)
	case "DELETE /v1/accounts/{aid}/containers/{suffix}":
		return g.deleteContainer(w, aid, r.URL.Path[strings.LastIndexByte(r.URL.Path, '/')+1:])
	case "POST /v1/accounts/{aid}/app/exec":
		return g.appExec(w, r, aid, body)
	case "GET /v1/accounts/{aid}/app/archive":
		return g.archiveGet(w, aid, q.Get("path"))
	case "PUT /v1/accounts/{aid}/app/archive":
		return g.archivePut(w, aid, q.Get("path"), body)
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
		return g.gatewayFile(w, r, r.URL.Path[strings.LastIndexByte(r.URL.Path, '/')+1:], body)
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
		if acct, ok := n.labels[names.LabelAccount]; ok && strings.HasPrefix(name, g.prefix+"-") {
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
	if e := checkImageRef(req.Ref); e != nil || strings.HasPrefix(req.Ref, "sha256:") {
		return badRequest("invalid image reference")
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if !strings.Contains(req.Ref, "@sha256:") && !repoAllowed(req.Ref, g.pullRepos) {
		return forbidden("image_not_allowed", "repository not allowed")
	}
	img := g.pullable[req.Ref]
	if img == nil {
		return dockerError("pull_failed", "pull failed")
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
	if e := checkAbsPath(p); e != nil {
		return e
	}
	limit, err := strconv.ParseInt(limitText, 10, 64)
	if err != nil || limit < 1 || limit > maxImageFile {
		return badRequest("invalid limit")
	}
	g.mu.Lock()
	img := g.images[ref]
	var data []byte
	var isDir, found bool
	if img != nil {
		data, found = img.files[p]
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
		return &apiError{status: 422, code: "unprocessable", reason: "not_regular_file", message: "not a regular file"}
	case !found:
		return notFound("path")
	case int64(len(data)) > limit:
		return &apiError{status: 422, code: "unprocessable", reason: "too_large", message: "file larger than limit"}
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	w.WriteHeader(200)
	w.Write(data)
	return nil
}

func (g *Guard) imageLoad(w http.ResponseWriter, r *http.Request, body []byte) *apiError {
	if r.ContentLength < 0 {
		return &apiError{status: 411, code: "invalid_request", message: "Content-Length required"}
	}
	if int64(len(body)) != r.ContentLength {
		return badRequest("body length differs from Content-Length")
	}
	data := body
	if len(data) >= 2 && data[0] == 0x1f && data[1] == 0x8b {
		zr, err := gzip.NewReader(bytes.NewReader(data))
		if err != nil {
			return badRequest("invalid gzip")
		}
		if data, err = io.ReadAll(zr); err != nil {
			return badRequest("invalid gzip")
		}
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
			return dockerError("load_failed", "load failed")
		}
	} else {
		var e *apiError
		if loaded, e = g.defaultLoad(data); e != nil {
			return e
		}
	}
	images := []any{}
	for _, l := range loaded {
		images = append(images, l)
	}
	writeJSON(w, 200, pyjson.Ordered{{Key: "images", Value: images}})
	return nil
}

// defaultLoad reads manifest.json of a classic `docker save` archive.
func (g *Guard) defaultLoad(data []byte) ([]guardapi.LoadedImage, *apiError) {
	tr := tar.NewReader(bytes.NewReader(data))
	var manifest []byte
	for {
		h, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, badRequest("invalid archive")
		}
		if strings.TrimPrefix(h.Name, "./") == "manifest.json" {
			if h.Typeflag != tar.TypeReg || manifest != nil {
				return nil, forbidden("load_forbidden", "invalid manifest")
			}
			manifest, _ = io.ReadAll(io.LimitReader(tr, 1<<20))
		}
	}
	var items []struct {
		Config   string
		RepoTags []string
	}
	if manifest == nil || json.Unmarshal(manifest, &items) != nil {
		return nil, forbidden("load_forbidden", "archive has no readable manifest")
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	for _, it := range items {
		for _, tag := range it.RepoTags {
			if !repoAllowed(tag, g.loadRepos) {
				return nil, forbidden("load_forbidden", "image name not allowed")
			}
		}
	}
	var out []guardapi.LoadedImage
	for _, it := range items {
		digest := it.Config
		digest = strings.TrimSuffix(digest[strings.LastIndexByte(digest, '/')+1:], ".json")
		id := "sha256:" + digest
		img := &image{id: id, repoTags: append([]string(nil), it.RepoTags...), labels: map[string]string{}, files: map[string][]byte{}}
		g.images[id] = img
		for _, tag := range it.RepoTags {
			g.images[tag] = img
		}
		tags := it.RepoTags
		if tags == nil {
			tags = []string{}
		}
		out = append(out, guardapi.LoadedImage{ID: id, Tags: tags})
	}
	return out, nil
}

// account answers GET /v1/accounts/{aid}.
func (g *Guard) account(w http.ResponseWriter, aid string) *apiError {
	g.mu.Lock()
	defer g.mu.Unlock()
	appName := names.Name(g.prefix, aid, "app")
	var app any
	if c := g.containers[appName]; c != nil {
		if c.labels[names.LabelAccount] != aid {
			return conflict("ownership_mismatch", "container not owned", appName)
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
			return conflict("ownership_mismatch", "resource not owned", n)
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

func (g *Guard) accountState(w http.ResponseWriter, aid string) *apiError {
	g.mu.Lock()
	defer g.mu.Unlock()
	netName := names.Name(g.prefix, aid, "net")
	out := guardapi.AccountState{}
	appName := names.Name(g.prefix, aid, "app")
	if c := g.containers[appName]; c != nil {
		if c.labels[names.LabelAccount] != aid {
			return conflict("ownership_mismatch", "container not owned", appName)
		}
		ip, _ := c.onNetwork(netName)
		out.App = &guardapi.StateApp{ID: c.id, Image: c.image, Status: c.status, StartedAt: c.startedAt, IP: ip}
	}
	gwName := names.SharedGateway(g.prefix)
	if c := g.containers[gwName]; c != nil {
		if c.labels[names.LabelSharedOwner] != g.prefix {
			return conflict("ownership_mismatch", "gateway not owned", gwName)
		}
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

func (g *Guard) createNetwork(w http.ResponseWriter, r *http.Request, aid string, body []byte) *apiError {
	var req guardapi.NetworkRequest
	if e := decodeStrict(r, body, &req, false); e != nil {
		return e
	}
	if aid == names.UplinkKey {
		return forbidden("policy", "the uplink network is created by gateway ensure")
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
	name := names.Name(g.prefix, aid, "net")
	if n := g.networks[name]; n != nil {
		if n.labels[names.LabelAccount] != aid {
			return conflict("ownership_mismatch", "network not owned", name)
		}
		return conflict("exists", "network exists", name)
	}
	for _, o := range g.occupiedLocked("") {
		if o.Overlaps(p) {
			return conflict("subnet_overlap", "subnet overlaps an existing network or route")
		}
	}
	n := &network{id: g.nextID(), name: name, created: g.nextTime(), internal: true, subnet: p, gateway: req.Gateway,
		labels: map[string]string{names.LabelAccount: aid, names.LabelNetwork: req.PolicyLabel}}
	g.networks[name] = n
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
		return conflict("ownership_mismatch", "network not owned", name)
	}
	g.removeEndedHelpersLocked(func(c *container) bool { _, on := c.onNetwork(name); return on })
	if gw := g.containers[names.SharedGateway(g.prefix)]; gw != nil {
		gw.detach(name)
	}
	var users []string
	for _, cn := range sortedKeys(g.containers) {
		if _, on := g.containers[cn].onNetwork(name); on {
			users = append(users, cn)
		}
	}
	if len(users) > 0 {
		return conflict("resource_in_use", "network in use", users...)
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
		return badRequest("size_bytes out of range")
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	name := names.Name(g.prefix, aid, "data")
	if v := g.volumes[name]; v != nil {
		if v.labels[names.LabelAccount] != aid {
			return conflict("ownership_mismatch", "volume not owned", name)
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
			return &apiError{status: 503, code: "disk_quota_unavailable", message: "no quota support"}
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
		return conflict("ownership_mismatch", "volume not owned", name)
	}
	g.removeEndedHelpersLocked(func(c *container) bool { return c.usesVolume(name) })
	var users []string
	for _, cn := range sortedKeys(g.containers) {
		if g.containers[cn].usesVolume(name) {
			users = append(users, cn)
		}
	}
	if len(users) > 0 {
		return conflict("resource_in_use", "volume in use", users...)
	}
	delete(g.volumes, name)
	noContent(w)
	return nil
}

func (g *Guard) createApp(w http.ResponseWriter, r *http.Request, aid string, body []byte) *apiError {
	var req guardapi.AppRequest
	if e := decodeStrict(r, body, &req, false); e != nil {
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
		return badRequest("image_label must be sha256:<hex>")
	}
	if req.MemoryBytes != 0 && (req.MemoryBytes < minAppMemory || req.MemoryBytes > maxAppMemory) {
		return badRequest("memory_bytes out of range")
	}
	if req.NanoCPUs != 0 && (req.NanoCPUs < minNanoCPUs || req.NanoCPUs > maxNanoCPUs) {
		return badRequest("nano_cpus out of range")
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	netName := names.Name(g.prefix, aid, "net")
	n := g.networks[netName]
	if n == nil {
		return notFound("network")
	}
	if n.labels[names.LabelAccount] != aid {
		return conflict("ownership_mismatch", "network not owned", netName)
	}
	volName := names.Name(g.prefix, aid, "data")
	if v := g.volumes[volName]; v == nil || v.labels[names.LabelAccount] != aid {
		return notFound("volume")
	}
	if _, ok := g.resolv[aid]; !ok {
		return forbidden("mount_source_rejected", "resolv.conf missing")
	}
	img := g.images[req.Image]
	if img == nil {
		return notFound("image")
	}
	ip, e := hostInSubnet(req.IPv4, n.subnet)
	if e != nil {
		return e
	}
	name := names.Name(g.prefix, aid, "app")
	if g.containers[name] != nil {
		return conflict("exists", "container exists", name)
	}
	for _, c := range g.containers {
		if addr, on := c.onNetwork(netName); on && addr == ip.String() {
			return badRequest("address in use")
		}
	}
	env := make([]string, 0, len(req.Env))
	for _, k := range sortedKeys(req.Env) {
		env = append(env, k+"="+req.Env[k])
	}
	c := &container{id: g.nextID(), name: name, image: img.id, configImage: req.Image, user: "1000:1000",
		created: g.nextTime(), startedAt: "0001-01-01T00:00:00Z", status: "created",
		path: "/usr/local/bin/docker-entrypoint.sh", args: []string{"worker"},
		labels: map[string]string{names.LabelAccount: aid, names.LabelAuth: req.AuthLabel, names.LabelImage: req.ImageLabel},
		env:    env, networkMode: netName, endpoints: []endpoint{{network: netName, ip: ip.String()}},
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

func (g *Guard) appAction(w http.ResponseWriter, r *http.Request, aid, action string, body []byte) *apiError {
	if action != "start" && action != "stop" && action != "restart" {
		return notFound("action")
	}
	var req struct {
		Timeout *int64 `json:"timeout,omitempty"`
	}
	if e := decodeStrict(r, body, &req, true); e != nil {
		return e
	}
	if req.Timeout != nil && (*req.Timeout < 0 || *req.Timeout > 120) {
		return badRequest("timeout out of range")
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	name := names.Name(g.prefix, aid, "app")
	c := g.containers[name]
	if c == nil {
		return notFound("container")
	}
	if c.labels[names.LabelAccount] != aid {
		return conflict("ownership_mismatch", "container not owned", name)
	}
	switch action {
	case "start":
		if _, ok := g.resolv[aid]; !ok {
			return forbidden("mount_source_rejected", "resolv.conf missing")
		}
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
		return conflict("ownership_mismatch", "container not owned", name)
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
		return nil, conflict("ownership_mismatch", "container not owned", name)
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
		return badRequest("invalid user")
	}
	g.mu.Lock()
	c, e := g.appContainerLocked(aid)
	if e == nil && c.status != "running" {
		e = conflict("not_running", "container not running")
	}
	g.mu.Unlock()
	if e != nil {
		return e
	}
	code, out := g.runExec("app:"+aid, aid, req.Argv, req.User)
	writeExec(w, code, out)
	return nil
}

func writeExec(w http.ResponseWriter, code int, out []byte) {
	writeJSON(w, 200, pyjson.Ordered{{Key: "exit_code", Value: int64(code)},
		{Key: "output", Value: base64.StdEncoding.EncodeToString(out)}})
}

func (g *Guard) archiveGet(w http.ResponseWriter, aid, p string) *apiError {
	if e := checkAbsPath(p); e != nil {
		return e
	}
	g.mu.Lock()
	c, e := g.appContainerLocked(aid)
	var buf bytes.Buffer
	if e == nil {
		e = c.tarOf(p, &buf)
	}
	g.mu.Unlock()
	if e != nil {
		return e
	}
	w.Header().Set("Content-Type", "application/x-tar")
	w.WriteHeader(200)
	w.Write(buf.Bytes())
	return nil
}

func (c *container) tarOf(p string, buf *bytes.Buffer) *apiError {
	tw := tar.NewWriter(buf)
	base := p[strings.LastIndexByte(p, '/')+1:]
	if f, ok := c.files[p]; ok {
		tw.WriteHeader(&tar.Header{Name: base, Mode: f.mode, Size: int64(len(f.data)), Uid: f.uid, Gid: f.gid, Typeflag: tar.TypeReg})
		tw.Write(f.data)
		tw.Close()
		return nil
	}
	if c.dirs[p] {
		tw.WriteHeader(&tar.Header{Name: base + "/", Mode: 0o755, Typeflag: tar.TypeDir})
		for _, fp := range sortedKeys(c.files) {
			if strings.HasPrefix(fp, p+"/") {
				f := c.files[fp]
				tw.WriteHeader(&tar.Header{Name: base + fp[len(p):], Mode: f.mode, Size: int64(len(f.data)), Typeflag: tar.TypeReg})
				tw.Write(f.data)
			}
		}
		tw.Close()
		return nil
	}
	return notFound("path")
}

func (g *Guard) archivePut(w http.ResponseWriter, aid, p string, body []byte) *apiError {
	if e := checkAbsPath(p); e != nil {
		return e
	}
	if len(body) > maxArchivePut {
		return &apiError{status: 413, code: "too_large", message: "archive too large"}
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	c, e := g.appContainerLocked(aid)
	if e != nil {
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
			return dockerError("", "invalid archive")
		}
		target := strings.TrimSuffix(p, "/") + "/" + strings.TrimPrefix(h.Name, "./")
		if p == "/" {
			target = "/" + strings.TrimPrefix(h.Name, "./")
		}
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
		return conflict("not_running", "container not running")
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

func (g *Guard) writeResolv(w http.ResponseWriter, r *http.Request, aid string, body []byte) *apiError {
	var req struct {
		Nameserver string `json:"nameserver"`
	}
	if e := decodeStrict(r, body, &req, false); e != nil {
		return e
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	n := g.networks[names.Name(g.prefix, aid, "net")]
	if n == nil || n.labels[names.LabelAccount] != aid {
		return notFound("network")
	}
	ip, e := hostInSubnet(req.Nameserver, n.subnet)
	if e != nil {
		return e
	}
	g.resolv[aid] = names.ResolvConf(ip.String())
	noContent(w)
	return nil
}

func (g *Guard) installFirewall(w http.ResponseWriter, r *http.Request, aid string, body []byte) *apiError {
	var req struct {
		Rules          string `json:"rules"`
		DefaultGateway string `json:"default_gateway"`
	}
	if e := decodeStrict(r, body, &req, false); e != nil {
		return e
	}
	if len(req.Rules) > maxRules || strings.ContainsRune(req.Rules, 0) {
		return badRequest("invalid rules")
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	c, e := g.appContainerLocked(aid)
	if e != nil {
		return e
	}
	n := g.networks[names.Name(g.prefix, aid, "net")]
	if n == nil {
		return notFound("network")
	}
	ip, e := hostInSubnet(req.DefaultGateway, n.subnet)
	if e != nil {
		return e
	}
	if appIP, _ := c.onNetwork(n.name); appIP == ip.String() {
		return badRequest("default gateway is the app's own address")
	}
	if c.status != "running" {
		return conflict("not_running", "container not running")
	}
	gw := g.containers[names.SharedGateway(g.prefix)]
	if gw == nil {
		return conflict("not_running", "gateway missing", names.SharedGateway(g.prefix))
	}
	g.firewall[aid] = FirewallRecord{Rules: req.Rules, DefaultGateway: ip.String(), HelperImage: gw.image, AppID: c.id}
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
	if len(job.Entrypoint) < 1 || len(job.Entrypoint) > 4 {
		return badRequest("invalid entrypoint")
	}
	if e := checkArgv(job.Argv, 0, maxJobArgv); e != nil {
		return e
	}
	if job.User != "0" && job.User != "1000:1000" {
		return badRequest("invalid user")
	}
	if job.Volume != "none" && job.Volume != "ro" && job.Volume != "rw" {
		return badRequest("invalid volume")
	}
	if e := validCaps(job.Caps, job.Volume); e != nil {
		return e
	}
	if job.MemoryBytes < 0 || job.MemoryBytes > maxJobMemory {
		return badRequest("memory_bytes out of range")
	}
	g.mu.Lock()
	img := g.images[job.Image]
	vol := g.volumes[names.Name(g.prefix, aid, "data")]
	g.mu.Unlock()
	if img == nil {
		return dockerError("job_failed", "job image missing")
	}
	if job.Volume != "none" && (vol == nil || vol.labels[names.LabelAccount] != aid) {
		return notFound("volume")
	}
	g.hooksMu.Lock()
	g.jobs = append(g.jobs, JobRecord{AID: aid, Job: job})
	hook := g.jobHook
	g.hooksMu.Unlock()
	code, out := 0, []byte(nil)
	if hook != nil {
		code, out = hook(aid, job)
	}
	if code < 0 {
		return dockerError("job_failed", "job could not start")
	}
	writeJSON(w, 200, pyjson.Ordered{{Key: "exit_code", Value: int64(code)},
		{Key: "stdout", Value: base64.StdEncoding.EncodeToString(out)}})
	return nil
}

func (g *Guard) gatewayAnswerLocked() (pyjson.Ordered, *apiError) {
	name := names.SharedGateway(g.prefix)
	c := g.containers[name]
	if c == nil {
		return pyjson.Ordered{{Key: "gateway", Value: nil}, {Key: "managed_by", Value: ""}}, nil
	}
	if c.labels[names.LabelSharedOwner] != g.prefix {
		return nil, conflict("ownership_mismatch", "gateway not owned", name)
	}
	return pyjson.Ordered{{Key: "gateway", Value: g.rawContainer(c)}, {Key: "managed_by", Value: c.managedBy}}, nil
}

func (g *Guard) gatewayGet(w http.ResponseWriter) *apiError {
	g.mu.Lock()
	defer g.mu.Unlock()
	out, e := g.gatewayAnswerLocked()
	if e != nil {
		return e
	}
	writeJSON(w, 200, out)
	return nil
}

func (g *Guard) gatewayEnsure(w http.ResponseWriter, r *http.Request, body []byte) *apiError {
	var req struct {
		Uplink *guardapi.UplinkRequest `json:"uplink,omitempty"`
	}
	if e := decodeStrict(r, body, &req, true); e != nil {
		return e
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.upgrade.State == "running" {
		return conflict("upgrade_in_progress", "upgrade in progress")
	}
	name := names.SharedGateway(g.prefix)
	action := "none"
	c := g.containers[name]
	switch {
	case c != nil && c.labels[names.LabelSharedOwner] != g.prefix:
		return conflict("ownership_mismatch", "gateway not owned", name)
	case c != nil && c.status == "running":
	case c != nil:
		c.status = "running"
		c.startedAt = g.nextTime()
		g.resetXray()
		action = "started"
	default:
		if g.networks[g.uplinkName()] == nil {
			if req.Uplink == nil {
				return conflict("uplink_missing", "uplink network missing")
			}
			p, e := checkSubnet(req.Uplink.Subnet, req.Uplink.Gateway)
			if e != nil {
				return e
			}
			if e := checkPolicyLabel(req.Uplink.PolicyLabel); e != nil {
				return e
			}
			for _, o := range g.occupiedLocked("") {
				if o.Overlaps(p) {
					return conflict("subnet_overlap", "subnet overlaps")
				}
			}
			g.networks[g.uplinkName()] = &network{id: g.nextID(), name: g.uplinkName(), created: g.nextTime(), subnet: p,
				gateway: req.Uplink.Gateway, labels: map[string]string{names.LabelAccount: names.UplinkKey, names.LabelNetwork: req.Uplink.PolicyLabel}}
		}
		if g.images[g.gatewayImage] == nil {
			return dockerError("compose_failed", "gateway image missing")
		}
		g.createGatewayLocked(guardapi.ManagedByCompose)
		action = "created"
	}
	out, _ := g.gatewayAnswerLocked()
	out = pyjson.Ordered{out[0], {Key: "action", Value: action}}
	writeJSON(w, 200, out)
	return nil
}

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
		return forbidden("image_not_gateway", "not a gateway image")
	}
	c := g.containers[names.SharedGateway(g.prefix)]
	if c != nil && c.managedBy != guardapi.ManagedByCompose {
		return conflict("gateway_not_compose", "gateway not managed by compose")
	}
	if g.upgrade.State == "running" {
		return conflict("upgrade_in_progress", "upgrade in progress")
	}
	g.gatewayImage = req.Image
	if c == nil {
		if g.networks[g.uplinkName()] == nil {
			return conflict("uplink_missing", "uplink network missing")
		}
		c = g.createGatewayLocked(guardapi.ManagedByCompose)
	} else {
		g.recreateGatewayLocked(c, req.Image)
	}
	writeJSON(w, 200, pyjson.Ordered{{Key: "gateway", Value: g.rawContainer(c)}, {Key: "managed_by", Value: c.managedBy}})
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
	c := g.containers[names.SharedGateway(g.prefix)]
	var e *apiError
	switch {
	case c == nil:
		e = notFound("gateway")
	case c.status != "running":
		e = conflict("not_running", "gateway not running")
	}
	g.mu.Unlock()
	if e != nil {
		return e
	}
	code, out := g.runExec("gateway", "", req.Argv, "")
	writeExec(w, code, out)
	return nil
}

func (g *Guard) gatewayConnect(w http.ResponseWriter, r *http.Request, aid string, body []byte) *apiError {
	var req struct {
		IPv4 string `json:"ipv4"`
	}
	if e := decodeStrict(r, body, &req, false); e != nil {
		return e
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	gw := g.containers[names.SharedGateway(g.prefix)]
	if gw == nil {
		return notFound("gateway")
	}
	netName := names.Name(g.prefix, aid, "net")
	n := g.networks[netName]
	if n == nil {
		return notFound("network")
	}
	if n.labels[names.LabelAccount] != aid {
		return conflict("ownership_mismatch", "network not owned", netName)
	}
	ip, e := hostInSubnet(req.IPv4, n.subnet)
	if e != nil {
		return e
	}
	if cur, on := gw.onNetwork(netName); on {
		if cur == ip.String() {
			noContent(w)
			return nil
		}
		return conflict("exists", "gateway attached with another address")
	}
	for _, c := range g.containers {
		if addr, on := c.onNetwork(netName); on && addr == ip.String() {
			return badRequest("address in use")
		}
	}
	gw.endpoints = append(gw.endpoints, endpoint{network: netName, ip: ip.String()})
	noContent(w)
	return nil
}

func (g *Guard) gatewayDisconnect(w http.ResponseWriter, aid string) *apiError {
	g.mu.Lock()
	defer g.mu.Unlock()
	if gw := g.containers[names.SharedGateway(g.prefix)]; gw != nil {
		gw.detach(names.Name(g.prefix, aid, "net"))
	}
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
		return badRequest("file name not allowed")
	}
	if r.Header.Get("Content-Type") != "application/octet-stream" {
		return badRequest("content type must be application/octet-stream")
	}
	if len(body) > maxGatewayFile {
		return &apiError{status: 413, code: "too_large", message: "file too large"}
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
		return forbidden("image_not_guarded", "controller image lacks the guard labels")
	}
	if g.upgrade.State == "running" {
		return conflict("upgrade_in_progress", "upgrade in progress")
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
