package procguard

import (
	"os"
	"testing"
)

func TestBlankValues(t *testing.T) {
	block := []byte("PATH=/bin\x00SECRET=hunter2\x00OTHER=x\x00SECRET_NOT=keep\x00")
	if !blankValues(block, map[string]bool{"SECRET": true}) {
		t.Fatal("nothing changed")
	}
	want := "PATH=/bin\x00SECRET=\x00\x00\x00\x00\x00\x00\x00\x00OTHER=x\x00SECRET_NOT=keep\x00"
	if string(block) != want {
		t.Fatalf("block %q", block)
	}
	if blankValues(block, map[string]bool{"SECRET": true}) {
		t.Fatal("second pass changed the block again")
	}
}

// After ScrubEnv the removed variables are gone from the process
// environment; other variables stay.
func TestScrubEnvRemovesVariables(t *testing.T) {
	t.Setenv("PROCGUARD_TEST_SECRET", "s3cret")
	t.Setenv("PROCGUARD_TEST_KEEP", "keep")
	if err := ScrubEnv([]string{"PROCGUARD_TEST_SECRET", " "}); err != nil {
		t.Fatal(err)
	}
	if _, ok := os.LookupEnv("PROCGUARD_TEST_SECRET"); ok {
		t.Fatal("secret still in the environment")
	}
	for _, kv := range os.Environ() {
		if kv == "PROCGUARD_TEST_SECRET=s3cret" {
			t.Fatal("secret still listed by os.Environ")
		}
	}
	if os.Getenv("PROCGUARD_TEST_KEEP") != "keep" {
		t.Fatal("unrelated variable removed")
	}
}
