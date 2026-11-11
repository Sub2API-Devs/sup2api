package pluginsdk

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
)

// kvStub is a HostService client with an in-memory kv store that counts
// every call. old makes it refuse the batch calls like a core before
// 0.1.273; fail, when set, decides the error of a call by RPC name and key
// ("" for a batch call).
type kvStub struct {
	pluginv1.HostServiceClient
	old   bool
	fail  func(rpc, key string) error
	delay time.Duration

	mu       sync.Mutex
	data     map[string][]byte
	ttl      map[string]int64
	calls    map[string]int
	sets     []string
	inFlight int
	peak     int
}

func newKVStub(old bool) *kvStub {
	return &kvStub{old: old, data: map[string][]byte{}, ttl: map[string]int64{}, calls: map[string]int{}}
}

// kv is the KV a plugin gets from a host connected to s.
func (s *kvStub) kv() KV { return newHost(HostInfo{}, s, nil, false, 0).KV() }

// begin counts one call and returns its injected error; done ends it.
func (s *kvStub) begin(rpc, key string) error {
	s.mu.Lock()
	s.calls[rpc]++
	s.inFlight++
	s.peak = max(s.peak, s.inFlight)
	fail, delay := s.fail, s.delay
	s.mu.Unlock()
	if delay > 0 {
		time.Sleep(delay)
	}
	if fail != nil {
		return fail(rpc, key)
	}
	return nil
}

func (s *kvStub) done() {
	s.mu.Lock()
	s.inFlight--
	s.mu.Unlock()
}

func (s *kvStub) batch(rpc string) error {
	if err := s.begin(rpc, ""); err != nil {
		return err
	}
	if s.old {
		return status.Errorf(codes.Unimplemented, "method %s not implemented", rpc)
	}
	return nil
}

func (s *kvStub) count(rpc string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.calls[rpc]
}

// batchCalls and singleCalls are the calls received so far.
func (s *kvStub) batchCalls() int {
	return s.count("KVGetMany") + s.count("KVSetMany") + s.count("KVDeleteMany")
}

func (s *kvStub) singleCalls() int { return s.count("KVGet") + s.count("KVSet") + s.count("KVDelete") }

func (s *kvStub) KVGet(_ context.Context, in *pluginv1.KVGetRequest, _ ...grpc.CallOption) (*pluginv1.KVGetResponse, error) {
	defer s.done()
	if err := s.begin("KVGet", in.GetKey()); err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	v, ok := s.data[in.GetNamespace()+"/"+in.GetKey()]
	return &pluginv1.KVGetResponse{Found: ok, Value: v}, nil
}

func (s *kvStub) KVSet(_ context.Context, in *pluginv1.KVSetRequest, _ ...grpc.CallOption) (*pluginv1.KVSetResponse, error) {
	defer s.done()
	if err := s.begin("KVSet", in.GetKey()); err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data[in.GetNamespace()+"/"+in.GetKey()] = in.GetValue()
	s.ttl[in.GetNamespace()+"/"+in.GetKey()] = in.GetTtlSeconds()
	s.sets = append(s.sets, in.GetKey()+"="+string(in.GetValue()))
	return &pluginv1.KVSetResponse{}, nil
}

func (s *kvStub) KVDelete(_ context.Context, in *pluginv1.KVDeleteRequest, _ ...grpc.CallOption) (*pluginv1.KVDeleteResponse, error) {
	defer s.done()
	if err := s.begin("KVDelete", in.GetKey()); err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data, in.GetNamespace()+"/"+in.GetKey())
	return &pluginv1.KVDeleteResponse{}, nil
}

func (s *kvStub) KVGetMany(_ context.Context, in *pluginv1.KVGetManyRequest, _ ...grpc.CallOption) (*pluginv1.KVGetManyResponse, error) {
	defer s.done()
	if err := s.batch("KVGetMany"); err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	out := &pluginv1.KVGetManyResponse{}
	for _, key := range in.GetKeys() {
		v, ok := s.data[in.GetNamespace()+"/"+key]
		out.Items = append(out.Items, &pluginv1.KVGetManyItem{Found: ok, Value: v})
	}
	return out, nil
}

