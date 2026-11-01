package api

import (
	"archive/tar"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"ccgateway/guard/internal/apierr"
	"ccgateway/guard/internal/dockerapi"
	"ccgateway/guard/internal/files"
	"ccgateway/guard/internal/imagecheck"
	"ccgateway/guard/internal/names"
	"ccgateway/guard/internal/policy"
)

type jsonRaw = json.RawMessage

const (
	pullTimeout     = 30 * time.Minute
	loadTimeout     = 30 * time.Minute
	execOutputMax   = 16 << 20
	jobStdoutMax    = 64 << 10
	archivePutMax   = 600 << 20
	archiveGetMax   = 601 << 20
	imageFileMax    = 512 << 20
	loadMax         = 4 << 30
	gatewayFileMax  = 4 << 20
	firewallRuleMax = 64 << 10
)

func actionTimeout(grace int64) time.Duration {
	return time.Duration(grace)*time.Second + 60*time.Second
}

// cleanup runs removals that must happen even if the client went away.
func cleanupCtx() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 60*time.Second)
}

// oneshot runs a created one-shot container to completion within limit:
// start, wait, then always remove (force, removeVolumes).
func (s *Server) oneshot(ctx context.Context, spec policy.ContainerSpec, limit time.Duration, removeVolumes bool,
	after func(ctx context.Context, id string) error) (code int, err error, timedOut bool) {
	name := s.n.Oneshot()
	id, err := s.D.ContainerCreate(ctx, name, spec)
	if err != nil {
		return 0, err, false
	}
	defer func() {
		cctx, cancel := cleanupCtx()
		defer cancel()
		_ = s.D.ContainerRemove(cctx, id, true, removeVolumes)
	}()
	if err := s.D.ContainerStart(ctx, id); err != nil {
		return 0, err, false
	}
	wctx, cancel := context.WithTimeout(ctx, limit)
	defer cancel()
	code, err = s.D.ContainerWait(wctx, id)
	if err != nil {
		if wctx.Err() == context.DeadlineExceeded {
			kctx, kcancel := cleanupCtx()
			_ = s.D.ContainerKill(kctx, id)
			kcancel()
			return 0, err, true
		}
		return 0, err, false
	}
	if after != nil {
		if err := after(ctx, id); err != nil {
			return code, err, false
		}
	}
	return code, nil, false
}

func (s *Server) putFirewall(w http.ResponseWriter, r *http.Request, p params) error {
	aid := p.get("aid")
	var req FirewallRequest
	if err := decode(r, &req, false); err != nil {
		return err
	}
	if len(req.Rules) > firewallRuleMax || !utf8.ValidString(req.Rules) || strings.ContainsRune(req.Rules, 0) {
		return apierr.Invalid("rules must be UTF-8 without NUL, at most 64 KiB")
	}
	gwIP, err := parseIPv4(req.DefaultGateway, "default_gateway")
	if err != nil {
		return err
	}
	ctx := r.Context()
	unlock, err := s.lock(ctx, aid)
	if err != nil {
		return err
	}
	defer unlock()
	_, sub, err := s.accountNet(ctx, aid)
	if err != nil {
		return err
	}
	if err := inSubnet(gwIP, sub, "default_gateway"); err != nil {
		return err
	}
	app, err := s.runningApp(ctx, aid)
	if err != nil {
		return err
	}
	if app.NetworkSettings.Networks[s.n.Net(aid)].IPAddress == gwIP.String() {
		return apierr.Invalid("default_gateway is the account container's own address")
	}
	_, gw, err := s.Gateway.Get(ctx)
	if err != nil {
		return err
	}
	if gw == nil {
		return apierr.Conflict("not_running", "shared gateway does not exist").With(s.n.Gateway())
	}
	if !policy.ValidImageID(gw.Image) {
		return apierr.ErrDocker
	}
	if err := s.Files.WriteAppNFT(aid, []byte(req.Rules)); err != nil {
		return mountRejected(err)
	}
	spec := policy.FirewallHelper(s.n, s.Cfg.RuntimeRoot, aid, app.ID, gw.Image, gwIP)
	code, err, timedOut := s.oneshot(ctx, spec, s.HelperTimeout, false, nil)
	s.FW.InvalidateRoute(aid)
	s.FW.Recompute("account_firewall", aid)
	switch {
	case timedOut:
		return apierr.Timeout("job_timeout", "firewall helper exceeded the time limit")
	case err != nil:
		return apierr.Docker("helper_failed", "firewall helper could not run")
	case code != 0:
		return apierr.Docker("helper_failed", "helper exited with "+strconv.Itoa(code))
	}
	return noContent(w)
}

