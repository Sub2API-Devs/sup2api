package main

import (
	"os"
	"testing"
)

// covers: EV (CCG_CONTROLLER_VERSION wins, then the linked version, then dev)
func TestVersion(t *testing.T) {
	old, had := os.LookupEnv("CCG_CONTROLLER_VERSION")
	defer func() {
		if had {
			os.Setenv("CCG_CONTROLLER_VERSION", old)
		} else {
			os.Unsetenv("CCG_CONTROLLER_VERSION")
		}
		buildVersion = ""
	}()
	os.Unsetenv("CCG_CONTROLLER_VERSION")
	if version() != "dev" {
		t.Fatal(version())
	}
	buildVersion = "abc"
	if version() != "abc" {
		t.Fatal(version())
	}
	os.Setenv("CCG_CONTROLLER_VERSION", "0.1.119")
	if version() != "0.1.119" {
		t.Fatal(version())
	}
}