func (s *kvStub) KVSetMany(_ context.Context, in *pluginv1.KVSetManyRequest, _ ...grpc.CallOption) (*pluginv1.KVSetManyResponse, error) {
	defer s.done()
	if err := s.batch("KVSetMany"); err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, it := range in.GetItems() {
		s.data[in.GetNamespace()+"/"+it.GetKey()] = it.GetValue()
		s.ttl[in.GetNamespace()+"/"+it.GetKey()] = it.GetTtlSeconds()
	}
	return &pluginv1.KVSetManyResponse{}, nil
}

func (s *kvStub) KVDeleteMany(_ context.Context, in *pluginv1.KVDeleteManyRequest, _ ...grpc.CallOption) (*pluginv1.KVDeleteManyResponse, error) {
	defer s.done()
	if err := s.batch("KVDeleteMany"); err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, key := range in.GetKeys() {
		delete(s.data, in.GetNamespace()+"/"+key)
	}
	return &pluginv1.KVDeleteManyResponse{}, nil
}

func showValues(vs []KVValue) string {
	parts := make([]string, len(vs))
	for i, v := range vs {
		parts[i] = "-"
		if v.Found {
			parts[i] = "(" + string(v.Value) + ")"
		}
	}
	return strings.Join(parts, " ")
}

func manyKeys(n int) []string {
	keys := make([]string, n)
	for i := range keys {
		keys[i] = fmt.Sprintf("k%04d", i)
	}
	return keys
}

// kvScenario is the same sequence of batch calls a plugin makes, whatever
// the host: the results must not depend on it.
func kvScenario(t *testing.T, kv KV) string {
	t.Helper()
	ctx := context.Background()
	var log []string
	step := func(what string, err error) {
		t.Helper()
		if err != nil {
			t.Fatalf("%s: %v", what, err)
		}
	}
	read := func(keys ...string) {
		t.Helper()
		vs, err := KVGetMany(ctx, kv, "ns", keys)
		step("KVGetMany", err)
		log = append(log, showValues(vs))
	}
	read("a", "b")
	step("KVSetMany", KVSetMany(ctx, kv, "ns", []KVItem{
		{Key: "a", Value: []byte("1"), TTL: time.Minute}, {Key: "b", Value: []byte("2")}, {Key: "c", Value: []byte{}, TTL: 90 * time.Second},
		{Key: "a", Value: []byte("last"), TTL: time.Hour},
	}))
	read("c", "missing", "a", "a", "b")
	step("KVDeleteMany", KVDeleteMany(ctx, kv, "ns", []string{"b", "missing", "b"}))
	read("a", "b", "c")
	read()
	step("KVSetMany without items", KVSetMany(ctx, kv, "ns", nil))
	step("KVDeleteMany without keys", KVDeleteMany(ctx, kv, "ns", nil))
	return strings.Join(log, " | ")
}

const kvScenarioWant = "- - | () - (last) (last) (2) | (last) - () | "

func TestKVBatchIsOneHostCallPerBatch(t *testing.T) {
	s := newKVStub(false)
	if got := kvScenario(t, s.kv()); got != kvScenarioWant {
		t.Fatalf("results = %q, want %q", got, kvScenarioWant)
	}
	// 4 reads, 2 writes, 2 deletes: eight batch calls and no single call.
	if s.batchCalls() != 8 || s.singleCalls() != 0 {
		t.Fatalf("host calls = %v, want 8 batch calls and no single call", s.calls)
	}
	if s.ttl["ns/a"] != 3600 || s.ttl["ns/c"] != 90 {
		t.Fatalf("ttl sent = %v", s.ttl)
	}
}

