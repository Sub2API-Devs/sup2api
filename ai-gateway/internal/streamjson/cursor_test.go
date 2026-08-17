package streamjson

import (
	"bytes"
	"strings"
	"testing"
)

func TestCursorCopiesValueWithoutConsumingArrayDelimiter(t *testing.T) {
	cursor := NewCursor(strings.NewReader(`[{"data":"` + strings.Repeat("A", 1<<20) + `"},2]`))
	if err := cursor.Expect('['); err != nil {
		t.Fatal(err)
	}
	var first bytes.Buffer
	if err := cursor.CopyValue(&first); err != nil {
		t.Fatal(err)
	}
	more, err := cursor.Delimiter(']')
	if err != nil || !more {
		t.Fatalf("delimiter more=%v err=%v", more, err)
	}
	var second bytes.Buffer
	if err := cursor.CopyValue(&second); err != nil {
		t.Fatal(err)
	}
	more, err = cursor.Delimiter(']')
	if err != nil || more || second.String() != "2" {
		t.Fatalf("second=%q more=%v err=%v", second.String(), more, err)
	}
}

func TestCursorReadStringPrefixSkipsLargeString(t *testing.T) {
	wantPrefix := "the first user message"
	cursor := NewCursor(strings.NewReader(`"` + wantPrefix + strings.Repeat("x", 1<<20) + `"`))
	got, err := cursor.ReadStringPrefix(256)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(got, wantPrefix) {
		t.Fatalf("prefix = %q", got)
	}
}
