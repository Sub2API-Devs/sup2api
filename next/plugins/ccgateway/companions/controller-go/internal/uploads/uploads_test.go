package uploads

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"ccgateway/controller/internal/clock"
	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/rnd"
)

type env struct {
	t   *testing.T
	g   *fakeguard.Guard
	u   *Uploads
	dir string
	clk *clock.Fake
}

func newEnv(t *testing.T) *env {
	g := fakeguard.New()
	dir := filepath.Join(t.TempDir(), "uploads")
	clk := clock.NewFake(time.Now())
	u, err := New(Options{Dir: dir, Images: g.Client(), Clock: clk, Rand: rnd.Fixed(1)})
	if err != nil {
		t.Fatal(err)
	}
	return &env{t: t, g: g, u: u.(*Uploads), dir: dir, clk: clk}
}

// answer is how api writes the outcome: the body for success, status and body for an UploadError.
func answer(v pyjson.Ordered, err error) string {
	if err != nil {
		var ue *contract.UploadError
		if !errors.As(err, &ue) {
			return "unnamed: " + err.Error()
		}
		return fmt.Sprintf("%d %s", ue.Status, pyjson.MustMarshal(ue.Body()))
	}
	return fmt.Sprintf("200 %s", pyjson.MustMarshal(v))
}

func num(n int64) any { return json.Number(fmt.Sprint(n)) }

func (e *env) create(size int64, digest any) string {
	e.t.Helper()
	v, err := e.u.Create(context.Background(), num(size), digest)
	if err != nil {
		e.t.Fatal(err)
	}
	id, _ := v.Get("upload_id")
	return id.(string)
}

func (e *env) put(id string, offset int64, data []byte) string {
	return answer(e.u.Write(context.Background(), id, offset, int64(len(data)), bytes.NewReader(data)))
}

func (e *env) entries() []string {
	list, _ := os.ReadDir(e.dir)
	var out []string
	for _, d := range list {
		out = append(out, d.Name())
	}
	return out
}

func hexSum(b []byte) string {
	s := sha256.Sum256(b)
	return hex.EncodeToString(s[:])
}

// covers: U1 U2 U3 U4 R12 R13 R14 R16 S29 (a resumable upload in chunks, then loaded through the guard)
func TestResumableUploadAndLoad(t *testing.T) {
	e := newEnv(t)
	imageID := strings.Repeat("f", 64)
	layer := make([]byte, 300_000)
	rand.Read(layer)
	// A docker save archive: its manifest names the image, a large layer makes several chunks.
	data := archive(t, false, map[string]string{
		"manifest.json":           `[{"Config": "blobs/sha256/` + imageID + `", "RepoTags": ["ccgateway-app:local"], "Layers": ["layer.tar"]}]`,
		"blobs/sha256/" + imageID: "{}",
		"layer.tar":               string(layer),
	})
	n := int64(len(data))
	third := n / 3
	digest := hexSum(data)
	created, err := e.u.Create(context.Background(), num(n), digest)
	if err != nil {
		t.Fatal(err)
	}
	id, _ := created.Get("upload_id")
	if !strings.Contains(string(pyjson.MustMarshal(created)), fmt.Sprintf(`"offset": 0, "size": %d`, n)) || len(id.(string)) != 22 {
		t.Fatal(created)
	}
	if mode := fileMode(t, filepath.Join(e.dir, id.(string)+".part")); mode != "" && mode != "-rw-------" {
		t.Fatal(mode)
	}
	meta, _ := os.ReadFile(filepath.Join(e.dir, id.(string)+".json"))
	if string(meta) != fmt.Sprintf(`{"size": %d, "sha256": "%s"}`, n, digest) {
		t.Fatal(string(meta))
	}
	var loaded [][]byte
	e.g.OnLoad(func(b []byte) ([]guardapi.LoadedImage, error) {
		loaded = append(loaded, b)
		return []guardapi.LoadedImage{{ID: "sha256:" + imageID, Tags: []string{"ccgateway-app:local"}}}, nil
	})
	up := id.(string)
	if got := answer(e.u.Load(context.Background(), up)); got != `409 {"error": "incomplete"}` {
		t.Fatal(got)
	}
	if got := e.put(up, 0, data[:third]); got != fmt.Sprintf(`200 {"offset": %d, "size": %d}`, third, n) {
		t.Fatal(got)
	}
	if got := e.put(up, third, data[third:2*third]); !strings.HasPrefix(got, "200 ") {
		t.Fatal(got)
	}
	if got := e.put(up, 0, data[:10]); got != fmt.Sprintf(`409 {"error": "offset_mismatch", "offset": %d}`, 2*third) {
		t.Fatal(got)
	}
	if got := answer(e.u.Status(context.Background(), up)); got != fmt.Sprintf(`200 {"offset": %d, "size": %d}`, 2*third, n) {
		t.Fatal(got)
	}
	if got := e.put(up, 2*third, append(append([]byte(nil), data[2*third:]...), 'x')); got != `400 {"error": "invalid_request"}` {
		t.Fatal(got)
	}
	if got := e.put(up, 2*third, data[2*third:]); !strings.HasPrefix(got, "200 ") {
		t.Fatal(got)
	}
	got := answer(e.u.Load(context.Background(), up))
	if got != `200 {"sha256": "`+digest+`", "images": [{"id": "sha256:`+imageID+`", "tags": ["ccgateway-app:local"]}]}` {
		t.Fatal(got)
	}
	if len(loaded) != 1 || !bytes.Equal(loaded[0], data) {
		t.Fatal(len(loaded))
	}
	if len(e.entries()) != 0 {
		t.Fatal(e.entries())
	}
	if got := answer(e.u.Status(context.Background(), up)); got != `404 {"error": "not_found"}` {
		t.Fatal(got)
	}
}