func TestKVBatchFallsBackToSingleCallsOnAnOlderHostAndRemembersIt(t *testing.T) {
	s := newKVStub(true)
	kv := s.kv()
	if got := kvScenario(t, kv); got != kvScenarioWant {
		t.Fatalf("results on an older host = %q, want %q", got, kvScenarioWant)
	}
	// The older host refuses one batch call; every later batch goes straight
	// to the single calls.
	if s.batchCalls() != 1 || s.count("KVGetMany") != 1 {
		t.Fatalf("batch calls sent to an older host = %v, want one KVGetMany", s.calls)
	}
	// Reads 2+5+3 keys, writes 3 of the 4 items (the repeated key once),
	// deletes 3 keys.
	if s.count("KVGet") != 10 || s.count("KVSet") != 3 || s.count("KVDelete") != 3 {
		t.Fatalf("single calls = %v", s.calls)
	}
	if s.ttl["ns/a"] != 3600 || s.ttl["ns/c"] != 90 || s.ttl["ns/b"] != 0 {
		t.Fatalf("ttl sent = %v", s.ttl)
	}
	// The answer belongs to the host connection: another KV of the same host
	// knows it, a new connection asks again.
	h := newHost(HostInfo{}, s, nil, false, 0)
	before := s.batchCalls()
	for range 3 {
		if _, err := KVGetMany(context.Background(), h.KV(), "ns", []string{"a"}); err != nil {
			t.Fatal(err)
		}
	}
	if got := s.batchCalls() - before; got != 1 {
		t.Fatalf("a new host connection sent %d batch calls for three reads, want 1", got)
	}
}

func TestKVSetManyOnAnOlderHostWritesARepeatedKeyOnce(t *testing.T) {
	s := newKVStub(true)
	items := []KVItem{{Key: "a", Value: []byte("1")}, {Key: "b", Value: []byte("2")}, {Key: "a", Value: []byte("3")}, {Key: "a", Value: []byte("4")}}
	if err := KVSetMany(context.Background(), s.kv(), "ns", items); err != nil {
		t.Fatal(err)
	}
	if len(s.sets) != 2 || string(s.data["ns/a"]) != "4" || string(s.data["ns/b"]) != "2" {
		t.Fatalf("single writes = %v", s.sets)
	}
}

func TestKVBatchDoesNotHideTheErrorsOfTheBatchCall(t *testing.T) {
	for _, code := range []codes.Code{codes.Unavailable, codes.PermissionDenied, codes.InvalidArgument, codes.ResourceExhausted, codes.DeadlineExceeded} {
		s := newKVStub(false)
		s.fail = func(rpc, _ string) error { return status.Error(code, "from the host: "+rpc) }
		kv, ctx := s.kv(), context.Background()
		_, e1 := KVGetMany(ctx, kv, "ns", []string{"a"})
		e2 := KVSetMany(ctx, kv, "ns", []KVItem{{Key: "a"}})
		e3 := KVDeleteMany(ctx, kv, "ns", []string{"a"})
		for i, err := range []error{e1, e2, e3} {
			if status.Code(err) != code || !strings.Contains(err.Error(), "from the host") {
				t.Errorf("%v, call %d: got %v", code, i, err)
			}
		}
		if s.singleCalls() != 0 {
			t.Errorf("%v: fell back to single calls: %v", code, s.calls)
		}
		// Nothing was remembered: the next batch is one batch call again.
		s.fail = nil
		if _, err := KVGetMany(ctx, kv, "ns", []string{"a"}); err != nil || s.count("KVGetMany") != 2 || s.singleCalls() != 0 {
			t.Errorf("%v: after the error: %v %v", code, err, s.calls)
		}
	}
}

func TestKVBatchOnAnOlderHostReturnsTheErrorOfASingleCall(t *testing.T) {
	boom := status.Error(codes.Unavailable, "kv unavailable")
	keys := manyKeys(40)
	for _, rpc := range []string{"KVGet", "KVSet", "KVDelete"} {
		s := newKVStub(true)
		s.fail = func(got, key string) error {
			if got == rpc && key == keys[20] {
				return boom
			}
			return nil
		}
		kv, ctx := s.kv(), context.Background()
		var err error
		switch rpc {
		case "KVGet":
			var vs []KVValue
			vs, err = KVGetMany(ctx, kv, "ns", keys)
			if vs != nil {
				t.Errorf("%s: values returned with an error", rpc)
			}
		case "KVSet":
			items := make([]KVItem, len(keys))
			for i, k := range keys {
				items[i] = KVItem{Key: k, Value: []byte("v")}
			}
			err = KVSetMany(ctx, kv, "ns", items)
		case "KVDelete":
			err = KVDeleteMany(ctx, kv, "ns", keys)
		}
		if !errors.Is(err, boom) && status.Code(err) != codes.Unavailable {
			t.Errorf("%s: got %v, want the error of the failed call", rpc, err)
		}
	}
}

