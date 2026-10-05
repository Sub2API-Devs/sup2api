package ccgateway

import (
	"context"
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"testing"
)

func TestRuntimeNetworkConfig(t *testing.T) {
	old := Config{Mode: "local", Network: &RuntimeNetwork{Pool: "10.80.0.0/16", Allocation: "sequential"}}
	kept, err := mergeConfig(Config{Mode: "local"}, old)
	if err != nil || kept.EffectiveNetwork() != *old.Network {
		t.Fatal("omitted network lost saved policy", err)
	}
	reset, err := mergeConfig(Config{Mode: "local", Network: &RuntimeNetwork{}}, old)
	if err != nil || reset.EffectiveNetwork() != (RuntimeNetwork{Pool: "10.0.0.0/8", Allocation: "random"}) {
		t.Fatal("defaults", err)
	}
	normalized, err := validateNetwork(RuntimeNetwork{Pool: "192.168.50.7/24", Allocation: "random"})
	if err != nil || normalized.Pool != "192.168.50.0/24" {
		t.Fatal("custom pool", err)
	}
	for _, pool := range []string{"10.0.0.0/7", "8.8.8.0/24", "10.0.0.0/25", "::/0", "invalid"} {
		if _, err := validateNetwork(RuntimeNetwork{Pool: pool, Allocation: "random"}); err == nil {
			t.Fatal("accepted", pool)
		}
	}
	if _, err := validateNetwork(RuntimeNetwork{Pool: "10.0.0.0/8", Allocation: "other"}); err == nil {
		t.Fatal("accepted allocation mode")
	}
}

func TestNetworkPolicyChangesDesiredRevision(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	cipher, _ := secret.New(make([]byte, 32))
	s := New(db, cipher)
	base := accountDesired{Revision: revisionOf("account-version")}
	before, err := s.desiredNetwork(ctx, db.Pool, base)
	if err != nil {
		t.Fatal(err)
	}
	config := Config{Mode: "local", Network: &RuntimeNetwork{Pool: "10.80.0.0/16", Allocation: "random"}}
	plain, _ := json.Marshal(config)
	enc, _ := cipher.Encrypt(plain, configAAD)
	raw, _ := json.Marshal(map[string]any{"cipher": enc})
	if _, err = db.Pool.Exec(ctx, `INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`, settingKey, raw); err != nil {
		t.Fatal(err)
	}
	after, err := s.desiredNetwork(ctx, db.Pool, base)
	if err != nil || after.Revision == before.Revision || after.Network.Pool != "10.80.0.0/16" {
		t.Fatal("network change did not invalidate readiness", err)
	}
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	inTx, err := s.desiredNetwork(ctx, tx, base)
	if err != nil || inTx.Revision != after.Revision {
		t.Fatal("transaction revision differs", err)
	}
}
