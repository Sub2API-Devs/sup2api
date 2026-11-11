package pluginsdk

import (
	"context"
	"sync"
	"sync/atomic"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
)

// Batch KV calls (grant "kv", CONTRACTS §93).
//
// One call reads, writes or deletes many keys of one namespace. The host
// checks the grant once and makes one Redis round trip, where N single
// calls cost N of each:
//
//	values, err := pluginsdk.KVGetMany(ctx, host.KV(), "cache", keys)
//	err = pluginsdk.KVSetMany(ctx, host.KV(), "cache", []pluginsdk.KVItem{{Key: "a", Value: v, TTL: time.Hour}})
//	err = pluginsdk.KVDeleteMany(ctx, host.KV(), "cache", keys)
//
// Rules, the same on every host:
//   - namespace, key, value and ttl follow the single calls (key 1..512
//     bytes, value at most 64 KiB, ttl in whole seconds, 0 = no expiry);
//   - at most protocol.KVBatchMaxKeys (512) keys or items per call;
//   - at most protocol.KVBatchMaxBytes (3 MiB) of keys plus values per
//     write, and of values per read (48 values always fit);
//   - a key may repeat: a read answers every occurrence, a write keeps the
//     last one.
//
// A call that breaks a rule fails with codes.InvalidArgument before
// anything is sent, except a read whose values turn out to exceed 3 MiB:
// that one fails with codes.ResourceExhausted, and the caller asks for
// fewer keys. The rules and the words of their errors are those of the host
// (protocol.CheckKVBatchKeys, protocol.CheckKVBatchItems): the error names
// the first key or item that breaks one, "items[2]: value exceeds 65536
// bytes".
//
// Older hosts (before core 0.1.273) answer codes.Unimplemented to the batch
// calls. The KV of Host.KV then does the work with the single calls, at
// most 8 at a time, and remembers the answer, so an older host costs one
// refused call per plugin process and not one per batch.
// Results, rules and errors are the same; what the single calls cannot give
// is the cost and the atomic write: on such a host a failure in the middle
// of KVSetMany leaves the items written so far. A plugin that needs either
// declares hostCompat ">=0.1.273" in its manifest.

// KVValue is the answer for one key of a batch read.
type KVValue struct {
	Value []byte
	Found bool
}

// KVItem is one entry of a batch write. TTL 0 means no expiry; like KV.Set
// it is sent in whole seconds, so a TTL under one second is sent as 0. A
// negative TTL is refused, however small.
type KVItem struct {
	Key   string
	Value []byte
	TTL   time.Duration
}

// KVBatch is the batch side of a KV store. The KV of Host.KV implements it;
// call it through KVGetMany, KVSetMany and KVDeleteMany, which also accept a
// KV that does not (a test double, a wrapper). Such a KV is served with its
// Get, Set and Delete, called from up to 8 goroutines at a time: it must be
// safe for concurrent use.
type KVBatch interface {
	// GetMany returns one KVValue per key, in the order of keys.
	GetMany(ctx context.Context, namespace string, keys []string) ([]KVValue, error)
	// SetMany writes every item with its own TTL, all or nothing.
	SetMany(ctx context.Context, namespace string, items []KVItem) error
	// DeleteMany deletes the keys; a key that does not exist is not an error.
	DeleteMany(ctx context.Context, namespace string, keys []string) error
}

// KVGetMany reads many keys of namespace in one host call and returns one
// KVValue per key, in the order of keys. A kv without batch calls is read
// with its Get, from up to 8 goroutines at a time.
func KVGetMany(ctx context.Context, kv KV, namespace string, keys []string) ([]KVValue, error) {
	if kv == nil {
		return nil, ErrHostNotReady
	}
	if b, ok := kv.(KVBatch); ok {
		return b.GetMany(ctx, namespace, keys)
	}
	if err := protocol.CheckKVBatchKeys(namespace, keys); err != nil {
		return nil, err
	}
	return kvGetSingles(ctx, kv, namespace, keys)
}

// KVSetMany writes many entries of namespace in one host call, each with
// its own TTL, all or nothing. A kv without batch calls is written with its
// Set, from up to 8 goroutines at a time, which is not atomic.
func KVSetMany(ctx context.Context, kv KV, namespace string, items []KVItem) error {
	if kv == nil {
		return ErrHostNotReady
	}
	if b, ok := kv.(KVBatch); ok {
		return b.SetMany(ctx, namespace, items)
	}
	if err := kvCheckItems(namespace, items); err != nil {
		return err
	}
	return kvSetSingles(ctx, kv, namespace, items)
}

// KVDeleteMany deletes many keys of namespace in one host call. A kv
// without batch calls is asked with its Delete, from up to 8 goroutines at a
// time.
func KVDeleteMany(ctx context.Context, kv KV, namespace string, keys []string) error {
	if kv == nil {
		return ErrHostNotReady
	}
	if b, ok := kv.(KVBatch); ok {
		return b.DeleteMany(ctx, namespace, keys)
	}
	if err := protocol.CheckKVBatchKeys(namespace, keys); err != nil {
		return err
	}
	return kvDeleteSingles(ctx, kv, namespace, keys)
}

// ---------------------------------------------------------------- host

// batchRefused reports whether err is an older host refusing a batch call,
// and remembers it for the calls that follow on this host connection. Any
// other error is the call's own and is returned to the plugin.
func (k hostKV) batchRefused(err error) bool {
	if status.Code(err) != codes.Unimplemented {
		return false
	}
	k.noBatch.Store(true)
	return true
}