// After a failed single call no further one starts: the calls in flight
// finish (at most eight), the rest of the batch is not sent.
func TestKVBatchOnAnOlderHostStopsAfterAFailedSingleCall(t *testing.T) {
	s := newKVStub(true)
	s.delay = 5 * time.Millisecond
	keys := manyKeys(400)
	s.fail = func(rpc, key string) error {
		if rpc == "KVDelete" && key == keys[0] {
			return status.Error(codes.Unavailable, "kv unavailable")
		}
		return nil
	}
	if err := KVDeleteMany(context.Background(), s.kv(), "ns", keys); status.Code(err) != codes.Unavailable {
		t.Fatalf("got %v, want Unavailable", err)
	}
	// Eight in flight when the first fails, and at most one more each for
	// the workers that had not seen the failure yet; far from all 400.
	if got := s.count("KVDelete"); got > 64 {
		t.Fatalf("%d single calls were sent after the first one failed", got)
	}
}

func TestKVBatchOnAnOlderHostRunsAFewSingleCallsAtATime(t *testing.T) {
	s := newKVStub(true)
	s.delay = 2 * time.Millisecond
	vs, err := KVGetMany(context.Background(), s.kv(), "ns", manyKeys(64))
	if err != nil || len(vs) != 64 {
		t.Fatalf("%d values, %v", len(vs), err)
	}
	if s.count("KVGet") != 64 {
		t.Fatalf("single reads = %d, want 64", s.count("KVGet"))
	}
	// Eight at a time, the bound the documentation of the batch calls gives.
	if s.peak < 2 || s.peak > 8 {
		t.Fatalf("at most %d single calls were in flight, want 2..8", s.peak)
	}
}

// The rules are checked by the SDK before anything is sent, so they are the
// same on a current and on an older host, and a rejected write writes
// nothing on either.
func TestKVBatchRulesAreTheSameOnEveryHost(t *testing.T) {
	big := bytes.Repeat([]byte("v"), protocol.KVMaxValueBytes)
	item := func(key string, value []byte, ttl time.Duration) []KVItem {
		return []KVItem{{Key: "first", Value: []byte("1")}, {Key: key, Value: value, TTL: ttl}, {Key: "last", Value: []byte("2")}}
	}
	fill := func(n int) []KVItem {
		items := make([]KVItem, n)
		for i, k := range manyKeys(n) {
			items[i] = KVItem{Key: k, Value: big}
		}
		return items
	}
	for _, old := range []bool{false, true} {
		s := newKVStub(old)
		kv, ctx := s.kv(), context.Background()
		check := func(what string, err error) {
			t.Helper()
			if status.Code(err) != codes.InvalidArgument {
				t.Errorf("older host %v, %s: got %v, want InvalidArgument", old, what, err)
			}
		}
		for _, ns := range []string{"", "a:b", "*", strings.Repeat("n", protocol.KVMaxNamespaceBytes+1)} {
			_, err := KVGetMany(ctx, kv, ns, []string{"k"})
			check("read, namespace "+ns, err)
			check("write, namespace "+ns, KVSetMany(ctx, kv, ns, item("k", nil, 0)))
			check("delete, namespace "+ns, KVDeleteMany(ctx, kv, ns, nil))
		}
		for _, key := range []string{"", strings.Repeat("k", protocol.KVMaxKeyBytes+1)} {
			_, err := KVGetMany(ctx, kv, "ns", []string{"ok", key})
			check("read, bad key", err)
			check("write, bad key", KVSetMany(ctx, kv, "ns", item(key, nil, 0)))
			check("delete, bad key", KVDeleteMany(ctx, kv, "ns", []string{"ok", key}))
		}
		_, err := KVGetMany(ctx, kv, "ns", manyKeys(protocol.KVBatchMaxKeys+1))
		check("read, too many keys", err)
		check("write, too many items", KVSetMany(ctx, kv, "ns", make([]KVItem, protocol.KVBatchMaxKeys+1)))
		check("delete, too many keys", KVDeleteMany(ctx, kv, "ns", manyKeys(protocol.KVBatchMaxKeys+1)))
		check("write, value too large", KVSetMany(ctx, kv, "ns", item("k", append(big, 'x'), 0)))
		check("write, negative ttl", KVSetMany(ctx, kv, "ns", item("k", nil, -time.Second)))
		check("write, payload too large", KVSetMany(ctx, kv, "ns", fill(protocol.KVBatchMaxBytes/protocol.KVMaxValueBytes)))
		if s.batchCalls()+s.singleCalls() != 0 || len(s.data) != 0 {
			t.Fatalf("older host %v: a rejected batch was sent: %v, %d entries written", old, s.calls, len(s.data))
		}

		// The limits themselves are accepted: 512 keys, a value of 64 KiB.
		if _, err := KVGetMany(ctx, kv, "ns", manyKeys(protocol.KVBatchMaxKeys)); err != nil {
			t.Errorf("older host %v: %d keys: %v", old, protocol.KVBatchMaxKeys, err)
		}
		// A read whose values exceed the payload limit: 49 values of 64 KiB.
		n := protocol.KVBatchMaxBytes/protocol.KVMaxValueBytes + 1
		for _, part := range [][]KVItem{fill(n)[:n/2], fill(n)[n/2:]} {
			if err := KVSetMany(ctx, kv, "ns", part); err != nil {
				t.Fatalf("older host %v: write: %v", old, err)
			}
		}
		if vs, err := KVGetMany(ctx, kv, "ns", manyKeys(n-1)); err != nil || len(vs) != n-1 {
			t.Errorf("older host %v: read at the payload limit: %v", old, err)
		}
		if !old {
			continue // a current host answers RESOURCE_EXHAUSTED itself (the stub does not)
		}
		if _, err := KVGetMany(ctx, kv, "ns", manyKeys(n)); status.Code(err) != codes.ResourceExhausted {
			t.Errorf("older host: read above the payload limit: %v, want ResourceExhausted", err)
		}
	}
}

