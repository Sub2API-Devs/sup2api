package updates

import (
	"archive/tar"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http/httptest"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"ccgateway/controller/internal/clock"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/keylock"
	"ccgateway/controller/internal/logx"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/rnd"
	"ccgateway/controller/internal/store"
	"ccgateway/controller/internal/workeradmin"
)

// The production OOM of 2026-11-01: a paired activation of every runtime
// (core POST /system/ccgateway/runtime/workers, CLI 2.1.312) killed the Go
// controller in its 1 GiB memory cgroup. TestPairActivationMemoryIsBounded
// replays it in process: 8 runtimes activate the same release concurrently,
// its CLI is 300 MiB and its Worker 48 MiB, and the controller's heap may
// not grow by more than 64 MiB, whatever the number of runtimes.
//
// How it measures: the big files are never held by the test either. The
// image's CLI and Worker are generated on the fly (genFile), and bigGuard
// sits between the controller and the fake guard: it streams an archive put
// of a big file through SHA-256 and keeps only a "big:<sha>" placeholder in
// the fake container, streams a big file's archive back from the generator,
// and answers sha256sum of a placeholder with the recorded digest. A sampler
// reads runtime.ReadMemStats every 2 ms; the peak HeapInuse minus the
// HeapInuse after a GC at the start is the growth. TotalAlloc's increase is
// logged too (before the fix it was several times the CLI per runtime: the
// write_file read-back of the CLI went through io.ReadAll).
//
// Run it alone with
//
//	go test ./internal/updates -run TestPairActivationMemoryIsBounded -v
//
// CCG_MEMTEST_CLI_MB and CCG_MEMTEST_ACCOUNTS change the size and the number
// of runtimes (defaults 300 and 8).
func TestPairActivationMemoryIsBounded(t *testing.T) {
	cliMB := envInt(t, "CCG_MEMTEST_CLI_MB", 300)
	accounts := envInt(t, "CCG_MEMTEST_ACCOUNTS", 8)
	const workerMB = 48
	const limitMB = 64

	cli := genFile{size: int64(cliMB) << 20, seed: 1}
	wk := genFile{size: workerMB << 20, seed: 2}
	cliSHA, wkSHA := cli.sha256(), wk.sha256()

	g := fakeguard.New()
	g.AddImage("app:test", fakeguard.ImageSpec{Files: map[string][]byte{worker: old}})
	entry := pyjson.Ordered{{Key: "path", Value: cliVersion + "/claude"}, {Key: "sha256", Value: cliSHA},
		{Key: "patch", Value: cliPatch}, {Key: "modes", Value: []any{"direct", "build"}}}
	g.AddImage("big:release", fakeguard.ImageSpec{Files: map[string][]byte{
		CLIRoot + "/manifest.json":             manifestFor(entry),
		CLIRoot + "/" + cliVersion + "/claude": []byte("generated"),
		worker:                                 []byte("generated"),
	}})
	bg := &bigGuard{Client: g.Client(), g: g, images: map[string]genFile{
		CLIRoot + "/" + cliVersion + "/claude": cli,
		worker:                                 wk,
	}, gens: map[string]genFile{cliSHA: cli, wkSHA: wk}, placed: map[string]string{}}

	st, err := store.Open(filepath.Join(t.TempDir(), "r"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	h := &multiHost{guard: bg, st: st, locks: keylock.New(), online: map[string]string{}}
	var aids []string
	for i := 0; i < accounts; i++ {
		aid := strconv.Itoa(40 + i)
		aids = append(aids, aid)
		addAccountApp(t, g, st, aid)
		h.online[aid] = rev
	}
	srv := &workerSrv{busy: map[string]bool{}, lease: strings.Repeat("a", 48)}
	ts := httptest.NewServer(srv)
	t.Cleanup(ts.Close)
	tu, _ := url.Parse(ts.URL)
	port, _ := strconv.Atoi(tu.Port())
	up, err := New(Options{Host: h, Guard: bg, Store: st, Worker: &workeradmin.Client{Port: port, HostOverride: "127.0.0.1"},
		Clock: clock.NewFake(time.Date(2026, 11, 1, 12, 0, 0, 0, time.UTC)), Rand: rnd.Fixed(7), Log: logx.Discard()})
	if err != nil {
		t.Fatal(err)
	}
	up.(*updater).files.linger = 0 // the spool must be empty once all are done

	runtime.GC()
	var base runtime.MemStats
	runtime.ReadMemStats(&base)
	var peak atomic.Uint64
	stop := make(chan struct{})
	sampled := make(chan struct{})
	go func() {
		defer close(sampled)
		tick := time.NewTicker(2 * time.Millisecond)
		defer tick.Stop()
		for {
			var m runtime.MemStats
			runtime.ReadMemStats(&m)
			if m.HeapInuse > peak.Load() {
				peak.Store(m.HeapInuse)
			}
			select {
			case <-stop:
				return
			case <-tick.C:
			}
		}
	}()

	results := make([]pyjson.Ordered, len(aids))
	errsOut := make([]error, len(aids))
	var wg sync.WaitGroup
	start := make(chan struct{})
	for i, aid := range aids {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			results[i], errsOut[i] = up.UpdatePair(context.Background(), aid, pyjson.Ordered{
				{Key: "image", Value: "big:release"}, {Key: "components", Value: []any{"worker", "cli"}},
				{Key: "cli_version", Value: cliVersion}})
		}()
	}
	began := time.Now()
	close(start)
	wg.Wait()
	close(stop)
	<-sampled
	var end runtime.MemStats
	runtime.ReadMemStats(&end)

	for i, aid := range aids {
		if errsOut[i] != nil {
			t.Fatalf("runtime %s: %v", aid, errsOut[i])
		}
		if s, _ := results[i].Get("status"); s != "updated" {
			t.Fatalf("runtime %s: %v", aid, results[i])
		}
		if got := bg.placedAt(aid, worker); got != wkSHA {
			t.Fatalf("runtime %s: worker %q", aid, got)
		}
	}
	growth := int64(peak.Load()) - int64(base.HeapInuse)
	t.Logf("%d runtimes, CLI %d MiB, Worker %d MiB, %s: peak HeapInuse growth %.1f MiB, TotalAlloc +%.1f MiB, image reads cli=%d worker=%d",
		len(aids), cliMB, workerMB, time.Since(began).Round(time.Millisecond), float64(growth)/(1<<20),
		float64(end.TotalAlloc-base.TotalAlloc)/(1<<20), bg.reads(cli.seed), bg.reads(wk.seed))
	if growth > limitMB<<20 {
		t.Fatalf("peak heap growth %.1f MiB exceeds %d MiB", float64(growth)/(1<<20), limitMB)
	}
	if n := bg.reads(cli.seed); n != 1 {
		t.Fatalf("the CLI was read %d times from the image; concurrent activations must share one read", n)
	}
	if n := bg.reads(wk.seed); n != 1 {
		t.Fatalf("the Worker was read %d times from the image; concurrent activations must share one read", n)
	}
	if list, err := os.ReadDir(st.Path(store.SpoolDir)); err != nil || len(list) != 0 {
		t.Fatalf("spool not emptied: %v %v", list, err)
	}
}

func envInt(t *testing.T, name string, def int) int {
	v := os.Getenv(name)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		t.Fatalf("%s=%q", name, v)
	}
	return n
}

