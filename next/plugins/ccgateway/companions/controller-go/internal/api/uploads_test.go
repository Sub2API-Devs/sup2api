package api

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net"
	"strings"
	"sync"
	"testing"
	"time"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/pyjson"
)

// memUploads is an in-memory stand-in with images.Uploads' observable
// behaviour (U1-U4), enough to drive the HTTP layer.
type memUploads struct {
	mu      sync.Mutex
	next    int
	items   map[string]*memUpload
	writing chan struct{} // closed when a Write returns (interrupted chunk test)
	loaded  [][]byte
}

type memUpload struct {
	size int64
	sha  string
	data []byte
}

func newMemUploads() *memUploads { return &memUploads{items: map[string]*memUpload{}} }

func notFound() error { return &contract.UploadError{Status: 404, Code: "not_found"} }

func (u *memUploads) Create(ctx context.Context, size, sha any) (pyjson.Ordered, error) {
	n, err := pyjson.IntOf(size)
	if !pyjson.IsInt(size) || err != nil || n < 1 || n > 4<<30 {
		return nil, &contract.UploadError{Status: 400, Code: "invalid_request"}
	}
	s := ""
	if sha != nil {
		str, ok := sha.(string)
		if !ok || len(str) != 64 || strings.ToLower(str) != str {
			return nil, &contract.UploadError{Status: 400, Code: "invalid_request"}
		}
		s = str
	}
	u.mu.Lock()
	defer u.mu.Unlock()
	if len(u.items) >= 4 {
		return nil, &contract.UploadError{Status: 409, Code: "too_many_uploads"}
	}
	u.next++
	id := fmt.Sprintf("%022d", u.next)
	u.items[id] = &memUpload{size: n, sha: s}
	return pyjson.Ordered{{Key: "upload_id", Value: id}, {Key: "offset", Value: 0}, {Key: "size", Value: n}}, nil
}

func (u *memUploads) get(id string) (*memUpload, error) {
	u.mu.Lock()
	defer u.mu.Unlock()
	it, ok := u.items[id]
	if !ok {
		return nil, notFound()
	}
	return it, nil
}

func (u *memUploads) Status(ctx context.Context, id string) (pyjson.Ordered, error) {
	it, err := u.get(id)
	if err != nil {
		return nil, err
	}
	u.mu.Lock()
	defer u.mu.Unlock()
	return pyjson.Ordered{{Key: "offset", Value: len(it.data)}, {Key: "size", Value: it.size}}, nil
}

func (u *memUploads) Delete(ctx context.Context, id string) (pyjson.Ordered, error) {
	u.mu.Lock()
	defer u.mu.Unlock()
	if _, ok := u.items[id]; !ok {
		return nil, notFound()
	}
	delete(u.items, id)
	return pyjson.Ordered{{Key: "deleted", Value: true}}, nil
}

func (u *memUploads) Write(ctx context.Context, id string, offset, length int64, body io.Reader) (pyjson.Ordered, error) {
	defer func() {
		u.mu.Lock()
		if u.writing != nil {
			close(u.writing)
			u.writing = nil
		}
		u.mu.Unlock()
	}()
	it, err := u.get(id)
	if err != nil {
		return nil, err
	}
	u.mu.Lock()
	current := int64(len(it.data))
	u.mu.Unlock()
	if offset != current {
		return nil, &contract.UploadError{Status: 409, Code: "offset_mismatch", Extra: pyjson.Ordered{{Key: "offset", Value: current}}}
	}
	if current+length > it.size {
		return nil, &contract.UploadError{Status: 400, Code: "invalid_request"}
	}
	buf := make([]byte, length)
	if _, err := io.ReadFull(body, buf); err != nil {
		// The chunk is written completely or not at all.
		if errors.Is(err, io.ErrUnexpectedEOF) || errors.Is(err, io.EOF) {
			return nil, &contract.UploadError{Status: 400, Code: "invalid_request", Err: err}
		}
		return nil, err
	}
	u.mu.Lock()
	it.data = append(it.data, buf...)
	n := len(it.data)
	u.mu.Unlock()
	return pyjson.Ordered{{Key: "offset", Value: n}, {Key: "size", Value: it.size}}, nil
}

