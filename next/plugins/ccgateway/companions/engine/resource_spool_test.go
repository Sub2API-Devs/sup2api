package engine

import (
	"context"
	"io"
	"os"
	"strings"
	"testing"
)

func TestResourceSpoolLimitsAndCleanup(t *testing.T) {
	dir := t.TempDir()
	budget := &resourceSpoolBudget{limit: 8}
	spool, err := spoolResource(context.Background(), dir, io.NopCloser(strings.NewReader("12345")), 5, 8, budget)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := spoolResource(context.Background(), dir, io.NopCloser(strings.NewReader("abcd")), 4, 8, budget); err == nil {
		t.Fatal("shared quota exceeded")
	}
	if budget.used != 5 {
		t.Fatal("failed request leaked quota")
	}
	data, _ := io.ReadAll(spool)
	if string(data) != "12345" {
		t.Fatal("spooled bytes changed")
	}
	if err := spool.Close(); err != nil {
		t.Fatal(err)
	}
	spool.Close()
	if budget.used != 0 {
		t.Fatal("quota released incorrectly")
	}
	for _, tc := range []struct {
		data            string
		declared, limit int64
	}{{"12345", 5, 4}, {"12345", -1, 4}, {"12", 3, 4}} {
		if _, err := spoolResource(context.Background(), dir, io.NopCloser(strings.NewReader(tc.data)), tc.declared, tc.limit, budget); err == nil {
			t.Fatal("length boundary accepted")
		}
	}
	entries, _ := os.ReadDir(dir)
	if len(entries) != 0 || budget.used != 0 {
		t.Fatal("spool failed to clean up")
	}
}

func TestResourceSpoolCancellationClosesInput(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	reader, writer := io.Pipe()
	defer writer.Close()
	done := make(chan error, 1)
	budget := &resourceSpoolBudget{limit: 8}
	dir := t.TempDir()
	go func() { _, err := spoolResource(ctx, dir, reader, -1, 8, budget); done <- err }()
	cancel()
	if err := <-done; err == nil {
		t.Fatal("cancellation ignored")
	}
	entries, _ := os.ReadDir(dir)
	if len(entries) != 0 || budget.used != 0 {
		t.Fatal("cancelled spool leaked storage")
	}
}
