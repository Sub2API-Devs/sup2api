package api

import (
	"context"
	"encoding/base64"
	"errors"
	"net/http"
	"net/netip"
	"sort"
	"sync"

	"ccgateway/guard/internal/apierr"
	"ccgateway/guard/internal/config"
	"ccgateway/guard/internal/dockerapi"
	"ccgateway/guard/internal/names"
	"ccgateway/guard/internal/policy"
)

// ---- system ----

func (s *Server) health(w http.ResponseWriter, r *http.Request, _ params) error {
	ctl := "unguarded"
	if s.Control.ControllerOK() {
		ctl = "ok"
	}
	writeJSON(w, 200, Health{Version: s.Version, Prefix: s.Cfg.Prefix, Features: Features, Docker: s.DockerVersion,
		Firewall: s.FW.Status(), Controller: ctl, Starting: s.isStarting()})
	return nil
}

func (s *Server) subnets(w http.ResponseWriter, r *http.Request, _ params) error {
	out := Subnets{HostRoutes: []string{}, Networks: []NetSubnets{}}
	if s.HostRoutes != nil {
		routes, err := s.HostRoutes()
		if err != nil {
			return apierr.ErrDocker
		}
		for _, p := range routes {
			out.HostRoutes = append(out.HostRoutes, p.String())
		}
	}
	_, nets, err := s.D.NetworkList(r.Context(), nil)
	if err != nil {
		return dockerErr(err)
	}
	for _, n := range nets {
		ns := NetSubnets{Name: n.Name, Labels: map[string]string{}, Subnets: []string{}}
		if aid, role, ok := s.n.ParseNetwork(n.Name); ok && role == "net" && n.Label(names.LabelAccount) == aid {
			ns.Labels[names.LabelAccount] = aid
		}
		for _, c := range n.IPAM.Config {
			if p, err := netip.ParsePrefix(c.Subnet); err == nil && p.Addr().Is4() {
				ns.Subnets = append(ns.Subnets, p.String())
			}
		}
		out.Networks = append(out.Networks, ns)
	}
	sort.Slice(out.Networks, func(i, j int) bool { return out.Networks[i].Name < out.Networks[j].Name })
	writeJSON(w, 200, out)
	return nil
}

const inventoryMax = 4096

func (s *Server) inventory(w http.ResponseWriter, r *http.Request, _ params) error {
	ctx := r.Context()
	inv := Inventory{Containers: []jsonRaw{}, Networks: []jsonRaw{}, Volumes: []jsonRaw{}}
	cs, err := s.D.ContainerList(ctx, dockerapi.Filters{"label": {names.LabelAccount}}, true)
	if err != nil {
		return dockerErr(err)
	}
	sort.Slice(cs, func(i, j int) bool { return cs[i].Name() < cs[j].Name() })
	for _, c := range cs {
		aid, _, ok := s.n.ParseContainer(c.Name())
		if !ok || c.Labels[names.LabelAccount] != aid {
			continue
		}
		raw, info, err := s.D.ContainerInspect(ctx, c.ID)
		if err != nil {
			if dockerapi.IsNotFound(err) {
				continue
			}
			return dockerErr(err)
		}
		if info.Label(names.LabelAccount) != aid {
			continue
		}
		inv.Containers = append(inv.Containers, jsonRaw(raw))
	}
	_, nets, err := s.D.NetworkList(ctx, dockerapi.Filters{"label": {names.LabelAccount}})
	if err != nil {
		return dockerErr(err)
	}
	sort.Slice(nets, func(i, j int) bool { return nets[i].Name < nets[j].Name })
	for _, n := range nets {
		aid, role, ok := s.n.ParseNetwork(n.Name)
		if !ok || (role != "net" && role != "uplink") || n.Label(names.LabelAccount) != aid {
			continue
		}
		raw, _, err := s.D.NetworkInspect(ctx, n.ID)
		if err != nil {
			if dockerapi.IsNotFound(err) {
				continue
			}
			return dockerErr(err)
		}
		inv.Networks = append(inv.Networks, jsonRaw(raw))
	}
	_, vols, err := s.D.VolumeList(ctx, dockerapi.Filters{"label": {names.LabelAccount}})
	if err != nil {
		return dockerErr(err)
	}
	sort.Slice(vols, func(i, j int) bool { return vols[i].Name < vols[j].Name })
	for _, v := range vols {
		aid, ok := s.n.ParseVolume(v.Name)
		if !ok || v.Labels[names.LabelAccount] != aid {
			continue
		}
		raw, _, err := s.D.VolumeInspect(ctx, v.Name)
		if err != nil {
			if dockerapi.IsNotFound(err) {
				continue
			}
			return dockerErr(err)
		}
		inv.Volumes = append(inv.Volumes, jsonRaw(raw))
	}
	if len(inv.Containers) > inventoryMax || len(inv.Networks) > inventoryMax || len(inv.Volumes) > inventoryMax {
		return apierr.Docker("", "inventory too large")
	}
	writeJSON(w, 200, inv)
	return nil
}

