package moderation

import (
	"context"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// authzHost answers AuthzCheck only.
type authzHost struct {
	pluginsdk.Host
	can func(uid int64, perm string) bool
}

func (h authzHost) AuthzCheck(_ context.Context, uid int64, perm string) (bool, error) {
	return h.can(uid, perm), nil
}

// Staff is whoever holds moderation:exempt (not moderation:read), and the
// cached answer lasts a minute.
func TestStaffIsExemptHolderCachedAMinute(t *testing.T) {
	exempt := map[int64]bool{7: true}
	var asked []string
	host := authzHost{can: func(uid int64, perm string) bool {
		asked = append(asked, perm)
		return perm == PermExempt && exempt[uid]
	}}
	now := time.Unix(1_000_000, 0)
	p := &Plugin{host: host, now: func() time.Time { return now }}
	ctx := context.Background()
	if !p.isStaff(ctx, 7) || p.isStaff(ctx, 8) {
		t.Fatal("staff should follow moderation:exempt")
	}
	exempt[7] = false
	now = now.Add(staffTTL - time.Second)
	if !p.isStaff(ctx, 7) {
		t.Fatal("answer not cached")
	}
	now = now.Add(2 * time.Second)
	if p.isStaff(ctx, 7) {
		t.Fatal("revoked exemption still cached after a minute")
	}
	if staffTTL != time.Minute || len(asked) != 3 || asked[0] != "moderation:exempt" {
		t.Fatalf("ttl %v, asked %v", staffTTL, asked)
	}
}
