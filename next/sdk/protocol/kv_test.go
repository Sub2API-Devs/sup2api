package protocol

import (
	"math"
	"strings"
	"testing"
	"time"
)

func TestKVRules(t *testing.T) {
	for ns, ok := range map[string]bool{
		"n": true, "cache.v2-a_b/c": true, strings.Repeat("n", 64): true,
		"": false, strings.Repeat("n", 65): false,
		"a:b": false, "a*": false, "a?": false, "[a": false, "a]": false, `a\b`: false,
	} {
		if ValidKVNamespace(ns) != ok {
			t.Errorf("ValidKVNamespace(%q) = %v", ns, !ok)
		}
	}
	for key, ok := range map[string]bool{
		"k": true, "a:b*?[]": true, strings.Repeat("k", 512): true,
		"": false, strings.Repeat("k", 513): false,
	} {
		if ValidKVKey(key) != ok {
			t.Errorf("ValidKVKey(%d bytes) = %v", len(key), !ok)
		}
	}
	for ttl, ok := range map[int64]bool{
		0: true, 1: true, KVMaxTTLSeconds: true,
		-1: false, KVMaxTTLSeconds + 1: false, math.MaxInt64: false, math.MinInt64: false,
	} {
		if ValidKVBatchTTL(ttl) != ok {
			t.Errorf("ValidKVBatchTTL(%d) = %v", ttl, !ok)
		}
	}
	// Every ttl a batch accepts is a time.Duration, and every non-negative
	// time.Duration is a ttl a batch accepts.
	if d := time.Duration(KVMaxTTLSeconds) * time.Second; d <= 0 || int64(d/time.Second) != KVMaxTTLSeconds {
		t.Errorf("KVMaxTTLSeconds overflows time.Duration: %v", d)
	}
	if !ValidKVBatchTTL(int64(time.Duration(math.MaxInt64) / time.Second)) {
		t.Error("the largest time.Duration is not a valid batch ttl")
	}
	// One full batch request must fit the 4 MiB a host receives: the payload
	// limit plus, for every item, its protobuf framing (under 32 bytes).
	if KVBatchMaxBytes+KVBatchMaxKeys*32+KVMaxNamespaceBytes+16 >= 4<<20 {
		t.Error("a batch at the payload limit does not fit a 4 MiB gRPC message")
	}
}
