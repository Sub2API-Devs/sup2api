package engine

import (
	"crypto/rand"
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestCreditExpiredOrCorruptSnapshotCannotBeReissued(t *testing.T) {
	for _, corrupt := range []bool{false, true} {
		registry, err := newCreditRegistry(t.TempDir(), "fixture-key", 1<<20)
		if err != nil {
			t.Fatal(err)
		}
		hash, _ := credits.TokenHash("test-token")
		expired := creditSnapshot{Hash: hash, ClientDigests: []string{"digest"}, WirePrompt: json.RawMessage(`{"messages":[]}`), ExpiresAt: time.Now().Add(-time.Second)}
		raw, _ := json.Marshal(expired)
		nonce := make([]byte, registry.cipher.NonceSize())
		rand.Read(nonce)
		encrypted := registry.cipher.Seal(nonce, nonce, raw, []byte(hash))
		if corrupt {
			encrypted[len(encrypted)-1] ^= 1
		}
		path := filepath.Join(registry.dir, hash+".credit")
		if err := os.WriteFile(path, encrypted, 0600); err != nil {
			t.Fatal(err)
		}
		expired.ExpiresAt = time.Now().Add(time.Minute)
		if err := registry.Save(expired); err == nil {
			t.Fatal("expired or corrupt token reissued")
		}
		current, _ := os.ReadFile(path)
		if string(current) != string(encrypted) {
			t.Fatal("existing custody overwritten")
		}
	}
}
func TestCreditStopDetailsRestoreOnlyKnownOmission(t *testing.T) {
	original := Object{"type": "refusal", "explanation": "original", "fallback_credit_token": "secret"}
	for _, tc := range []struct {
		name   string
		target Object
		ok     bool
	}{
		{"omission", Object{"type": "refusal", "explanation": "original"}, true},
		{"exact", original, true},
		{"reason changed", Object{"type": "refusal", "explanation": "changed"}, false},
		{"token changed", Object{"type": "refusal", "explanation": "original", "fallback_credit_token": "other"}, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			raw, _ := json.Marshal(tc.target)
			target := Object{"stop_details": json.RawMessage(raw)}
			err := restoreCreditDetails(target, original)
			if (err == nil) != tc.ok {
				t.Fatal("unexpected restore", err)
			}
		})
	}
	state := &creditExecution{messageID: "original", stopReason: "refusal", stopDetails: original}
	if state.restoreStopDetails(Object{"id": "other", "stop_reason": "refusal", "stop_details": original}) == nil {
		t.Fatal("cross-message credential restored")
	}
}
func TestCreditDiagnosticsNeverPersistToken(t *testing.T) {
	d := &requestDiagnostic{directory: t.TempDir(), fields: Object{}}
	d.prepareSecrets([]byte(`{"model":"fixture"}`), "fallback-credit-2026-07-01")
	d.appendTrace("before-token.raw", []byte("SECRET_CREDIT_SENTINEL"))
	d.prepareSecrets([]byte(`{"stop_details":{"fallback_credit_token":"SECRET_CREDIT_SENTINEL"}}`))
	d.save("event.json", []byte(`{"stop_details":{"fallback_credit_token":"SECRET_CREDIT_SENTINEL"},"message":"echo SECRET_CREDIT_SENTINEL"}`))
	entries, _ := os.ReadDir(d.directory)
	for _, entry := range entries {
		raw, _ := os.ReadFile(filepath.Join(d.directory, entry.Name()))
		if strings.Contains(string(raw), "SECRET_CREDIT_SENTINEL") {
			t.Fatal("token persisted", entry.Name())
		}
	}
}

func TestCreditEmptyRefusalStoresOnlyBaseClaim(t *testing.T) {
	registry, err := newCreditRegistry(t.TempDir(), "key", 1<<20)
	if err != nil {
		t.Fatal(err)
	}
	raw := []byte(`{"model":"source","messages":[{"role":"user","content":"fixture"}]}`)
	wire, _ := credits.Prompt(raw)
	state := &creditExecution{registry: registry, raw: raw, wire: wire, headers: []string{"fallback-credit-2026-07-01"}}
	recorder := httptest.NewRecorder()
	x := &exchange{w: recorder, req: &Request{credit: state}, resources: &resourceAdmission{}}
	answer := Object{"id": "empty", "model": "source", "content": []any{}, "stop_reason": "refusal", "stop_details": Object{"fallback_credit_token": "empty-token", "fallback_has_prefill_claim": false}}
	if err := x.completeCredit(answer); err != nil {
		t.Fatal(err)
	}
	hash, _ := credits.TokenHash("empty-token")
	stored, err := registry.Load(hash)
	if err != nil || len(stored.ClientDigests) != 1 || string(stored.WireContent) != "[]" || recorder.Header().Get(credits.ReadyHeader) != hash {
		t.Fatal("empty refusal custody failed", err)
	}
}
