package protocol

import (
	"math"
	"strings"
	"time"
)

// Plugin KV rules (HostService.KVGet / KVSet / KVDelete / KVList and the
// batch calls KVGetMany / KVSetMany / KVDeleteMany, CONTRACTS §93), shared
// by the host, which enforces them, and the SDK, which applies the same
// rules when it has to replace a batch call by single calls on an older
// host.
const (
	// KVMaxNamespaceBytes, KVMaxKeyBytes and KVMaxValueBytes bound one
	// entry.
	KVMaxNamespaceBytes = 64
	KVMaxKeyBytes       = 512
	KVMaxValueBytes     = 64 << 10

	// KVNamespaceForbidden lists the bytes a namespace must not contain.
	KVNamespaceForbidden = `:*?[]\`

	// KVBatchMaxKeys caps the keys (or items) of one batch call.
	KVBatchMaxKeys = 512
	// KVBatchMaxBytes caps the payload of one batch call: the keys plus the
	// values of a KVSetMany request, the keys of a KVGetMany or
	// KVDeleteMany request, and the values of a KVGetMany answer. It stays
	// under the 4 MiB a host accepts in one HostService request (the
	// default gRPC receive limit of the broker server).
	KVBatchMaxBytes = 3 << 20

	// KVMaxTTLSeconds is the largest ttl_seconds of a batch write: the
	// largest whole number of seconds a time.Duration holds (about 292
	// years).
	KVMaxTTLSeconds = int64(math.MaxInt64 / int64(time.Second))
)

// ValidKVNamespace reports whether ns is 1..64 bytes without any of
// KVNamespaceForbidden.
func ValidKVNamespace(ns string) bool {
	return ns != "" && len(ns) <= KVMaxNamespaceBytes && !strings.ContainsAny(ns, KVNamespaceForbidden)
}

// ValidKVKey reports whether key is 1..512 bytes.
func ValidKVKey(key string) bool { return key != "" && len(key) <= KVMaxKeyBytes }

// ValidKVBatchTTL reports whether ttlSeconds is a ttl a batch write accepts:
// 0 (no expiry) up to KVMaxTTLSeconds.
func ValidKVBatchTTL(ttlSeconds int64) bool { return ttlSeconds >= 0 && ttlSeconds <= KVMaxTTLSeconds }