// genFile is size bytes of a 64 KiB block that starts with the ELF magic,
// repeated; seed varies the block. Nothing of it is kept in memory but the block.
type genFile struct {
	size int64
	seed byte
}

func (f genFile) block() []byte {
	b := make([]byte, 64<<10)
	for i := range b {
		b[i] = byte(i*131) ^ f.seed
	}
	copy(b, "\x7fELF")
	return b
}

func (f genFile) reader() io.Reader { return &genReader{block: f.block(), left: f.size} }

func (f genFile) sha256() string {
	h := sha256.New()
	io.Copy(h, f.reader())
	return hex.EncodeToString(h.Sum(nil))
}

type genReader struct {
	block []byte
	off   int
	left  int64
}

func (r *genReader) Read(p []byte) (int, error) {
	if r.left <= 0 {
		return 0, io.EOF
	}
	if int64(len(p)) > r.left {
		p = p[:r.left]
	}
	n := 0
	for n < len(p) {
		c := copy(p[n:], r.block[r.off:])
		n += c
		r.off = (r.off + c) % len(r.block)
	}
	r.left -= int64(n)
	return n, nil
}

// bigGuard is the fake guard for files too big to keep (see the test).
type bigGuard struct {
	guardapi.Client
	g      *fakeguard.Guard
	images map[string]genFile // image path -> content (every image)
	gens   map[string]genFile // sha256 -> content

	mu     sync.Mutex
	placed map[string]string // aid + path -> sha256 of a big file put there
	counts map[byte]int
}

