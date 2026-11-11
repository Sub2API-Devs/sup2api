package pluginsdktest

import (
	"bytes"
	"context"
	"fmt"
	"maps"
	"strings"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
)

func fakeItem(key, value string, ttl int64) *pluginv1.KVSetManyItem {
	return &pluginv1.KVSetManyItem{Key: key, Value: []byte(value), TtlSeconds: ttl}
}

func fakeGetMany(t *testing.T, f *FakeHost, ns string, keys ...string) string {
	t.Helper()
	r, err := f.KVGetMany(context.Background(), &pluginv1.KVGetManyRequest{Namespace: ns, Keys: keys})
	if err != nil {
		t.Fatalf("KVGetMany: %v", err)
	}
	parts := make([]string, len(r.GetItems()))
	for i, it := range r.GetItems() {
		parts[i] = "-"
		if it.GetFound() {
			parts[i] = "(" + string(it.GetValue()) + ")"
		}
	}
	return strings.Join(parts, " ")
}

func fakeKeys(n int) []string {
	keys := make([]string, n)
	for i := range keys {
		keys[i] = fmt.Sprintf("k%04d", i)
	}
	return keys
}

func TestFakeHostKVBatch(t *testing.T) {
	f := NewFakeHost()
	ctx := context.Background()
	if _, err := f.KVSet(ctx, &pluginv1.KVSetRequest{Namespace: "ns", Key: "single", Value: []byte("s")}); err != nil {
		t.Fatal(err)
	}
	if _, err := f.KVSetMany(ctx, &pluginv1.KVSetManyRequest{Namespace: "ns", Items: []*pluginv1.KVSetManyItem{
		fakeItem("a", "1", 0), fakeItem("b", "2", 60), fakeItem("empty", "", 0), fakeItem("a", "last", 0),
	}}); err != nil {
		t.Fatal(err)
	}
	// One answer per key, in request order; the single calls see the same store.
	if got, want := fakeGetMany(t, f, "ns", "b", "missing", "a", "a", "empty", "single"), "(2) - (last) (last) () (s)"; got != want {
		t.Fatalf("items = %s, want %s", got, want)
	}
	if got := fakeGetMany(t, f, "other", "a"); got != "-" {
		t.Fatalf("another namespace reads %s", got)
	}
	if r, err := f.KVGet(ctx, &pluginv1.KVGetRequest{Namespace: "ns", Key: "b"}); err != nil || string(r.GetValue()) != "2" {
		t.Fatalf("KVGet of a batch write: %q %v", r.GetValue(), err)
	}
	// Every item has its own ttl: "b" expires, "a" does not.
	f.mu.Lock()
	if it := f.kv[kvKey("ns", "b")]; time.Until(it.expires) < 59*time.Second || time.Until(it.expires) > 60*time.Second {
		t.Errorf("ttl of b = %v", time.Until(it.expires))
	} else {
		it.expires = time.Now().Add(-time.Second)
		f.kv[kvKey("ns", "b")] = it
	}
	if !f.kv[kvKey("ns", "a")].expires.IsZero() {
		t.Error("a has an expiry")
	}
	f.mu.Unlock()
	if got, want := fakeGetMany(t, f, "ns", "a", "b"), "(last) -"; got != want {
		t.Fatalf("after b expired = %s, want %s", got, want)
	}
	if _, err := f.KVDeleteMany(ctx, &pluginv1.KVDeleteManyRequest{Namespace: "ns", Keys: []string{"a", "missing", "single"}}); err != nil {
		t.Fatal(err)
	}
	if got, want := fakeGetMany(t, f, "ns", "a", "single", "empty"), "- - ()"; got != want {
		t.Fatalf("after delete = %s, want %s", got, want)
	}
	// No keys is valid.
	if got := fakeGetMany(t, f, "ns"); got != "" {
		t.Fatalf("no keys: %q", got)
	}
	want := map[string]int{"KVSet": 1, "KVGet": 1, "KVSetMany": 1, "KVGetMany": 5, "KVDeleteMany": 1}
	if got := f.KVCalls(); !maps.Equal(got, want) {
		t.Fatalf("KVCalls = %v, want %v", got, want)
	}
}

