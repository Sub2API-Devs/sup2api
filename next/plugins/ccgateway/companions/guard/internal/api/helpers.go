package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/netip"
	"net/url"
	"sort"
	"strings"
	"time"

	"ccgateway/guard/internal/apierr"
	"ccgateway/guard/internal/config"
	"ccgateway/guard/internal/dockerapi"
	"ccgateway/guard/internal/files"
	"ccgateway/guard/internal/names"
	"ccgateway/guard/internal/policy"
)

func parseQuery(raw string) (map[string][]string, error) { return url.ParseQuery(raw) }

func dockerErr(err error) error {
	if e, ok := apierr.As(err); ok {
		return e
	}
	if err == context.DeadlineExceeded {
		return apierr.Timeout("", "docker request timed out")
	}
	return apierr.ErrDocker
}

func ownership(name string) error {
	return apierr.Conflict("ownership_mismatch", "resource belongs to another owner").With(name)
}

// container inspects a container by its guard-built name. A missing
// container is (nil, nil, nil); a wrong account label is 409.
func (s *Server) container(ctx context.Context, name, aid string) (dockerapi.Raw, *dockerapi.ContainerInfo, error) {
	raw, c, err := s.D.ContainerInspect(ctx, name)
	if err != nil {
		if dockerapi.IsNotFound(err) {
			return nil, nil, nil
		}
		return nil, nil, dockerErr(err)
	}
	if c.TrimName() != name {
		return nil, nil, nil
	}
	if c.Label(names.LabelAccount) != aid {
		return nil, nil, ownership(name)
	}
	return raw, c, nil
}

// app is the account container, 404 container when missing.
func (s *Server) app(ctx context.Context, aid string) (*dockerapi.ContainerInfo, error) {
	_, c, err := s.container(ctx, s.n.App(aid), aid)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, apierr.NotFound("container", "account container not found")
	}
	return c, nil
}

func (s *Server) runningApp(ctx context.Context, aid string) (*dockerapi.ContainerInfo, error) {
	c, err := s.app(ctx, aid)
	if err != nil {
		return nil, err
	}
	if !c.State.Running {
		return nil, apierr.Conflict("not_running", "account container is not running")
	}
	return c, nil
}

// network inspects a network by name; missing = nil; label mismatch 409.
func (s *Server) network(ctx context.Context, name, aid string) (dockerapi.Raw, *dockerapi.NetworkInfo, error) {
	raw, n, err := s.D.NetworkInspect(ctx, name)
	if err != nil {
		if dockerapi.IsNotFound(err) {
			return nil, nil, nil
		}
		return nil, nil, dockerErr(err)
	}
	if n.Name != name {
		return nil, nil, nil
	}
	if n.Label(names.LabelAccount) != aid {
		return nil, nil, ownership(name)
	}
	return raw, n, nil
}

// accountNet is <p>-<aid>-net with its subnet, 404 network when missing.
func (s *Server) accountNet(ctx context.Context, aid string) (*dockerapi.NetworkInfo, netip.Prefix, error) {
	_, n, err := s.network(ctx, s.n.Net(aid), aid)
	if err != nil {
		return nil, netip.Prefix{}, err
	}
	if n == nil {
		return nil, netip.Prefix{}, apierr.NotFound("network", "account network not found")
	}
	for _, c := range n.IPAM.Config {
		if p, err := netip.ParsePrefix(c.Subnet); err == nil && p.Addr().Is4() {
			return n, p.Masked(), nil
		}
	}
	return nil, netip.Prefix{}, apierr.ErrDocker
}

func (s *Server) volume(ctx context.Context, aid string) (dockerapi.Raw, *dockerapi.VolumeInfo, error) {
	name := s.n.Volume(aid)
	raw, v, err := s.D.VolumeInspect(ctx, name)
	if err != nil {
		if dockerapi.IsNotFound(err) {
			return nil, nil, nil
		}
		return nil, nil, dockerErr(err)
	}
	if v.Name != name {
		return nil, nil, nil
	}
	if v.Labels[names.LabelAccount] != aid {
		return nil, nil, ownership(name)
	}
	return raw, v, nil
}

