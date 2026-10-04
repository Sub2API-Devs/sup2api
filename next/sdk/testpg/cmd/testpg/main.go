// Command testpg manages the local PostgreSQL that tests start on demand
// (package testpg): `testpg start` starts it ahead of time and prints its
// DSN, `testpg stop` stops it, `testpg status` reports whether it runs.
// The data directory is kept; delete testpg.Dir() to start from scratch.
package main

import (
	"context"
	"fmt"
	"os"

	"github.com/Sub2API-Devs/sup2api/next/sdk/testpg"
)

func main() {
	cmd := "status"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}
	dir, err := testpg.Dir()
	if err != nil {
		fail(err)
	}
	switch cmd {
	case "start":
		url, err := testpg.Ensure(context.Background())
		if err != nil {
			fail(err)
		}
		fmt.Println(url)
	case "stop":
		if err := testpg.Stop(); err != nil {
			fail(err)
		}
		fmt.Println("stopped")
	case "status":
		fmt.Println("dir:", dir)
		if b, err := os.ReadFile(dir + string(os.PathSeparator) + "port"); err == nil {
			fmt.Println("last port:", string(b))
		}
	default:
		fail(fmt.Errorf("usage: testpg start|stop|status"))
	}
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, "testpg:", err)
	os.Exit(1)
}
