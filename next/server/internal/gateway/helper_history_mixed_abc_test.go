package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/helperhistory"
)

func TestHelperHistoryABCMixedPayloadRealDBCLI(t *testing.T) {
	runHelperHistoryABCRealDBCLI(t, false, abcHelperOptions{UpgradePayload: true})
}

func abcStoredChain(t *testing.T, store *helperhistory.Service, owner core.ResourceOwner, request map[string]any) core.HelperHistoryChain {
	t.Helper()
	raw, err := json.Marshal(request)
	if err != nil {
		t.Fatal(err)
	}
	_, prefixes, err := publicHelperPrefixes(raw)
	if err != nil {
		t.Fatal(err)
	}
	found, err := store.Lookup(context.Background(), owner, prefixes)
	if err != nil || found.State != core.HelperHistoryKnownReady {
		t.Fatalf("persisted chain lookup: %v state=%s", err, found.State)
	}
	return found.Chain
}

func abcPayloadVersion(t *testing.T, raw []byte) int {
	t.Helper()
	var p struct {
		Version int `json:"version"`
	}
	if err := json.Unmarshal(raw, &p); err != nil {
		t.Fatal(err)
	}
	return p.Version
}

func verifyABCMixedChain(t *testing.T, chain core.HelperHistoryChain, legacy core.HelperHistoryRecord) {
	t.Helper()
	if len(chain.Records) != 2 {
		t.Fatalf("mixed chain length=%d", len(chain.Records))
	}
	old, newer := chain.Records[0], chain.Records[1]
	if old.Receipt != legacy.Receipt || old.ChainDigest != legacy.ChainDigest || !bytes.Equal(old.Payload, legacy.Payload) {
		t.Fatal("immutable v1 receipt was replaced or re-encoded")
	}
	if abcPayloadVersion(t, old.Payload) != 1 || abcPayloadVersion(t, newer.Payload) != 2 || newer.ParentReceipt != old.Receipt {
		t.Fatal("v1 to v2 append did not preserve the parent chain")
	}
	for _, r := range chain.Records {
		if r.Namespace != legacy.Namespace || r.Binding != legacy.Binding || chain.Binding != legacy.Binding {
			t.Fatal("mixed payload migration changed namespace or issuer binding")
		}
	}
}