func (s *Server) runJob(w http.ResponseWriter, r *http.Request, p params) error {
	aid := p.get("aid")
	var req JobRequest
	if err := decode(r, &req, false); err != nil {
		return err
	}
	spec, err := policy.Job(s.n, aid, policy.JobInput{Image: req.Image, Entrypoint: req.Entrypoint, Argv: req.Argv,
		User: req.User, Volume: req.Volume, Caps: req.Caps, MemoryBytes: req.MemoryBytes})
	if err != nil {
		return apierr.Invalid(err.Error())
	}
	ctx := r.Context()
	unlock, err := s.lock(ctx, aid)
	if err != nil {
		return err
	}
	defer unlock()
	if req.Volume != "none" {
		raw, _, err := s.volume(ctx, aid)
		if err != nil {
			return err
		}
		if raw == nil {
			return apierr.NotFound("volume", "account volume not found")
		}
	}
	var stdout []byte
	code, err, timedOut := s.oneshot(ctx, spec, s.JobTimeout, true, func(ctx context.Context, id string) error {
		var lerr error
		stdout, lerr = s.D.ContainerLogs(ctx, id, jobStdoutMax)
		return lerr
	})
	switch {
	case timedOut:
		return apierr.Timeout("job_timeout", "job exceeded the time limit")
	case errors.Is(err, dockerapi.ErrOutputTooLarge):
		return apierr.Docker("output_too_large", "job stdout exceeds 64 KiB")
	case err != nil:
		return apierr.Docker("job_failed", "job container could not run")
	}
	writeJSON(w, 200, JobResult{ExitCode: code, Stdout: base64.StdEncoding.EncodeToString(stdout)})
	return nil
}

// ---- archives ----

func archivePath(r *http.Request) (string, error) {
	p := r.URL.Query().Get("path")
	if !validPath(p) {
		return "", apierr.Invalid("path must be absolute, clean, at most 4096 bytes")
	}
	return p, nil
}

func (s *Server) archiveGet(w http.ResponseWriter, r *http.Request, p params) error {
	path, err := archivePath(r)
	if err != nil {
		return err
	}
	c, err := s.app(r.Context(), p.get("aid"))
	if err != nil {
		return err
	}
	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()
	body, hdr, err := s.D.ArchiveGet(ctx, c.ID, path)
	if err != nil {
		if dockerapi.IsNotFound(err) {
			return apierr.NotFound("path", "path not found")
		}
		return dockerErr(err)
	}
	defer body.Close()
	in := newIdleReader(body, s.IdleTimeout, cancel)
	defer in.stop()
	w.Header().Set("Content-Type", "application/x-tar")
	if st := hdr.Get("X-Docker-Container-Path-Stat"); st != "" {
		w.Header().Set("X-Docker-Container-Path-Stat", st)
	}
	w.WriteHeader(200)
	n, err := io.Copy(s.idleOut(w), io.LimitReader(in, archiveGetMax+1))
	if err != nil || n > archiveGetMax {
		panic(http.ErrAbortHandler)
	}
	return nil
}

// exactReader fails when the body ends before n bytes.
type exactReader struct {
	r    io.Reader
	left int64
}

var errShortBody = errors.New("request body shorter than Content-Length")

func (e *exactReader) Read(p []byte) (int, error) {
	if e.left <= 0 {
		return 0, io.EOF
	}
	if int64(len(p)) > e.left {
		p = p[:e.left]
	}
	n, err := e.r.Read(p)
	e.left -= int64(n)
	if err == io.EOF && e.left > 0 {
		return n, errShortBody
	}
	if e.left == 0 && err == nil {
		return n, nil
	}
	return n, err
}