func (k hostKV) GetMany(ctx context.Context, ns string, keys []string) ([]KVValue, error) {
	if err := protocol.CheckKVBatchKeys(ns, keys); err != nil {
		return nil, err
	}
	if !k.noBatch.Load() {
		r, err := k.c.KVGetMany(ctx, &pluginv1.KVGetManyRequest{Namespace: ns, Keys: keys})
		if err == nil {
			items := r.GetItems()
			if len(items) != len(keys) {
				return nil, status.Errorf(codes.Internal, "pluginsdk: host answered %d items for %d keys", len(items), len(keys))
			}
			out := make([]KVValue, len(items))
			for i, it := range items {
				out[i] = KVValue{Value: it.GetValue(), Found: it.GetFound()}
			}
			return out, nil
		}
		if !k.batchRefused(err) {
			return nil, err
		}
	}
	return kvGetSingles(ctx, k, ns, keys)
}

func (k hostKV) SetMany(ctx context.Context, ns string, items []KVItem) error {
	if err := kvCheckItems(ns, items); err != nil {
		return err
	}
	if !k.noBatch.Load() {
		req := &pluginv1.KVSetManyRequest{Namespace: ns, Items: make([]*pluginv1.KVSetManyItem, len(items))}
		for i, it := range items {
			req.Items[i] = &pluginv1.KVSetManyItem{Key: it.Key, Value: it.Value, TtlSeconds: kvTTLSeconds(it.TTL)}
		}
		_, err := k.c.KVSetMany(ctx, req)
		if err == nil || !k.batchRefused(err) {
			return err
		}
	}
	return kvSetSingles(ctx, k, ns, items)
}

func (k hostKV) DeleteMany(ctx context.Context, ns string, keys []string) error {
	if err := protocol.CheckKVBatchKeys(ns, keys); err != nil {
		return err
	}
	if !k.noBatch.Load() {
		_, err := k.c.KVDeleteMany(ctx, &pluginv1.KVDeleteManyRequest{Namespace: ns, Keys: keys})
		if err == nil || !k.batchRefused(err) {
			return err
		}
	}
	return kvDeleteSingles(ctx, k, ns, keys)
}

// ---------------------------------------------------------------- rules

// kvTTLSeconds is the ttl in whole seconds that KV.Set and the batch write
// send for ttl.
func kvTTLSeconds(ttl time.Duration) int64 { return int64(ttl / time.Second) }

// kvCheckItems applies the host's rules to one batch write
// (HostService.KVSetMany); protocol.CheckKVBatchKeys does it for the keys of
// a read or a delete.
func kvCheckItems(ns string, items []KVItem) error {
	return protocol.CheckKVBatchItems(ns, len(items), func(i int) (string, int, int64) {
		it := items[i]
		if it.TTL < 0 {
			// Whole seconds would turn a negative TTL of under a second
			// into 0, no expiry.
			return it.Key, len(it.Value), -1
		}
		return it.Key, len(it.Value), kvTTLSeconds(it.TTL)
	})
}

// ---------------------------------------------------------------- single calls

// kvSinglesParallel bounds the single calls in flight for one batch that a
// kv without batch calls serves. The documentation of KVBatch, KVGetMany,
// KVSetMany and KVDeleteMany says 8.
const kvSinglesParallel = 8

// kvEach runs call for every index below n, at most kvSinglesParallel at a
// time. It returns the first error; no further call starts after one.
func kvEach(n int, call func(i int) error) error {
	var (
		next   atomic.Int64
		failed atomic.Bool
		once   sync.Once
		first  error
		wg     sync.WaitGroup
	)
	for range min(n, kvSinglesParallel) {
		wg.Go(func() {
			for !failed.Load() {
				i := int(next.Add(1)) - 1
				if i >= n {
					return
				}
				if err := call(i); err != nil {
					failed.Store(true)
					once.Do(func() { first = err })
					return
				}
			}
		})
	}
	wg.Wait()
	return first
}

// kvGetSingles is a batch read with kv.Get. The arguments are checked.
func kvGetSingles(ctx context.Context, kv KV, ns string, keys []string) ([]KVValue, error) {
	out := make([]KVValue, len(keys))
	err := kvEach(len(keys), func(i int) error {
		value, found, err := kv.Get(ctx, ns, keys[i])
		out[i] = KVValue{Value: value, Found: found}
		return err
	})
	if err != nil {
		return nil, err
	}
	total := 0
	for _, v := range out {
		total += len(v.Value)
	}
	if err := protocol.CheckKVBatchAnswer(total); err != nil {
		return nil, err
	}
	return out, nil
}

// kvSetSingles is a batch write with kv.Set. The arguments are checked, so
// an invalid item has already failed the whole batch; a failing Set leaves
// the items written before it. Of a repeated key only the last item is
// written, as in the host's batch call: concurrent Sets of one key have no
// order.
func kvSetSingles(ctx context.Context, kv KV, ns string, items []KVItem) error {
	last := make(map[string]int, len(items))
	for i, it := range items {
		last[it.Key] = i
	}
	return kvEach(len(items), func(i int) error {
		it := items[i]
		if last[it.Key] != i {
			return nil
		}
		return kv.Set(ctx, ns, it.Key, it.Value, it.TTL)
	})
}

// kvDeleteSingles is a batch delete with kv.Delete. The arguments are
// checked.
func kvDeleteSingles(ctx context.Context, kv KV, ns string, keys []string) error {
	return kvEach(len(keys), func(i int) error { return kv.Delete(ctx, ns, keys[i]) })
}
