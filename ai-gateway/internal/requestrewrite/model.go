package requestrewrite

import (
	"encoding/json"
	"fmt"
	"io"
)

// ReplaceModel returns a streaming body that substitutes one already-located
// JSON string value. Bytes before and after the top-level model field are not
// buffered or re-encoded, which keeps large multimodal request bodies on the
// streaming path.
func ReplaceModel(body io.ReadCloser, start, end int64, mappedModel string) (io.ReadCloser, int64, error) {
	if body == nil || start < 0 || end <= start {
		return nil, 0, fmt.Errorf("invalid model replacement range")
	}
	replacement, err := json.Marshal(mappedModel)
	if err != nil {
		return nil, 0, err
	}
	return &reader{source: body, start: start, end: end, replacement: replacement}, int64(len(replacement)) - (end - start), nil
}

type reader struct {
	source      io.ReadCloser
	start       int64
	end         int64
	originalPos int64
	replacement []byte
	replacedPos int
	skipped     bool
}

func (r *reader) Read(p []byte) (int, error) {
	if len(p) == 0 {
		return 0, nil
	}
	if r.originalPos < r.start {
		limit := int64(len(p))
		if remaining := r.start - r.originalPos; remaining < limit {
			limit = remaining
		}
		n, err := r.source.Read(p[:limit])
		r.originalPos += int64(n)
		return n, err
	}
	if r.replacedPos < len(r.replacement) {
		n := copy(p, r.replacement[r.replacedPos:])
		r.replacedPos += n
		return n, nil
	}
	if !r.skipped {
		remaining := r.end - r.originalPos
		if remaining < 0 {
			return 0, fmt.Errorf("model replacement source position is invalid")
		}
		if remaining > 0 {
			n, err := io.CopyN(io.Discard, r.source, remaining)
			r.originalPos += n
			if err != nil {
				return 0, fmt.Errorf("skip original model value: %w", err)
			}
		}
		r.skipped = true
	}
	n, err := r.source.Read(p)
	r.originalPos += int64(n)
	return n, err
}

func (r *reader) Close() error { return r.source.Close() }