// plainKV has the four single calls only, like a wrapper a plugin's tests
// put around Host.KV.
type plainKV struct {
	KV
	gets atomic.Int64
}

func (p *plainKV) Get(ctx context.Context, ns, key string) ([]byte, bool, error) {
	p.gets.Add(1)
	return p.KV.Get(ctx, ns, key)
}

func TestKVBatchHelpersServeAKVWithoutBatchCalls(t *testing.T) {
	s := newKVStub(false)
	plain := &plainKV{KV: s.kv()}
	if _, ok := KV(plain).(KVBatch); ok {
		t.Fatal("plainKV must not implement KVBatch for this test")
	}
	if got := kvScenario(t, plain); got != kvScenarioWant {
		t.Fatalf("results = %q, want %q", got, kvScenarioWant)
	}
	if plain.gets.Load() != 10 || s.batchCalls() != 0 {
		t.Fatalf("wrapper reads = %d, batch calls = %d; want every read through the wrapper", plain.gets.Load(), s.batchCalls())
	}
	if _, err := KVGetMany(context.Background(), plain, "bad:ns", []string{"k"}); status.Code(err) != codes.InvalidArgument {
		t.Fatalf("bad namespace: %v", err)
	}
	if _, err := KVGetMany(context.Background(), nil, "ns", nil); !errors.Is(err, ErrHostNotReady) {
		t.Fatalf("nil kv: %v", err)
	}
}

// wrongCount answers KVGetMany with one item too few.
type wrongCount struct{ *kvStub }

func (w wrongCount) KVGetMany(ctx context.Context, in *pluginv1.KVGetManyRequest, opts ...grpc.CallOption) (*pluginv1.KVGetManyResponse, error) {
	r, err := w.kvStub.KVGetMany(ctx, in, opts...)
	if err == nil {
		r.Items = r.Items[1:]
	}
	return r, err
}

func TestKVGetManyRejectsAnAnswerOfTheWrongLength(t *testing.T) {
	kv := newHost(HostInfo{}, wrongCount{newKVStub(false)}, nil, false, 0).KV()
	if vs, err := KVGetMany(context.Background(), kv, "ns", []string{"a", "b"}); status.Code(err) != codes.Internal || vs != nil {
		t.Fatalf("got %v %v, want an Internal error", vs, err)
	}
}
