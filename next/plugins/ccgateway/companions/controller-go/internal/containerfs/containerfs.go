// Package containerfs is file work inside account containers through the
// guard (Python dockerfs.py; behaviour W1, W3, W5-W7, W12, S35): single
// files over the archive API, the staged replace of a program, the idle
// check and the container identity.
//
// Large files (the CLI up to 512 MiB, the Worker up to 256 MiB) travel as a
// Blob: in memory up to 1 MiB, else spooled to <root>/.spool, hashed while
// read. A tar for PUT archive is streamed (header, content, padding, end
// blocks), never copied in memory; a file written is verified by hashing
// its read-back as it streams.
//
// FROZEN: App, Blob and every exported function.
package containerfs

import (
	"archive/tar"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path"
	"strings"
	"time"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/rnd"
)

// Program locations (dockerfs.WORKER_*).
const (
	WorkerSource   = "/usr/local/bin/worker"
	WorkerDir      = "/usr/local/bin"
	WorkerMaxBytes = 256 << 20
	ArchiveSlack   = 1 << 20 // headers and padding of one entry
)

// WorkerNames are the program names a container may run.
var WorkerNames = []string{"worker", "ccgateway"}

// App is an account container (guardapi.AppHandle in production).
type App interface {
	ID() string
	Attrs() *guardapi.Container
	Exec(ctx context.Context, argv []string, user string) (code int, out []byte, err error)
	ArchiveGet(ctx context.Context, path string) (io.ReadCloser, error)
	ArchivePut(ctx context.Context, dir string, archive io.Reader, size int64) error
	Top(ctx context.Context) (*guardapi.Top, error)
}

var _ App = (*guardapi.AppHandle)(nil)

// Identity is dockerfs.container_identity: json.dumps of id, image,
// config_image, user, labels, the sorted json.dumps(sort_keys) of every
// mount, path and args, with sort_keys, computed from the raw inspect so
// it matches what Python stored in state.active_runtime (RB4).
func Identity(c *guardapi.Container) (string, error) {
	raw := c.Raw
	get := func(o pyjson.Ordered, key string) any {
		v, _ := o.Get(key)
		return v
	}
	config, _ := get(raw, "Config").(pyjson.Ordered)
	labels := get(config, "Labels")
	if !pyjson.Truthy(labels) {
		labels = pyjson.Ordered{} // container.labels: `result or {}`
	}
	var mounts []string
	if list, ok := get(raw, "Mounts").([]any); ok {
		for _, m := range list {
			b, err := pyjson.MarshalSorted(m)
			if err != nil {
				return "", err
			}
			mounts = append(mounts, string(b))
		}
	}
	sortStrings(mounts)
	mountList := make([]any, len(mounts))
	for i, m := range mounts {
		mountList[i] = m
	}
	b, err := pyjson.MarshalSorted(pyjson.Ordered{
		{Key: "id", Value: get(raw, "Id")},
		{Key: "image", Value: get(raw, "Image")},
		{Key: "config_image", Value: get(config, "Image")},
		{Key: "user", Value: get(config, "User")},
		{Key: "labels", Value: labels},
		{Key: "mounts", Value: mountList},
		{Key: "path", Value: get(raw, "Path")},
		{Key: "args", Value: get(raw, "Args")},
	})
	return string(b), err
}

func sortStrings(s []string) {
	for i := 1; i < len(s); i++ {
		for j := i; j > 0 && s[j] < s[j-1]; j-- {
			s[j], s[j-1] = s[j-1], s[j]
		}
	}
}

