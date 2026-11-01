// Package dockerapi is the guard's minimal Docker Engine API client over the
// unix socket (03 §5). It only exports the calls listed in §5.2; every
// request path is checked against that list before it is sent.
package dockerapi

import (
	"bufio"
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"ccgateway/guard/internal/policy"
)

// Version is the fixed Engine API version. It is the version the Python
// controller (docker-py 7.1.0, version=auto) negotiated with ovh's Docker
// 29.5.2, read in S0 (03 §5.1): inspect bodies must have the same shape.
const Version = "1.54"

const (
	maxInspect   = 8 << 20
	maxErrorBody = 64 << 10
	maxLine      = 1 << 20
)

var (
	// ErrNotRunning is exec's 409 (container not running).
	ErrNotRunning = errors.New("container is not running")
	// ErrOutputTooLarge means a stream exceeded the caller's limit.
	ErrOutputTooLarge = errors.New("output too large")
	// ErrProtocol is a malformed stream from the daemon.
	ErrProtocol = errors.New("docker stream protocol error")
	// ErrForbiddenPath is a request outside the §5.2 list (a guard bug).
	ErrForbiddenPath = errors.New("docker path not allowed")
)

// Error is a non-2xx answer. Message is only for internal decisions and
// debug logs, never for API answers (03 §5.1).
type Error struct {
	Status  int
	Message string
}

func (e *Error) Error() string { return fmt.Sprintf("docker %d: %s", e.Status, e.Message) }

// StatusOf returns the Docker status of err, 0 when it is not an *Error.
func StatusOf(err error) int {
	var e *Error
	if errors.As(err, &e) {
		return e.Status
	}
	return 0
}

// IsNotFound reports a Docker 404.
func IsNotFound(err error) bool { return StatusOf(err) == http.StatusNotFound }

// MessageOf returns Docker's message ("" when err is not an *Error).
func MessageOf(err error) string {
	var e *Error
	if errors.As(err, &e) {
		return e.Message
	}
	return ""
}

// Client talks to one daemon.
type Client struct {
	hc   *http.Client
	base string
	// Timeout is the default per-call limit (docker-py's 60 s).
	Timeout time.Duration
}

// New returns a client for the unix socket path.
func New(socket string) *Client {
	return NewDialer(func(ctx context.Context) (net.Conn, error) {
		var d net.Dialer
		return d.DialContext(ctx, "unix", socket)
	})
}

// NewDialer returns a client using dial for every connection (tests use TCP).
func NewDialer(dial func(ctx context.Context) (net.Conn, error)) *Client {
	tr := &http.Transport{
		DialContext:         func(ctx context.Context, _, _ string) (net.Conn, error) { return dial(ctx) },
		Proxy:               nil,
		DisableCompression:  true,
		MaxIdleConnsPerHost: 16,
		IdleConnTimeout:     90 * time.Second,
		ForceAttemptHTTP2:   false,
	}
	return &Client{hc: &http.Client{Transport: tr}, base: "http://docker", Timeout: 60 * time.Second}
}

type route struct {
	method string
	re     *regexp.Regexp
}

