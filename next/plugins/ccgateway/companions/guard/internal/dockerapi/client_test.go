package dockerapi_test

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"ccgateway/guard/internal/dockerapi"
	"ccgateway/guard/internal/dockerapi/fakedocker"
	"ccgateway/guard/internal/names"
	"ccgateway/guard/internal/policy"
)

func client(t *testing.T) (*dockerapi.Client, *fakedocker.Fake) {
	f := fakedocker.New()
	f.Start()
	t.Cleanup(f.Close)
	return dockerapi.NewDialer(f.Dial), f
}

// covers: 03§5.2 only the listed Docker paths can be requested
func TestAllowedPaths(t *testing.T) {
	yes := [][2]string{{"GET", "/containers/ccg-21-app/json"}, {"POST", "/containers/create"}, {"POST", "/containers/abc/kill"},
		{"DELETE", "/networks/ccg-21-net"}, {"POST", "/images/load"}, {"GET", "/images/ghcr.io/sub2api-devs/ccgateway-app:1/json"},
		{"POST", "/exec/0123abcd/start"}, {"GET", "/events"}, {"GET", "/version"}}
	no := [][2]string{{"POST", "/containers/abc/update"}, {"POST", "/commit"}, {"POST", "/build"}, {"GET", "/plugins"},
		{"POST", "/swarm/init"}, {"POST", "/images/x/tag"}, {"DELETE", "/images/x"}, {"POST", "/containers/prune"},
		{"GET", "/secrets"}, {"POST", "/containers/abc/attach"}, {"PUT", "/containers/abc/json"}, {"POST", "/volumes/prune"},
		{"GET", "/containers/../version"}, {"POST", "/exec/xyz/resize"}, {"POST", "/system/prune"}}
	for _, c := range yes {
		if !dockerapi.Allowed(c[0], c[1]) {
			t.Errorf("%v rejected", c)
		}
	}
	for _, c := range no {
		if dockerapi.Allowed(c[0], c[1]) {
			t.Errorf("%v allowed", c)
		}
	}
}

// covers: 03§5.1 fixed API version prefix; errors carry status, 304 is success
func TestVersionAndErrors(t *testing.T) {
	c, f := client(t)
	v, err := c.Version(context.Background())
	if err != nil || v.APIVersion != "1.54" {
		t.Fatal(v, err)
	}
	_, _, err = c.ContainerInspect(context.Background(), "missing")
	if !dockerapi.IsNotFound(err) || !strings.Contains(dockerapi.MessageOf(err), "No such container") {
		t.Fatal(err)
	}
	f.AddImage(fakedocker.RandID(), nil, "img:1")
	f.AddContainer(&fakedocker.Container{Name: "x", Status: "running", ConfigImage: "img:1"})
	if err := c.ContainerStart(context.Background(), "x"); err != nil {
		t.Fatal("304 must be success:", err)
	}
	for _, r := range f.Requests {
		if r == "GET /version" {
			continue
		}
		if !strings.HasPrefix(r, "GET /containers") && !strings.HasPrefix(r, "POST /containers") {
			t.Fatal(r)
		}
	}
}

