package containerfs

import (
	"archive/tar"
	"bytes"
	"context"
	"errors"
	"io"
	"os"
	"strings"
	"testing"
	"time"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/pyreftest"
	"ccgateway/controller/internal/rnd"
)

var now = time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)

// covers: W12 RB4 P7 (container_identity byte for byte, three real inspects included)
func TestIdentityMatchesPython(t *testing.T) {
	real := 0
	for _, c := range pyreftest.Cases(t, "container_identity.json") {
		raw, err := pyjson.Decode([]byte(pyreftest.Str(c, "inspect")))
		if err != nil {
			t.Fatal(err)
		}
		ctr, err := guardapi.ParseContainer(raw)
		if err != nil {
			t.Fatal(err)
		}
		got, err := Identity(ctr)
		if err != nil || got != pyreftest.Str(c, "identity") {
			t.Errorf("%s:\n got  %s\n want %s", c["name"], got, c["identity"])
		}
		if strings.HasPrefix(pyreftest.Str(c, "name"), "real-") {
			real++
		}
	}
	if real < 3 {
		t.Fatalf("only %d real inspects in the vectors", real)
	}
}

func app(t *testing.T, g *fakeguard.Guard, aid string, spec fakeguard.ContainerSpec) *guardapi.AppHandle {
	t.Helper()
	if spec.Name == "" {
		spec.Name = names.Name(g.Prefix(), aid, "app")
	}
	if spec.Labels == nil {
		spec.Labels = map[string]string{names.LabelAccount: aid}
	}
	if spec.Path == "" {
		spec.Path, spec.Args = "/usr/local/bin/docker-entrypoint.sh", []string{"worker"}
	}
	g.AddImage("app:test", fakeguard.ImageSpec{})
	spec.Image = "app:test"
	g.AddContainer(spec)
	client := g.Client()
	acct, err := client.Account(context.Background(), aid)
	if err != nil || acct.App == nil {
		t.Fatal(err)
	}
	return guardapi.NewAppHandle(client, aid, acct.App)
}

// covers: W3 (worker_target)
func TestWorkerTarget(t *testing.T) {
	cases := []struct {
		path string
		args []string
		want string
		kind errs.Kind
	}{
		{"/usr/local/bin/docker-entrypoint.sh", []string{"worker"}, "/usr/local/bin/worker", 0},
		{"docker-entrypoint.sh", []string{"ccgateway", "--x"}, "/usr/local/bin/ccgateway", 0},
		{"/usr/local/bin/worker", nil, "/usr/local/bin/worker", 0},
		{"/opt/worker", nil, "", errs.UnsupportedContainer},
		{"sh", []string{"-c", "run"}, "", errs.UnsupportedContainer},
		{"tini", []string{"--", "/usr/local/bin/ccgateway"}, "/usr/local/bin/ccgateway", 0},
	}
	for _, c := range cases {
		raw := pyjson.Ordered{{Key: "Path", Value: c.path}}
		if c.args != nil {
			args := []any{}
			for _, a := range c.args {
				args = append(args, a)
			}
			raw = append(raw, pyjson.KV{Key: "Args", Value: args})
		} else {
			raw = append(raw, pyjson.KV{Key: "Args", Value: nil})
		}
		ctr, _ := guardapi.ParseContainer(raw)
		path, base, err := WorkerTarget(ctr)
		if c.kind != 0 {
			if !errs.Is(err, c.kind) {
				t.Errorf("%s %v: %v", c.path, c.args, err)
			}
			continue
		}
		if err != nil || path != c.want || "/usr/local/bin/"+base != path {
			t.Errorf("%s %v: %s %s %v", c.path, c.args, path, base, err)
		}
	}
}