// ---- images ----

func (s *Server) imageInspect(w http.ResponseWriter, r *http.Request, _ params) error {
	ref := r.URL.Query().Get("ref")
	if !policy.ValidImage(ref) {
		return apierr.Invalid("invalid image reference")
	}
	_, info, err := s.D.ImageInspect(r.Context(), ref)
	if err != nil {
		if dockerapi.IsNotFound(err) {
			return apierr.NotFound("image", "image not found")
		}
		return dockerErr(err)
	}
	v := ImageView{ID: info.ID, RepoTags: info.RepoTags, Config: ImageViewConfig{Env: info.Config.Env, Labels: info.Config.Labels}}
	if v.RepoTags == nil {
		v.RepoTags = []string{}
	}
	writeJSON(w, 200, v)
	return nil
}

func (s *Server) imagePull(w http.ResponseWriter, r *http.Request, _ params) error {
	var req PullRequest
	if err := decode(r, &req, false); err != nil {
		return err
	}
	if !policy.ValidImage(req.Ref) || policy.ValidImageID(req.Ref) {
		return apierr.Invalid("invalid image reference")
	}
	repo, tag, digest := config.SplitRef(req.Ref)
	if digest == "" {
		if tag == "" {
			tag = "latest"
		}
		if !config.MatchAny(s.Cfg.PullRepos, repo) {
			return apierr.Forbidden("image_not_allowed", "pulling this repository by tag is not allowed")
		}
	}
	ctx, cancel := context.WithTimeout(r.Context(), pullTimeout)
	defer cancel()
	if err := s.D.ImagePull(ctx, repo, tag, digest); err != nil {
		return apierr.Docker("pull_failed", "image pull failed")
	}
	return noContent(w)
}

// ---- accounts: queries ----