func fileMode(t *testing.T, p string) string {
	st, err := os.Stat(p)
	if err != nil {
		t.Fatal(err)
	}
	if os.PathSeparator == '\\' {
		return "" // Windows has no POSIX modes
	}
	return st.Mode().String()
}

func archive(t *testing.T, gz bool, files map[string]string) []byte {
	var buf bytes.Buffer
	var w io.Writer = &buf
	var zw *gzip.Writer
	if gz {
		zw = gzip.NewWriter(&buf)
		w = zw
	}
	tw := tar.NewWriter(w)
	for name, body := range files {
		tw.WriteHeader(&tar.Header{Name: name, Typeflag: tar.TypeReg, Size: int64(len(body)), Mode: 0o644})
		tw.Write([]byte(body))
	}
	tw.Close()
	if zw != nil {
		zw.Close()
	}
	return buf.Bytes()
}

func (e *env) upload(data []byte) string {
	id := e.create(int64(len(data)), nil)
	if got := e.put(id, 0, data); !strings.HasPrefix(got, "200 ") {
		e.t.Fatal(got)
	}
	return id
}

// covers: U4 U5 R16 (the guard names the loaded images from the archive; the controller answers them as given)
func TestLoadAnswersTheGuardsNamesAsGiven(t *testing.T) {
	e := newEnv(t)
	imageID := strings.Repeat("ab", 32)
	for _, gz := range []bool{false, true} {
		data := archive(t, gz, map[string]string{"manifest.json": `[{"Config": "` + imageID + `.json", "RepoTags": ["ccg/controller:new"], "Layers": []}]`})
		got := answer(e.u.Load(context.Background(), e.upload(data)))
		if got != `200 {"sha256": "`+hexSum(data)+`", "images": [{"id": "sha256:`+imageID+`", "tags": ["ccg/controller:new"]}]}` {
			t.Fatal(gz, got)
		}
	}
	// An untagged archive names nothing.
	data := archive(t, false, map[string]string{"manifest.json": `[{"Config": "` + imageID + `.json", "RepoTags": null, "Layers": []}]`})
	got := answer(e.u.Load(context.Background(), e.upload(data)))
	if !strings.HasSuffix(got, `"images": [{"id": "sha256:`+imageID+`", "tags": []}]}`) {
		t.Fatal(got)
	}
	if e.g.ImageID("ccg/controller:new") != "sha256:"+imageID {
		t.Fatal("not loaded into the guard")
	}
}

