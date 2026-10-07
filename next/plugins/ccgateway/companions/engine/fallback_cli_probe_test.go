package engine

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"strings"
	"sync"
	"testing"
	"time"
)

func fallbackFixture() Object {
	return Object{"type": "fallback", "from": Object{"model": "claude-opus-5-5"}, "to": Object{"model": "claude-opus-4-8"}, "trigger": Object{"type": "refusal", "category": "fixture", "explanation": "isolated synthetic fixture"}}
}

func TestRealCLIFallbackCodecProbe(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated raw fallback probe")
	}
	root := t.TempDir()
	var mu sync.Mutex
	var requests []Object
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		mu.Lock()
		requests = append(requests, body)
		mu.Unlock()
		writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "BEFORE_BOUNDARY"}, fallbackFixture(), {"type": "text", "text": "AFTER_BOUNDARY"}})
	}))
	defer fake.Close()
	env := messageProbeEnv(root, fake.URL)
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, cli, "-p", "--model", "claude-opus-5-5", "--input-format", "stream-json", "--output-format", "stream-json", "--include-partial-messages", "--verbose", "--tools", "", "--max-turns", "1", "--setting-sources", "")
	cmd.Dir = root
	cmd.Env = env
	out, err := runMessageFeatureInput(cmd, Object{"role": "user", "content": "FALLBACK_CODEC_FIXTURE"})
	if err != nil {
		t.Fatalf("CLI error=%v output_bytes=%d", err, len(out))
	}
	sid := ""
	native := false
	stream := false
	nativeBoundary := false
	var eventShape []string
	for _, line := range bytes.Split(out, []byte{'\n'}) {
		frame, _ := decodeObject(line)
		if bytes.Contains(line, []byte(`"type":"fallback"`)) {
			var keys []string
			for key := range frame {
				keys = append(keys, key)
			}
			t.Logf("fallback-bearing frame type=%s subtype=%s keys=%v", str(frame, "type"), str(frame, "subtype"), keys)
			message, _ := frame["message"].(Object)
			blocks, _ := historyContent(message["content"])
			for _, block := range blocks {
				if str(block, "type") == "fallback" {
					nativeBoundary = true
					t.Logf("synthetic fallback native block=%v", block)
				}
			}
		}
		if str(frame, "session_id") != "" {
			sid = str(frame, "session_id")
		}
		if str(frame, "type") == "assistant" && messageProbeContainsBlock(Object{"messages": []any{frame["message"]}}, fallbackFixture()) {
			native = true
		}
		if str(frame, "type") == "stream_event" {
			event, _ := frame["event"].(Object)
			block, _ := event["content_block"].(Object)
			eventShape = append(eventShape, fmt.Sprintf("%s:%v:%s", str(event, "type"), event["index"], str(block, "type")))
			stream = stream || digest(event["content_block"]) == digest(fallbackFixture())
		}
	}
	if sid == "" {
		t.Fatal("CLI produced no session")
	}
	resumed := exec.CommandContext(ctx, cli, "-p", "FALLBACK_CONTINUE", "--resume", sid, "--model", "claude-opus-5-5", "--output-format", "stream-json", "--verbose", "--tools", "", "--max-turns", "1", "--setting-sources", "")
	resumed.Dir = root
	resumed.Env = env
	next, resumeErr := resumed.CombinedOutput()
	if resumeErr != nil {
		t.Fatalf("resume error=%v bytes=%d", resumeErr, len(next))
	}
	mu.Lock()
	last := requests[len(requests)-1]
	calls := len(requests)
	mu.Unlock()
	t.Logf("raw fallback stream=%t native=%t resumed_wire=%t calls=%d", stream, native, messageProbeContainsBlock(last, fallbackFixture()), calls)
	t.Logf("resumed fallback block count=%d stripped_identity_present=%t", len(wireFallbackBlocks(last)), messageProbeContainsBlock(last, fallbackIdentity(fallbackFixture())))
	t.Logf("raw event shape=%v fallback_literal=%t", eventShape, bytes.Contains(out, []byte(`"type":"fallback"`)))
	if stream || native || !nativeBoundary || len(wireFallbackBlocks(last)) != 0 {
		t.Fatal("CLI fallback codec behavior changed; reassess omission adapter")
	}
}
