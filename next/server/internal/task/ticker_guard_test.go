package task

import (
	"go/ast"
	"go/parser"
	"go/token"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

// tickerAllowed lists the files under internal/ that may create a ticker
// (time.NewTicker, time.Tick), with how many. Scheduled, independent work
// uses core.Tasks (TASK-FRAMEWORK-DESIGN.md §14, CONTRACTS §77); a ticker is
// only for what §14.3 keeps out of the framework. A new ticker fails this
// test: register a task instead, or add the file here with the reason.
var tickerAllowed = map[string]struct {
	n      int
	reason string
}{
	// Write buffers: the interval is a batching window, full batches write
	// early and shutdown flushes (§14.3 #1, #2, #10, #11, #29, #33, #34a, #39).
	"account/service.go":       {1, "last_used_at write buffer (#1)"},
	"account/quota.go":         {1, "passive quota sample buffer (#2)"},
	"account/stats.go":         {2, "account statistics buffer and its settings reload (#10)"},
	"apikey/apikey.go":         {1, "API key last-used buffer (#11)"},
	"gateway/gateway.go":       {1, "hook counters (#29)"},
	"observation/hub.go":       {1, "observation batches (#33)"},
	"plugin/egress/logs.go":    {2, "egress log buffer and its in-memory domain counters (#34a)"},
	"account/quota_refresh.go": {1, "claim watch inside one quota query (#22)"},
	// Consumers, requests and process control (§14.3 #15, #22-#24, #32a,
	// #35-#37).
	"notify/worker.go":              {1, "notification delivery consumer (#32a)"},
	"gateway/websocket.go":          {1, "drain watch of one WebSocket session (#22)"},
	"plugin/install/uninstall.go":   {1, "wait inside one uninstall request (#22)"},
	"cluster/registry.go":           {1, "node heartbeat (#23)"},
	"cluster/slots.go":              {2, "concurrency slot reclaim and renewal (#24)"},
	"plugin/rollout/controller.go":  {1, "plugin process reconciliation (#35)"},
	"plugin/rollout/coordinator.go": {2, "plugin rollout coordination and its lease (#36)"},
	"plugin/grpcruntime/instance.go": {2,
		"plugin process supervision and health (#37)"},
	"plugin/sandbox/watch_linux.go": {1, "plugin process resource sampling (#37)"},
	// The framework itself.
	"task/cluster.go": {1, "River admission watch"},
	"task/node.go":    {1, "node task state refresh"},
	"job/job.go":      {1, "plugin job registration resync (TASK-FRAMEWORK-DESIGN §11.3)"},
}

// tickersIn counts the time.NewTicker and time.Tick calls of the non-test Go
// files under root, by path relative to root.
func tickersIn(t *testing.T, root string) map[string]int {
	t.Helper()
	found := map[string]int{}
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return err
		}
		f, err := parser.ParseFile(token.NewFileSet(), path, nil, 0)
		if err != nil {
			return err
		}
		timePkg := ""
		for _, imp := range f.Imports {
			if imp.Path.Value == `"time"` {
				timePkg = "time"
				if imp.Name != nil {
					timePkg = imp.Name.Name
				}
			}
		}
		if timePkg == "" {
			return nil
		}
		rel, _ := filepath.Rel(root, path)
		ast.Inspect(f, func(n ast.Node) bool {
			sel, ok := n.(*ast.SelectorExpr)
			if !ok || (sel.Sel.Name != "NewTicker" && sel.Sel.Name != "Tick") {
				return true
			}
			if pkg, ok := sel.X.(*ast.Ident); ok && pkg.Name == timePkg {
				found[filepath.ToSlash(rel)]++
			}
			return true
		})
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	return found
}

func TestNoNewBusinessTickers(t *testing.T) {
	found := tickersIn(t, "..")
	if len(found) == 0 {
		t.Fatal("no ticker found: the scan did not read internal/")
	}
	var problems []string
	for file, n := range found {
		allowed, ok := tickerAllowed[file]
		switch {
		case !ok:
			problems = append(problems, file+": a new ticker; register a core.Tasks task instead (CONTRACTS §77)")
		case n > allowed.n:
			problems = append(problems, file+": more tickers than allowed ("+allowed.reason+")")
		}
	}
	for file, allowed := range tickerAllowed {
		if found[file] < allowed.n {
			problems = append(problems, file+": fewer tickers than listed; lower or drop its entry ("+allowed.reason+")")
		}
	}
	slices.Sort(problems)
	for _, p := range problems {
		t.Error(p)
	}
}

// The scan sees through an import alias and ignores test files and other
// packages' Tick.
func TestTickerScan(t *testing.T) {
	dir := t.TempDir()
	write := func(name, src string) {
		t.Helper()
		if err := os.WriteFile(filepath.Join(dir, name), []byte(src), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	write("a.go", "package a\nimport tm \"time\"\nfunc f() { _ = tm.NewTicker(1); _ = tm.Tick(1); _ = tm.NewTimer(1) }\n")
	write("b.go", "package a\ntype clock struct{}\nfunc (clock) Tick() {}\nfunc g(time clock) { time.Tick() }\n")
	write("c_test.go", "package a\nimport \"time\"\nfunc h() { _ = time.NewTicker(1) }\n")
	got := tickersIn(t, dir)
	if len(got) != 1 || got["a.go"] != 2 {
		t.Fatalf("scan: %v", got)
	}
}
