package helperhistory

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestHelperHistoryDBOutboxCorruptPageDoesNotStarve(t *testing.T) {
	s, r := fixture(t)
	ctx := context.Background()
	now := time.Now().UTC()
	s.now = func() time.Time { return now }
	for i := 0; i < 65; i++ {
		id := fmt.Sprintf("retry-%03d", i)
		r.RequestID = id
		raw, digest, err := core.HelperHistoryUsageBytes(usage(r))
		if err != nil {
			t.Fatal(err)
		}
		ciphertext, err := s.cipher.Encrypt(raw, usageAAD(id, id, digest, r.Owner))
		if err != nil {
			t.Fatal(err)
		}
		if i < 64 {
			ciphertext = []byte{0}
		}
		_, err = s.db.Pool.Exec(ctx, `INSERT INTO provider_helper_usage_outbox(request_id,attempt_id,user_id,group_id,digest,payload,created_at) VALUES($1,$1,$2,$3,$4,$5,$6)`, id, r.Owner.UserID, r.Owner.GroupID, digest, ciphertext, now.Add(time.Duration(i)*time.Millisecond))
		if err != nil {
			t.Fatal(err)
		}
	}
	first, err := s.PendingUsage(ctx, 64)
	if err != nil || len(first) != 0 {
		t.Fatal("corrupt page not isolated", err)
	}
	next, err := s.PendingUsage(ctx, 64)
	if err != nil || len(next) != 1 || next[0].RequestID != "retry-064" {
		t.Fatal("valid row starved", err)
	}
	if err = s.DeferUsage(ctx, next[0].RequestID, next[0].Digest); err != nil {
		t.Fatal(err)
	}
	if pending, err := s.PendingUsage(ctx, 64); err != nil || len(pending) != 0 {
		t.Fatal("deferred delivery immediately retried", err)
	}
	var retained, failures int
	if err = s.db.Pool.QueryRow(ctx, `SELECT count(*),count(*) FILTER(WHERE failure_code='integrity' AND retry_count=1) FROM provider_helper_usage_outbox`).Scan(&retained, &failures); err != nil || retained != 65 || failures != 64 {
		t.Fatal("evidence lost or error not recorded", retained, failures, err)
	}
	now = now.Add(2 * time.Minute)
	if _, err = s.PendingUsage(ctx, 64); err != nil {
		t.Fatal(err)
	}
	next, err = s.PendingUsage(ctx, 64)
	if err != nil || len(next) != 1 {
		t.Fatal("retry scheduling lost valid row", err)
	}
	if err = s.AckUsage(ctx, next[0].RequestID, strings.Repeat("0", 64)); err == nil {
		t.Fatal("wrong acknowledgement accepted")
	}
	if err = s.AckUsage(ctx, next[0].RequestID, next[0].Digest); err != nil {
		t.Fatal(err)
	}
}
