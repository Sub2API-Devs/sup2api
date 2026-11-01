package api

import (
	"context"
	"errors"
	"fmt"
	"io"
	"sync"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/store"
)

// stubCore records the calls the HTTP layer makes into the business
// packages (under Python's Manager method names) and answers them through
// per-name handlers.
type stubCore struct {
	mu       sync.Mutex
	calls    []stubCall
	handlers map[string]func(args []any) (any, error)
	// fallback answers a call without a handler (golden replay); nil: error.
	fallback func(name string, args []any) (any, error)
}

type stubCall struct {
	Name string
	Args []any
}

func newStubCore() *stubCore { return &stubCore{handlers: map[string]func([]any) (any, error){}} }

// on sets the handler of name.
func (c *stubCore) on(name string, f func(args []any) (any, error)) {
	c.mu.Lock()
	c.handlers[name] = f
	c.mu.Unlock()
}

// answer makes name return v.
func (c *stubCore) answer(name string, v any) {
	c.on(name, func([]any) (any, error) { return v, nil })
}

// failWith makes name fail with err.
func (c *stubCore) failWith(name string, err error) {
	c.on(name, func([]any) (any, error) { return nil, err })
}

func (c *stubCore) invoke(name string, args ...any) (any, error) {
	c.mu.Lock()
	c.calls = append(c.calls, stubCall{Name: name, Args: args})
	f := c.handlers[name]
	fb := c.fallback
	c.mu.Unlock()
	if f != nil {
		return f(args)
	}
	if fb != nil {
		return fb(name, args)
	}
	return nil, fmt.Errorf("stub: unexpected call %s", name)
}

// count is how many times name was called.
func (c *stubCore) count(name string) int {
	c.mu.Lock()
	defer c.mu.Unlock()
	n := 0
	for _, k := range c.calls {
		if k.Name == name {
			n++
		}
	}
	return n
}

// last is the arguments of name's last call (nil when never called).
func (c *stubCore) last(name string) []any {
	c.mu.Lock()
	defer c.mu.Unlock()
	for i := len(c.calls) - 1; i >= 0; i-- {
		if c.calls[i].Name == name {
			return c.calls[i].Args
		}
	}
	return nil
}

func (c *stubCore) callList() []stubCall {
	c.mu.Lock()
	defer c.mu.Unlock()
	return append([]stubCall(nil), c.calls...)
}

type stubAccounts struct{ *stubCore }

func (s stubAccounts) Runtimes(ctx context.Context) (*contract.RuntimeList, error) {
	v, err := s.invoke("runtimes")
	r, _ := v.(*contract.RuntimeList)
	return r, err
}

func (s stubAccounts) Delete(ctx context.Context, aid string, account, purge bool) (*contract.DeleteResult, error) {
	v, err := s.invoke("delete", aid, account, purge)
	r, _ := v.(*contract.DeleteResult)
	return r, err
}

func (s stubAccounts) Apply(ctx context.Context, aid string, desired any) (pyjson.Valuer, error) {
	v, err := s.invoke("apply", aid, desired)
	r, _ := v.(pyjson.Valuer)
	return r, err
}

func (s stubAccounts) Public(ctx context.Context, aid string) (*contract.Public, error) {
	v, err := s.invoke("public", aid)
	r, _ := v.(*contract.Public)
	return r, err
}

func (s stubAccounts) Connection(ctx context.Context, aid, revision string) (*contract.Connection, error) {
	v, err := s.invoke("connection", aid, revision)
	r, _ := v.(*contract.Connection)
	return r, err
}

func (s stubAccounts) ReadyState(ctx context.Context, aid, revision string) (*store.AccountState, error) {
	v, err := s.invoke("ready_state", aid, revision)
	r, _ := v.(*store.AccountState)
	return r, err
}

func (s stubAccounts) EgressStatus(ctx context.Context, aid string) (*contract.EgressStatus, error) {
	v, err := s.invoke("shared.status", aid)
	r, _ := v.(*contract.EgressStatus)
	return r, err
}