func (u *memUploads) Load(ctx context.Context, id string) (pyjson.Ordered, error) {
	it, err := u.get(id)
	if err != nil {
		return nil, err
	}
	u.mu.Lock()
	defer u.mu.Unlock()
	if int64(len(it.data)) != it.size {
		return nil, &contract.UploadError{Status: 409, Code: "incomplete"}
	}
	delete(u.items, id)
	sum := sha256.Sum256(it.data)
	digest := hex.EncodeToString(sum[:])
	if it.sha != "" && it.sha != digest {
		return nil, &contract.UploadError{Status: 400, Code: "checksum_mismatch"}
	}
	u.loaded = append(u.loaded, it.data)
	return pyjson.Ordered{{Key: "sha256", Value: digest}, {Key: "images", Value: []any{pyjson.Ordered{
		{Key: "id", Value: "sha256:" + strings.Repeat("f", 64)}, {Key: "tags", Value: []any{"ccg/app:local"}}}}}}, nil
}

func uploadHarness(t *testing.T) (*harness, *memUploads) {
	u := newMemUploads()
	h := newHarness(t, func(o *Options) { o.Uploads = u })
	return h, u
}

// covers: U1, U2, U3, U4, R12-R16, H8 (test_uploads.test_resumable_upload_and_load)
func TestResumableUploadAndLoad(t *testing.T) {
	h, u := uploadHarness(t)
	data := bytes.Repeat([]byte("0123456789"), 30000)
	sum := sha256.Sum256(data)
	digest := hex.EncodeToString(sum[:])
	res := h.do("POST", "/images/uploads", fmt.Sprintf(`{"size": %d, "sha256": "%s"}`, len(data), digest))
	id := fmt.Sprintf("%022d", 1)
	want(t, res.Status, string(res.Body), 200, fmt.Sprintf(`{"upload_id": "%s", "offset": 0, "size": %d}`, id, len(data)))
	if !routeUpload.MatchString("/images/uploads/" + id) {
		t.Fatal("upload id shape")
	}
	s, b := h.call("POST", "/images/uploads/"+id+"/load", "")
	want(t, s, b, 409, errBody("incomplete"))
	// Several chunks on one keep-alive connection: each body is read exactly.
	conn := dialRaw(t, h.addr)
	put := func(offset int, chunk []byte) *response {
		conn.write(rawRequest("PUT", "/images/uploads/"+id, chunk, [][2]string{hdr("X-CCG-Offset", fmt.Sprint(offset))}, testKey, true))
		return conn.readAnswer()
	}
	r := put(0, data[:100000])
	want(t, r.Status, string(r.Body), 200, fmt.Sprintf(`{"offset": 100000, "size": %d}`, len(data)))
	if _, ok := r.get("Connection"); ok {
		t.Fatal("a successful chunk keeps the connection")
	}
	if r = put(100000, data[100000:200000]); r.Status != 200 {
		t.Fatal(r.Status)
	}
	// An error leaves the body unread: the controller says so and closes.
	r = put(0, data[:10])
	want(t, r.Status, string(r.Body), 409, `{"error": "offset_mismatch", "offset": 200000}`)
	if v, _ := r.get("Connection"); v != "close" {
		t.Fatal(v)
	}
	if rest := conn.readAll(); rest != "" {
		t.Fatal(rest)
	}
	s, b = h.call("GET", "/images/uploads/"+id, "")
	want(t, s, b, 200, fmt.Sprintf(`{"offset": 200000, "size": %d}`, len(data)))
	putOne := func(offset int, chunk []byte) (int, string) {
		res := h.do("PUT", "/images/uploads/"+id, string(chunk), hdr("X-CCG-Offset", fmt.Sprint(offset)))
		return res.Status, string(res.Body)
	}
	s, b = putOne(200000, append(append([]byte{}, data[200000:]...), 'x'))
	want(t, s, b, 400, errBody("invalid_request"))
	if s, _ = putOne(200000, data[200000:]); s != 200 {
		t.Fatal(s)
	}
	s, b = h.call("POST", "/images/uploads/"+id+"/load", "")
	want(t, s, b, 200, `{"sha256": "`+digest+`", "images": [{"id": "sha256:`+strings.Repeat("f", 64)+`", "tags": ["ccg/app:local"]}]}`)
	if len(u.loaded) != 1 || !bytes.Equal(u.loaded[0], data) {
		t.Fatal("loaded data differs")
	}
	s, b = h.call("GET", "/images/uploads/"+id, "")
	want(t, s, b, 404, errBody("not_found"))
	if strings.Contains(h.log.String(), "offset_mismatch") {
		t.Fatal("UploadError is not logged")
	}
}

