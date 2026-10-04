package tokenizer

import (
	"context"
	"strings"
	"testing"
)

func TestCount(t *testing.T) {
	for _, encoding := range []string{"", "o200k_base", "cl100k_base"} {
		n, used, err := Count(context.Background(), "hello", encoding)
		if err != nil || n != 1 || used == "" {
			t.Fatalf("%d %s %v", n, used, err)
		}
		n, _, err = Count(context.Background(), "你好，世界", encoding)
		if err != nil || n <= 0 {
			t.Fatalf("unicode %d %v", n, err)
		}
	}
	for _, text := range []string{strings.Repeat("a", MaxTextBytes+1), string([]byte{0xff})} {
		if _, _, err := Count(context.Background(), text, ""); err == nil {
			t.Fatal("accepted invalid text")
		}
	}
	if _, _, err := Count(context.Background(), "hello", "unknown"); err == nil {
		t.Fatal("accepted encoding")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, _, err := Count(ctx, "hello", ""); err == nil {
		t.Fatal("ignored cancellation")
	}
}
