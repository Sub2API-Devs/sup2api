package protocol

import (
	"bytes"
	"encoding/json"
	"errors"
	"regexp"
	"strings"
	"unicode/utf8"
)

const (
	MaxTaskSnapshotBytes = 256 << 10
	MaxTaskIDPaths       = 8
)

var taskIDPath = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_-]*(\.[A-Za-z_][A-Za-z0-9_-]*)*$`)

func ValidTaskIDPath(path string) bool { return len(path) <= 200 && taskIDPath.MatchString(path) }

// RewriteTaskID validates a bounded JSON object and replaces only declared,
// matching task identifiers. It preserves numeric precision. The host calls
// this for both the submission response and every shared query snapshot.
func RewriteTaskID(body []byte, paths []string, upstreamID, publicID string) ([]byte, error) {
	if len(body) == 0 || len(body) > MaxTaskSnapshotBytes || !utf8.Valid(body) || !json.Valid(body) {
		return nil, errors.New("task response must be a valid JSON object within 256 KiB")
	}
	if upstreamID == "" || publicID == "" || len(paths) == 0 || len(paths) > MaxTaskIDPaths {
		return nil, errors.New("task identifiers and declared ID paths are required")
	}
	var obj map[string]any
	d := json.NewDecoder(bytes.NewReader(body))
	d.UseNumber()
	if err := d.Decode(&obj); err != nil || obj == nil {
		return nil, errors.New("task response must be a JSON object")
	}
	matched := false
	for _, path := range paths {
		if !ValidTaskIDPath(path) {
			return nil, errors.New("invalid task ID path")
		}
		parts := strings.Split(path, ".")
		parent := obj
		for _, part := range parts[:len(parts)-1] {
			parent, _ = parent[part].(map[string]any)
			if parent == nil {
				break
			}
		}
		if parent == nil {
			continue
		}
		key := parts[len(parts)-1]
		value, present := parent[key]
		if !present {
			continue
		}
		if value != upstreamID {
			return nil, errors.New("task response identifier does not match upstream reference")
		}
		parent[key] = publicID
		matched = true
	}
	if !matched {
		return nil, errors.New("task response has no declared matching identifier")
	}
	out, err := json.Marshal(obj)
	if err == nil && len(out) > MaxTaskSnapshotBytes {
		err = errors.New("rewritten task response exceeds 256 KiB")
	}
	return out, err
}
