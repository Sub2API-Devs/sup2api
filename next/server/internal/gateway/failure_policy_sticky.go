package gateway

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// A unique generation lives in the binding itself. Every write compares it;
// expired/deleted bindings cannot be resurrected by a late successful request.
const policyBindingRead = `
local current = redis.call('GET', KEYS[1])
if current then return current end
redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])
return ARGV[1]`

const policyBindingCAS = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3])
return 1`

func bindingValue(id int64) string { return "v1:" + uuid.NewString() + ":" + strconv.FormatInt(id, 10) }
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

func (c *call) readPolicyBinding(ctx context.Context, s *stickySession) error {
	if c.g.d.Redis == nil {
		return errors.New("sticky store unavailable")
	}
	ctx, cancel := context.WithTimeout(ctx, stickyRedisTimeout)
	defer cancel()
	raw, err := c.g.d.Redis.Eval(ctx, policyBindingRead, []string{s.key}, bindingValue(0), s.ttl.Milliseconds()).Text()
	if err != nil {
		return err
	}
	s.policyValue, s.bound = raw, bindingAccount(raw)
	s.initialBound = s.bound
	return nil
}

func (c *call) writePolicyBinding(ctx context.Context, s *stickySession, id int64) error {
	if c.g.d.Redis == nil || s.policyValue == "" {
		return errors.New("sticky store unavailable")
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 500*time.Millisecond)
	defer cancel()
	next := bindingValue(id)
	written, err := c.g.d.Redis.Eval(ctx, policyBindingCAS, []string{s.key}, s.policyValue, next, s.ttl.Milliseconds()).Int()
	if err != nil {
		return err
	}
	if written != 1 {
		return errors.New("sticky binding changed")
	}
	s.policyValue, s.bound = next, id
	return nil
}

func (c *call) resetPolicyBinding(ctx context.Context) error {
	if c.failureState.stickyErr != nil {
		return c.failureState.stickyErr
	}
	if c.sticky == nil {
		return nil
	}
	return c.writePolicyBinding(ctx, c.sticky, 0)
}

// releaseSession takes the request's session off the active sessions of the
// account a retry leaves (sessions-per-minute, CONTRACTS §71): the session
// moves to the next account with its binding, and counting it on both would
// hold a session slot of an account that no longer serves it.
func (c *call) releaseSession(ctx context.Context, ref *core.AccountRef) {
	if c.g.d.Limiter == nil || c.session == "" {
		return
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), stickyRedisTimeout)
	defer cancel()
	c.g.d.Limiter.ReleaseSession(ctx, *ref, c.model, c.session)
}