// covers: W5 (worker_idle truncates comm to 15 characters)
func TestWorkerIdle(t *testing.T) {
	g := fakeguard.New()
	a := app(t, g, "21", fakeguard.ContainerSpec{})
	ctx := context.Background()
	if idle, err := WorkerIdle(ctx, a, "worker"); err != nil || !idle {
		t.Fatal(idle, err)
	}
	g.SetProcesses("ccg-21-app", []string{"1", "docker-init"}, []string{"7", "worker"}, []string{"9", "claude"})
	if idle, _ := WorkerIdle(ctx, a, "worker"); idle {
		t.Fatal("a CLI process is running")
	}
	g.SetProcesses("ccg-21-app", []string{"1", "docker-init"}, []string{"7", "ccgateway-worker"[:15]})
	if idle, _ := WorkerIdle(ctx, a, "ccgateway-worker"); !idle {
		t.Fatal("comm is cut to 15 characters")
	}
	g.StopContainer("ccg-21-app")
	if _, err := WorkerIdle(ctx, a, "worker"); !errors.Is(err, guardapi.ErrNotRunning) {
		t.Fatal(err)
	}
}

// covers: W7 S35 (stage: root 0755 next to the target, verified; swap; failures clean up)
func TestStageSwapAndReadBack(t *testing.T) {
	g := fakeguard.New()
	a := app(t, g, "21", fakeguard.ContainerSpec{})
	ctx := context.Background()
	g.PutFile("ccg-21-app", "/usr/local/bin/worker", []byte("old"), 0o755)
	data := MemBlob([]byte("\x7fELF new program"))
	tmp, err := Stage(ctx, a, "/usr/local/bin/worker", data, rnd.Fixed(0xa0), now)
	if err != nil {
		t.Fatal(err)
	}
	if tmp != "/usr/local/bin/worker.next-a0a1a2a3a4a5" {
		t.Fatal(tmp)
	}
	if mode, uid, gid, ok := g.FileMode("ccg-21-app", tmp); !ok || mode != 0o755 || uid != 0 || gid != 0 {
		t.Fatal("staged file mode", mode, uid, gid)
	}
	if sum, ok, _ := SHA256In(ctx, a, tmp); !ok || sum != data.SHA256() {
		t.Fatal("digest in container")
	}
	if err := Swap(ctx, a, tmp, "/usr/local/bin/worker"); err != nil {
		t.Fatal(err)
	}
	got, err := ReadFile(ctx, a, "/usr/local/bin/worker", WorkerMaxBytes)
	if err != nil || string(got) != "\x7fELF new program" {
		t.Fatal(string(got), err)
	}
	if _, ok := g.File("ccg-21-app", tmp); ok {
		t.Fatal("temporary file left after swap")
	}
	// a stat answer other than 0:0:755 discards the staged file
	g.OnExec("app:21", []string{"stat"}, fakeguard.ExecReply(0, "1000:1000:755\n"))
	if _, err := Stage(ctx, a, "/usr/local/bin/worker", data, rnd.Fixed(0xb0), now); err == nil {
		t.Fatal("wrong owner accepted")
	}
	if _, ok := g.File("ccg-21-app", "/usr/local/bin/worker.next-b0b1b2b3b4b5"); ok {
		t.Fatal("failed stage left its file")
	}
	g.OnExec("app:21", []string{"mv"}, fakeguard.ExecReply(1, "busy"))
	g.PutFile("ccg-21-app", "/usr/local/bin/x.next", []byte("x"), 0o755)
	if err := Swap(ctx, a, "/usr/local/bin/x.next", "/usr/local/bin/worker"); err == nil {
		t.Fatal("failed mv")
	}
	if _, ok := g.File("ccg-21-app", "/usr/local/bin/x.next"); ok {
		t.Fatal("failed swap keeps the temporary file")
	}
	if _, ok, err := SHA256In(ctx, a, "/missing"); ok || err != nil {
		t.Fatal("unreadable file")
	}
}