// covers: U4 (checksum mismatch, a failed or empty load: 400 and the upload removed)
func TestChecksumMismatchAndLoadFailureDeleteTheUpload(t *testing.T) {
	e := newEnv(t)
	img := archive(t, false, map[string]string{"manifest.json": `[{"Config": "` + strings.Repeat("ab", 32) + `.json", "RepoTags": ["ccgateway-app:1"], "Layers": []}]`})
	called := 0
	e.g.OnLoad(func([]byte) ([]guardapi.LoadedImage, error) {
		called++
		return nil, errors.New("not an image archive")
	})
	id := e.create(4, strings.Repeat("a", 64))
	e.put(id, 0, []byte("abcd"))
	if got := answer(e.u.Load(context.Background(), id)); got != `400 {"error": "checksum_mismatch"}` {
		t.Fatal(got)
	}
	if got := answer(e.u.Status(context.Background(), id)); got != `404 {"error": "not_found"}` || called != 0 {
		t.Fatal(got, called)
	}
	if got := answer(e.u.Load(context.Background(), e.upload(img))); got != `400 {"error": "load_failed"}` {
		t.Fatal(got)
	}
	if len(e.entries()) != 0 {
		t.Fatal(e.entries())
	}
	e.g.OnLoad(func([]byte) ([]guardapi.LoadedImage, error) { return nil, nil })
	if got := answer(e.u.Load(context.Background(), e.upload(img))); got != `400 {"error": "load_failed"}` {
		t.Fatal(got)
	}
	// A tag the archive does not name is refused by the guard: a failed load.
	e.g.OnLoad(func([]byte) ([]guardapi.LoadedImage, error) {
		return []guardapi.LoadedImage{{ID: "sha256:" + strings.Repeat("ab", 32), Tags: []string{"ccgateway-app:other"}}}, nil
	})
	if got := answer(e.u.Load(context.Background(), e.upload(img))); got != `400 {"error": "load_failed"}` {
		t.Fatal(got)
	}
	// A guard that cannot be reached is a failed load too.
	e.g.OnLoad(nil)
	e.g.Fail("POST /v1/images/load", fakeguard.Fault{Status: 0})
	if got := answer(e.u.Load(context.Background(), e.upload(img))); got != `400 {"error": "load_failed"}` {
		t.Fatal(got)
	}
	if len(e.entries()) != 0 {
		t.Fatal(e.entries())
	}
}

// covers: U4 R16 (the guard's 403 load_forbidden is answered 400 load_forbidden, 02 §2.2)
func TestLoadForbidden(t *testing.T) {
	e := newEnv(t)
	e.g.SetLoadRepos("ghcr.io/sub2api-devs/")
	data := archive(t, false, map[string]string{"manifest.json": `[{"Config": "` + strings.Repeat("cd", 32) + `.json", "RepoTags": ["evil/app:1"]}]`})
	if got := answer(e.u.Load(context.Background(), e.upload(data))); got != `400 {"error": "load_forbidden"}` {
		t.Fatal(got)
	}
	if got := answer(e.u.Load(context.Background(), e.upload(archive(t, false, map[string]string{"layer.tar": "x"})))); got != `400 {"error": "load_forbidden"}` {
		t.Fatal(got)
	}
	if len(e.entries()) != 0 {
		t.Fatal(e.entries())
	}
}

// covers: U1 V11 (size and sha256 values)
func TestCreateValidation(t *testing.T) {
	e := newEnv(t)
	for _, c := range []struct{ size, sha any }{
		{num(0), nil}, {num(4<<30 + 1), nil}, {true, nil}, {"5", nil}, {nil, nil}, {json.Number("5.0"), nil}, {num(-1), nil},
		{num(5), strings.Repeat("A", 64)}, {num(5), strings.Repeat("a", 63)}, {num(5), 7},
	} {
		if got := answer(e.u.Create(context.Background(), c.size, c.sha)); got != `400 {"error": "invalid_request"}` {
			t.Fatal(c, got)
		}
	}
	if len(e.entries()) != 0 {
		t.Fatal(e.entries())
	}
	if got := answer(e.u.Create(context.Background(), num(4<<30), nil)); !strings.HasSuffix(got, `"offset": 0, "size": 4294967296}`) {
		t.Fatal(got)
	}
}

// covers: U2 U3 R13 R15 (unknown or malformed ids are not_found)
func TestUnknownUploadsAreNotFound(t *testing.T) {
	e := newEnv(t)
	for _, id := range []string{strings.Repeat("A", 22), "short", "../../etc/passwd/xxxxx", strings.Repeat("A", 21) + "/"} {
		for _, got := range []string{e.put(id, 0, []byte("ab")), answer(e.u.Status(context.Background(), id)),
			answer(e.u.Delete(context.Background(), id)), answer(e.u.Load(context.Background(), id))} {
			if got != `404 {"error": "not_found"}` {
				t.Fatal(id, got)
			}
		}
	}
}

type shortReader struct {
	data []byte
	err  error
}

func (r *shortReader) Read(p []byte) (int, error) {
	if len(r.data) == 0 {
		return 0, r.err
	}
	n := copy(p, r.data)
	r.data = r.data[n:]
	return n, nil
}

