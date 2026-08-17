package anthropicoauth

import (
	"bytes"
	"io"
	"strings"
	"testing"
)

type oneByteReader struct{ value string }

func (r *oneByteReader) Read(p []byte) (int, error) {
	if r.value == "" {
		return 0, io.EOF
	}
	p[0] = r.value[0]
	r.value = r.value[1:]
	return 1, nil
}

func TestRestoreStreamHandlesAliasesSplitAcrossEveryChunk(t *testing.T) {
	input := `data: {"name":"cc_sess_fetch_00"}\n\n`
	var output bytes.Buffer
	err := restoreStream(&output, &oneByteReader{value: input}, [][2]string{{"cc_sess_fetch_00", "sessions_fetch"}, {"cc_sess_", "sessions_"}})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(output.String(), `"name":"sessions_fetch"`) {
		t.Fatalf("restored output = %q", output.String())
	}
}
