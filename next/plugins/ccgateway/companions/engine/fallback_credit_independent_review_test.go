package engine

import (
	"context"
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestCreditReviewRuntimeRestartPreservesBoundedStore(t *testing.T) {
	root := t.TempDir()
	makeBroker := func() *resourceBroker {
		b, e := newResourceBroker(&Gateway{Runner: &Runner{}}, &authManager{}, root)
		if e != nil {
			t.Fatal(e)
		}
		t.Cleanup(func() { b.lease.Close() })
		return b
	}
	first := makeBroker()
	registry, e := newCreditRegistry(first.creditDir, "key", 4096)
	if e != nil {
		t.Fatal(e)
	}
	hash, _ := credits.TokenHash("restart-credit")
	snap := creditSnapshot{Hash: hash, ClientDigests: []string{"digest"}, WirePrompt: json.RawMessage(`{"messages":[],"mcp_servers":[{"authorization_token":"MCP_SECRET"}]}`), ExpiresAt: time.Now().Add(time.Minute)}
	if e = registry.Save(snap); e != nil {
		t.Fatal(e)
	}
	first.lease.Close()
	second := makeBroker()
	if second.dir == first.dir || second.creditDir != first.creditDir {
		t.Fatal("credit lifetime follows temporary resource spool")
	}
	reopened, e := newCreditRegistry(second.creditDir, "key", 4096)
	if e != nil {
		t.Fatal(e)
	}
	got, e := reopened.Load(hash)
	if e != nil || digest(got) != digest(snap) {
		t.Fatal("restart changed custody", e)
	}
	if _, e = os.Stat(first.dir); !os.IsNotExist(e) {
		t.Fatal("credit files prevented obsolete spool cleanup")
	}
}
func TestCreditReviewCrossRegistryQuotaAndOrphanWrites(t *testing.T) {
	dir := t.TempDir()
	a, e := newCreditRegistry(dir, "key", 1200)
	if e != nil {
		t.Fatal(e)
	}
	b, _ := newCreditRegistry(dir, "key", 1200)
	orphan := filepath.Join(dir, ".credit-write-crashed")
	if e = os.WriteFile(orphan, make([]byte, 5000), 0600); e != nil {
		t.Fatal(e)
	}
	var wg sync.WaitGroup
	start := make(chan struct{})
	for i, r := range []*creditRegistry{a, b} {
		wg.Add(1)
		go func(i int, r *creditRegistry) {
			defer wg.Done()
			<-start
			hash, _ := credits.TokenHash(string(rune('a' + i)))
			_ = r.Save(creditSnapshot{Hash: hash, ClientDigests: []string{"digest"}, WirePrompt: json.RawMessage(`{"messages":[],"padding":"` + strings.Repeat("x", 400) + `"}`), ExpiresAt: time.Now().Add(time.Minute)})
		}(i, r)
	}
	close(start)
	wg.Wait()
	if _, e = os.Stat(orphan); !os.IsNotExist(e) {
		t.Fatal("orphan snapshot write retained")
	}
	var size int64
	entries, _ := os.ReadDir(dir)
	for _, entry := range entries {
		if filepath.Ext(entry.Name()) == ".credit" {
			info, _ := entry.Info()
			size += info.Size()
		}
	}
	if size == 0 || size > 1200 {
		t.Fatalf("shared directory quota exceeded: %d", size)
	}
}

func TestCreditReviewPendingRefusalRequiresObserverProof(t *testing.T) {
	details := Object{"type": "refusal", "explanation": "fixture", "fallback_credit_token": "token"}
	message := Object{"id": "response", "stop_reason": "refusal", "stop_details": details}
	req := &Request{}
	if req.verifiedCreditRefusal(message) {
		t.Fatal("ordinary refusal treated as verified credit")
	}
	req.credit = &creditExecution{messageID: "other", stopReason: "refusal", stopDetails: details}
	if req.verifiedCreditRefusal(message) {
		t.Fatal("another main response credential used")
	}
	req.credit.messageID = "response"
	if !req.verifiedCreditRefusal(message) {
		t.Fatal("attributed same-response credit rejected")
	}
	ledger := newServerToolLedger()
	ledger.pending["older"] = "code_execution_tool_result"
	ledger.pending["current"] = "code_execution_tool_result"
	ledger.turnCalls["current"] = true
	if ledger.complete("refusal", true) == nil {
		t.Fatal("ordinary pending refusal globally relaxed")
	}
	ledger.abandonCurrentTurn()
	if ledger.pending["current"] != "" || ledger.pending["older"] == "" {
		t.Fatal("credit interruption changed older obligations")
	}
	req.creditPTCDeferred = true
	req.credit = nil
	if req.finalizeCreditPTCAdmission() == nil {
		t.Fatal("candidate token authorized without custody")
	}
}

func TestCreditReviewIssuerProbeObeysSlotAndCancellation(t *testing.T) {
	slots := make(chan struct{}, 1)
	slots <- struct{}{}
	g := &Gateway{Runner: &Runner{CLI: "must-not-execute"}, Slots: slots}
	authority := &authManager{}
	g.resources = &resourceBroker{g: g, authority: authority}
	entered := make(chan string, 1)
	base := context.WithValue(context.Background(), resourceWaitObserverKey{}, func(phase string) { entered <- phase })
	ctx, cancel := context.WithCancel(base)
	defer cancel()
	req := httptest.NewRequest("POST", "/v1/messages", nil).WithContext(ctx)
	req.Header.Set(credits.TrackingHeader, "1")
	req.Header.Set("Anthropic-Beta", "fallback-credit-2026-07-01")
	x := &exchange{g: g, r: req, w: httptest.NewRecorder(), req: &Request{ToolSearch: "false"}}
	done := make(chan error, 1)
	go func() {
		done <- x.admitCredit([]byte(`{"model":"fixture","messages":[{"role":"user","content":"question"}]}`))
	}()
	select {
	case phase := <-entered:
		if phase != "slot" {
			t.Fatal(phase)
		}
	case err := <-done:
		t.Fatal("issuer probe bypassed saturated slot", err)
	case <-time.After(time.Second):
		t.Fatal("no deterministic wait barrier")
	}
	cancel()
	if err := <-done; err != context.Canceled {
		t.Fatal("cancellation not preserved", err)
	}
	if len(slots) != 1 || !authority.mu.TryLock() {
		t.Fatal("slot or authority leaked")
	}
	authority.mu.Unlock()
}