func (s *Server) account(w http.ResponseWriter, r *http.Request, p params) error {
	aid := p.get("aid")
	switch r.URL.Query().Get("fields") {
	case "":
	case "state":
		return s.accountState(w, r, aid)
	default:
		return apierr.Invalid("fields must be state")
	}
	ctx := r.Context()
	out := Account{Others: []jsonRaw{}, VolumeUsers: []ContainerRef{}, NetworkForeign: []ContainerRef{}}
	appRaw, _, err := s.container(ctx, s.n.App(aid), aid)
	if err != nil {
		return err
	}
	out.App = rawOrNull(appRaw)
	list, err := s.D.ContainerList(ctx, dockerapi.Filters{"label": {names.LabelAccount + "=" + aid}}, true)
	if err != nil {
		return dockerErr(err)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].Name() < list[j].Name() })
	for _, c := range list {
		a, role, ok := s.n.ParseContainer(c.Name())
		if !ok || a != aid || role == "app" {
			continue
		}
		raw, info, err := s.D.ContainerInspect(ctx, c.ID)
		if err != nil {
			if dockerapi.IsNotFound(err) {
				continue
			}
			return dockerErr(err)
		}
		if info.Label(names.LabelAccount) != aid {
			continue
		}
		out.Others = append(out.Others, jsonRaw(raw))
	}
	netRaw, net, err := s.network(ctx, s.n.Net(aid), aid)
	if err != nil {
		return err
	}
	out.Network = rawOrNull(netRaw)
	upRaw, _, err := s.network(ctx, s.n.LegacyUplink(aid), aid)
	if err != nil {
		return err
	}
	out.Uplink = rawOrNull(upRaw)
	volRaw, _, err := s.volume(ctx, aid)
	if err != nil {
		return err
	}
	out.Volume = rawOrNull(volRaw)
	if volRaw != nil {
		users, err := s.D.ContainerList(ctx, dockerapi.Filters{"volume": {s.n.Volume(aid)}}, true)
		if err != nil {
			return dockerErr(err)
		}
		sort.Slice(users, func(i, j int) bool { return users[i].Name() < users[j].Name() })
		for _, c := range users {
			if s.n.IsOneshot(c.Name()) && c.State != "running" {
				continue
			}
			out.VolumeUsers = append(out.VolumeUsers, ContainerRef{ID: c.ID, Name: c.Name(), Status: c.State})
		}
	}
	if net != nil {
		ids := make([]string, 0, len(net.Containers))
		for id := range net.Containers {
			ids = append(ids, id)
		}
		sort.Slice(ids, func(i, j int) bool { return net.Containers[ids[i]].Name < net.Containers[ids[j]].Name })
		for _, id := range ids {
			name := net.Containers[id].Name
			if name == s.n.Gateway() {
				out.GatewayAttached = true
				continue
			}
			if a, _, ok := s.n.ParseContainer(name); ok && a == aid {
				continue
			}
			status := ""
			if _, info, err := s.D.ContainerInspect(ctx, id); err == nil {
				status = info.State.Status
				if s.n.IsOneshot(name) && !info.State.Running {
					continue
				}
			}
			out.NetworkForeign = append(out.NetworkForeign, ContainerRef{ID: id, Name: name, Status: status})
		}
	}
	writeJSON(w, 200, out)
	return nil
}

func (s *Server) accountState(w http.ResponseWriter, r *http.Request, aid string) error {
	ctx := r.Context()
	var wg sync.WaitGroup
	var app, gw *dockerapi.ContainerInfo
	var appErr, gwErr error
	wg.Add(2)
	go func() {
		defer wg.Done()
		_, app, appErr = s.container(ctx, s.n.App(aid), aid)
	}()
	go func() {
		defer wg.Done()
		_, gw, gwErr = s.Gateway.Get(ctx)
	}()
	wg.Wait()
	if appErr != nil {
		return appErr
	}
	if gwErr != nil {
		return gwErr
	}
	net := s.n.Net(aid)
	out := AccountState{}
	if app != nil {
		out.App = &StateApp{ID: app.ID, Image: app.Image, Status: app.State.Status, StartedAt: app.State.StartedAt,
			IP: app.NetworkSettings.Networks[net].IPAddress}
	}
	if gw != nil {
		out.Gateway = &StateGateway{ID: gw.ID, Status: gw.State.Status, StartedAt: gw.State.StartedAt,
			IP: gw.NetworkSettings.Networks[net].IPAddress}
	}
	writeJSON(w, 200, out)
	return nil
}

// ---- accounts: network ----