// allowed is §5.2 (paths after the version prefix).
var allowed = []route{
	{"GET", regexp.MustCompile(`^/containers/[A-Za-z0-9_.-]+/json$`)},
	{"POST", regexp.MustCompile(`^/containers/create$`)},
	{"POST", regexp.MustCompile(`^/containers/[A-Za-z0-9_.-]+/(start|stop|restart|kill|wait)$`)},
	{"DELETE", regexp.MustCompile(`^/containers/[A-Za-z0-9_.-]+$`)},
	{"GET", regexp.MustCompile(`^/containers/json$`)},
	{"GET", regexp.MustCompile(`^/containers/[A-Za-z0-9_.-]+/(top|logs)$`)},
	{"GET", regexp.MustCompile(`^/containers/[A-Za-z0-9_.-]+/archive$`)},
	{"PUT", regexp.MustCompile(`^/containers/[A-Za-z0-9_.-]+/archive$`)},
	{"POST", regexp.MustCompile(`^/containers/[A-Za-z0-9_.-]+/exec$`)},
	{"POST", regexp.MustCompile(`^/exec/[0-9a-f]+/start$`)},
	{"GET", regexp.MustCompile(`^/exec/[0-9a-f]+/json$`)},
	{"GET", regexp.MustCompile(`^/networks$`)},
	{"GET", regexp.MustCompile(`^/networks/[A-Za-z0-9_.-]+$`)},
	{"POST", regexp.MustCompile(`^/networks/create$`)},
	{"DELETE", regexp.MustCompile(`^/networks/[A-Za-z0-9_.-]+$`)},
	{"POST", regexp.MustCompile(`^/networks/[A-Za-z0-9_.-]+/(connect|disconnect)$`)},
	{"GET", regexp.MustCompile(`^/volumes$`)},
	{"GET", regexp.MustCompile(`^/volumes/[A-Za-z0-9_.-]+$`)},
	{"POST", regexp.MustCompile(`^/volumes/create$`)},
	{"DELETE", regexp.MustCompile(`^/volumes/[A-Za-z0-9_.-]+$`)},
	{"GET", regexp.MustCompile(`^/images/[a-z0-9][a-z0-9._/:@-]*/json$`)},
	{"POST", regexp.MustCompile(`^/images/create$`)},
	{"POST", regexp.MustCompile(`^/images/load$`)},
	{"GET", regexp.MustCompile(`^/events$`)},
}

// Allowed reports whether method and path (without the version prefix) are
// in the §5.2 list. Exported for the request-path tests.
func Allowed(method, path string) bool {
	if method == "GET" && path == "/version" {
		return true
	}
	for _, r := range allowed {
		if r.method == method && r.re.MatchString(path) {
			return true
		}
	}
	return false
}

type request struct {
	method   string
	path     string
	query    url.Values
	body     io.Reader
	length   int64 // -1 = unknown
	ctype    string
	header   http.Header
	versionl bool // send without the version prefix (GET /version)
}

func (c *Client) send(ctx context.Context, r request) (*http.Response, error) {
	if !Allowed(r.method, r.path) {
		return nil, ErrForbiddenPath
	}
	u := c.base
	if !r.versionl {
		u += "/v" + Version
	}
	u += r.path
	if len(r.query) > 0 {
		u += "?" + r.query.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, r.method, u, r.body)
	if err != nil {
		return nil, err
	}
	if r.body != nil && r.length >= 0 {
		req.ContentLength = r.length
	}
	for k, vs := range r.header {
		for _, v := range vs {
			req.Header.Add(k, v)
		}
	}
	if r.ctype != "" {
		req.Header.Set("Content-Type", r.ctype)
	}
	resp, err := c.hc.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 300 && resp.StatusCode != http.StatusNotModified && resp.StatusCode != http.StatusSwitchingProtocols {
		defer resp.Body.Close()
		b, _ := io.ReadAll(io.LimitReader(resp.Body, maxErrorBody))
		var m struct {
			Message string `json:"message"`
		}
		if json.Unmarshal(b, &m) != nil || m.Message == "" {
			m.Message = strings.TrimSpace(string(b))
		}
		return nil, &Error{Status: resp.StatusCode, Message: m.Message}
	}
	return resp, nil
}

func (c *Client) ctx(ctx context.Context) (context.Context, context.CancelFunc) {
	if _, ok := ctx.Deadline(); ok || c.Timeout <= 0 {
		return context.WithCancel(ctx)
	}
	return context.WithTimeout(ctx, c.Timeout)
}

// call performs a request and returns the (bounded) body.
func (c *Client) call(ctx context.Context, r request) ([]byte, int, error) {
	ctx, cancel := c.ctx(ctx)
	defer cancel()
	resp, err := c.send(ctx, r)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(io.LimitReader(resp.Body, maxInspect+1))
	if err != nil {
		return nil, resp.StatusCode, err
	}
	if len(b) > maxInspect {
		return nil, resp.StatusCode, ErrOutputTooLarge
	}
	return b, resp.StatusCode, nil
}

func jsonBody(v any) (io.Reader, int64, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return nil, 0, err
	}
	return bytes.NewReader(b), int64(len(b)), nil
}