// endpointIPs are the addresses in use on a network.
func endpointIPs(n *dockerapi.NetworkInfo) map[netip.Addr]string {
	out := map[netip.Addr]string{}
	for _, ep := range n.Containers {
		a, _, _ := strings.Cut(ep.IPv4Address, "/")
		if ip, err := netip.ParseAddr(a); err == nil {
			out[ip] = ep.Name
		}
	}
	return out
}

func parseIPv4(s, field string) (netip.Addr, error) {
	ip, err := netip.ParseAddr(s)
	if err != nil || !ip.Is4() {
		return netip.Addr{}, apierr.Invalid(field + " must be an IPv4 address")
	}
	return ip, nil
}

func inSubnet(ip netip.Addr, sub netip.Prefix, field string) error {
	if err := policy.InSubnet(ip, sub); err != nil {
		return apierr.Invalid(field + " outside account subnet or reserved")
	}
	return nil
}

func validPath(p string) bool {
	return config.AbsClean(p) && len(p) <= 4096
}

func mountRejected(err error) error {
	if _, ok := files.IsRejected(err); ok {
		return apierr.Forbidden("mount_source_rejected", "mount source rejected")
	}
	return dockerErr(err)
}

// removeExitedOneshots deletes stopped <p>-oneshot-* containers among
// the summaries (R15) and returns the others.
func (s *Server) removeExitedOneshots(ctx context.Context, list []dockerapi.ContainerSummary) []dockerapi.ContainerSummary {
	var rest []dockerapi.ContainerSummary
	for _, c := range list {
		if s.n.IsOneshot(c.Name()) && c.State != "running" && c.State != "restarting" && c.State != "paused" {
			if err := s.D.ContainerRemove(ctx, c.ID, true, false); err == nil || dockerapi.IsNotFound(err) {
				continue
			}
		}
		rest = append(rest, c)
	}
	return rest
}

func sortedNames(list []dockerapi.ContainerSummary) []string {
	out := make([]string, 0, len(list))
	for _, c := range list {
		out = append(out, c.Name())
	}
	sort.Strings(out)
	return out
}

// idleReader cancels when no read succeeds for idle.
type idleReader struct {
	r     io.Reader
	timer *time.Timer
	idle  time.Duration
}

func newIdleReader(r io.Reader, idle time.Duration, cancel func()) *idleReader {
	return &idleReader{r: r, idle: idle, timer: time.AfterFunc(idle, cancel)}
}

func (i *idleReader) Read(p []byte) (int, error) {
	n, err := i.r.Read(p)
	if n > 0 {
		i.timer.Reset(i.idle)
	}
	return n, err
}

func (i *idleReader) stop() { i.timer.Stop() }

// bodyReader extends the connection's read deadline by idle on every read
// (03 §3.1: streaming endpoints use a 120 s idle deadline).
type bodyReader struct {
	r    io.Reader
	rc   *http.ResponseController
	idle time.Duration
}

func (s *Server) idleBody(w http.ResponseWriter, r *http.Request) io.Reader {
	return &bodyReader{r: r.Body, rc: http.NewResponseController(w), idle: s.IdleTimeout}
}

func (b *bodyReader) Read(p []byte) (int, error) {
	_ = b.rc.SetReadDeadline(time.Now().Add(b.idle))
	return b.r.Read(p)
}

// idleWriter extends the write deadline on every write.
type idleWriter struct {
	w    io.Writer
	rc   *http.ResponseController
	idle time.Duration
}

func (s *Server) idleOut(w http.ResponseWriter) io.Writer {
	return &idleWriter{w: w, rc: http.NewResponseController(w), idle: s.IdleTimeout}
}

func (i *idleWriter) Write(p []byte) (int, error) {
	_ = i.rc.SetWriteDeadline(time.Now().Add(i.idle))
	return i.w.Write(p)
}

func rawOrNull(r dockerapi.Raw) json.RawMessage {
	if r == nil {
		return json.RawMessage("null")
	}
	return json.RawMessage(r)
}