// CreateNetwork checks overlap and creates under the netAlloc lock
// (gateway.Networks for the uplink as well).
func (s *Server) CreateNetwork(ctx context.Context, spec policy.NetworkSpec) (dockerapi.Raw, error) {
	s.init()
	sub, err := netip.ParsePrefix(spec.IPAM.Config[0].Subnet)
	if err != nil {
		return nil, apierr.Invalid("invalid subnet")
	}
	s.netAlloc.Lock()
	defer s.netAlloc.Unlock()
	if raw, n, err := s.D.NetworkInspect(ctx, spec.Name); err == nil && n.Name == spec.Name {
		_ = raw
		if n.Label(names.LabelAccount) != spec.Labels[names.LabelAccount] {
			return nil, ownership(spec.Name)
		}
		return nil, apierr.Conflict("exists", "network already exists").With(spec.Name)
	} else if err != nil && !dockerapi.IsNotFound(err) {
		return nil, dockerErr(err)
	}
	if sub.Overlaps(s.Cfg.ControlSubnet) {
		return nil, apierr.Conflict("subnet_overlap", "subnet overlaps the control network")
	}
	_, nets, err := s.D.NetworkList(ctx, nil)
	if err != nil {
		return nil, dockerErr(err)
	}
	for _, n := range nets {
		for _, c := range n.IPAM.Config {
			if p, err := netip.ParsePrefix(c.Subnet); err == nil && p.Addr().Is4() && p.Overlaps(sub) {
				return nil, apierr.Conflict("subnet_overlap", "subnet overlaps a Docker network")
			}
		}
	}
	if s.HostRoutes != nil {
		routes, err := s.HostRoutes()
		if err != nil {
			return nil, apierr.ErrDocker
		}
		for _, p := range routes {
			if p.Overlaps(sub) {
				return nil, apierr.Conflict("subnet_overlap", "subnet overlaps a host route")
			}
		}
	}
	if _, err := s.D.NetworkCreate(ctx, spec); err != nil {
		if dockerapi.StatusOf(err) == http.StatusConflict {
			return nil, apierr.Conflict("exists", "network already exists").With(spec.Name)
		}
		return nil, dockerErr(err)
	}
	raw, _, err := s.D.NetworkInspect(ctx, spec.Name)
	if err != nil {
		return nil, dockerErr(err)
	}
	return raw, nil
}

func (s *Server) putNetwork(w http.ResponseWriter, r *http.Request, p params) error {
	aid := p.get("aid")
	if aid == names.UplinkKey {
		return apierr.Forbidden("policy", "the uplink network is created by gateway ensure")
	}
	var req NetworkRequest
	if err := decode(r, &req, false); err != nil {
		return err
	}
	spec, err := policy.AccountNetwork(s.n, aid, policy.NetworkInput{Subnet: req.Subnet, Gateway: req.Gateway, PolicyLabel: req.PolicyLabel})
	if err != nil {
		return apierr.Invalid(err.Error())
	}
	unlock, err := s.lock(r.Context(), aid)
	if err != nil {
		return err
	}
	defer unlock()
	raw, err := s.CreateNetwork(r.Context(), spec)
	if err != nil {
		return err
	}
	writeJSON(w, 201, jsonRaw(raw))
	return nil
}

func (s *Server) deleteNetwork(w http.ResponseWriter, r *http.Request, p params) error {
	aid := p.get("aid")
	var name string
	switch r.URL.Query().Get("role") {
	case "net":
		name = s.n.Net(aid)
	case "uplink":
		name = s.n.LegacyUplink(aid)
	default:
		return apierr.Invalid("role must be net or uplink")
	}
	ctx := r.Context()
	unlock, err := s.lock(ctx, aid)
	if err != nil {
		return err
	}
	defer unlock()
	_, n, err := s.network(ctx, name, aid)
	if err != nil {
		return err
	}
	if n == nil {
		return apierr.NotFound("network", "network not found")
	}
	list, err := s.D.ContainerList(ctx, dockerapi.Filters{"network": {n.ID}}, true)
	if err != nil {
		return dockerErr(err)
	}
	list = s.removeExitedOneshots(ctx, list)
	var users []dockerapi.ContainerSummary
	gwAttached := false
	for _, c := range list {
		if c.Name() == s.n.Gateway() {
			gwAttached = true
			continue
		}
		users = append(users, c)
	}
	for _, ep := range n.Containers {
		if ep.Name == s.n.Gateway() {
			gwAttached = true
		}
	}
	if len(users) > 0 {
		return apierr.Conflict("resource_in_use", "network has other endpoints").With(sortedNames(users)...)
	}
	if gwAttached {
		gunlock, err := s.lock(ctx, gatewayLockKey)
		if err != nil {
			return err
		}
		err = s.D.NetworkDisconnect(ctx, n.ID, s.n.Gateway(), true)
		gunlock()
		if err != nil && !dockerapi.IsNotFound(err) {
			return dockerErr(err)
		}
	}
	if err := s.D.NetworkRemove(ctx, n.ID); err != nil {
		switch {
		case dockerapi.IsNotFound(err):
		case dockerapi.StatusOf(err) == http.StatusConflict || dockerapi.StatusOf(err) == http.StatusForbidden:
			return apierr.Conflict("resource_in_use", "network has active endpoints").With(name)
		default:
			return dockerErr(err)
		}
	}
	s.FW.Recompute("network_deleted", aid)
	return noContent(w)
}