const bigPlaceholder = "big:"

func (b *bigGuard) reads(seed byte) int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.counts[seed]
}

func (b *bigGuard) placedAt(aid, p string) string {
	data, _ := b.g.File(names.Name(names.DefaultPrefix, aid, "app"), p)
	if s, ok := strings.CutPrefix(string(data), bigPlaceholder); ok {
		return s
	}
	return ""
}

func (b *bigGuard) ImageFile(ctx context.Context, ref, p string, limit int64) (io.ReadCloser, int64, error) {
	f, ok := b.images[p]
	if !ok || ref != "big:release" {
		return b.Client.ImageFile(ctx, ref, p, limit)
	}
	b.mu.Lock()
	if b.counts == nil {
		b.counts = map[byte]int{}
	}
	b.counts[f.seed]++
	b.mu.Unlock()
	if f.size > limit {
		return nil, 0, &guardapi.Error{Status: 422, Code: "too_large"}
	}
	return io.NopCloser(f.reader()), f.size, nil
}

// AppArchivePut streams a big entry through SHA-256; small archives go to the fake guard.
func (b *bigGuard) AppArchivePut(ctx context.Context, aid, dir string, archive io.Reader, size int64) error {
	if size <= 2<<20 {
		return b.Client.AppArchivePut(ctx, aid, dir, archive, size)
	}
	tr := tar.NewReader(archive)
	for {
		h, err := tr.Next()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}
		sum := sha256.New()
		n, err := io.Copy(sum, tr)
		if err != nil {
			return err
		}
		if n != h.Size {
			return fmt.Errorf("short entry %d of %d", n, h.Size)
		}
		digest := hex.EncodeToString(sum.Sum(nil))
		if _, ok := b.gens[digest]; !ok {
			return fmt.Errorf("unexpected big file %s", h.Name)
		}
		b.g.PutFile(names.Name(names.DefaultPrefix, aid, "app"), path.Join(dir, h.Name), []byte(bigPlaceholder+digest), h.Mode)
	}
}

// AppArchiveGet streams a placeholder's content back as Docker would.
func (b *bigGuard) AppArchiveGet(ctx context.Context, aid, p string) (io.ReadCloser, error) {
	digest := b.placedAt(aid, p)
	if digest == "" {
		return b.Client.AppArchiveGet(ctx, aid, p)
	}
	f := b.gens[digest]
	pr, pw := io.Pipe()
	go func() {
		tw := tar.NewWriter(pw)
		err := tw.WriteHeader(&tar.Header{Name: path.Base(p), Mode: 0o755, Size: f.size, Typeflag: tar.TypeReg})
		if err == nil {
			_, err = io.Copy(tw, f.reader())
		}
		if err == nil {
			err = tw.Close()
		}
		pw.CloseWithError(err)
	}()
	return pr, nil
}