func (s *Server) archivePut(w http.ResponseWriter, r *http.Request, p params) error {
	path, err := archivePath(r)
	if err != nil {
		return err
	}
	n, err := rawBody(r, archivePutMax, "application/x-tar")
	if err != nil {
		return err
	}
	c, err := s.app(r.Context(), p.get("aid"))
	if err != nil {
		return err
	}
	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()
	body := &exactReader{r: s.idleBody(w, r), left: n}
	err = s.D.ArchivePut(ctx, c.ID, path, body, n)
	if body.left > 0 || errors.Is(err, errShortBody) {
		return apierr.Invalid("request body does not match Content-Length")
	}
	if err != nil {
		if dockerapi.IsNotFound(err) {
			return apierr.NotFound("path", "target directory not found")
		}
		return dockerErr(err)
	}
	return noContent(w)
}

// ---- image file ----

func (s *Server) imageFile(w http.ResponseWriter, r *http.Request, _ params) error {
	q := r.URL.Query()
	ref := q.Get("ref")
	if !policy.ValidImage(ref) {
		return apierr.Invalid("invalid image reference")
	}
	path := q.Get("path")
	if !validPath(path) || path == "/" {
		return apierr.Invalid("path must be absolute, clean, at most 4096 bytes")
	}
	limit, err := strconv.ParseInt(q.Get("limit"), 10, 64)
	if err != nil || limit < 1 || limit > imageFileMax {
		return apierr.Invalid("limit must be 1 to 512 MiB")
	}
	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()
	if _, _, err := s.D.ImageInspect(ctx, ref); err != nil {
		if dockerapi.IsNotFound(err) {
			return apierr.NotFound("image", "image not found")
		}
		return dockerErr(err)
	}
	id, err := s.D.ContainerCreate(ctx, s.n.Oneshot(), policy.ImageReader(s.n, ref))
	if err != nil {
		if dockerapi.IsNotFound(err) {
			return apierr.NotFound("image", "image not found")
		}
		return dockerErr(err)
	}
	defer func() {
		cctx, ccancel := cleanupCtx()
		defer ccancel()
		_ = s.D.ContainerRemove(cctx, id, true, true)
	}()
	body, _, err := s.D.ArchiveGet(ctx, id, path)
	if err != nil {
		if dockerapi.IsNotFound(err) {
			return apierr.NotFound("path", "path not found")
		}
		return dockerErr(err)
	}
	defer body.Close()
	in := newIdleReader(body, s.IdleTimeout, cancel)
	defer in.stop()
	tr := tar.NewReader(in)
	h, err := tr.Next()
	if err != nil {
		return apierr.ErrDocker
	}
	if h.Typeflag != tar.TypeReg && h.Typeflag != '\x00' {
		return apierr.Unprocessable("not_regular_file", "path is not a regular file")
	}
	if h.Size > limit {
		return apierr.Unprocessable("too_large", "file exceeds limit")
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Length", strconv.FormatInt(h.Size, 10))
	w.WriteHeader(200)
	if n, err := io.Copy(s.idleOut(w), tr); err != nil || n != h.Size {
		panic(http.ErrAbortHandler)
	}
	if _, err := tr.Next(); err != io.EOF {
		panic(http.ErrAbortHandler)
	}
	return nil
}

// ---- image load ----

func (s *Server) imageLoad(w http.ResponseWriter, r *http.Request, _ params) error {
	n, err := rawBody(r, loadMax, "application/x-tar", "application/gzip")
	if err != nil {
		return err
	}
	if free, err := s.State.FreeBytes(); err != nil || free < uint64(n)+uint64(n)/5 {
		return apierr.ErrBusy
	}
	f, name, err := s.State.CreateLoad()
	if err != nil {
		return apierr.ErrDocker
	}
	defer func() {
		f.Close()
		_ = s.State.RemoveLoad(name)
	}()
	got, err := io.Copy(f, io.LimitReader(s.idleBody(w, r), n+1))
	if err != nil || got != n {
		return apierr.Invalid("request body does not match Content-Length")
	}
	if _, err := f.Seek(0, io.SeekStart); err != nil {
		return apierr.ErrDocker
	}
	arch, err := imagecheck.Scan(f)
	if err != nil {
		var fb *imagecheck.Forbidden
		if errors.As(err, &fb) {
			s.Log.Warn("load_forbidden", map[string]any{"why": fb.Why})
			return apierr.Forbidden("load_forbidden", "image archive rejected")
		}
		return apierr.Invalid("unsupported archive compression")
	}
	if err := imagecheck.Check(arch, s.Cfg.LoadRepos); err != nil {
		s.Log.Warn("load_forbidden", map[string]any{"why": "name not allowed"})
		return apierr.Forbidden("load_forbidden", "image archive names a repository that is not allowed")
	}
	if _, err := f.Seek(0, io.SeekStart); err != nil {
		return apierr.ErrDocker
	}
	lctx, lcancel := context.WithTimeout(context.Background(), loadTimeout)
	defer lcancel()
	lines, err := s.D.ImageLoad(lctx, f, n, "application/x-tar")
	if err != nil {
		return apierr.Docker("load_failed", "image load failed")
	}
	ids := []string{}
	byID := map[string]bool{}
	for _, line := range lines {
		var id string
		if rest, ok := strings.CutPrefix(line, "Loaded image ID: "); ok {
			id = strings.TrimSpace(rest)
		} else if rest, ok := strings.CutPrefix(line, "Loaded image: "); ok {
			ref := strings.TrimSpace(rest)
			if !arch.Allowed(ref) {
				s.Log.Alert("load_tag_mismatch", nil)
				return apierr.Docker("load_failed", "loaded names differ from the archive")
			}
			_, info, err := s.D.ImageInspect(lctx, ref)
			if err != nil {
				return apierr.Docker("load_failed", "loaded image not found")
			}
			id = info.ID
		}
		if policy.ValidImageID(id) && !byID[id] {
			byID[id] = true
			ids = append(ids, id)
		}
	}
	res := LoadResult{Images: []LoadedImage{}}
	for _, id := range ids {
		tags := arch.Names(id)
		if len(arch.Tags) == 0 {
			if _, info, err := s.D.ImageInspect(lctx, id); err == nil && info.RepoTags != nil {
				tags = info.RepoTags
			}
		}
		res.Images = append(res.Images, LoadedImage{ID: id, Tags: tags})
	}
	writeJSON(w, 200, res)
	return nil
}

// ---- gateway ----

func (s *Server) getGateway(w http.ResponseWriter, r *http.Request, _ params) error {
	raw, c, err := s.Gateway.Get(r.Context())
	if err != nil {
		return err
	}
	writeJSON(w, 200, GatewayView{Gateway: rawOrNull(raw), ManagedBy: s.Gateway.ManagedBy(c)})
	return nil
}

func (s *Server) ensureGateway(w http.ResponseWriter, r *http.Request, _ params) error {
	var req EnsureRequest
	if err := decode(r, &req, true); err != nil {
		return err
	}
	var up *policy.NetworkInput
	if req.Uplink != nil {
		in := policy.NetworkInput{Subnet: req.Uplink.Subnet, Gateway: req.Uplink.Gateway, PolicyLabel: req.Uplink.PolicyLabel}
		if _, err := policy.GatewayUplink(s.n, in); err != nil {
			return apierr.Invalid(err.Error())
		}
		up = &in
	}
	raw, action, err := s.Gateway.Ensure(r.Context(), up)
	if err != nil {
		return err
	}
	writeJSON(w, 200, EnsureResult{Gateway: rawOrNull(raw), Action: action})
	return nil
}

func (s *Server) recreateGateway(w http.ResponseWriter, r *http.Request, _ params) error {
	var req RecreateRequest
	if err := decode(r, &req, false); err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(r.Context(), 4*time.Minute)
	defer cancel()
	raw, err := s.Gateway.Recreate(ctx, req.Image)
	if err != nil {
		return err
	}
	writeJSON(w, 200, RecreateResult{Gateway: rawOrNull(raw)})
	return nil
}

func (s *Server) gatewayExec(w http.ResponseWriter, r *http.Request, _ params) error {
	var req GatewayExecRequest
	if err := decode(r, &req, false); err != nil {
		return err
	}
	if err := policy.CheckArgv(req.Argv, 1, 256); err != nil {
		return apierr.Invalid(err.Error())
	}
	_, gw, err := s.Gateway.Get(r.Context())
	if err != nil {
		return err
	}
	if gw == nil || !gw.State.Running {
		return apierr.Conflict("not_running", "shared gateway is not running").With(s.n.Gateway())
	}
	res, err := s.exec(r.Context(), gw.ID, req.Argv, "")
	if err != nil {
		return err
	}
	writeJSON(w, 200, res)
	return nil
}

func (s *Server) connectGateway(w http.ResponseWriter, r *http.Request, p params) error {
	aid := p.get("aid")
	var req ConnectRequest
	if err := decode(r, &req, false); err != nil {
		return err
	}
	ip, err := parseIPv4(req.IPv4, "ipv4")
	if err != nil {
		return err
	}
	ctx := r.Context()
	unlock, err := s.lock(ctx, aid)
	if err != nil {
		return err
	}
	defer unlock()
	gunlock, err := s.lock(ctx, gatewayLockKey)
	if err != nil {
		return err
	}
	defer gunlock()
	_, gw, err := s.Gateway.Get(ctx)
	if err != nil {
		return err
	}
	if gw == nil {
		return apierr.NotFound("gateway", "shared gateway not found")
	}
	net, sub, err := s.accountNet(ctx, aid)
	if err != nil {
		return err
	}
	if err := inSubnet(ip, sub, "ipv4"); err != nil {
		return err
	}
	if ep, ok := gw.NetworkSettings.Networks[net.Name]; ok {
		if ep.IPAddress == ip.String() {
			return noContent(w)
		}
		return apierr.Conflict("exists", "gateway is attached with another address").With(s.n.Gateway())
	}
	if holder, used := endpointIPs(net)[ip]; used && holder != s.n.Gateway() {
		return apierr.Invalid("ipv4 already in use on the account network")
	}
	if err := s.D.NetworkConnect(ctx, net.ID, gw.ID, ip.String()); err != nil {
		return dockerErr(err)
	}
	s.FW.Recompute("gateway_attached", aid)
	return noContent(w)
}

func (s *Server) disconnectGateway(w http.ResponseWriter, r *http.Request, p params) error {
	aid := p.get("aid")
	ctx := r.Context()
	unlock, err := s.lock(ctx, aid)
	if err != nil {
		return err
	}
	defer unlock()
	gunlock, err := s.lock(ctx, gatewayLockKey)
	if err != nil {
		return err
	}
	defer gunlock()
	_, gw, err := s.Gateway.Get(ctx)
	if err != nil {
		return err
	}
	if gw == nil {
		return noContent(w)
	}
	_, net, err := s.network(ctx, s.n.Net(aid), aid)
	if err != nil {
		return err
	}
	if net == nil {
		return noContent(w)
	}
	// Not on the network: nothing to do (03 §3.7.6). Docker 29 answers a
	// disconnect of a container that is not connected with a 500, so the
	// membership is checked here, as the Python controller did (G13); the
	// controller detaches twice when deleting a runtime (L7 IT-F01).
	if _, attached := gw.NetworkSettings.Networks[net.Name]; !attached {
		return noContent(w)
	}
	if err := s.D.NetworkDisconnect(ctx, net.ID, gw.ID, true); err != nil && !dockerapi.IsNotFound(err) &&
		dockerapi.StatusOf(err) != http.StatusForbidden {
		return dockerErr(err)
	}
	s.FW.Recompute("gateway_detached", aid)
	return noContent(w)
}

func (s *Server) gatewayFile(w http.ResponseWriter, r *http.Request, p params) error {
	name := p.get("name")
	if !files.GatewayFiles[name] {
		return apierr.Invalid("unknown gateway file")
	}
	n, err := rawBody(r, gatewayFileMax, "application/octet-stream")
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	data, err := io.ReadAll(io.LimitReader(s.idleBody(w, r), n+1))
	if err != nil || int64(len(data)) != n {
		return apierr.Invalid("request body does not match Content-Length")
	}
	unlock, err := s.lock(ctx, gatewayLockKey)
	if err != nil {
		return err
	}
	defer unlock()
	if err := s.Files.WriteGatewayFile(name, data); err != nil {
		return mountRejected(err)
	}
	return noContent(w)
}

// ---- controller ----

func (s *Server) startUpgrade(w http.ResponseWriter, r *http.Request, _ params) error {
	var req UpgradeRequest
	if err := decode(r, &req, false); err != nil {
		return err
	}
	if err := s.Upgrader.Start(r.Context(), req.Image); err != nil {
		return err
	}
	writeJSON(w, 202, UpgradeAccepted{Accepted: true})
	return nil
}

func (s *Server) upgradeStatus(w http.ResponseWriter, r *http.Request, _ params) error {
	writeJSON(w, 200, s.Upgrader.Status())
	return nil
}

var _ = names.KEY
