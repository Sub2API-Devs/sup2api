package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"testing"
	"time"
)

func lifecycleTestExecutable() (string, error) {
	// In a bind-mounted Linux test binary, readlink(/proc/self/exe) can expose
	// the source pathname outside this mount namespace. Execute the proc link
	// itself rather than the possibly inaccessible os.Executable pathname.
	if runtime.GOOS == "linux" {
		return "/proc/self/exe", nil
	}
	return os.Executable()
}

// Run the test executable as a small CLI peer; no shell or installed Claude is
// needed to exercise the real OS pipes and process lifecycle.
func TestMain(m *testing.M) {
	if mode := os.Getenv("CCG_TEST_AUTH_PEER"); mode != "" {
		authPeer(mode)
		os.Exit(0)
	}
	if os.Getenv("CCG_TEST_CLI_TAIL") == "hold-pipe" {
		time.Sleep(2 * time.Second)
		os.Exit(0)
	}
	if os.Getenv("CCG_TEST_CLI_TAIL") != "" {
		if err := cliTailPeer(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(2)
		}
		os.Exit(0)
	}
	os.Exit(m.Run())
}

func cliTailPeer() error {
	if file := os.Getenv("CCG_TEST_POLICY_CAPTURE"); file != "" {
		raw, _ := json.Marshal(Object{"args": os.Args[1:], "betas": os.Getenv("ANTHROPIC_BETAS"), "extra": os.Getenv("CLAUDE_CODE_EXTRA_BODY"), "effort_env": os.Getenv("CLAUDE_CODE_EFFORT_LEVEL"), "streaming": os.Getenv("CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING")})
		if err := os.WriteFile(file, raw, 0600); err != nil {
			return err
		}
	}

	dec, enc := json.NewDecoder(os.Stdin), json.NewEncoder(os.Stdout)
	var init, user Object
	if err := dec.Decode(&init); err != nil {
		return err
	}
	if err := enc.Encode(Object{"type": "control_response", "response": Object{"subtype": "success", "request_id": init["request_id"]}}); err != nil {
		return err
	}
	if err := dec.Decode(&user); err != nil {
		return err
	}
	if err := os.WriteFile(os.Getenv("CCGATEWAY_READY_FILE"), []byte("ccgateway-v1"), 0600); err != nil {
		return err
	}
	message := Object{"id": "msg_tail", "role": "assistant", "content": []Object{}, "stop_reason": "end_turn"}
	path := filepath.Join(os.Getenv("CLAUDE_CONFIG_DIR"), "projects", "probe")
	if err := os.MkdirAll(path, 0700); err != nil {
		return err
	}
	row, err := json.Marshal(Object{"type": "assistant", "uuid": uuid(), "message": message})
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(path, str(user, "session_id")+".jsonl"), append(row, '\n'), 0600); err != nil {
		return err
	}
	for _, event := range []Object{
		{"type": "message_start", "message": message},
		{"type": "message_delta", "delta": Object{"stop_reason": "end_turn"}},
		{"type": "message_stop"},
	} {
		if err := enc.Encode(Object{"type": "stream_event", "event": event}); err != nil {
			return err
		}
	}
	if err := enc.Encode(Object{"type": "result", "subtype": "success"}); err != nil {
		return err
	}
	if os.Getenv("CCG_TEST_CLI_TAIL") == "descendant" {
		cli, err := lifecycleTestExecutable()
		if err != nil {
			return err
		}
		child := exec.Command(cli)
		child.Dir = os.TempDir()
		child.Env = envWith(os.Environ(), map[string]string{"CCG_TEST_CLI_TAIL": "hold-pipe"})
		child.Stdout = os.Stdout
		if err := child.Start(); err != nil {
			return err
		}
		return child.Process.Release()
	}
	// Far beyond pipe capacity on Windows and Linux. Wait-before-drain hangs.
	_, err = os.Stdout.Write(bytes.Repeat([]byte("\n"), 4<<20))
	return err
}

func TestRunnerCancellationClosesInheritedOutputPipe(t *testing.T) {
	cli, err := lifecycleTestExecutable()
	if err != nil {
		t.Fatal(err)
	}
	dir := t.TempDir()
	runner := &Runner{CLI: cli, Env: envWith(os.Environ(), map[string]string{
		"CCG_TEST_CLI_TAIL": "descendant", "CLAUDE_CONFIG_DIR": filepath.Join(dir, "config"),
	})}
	p := &Prepared{Work: dir, SessionID: uuid(), InputUUID: uuid()}
	ctx, cancel := context.WithTimeout(context.Background(), 300*time.Millisecond)
	defer cancel()
	started := time.Now()
	// Let the intentionally detached fixture exit before go test removes its
	// executable on Windows; the measured request itself must return promptly.
	t.Cleanup(func() { time.Sleep(time.Until(started.Add(2500 * time.Millisecond))) })
	_, err = runner.run(ctx, parsed(t, basic()), p, dir, func(Object) error { return nil })
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("expected deadline error, got %v", err)
	}
	if time.Since(started) > time.Second {
		t.Fatal("cancellation waited for descendant to close inherited stdout")
	}
}

func TestRunnerDrainsOutputAfterResult(t *testing.T) {
	cli, err := lifecycleTestExecutable()
	if err != nil {
		t.Fatal(err)
	}
	dir := t.TempDir()
	runner := &Runner{CLI: cli, Env: envWith(os.Environ(), map[string]string{
		"CCG_TEST_CLI_TAIL": "1", "CLAUDE_CONFIG_DIR": filepath.Join(dir, "config"),
	})}
	p := &Prepared{Work: dir, SessionID: uuid(), InputUUID: uuid()}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	answer, err := runner.run(ctx, parsed(t, basic()), p, dir, func(Object) error { return nil })
	if err != nil {
		t.Fatal(err)
	}
	if str(answer, "id") != "msg_tail" || len(p.NativeRows) != 1 {
		t.Fatal("complete response and persisted transcript were not retained")
	}
}