func rawObject(b []byte) (Raw, error) {
	b = bytes.TrimSpace(b)
	if len(b) == 0 || b[0] != '{' || !json.Valid(b) {
		return nil, ErrProtocol
	}
	return Raw(b), nil
}

func filterQuery(q url.Values, f Filters) {
	if len(f) == 0 {
		return
	}
	b, _ := json.Marshal(f)
	q.Set("filters", string(b))
}

// Version returns the daemon's version (unversioned GET /version).
func (c *Client) Version(ctx context.Context) (VersionInfo, error) {
	var v VersionInfo
	b, _, err := c.call(ctx, request{method: "GET", path: "/version", versionl: true})
	if err != nil {
		return v, err
	}
	err = json.Unmarshal(b, &v)
	return v, err
}

// ContainerInspect returns the raw inspect and the decoded subset.
func (c *Client) ContainerInspect(ctx context.Context, idOrName string) (Raw, *ContainerInfo, error) {
	b, _, err := c.call(ctx, request{method: "GET", path: "/containers/" + idOrName + "/json"})
	if err != nil {
		return nil, nil, err
	}
	raw, err := rawObject(b)
	if err != nil {
		return nil, nil, err
	}
	var info ContainerInfo
	if err := json.Unmarshal(raw, &info); err != nil {
		return nil, nil, ErrProtocol
	}
	return raw, &info, nil
}

// ContainerCreate creates a container from a policy spec.
func (c *Client) ContainerCreate(ctx context.Context, name string, spec policy.ContainerSpec) (string, error) {
	body, n, err := jsonBody(spec)
	if err != nil {
		return "", err
	}
	b, _, err := c.call(ctx, request{method: "POST", path: "/containers/create", query: url.Values{"name": {name}},
		body: body, length: n, ctype: "application/json"})
	if err != nil {
		return "", err
	}
	var out struct {
		ID string `json:"Id"`
	}
	if json.Unmarshal(b, &out) != nil || out.ID == "" {
		return "", ErrProtocol
	}
	return out.ID, nil
}

func (c *Client) post(ctx context.Context, path string, q url.Values) error {
	_, _, err := c.call(ctx, request{method: "POST", path: path, query: q})
	return err
}

// ContainerStart starts a container; 304 (already running) is success.
func (c *Client) ContainerStart(ctx context.Context, id string) error {
	return c.post(ctx, "/containers/"+id+"/start", nil)
}

// ContainerStop stops with a grace period; 304 is success.
func (c *Client) ContainerStop(ctx context.Context, id string, timeout int) error {
	return c.post(ctx, "/containers/"+id+"/stop", url.Values{"t": {strconv.Itoa(timeout)}})
}

// ContainerRestart restarts with a grace period.
func (c *Client) ContainerRestart(ctx context.Context, id string, timeout int) error {
	return c.post(ctx, "/containers/"+id+"/restart", url.Values{"t": {strconv.Itoa(timeout)}})
}

// ContainerKill sends SIGKILL.
func (c *Client) ContainerKill(ctx context.Context, id string) error {
	return c.post(ctx, "/containers/"+id+"/kill", nil)
}

