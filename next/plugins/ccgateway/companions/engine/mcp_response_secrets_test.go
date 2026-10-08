package engine

import (
	"bytes"
	"strings"
	"testing"
)

func TestMCPResponseCredentialEchoGuard(t *testing.T) {
	newGuard := func() *mcpResponseGuard {
		return newMCPResponseGuard(&MCPConnectorPlan{credentials: map[string]mcpCredential{"one": {token: "PRIVATE_TOKEN"}}})
	}
	for _, body := range []string{`{"content":"PRIVATE_TOKEN"}`, `{"error":{"message":"PRIVATE_\u0054OKEN"}}`} {
		if newGuard().checkJSON([]byte(body)) == nil {
			t.Fatal("accepted complete or escaped credential")
		}
	}
	g := newGuard()
	if err := g.checkJSON([]byte(`{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"PRIVATE_"}}`)); err != nil {
		t.Fatal(err)
	}
	if g.checkJSON([]byte(`{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"TOKEN"}}`)) == nil {
		t.Fatal("accepted split delta credential")
	}
	g = newGuard()
	if err := g.checkJSON([]byte(`{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\"value\":\"PRIVATE_"}}`)); err != nil {
		t.Fatal(err)
	}
	if g.checkJSON([]byte(`{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"\\u0054OKEN\"}"}}`)) == nil {
		t.Fatal("accepted nested JSON escaped credential")
	}
}

func TestCredentialPrefixSuffixMatchesLiteralDefinition(t *testing.T) {
	for _, token := range []string{"a", "aba", "aaab", "PRIVATE_TOKEN", "bearer_令牌"} {
		table := credentialPrefixTable(token)
		for _, prefix := range []string{"", "xyz", "aba", "aaaa", token} {
			for n := 0; n <= len(token); n++ {
				text := prefix + token[:n]
				want := 0
				for size := 1; size <= len(token); size++ {
					if strings.HasSuffix(text, token[:size]) {
						want = size
					}
				}
				if got := credentialPrefixSuffix(text, token, table); got != want {
					t.Fatalf("suffix length = %d, want %d", got, want)
				}
			}
		}
	}
	token := strings.Repeat("a", (64<<10)-1) + "b"
	if got := credentialPrefixSuffix(strings.Repeat("a", 64<<10), token, credentialPrefixTable(token)); got != len(token)-1 {
		t.Fatalf("long credential suffix = %d", got)
	}
}

func TestMCPGuardRejectsUnfinishedJSONBeforeRelease(t *testing.T) {
	g := newMCPResponseGuard(&MCPConnectorPlan{credentials: map[string]mcpCredential{"one": {token: "PRIVATE_TOKEN"}}})
	first := []byte("data: " + `{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\"value\":\"PRIVATE_"}}` + "\n\n")
	if out, err := g.releaseEvent(first); err != nil || len(out) != 0 {
		t.Fatal("unfinished input escaped")
	}
	stop := []byte("data: " + `{"type":"content_block_stop","index":0}` + "\n\n")
	if out, err := g.releaseEvent(stop); err == nil || len(out) != 0 {
		t.Fatal("unfinished JSON released at block stop")
	}
}

func TestMCPResponseGuardHoldsPossibleCredentialPrefix(t *testing.T) {
	plan := &MCPConnectorPlan{credentials: map[string]mcpCredential{"one": {token: "PRIVATE_TOKEN"}}}
	event := func(text string) []byte {
		return append(append([]byte("data: "), mustMCPJSON(Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "text_delta", "text": text}})...), []byte("\n\n")...)
	}
	g := newMCPResponseGuard(plan)
	first := event("hello PRIVATE_")
	if out, err := g.releaseEvent(first); err != nil || len(out) != 0 {
		t.Fatal("potential credential prefix reached CLI")
	}
	if out, err := g.releaseEvent(event("TOKEN")); err == nil || len(out) != 0 {
		t.Fatal("split credential was not blocked atomically")
	}
	g = newMCPResponseGuard(plan)
	if out, err := g.releaseEvent(first); err != nil || len(out) != 0 {
		t.Fatal("potential prefix not retained")
	}
	second := event("safe")
	out, err := g.releaseEvent(second)
	if err != nil || !bytes.Equal(out, append(first, second...)) {
		t.Fatal("safe disambiguated frames changed")
	}
	short := newMCPResponseGuard(&MCPConnectorPlan{credentials: map[string]mcpCredential{"one": {token: "1"}}})
	if err := short.checkJSON([]byte(`{"index":1,"input_tokens":11}`)); err != nil {
		t.Fatal("numeric data treated as credential text")
	}
	if short.checkJSON([]byte(`{"text":"1"}`)) == nil {
		t.Fatal("literal short credential was not blocked")
	}
	if newMCPResponseGuard(nil) != nil {
		t.Fatal("ordinary response acquired credential buffering")
	}
}
