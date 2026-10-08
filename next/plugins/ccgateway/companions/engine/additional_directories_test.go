package engine

import (
	"encoding/json"
	"testing"
)

func TestParseAdditionalDirectories(t *testing.T) {
	tests := []struct {
		name    string
		input   any
		want    []string
		wantErr bool
	}{
		{
			name:  "valid single directory",
			input: []any{"/home/user/project"},
			want:  []string{"/home/user/project"},
		},
		{
			name:  "valid multiple directories",
			input: []any{"/home/user/project1", "/home/user/project2"},
			want:  []string{"/home/user/project1", "/home/user/project2"},
		},
		{
			name:  "empty array",
			input: []any{},
			want:  []string{},
		},
		{
			name:    "not an array",
			input:   "not an array",
			wantErr: true,
		},
		{
			name:    "empty string",
			input:   []any{""},
			wantErr: true,
		},
		{
			name:    "duplicate directory",
			input:   []any{"/home/user/project", "/home/user/project"},
			wantErr: true,
		},
		{
			name:    "non-string element",
			input:   []any{123},
			wantErr: true,
		},
		{
			name:    "too many directories",
			input:   make([]any, 101),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseAdditionalDirectories(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("parseAdditionalDirectories() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if len(got) != len(tt.want) {
					t.Errorf("parseAdditionalDirectories() got %d dirs, want %d", len(got), len(tt.want))
					return
				}
				for i := range got {
					if got[i] != tt.want[i] {
						t.Errorf("parseAdditionalDirectories()[%d] = %v, want %v", i, got[i], tt.want[i])
					}
				}
			}
		})
	}
}

func TestRequestWithAdditionalDirectories(t *testing.T) {
	reqJSON := `{
		"model": "claude-opus-5-5",
		"max_tokens": 1024,
		"messages": [{"role": "user", "content": "test"}],
		"additional_directories": ["/path/to/dir1", "/path/to/dir2"]
	}`

	req, err := parseRequest([]byte(reqJSON))
	if err != nil {
		t.Fatalf("parseRequest() error = %v", err)
	}

	if len(req.AdditionalDirectories) != 2 {
		t.Errorf("got %d additional directories, want 2", len(req.AdditionalDirectories))
	}

	expected := []string{"/path/to/dir1", "/path/to/dir2"}
	for i, dir := range req.AdditionalDirectories {
		if dir != expected[i] {
			t.Errorf("AdditionalDirectories[%d] = %q, want %q", i, dir, expected[i])
		}
	}
}

func TestCLIArgsWithAdditionalDirectories(t *testing.T) {
	reqJSON := `{
		"model": "claude-opus-5-5",
		"max_tokens": 1024,
		"messages": [{"role": "user", "content": "test"}],
		"additional_directories": ["/path/to/dir1", "/path/to/dir2"]
	}`

	req, err := parseRequest([]byte(reqJSON))
	if err != nil {
		t.Fatalf("parseRequest() error = %v", err)
	}

	p := &Prepared{SessionID: "test-session"}
	args := cliArgs(req, p, "/plugin/dir")

	// 查找 --add-dir 参数
	foundDirs := []string{}
	for i := 0; i < len(args)-1; i++ {
		if args[i] == "--add-dir" {
			foundDirs = append(foundDirs, args[i+1])
		}
	}

	if len(foundDirs) != 2 {
		t.Errorf("found %d --add-dir args, want 2", len(foundDirs))
	}

	expected := []string{"/path/to/dir1", "/path/to/dir2"}
	for i, dir := range foundDirs {
		if dir != expected[i] {
			t.Errorf("--add-dir[%d] = %q, want %q", i, dir, expected[i])
		}
	}
}

func TestModConfigWithAdditionalDirectories(t *testing.T) {
	reqJSON := `{
		"model": "claude-opus-5-5",
		"max_tokens": 1024,
		"messages": [{"role": "user", "content": "test"}],
		"additional_directories": ["/path/to/dir1"]
	}`

	req, err := parseRequest([]byte(reqJSON))
	if err != nil {
		t.Fatalf("parseRequest() error = %v", err)
	}

	p := &Prepared{SessionID: "test-session"}
	cfg := newRunConfig(req, p, "/plugin/dir", "/work/dir")

	control, err := startModControl(cfg, "")
	if err != nil {
		t.Fatalf("startModControl() error = %v", err)
	}
	defer control.Close()

	var config Object
	if err := json.Unmarshal(control.config, &config); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}

	dirs, ok := config["additional_directories"].([]interface{})
	if !ok {
		t.Fatalf("additional_directories not found in config or wrong type")
	}

	if len(dirs) != 1 {
		t.Errorf("got %d additional directories in config, want 1", len(dirs))
	}

	if dirs[0] != "/path/to/dir1" {
		t.Errorf("additional_directories[0] = %q, want %q", dirs[0], "/path/to/dir1")
	}
}
