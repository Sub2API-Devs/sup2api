package protocol

import (
	"bytes"
	"strings"
	"testing"
)

func TestRewriteTaskIDPreservesResponseFacts(t *testing.T) {
	in := []byte(`{"id":"upstream","data":{"id":"upstream"},"usage":9007199254740993,"state":"queued"}`)
	out, err := RewriteTaskID(in, []string{"id", "data.id", "result.id"}, "upstream", "s2task_public")
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(out, []byte("upstream")) || !bytes.Contains(out, []byte("9007199254740993")) || bytes.Count(out, []byte("s2task_public")) != 2 {
		t.Fatalf("IDs or numeric precision changed incorrectly: %s", out)
	}
	if !bytes.Contains(in, []byte("upstream")) {
		t.Fatal("mutated caller's input")
	}
}

func TestRewriteTaskIDRejectsAmbiguousOrUnsafeBodies(t *testing.T) {
	for _, body := range []string{
		`{"id":"other","data":{"id":"upstream"}}`,
		`{"id":123}`, `{"id":{"value":"upstream"}}`, `{"other":"upstream"}`,
		`null`, `[]`, `{"id":"upstream"} {}`, "{\"id\":\"upstream\",\"bad\":\"\xff\"}",
		`{"id":"upstream","padding":"` + strings.Repeat("a", MaxTaskSnapshotBytes) + `"}`,
	} {
		if _, err := RewriteTaskID([]byte(body), []string{"id", "data.id"}, "upstream", "public"); err == nil {
			t.Errorf("accepted unsafe body of %d bytes", len(body))
		}
	}
	for _, path := range []string{"", "id|@this", "items.0.id", "items.#.id", "data.*", "data..id"} {
		if ValidTaskIDPath(path) {
			t.Errorf("accepted unsafe path %q", path)
		}
	}
}

func TestRewriteTaskIDRejectsExpansionOverLimit(t *testing.T) {
	body := []byte(`{"id":"a","pad":"` + strings.Repeat("x", MaxTaskSnapshotBytes-19) + `"}`)
	if len(body) != MaxTaskSnapshotBytes {
		t.Fatalf("bad fixture length %d", len(body))
	}
	if _, err := RewriteTaskID(body, []string{"id"}, "a", "s2task_longer_id"); err == nil {
		t.Fatal("replacement silently exceeded the shared snapshot bound")
	}
}