func (s stubAccounts) RunBackground(ctx context.Context) { s.invoke("run_background") }

type stubUpdates struct{ *stubCore }

func (s stubUpdates) UpdateWorker(ctx context.Context, aid string, desired any) (pyjson.Ordered, error) {
	v, err := s.invoke("update_worker", aid, desired)
	r, _ := v.(pyjson.Ordered)
	return r, err
}

func (s stubUpdates) UpdatePair(ctx context.Context, aid string, desired any) (pyjson.Ordered, error) {
	v, err := s.invoke("update_runtime", aid, desired)
	r, _ := v.(pyjson.Ordered)
	return r, err
}

type stubUploads struct{ *stubCore }

func (s stubUploads) Create(ctx context.Context, size, sha256 any) (pyjson.Ordered, error) {
	v, err := s.invoke("uploads.create", size, sha256)
	r, _ := v.(pyjson.Ordered)
	return r, err
}

func (s stubUploads) Status(ctx context.Context, id string) (pyjson.Ordered, error) {
	v, err := s.invoke("uploads.status", id)
	r, _ := v.(pyjson.Ordered)
	return r, err
}

func (s stubUploads) Delete(ctx context.Context, id string) (pyjson.Ordered, error) {
	v, err := s.invoke("uploads.delete", id)
	r, _ := v.(pyjson.Ordered)
	return r, err
}

// Write reads exactly length bytes (as images.Uploads.write does) unless
// the handler fails first; an early end is UploadError 400.
func (s stubUploads) Write(ctx context.Context, id string, offset, length int64, body io.Reader) (pyjson.Ordered, error) {
	v, err := s.invoke("uploads.write", id, offset, length)
	if err != nil {
		return nil, err
	}
	if _, rerr := io.CopyN(io.Discard, body, length); rerr != nil {
		if errors.Is(rerr, io.EOF) || errors.Is(rerr, io.ErrUnexpectedEOF) {
			return nil, &contract.UploadError{Status: 400, Code: "invalid_request", Err: rerr}
		}
		return nil, rerr
	}
	r, _ := v.(pyjson.Ordered)
	return r, nil
}

func (s stubUploads) Load(ctx context.Context, id string) (pyjson.Ordered, error) {
	v, err := s.invoke("uploads.load", id)
	r, _ := v.(pyjson.Ordered)
	return r, err
}

type stubCleanup struct{ *stubCore }

func (s stubCleanup) Inventory(ctx context.Context) (pyjson.Ordered, error) {
	v, err := s.invoke("cleanup_inventory")
	r, _ := v.(pyjson.Ordered)
	return r, err
}

func (s stubCleanup) Cleanup(ctx context.Context, desired any) (pyjson.Ordered, error) {
	v, err := s.invoke("cleanup_runtimes", desired)
	r, _ := v.(pyjson.Ordered)
	return r, err
}

type stubAdmin struct{ *stubCore }

func (s stubAdmin) Health(ctx context.Context) pyjson.Ordered {
	v, _ := s.invoke("health")
	r, _ := v.(pyjson.Ordered)
	return r
}

func (s stubAdmin) RuntimeImages(ctx context.Context) pyjson.Ordered {
	v, _ := s.invoke("runtime_images")
	r, _ := v.(pyjson.Ordered)
	return r
}

func (s stubAdmin) SetRuntimeImages(ctx context.Context, desired any) (pyjson.Ordered, error) {
	v, err := s.invoke("set_runtime_images", desired)
	r, _ := v.(pyjson.Ordered)
	return r, err
}

func (s stubAdmin) UpgradeController(ctx context.Context, desired any) error {
	_, err := s.invoke("upgrade_controller", desired)
	return err
}

func (s stubAdmin) RecreateEgress(ctx context.Context, desired any) (pyjson.Ordered, error) {
	v, err := s.invoke("recreate_egress", desired)
	r, _ := v.(pyjson.Ordered)
	return r, err
}

// rawValue is a decoded JSON answer used as a pyjson.Valuer (PUT config).
type rawValue struct{ v any }

func (r rawValue) PyValue() any { return r.v }