func TestFakeHostKVBatchRulesAndAtomicWrite(t *testing.T) {
	f := NewFakeHost()
	ctx := context.Background()
	big := strings.Repeat("v", protocol.KVMaxValueBytes)
	if _, err := f.KVSetMany(ctx, &pluginv1.KVSetManyRequest{Namespace: "ns", Items: []*pluginv1.KVSetManyItem{fakeItem("old", "before", 0)}}); err != nil {
		t.Fatal(err)
	}
	for name, bad := range map[string]*pluginv1.KVSetManyItem{
		"empty key":     fakeItem("", "v", 0),
		"long key":      fakeItem(strings.Repeat("k", protocol.KVMaxKeyBytes+1), "v", 0),
		"value too big": fakeItem("big", big+"x", 0),
		"negative ttl":  fakeItem("neg", "v", -1),
		"ttl too large": fakeItem("huge", "v", protocol.KVMaxTTLSeconds+1),
		"missing (nil)": nil,
	} {
		_, err := f.KVSetMany(ctx, &pluginv1.KVSetManyRequest{Namespace: "ns", Items: []*pluginv1.KVSetManyItem{
			fakeItem("first", "1", 0), fakeItem("old", "after", 0), bad, fakeItem("last", "2", 0)}})
		if status.Code(err) != codes.InvalidArgument {
			t.Fatalf("%s: %v", name, err)
		}
		if got, want := fakeGetMany(t, f, "ns", "first", "old", "last"), "- (before) -"; got != want {
			t.Fatalf("%s: the rejected write left %s, want %s", name, got, want)
		}
	}
	codesOf := func(ns string, keys []string) [3]codes.Code {
		items := make([]*pluginv1.KVSetManyItem, len(keys))
		for i, k := range keys {
			items[i] = fakeItem(k, "v", 0)
		}
		_, e1 := f.KVGetMany(ctx, &pluginv1.KVGetManyRequest{Namespace: ns, Keys: keys})
		_, e2 := f.KVSetMany(ctx, &pluginv1.KVSetManyRequest{Namespace: ns, Items: items})
		_, e3 := f.KVDeleteMany(ctx, &pluginv1.KVDeleteManyRequest{Namespace: ns, Keys: keys})
		return [3]codes.Code{status.Code(e1), status.Code(e2), status.Code(e3)}
	}
	invalid := [3]codes.Code{codes.InvalidArgument, codes.InvalidArgument, codes.InvalidArgument}
	for _, ns := range []string{"", "a:b", "*", strings.Repeat("n", protocol.KVMaxNamespaceBytes+1)} {
		if got := codesOf(ns, []string{"k"}); got != invalid {
			t.Errorf("namespace %q: %v", ns, got)
		}
	}
	if got := codesOf("ns", []string{"ok", ""}); got != invalid {
		t.Errorf("empty key: %v", got)
	}
	if got := codesOf("lim", fakeKeys(protocol.KVBatchMaxKeys+1)); got != invalid {
		t.Errorf("%d keys: %v", protocol.KVBatchMaxKeys+1, got)
	}
	if got := codesOf("lim", fakeKeys(protocol.KVBatchMaxKeys)); got != [3]codes.Code{} {
		t.Errorf("%d keys: %v", protocol.KVBatchMaxKeys, got)
	}

	// Payload: 48 values of 64 KiB are the limit of an answer; with their
	// keys they are above the limit of a write.
	fits := protocol.KVBatchMaxBytes / protocol.KVMaxValueBytes
	fill := func(keys []string) []*pluginv1.KVSetManyItem {
		items := make([]*pluginv1.KVSetManyItem, len(keys))
		for i, k := range keys {
			items[i] = &pluginv1.KVSetManyItem{Key: k, Value: bytes.Repeat([]byte("v"), protocol.KVMaxValueBytes)}
		}
		return items
	}
	keys := fakeKeys(fits + 1)
	if _, err := f.KVSetMany(ctx, &pluginv1.KVSetManyRequest{Namespace: "pay", Items: fill(keys[:fits])}); status.Code(err) != codes.InvalidArgument {
		t.Fatalf("write above the payload limit: %v", err)
	}
	if got := fakeGetMany(t, f, "pay", keys[0]); got != "-" {
		t.Fatal("the write above the payload limit stored an item")
	}
	for _, part := range [][]string{keys[:fits-1], keys[fits-1:]} {
		if _, err := f.KVSetMany(ctx, &pluginv1.KVSetManyRequest{Namespace: "pay", Items: fill(part)}); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := f.KVGetMany(ctx, &pluginv1.KVGetManyRequest{Namespace: "pay", Keys: keys[:fits]}); err != nil {
		t.Fatalf("answer at the payload limit: %v", err)
	}
	if _, err := f.KVGetMany(ctx, &pluginv1.KVGetManyRequest{Namespace: "pay", Keys: keys}); status.Code(err) != codes.ResourceExhausted {
		t.Fatalf("answer above the payload limit: %v", err)
	}
}

type kvPlugin struct{ host pluginsdk.Host }

func (p *kvPlugin) Init(_ context.Context, h pluginsdk.Host) error { p.host = h; return nil }

const kvManifest = `{
  "apiVersion": 1, "key": "kvb", "version": "0.1.0", "publisher": "test", "runtime": "grpc",
  "hostPermissions": [{"id": "kv", "reason": {"en": "x", "zh": "x"}}]
}`

// A plugin's batch calls through the SDK, on a current core and on one that
// answers UNIMPLEMENTED: the same results, one host call per batch on the
// first, the single calls and one refused batch call on the second.
func TestFakeHostKVBatchThroughTheSDK(t *testing.T) {
	for _, old := range []bool{false, true} {
		fh := NewFakeHost()
		fh.KVBatchUnimplemented = old
		p := &kvPlugin{}
		Start(t, p, Options{Host: fh, SDK: []pluginsdk.Option{pluginsdk.WithManifest([]byte(kvManifest))}})
		ctx, kv := context.Background(), p.host.KV()

		keys := fakeKeys(64)
		items := make([]pluginsdk.KVItem, len(keys))
		for i, k := range keys {
			items[i] = pluginsdk.KVItem{Key: k, Value: []byte("v" + k), TTL: time.Hour}
		}
		if err := pluginsdk.KVSetMany(ctx, kv, "cache", items); err != nil {
			t.Fatalf("old core %v: KVSetMany: %v", old, err)
		}
		values, err := pluginsdk.KVGetMany(ctx, kv, "cache", append([]string{"missing"}, keys...))
		if err != nil || len(values) != 65 || values[0].Found {
			t.Fatalf("old core %v: KVGetMany: %d values, %v", old, len(values), err)
		}
		for i, v := range values[1:] {
			if !v.Found || string(v.Value) != "v"+keys[i] {
				t.Fatalf("old core %v: value %d = %v %q", old, i, v.Found, v.Value)
			}
		}
		if err := pluginsdk.KVDeleteMany(ctx, kv, "cache", keys[:32]); err != nil {
			t.Fatalf("old core %v: KVDeleteMany: %v", old, err)
		}
		values, err = pluginsdk.KVGetMany(ctx, kv, "cache", []string{keys[0], keys[31], keys[32], keys[63]})
		if err != nil || values[0].Found || values[1].Found || !values[2].Found || !values[3].Found {
			t.Fatalf("old core %v: after delete: %v %v", old, values, err)
		}
		// A write the rules reject stores nothing, on either core.
		bad := []pluginsdk.KVItem{{Key: "x", Value: []byte("1")}, {Key: "", Value: []byte("2")}}
		if err := pluginsdk.KVSetMany(ctx, kv, "cache", bad); status.Code(err) != codes.InvalidArgument {
			t.Fatalf("old core %v: invalid write: %v", old, err)
		}
		if _, found, _ := kv.Get(ctx, "cache", "x"); found {
			t.Fatalf("old core %v: an invalid write stored an item", old)
		}

		want := map[string]int{"KVSetMany": 1, "KVGetMany": 2, "KVDeleteMany": 1, "KVGet": 1}
		if old {
			want = map[string]int{"KVSetMany": 1, "KVSet": 64, "KVGet": 65 + 4 + 1, "KVDelete": 32}
		}
		if got := fh.KVCalls(); !maps.Equal(got, want) {
			t.Fatalf("old core %v: host calls = %v, want %v", old, got, want)
		}
	}
}

// SetKVBatchUnimplemented switches a running fake; the SDK keeps what the
// host answered first, as it would on a real core.
func TestFakeHostSetKVBatchUnimplemented(t *testing.T) {
	fh := NewFakeHost()
	p := &kvPlugin{}
	Start(t, p, Options{Host: fh, SDK: []pluginsdk.Option{pluginsdk.WithManifest([]byte(kvManifest))}})
	ctx, kv := context.Background(), p.host.KV()
	if err := pluginsdk.KVSetMany(ctx, kv, "ns", []pluginsdk.KVItem{{Key: "a", Value: []byte("1")}}); err != nil {
		t.Fatal(err)
	}
	fh.SetKVBatchUnimplemented(true)
	if _, err := fh.KVGetMany(ctx, &pluginv1.KVGetManyRequest{Namespace: "ns", Keys: []string{"a"}}); status.Code(err) != codes.Unimplemented {
		t.Fatalf("switched to an old core: %v", err)
	}
	for range 3 {
		if vs, err := pluginsdk.KVGetMany(ctx, kv, "ns", []string{"a"}); err != nil || string(vs[0].Value) != "1" {
			t.Fatalf("read on the old core: %v %v", vs, err)
		}
	}
	// One direct call above, one refused call of the SDK, then single calls.
	if got := fh.KVCalls(); got["KVGetMany"] != 2 || got["KVGet"] != 3 {
		t.Fatalf("host calls = %v", got)
	}
}
