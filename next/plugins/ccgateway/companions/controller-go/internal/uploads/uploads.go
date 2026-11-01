package uploads

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"os"
	"path/filepath"
	"sync"
	"time"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/rnd"
)

// Limits of images.py (B3).
const (
	MaxSize      = 4 << 30
	MaxChunk     = 64 << 20
	MaxPending   = 4
	StaleSeconds = 3600
	readChunk    = 1 << 20
)

// Uploads is images.Uploads: <id>.part (the bytes received; its size is the
// offset) and <id>.json ({"size", "sha256"}) in a private directory.
type Uploads struct {
	o    Options
	mu   sync.Mutex             // busy, create and the stale cleanup
	busy map[string]*sync.Mutex // per-upload lock (long I/O)
}

var _ contract.Uploads = (*Uploads)(nil)

// New is the upload store over opts.Dir (created 0700).
func New(opts Options) (contract.Uploads, error) {
	if err := opts.Defaults(); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(opts.Dir, 0o700); err != nil {
		return nil, err
	}
	if err := os.Chmod(opts.Dir, 0o700); err != nil {
		return nil, err
	}
	return &Uploads{o: opts, busy: map[string]*sync.Mutex{}}, nil
}

func fail(status int, code string) *contract.UploadError {
	return &contract.UploadError{Status: status, Code: code}
}

func notFound() *contract.UploadError { return fail(404, "not_found") }

func invalid() *contract.UploadError { return fail(400, "invalid_request") }

func (u *Uploads) paths(id string) (part, meta string, err error) {
	if !names.UploadID.MatchString(id) {
		return "", "", notFound()
	}
	return filepath.Join(u.o.Dir, id+".part"), filepath.Join(u.o.Dir, id+".json"), nil
}

type info struct {
	part   string
	size   int64
	sha256 string // "" when not declared
	offset int64
}

// meta reads an upload's record; a missing or unreadable one is not_found.
func (u *Uploads) meta(id string) (*info, error) {
	part, meta, err := u.paths(id)
	if err != nil {
		return nil, err
	}
	raw, err := os.ReadFile(meta)
	if err != nil {
		return nil, notFound()
	}
	data, err := pyjson.DecodeObject(raw)
	if err != nil {
		return nil, notFound()
	}
	st, err := os.Stat(part)
	if err != nil {
		return nil, notFound()
	}
	sv, _ := data.Get("size")
	if !pyjson.IsInt(sv) {
		return nil, errors.New("upload record without a size")
	}
	size, err := pyjson.IntOf(sv)
	if err != nil {
		return nil, err
	}
	digest, _ := data.Get("sha256")
	d, _ := digest.(string)
	return &info{part: part, size: size, sha256: d, offset: st.Size()}, nil
}

// lockOf is the upload's lock, not yet taken; not_found when it does not exist.
func (u *Uploads) lockOf(id string) (*sync.Mutex, error) {
	_, meta, err := u.paths(id)
	if err != nil {
		return nil, err
	}
	u.mu.Lock()
	defer u.mu.Unlock()
	if _, err := os.Stat(meta); err != nil {
		return nil, notFound()
	}
	l := u.busy[id]
	if l == nil {
		l = &sync.Mutex{}
		u.busy[id] = l
	}
	return l, nil
}

func (u *Uploads) remove(id string) {
	part, meta, err := u.paths(id)
	if err != nil {
		return
	}
	os.Remove(part)
	os.Remove(meta)
	u.mu.Lock()
	delete(u.busy, id)
	u.mu.Unlock()
}

func mtime(p string) (time.Time, bool) {
	st, err := os.Stat(p)
	if err != nil {
		return time.Time{}, false
	}
	return st.ModTime(), true
}

// pending are the ids of the recorded uploads.
func (u *Uploads) pending() []string {
	list, err := os.ReadDir(u.o.Dir)
	if err != nil {
		return nil
	}
	var out []string
	for _, d := range list {
		name := d.Name()
		if len(name) == 22+len(".json") && filepath.Ext(name) == ".json" && names.UploadID.MatchString(name[:22]) {
			out = append(out, name[:22])
		}
	}
	return out
}

// cleanup removes uploads untouched for StaleSeconds (U6); uploads being
// written or loaded are skipped. The caller holds u.mu.
func (u *Uploads) cleanup(now time.Time) {
	for _, id := range u.pending() {
		part, meta, _ := u.paths(id)
		changed, ok := mtime(meta)
		if !ok {
			continue
		}
		if p, ok := mtime(part); ok && p.After(changed) {
			changed = p
		}
		if now.Sub(changed) <= StaleSeconds*time.Second {
			continue
		}
		l := u.busy[id]
		if l != nil && !l.TryLock() {
			continue
		}
		os.Remove(part)
		os.Remove(meta)
		delete(u.busy, id)
		if l != nil {
			l.Unlock()
		}
	}
}

// Create is POST /images/uploads (U1).
func (u *Uploads) Create(ctx context.Context, size, digest any) (pyjson.Ordered, error) {
	if !pyjson.IsInt(size) {
		return nil, invalid()
	}
	n, err := pyjson.IntOf(size)
	if err != nil || n < 1 || n > MaxSize {
		return nil, invalid()
	}
	var sum any
	if digest != nil {
		s, ok := digest.(string)
		if !ok || !names.SHA256Hex.MatchString(s) {
			return nil, invalid()
		}
		sum = s
	}
	u.mu.Lock()
	defer u.mu.Unlock()
	u.cleanup(u.o.Clock.Now())
	if len(u.pending()) >= MaxPending {
		return nil, fail(409, "too_many_uploads")
	}
	id := rnd.TokenURLSafe(u.o.Rand, 16)
	part, meta, err := u.paths(id)
	if err != nil {
		return nil, err
	}
	f, err := os.OpenFile(part, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return nil, err
	}
	f.Close()
	record, err := pyjson.Marshal(pyjson.Ordered{{Key: "size", Value: n}, {Key: "sha256", Value: sum}})
	if err == nil {
		err = writeReplace(meta, record)
	}
	if err != nil {
		os.Remove(part)
		return nil, err
	}
	return pyjson.Ordered{{Key: "upload_id", Value: id}, {Key: "offset", Value: 0}, {Key: "size", Value: n}}, nil
}

