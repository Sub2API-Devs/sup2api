// Command sub2api-plugin is the developer tool for sub2api-next plugins:
// key generation, cross-compilation, packaging, signing, verification and
// market index generation.
package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"strings"
)

const usage = `sub2api-plugin - sub2api-next plugin developer tool

Usage:
  sub2api-plugin keygen --key-id <id> --out <dir>
  sub2api-plugin build  --dir <plugin dir> [--out <dir>] [--dev] [--tags a,b] [--overlay <dir>] [--platforms linux/amd64,...]
  sub2api-plugin pack   --dir <plugin dir> (--out <file.s2plugin> | --out-dir <dir>) [--runtimes <dir>] [--overlay <dir>] [--allow-missing-ui]
  sub2api-plugin sign   --key <private key file> --key-id <id> [--publisher <name>] <file.s2plugin>
  sub2api-plugin verify --pub <public key file|base64> <file.s2plugin>
  sub2api-plugin index  --dir <market dir> --key <private key file> [--base-url <url>]
  sub2api-plugin manifest --dir <plugin dir> [--overlay <dir>]   (print the effective manifest)

Run "sub2api-plugin <command> -h" for the flags of one command.
`

func main() {
	os.Exit(run(os.Args[1:], os.Stdout, os.Stderr))
}

func run(args []string, stdout, stderr io.Writer) int {
	if len(args) == 0 || args[0] == "-h" || args[0] == "--help" || args[0] == "help" {
		fmt.Fprint(stdout, usage)
		return 0
	}
	cmds := map[string]func([]string, io.Writer, io.Writer) error{
		"keygen":   cmdKeygen,
		"build":    cmdBuild,
		"pack":     cmdPack,
		"sign":     cmdSign,
		"verify":   cmdVerify,
		"index":    cmdIndex,
		"manifest": cmdManifest,
	}
	fn, ok := cmds[args[0]]
	if !ok {
		fmt.Fprintf(stderr, "unknown command %q\n\n%s", args[0], usage)
		return 2
	}
	if err := fn(args[1:], stdout, stderr); err != nil {
		if err == flag.ErrHelp {
			return 0
		}
		fmt.Fprintf(stderr, "sub2api-plugin %s: %v\n", args[0], err)
		return 1
	}
	return 0
}

// parseInterspersed parses flags that may appear before or after positional
// arguments and returns the positionals.
func parseInterspersed(fs *flag.FlagSet, args []string) ([]string, error) {
	var pos []string
	for {
		if err := fs.Parse(args); err != nil {
			return nil, err
		}
		if fs.NArg() == 0 {
			return pos, nil
		}
		pos = append(pos, fs.Arg(0))
		args = fs.Args()[1:]
	}
}

func newFlagSet(name string, stderr io.Writer) *flag.FlagSet {
	fs := flag.NewFlagSet(name, flag.ContinueOnError)
	fs.SetOutput(stderr)
	return fs
}

func splitList(s string) []string {
	var out []string
	for _, p := range strings.Split(s, ",") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
