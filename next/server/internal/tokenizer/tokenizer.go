// Package tokenizer provides bounded, offline BPE token counting. Counts are
// estimates of input text, not authoritative provider usage or video units.
package tokenizer

import (
	"context"
	"fmt"
	"sync"
	"unicode/utf8"

	bpe "github.com/tiktoken-go/tokenizer"
)

// MaxTextBytes is the gateway's request body limit: the prompt text of any
// request it accepts can be counted. Counting is linear in the text (the
// library's merge is no longer quadratic in a long run, v0.10.0).
const MaxTextBytes = 32 << 20

// codecs holds one codec per encoding; Count only reads it, so concurrent
// requests count in parallel.
var codecs sync.Map

func Count(ctx context.Context, text, encoding string) (int64, string, error) {
	if encoding == "" {
		encoding = "o200k_base"
	}
	if encoding != "o200k_base" && encoding != "cl100k_base" {
		return 0, encoding, fmt.Errorf("unsupported encoding %q", encoding)
	}
	if len(text) > MaxTextBytes || !utf8.ValidString(text) {
		return 0, encoding, fmt.Errorf("text must be valid UTF-8 and at most %d bytes", MaxTextBytes)
	}
	if err := ctx.Err(); err != nil {
		return 0, encoding, err
	}
	v, ok := codecs.Load(encoding)
	if !ok {
		codec, err := bpe.Get(bpe.Encoding(encoding))
		if err != nil {
			return 0, encoding, err
		}
		v, _ = codecs.LoadOrStore(encoding, codec)
	}
	n, err := v.(bpe.Codec).Count(text)
	return int64(n), encoding, err
}