// writeReplace writes <name>.tmp (0600) and renames it over name (the
// .json record; Python's meta.with_suffix('.tmp')).
func writeReplace(name string, data []byte) error {
	tmp := name[:len(name)-len(filepath.Ext(name))] + ".tmp"
	f, err := os.OpenFile(tmp, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o600)
	if err != nil {
		return err
	}
	_, err = f.Write(data)
	if cerr := f.Close(); err == nil {
		err = cerr
	}
	if err == nil {
		err = os.Rename(tmp, name)
	}
	if err != nil {
		os.Remove(tmp)
	}
	return err
}

// Status is GET /images/uploads/<id> (U3, no lock).
func (u *Uploads) Status(ctx context.Context, id string) (pyjson.Ordered, error) {
	m, err := u.meta(id)
	if err != nil {
		return nil, err
	}
	return pyjson.Ordered{{Key: "offset", Value: m.offset}, {Key: "size", Value: m.size}}, nil
}

// Delete is DELETE /images/uploads/<id> (U3).
func (u *Uploads) Delete(ctx context.Context, id string) (pyjson.Ordered, error) {
	l, err := u.lockOf(id)
	if err != nil {
		return nil, err
	}
	l.Lock()
	defer l.Unlock()
	if _, err := u.meta(id); err != nil {
		return nil, err
	}
	u.remove(id)
	return pyjson.Ordered{{Key: "deleted", Value: true}}, nil
}

// Write is PUT /images/uploads/<id> (U2): exactly length bytes of body at
// offset, read at most 1 MiB at a time; a chunk is written completely or
// not at all (the part file is cut back to offset on any failure).
func (u *Uploads) Write(ctx context.Context, id string, offset, length int64, body io.Reader) (pyjson.Ordered, error) {
	l, err := u.lockOf(id)
	if err != nil {
		return nil, err
	}
	l.Lock()
	defer l.Unlock()
	m, err := u.meta(id)
	if err != nil {
		return nil, err
	}
	if offset != m.offset {
		e := fail(409, "offset_mismatch")
		e.Extra = pyjson.Ordered{{Key: "offset", Value: m.offset}}
		return nil, e
	}
	if m.offset+length > m.size {
		return nil, invalid()
	}
	f, err := os.OpenFile(m.part, os.O_RDWR, 0)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	if err := copyChunk(f, m.offset, length, body); err != nil {
		if terr := f.Truncate(m.offset); terr != nil {
			u.o.Log.Error("upload %s: cannot discard a partial chunk: %v", id, terr)
		}
		return nil, err
	}
	return pyjson.Ordered{{Key: "offset", Value: m.offset + length}, {Key: "size", Value: m.size}}, nil
}

// copyChunk is images._copy: an early end of the body is invalid_request.
func copyChunk(f *os.File, offset, length int64, body io.Reader) error {
	if _, err := f.Seek(offset, io.SeekStart); err != nil {
		return err
	}
	buf := make([]byte, min(length, readChunk))
	for remaining := length; remaining > 0; {
		n, err := body.Read(buf[:min(remaining, int64(len(buf)))])
		if n > 0 {
			if _, werr := f.Write(buf[:n]); werr != nil {
				return werr
			}
			remaining -= int64(n)
		}
		if remaining == 0 {
			break
		}
		if err == io.EOF || errors.Is(err, io.ErrUnexpectedEOF) {
			e := invalid()
			e.Err = io.ErrUnexpectedEOF
			return e
		}
		if err != nil {
			return err
		}
	}
	return nil
}

// Load is POST /images/uploads/<id>/load (U4): the whole file's digest
// checked, then streamed to the guard's images/load. Except for
// incomplete, the upload is removed whatever the outcome. The guard decides
// the names (the archive's own tags); they are answered as given.
func (u *Uploads) Load(ctx context.Context, id string) (pyjson.Ordered, error) {
	l, err := u.lockOf(id)
	if err != nil {
		return nil, err
	}
	l.Lock()
	defer l.Unlock()
	m, err := u.meta(id)
	if err != nil {
		return nil, err
	}
	if m.offset != m.size {
		return nil, fail(409, "incomplete")
	}
	defer u.remove(id)
	digest, err := fileDigest(m.part)
	if err != nil {
		return nil, err
	}
	if m.sha256 != "" && m.sha256 != digest {
		return nil, fail(400, "checksum_mismatch")
	}
	f, err := os.Open(m.part)
	if err != nil {
		return nil, err
	}
	loaded, err := u.o.Images.ImageLoad(ctx, f, m.size)
	f.Close()
	if err != nil {
		code := "load_failed"
		if errors.Is(err, guardapi.ErrLoadForbidden) {
			code = "load_forbidden"
		}
		u.o.Log.Warn("upload %s: image load failed: %v", id, err)
		e := fail(400, code)
		e.Err = err
		return nil, e
	}
	if len(loaded) == 0 {
		return nil, fail(400, "load_failed")
	}
	images := make([]any, len(loaded))
	for i, img := range loaded {
		images[i] = img
	}
	return pyjson.Ordered{{Key: "sha256", Value: digest}, {Key: "images", Value: images}}, nil
}

func fileDigest(p string) (string, error) {
	f, err := os.Open(p)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}
