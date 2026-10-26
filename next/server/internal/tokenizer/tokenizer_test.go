package tokenizer

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"
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

// A long run of one character class is one BPE piece; v0.8.0 merged it in
// quadratic time (80 KB took seconds and held a node-wide lock). The count is
// unchanged, only the time.
func TestCountLongRunsInLinearTime(t *testing.T) {
	for _, c := range []struct {
		text   string
		tokens int64
	}{
		{strings.Repeat("s", 80000), 20000},
		{strings.Repeat("=", 80000), 1250},
		{strings.Repeat(" ", 80000) + "x", 627},
		{strings.Repeat("我们得请求首都很高你能分析下延迟来自哪里吗", 1000), 16000},
	} {
		start := time.Now()
		n, _, err := Count(context.Background(), c.text, "")
		if err != nil || n != c.tokens {
			t.Fatalf("%q...: %d tokens, %v; want %d", c.text[:3], n, err, c.tokens)
		}
		if d := time.Since(start); d > 500*time.Millisecond {
			t.Fatalf("%q...: %v", c.text[:3], d)
		}
	}
}

func TestCountConcurrently(t *testing.T) {
	text := strings.Repeat("hello world, 你好 ", 2000)
	want, _, _ := Count(context.Background(), text, "")
	var wg sync.WaitGroup
	for range 16 {
		wg.Go(func() {
			if n, _, err := Count(context.Background(), text, ""); err != nil || n != want {
				t.Errorf("%d %v, want %d", n, err, want)
			}
		})
	}
	wg.Wait()
}
