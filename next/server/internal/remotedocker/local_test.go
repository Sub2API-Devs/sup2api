package remotedocker

import (
	"bytes"
	"context"
	"errors"
	"strings"
	"testing"
	"time"
)

// TestRunLocalScript: sh -c with stdin, the exit status as a result, output
// bounded like RunScript, no inherited core environment, the time limit.
func TestRunLocalScript(t *testing.T) {
	t.Setenv("CCG_TEST_CORE_SECRET", "core-secret")
	res, err := RunLocalScript(context.Background(), "cat; echo; echo \"secret=${CCG_TEST_CORE_SECRET:-none}\"; exit 3", []byte("KEY=stdin-only"), 10*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	if res.ExitStatus != 3 || res.Output != "KEY=stdin-only\nsecret=none\n" {
		t.Fatalf("result: %+v", res)
	}
	if res, err = RunLocalScript(context.Background(), "true", nil, 10*time.Second); err != nil || res.ExitStatus != 0 || res.Output != "" {
		t.Fatalf("success: %+v %v", res, err)
	}
	res, err = RunLocalScript(context.Background(), "i=0; while [ $i -lt 2000 ]; do printf '%0100d\\n' 0; i=$((i+1)); done", nil, 30*time.Second)
	if err != nil || len(res.Output) != maxOutput {
		t.Fatalf("bounded output: %d %v", len(res.Output), err)
	}
	start := time.Now()
	if _, err = RunLocalScript(context.Background(), "sleep 20", nil, 300*time.Millisecond); err == nil || time.Since(start) > 10*time.Second {
		t.Fatalf("limit: %v after %s", err, time.Since(start))
	}
	for _, script := range []string{"", "echo \x00"} {
		if _, err = RunLocalScript(context.Background(), script, nil, time.Second); err == nil || !strings.Contains(err.Error(), "invalid script") {
			t.Fatalf("script %q: %v", script, err)
		}
	}
}

// TestRunLocalScriptStream: stdin streamed from a reader reaches the script
// unchanged; a failing reader fails the run although the script exits 0.
func TestRunLocalScriptStream(t *testing.T) {
	big := bytes.Repeat([]byte("0123456789abcdef"), 1<<16) // 1 MiB
	res, err := RunLocalScriptStream(context.Background(), "wc -c | tr -d ' '", bytes.NewReader(big), 30*time.Second)
	if err != nil || res.ExitStatus != 0 || strings.TrimSpace(res.Output) != "1048576" {
		t.Fatalf("stream: %+v %v", res, err)
	}
	if _, err = RunLocalScriptStream(context.Background(), "cat >/dev/null", &failAfter{r: bytes.NewReader(big[:1000]), err: errors.New("checksum")}, 30*time.Second); err == nil {
		t.Fatal("failing reader accepted")
	}
}