// covers: U2 (a chunk that ends early or fails is discarded: the offset does not move)
func TestInterruptedChunkIsDiscarded(t *testing.T) {
	e := newEnv(t)
	id := e.create(10, nil)
	got := answer(e.u.Write(context.Background(), id, 0, 8, &shortReader{data: []byte("abc"), err: io.EOF}))
	if got != `400 {"error": "invalid_request"}` {
		t.Fatal(got)
	}
	got = answer(e.u.Write(context.Background(), id, 0, 8, &shortReader{data: []byte("abc"), err: io.ErrUnexpectedEOF}))
	if got != `400 {"error": "invalid_request"}` {
		t.Fatal(got)
	}
	timeout := errors.New("i/o timeout")
	if _, err := e.u.Write(context.Background(), id, 0, 8, &shortReader{data: []byte("abcdef"), err: timeout}); !errors.Is(err, timeout) {
		t.Fatal(err)
	}
	if got := answer(e.u.Status(context.Background(), id)); got != `200 {"offset": 0, "size": 10}` {
		t.Fatal(got)
	}
	if got := e.put(id, 0, []byte("0123456789")); got != `200 {"offset": 10, "size": 10}` {
		t.Fatal(got)
	}
	part, _ := os.ReadFile(filepath.Join(e.dir, id+".part"))
	if string(part) != "0123456789" {
		t.Fatal(string(part))
	}
}

// covers: U1 U3 U6 R12 R15 (four pending at most, delete, stale uploads make room)
func TestPendingLimitStaleCleanupAndDelete(t *testing.T) {
	e := newEnv(t)
	var ids []string
	for i := 0; i < MaxPending; i++ {
		ids = append(ids, e.create(5, nil))
	}
	if got := answer(e.u.Create(context.Background(), num(5), nil)); got != `409 {"error": "too_many_uploads"}` {
		t.Fatal(got)
	}
	if got := answer(e.u.Delete(context.Background(), ids[0])); got != `200 {"deleted": true}` {
		t.Fatal(got)
	}
	if got := answer(e.u.Delete(context.Background(), ids[0])); got != `404 {"error": "not_found"}` {
		t.Fatal(got)
	}
	e.create(5, nil)
	old := e.clk.Now().Add(-(StaleSeconds + 10) * time.Second)
	for _, suffix := range []string{".json", ".part"} {
		if err := os.Chtimes(filepath.Join(e.dir, ids[1]+suffix), old, old); err != nil {
			t.Fatal(err)
		}
	}
	e.create(5, nil) // the stale upload made room
	if got := answer(e.u.Status(context.Background(), ids[1])); got != `404 {"error": "not_found"}` {
		t.Fatal(got)
	}
	if got := answer(e.u.Status(context.Background(), ids[2])); got != `200 {"offset": 0, "size": 5}` {
		t.Fatal(got)
	}
	if got := answer(e.u.Create(context.Background(), num(5), nil)); got != `409 {"error": "too_many_uploads"}` {
		t.Fatal(got)
	}
	// Stale by the clock: a recent .part keeps an old record alive.
	meta := filepath.Join(e.dir, ids[2]+".json")
	os.Chtimes(meta, old, old)
	e.clk.Advance(0)
	if got := answer(e.u.Create(context.Background(), num(5), nil)); got != `409 {"error": "too_many_uploads"}` {
		t.Fatal(got)
	}
}

type blockingReader struct {
	started chan struct{}
	release chan struct{}
	once    sync.Once
}

func (r *blockingReader) Read(p []byte) (int, error) {
	r.once.Do(func() { close(r.started) })
	<-r.release
	return 0, io.EOF
}

// covers: U6 K7 (the stale cleanup skips an upload being written)
func TestStaleCleanupSkipsAnUploadInUse(t *testing.T) {
	e := newEnv(t)
	id := e.create(5, nil)
	r := &blockingReader{started: make(chan struct{}), release: make(chan struct{})}
	done := make(chan string)
	go func() { done <- answer(e.u.Write(context.Background(), id, 0, 5, r)) }()
	<-r.started
	old := e.clk.Now().Add(-(StaleSeconds + 10) * time.Second)
	for _, suffix := range []string{".json", ".part"} {
		os.Chtimes(filepath.Join(e.dir, id+suffix), old, old)
	}
	e.create(5, nil)
	if _, err := os.Stat(filepath.Join(e.dir, id+".json")); err != nil {
		t.Fatal("removed while in use")
	}
	close(r.release)
	if got := <-done; got != `400 {"error": "invalid_request"}` {
		t.Fatal(got)
	}
	if got := answer(e.u.Status(context.Background(), id)); got != `200 {"offset": 0, "size": 5}` {
		t.Fatal(got)
	}
}
