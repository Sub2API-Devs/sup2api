package gateway

import (
	"context"
	"errors"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// A binding is written when its account is picked, never after the request:
// concurrent requests of a new session must see it (docs/audits/
// 2026-11-04-sticky-load-tier.md §3). Claiming and releasing compare accounts,
// not values, so requests of one session never lose a race to each other.
// stickyAccountLua reads a binding's account: "<id>", or a rolling update's
// older "v1:<generation>:<id>".
const stickyAccountLua = `local function account(v) if not v then return '0' end return string.match(v, ':(%d+)$') or v end
`

// stickyClaim binds a session without an account and answers the session's
// account, which is another one when a concurrent request got there first.
const stickyClaim = stickyAccountLua + `
local current = account(redis.call('GET', KEYS[1]))
if current ~= '0' and current ~= '' then return current end
redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])
return ARGV[1]`

// stickyRelease unbinds a session from an account and answers the session's
// account now: '0', or the one a concurrent request already moved it to.
const stickyRelease = stickyAccountLua + `
local current = account(redis.call('GET', KEYS[1]))
if current ~= ARGV[1] then return current end
redis.call('DEL', KEYS[1])
return '0'`

func bindingAccount(raw string) int64 {
	if strings.HasPrefix(raw, "v1:") {
		parts := strings.Split(raw, ":")
		if len(parts) != 3 {
			return 0
		}
		raw = parts[2]
	}
	id, _ := strconv.ParseInt(raw, 10, 64)
	return id
}

// claimBinding binds the session of a request that has no account to id. It
// answers the account the session is bound to now, 0 when none could be read.
func (c *call) claimBinding(ctx context.Context, id int64) int64 {
	s := c.sticky
	if s == nil || s.bound != 0 || c.g.d.Redis == nil || c.failureState.preserveSticky {
		return 0
	}
	rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), stickyRedisTimeout)
	defer cancel()
	raw, err := c.g.d.Redis.Eval(rctx, stickyClaim, []string{s.key}, strconv.FormatInt(id, 10), s.ttl.Milliseconds()).Text()
	if err != nil {
		slog.WarnContext(ctx, "gateway: claim sticky binding", "err", err)
		return 0
	}
	winner := bindingAccount(raw)
	if winner == id {
		s.bound, s.claimed = id, id
	}
	return winner
}

// releaseBinding takes the session off account id. A session bound elsewhere
// keeps that binding, which this request then follows.
func (c *call) releaseBinding(ctx context.Context, id int64) error {
	s := c.sticky
	if s == nil {
		return nil
	}
	if c.g.d.Redis == nil {
		return errors.New("sticky store unavailable")
	}
	rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), stickyRedisTimeout)
	defer cancel()
	raw, err := c.g.d.Redis.Eval(rctx, stickyRelease, []string{s.key}, strconv.FormatInt(id, 10)).Text()
	if err != nil {
		return err
	}
	if s.claimed == id {
		s.claimed = 0
	}
	s.released = s.released || s.bound == id
	if s.bound = bindingAccount(raw); s.bound != 0 {
		s.tried = false
	}
	return nil
}

// releaseSession takes the request's session off the active sessions of the
// account a retry leaves (session caps, CONTRACTS §71.3): the session moves
// to the next account with its binding, and counting it on both would hold a
// session slot of an account that no longer serves it. ref is the account
// last admitted; its admission is released once.
func (c *call) releaseSession(ctx context.Context, ref *core.AccountRef) {
	at := c.sessionAt
	c.sessionAt = time.Time{}
	if c.g.d.Limiter == nil || c.session == "" {
		return
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), stickyRedisTimeout)
	defer cancel()
	c.g.d.Limiter.ReleaseSession(ctx, *ref, c.model, c.session, at)
}