// covers: U1, R12, V12 (test_uploads.test_create_validation)
func TestCreateValidation(t *testing.T) {
	h, u := uploadHarness(t)
	for _, body := range []string{`{"size": 0}`, `{"size": 4294967297}`, `{"size": true}`, `{"size": "5"}`, `{}`,
		`{"size": 5, "sha256": "` + strings.Repeat("A", 64) + `"}`, `{"size": 5, "sha256": "` + strings.Repeat("a", 63) + `"}`,
		`{"size": 5, "other": 1}`, `[5]`, `not json`, `{"size": 5.0}`} {
		s, b := h.call("POST", "/images/uploads", body)
		want(t, s, b, 400, errBody("invalid_request"))
	}
	if len(u.items) != 0 {
		t.Fatal(u.items)
	}
	if s, _ := h.call("POST", "/images/uploads", `{"size": 4294967296}`); s != 200 {
		t.Fatal(s)
	}
	res := h.do("GET", "/images/uploads", "")
	if res.Status != 405 || string(res.Body) != errBody("method_not_allowed") || !res.Closed {
		t.Fatal(res.Status, res.Closed)
	}
	res = h.doKey(strings.Repeat("x", 32), "POST", "/images/uploads", `{"size": 1}`)
	want(t, res.Status, string(res.Body), 401, errBody("unauthorized"))
}

// covers: R13, V13 (test_uploads.test_chunk_header_validation)
func TestChunkHeaderValidation(t *testing.T) {
	h, u := uploadHarness(t)
	u.Create(context.Background(), 10, nil)
	id := fmt.Sprintf("%022d", 1)
	path := "/images/uploads/" + id
	raw := func(head string) int {
		res := doRaw(t, h.addr, []byte("PUT "+path+" HTTP/1.1\r\nAuthorization: Bearer "+testKey+"\r\nHost: x\r\n"+head+"\r\n"), 300*time.Millisecond)
		return res.Status
	}
	if s := raw(fmt.Sprintf("X-CCG-Offset: 0\r\nContent-Length: %d\r\n", 64<<20+1)); s != 400 {
		t.Fatal(s)
	}
	if s := raw("X-CCG-Offset: 0\r\nTransfer-Encoding: chunked\r\n"); s != 400 {
		t.Fatal(s)
	}
	if s := raw("X-CCG-Offset: 0\r\nContent-Length: 0\r\n"); s != 400 {
		t.Fatal(s)
	}
	if s := raw("X-CCG-Offset: 0\r\n"); s != 400 {
		t.Fatal("missing Content-Length", s)
	}
	for _, offset := range []string{"", "-1", "+0", "1_0", "0x0", "0000000000000"} {
		s, b := h.call("PUT", path, "ab", hdr("X-CCG-Offset", offset))
		want(t, s, b, 400, errBody("invalid_request"))
	}
	s, b := h.call("PUT", "/images/uploads/"+strings.Repeat("A", 22), "ab", hdr("X-CCG-Offset", "0"))
	want(t, s, b, 404, errBody("not_found"))
	s, b = h.call("GET", path, "")
	want(t, s, b, 200, `{"offset": 0, "size": 10}`)
	// A leading zero is still decimal.
	s, _ = h.call("PUT", path, "ab", hdr("X-CCG-Offset", "00"))
	if s != 200 {
		t.Fatal(s)
	}
}