const gatewayLockKey = "<gateway>"

// ---- accounts: volume ----

func (s *Server) putVolume(w http.ResponseWriter, r *http.Request, p params) error {
	aid := p.get("aid")
	var req VolumeRequest
	if err := decode(r, &req, false); err != nil {
		return err
	}
	if req.SizeBytes < policy.VolumeMin || req.SizeBytes > policy.VolumeMax {
		return apierr.Invalid("size_bytes must be 1 GiB to 1 TiB")
	}
	ctx := r.Context()
	unlock, err := s.lock(ctx, aid)
	if err != nil {
		return err
	}
	defer unlock()
	raw, _, err := s.volume(ctx, aid)
	if err != nil {
		return err
	}
	if raw != nil {
		writeJSON(w, 200, VolumeResult{Volume: jsonRaw(raw), Created: false})
		return nil
	}
	supported := true
	raw, err = s.D.VolumeCreate(ctx, policy.Volume(s.n, aid, req.SizeBytes, true))
	if err != nil {
		if !containsFold(dockerapi.MessageOf(err), "no quota support") {
			return dockerErr(err)
		}
		if !req.AllowUnbounded {
			return apierr.ErrQuota
		}
		supported = false
		raw, err = s.D.VolumeCreate(ctx, policy.Volume(s.n, aid, 0, false))
		if err != nil {
			return dockerErr(err)
		}
	}
	writeJSON(w, 201, VolumeResult{Volume: jsonRaw(raw), Created: true, QuotaSupported: &supported})
	return nil
}

func (s *Server) deleteVolume(w http.ResponseWriter, r *http.Request, p params) error {
	aid := p.get("aid")
	ctx := r.Context()
	unlock, err := s.lock(ctx, aid)
	if err != nil {
		return err
	}
	defer unlock()
	raw, _, err := s.volume(ctx, aid)
	if err != nil {
		return err
	}
	if raw == nil {
		return apierr.NotFound("volume", "volume not found")
	}
	name := s.n.Volume(aid)
	list, err := s.D.ContainerList(ctx, dockerapi.Filters{"volume": {name}}, true)
	if err != nil {
		return dockerErr(err)
	}
	list = s.removeExitedOneshots(ctx, list)
	if len(list) > 0 {
		return apierr.Conflict("resource_in_use", "volume is in use").With(sortedNames(list)...)
	}
	if err := s.D.VolumeRemove(ctx, name); err != nil {
		switch {
		case dockerapi.IsNotFound(err):
		case dockerapi.StatusOf(err) == http.StatusConflict:
			return apierr.Conflict("resource_in_use", "volume is in use").With(name)
		default:
			return dockerErr(err)
		}
	}
	return noContent(w)
}

// ---- accounts: app ----

func (s *Server) putApp(w http.ResponseWriter, r *http.Request, p params) error {
	aid := p.get("aid")
	var req AppRequest
	if err := decode(r, &req, false); err != nil {
		return err
	}
	ip, err := parseIPv4(req.IPv4, "ipv4")
	if err != nil {
		return err
	}
	in := policy.AppInput{Image: req.Image, IPv4: ip, Env: req.Env, AuthLabel: req.AuthLabel, ImageLabel: req.ImageLabel,
		MemoryBytes: req.MemoryBytes, NanoCPUs: req.NanoCPUs}
	spec, err := policy.App(s.n, s.Cfg.RuntimeRoot, aid, in)
	if err != nil {
		return apierr.Invalid(err.Error())
	}
	ctx := r.Context()
	unlock, err := s.lock(ctx, aid)
	if err != nil {
		return err
	}
	defer unlock()
	net, sub, err := s.accountNet(ctx, aid)
	if err != nil {
		return err
	}
	if err := inSubnet(ip, sub, "ipv4"); err != nil {
		return err
	}
	if _, used := endpointIPs(net)[ip]; used {
		return apierr.Invalid("ipv4 already in use on the account network")
	}
	volRaw, _, err := s.volume(ctx, aid)
	if err != nil {
		return err
	}
	if volRaw == nil {
		return apierr.NotFound("volume", "account volume not found")
	}
	if err := s.Files.VerifyResolv(aid); err != nil {
		return mountRejected(err)
	}
	if _, _, err := s.D.ImageInspect(ctx, req.Image); err != nil {
		if dockerapi.IsNotFound(err) {
			return apierr.NotFound("image", "image not found")
		}
		return dockerErr(err)
	}
	name := s.n.App(aid)
	if _, c, err := s.container(ctx, name, aid); err != nil {
		return err
	} else if c != nil {
		return apierr.Conflict("exists", "account container already exists").With(name)
	}
	if _, err := s.D.ContainerCreate(ctx, name, spec); err != nil {
		if dockerapi.StatusOf(err) == http.StatusConflict {
			return apierr.Conflict("exists", "account container already exists").With(name)
		}
		return dockerErr(err)
	}
	raw, _, err := s.D.ContainerInspect(ctx, name)
	if err != nil {
		return dockerErr(err)
	}
	writeJSON(w, 201, jsonRaw(raw))
	return nil
}