// covers: R5 03§5.3 frame parsing: normal, split reads, half frame, unknown stream, limit
func TestReadFrames(t *testing.T) {
	all := func(byte) bool { return true }
	data := append(append(fakedocker.Frame(1, []byte("out1 ")), fakedocker.Frame(2, []byte("err "))...), fakedocker.Frame(1, []byte("out2"))...)
	got, err := dockerapi.ReadFrames(&oneByte{r: bytes.NewReader(data)}, 1<<20, all)
	if err != nil || string(got) != "out1 err out2" {
		t.Fatalf("%q %v", got, err)
	}
	got, _ = dockerapi.ReadFrames(bytes.NewReader(data), 1<<20, func(s byte) bool { return s == 1 })
	if string(got) != "out1 out2" {
		t.Fatalf("stdout only %q", got)
	}
	if _, err := dockerapi.ReadFrames(bytes.NewReader(data[:len(data)-2]), 1<<20, all); !errors.Is(err, dockerapi.ErrProtocol) {
		t.Fatal("half payload")
	}
	if _, err := dockerapi.ReadFrames(bytes.NewReader(data[:4]), 1<<20, all); !errors.Is(err, dockerapi.ErrProtocol) {
		t.Fatal("half header")
	}
	bad := fakedocker.Frame(1, []byte("x"))
	bad[0] = 0
	if _, err := dockerapi.ReadFrames(bytes.NewReader(bad), 1<<20, all); !errors.Is(err, dockerapi.ErrProtocol) {
		t.Fatal("stdin stream")
	}
	bad[0] = 3
	if _, err := dockerapi.ReadFrames(bytes.NewReader(bad), 1<<20, all); !errors.Is(err, dockerapi.ErrProtocol) {
		t.Fatal("stream 3")
	}
	if _, err := dockerapi.ReadFrames(bytes.NewReader(data), 8, all); !errors.Is(err, dockerapi.ErrOutputTooLarge) {
		t.Fatal("limit")
	}
	if got, err := dockerapi.ReadFrames(bytes.NewReader(nil), 1, all); err != nil || len(got) != 0 {
		t.Fatal("empty stream")
	}
}

type oneByte struct{ r io.Reader }

func (o *oneByte) Read(p []byte) (int, error) {
	if len(p) > 1 {
		p = p[:1]
	}
	return o.r.Read(p)
}

// covers: R4 03§5.4 JSON lines: error in the middle, read to EOF, long line, early end
func TestReadProgress(t *testing.T) {
	n := 0
	err := dockerapi.ReadProgress(strings.NewReader(`{"status":"a"}`+"\n\n"+`{"error":"boom","errorDetail":{"message":"boom"}}`+"\n"+`{"status":"c"}`), func(dockerapi.Progress) { n++ })
	var se *dockerapi.ErrStream
	if !errors.As(err, &se) || se.Message != "boom" || n != 3 {
		t.Fatalf("%v %d", err, n)
	}
	if err := dockerapi.ReadProgress(strings.NewReader(`{"errorDetail":{"message":"x"}}`), nil); err == nil {
		t.Fatal("errorDetail only")
	}
	if err := dockerapi.ReadProgress(strings.NewReader(`{"status":"`+strings.Repeat("a", 1<<20+10)+`"}`), nil); !errors.Is(err, dockerapi.ErrProtocol) {
		t.Fatal("long line", err)
	}
	if err := dockerapi.ReadProgress(strings.NewReader("not json\n"), nil); !errors.Is(err, dockerapi.ErrProtocol) {
		t.Fatal("garbage")
	}
	if err := dockerapi.ReadProgress(io.MultiReader(strings.NewReader(`{"status":"a"}`+"\n"), errReader{}), nil); err == nil {
		t.Fatal("early end")
	}
}

type errReader struct{}

func (errReader) Read([]byte) (int, error) { return 0, io.ErrUnexpectedEOF }

// covers: R5 exec merges stdout and stderr in arrival order; not running is 409
func TestExec(t *testing.T) {
	c, f := client(t)
	f.AddImage(fakedocker.RandID(), nil, "img:1")
	f.AddContainer(&fakedocker.Container{Name: "x", Status: "running"})
	f.Exec = func(_ *fakedocker.Container, argv []string, user string) ([]byte, []byte, int, time.Duration) {
		return []byte("out:" + user), []byte("|err"), 3, 0
	}
	code, out, err := c.Exec(context.Background(), "x", []string{"sh", "-c", "x"}, "1000", 1<<20)
	if err != nil || code != 3 || string(out) != "out:1000|err" {
		t.Fatalf("%d %q %v", code, out, err)
	}
	f.AddContainer(&fakedocker.Container{Name: "stopped", Status: "exited"})
	if _, _, err := c.Exec(context.Background(), "stopped", []string{"true"}, "", 10); !errors.Is(err, dockerapi.ErrNotRunning) {
		t.Fatal(err)
	}
	if _, _, err := c.Exec(context.Background(), "x", []string{"true"}, "", 4); !errors.Is(err, dockerapi.ErrOutputTooLarge) {
		t.Fatal("limit", err)
	}
	f.Exec = func(*fakedocker.Container, []string, string) ([]byte, []byte, int, time.Duration) {
		return nil, nil, 0, time.Second
	}
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	if _, _, err := c.Exec(ctx, "x", []string{"sleep"}, "", 10); !errors.Is(err, context.DeadlineExceeded) {
		t.Fatal("timeout", err)
	}
}