// covers: U2, H11 (test_uploads.test_interrupted_chunk_is_discarded)
func TestInterruptedChunkIsDiscarded(t *testing.T) {
	h, u := uploadHarness(t)
	u.Create(context.Background(), 10, nil)
	id := fmt.Sprintf("%022d", 1)
	done := make(chan struct{})
	u.mu.Lock()
	u.writing = done
	u.mu.Unlock()
	c, err := net.Dial("tcp", h.addr)
	if err != nil {
		t.Fatal(err)
	}
	c.Write([]byte("PUT /images/uploads/" + id + " HTTP/1.1\r\nHost: x\r\nAuthorization: Bearer " + testKey +
		"\r\nX-CCG-Offset: 0\r\nContent-Length: 8\r\n\r\nabc"))
	time.Sleep(50 * time.Millisecond)
	c.Close()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("the interrupted PUT did not finish")
	}
	s, b := h.call("GET", "/images/uploads/"+id, "")
	want(t, s, b, 200, `{"offset": 0, "size": 10}`)
	s, b = h.call("PUT", "/images/uploads/"+id, "0123456789", hdr("X-CCG-Offset", "0"))
	want(t, s, b, 200, `{"offset": 10, "size": 10}`)
}

// covers: U6, U3 (test_uploads.test_pending_limit_stale_cleanup_and_delete, HTTP part)
func TestPendingLimitAndDelete(t *testing.T) {
	h, _ := uploadHarness(t)
	for i := 0; i < 4; i++ {
		if s, _ := h.call("POST", "/images/uploads", `{"size": 5}`); s != 200 {
			t.Fatal(s)
		}
	}
	res := h.do("POST", "/images/uploads", `{"size": 5}`)
	if res.Status != 409 || string(res.Body) != errBody("too_many_uploads") || !res.Closed {
		t.Fatal(res.Status, string(res.Body), res.Closed)
	}
	first := "/images/uploads/" + fmt.Sprintf("%022d", 1)
	res = h.do("DELETE", first, "")
	if res.Status != 200 || string(res.Body) != `{"deleted": true}` || res.Closed {
		t.Fatal(res.Status, string(res.Body), res.Closed)
	}
	s, b := h.call("DELETE", first, "")
	want(t, s, b, 404, errBody("not_found"))
	s, b = h.call("PATCH", first, "")
	want(t, s, b, 405, errBody("method_not_allowed"))
	s, b = h.call("POST", first, "{}")
	want(t, s, b, 405, errBody("method_not_allowed"))
	s, b = h.call("GET", first+"/load", "")
	want(t, s, b, 405, errBody("method_not_allowed"))
}

// covers: R16, H12 (new: an UploadError is answered with its own status
// and {"error": code, **extra}, closes, and is not logged; load_forbidden
// from the guard's 403 comes back as 400 load_forbidden)
func TestUploadErrorAnsweredAsIs(t *testing.T) {
	h := newHarness(t, nil)
	id := strings.Repeat("a", 22)
	for _, c := range []struct {
		err  *contract.UploadError
		body string
	}{
		{&contract.UploadError{Status: 400, Code: "load_forbidden", Err: errors.New("guard 403")}, `{"error": "load_forbidden"}`},
		{&contract.UploadError{Status: 400, Code: "load_failed"}, `{"error": "load_failed"}`},
		{&contract.UploadError{Status: 400, Code: "checksum_mismatch"}, `{"error": "checksum_mismatch"}`},
		{&contract.UploadError{Status: 409, Code: "offset_mismatch", Extra: pyjson.Ordered{{Key: "offset", Value: 7}}},
			`{"error": "offset_mismatch", "offset": 7}`},
	} {
		h.core.failWith("uploads.load", fmt.Errorf("load: %w", c.err))
		res := h.do("POST", "/images/uploads/"+id+"/load", "")
		if res.Status != c.err.Status || string(res.Body) != c.body || !res.Closed {
			t.Fatalf("%s: %d %s closed=%v", c.err.Code, res.Status, res.Body, res.Closed)
		}
	}
	if h.log.String() != "" {
		t.Fatalf("UploadError is not logged: %q", h.log.String())
	}
}

// covers: R23 (test_uploads.test_old_endpoints_are_gone)
func TestOldEndpointsAreGone(t *testing.T) {
	h, _ := uploadHarness(t)
	for _, path := range []string{"/images/upload", "/images/load/" + strings.Repeat("a", 22), "/images"} {
		s, b := h.call("POST", path, "")
		want(t, s, b, 404, errBody("not_found"))
	}
}