// appMounts: exactly the resolv.conf bind and the account volume (03 §3.5.7).
func (s *Server) appMounts(aid string, c *dockerapi.ContainerInfo) error {
	if len(c.Mounts) != 2 {
		return apierr.Forbidden("mount_source_rejected", "unexpected container mounts")
	}
	var bind, vol bool
	for _, m := range c.Mounts {
		switch {
		case m.Type == "bind" && m.Source == s.Cfg.RuntimeRoot+"/"+aid+"/resolv.conf" && m.Destination == "/etc/resolv.conf" && !m.RW:
			bind = true
		case m.Type == "volume" && m.Name == s.n.Volume(aid) && m.Destination == "/work":
			vol = true
		}
	}
	if !bind || !vol {
		return apierr.Forbidden("mount_source_rejected", "unexpected container mounts")
	}
	return nil
}

func (s *Server) appAction(w http.ResponseWriter, r *http.Request, p params) error {
	aid, action := p.get("aid"), p.get("action")
	if action != "start" && action != "stop" && action != "restart" {
		return apierr.NotFound("", "no such endpoint")
	}
	var req ActionRequest
	if err := decode(r, &req, true); err != nil {
		return err
	}
	timeout := int64(10)
	if req.Timeout != nil {
		timeout = *req.Timeout
	}
	if timeout < 0 || timeout > 120 {
		return apierr.Invalid("timeout must be 0 to 120")
	}
	ctx := r.Context()
	unlock, err := s.lock(ctx, aid)
	if err != nil {
		return err
	}
	defer unlock()
	c, err := s.app(ctx, aid)
	if err != nil {
		return err
	}
	if action != "stop" {
		if err := s.appMounts(aid, c); err != nil {
			return err
		}
		if err := s.Files.VerifyResolv(aid); err != nil {
			return mountRejected(err)
		}
	}
	dctx, cancel := context.WithTimeout(ctx, actionTimeout(timeout))
	defer cancel()
	switch action {
	case "start":
		err = s.D.ContainerStart(dctx, c.ID)
	case "stop":
		err = s.D.ContainerStop(dctx, c.ID, int(timeout))
	case "restart":
		err = s.D.ContainerRestart(dctx, c.ID, int(timeout))
	}
	s.FW.InvalidateRoute(aid)
	s.FW.Recompute("app_"+action, aid)
	if err != nil {
		return dockerErr(err)
	}
	return noContent(w)
}

func (s *Server) deleteContainer(w http.ResponseWriter, r *http.Request, p params) error {
	aid, suffix := p.get("aid"), p.get("suffix")
	if !names.ContainerRole.MatchString(suffix) {
		return apierr.Invalid("invalid container suffix")
	}
	ctx := r.Context()
	unlock, err := s.lock(ctx, aid)
	if err != nil {
		return err
	}
	defer unlock()
	name := s.n.Container(aid, suffix)
	_, c, err := s.container(ctx, name, aid)
	if err != nil {
		return err
	}
	if c == nil {
		return apierr.NotFound("container", "container not found")
	}
	if err := s.D.ContainerRemove(ctx, c.ID, true, false); err != nil && !dockerapi.IsNotFound(err) {
		return dockerErr(err)
	}
	s.FW.Recompute("container_deleted", aid)
	return noContent(w)
}