// AppExec answers sha256sum of a placeholder with the big file's digest.
func (b *bigGuard) AppExec(ctx context.Context, aid string, argv []string, user string) (*guardapi.ExecResult, error) {
	if len(argv) == 2 && argv[0] == "sha256sum" {
		if digest := b.placedAt(aid, argv[1]); digest != "" {
			return &guardapi.ExecResult{ExitCode: 0, Output: []byte(digest + "  " + argv[1] + "\n")}, nil
		}
	}
	return b.Client.AppExec(ctx, aid, argv, user)
}

// addAccountApp is runtime aid: a running app container with the old
// Worker and the prior pointer, its state at revision rev.
func addAccountApp(t *testing.T, g *fakeguard.Guard, st *store.Store, aid string) {
	t.Helper()
	name := names.Name(names.DefaultPrefix, aid, "app")
	g.AddContainer(fakeguard.ContainerSpec{Name: name, Image: "app:test", User: "1000:1000",
		Labels: map[string]string{names.LabelAccount: aid}, Path: worker, Args: []string{},
		Volumes: map[string]string{names.Name(names.DefaultPrefix, aid, "data"): "/work"},
		Binds:   map[string]string{fakeguard.RuntimeHostRoot + "/" + aid + "/resolv.conf": "/etc/resolv.conf"}})
	g.SetResolv(aid, names.ResolvConf("10.77.0.2"))
	g.PutFile(name, worker, old, 0o755)
	g.PutFile(name, ActivePointer, prior, 0o644)
	state := store.NewAccountState("api-key", "secret", "127.0.0.1", "10.77.0.2", "2026-11-01T00:00:00Z")
	state.Revision, state.Status = rev, store.StatusReady
	if err := st.EnsureAccountDir(aid); err != nil {
		t.Fatal(err)
	}
	if err := st.SaveState(aid, state); err != nil {
		t.Fatal(err)
	}
}

// multiHost is stubHost for several runtimes.
type multiHost struct {
	guard  guardapi.Client
	st     *store.Store
	locks  *keylock.Locks
	mu     sync.Mutex
	online map[string]string
}

func (h *multiHost) Lock(ctx context.Context, aid string) (*keylock.Held, error) {
	return h.locks.Lock(ctx, aid)
}

func (h *multiHost) EnsureImage(ctx context.Context, ref string) (*guardapi.Image, error) {
	return h.guard.ImageInspect(ctx, ref)
}

func (h *multiHost) App(ctx context.Context, aid string) (*guardapi.Container, error) {
	a, err := h.guard.Account(ctx, aid)
	if err != nil {
		return nil, err
	}
	if a.App == nil {
		return nil, &guardapi.Error{Status: 404, Code: guardapi.CodeNotFound, Reason: guardapi.ReasonContainer}
	}
	return a.App, nil
}

func (h *multiHost) State(aid string) (*store.AccountState, error) { return h.st.LoadState(aid) }

func (h *multiHost) Save(held *keylock.Held, st *store.AccountState) error {
	return h.st.SaveState(held.Key(), st)
}

func (h *multiHost) Readiness(ctx context.Context, aid string, st *store.AccountState) (string, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.online[aid], nil
}

func (h *multiHost) GoOffline(aid string) string {
	h.mu.Lock()
	defer h.mu.Unlock()
	r := h.online[aid]
	delete(h.online, aid)
	return r
}

func (h *multiHost) OnlineAt(aid, revision string) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	return revision != "" && h.online[aid] == revision
}

func (h *multiHost) BusinessFirewall(ctx context.Context, held *keylock.Held, gatewayIP string) error {
	return nil
}

func (h *multiHost) Reapply(ctx context.Context, held *keylock.Held, st *store.AccountState) error {
	h.mu.Lock()
	h.online[held.Key()] = st.Revision
	h.mu.Unlock()
	return nil
}
