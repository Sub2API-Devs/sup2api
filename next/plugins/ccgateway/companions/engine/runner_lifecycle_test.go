package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
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
	if os.Getenv("CCG_TEST_REQUEST_PEER") != "" {
		requestCancellationPeer()
		os.Exit(0)
	}
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
	if log := os.Getenv("CCG_TEST_INFO_PEER"); log != "" {
		infoPeer(log)
		os.Exit(0)
	}
	os.Exit(m.Run())
}

// infoPeer answers the startup questions of a pinned 2.1.304 CLI and counts
// them in log, one line per run.
func infoPeer(log string) {
	f, _ := os.OpenFile(log, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	fmt.Fprintln(f, strings.Join(os.Args[1:], " "))
	f.Close()
	switch strings.Join(os.Args[1:], " ") {
	case "--version":
		fmt.Println("2.1.304 (Claude Code)")
	case "--ccgateway-info":
		fmt.Println(`{"version":"2.1.304","patch":"ccgateway-test","capabilities":["request_build","request_direct"]}`)
	}
}

func cliTailPeer() error {
	if file := os.Getenv("CCG_TEST_POLICY_CAPTURE"); file != "" {
		raw, _ := json.Marshal(Object{"args": os.Args[1:], "betas": os.Getenv("ANTHROPIC_BETAS"), "extra": os.Getenv("CLAUDE_CODE_EXTRA_BODY"), "effort_env": os.Getenv("CLAUDE_CODE_EFFORT_LEVEL"), "streaming": os.Getenv("CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING"), "cache_ttl": os.Getenv("CLAUDE_CODE_PROMPT_CACHE_TTL"), "thinking_budget": os.Getenv("MAX_THINKING_TOKENS"), "structured_retries": os.Getenv("MAX_STRUCTURED_OUTPUT_RETRIES"), "deferral": os.Getenv("CCGATEWAY_TOOL_DEFERRAL_FILE")})
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
	// A native session waits for authenticated ready before submitting user.
	// A peer that reads user first deadlocks against that admission gate.
	request, err := http.NewRequest("POST", os.Getenv("CCGATEWAY_MOD_URL"), bytes.NewBufferString(`{"event":"ready","version":"ccgateway-v3"}`))
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+os.Getenv("CCGATEWAY_MOD_TOKEN"))
	ack, err := http.DefaultClient.Do(request)
	if err != nil {
		return err
	}
	ack.Body.Close()
	if ack.StatusCode != 200 {
		return fmt.Errorf("Mod callback failed")
	}
	if err := dec.Decode(&user); err != nil {
		return err
	}
	if str(user, "type") != "user" {
		return fmt.Errorf("expected user after native ready acknowledgement")
	}
	if os.Getenv("CCG_TEST_CLI_TAIL") == "refusal" {
		for _, event := range []Object{
			{"type": "message_start", "message": Object{"id": "msg_refusal", "role": "assistant", "content": []any{}, "usage": Object{"input_tokens": 2, "output_tokens": 0}}},
			{"type": "message_delta", "delta": Object{"stop_reason": "refusal", "stop_details": Object{"type": "refusal", "category": "cyber", "explanation": "fixture refusal"}}, "usage": Object{"output_tokens": 0}},
			{"type": "message_stop"},
		} {
			if err := enc.Encode(Object{"type": "stream_event", "event": event}); err != nil {
				return err
			}
		}
		// No transcript/result: a valid refusal must not depend on either.
		time.Sleep(30 * time.Second)
		return nil
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
