package pluginsdktest

import (
	"context"
	"maps"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
)

// The batch KV calls of the fake follow the host's rules (CONTRACTS §93):
// the namespace, key, value and ttl rules of one entry, at most
// protocol.KVBatchMaxKeys keys per call, at most protocol.KVBatchMaxBytes of
// payload, an answer per key in request order and a write that is all or
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

func (f *FakeHost) countKV(rpc string) {
	f.mu.Lock()
	f.kvCalls[rpc]++
	f.mu.Unlock()
}

// kvBatchStart counts one batch call and checks what every batch call
// checks. The caller holds f.mu.
func (f *FakeHost) kvBatchStart(rpc, ns, what string, n int) error {
	f.kvCalls[rpc]++
	if f.KVBatchUnimplemented {
		return status.Errorf(codes.Unimplemented, "method %s not implemented", rpc)
	}
	if !protocol.ValidKVNamespace(ns) {
		return status.Error(codes.InvalidArgument, "invalid namespace")
	}
	if n > protocol.KVBatchMaxKeys {
		return status.Errorf(codes.InvalidArgument, "at most %d %s per call", protocol.KVBatchMaxKeys, what)
	}
	return nil
}

func (f *FakeHost) kvBatchKeys(rpc, ns string, keys []string) error {
	if err := f.kvBatchStart(rpc, ns, "keys", len(keys)); err != nil {
		return err
	}
	for i, key := range keys {
		if !protocol.ValidKVKey(key) {
			return status.Errorf(codes.InvalidArgument, "keys[%d]: key must be 1..%d bytes", i, protocol.KVMaxKeyBytes)
		}
	}
	return nil
}

func (f *FakeHost) KVGetMany(_ context.Context, in *pluginv1.KVGetManyRequest) (*pluginv1.KVGetManyResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if err := f.kvBatchKeys("KVGetMany", in.GetNamespace(), in.GetKeys()); err != nil {
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
	if total > protocol.KVBatchMaxBytes {
		return nil, status.Errorf(codes.ResourceExhausted, "the values of these keys exceed %d bytes", protocol.KVBatchMaxBytes)
	}
	return out, nil
}

func (f *FakeHost) KVSetMany(_ context.Context, in *pluginv1.KVSetManyRequest) (*pluginv1.KVSetManyResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if err := f.kvBatchStart("KVSetMany", in.GetNamespace(), "items", len(in.GetItems())); err != nil {
		return nil, err
	}
	// Every item is checked before the first one is stored.
	total := 0
	for i, it := range in.GetItems() {
		switch {
		case it == nil || !protocol.ValidKVKey(it.GetKey()):
			return nil, status.Errorf(codes.InvalidArgument, "items[%d]: key must be 1..%d bytes", i, protocol.KVMaxKeyBytes)
		case len(it.GetValue()) > protocol.KVMaxValueBytes:
			return nil, status.Errorf(codes.InvalidArgument, "items[%d]: value exceeds %d bytes", i, protocol.KVMaxValueBytes)
		case !protocol.ValidKVBatchTTL(it.GetTtlSeconds()):
			return nil, status.Errorf(codes.InvalidArgument, "items[%d]: ttl_seconds must be 0..%d", i, protocol.KVMaxTTLSeconds)
		}
		total += len(it.GetKey()) + len(it.GetValue())
	}
	if total > protocol.KVBatchMaxBytes {
		return nil, status.Errorf(codes.InvalidArgument, "keys and values exceed %d bytes", protocol.KVBatchMaxBytes)
	}
	now := time.Now()
	for _, it := range in.GetItems() {
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
	if err := f.kvBatchKeys("KVDeleteMany", in.GetNamespace(), in.GetKeys()); err != nil {
		return nil, err
	}
	for _, key := range in.GetKeys() {
		delete(f.kv, kvKey(in.GetNamespace(), key))
	}
	return &pluginv1.KVDeleteManyResponse{}, nil
}
