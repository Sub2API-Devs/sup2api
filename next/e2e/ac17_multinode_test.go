package e2e

import (
	"fmt"
	"net/http"
	"slices"
	"strings"
	"testing"
	"time"
)

// AC 17: when a node dies it disappears from the node list within 15
// seconds, its concurrency slots are cleaned up and the other node keeps
// serving.
func TestAC17_NodeLoss(t *testing.T) {
	e := Setup(t)
	e.Pending("d-sandbox (cluster: heartbeat, node list, slots), c1-lifecycle (/nodes), gateway (G slots)")
	e.RequireDocker()
	admin := e.Admin()
	tn := e.NewTenant(admin, TenantOpts{Accounts: 1})
	acct := tn.Accounts[0]
	m := e.Mock()

	Eventually(t, 30*time.Second, time.Second, "both nodes alive", func() bool {
		ids := e.AliveNodeIDs(admin)
		return slices.Contains(ids, "node-1") && slices.Contains(ids, "node-2")
	})
	for _, n := range e.ClusterNodes(admin) {
		if n.Get("boot_id").String() == "" || n.Get("node_id").String() == "" {
			t.Fatalf("node entry lacks ids: %s", n.Raw)
		}
	}

	// Occupy account slots on node-2 with slow streams (upstream delays 60s).
	m.SetRule(t, MockRule{APIKey: acct.Key, DelayMS: 60_000})
	defer m.ClearRule(t, acct.Key)
	for i := 0; i < 2; i++ {
		go func() {
			_, _ = GatewayTry(e.NodeURLs[1], "/v1/messages", tn.APIKey, MessagesBody(tn.Model, "hold a slot", true), nil)
		}()
	}
	Eventually(t, 10*time.Second, 250*time.Millisecond, "slots held", func() bool {
		a := admin.OK(t, http.MethodGet, fmt.Sprintf("/accounts/%d", acct.ID), nil)
		return a.Get("in_use").Int() >= 2
	})
	slotKey := fmt.Sprintf("slot:account:%d", acct.ID)
	if members := e.Redis("ZRANGE", slotKey, "0", "-1"); !strings.Contains(members, ":") {
		t.Fatalf("slot members in Redis: %q", members)
	}

	// Crash node-2 (SIGKILL: no graceful slot release).
	killed := time.Now()
	e.KillNode(2)
	defer e.StartNode(2)
	Eventually(t, 20*time.Second, 500*time.Millisecond, "node-2 leaves the node list", func() bool {
		return !slices.Contains(e.AliveNodeIDs(admin), "node-2")
	})
	if d := time.Since(killed); d > 16*time.Second {
		t.Fatalf("node-2 disappeared after %s, want <= 15s", d)
	}

	// Its slots are released (by the survivor's cleanup of dead boot ids).
	m.ClearRule(t, acct.Key)
	Eventually(t, 30*time.Second, time.Second, "slots of the dead node cleaned", func() bool {
		a := admin.OK(t, http.MethodGet, fmt.Sprintf("/accounts/%d", acct.ID), nil)
		return a.Get("in_use").Int() == 0 && e.Redis("ZCARD", slotKey) == "0"
	})

	// The load balancer keeps serving through node-1 only.
	for i := 0; i < 6; i++ {
		g := e.MustMessages(tn.APIKey, MessagesBody(tn.Model, fmt.Sprintf("survivor %d", i), i%2 == 0), nil)
		if g.ServedBy != "" && !strings.HasPrefix(g.ServedBy, "node-1") {
			t.Fatalf("request served by %s while node-2 is down", g.ServedBy)
		}
	}

	// Recovery: node-2 rejoins with a new boot id.
	e.StartNode(2)
	Eventually(t, 30*time.Second, time.Second, "node-2 rejoins", func() bool {
		return slices.Contains(e.AliveNodeIDs(admin), "node-2")
	})
}
