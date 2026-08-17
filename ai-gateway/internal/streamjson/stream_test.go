package streamjson

import (
	"bufio"
	"bytes"
	"strings"
	"testing"
)

func TestCopyValuePreservesLargeNestedValue(t *testing.T) {
	payload := `[{"type":"image","source":{"data":"` + strings.Repeat("A", 2<<20) + `"}},{"n":1.2300}]`
	input := bufio.NewReader(strings.NewReader(payload + `}`))
	var output bytes.Buffer
	delimiter, err := CopyValue(input, &output)
	if err != nil {
		t.Fatalf("CopyValue: %v", err)
	}
	if delimiter != '}' || output.String() != payload {
		t.Fatalf("delimiter=%q output length=%d want=%d", delimiter, output.Len(), len(payload))
	}
}

func TestCopyValueRejectsMismatchedDelimiter(t *testing.T) {
	input := bufio.NewReader(strings.NewReader(`[{"x":1}}}`))
	if _, err := CopyValue(input, &bytes.Buffer{}); err == nil {
		t.Fatal("expected mismatched delimiter error")
	}
}
