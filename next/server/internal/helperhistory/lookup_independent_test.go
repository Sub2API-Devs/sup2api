package helperhistory

import (
	"context"
	"fmt"
	"testing"

	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestIndependentHelperHistoryDBLongLookupDoesNotTruncateDiscovery(t *testing.T) {
	s, r := fixture(t)
	prefixes := make([]string, wire.MaxChainDepth+17)
	for i := range prefixes {
		prefixes[i] = fmt.Sprintf("%064x", i+100)
	}
	ctx := context.Background()
	last := prefixes[len(prefixes)-1]
	finish(t, s, r, last, "known beyond private chain limit")
	got, err := s.Lookup(ctx, r.Owner, prefixes)
	if err != nil || got.State != core.HelperHistoryKnownUnrestorable {
		t.Fatal("late known prefix disappeared", got.State, err)
	}
	other := r.Owner
	other.GroupID++
	got, err = s.Lookup(ctx, other, prefixes)
	if err != nil || got.State != core.HelperHistoryUnknown {
		t.Fatal("other group inherited known chain", got.State, err)
	}
	prefixes[len(prefixes)-1] = fmt.Sprintf("%064x", 999999)
	got, err = s.Lookup(ctx, r.Owner, prefixes)
	if err != nil || got.State != core.HelperHistoryUnknown {
		t.Fatal("unknown ordinary prefix set rejected", got.State, err)
	}
	// Oversized public lookup must retain the same strict identity validation.
	prefixes[len(prefixes)-1] = prefixes[0]
	if _, err = s.Lookup(ctx, r.Owner, prefixes); err == nil {
		t.Fatal("duplicate public prefix accepted")
	}
}