func checkExecUser(u string) error {
	if u != "" && u != "0" && u != "1000" {
		return apierr.Invalid(`user must be "", "0" or "1000"`)
	}
	return nil
}

func (s *Server) exec(ctx context.Context, id string, argv []string, user string) (ExecResult, error) {
	ctx, cancel := context.WithTimeout(ctx, s.ExecTimeout)
	defer cancel()
	code, out, err := s.D.Exec(ctx, id, argv, user, execOutputMax)
	switch {
	case err == nil:
		return ExecResult{ExitCode: code, Output: base64.StdEncoding.EncodeToString(out)}, nil
	case errors.Is(err, dockerapi.ErrNotRunning):
		return ExecResult{}, apierr.Conflict("not_running", "container is not running")
	case errors.Is(err, dockerapi.ErrOutputTooLarge):
		return ExecResult{}, apierr.Docker("output_too_large", "exec output exceeds 16 MiB")
	case errors.Is(err, context.DeadlineExceeded) || ctx.Err() == context.DeadlineExceeded:
		return ExecResult{}, apierr.Timeout("exec_timeout", "exec exceeded the time limit")
	}
	return ExecResult{}, dockerErr(err)
}

func (s *Server) appExec(w http.ResponseWriter, r *http.Request, p params) error {
	aid := p.get("aid")
	var req ExecRequest
	if err := decode(r, &req, false); err != nil {
		return err
	}
	if err := policy.CheckArgv(req.Argv, 1, 256); err != nil {
		return apierr.Invalid(err.Error())
	}
	if err := checkExecUser(req.User); err != nil {
		return err
	}
	c, err := s.runningApp(r.Context(), aid)
	if err != nil {
		return err
	}
	res, err := s.exec(r.Context(), c.ID, req.Argv, req.User)
	if err != nil {
		return err
	}
	writeJSON(w, 200, res)
	return nil
}

func (s *Server) appTop(w http.ResponseWriter, r *http.Request, p params) error {
	c, err := s.runningApp(r.Context(), p.get("aid"))
	if err != nil {
		return err
	}
	raw, err := s.D.ContainerTop(r.Context(), c.ID, "-eo pid,comm")
	if err != nil {
		if dockerapi.StatusOf(err) == http.StatusConflict {
			return apierr.Conflict("not_running", "container is not running")
		}
		return dockerErr(err)
	}
	writeJSON(w, 200, jsonRaw(raw))
	return nil
}

func (s *Server) putResolv(w http.ResponseWriter, r *http.Request, p params) error {
	aid := p.get("aid")
	var req ResolvRequest
	if err := decode(r, &req, false); err != nil {
		return err
	}
	ip, err := parseIPv4(req.Nameserver, "nameserver")
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
	if err := inSubnet(ip, sub, "nameserver"); err != nil {
		return err
	}
	replaced, err := s.Files.WriteResolv(aid, resolvContent(ip))
	if err != nil {
		return mountRejected(err)
	}
	if replaced {
		s.Log.Alert("mount_source_replaced", map[string]any{"aid": aid})
		return apierr.Conflict("mount_source_replaced", "resolv.conf was replaced; the running container must be recreated").With(s.n.App(aid))
	}
	return noContent(w)
}

func resolvContent(ip netip.Addr) []byte {
	return []byte("nameserver " + ip.String() + "\noptions timeout:2 attempts:2\n")
}

func containsFold(s, sub string) bool {
	return len(sub) <= len(s) && indexFold(s, sub) >= 0
}

func indexFold(s, sub string) int {
	ls, lsub := toLower(s), toLower(sub)
	for i := 0; i+len(lsub) <= len(ls); i++ {
		if ls[i:i+len(lsub)] == lsub {
			return i
		}
	}
	return -1
}

func toLower(s string) string {
	b := []byte(s)
	for i, c := range b {
		if c >= 'A' && c <= 'Z' {
			b[i] = c + 32
		}
	}
	return string(b)
}
