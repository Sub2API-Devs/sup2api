package remotedocker

import (
	"context"
	"strings"
	"testing"
	"time"
)

// TestRunScriptFeedsStdinAndReportsTheExitStatus: the script travels as one
// quoted sh -c argument, the secret only on stdin, and a failing script is a
// result (exit status), not a transport error.
func TestRunScriptFeedsStdinAndReportsTheExitStatus(t *testing.T) {
	f := newHost(t, "CCG_RESULT=image_pull_failed test-secret\n", false)
	f.readStdin, f.exit = true, 1
	script := "echo 'it''s' && cat > /tmp/x"
	res, err := RunScript(context.Background(), f.cfg, script, []byte("KEY=stdin-only\n"), 10*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	if res.ExitStatus != 1 || !strings.HasPrefix(res.Output, "CCG_RESULT=image_pull_failed") {
		t.Fatalf("result: %+v", res)
	}
	if strings.Contains(res.Output, "test-secret") {
		t.Fatalf("SSH password not redacted: %q", res.Output)
	}
	cmd := <-f.commands
	if cmd != "sh -c "+shellQuote(script) || strings.Contains(cmd, "stdin-only") {
		t.Fatalf("command: %q", cmd)
	}
	if got := string(<-f.stdins); got != "KEY=stdin-only\n" {
		t.Fatalf("stdin: %q", got)
	}

	f.exit = 0
	if res, err = RunScript(context.Background(), f.cfg, "true", nil, 10*time.Second); err != nil || res.ExitStatus != 0 {
		t.Fatalf("success: %+v %v", res, err)
	}
	<-f.commands
	<-f.stdins
	if _, err = RunScript(context.Background(), f.cfg, "", nil, time.Second); err == nil {
		t.Fatal("empty script accepted")
	}
	bad := f.cfg
	bad.Password = "wrong"
	if _, err = RunScript(context.Background(), bad, "true", nil, 10*time.Second); err == nil {
		t.Fatal("wrong password accepted")
	}
}
