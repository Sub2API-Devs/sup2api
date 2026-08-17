package antigravityprotocol

import (
	"bytes"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestPureProtocolCopyMatchesBackendSource(t *testing.T) {
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("locate protocol source")
	}
	localDir := filepath.Dir(currentFile)
	backendDir := filepath.Clean(filepath.Join(localDir, "..", "..", "..", "backend", "internal", "pkg", "antigravity"))
	if _, err := os.Stat(backendDir); os.IsNotExist(err) {
		t.Skip("standalone ai-gateway checkout has no backend source to compare")
	}
	for _, name := range []string{
		"request_transformer.go", "response_transformer.go", "stream_transformer.go",
		"claude_types.go", "gemini_types.go", "schema_cleaner.go",
	} {
		t.Run(name, func(t *testing.T) {
			backendSource, err := os.ReadFile(filepath.Join(backendDir, name))
			if err != nil {
				t.Fatal(err)
			}
			localSource, err := os.ReadFile(filepath.Join(localDir, name))
			if err != nil {
				t.Fatal(err)
			}
			localSource = bytes.Replace(localSource, []byte("package antigravityprotocol"), []byte("package antigravity"), 1)
			if !bytes.Equal(localSource, backendSource) {
				t.Fatalf("data-plane protocol copy drifted from backend source; synchronize %s", name)
			}
		})
	}
}
