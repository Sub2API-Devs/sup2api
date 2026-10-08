package engine

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync/atomic"
	"testing"
)

func TestRealCLIResourceIdentityUsesOneNativeProcess(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("POSIX executable wrapper; Linux release gate")
	}
	for _, oauth := range []bool{false, true} {
		t.Run(fmt.Sprint(oauth), func(t *testing.T) {
			var calls atomic.Int32
			runner := resourceTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				if !oauth || r.Method != "GET" || r.URL.Path != "/api/oauth/profile" {
					t.Error("unexpected provider call")
				}
				w.Header().Set("Content-Type", "application/json")
				fmt.Fprint(w, `{"account":{"uuid":"fixture-account"},"organization":{"uuid":"fixture-org"}}`)
			})
			dir := t.TempDir()
			counter := filepath.Join(dir, "calls")
			quote := func(s string) string { return "'" + strings.ReplaceAll(s, "'", "'\"'\"'") + "'" }
			script := "#!/bin/sh\nif [ \"$1\" = auth ]; then exit 89; fi\nprintf 'run\\n' >> " + quote(counter) + "\nexec " + quote(runner.CLI) + " \"$@\"\n"
			wrapper := filepath.Join(dir, "native-wrapper")
			if err := os.WriteFile(wrapper, []byte(script), 0700); err != nil {
				t.Fatal(err)
			}
			runner.CLI = wrapper
			runner.Env = envWith(runner.Env, map[string]string{"CCG_RESOURCE_ISSUER_ID": "fixture", "CCG_RESOURCE_ISSUER_GENERATION": "fixture-generation"})
			if oauth {
				runner.Env = envWith(runner.Env, map[string]string{"ANTHROPIC_API_KEY": "", "CLAUDE_CODE_OAUTH_TOKEN": "fixture-oauth"})
			}
			b, err := newResourceBroker(&Gateway{Runner: runner}, &authManager{}, t.TempDir())
			if err != nil {
				t.Fatal(err)
			}
			defer b.lease.Close()
			if _, err = b.identity(context.Background()); err != nil {
				t.Fatal(err)
			}
			raw, err := os.ReadFile(counter)
			if err != nil || string(raw) != "run\n" {
				t.Fatalf("expected exactly one native process: %q %v", raw, err)
			}
			want := int32(0)
			if oauth {
				want = 1
			}
			if calls.Load() != want {
				t.Fatalf("provider calls %d want %d", calls.Load(), want)
			}
		})
	}
}
