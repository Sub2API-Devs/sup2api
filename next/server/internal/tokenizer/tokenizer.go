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

const MaxTextBytes = 1 << 20

var codecs sync.Map

type counter struct {
	mu    sync.Mutex
	codec bpe.Codec
}

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
		v, _ = codecs.LoadOrStore(encoding, &counter{codec: codec})
	}
	c := v.(*counter)
	c.mu.Lock()
	defer c.mu.Unlock()
	if err := ctx.Err(); err != nil {
		return 0, encoding, err
	}
	n, err := c.codec.Count(text)
	return int64(n), encoding, err
}
