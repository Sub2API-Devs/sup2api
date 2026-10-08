package convert

import (
	"errors"
	"testing"
)

type reviewPrepared struct {
	stub
	bound Converter
	err   error
}

func (c reviewPrepared) Prepare([]byte) (Converter, []byte, error) {
	return c.bound, []byte("converted"), c.err
}

func TestPreparedReviewFailureAndPairBoundaries(t *testing.T) {
	original := stub{"openai.chat", "anthropic.messages"}
	rejection := errors.New("unsupported input field")
	for _, tc := range []struct {
		name  string
		bound Converter
		err   error
	}{
		{"nil plan", nil, nil},
		{"changed client", stub{"other", original.to}, nil},
		{"changed upstream", stub{original.from, "other"}, nil},
		{"prepare error", original, rejection},
	} {
		t.Run(tc.name, func(t *testing.T) {
			input := reviewPrepared{stub: original, bound: tc.bound, err: tc.err}
			got, body, err := Prepare(input, []byte("client"))
			if err == nil || body != nil {
				t.Fatal("failed plan leaked a request body")
			}
			if got.From() != original.from || got.To() != original.to {
				t.Fatal("failed plan changed protocol route")
			}
			if tc.err != nil && !errors.Is(err, rejection) {
				t.Fatal("prepare error identity was lost")
			}
		})
	}
	got, body, err := Prepare(original, []byte("client"))
	if err != nil || string(body) != "client" || got != original {
		t.Fatal("stateless converter compatibility broken")
	}
}