// covers: W1 W6 W10 R6-guard (archives of missing paths, single regular files only)
func TestReadFileErrors(t *testing.T) {
	g := fakeguard.New()
	a := app(t, g, "21", fakeguard.ContainerSpec{})
	ctx := context.Background()
	if _, err := ReadFile(ctx, a, "/nope", 10); !guardapi.IsNotFound(err) {
		t.Fatal(err)
	}
	g.PutFile("ccg-21-app", "/opt/ccgateway/cli/a", []byte("1"), 0o644)
	if _, err := ReadFile(ctx, a, "/opt/ccgateway/cli", 10); !errors.Is(err, ErrArchive) {
		t.Fatal("a directory is not a single file:", err)
	}
	g.PutFile("ccg-21-app", "/big", bytes.Repeat([]byte("x"), 100), 0o644)
	if _, err := ReadFile(ctx, a, "/big", 10); !errors.Is(err, ErrArchive) {
		t.Fatal("over the limit:", err)
	}
	if err := WriteFile(ctx, a, "/opt/ccgateway/cli/active-runtime.json", MemBlob([]byte(`{"x":1}`)), now); err != nil {
		t.Fatal(err)
	}
	if b, _ := g.File("ccg-21-app", "/opt/ccgateway/cli/active-runtime.json"); string(b) != `{"x":1}` {
		t.Fatal(string(b))
	}
	if err := WriteFile(ctx, a, "/no/such/dir/f", MemBlob([]byte("x")), now); !guardapi.IsNotFound(err) {
		t.Fatal("PUT into a missing directory:", err)
	}
	// a stopped container still serves archives (R6)
	g.StopContainer("ccg-21-app")
	if b, err := ReadFile(ctx, a, "/big", 1000); err != nil || len(b) != 100 {
		t.Fatal(err)
	}
}

// covers: W1 W7 (tar layout: one root 0755 regular file; truncated and oversized archives)
func TestTarStreamAndReadSingleFile(t *testing.T) {
	data := MemBlob(bytes.Repeat([]byte("a"), 1000))
	size, rc, err := TarStream("worker.next-x", data, now)
	if err != nil {
		t.Fatal(err)
	}
	all, _ := io.ReadAll(rc)
	rc.Close()
	if int64(len(all)) != size || size%512 != 0 {
		t.Fatalf("size %d, read %d", size, len(all))
	}
	tr := tar.NewReader(bytes.NewReader(all))
	h, err := tr.Next()
	if err != nil || h.Name != "worker.next-x" || h.Mode != 0o755 || h.Uid != 0 || h.Gid != 0 || h.Uname != "root" ||
		h.Size != 1000 || !h.ModTime.Equal(now) || h.Typeflag != tar.TypeReg {
		t.Fatalf("%+v %v", h, err)
	}
	if got, err := ReadSingleFile(bytes.NewReader(all), 1000); err != nil || len(got) != 1000 {
		t.Fatal(err)
	}
	if _, err := ReadSingleFile(bytes.NewReader(all), 999); !errors.Is(err, ErrNotSingleFile) {
		t.Fatal(err)
	}
	if _, err := ReadSingleFile(bytes.NewReader(all[:700]), 1000); !errors.Is(err, ErrArchive) {
		t.Fatal("truncated:", err)
	}
	var two bytes.Buffer
	tw := tar.NewWriter(&two)
	for _, n := range []string{"a", "b"} {
		tw.WriteHeader(&tar.Header{Name: n, Size: 1, Mode: 0o644, Typeflag: tar.TypeReg})
		tw.Write([]byte("x"))
	}
	tw.Close()
	if _, err := ReadSingleFile(&two, 10); !errors.Is(err, ErrNotSingleFile) {
		t.Fatal("two entries:", err)
	}
	if _, err := ReadSingleFile(bytes.NewReader(make([]byte, 4<<20)), 10); !errors.Is(err, ErrArchive) {
		t.Fatal("a stream far over limit + 1 MiB:", err)
	}
	if !IsELF(MemBlob([]byte("\x7fELFxx"))) || IsELF(MemBlob([]byte("#!/bin/sh"))) || IsELF(MemBlob(nil)) {
		t.Fatal("IsELF")
	}
	if Bytes(data) == nil || data.Close() != nil {
		t.Fatal("memory blob")
	}
}