// covers: 03§5.5 events decode, Action suffix dropped
func TestEvents(t *testing.T) {
	c, f := client(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	evs, errs := c.Events(ctx, time.Now(), dockerapi.Filters{"type": {"container"}})
	deadline := time.Now().Add(2 * time.Second)
	for f.Subscribers() == 0 {
		if time.Now().After(deadline) {
			t.Fatal("no subscription")
		}
		time.Sleep(5 * time.Millisecond)
	}
	f.Emit("container", "health_status: healthy", "abc", map[string]string{"name": "ccg-controller"})
	e := <-evs
	if e.Action != "health_status" || e.Actor.Attributes["name"] != "ccg-controller" || e.Actor.ID != "abc" {
		t.Fatalf("%+v", e)
	}
	f.DropEvents()
	for range evs {
	}
	if err := <-errs; err == nil {
		t.Fatal("end of stream must be reported")
	}
}

// covers: R4 pull errors; R9 load lines; volume quota message
func TestPullLoadVolume(t *testing.T) {
	c, f := client(t)
	if err := c.ImagePull(context.Background(), "ghcr.io/sub2api-devs/ccgateway-x", "1", ""); err == nil {
		t.Fatal("unknown image pulled")
	}
	f.Pullable["ghcr.io/sub2api-devs/ccgateway-x:1"] = "sha256:" + fakedocker.RandID()
	if err := c.ImagePull(context.Background(), "ghcr.io/sub2api-devs/ccgateway-x", "1", ""); err != nil {
		t.Fatal(err)
	}
	if err := c.ImagePull(context.Background(), "x", "", ""); err == nil {
		t.Fatal("empty tag would pull every tag")
	}
	f.LoadLines = []string{"Loaded image: ccgateway-app:9", "Loaded image ID: sha256:" + strings.Repeat("c", 64)}
	lines, err := c.ImageLoad(context.Background(), strings.NewReader("tar"), 3, "application/x-tar")
	if err != nil || len(lines) != 2 || string(f.LoadedBody) != "tar" {
		t.Fatal(lines, err)
	}
	f.LoadError = "invalid tar header"
	if _, err := c.ImageLoad(context.Background(), strings.NewReader("tar"), 3, "application/x-tar"); err == nil {
		t.Fatal("load error line")
	}
	f.NoQuota = true
	_, err = c.VolumeCreate(context.Background(), policy.Volume(names.Names{Prefix: "ccg"}, "21", 1<<30, true))
	if dockerapi.StatusOf(err) != http.StatusInternalServerError || !strings.Contains(dockerapi.MessageOf(err), "no quota support") {
		t.Fatal(err)
	}
}

// covers: 03§5.3 logs keep only stdout frames
func TestLogsStdoutOnly(t *testing.T) {
	c, f := client(t)
	f.AddContainer(&fakedocker.Container{Name: "j", Status: "exited", Stdout: []byte("hello"), Stderr: []byte("noise")})
	out, err := c.ContainerLogs(context.Background(), "j", 64<<10)
	if err != nil || string(out) != "hello" {
		t.Fatalf("%q %v", out, err)
	}
	if _, err := c.ContainerLogs(context.Background(), "j", 3); !errors.Is(err, dockerapi.ErrOutputTooLarge) {
		t.Fatal(err)
	}
}
