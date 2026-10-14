package engine

import (
	"bytes"
	"os"
	"testing"
)

// A client compacts by sending ordinary summary/retained messages. Prefix
// matching must rebuild without the discarded history, then index that new
// context for the next turn under the same logical session.
func TestCompactedClientHistoryRebuildThenResume(t *testing.T) {
	for _, retainTail := range []bool{false, true} {
		name := "summary-only"
		if retainTail {
			name = "summary-and-retained-tail"
		}
		t.Run(name, func(t *testing.T) {
			f := newBranchFixture(t)
			branch := testBranch("compacted-client")
			r, p := f.prepare(branch, user("DISCARDED_QUESTION"))
			a1 := f.finish(branch, r, p, "DISCARDED_ANSWER")
			r, p = f.prepare(branch, user("DISCARDED_QUESTION"), a1, user("retained question"))
			a2 := f.finish(branch, r, p, "retained answer")
			messages := []any{user("compressed summary")}
			if retainTail {
				messages = append(messages, user("retained question"), a2)
			}
			messages = append(messages, user("next question"))
			r, p = f.prepare(branch, messages...)
			if p.Mode != "rebuild" || p.SessionID != branch.ID {
				t.Fatalf("compacted request: mode=%s session=%s", p.Mode, p.SessionID)
			}
			assertNoDiscarded := func(p *Prepared) {
				t.Helper()
				raw, err := os.ReadFile(p.Path)
				if err != nil {
					t.Fatal(err)
				}
				if bytes.Contains(raw, []byte("DISCARDED_")) {
					t.Fatal("discarded history leaked into the compacted private file")
				}
			}
			assertNoDiscarded(p)
			reply := f.finish(branch, r, p, "compacted answer")
			messages = append(messages, reply, user("continue compacted context"))
			_, resumed := f.prepare(branch, messages...)
			if resumed.Mode != "prefix-hit" || resumed.SessionID != branch.ID {
				t.Fatalf("next turn: mode=%s session=%s", resumed.Mode, resumed.SessionID)
			}
			assertNoDiscarded(resumed)
			if !bytes.Contains(nativeBytes(resumed.Rows), []byte("compressed summary")) {
				t.Fatal("compacted context was not resumed")
			}
			// Rebuilding a compacted root must not destroy the earlier branch.
			_, original := f.prepare(branch, user("DISCARDED_QUESTION"), a1, user("original branch"))
			if original.Mode != "fork" || !bytes.Contains(nativeBytes(original.Rows), []byte("DISCARDED_ANSWER")) {
				t.Fatal("original branch became unavailable after compaction")
			}
		})
	}
}