// WorkerTarget is dockerfs.worker_target: (path, basename) of the worker
// program the container runs: the first of Path + Args whose basename is a
// worker name, as the bare name or under /usr/local/bin.
func WorkerTarget(c *guardapi.Container) (string, string, error) {
	var entries []any
	if v, ok := c.Raw.Get("Path"); ok {
		entries = append(entries, v)
	} else {
		entries = append(entries, nil)
	}
	if v, ok := c.Raw.Get("Args"); ok {
		if list, ok := v.([]any); ok {
			entries = append(entries, list...)
		}
	}
	for _, e := range entries {
		s, ok := e.(string)
		if !ok {
			continue
		}
		base := path.Base(s)
		if s == "" || strings.HasSuffix(s, "/") {
			base = "" // posixpath.basename keeps "" after a trailing slash
		}
		for _, name := range WorkerNames {
			if base == name {
				if s != base && s != WorkerDir+"/"+base {
					return "", "", errs.New(errs.UnsupportedContainer, "worker program outside "+WorkerDir)
				}
				return WorkerDir + "/" + base, base, nil
			}
		}
	}
	return "", "", errs.New(errs.UnsupportedContainer, "container command runs no worker program")
}

// ErrProcessList is worker_idle's RuntimeError for a list without COMMAND.
var ErrProcessList = errors.New("unexpected process list")

// WorkerIdle is dockerfs.worker_idle: no process besides docker-init and
// the worker (its name cut to 15 characters, as Linux comm is).
func WorkerIdle(ctx context.Context, a App, base string) (bool, error) {
	top, err := a.Top(ctx)
	if err != nil {
		return false, err
	}
	column := -1
	for i, t := range top.Titles {
		if t == "COMMAND" {
			column = i
			break
		}
	}
	if column < 0 {
		return false, ErrProcessList
	}
	short := []rune(base)
	if len(short) > 15 {
		short = short[:15]
	}
	for _, p := range top.Processes {
		if len(p) <= column || (p[column] != "docker-init" && p[column] != string(short)) {
			return false, nil
		}
	}
	return true, nil
}

// SHA256In is dockerfs.sha256_in: the file's SHA-256 inside a running
// container as root; ok=false when unreadable. Guard errors are returned.
func SHA256In(ctx context.Context, a App, p string) (string, bool, error) {
	code, out, err := a.Exec(ctx, []string{"sha256sum", p}, guardapi.UserRoot)
	if err != nil {
		return "", false, err
	}
	digest, _, _ := strings.Cut(string(out), " ")
	if code != 0 || len(digest) != 64 || strings.Trim(digest, "0123456789abcdef") != "" {
		return "", false, nil
	}
	return digest, true, nil
}

// Discard is dockerfs.discard: rm -f as root, every error ignored.
func Discard(ctx context.Context, a App, p string) {
	a.Exec(ctx, []string{"rm", "-f", p}, guardapi.UserRoot)
}

// TempName is <target>.next-<12 hex characters>.
func TempName(target string, r rnd.Source) string { return target + ".next-" + rnd.TokenHex(r, 6) }

// Stage is dockerfs.stage: put data next to target as a temporary root
// 0755 file and verify owner, mode and digest; the file is removed on failure.
func Stage(ctx context.Context, a App, target string, data Blob, r rnd.Source, now time.Time) (string, error) {
	tmp := TempName(target, r)
	err := func() error {
		size, stream, err := TarStream(path.Base(tmp), data, now)
		if err != nil {
			return err
		}
		defer stream.Close()
		if err := a.ArchivePut(ctx, path.Dir(target), stream, size); err != nil {
			return err
		}
		if code, _, err := a.Exec(ctx, []string{"chmod", "0755", tmp}, guardapi.UserRoot); err != nil {
			return err
		} else if code != 0 {
			return errors.New("chmod failed")
		}
		code, out, err := a.Exec(ctx, []string{"stat", "-c", "%u:%g:%a", tmp}, guardapi.UserRoot)
		if err != nil {
			return err
		}
		if code != 0 || string(bytes.TrimSpace(out)) != "0:0:755" {
			return errors.New("unexpected owner or mode")
		}
		digest, ok, err := SHA256In(ctx, a, tmp)
		if err != nil {
			return err
		}
		if !ok || digest != data.SHA256() {
			return errors.New("copied program differs")
		}
		return nil
	}()
	if err != nil {
		Discard(context.WithoutCancel(ctx), a, tmp)
		return "", err
	}
	return tmp, nil
}

