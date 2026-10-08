package engine

import (
	"encoding/json"
	"testing"
)

// TestAdditionalDirectoriesIntegration verifies end-to-end handling of --add-dir parameter.
func TestAdditionalDirectoriesIntegration(t *testing.T) {
	body := `{
		"model": "claude-sonnet-4-20250514",
		"max_tokens": 1024,
		"messages": [{"role": "user", "content": "Read files"}],
		"additional_directories": ["/home/user/project", "/home/user/docs"]
	}`

	req, err := parseRequest([]byte(body))
	if err != nil {
		t.Fatalf("parseRequest failed: %v", err)
	}

	// Verify directories were parsed
	if len(req.AdditionalDirectories) != 2 {
		t.Fatalf("expected 2 additional directories, got %d", len(req.AdditionalDirectories))
	}
	if req.AdditionalDirectories[0] != "/home/user/project" {
		t.Errorf("first directory = %q, want /home/user/project", req.AdditionalDirectories[0])
	}
	if req.AdditionalDirectories[1] != "/home/user/docs" {
		t.Errorf("second directory = %q, want /home/user/docs", req.AdditionalDirectories[1])
	}

	// Verify CLI args are built correctly by checking runner config
	prepared := &Prepared{}
	args := cliArgs(req, prepared, "test-plugin")

	foundAddDir := false
	addDirCount := 0
	for i, arg := range args {
		if arg == "--add-dir" {
			foundAddDir = true
			addDirCount++
			if i+1 >= len(args) {
				t.Error("--add-dir flag without value")
				continue
			}
			dir := args[i+1]
			if dir != "/home/user/project" && dir != "/home/user/docs" {
				t.Errorf("unexpected directory value: %q", dir)
			}
		}
	}
	if !foundAddDir {
		t.Error("CLI args missing --add-dir flags")
	}
	if addDirCount != 2 {
		t.Errorf("expected 2 --add-dir flags, got %d", addDirCount)
	}

	// Verify JSON serialization round-trip
	jsonBytes, err := json.Marshal(req.AdditionalDirectories)
	if err != nil {
		t.Fatalf("failed to marshal directories: %v", err)
	}
	var decoded []string
	if err := json.Unmarshal(jsonBytes, &decoded); err != nil {
		t.Fatalf("failed to unmarshal directories: %v", err)
	}
	if len(decoded) != 2 {
		t.Errorf("round-trip produced %d directories, want 2", len(decoded))
	}
}

// TestAdditionalDirectoriesEmpty verifies handling when no directories are specified.
func TestAdditionalDirectoriesEmpty(t *testing.T) {
	body := `{
		"model": "claude-sonnet-4-20250514",
		"max_tokens": 1024,
		"messages": [{"role": "user", "content": "Hello"}]
	}`

	req, err := parseRequest([]byte(body))
	if err != nil {
		t.Fatalf("parseRequest failed: %v", err)
	}

	// Empty directories should not cause errors
	if req.AdditionalDirectories == nil {
		req.AdditionalDirectories = []string{}
	}

	// Verify CLI args don't include --add-dir
	prepared := &Prepared{}
	args := cliArgs(req, prepared, "test-plugin")

	for _, arg := range args {
		if arg == "--add-dir" {
			t.Error("found --add-dir in args when no directories specified")
		}
	}
}