// covers: 02-§5.4 (large blobs are spooled to disk, hashed while read)
func TestReadBlobSpools(t *testing.T) {
	dir := t.TempDir()
	spool := func() (*os.File, error) { return os.CreateTemp(dir, "spool-*") }
	small, err := ReadBlob(strings.NewReader("hello"), 100, spool)
	if err != nil || small.Size() != 5 || small.SHA256() != Digest([]byte("hello")) {
		t.Fatal(err)
	}
	big := bytes.Repeat([]byte("z"), SpoolThreshold+10)
	b, err := ReadBlob(bytes.NewReader(big), int64(len(big)), spool)
	if err != nil || b.Size() != int64(len(big)) || b.SHA256() != Digest(big) || Bytes(b) != nil {
		t.Fatal(err)
	}
	rc, _ := b.Open()
	got, _ := io.ReadAll(rc)
	rc.Close()
	if !bytes.Equal(got, big) {
		t.Fatal("spooled content")
	}
	if err := b.Close(); err != nil {
		t.Fatal(err)
	}
	if list, _ := os.ReadDir(dir); len(list) != 0 {
		t.Fatal("Close removes the spool file")
	}
	if _, err := ReadBlob(bytes.NewReader(big), int64(len(big)-1), spool); err != ErrTooLarge {
		t.Fatal(err)
	}
	if list, _ := os.ReadDir(dir); len(list) != 0 {
		t.Fatal("a refused blob leaves no file")
	}
	if _, err := ReadBlob(strings.NewReader("hello"), 4, spool); err != ErrTooLarge {
		t.Fatal(err)
	}
}

// covers: W1 P2 O8 (image files through the guard)
func TestImageFile(t *testing.T) {
	g := fakeguard.New()
	g.AddImage("app:2", fakeguard.ImageSpec{Files: map[string][]byte{"/usr/local/bin/worker": []byte("\x7fELF w"),
		"/opt/ccgateway/cli/2.1.312/claude": []byte("\x7fELF c")}})
	client := g.Client()
	spool := func() (*os.File, error) { return os.CreateTemp(t.TempDir(), "s") }
	b, err := ImageFile(context.Background(), client, "app:2", "/usr/local/bin/worker", WorkerMaxBytes, spool)
	if err != nil || !IsELF(b) {
		t.Fatal(err)
	}
	if _, err := ImageFile(context.Background(), client, "app:2", "/missing", 10, spool); !guardapi.IsNotFound(err) {
		t.Fatal(err)
	}
	if _, err := ImageFile(context.Background(), client, "app:2", "/opt/ccgateway/cli", 10, spool); !errors.Is(err, guardapi.ErrNotRegularFile) {
		t.Fatal(err)
	}
	if _, err := ImageFile(context.Background(), client, "app:2", "/usr/local/bin/worker", 3, spool); !errors.Is(err, guardapi.ErrFileTooLarge) {
		t.Fatal(err)
	}
	if _, err := ImageFile(context.Background(), client, "nope:1", "/x", 3, spool); !guardapi.IsNotFound(err) {
		t.Fatal(err)
	}
}

// covers: W12 (the identity of the guard's raw inspect changes with what must not change)
func TestIdentityOfFakeContainers(t *testing.T) {
	g := fakeguard.New()
	a := app(t, g, "21", fakeguard.ContainerSpec{})
	first, err := Identity(a.Attrs())
	if err != nil {
		t.Fatal(err)
	}
	g.RestartContainer("ccg-21-app")
	acct, _ := g.Client().Account(context.Background(), "21")
	if again, _ := Identity(acct.App); again != first {
		t.Fatal("a restart keeps the identity")
	}
	if !strings.Contains(first, `"mounts": []`) && !strings.Contains(first, `"mounts": [`) {
		t.Fatal(first)
	}
}
