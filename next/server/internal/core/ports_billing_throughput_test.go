package core

import "testing"

func TestThroughput(t *testing.T) {
	tok := UsageTokens{Input: 100, Output: 7, CacheRead: 90, CacheCreation: 5, CacheCreation1h: 1}
	if n := tok.Throughput("exclusive"); n != 107 {
		t.Fatal("exclusive", n)
	}
	if n := tok.Throughput(""); n != 107 {
		t.Fatal("unset semantics", n)
	}
	if n := tok.Throughput("inclusive"); n != 11 {
		t.Fatal("inclusive", n)
	}
	if n := (UsageTokens{Input: 5, Output: 1, CacheRead: 9}).Throughput("inclusive"); n != 1 {
		t.Fatal("cache above input", n)
	}
}