// Swap is dockerfs.swap: mv -f tmp target as root; tmp is removed on failure.
func Swap(ctx context.Context, a App, tmp, target string) error {
	code, _, err := a.Exec(ctx, []string{"mv", "-f", tmp, target}, guardapi.UserRoot)
	if err != nil || code != 0 {
		Discard(context.WithoutCancel(ctx), a, tmp)
		if err != nil {
			return err
		}
		return errors.New("replace failed")
	}
	return nil
}

// ErrArchive matches every read_single_file failure (Python ValueError).
var ErrArchive = errors.New("invalid file archive")

// ErrNotSingleFile: the archive is not exactly one regular file within the limit.
var ErrNotSingleFile = fmt.Errorf("%w: not a single regular file", ErrArchive)

func archiveErr(msg string, err error) error {
	if err != nil {
		return fmt.Errorf("%w: %s: %v", ErrArchive, msg, err)
	}
	return fmt.Errorf("%w: %s", ErrArchive, msg)
}

// ReadSingleFile is dockerfs.read_single_file on a tar stream: the content
// of its only entry, which must be a regular file of at most limit bytes;
// at most limit + 1 MiB of archive is read. For small files only: the
// content is returned in memory (large ones go through CopySingleFile).
func ReadSingleFile(archive io.Reader, limit int64) ([]byte, error) {
	var buf bytes.Buffer
	if _, err := CopySingleFile(&buf, archive, limit); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// CopySingleFile is ReadSingleFile streamed into w (same checks, same
// errors): the entry's content is copied, never held, so a 512 MiB CLI
// costs a copy buffer. It returns the content's size.
func CopySingleFile(w io.Writer, archive io.Reader, limit int64) (int64, error) {
	lr := &io.LimitedReader{R: archive, N: limit + ArchiveSlack + 1}
	tr := tar.NewReader(lr)
	h, err := tr.Next()
	if err != nil {
		if lr.N <= 0 {
			return 0, archiveErr("archive too large", nil)
		}
		return 0, archiveErr("invalid archive", err)
	}
	if h.Typeflag != tar.TypeReg || h.Size > limit {
		return 0, ErrNotSingleFile
	}
	n, err := io.Copy(w, tr)
	if err != nil {
		if lr.N <= 0 {
			return 0, archiveErr("archive too large", nil)
		}
		return 0, archiveErr("invalid archive", err)
	}
	if n != h.Size {
		return 0, archiveErr("truncated archive", nil)
	}
	if _, err := tr.Next(); err != io.EOF {
		if lr.N <= 0 {
			return 0, archiveErr("archive too large", nil)
		}
		return 0, ErrNotSingleFile
	}
	io.Copy(io.Discard, lr)
	if lr.N <= 0 {
		return 0, archiveErr("archive too large", nil)
	}
	return n, nil
}

// ReadFile is dockerfs.read_file: the regular file p of the container
// (guardapi.ErrNotFound when absent). For small files; see FileSHA256.
func ReadFile(ctx context.Context, a App, p string, limit int64) ([]byte, error) {
	rc, err := a.ArchiveGet(ctx, p)
	if err != nil {
		return nil, err
	}
	defer rc.Close()
	return ReadSingleFile(rc, limit)
}

// FileSHA256 is ReadFile hashed while it streams: the hex SHA-256 of the
// regular file p (same errors as ReadFile), its content never in memory.
func FileSHA256(ctx context.Context, a App, p string, limit int64) (string, error) {
	rc, err := a.ArchiveGet(ctx, p)
	if err != nil {
		return "", err
	}
	defer rc.Close()
	h := sha256.New()
	if _, err := CopySingleFile(h, rc, limit); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// WriteFile is dockerfs.write_file: put data at p (root 0755) and read it
// back. Both directions stream: the read-back is hashed, not kept. (Python
// reads it into memory; doing the same with a 230 MiB CLI took the Go
// controller past its 1 GiB memory cgroup on 2026-11-01.)
func WriteFile(ctx context.Context, a App, p string, data Blob, now time.Time) error {
	size, stream, err := TarStream(path.Base(p), data, now)
	if err != nil {
		return err
	}
	err = a.ArchivePut(ctx, path.Dir(p), stream, size)
	stream.Close()
	if err != nil {
		return err
	}
	limit := data.Size()
	if limit < 65536 {
		limit = 65536
	}
	back, err := FileSHA256(ctx, a, p, limit)
	if err != nil {
		return err
	}
	if back != data.SHA256() {
		return errors.New("runtime file verification failed")
	}
	return nil
}

// TarStream is dockerfs.tar_file streamed: one root-owned 0755 regular file
// called name with mtime now. It returns the exact size and the stream.
func TarStream(name string, data Blob, now time.Time) (int64, io.ReadCloser, error) {
	var hdr bytes.Buffer
	tw := tar.NewWriter(&hdr)
	if err := tw.WriteHeader(&tar.Header{Name: name, Mode: 0o755, Uid: 0, Gid: 0, Uname: "root", Gname: "root",
		Size: data.Size(), ModTime: time.Unix(now.Unix(), 0), Typeflag: tar.TypeReg, Format: tar.FormatPAX}); err != nil {
		return 0, nil, err
	}
	body, err := data.Open()
	if err != nil {
		return 0, nil, err
	}
	pad := (512 - data.Size()%512) % 512
	size := int64(hdr.Len()) + data.Size() + pad + 1024
	r := io.MultiReader(bytes.NewReader(hdr.Bytes()), io.LimitReader(body, data.Size()),
		bytes.NewReader(make([]byte, pad+1024)))
	return size, readCloser{Reader: r, Closer: body}, nil
}

type readCloser struct {
	io.Reader
	io.Closer
}

// Digest is the hex SHA-256 of data.
func Digest(data []byte) string {
	s := sha256.Sum256(data)
	return hex.EncodeToString(s[:])
}

// Blob is a file's content of known size and digest.
type Blob interface {
	Size() int64
	SHA256() string
	Open() (io.ReadCloser, error)
	// Close releases a spooled blob's file (a memory blob does nothing).
	Close() error
}

// MemBlob is a Blob in memory.
func MemBlob(data []byte) Blob { return &memBlob{data: data, sum: Digest(data)} }

type memBlob struct {
	data []byte
	sum  string
}

func (b *memBlob) Size() int64    { return int64(len(b.data)) }
func (b *memBlob) SHA256() string { return b.sum }
func (b *memBlob) Open() (io.ReadCloser, error) {
	return io.NopCloser(bytes.NewReader(b.data)), nil
}
func (b *memBlob) Close() error { return nil }

// Bytes returns a memory blob's content (nil for a spooled one).
func Bytes(b Blob) []byte {
	if m, ok := b.(*memBlob); ok {
		return m.data
	}
	return nil
}

// SpoolThreshold is the size above which ReadBlob spools to disk. It is
// small on purpose: a blob is held for a whole activation (the idle wait
// alone is up to two minutes), once per runtime being updated.
const SpoolThreshold = 1 << 20

// ErrTooLarge is a blob larger than its limit.
var ErrTooLarge = errors.New("file larger than its limit")

// ReadBlob reads r (at most limit bytes) into a Blob: memory up to
// SpoolThreshold, else a file from spool (store.CreateSpool), which Close
// removes. The digest is computed while reading; a spool file is written
// through to disk every dropStep bytes and dropped from the page cache
// (its pages are charged to the controller's memory cgroup).
func ReadBlob(r io.Reader, limit int64, spool func() (*os.File, error)) (Blob, error) {
	h := sha256.New()
	head := make([]byte, min(limit, SpoolThreshold)+1)
	n, err := io.ReadFull(io.TeeReader(r, h), head)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		return nil, err
	}
	if int64(n) > limit {
		return nil, ErrTooLarge
	}
	if n <= SpoolThreshold {
		return &memBlob{data: append([]byte(nil), head[:n]...), sum: hex.EncodeToString(h.Sum(nil))}, nil
	}
	f, err := spool()
	if err != nil {
		return nil, err
	}
	fail := func(err error) (Blob, error) {
		f.Close()
		os.Remove(f.Name())
		return nil, err
	}
	w := &dropWriter{f: f}
	if _, err := w.Write(head); err != nil {
		return fail(err)
	}
	rest, err := io.Copy(w, io.TeeReader(io.LimitReader(r, limit-int64(n)+1), h))
	if err != nil {
		return fail(err)
	}
	if int64(n)+rest > limit {
		return fail(ErrTooLarge)
	}
	if err := w.flush(); err != nil {
		return fail(err)
	}
	if err := f.Close(); err != nil {
		return fail(err)
	}
	return &fileBlob{path: f.Name(), size: int64(n) + rest, sum: hex.EncodeToString(h.Sum(nil))}, nil
}

// dropStep is how much of a spool file may be dirty or cached before it is
// written through and dropped (dropWriter, dropReader).
const dropStep = 8 << 20

// dropWriter writes a spool file; every dropStep bytes it writes the new
// range to disk and drops it from the page cache (Linux; elsewhere nothing).
type dropWriter struct {
	f       *os.File
	off     int64 // written so far
	flushed int64 // written through and dropped up to here
}

func (w *dropWriter) Write(p []byte) (int, error) {
	n, err := w.f.Write(p)
	w.off += int64(n)
	if err == nil && w.off-w.flushed >= dropStep {
		err = w.flush()
	}
	return n, err
}

func (w *dropWriter) flush() error {
	if w.off > w.flushed {
		if err := writeThrough(w.f, w.flushed, w.off-w.flushed); err != nil {
			return err
		}
		w.flushed = w.off
	}
	return nil
}

// dropReader reads a spool file and drops what it has read from the page
// cache every dropStep bytes (a shared CLI is read once per runtime).
type dropReader struct {
	f       *os.File
	off     int64
	dropped int64
}

func (r *dropReader) Read(p []byte) (int, error) {
	n, err := r.f.Read(p)
	r.off += int64(n)
	if r.off-r.dropped >= dropStep || (err != nil && r.off > r.dropped) {
		dropCache(r.f, r.dropped, r.off-r.dropped)
		r.dropped = r.off
	}
	return n, err
}

func (r *dropReader) Close() error { return r.f.Close() }

type fileBlob struct {
	path string
	size int64
	sum  string
}

func (b *fileBlob) Size() int64    { return b.size }
func (b *fileBlob) SHA256() string { return b.sum }
func (b *fileBlob) Open() (io.ReadCloser, error) {
	f, err := os.Open(b.path)
	if err != nil {
		return nil, err
	}
	return &dropReader{f: f}, nil
}
func (b *fileBlob) Close() error {
	err := os.Remove(b.path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	return err
}

// IsELF reports whether a blob starts with the ELF magic.
func IsELF(b Blob) bool {
	rc, err := b.Open()
	if err != nil {
		return false
	}
	defer rc.Close()
	head := make([]byte, 4)
	if _, err := io.ReadFull(rc, head); err != nil {
		return false
	}
	return string(head) == "\x7fELF"
}

// ImageFile reads one file of an image through the guard into a Blob
// (dockerfs.image_container + read_file; W1, P2).
func ImageFile(ctx context.Context, images guardapi.ImagesAPI, ref, p string, limit int64, spool func() (*os.File, error)) (Blob, error) {
	rc, _, err := images.ImageFile(ctx, ref, p, limit)
	if err != nil {
		return nil, err
	}
	defer rc.Close()
	return ReadBlob(rc, limit, spool)
}
