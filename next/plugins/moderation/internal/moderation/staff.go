package moderation

import (
	"context"
	"sync"
	"time"
)

// Moderators (users holding moderation:read, superusers included) are
// moderated and recorded like everyone, but never enter the watch list, are
// never banned and are left out of the user statistics: new-api does the
// same for administrators. The answer comes from the host (AuthzCheck) and
// is cached for staffTTL; it is only asked off the request path.

const staffTTL = 5 * time.Minute

// PermRead is the plugin permission that makes a user staff.
const PermRead = "moderation:read"

type staffEntry struct {
	staff bool
	at    time.Time
}

type staffCache struct {
	mu sync.Mutex
	m  map[int64]staffEntry
}

// isStaff reports whether uid may read moderation; host errors count as not
// staff (the user is then treated like any other).
func (p *Plugin) isStaff(ctx context.Context, uid int64) bool {
	staff, _ := p.checkStaff(ctx, uid)
	return staff
}

// cachedStaff is the cached answer for uid; ok = there is a fresh one.
func (p *Plugin) cachedStaff(uid int64) (staff, ok bool) {
	p.staff.mu.Lock()
	e, found := p.staff.m[uid]
	p.staff.mu.Unlock()
	return e.staff, found && p.now().Sub(e.at) < staffTTL
}

// checkStaff is isStaff with the host's error; each check has its own
// timeout.
func (p *Plugin) checkStaff(ctx context.Context, uid int64) (bool, error) {
	if uid <= 0 || p.host == nil {
		return false, nil
	}
	if staff, ok := p.cachedStaff(uid); ok {
		return staff, nil
	}
	now := p.now()
	cctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	allowed, err := p.host.AuthzCheck(cctx, uid, PermRead)
	if err != nil {
		return false, err
	}
	p.staff.mu.Lock()
	if p.staff.m == nil || len(p.staff.m) > 100000 {
		p.staff.m = map[int64]staffEntry{}
	}
	p.staff.m[uid] = staffEntry{staff: allowed, at: now}
	p.staff.mu.Unlock()
	return allowed, nil
}