// ContainerWait waits until the container is not running.
func (c *Client) ContainerWait(ctx context.Context, id string) (int, error) {
	resp, err := c.send(ctx, request{method: "POST", path: "/containers/" + id + "/wait",
		query: url.Values{"condition": {"not-running"}}})
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	var out struct {
		StatusCode int `json:"StatusCode"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxErrorBody)).Decode(&out); err != nil {
		return 0, ErrProtocol
	}
	return out.StatusCode, nil
}

// ContainerRemove deletes a container.
func (c *Client) ContainerRemove(ctx context.Context, id string, force, volumes bool) error {
	q := url.Values{"force": {b01(force)}, "v": {b01(volumes)}}
	_, _, err := c.call(ctx, request{method: "DELETE", path: "/containers/" + id, query: q})
	return err
}

func b01(b bool) string {
	if b {
		return "1"
	}
	return "0"
}

// ContainerList lists containers.
func (c *Client) ContainerList(ctx context.Context, f Filters, all bool) ([]ContainerSummary, error) {
	q := url.Values{}
	if all {
		q.Set("all", "1")
	}
	filterQuery(q, f)
	b, _, err := c.call(ctx, request{method: "GET", path: "/containers/json", query: q})
	if err != nil {
		return nil, err
	}
	var out []ContainerSummary
	if err := json.Unmarshal(b, &out); err != nil {
		return nil, ErrProtocol
	}
	return out, nil
}

// ContainerTop returns Docker's {Titles, Processes} as is.
func (c *Client) ContainerTop(ctx context.Context, id, psArgs string) (Raw, error) {
	b, _, err := c.call(ctx, request{method: "GET", path: "/containers/" + id + "/top", query: url.Values{"ps_args": {psArgs}}})
	if err != nil {
		return nil, err
	}
	return rawObject(b)
}

// ContainerLogs returns the stdout frames of a non-TTY container, at most
// limit bytes (ErrOutputTooLarge beyond).
func (c *Client) ContainerLogs(ctx context.Context, id string, limit int64) ([]byte, error) {
	ctx, cancel := c.ctx(ctx)
	defer cancel()
	resp, err := c.send(ctx, request{method: "GET", path: "/containers/" + id + "/logs",
		query: url.Values{"stdout": {"1"}, "stderr": {"0"}}})
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return ReadFrames(resp.Body, limit, func(s byte) bool { return s == 1 })
}

// ArchiveGet streams a tar of path. The caller closes the body.
func (c *Client) ArchiveGet(ctx context.Context, id, path string) (io.ReadCloser, http.Header, error) {
	resp, err := c.send(ctx, request{method: "GET", path: "/containers/" + id + "/archive", query: url.Values{"path": {path}}})
	if err != nil {
		return nil, nil, err
	}
	return resp.Body, resp.Header, nil
}

// ArchivePut extracts a tar into the directory path.
func (c *Client) ArchivePut(ctx context.Context, id, path string, body io.Reader, size int64) error {
	resp, err := c.send(ctx, request{method: "PUT", path: "/containers/" + id + "/archive", query: url.Values{"path": {path}},
		body: body, length: size, ctype: "application/x-tar"})
	if err != nil {
		return err
	}
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, maxErrorBody))
	return resp.Body.Close()
}

// Exec runs argv in a running container and returns the exit code and the
// stdout and stderr payloads merged in arrival order (R5).
func (c *Client) Exec(ctx context.Context, id string, argv []string, user string, limit int64) (int, []byte, error) {
	body, n, err := jsonBody(map[string]any{
		"AttachStdout": true, "AttachStderr": true, "AttachStdin": false, "Tty": false,
		"Cmd": argv, "User": user, "Privileged": false,
	})
	if err != nil {
		return 0, nil, err
	}
	b, _, err := c.call(ctx, request{method: "POST", path: "/containers/" + id + "/exec", body: body, length: n, ctype: "application/json"})
	if err != nil {
		if StatusOf(err) == http.StatusConflict {
			return 0, nil, ErrNotRunning
		}
		return 0, nil, err
	}
	var created struct {
		ID string `json:"Id"`
	}
	if json.Unmarshal(b, &created) != nil || !hexID.MatchString(created.ID) {
		return 0, nil, ErrProtocol
	}
	start, n, _ := jsonBody(map[string]any{"Detach": false, "Tty": false})
	hdr := http.Header{"Connection": {"Upgrade"}, "Upgrade": {"tcp"}}
	resp, err := c.send(ctx, request{method: "POST", path: "/exec/" + created.ID + "/start", body: start, length: n,
		ctype: "application/json", header: hdr})
	if err != nil {
		if StatusOf(err) == http.StatusConflict {
			return 0, nil, ErrNotRunning
		}
		return 0, nil, err
	}
	stop := context.AfterFunc(ctx, func() { resp.Body.Close() })
	out, err := ReadFrames(resp.Body, limit, func(s byte) bool { return true })
	stop()
	resp.Body.Close()
	if err != nil {
		if ctx.Err() != nil {
			return 0, nil, ctx.Err()
		}
		return 0, nil, err
	}
	for i := 0; ; i++ {
		b, _, err := c.call(ctx, request{method: "GET", path: "/exec/" + created.ID + "/json"})
		if err != nil {
			return 0, nil, err
		}
		var st struct {
			Running  bool `json:"Running"`
			ExitCode int  `json:"ExitCode"`
		}
		if json.Unmarshal(b, &st) != nil {
			return 0, nil, ErrProtocol
		}
		if !st.Running {
			return st.ExitCode, out, nil
		}
		if i >= 10 {
			return 0, nil, ErrProtocol
		}
		select {
		case <-ctx.Done():
			return 0, nil, ctx.Err()
		case <-time.After(100 * time.Millisecond):
		}
	}
}

var hexID = regexp.MustCompile(`^[0-9a-f]{1,128}$`)

// ReadFrames parses Docker's multiplexed stream (03 §5.3): 8-byte headers
// [stream,0,0,0,size BE]. Streams 1 and 2 are valid; keep selects which
// payloads are collected. More than limit collected bytes is
// ErrOutputTooLarge; a truncated frame or another stream id is ErrProtocol.
func ReadFrames(r io.Reader, limit int64, keep func(stream byte) bool) ([]byte, error) {
	var out bytes.Buffer
	var hdr [8]byte
	for {
		n, err := io.ReadFull(r, hdr[:])
		if err == io.EOF && n == 0 {
			return out.Bytes(), nil
		}
		if err != nil {
			return nil, ErrProtocol
		}
		stream := hdr[0]
		if stream != 1 && stream != 2 || hdr[1] != 0 || hdr[2] != 0 || hdr[3] != 0 {
			return nil, ErrProtocol
		}
		size := int64(binary.BigEndian.Uint32(hdr[4:]))
		if !keep(stream) {
			if _, err := io.CopyN(io.Discard, r, size); err != nil {
				return nil, ErrProtocol
			}
			continue
		}
		if int64(out.Len())+size > limit {
			return nil, ErrOutputTooLarge
		}
		if _, err := io.CopyN(&out, r, size); err != nil {
			return nil, ErrProtocol
		}
	}
}

// NetworkList lists all networks (raw rows and decoded subset).
func (c *Client) NetworkList(ctx context.Context, f Filters) ([]Raw, []NetworkInfo, error) {
	q := url.Values{}
	filterQuery(q, f)
	b, _, err := c.call(ctx, request{method: "GET", path: "/networks", query: q})
	if err != nil {
		return nil, nil, err
	}
	var raws []Raw
	var infos []NetworkInfo
	if json.Unmarshal(b, &raws) != nil || json.Unmarshal(b, &infos) != nil {
		return nil, nil, ErrProtocol
	}
	return raws, infos, nil
}

// NetworkInspect returns a network's raw inspect and subset.
func (c *Client) NetworkInspect(ctx context.Context, idOrName string) (Raw, *NetworkInfo, error) {
	b, _, err := c.call(ctx, request{method: "GET", path: "/networks/" + idOrName})
	if err != nil {
		return nil, nil, err
	}
	raw, err := rawObject(b)
	if err != nil {
		return nil, nil, err
	}
	var info NetworkInfo
	if json.Unmarshal(raw, &info) != nil {
		return nil, nil, ErrProtocol
	}
	return raw, &info, nil
}

// NetworkCreate creates a network from a policy spec.
func (c *Client) NetworkCreate(ctx context.Context, spec policy.NetworkSpec) (string, error) {
	body, n, err := jsonBody(spec)
	if err != nil {
		return "", err
	}
	b, _, err := c.call(ctx, request{method: "POST", path: "/networks/create", body: body, length: n, ctype: "application/json"})
	if err != nil {
		return "", err
	}
	var out struct {
		ID string `json:"Id"`
	}
	if json.Unmarshal(b, &out) != nil || out.ID == "" {
		return "", ErrProtocol
	}
	return out.ID, nil
}

// NetworkRemove deletes a network.
func (c *Client) NetworkRemove(ctx context.Context, id string) error {
	_, _, err := c.call(ctx, request{method: "DELETE", path: "/networks/" + id})
	return err
}

// NetworkConnect attaches a container with a fixed IPv4 address.
func (c *Client) NetworkConnect(ctx context.Context, network, container, ipv4 string) error {
	body, n, err := jsonBody(map[string]any{
		"Container":      container,
		"EndpointConfig": map[string]any{"IPAMConfig": map[string]string{"IPv4Address": ipv4}},
	})
	if err != nil {
		return err
	}
	_, _, err = c.call(ctx, request{method: "POST", path: "/networks/" + network + "/connect", body: body, length: n, ctype: "application/json"})
	return err
}

// NetworkDisconnect detaches a container.
func (c *Client) NetworkDisconnect(ctx context.Context, network, container string, force bool) error {
	body, n, err := jsonBody(map[string]any{"Container": container, "Force": force})
	if err != nil {
		return err
	}
	_, _, err = c.call(ctx, request{method: "POST", path: "/networks/" + network + "/disconnect", body: body, length: n, ctype: "application/json"})
	return err
}

// VolumeList lists volumes.
func (c *Client) VolumeList(ctx context.Context, f Filters) ([]Raw, []VolumeInfo, error) {
	q := url.Values{}
	filterQuery(q, f)
	b, _, err := c.call(ctx, request{method: "GET", path: "/volumes", query: q})
	if err != nil {
		return nil, nil, err
	}
	var raws struct {
		Volumes []Raw `json:"Volumes"`
	}
	var infos struct {
		Volumes []VolumeInfo `json:"Volumes"`
	}
	if json.Unmarshal(b, &raws) != nil || json.Unmarshal(b, &infos) != nil {
		return nil, nil, ErrProtocol
	}
	return raws.Volumes, infos.Volumes, nil
}

// VolumeInspect returns a volume's raw inspect and subset.
func (c *Client) VolumeInspect(ctx context.Context, name string) (Raw, *VolumeInfo, error) {
	b, _, err := c.call(ctx, request{method: "GET", path: "/volumes/" + name})
	if err != nil {
		return nil, nil, err
	}
	raw, err := rawObject(b)
	if err != nil {
		return nil, nil, err
	}
	var info VolumeInfo
	if json.Unmarshal(raw, &info) != nil {
		return nil, nil, ErrProtocol
	}
	return raw, &info, nil
}

// VolumeCreate creates a volume from a policy spec and returns its inspect.
func (c *Client) VolumeCreate(ctx context.Context, spec policy.VolumeSpec) (Raw, error) {
	body, n, err := jsonBody(spec)
	if err != nil {
		return nil, err
	}
	b, _, err := c.call(ctx, request{method: "POST", path: "/volumes/create", body: body, length: n, ctype: "application/json"})
	if err != nil {
		return nil, err
	}
	return rawObject(b)
}

// VolumeRemove deletes a volume.
func (c *Client) VolumeRemove(ctx context.Context, name string) error {
	_, _, err := c.call(ctx, request{method: "DELETE", path: "/volumes/" + name})
	return err
}

// ImageInspect returns an image's raw inspect and subset.
func (c *Client) ImageInspect(ctx context.Context, ref string) (Raw, *ImageInfo, error) {
	b, _, err := c.call(ctx, request{method: "GET", path: "/images/" + ref + "/json"})
	if err != nil {
		return nil, nil, err
	}
	raw, err := rawObject(b)
	if err != nil {
		return nil, nil, err
	}
	var info ImageInfo
	if json.Unmarshal(raw, &info) != nil {
		return nil, nil, ErrProtocol
	}
	return raw, &info, nil
}

// ImagePull pulls one image: by digest (fromImage=repo@sha256:..., no tag
// is changed) or by tag (fromImage=repo, tag=tag; never empty, which would
// pull every tag). A progress line with an error fails the pull.
func (c *Client) ImagePull(ctx context.Context, repo, tag, digest string) error {
	q := url.Values{}
	switch {
	case digest != "":
		q.Set("fromImage", repo+"@"+digest)
	case tag != "":
		q.Set("fromImage", repo)
		q.Set("tag", tag)
	default:
		return errors.New("empty tag")
	}
	resp, err := c.send(ctx, request{method: "POST", path: "/images/create", query: q})
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return ReadProgress(resp.Body, nil)
}

// ImageLoad imports an archive and returns the "Loaded image" lines.
func (c *Client) ImageLoad(ctx context.Context, r io.Reader, size int64, ctype string) ([]string, error) {
	resp, err := c.send(ctx, request{method: "POST", path: "/images/load", query: url.Values{"quiet": {"1"}},
		body: r, length: size, ctype: ctype})
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var loaded []string
	err = ReadProgress(resp.Body, func(p Progress) {
		for _, line := range strings.Split(p.Stream, "\n") {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "Loaded image: ") || strings.HasPrefix(line, "Loaded image ID: ") {
				loaded = append(loaded, line)
			}
		}
	})
	return loaded, err
}

// Progress is one line of a pull or load stream (03 §5.4).
type Progress struct {
	Status      string `json:"status"`
	Stream      string `json:"stream"`
	Error       string `json:"error"`
	ErrorDetail *struct {
		Message string `json:"message"`
	} `json:"errorDetail"`
}

// ErrStream is a progress line carrying an error.
type ErrStream struct{ Message string }

func (e *ErrStream) Error() string { return "docker stream error: " + e.Message }

// ReadProgress reads a JSON-lines stream to EOF. The first error line is
// remembered and returned after EOF; an early end is an error.
func ReadProgress(r io.Reader, each func(Progress)) error {
	br := bufio.NewReaderSize(r, 64<<10)
	var first error
	for {
		line, err := readLine(br)
		if err == io.EOF {
			return first
		}
		if err != nil {
			return err
		}
		line = bytes.TrimSpace(line)
		if len(line) == 0 {
			continue
		}
		var p Progress
		if json.Unmarshal(line, &p) != nil {
			return ErrProtocol
		}
		if (p.Error != "" || p.ErrorDetail != nil) && first == nil {
			msg := p.Error
			if msg == "" && p.ErrorDetail != nil {
				msg = p.ErrorDetail.Message
			}
			first = &ErrStream{Message: msg}
		}
		if each != nil {
			each(p)
		}
	}
}

// readLine returns one line (without the newline) of at most maxLine bytes.
// A final line without newline is returned; io.EOF only when nothing is left.
func readLine(br *bufio.Reader) ([]byte, error) {
	var buf []byte
	for {
		chunk, err := br.ReadSlice('\n')
		buf = append(buf, chunk...)
		if len(buf) > maxLine {
			return nil, ErrProtocol
		}
		switch err {
		case nil:
			return buf, nil
		case bufio.ErrBufferFull:
			continue
		case io.EOF:
			if len(buf) == 0 {
				return nil, io.EOF
			}
			return buf, nil
		default:
			if errors.Is(err, io.ErrUnexpectedEOF) {
				return nil, io.ErrUnexpectedEOF
			}
			return nil, err
		}
	}
}

// Events subscribes to container and network events since the given time.
// Both channels are closed when the stream ends; the error channel carries
// at most one value.
func (c *Client) Events(ctx context.Context, since time.Time, f Filters) (<-chan Event, <-chan error) {
	evs := make(chan Event, 64)
	errs := make(chan error, 1)
	go func() {
		defer close(evs)
		defer close(errs)
		q := url.Values{}
		if !since.IsZero() {
			q.Set("since", fmt.Sprintf("%d.%09d", since.Unix(), since.Nanosecond()))
		}
		filterQuery(q, f)
		resp, err := c.send(ctx, request{method: "GET", path: "/events", query: q})
		if err != nil {
			errs <- err
			return
		}
		defer resp.Body.Close()
		dec := json.NewDecoder(resp.Body)
		for {
			var e Event
			if err := dec.Decode(&e); err != nil {
				if ctx.Err() != nil {
					errs <- ctx.Err()
				} else {
					errs <- err
				}
				return
			}
			if i := strings.IndexByte(e.Action, ':'); i >= 0 {
				e.Action = e.Action[:i]
			}
			select {
			case evs <- e:
			case <-ctx.Done():
				errs <- ctx.Err()
				return
			}
		}
	}()
	return evs, errs
}
