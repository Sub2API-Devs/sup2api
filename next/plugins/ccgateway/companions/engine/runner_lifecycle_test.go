package engine

import (
	"fmt"
	"os"
	"runtime"
	"strings"
	"testing"
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
	if log := os.Getenv("CCG_TEST_INFO_PEER"); log != "" {
		infoPeer(log)
		os.Exit(0)
	}
	os.Exit(m.Run())
}

// infoPeer answers the startup questions of a pinned 2.1.304 CLI and counts
// them in log, one line per run. With CCG_TEST_INFO_PEER_NO_INFO set it is a
// CLI that cannot say what it supports.
func infoPeer(log string) {
	f, _ := os.OpenFile(log, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	fmt.Fprintln(f, strings.Join(os.Args[1:], " "))
	f.Close()
	switch strings.Join(os.Args[1:], " ") {
	case "--version":
		fmt.Println("2.1.304 (Claude Code)")
	case "--ccgateway-info":
		if os.Getenv("CCG_TEST_INFO_PEER_NO_INFO") != "" {
			os.Exit(1)
		}
		fmt.Println(`{"version":"2.1.304","patch":"ccgateway-test","capabilities":["request_build","request_direct"]}`)
	}
}
