package pluginsdktest

import (
	"cmp"
	"context"
	"maps"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
)

// The batch KV calls of the fake follow the host's rules (CONTRACTS §93) and
// answer a broken one with the host's error: both call
// protocol.CheckKVBatchKeys, CheckKVBatchItems and CheckKVBatchAnswer. An
// answer has one item per key in request order and a write is all or
// nothing. The fake has no grants.

// SetKVBatchUnimplemented switches the batch KV calls between a current core
// (false) and a core before 0.1.273, which answers UNIMPLEMENTED (true),
// while the plugin runs. The SDK remembers an UNIMPLEMENTED answer for the
// rest of the host connection, as it would on a real older core.
func (f *FakeHost) SetKVBatchUnimplemented(v bool) {
	f.mu.Lock()
	f.KVBatchUnimplemented = v
	f.mu.Unlock()
}

// KVCalls returns how many times each KV call was received, by RPC name
// ("KVGet", "KVGetMany", ...), refused batch calls included. Use it to check
// that a plugin reads its keys in one call.
func (f *FakeHost) KVCalls() map[string]int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return maps.Clone(f.kvCalls)
}

// kvBatchStart counts one batch call and refuses it when the fake plays an
// older core. The caller holds f.mu.
func (f *FakeHost) kvBatchStart(rpc string) error {
	f.kvCalls[rpc]++
	if f.KVBatchUnimplemented {
		return status.Errorf(codes.Unimplemented, "method %s not implemented", rpc)
	}
	return nil
}

func (f *FakeHost) KVGetMany(_ context.Context, in *pluginv1.KVGetManyRequest) (*pluginv1.KVGetManyResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if err := cmp.Or(f.kvBatchStart("KVGetMany"), protocol.CheckKVBatchKeys(in.GetNamespace(), in.GetKeys())); err != nil {
		return nil, err
	}
	out := &pluginv1.KVGetManyResponse{Items: make([]*pluginv1.KVGetManyItem, len(in.GetKeys()))}
	now, total := time.Now(), 0
	for i, key := range in.GetKeys() {
		item := &pluginv1.KVGetManyItem{}
		if it, ok := f.kv[kvKey(in.GetNamespace(), key)]; ok && (it.expires.IsZero() || !now.After(it.expires)) {
			item.Found, item.Value = true, it.value
			total += len(it.value)
		}
		out.Items[i] = item
	}
	if err := protocol.CheckKVBatchAnswer(total); err != nil {
		return nil, err
	}
	return out, nil
}

func (f *FakeHost) KVSetMany(_ context.Context, in *pluginv1.KVSetManyRequest) (*pluginv1.KVSetManyResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if err := f.kvBatchStart("KVSetMany"); err != nil {
		return nil, err
	}
	// Every item is checked before the first one is stored.
	items := in.GetItems()
	if err := protocol.CheckKVBatchItems(in.GetNamespace(), len(items), func(i int) (string, int, int64) {
		return items[i].GetKey(), len(items[i].GetValue()), items[i].GetTtlSeconds()
	}); err != nil {
		return nil, err
	}
	now := time.Now()
	for _, it := range items {
		stored := kvItem{value: append([]byte(nil), it.GetValue()...)}
		if it.GetTtlSeconds() > 0 {
			stored.expires = now.Add(time.Duration(it.GetTtlSeconds()) * time.Second)
		}
		f.kv[kvKey(in.GetNamespace(), it.GetKey())] = stored
	}
	return &pluginv1.KVSetManyResponse{}, nil
}

func (f *FakeHost) KVDeleteMany(_ context.Context, in *pluginv1.KVDeleteManyRequest) (*pluginv1.KVDeleteManyResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if err := cmp.Or(f.kvBatchStart("KVDeleteMany"), protocol.CheckKVBatchKeys(in.GetNamespace(), in.GetKeys())); err != nil {
		return nil, err
	}
	for _, key := range in.GetKeys() {
		delete(f.kv, kvKey(in.GetNamespace(), key))
	}
	return &pluginv1.KVDeleteManyResponse{}, nil
}
