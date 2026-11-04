// Package ratelimit counts requests and tokens of a kind of subject (accounts,
// API keys) over the last 60 seconds, shared by every node through Redis.
// Every admitted request is one event in a sorted set scored by its time, so
// a cap is checked against the exact last 60 seconds and no 60 seconds can
// pass more than the cap (CONTRACTS §68.3). Tokens are reserved when a request
// is admitted and replaced by what it really used when it finishes (§78.3).
// Sessions
// are counted the same way (CONTRACTS §71). Times come from Redis TIME so
// nodes with skewed clocks agree on them. Without a Redis client nothing is
// counted and everything is admitted.
package ratelimit

import (
	"context"
	"log/slog"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/x"
)

const (
	// window is how far back every count looks.
	window = time.Minute
	keyTTL = 2 * time.Minute
	// maxWindowEvents bounds the token events one script adds up, so a
	// subject with an extreme request rate cannot stall Redis.
	maxWindowEvents = 100000
	// readBatch is how many sets one read script covers: a page of busy
	// accounts is read in several short scripts rather than one long one.
	readBatch = 50
)

var _ core.RateWindows = (*Minute)(nil)

// Minute holds the windows of one scope ("account", "apikey").
type Minute struct {
	rdb   redis.UniversalClient
	scope string
	// Now replaces Redis TIME in tests.
	Now func() time.Time
}

// Limits are a subject's caps over the last 60 seconds; 0 = unlimited. Sub
// names a separate set of counters of the subject ("" = its own; accounts use
// one per model list). SPM caps the distinct sessions.
type Limits struct {
	ID  int64
	Sub string
	RPM int
	TPM int64
	SPM int
}

func NewMinute(rdb redis.UniversalClient, scope string) *Minute {
	return &Minute{rdb: rdb, scope: scope}
}

// Key is the Redis key of the kind ("rpm" | "tpm" | "spm") events of the
// subject.
func Key(scope string, id int64, kind string) string {
	return SubKey(scope, id, "", kind)
}

// SubKey is Key for the counters sub of the subject. rpm holds event id →
// Redis time in milliseconds, tpm holds "event id|tokens" → the same, spm
// holds session → the same.
func SubKey(scope string, id int64, sub, kind string) string {
	if sub != "" {
		kind = sub + ":" + kind
	}
	return "rl:" + scope + ":" + x.Itoa64(id) + ":" + kind
}

// SessionKey is the Redis key of the sessions of the counters sub of the
// subject.
func SessionKey(scope string, id int64, sub string) string {
	return SubKey(scope, id, sub, "spm")
}

func (m *Minute) now(ctx context.Context) (time.Time, error) {
	if m.Now != nil {
		return m.Now(), nil
	}
	return m.rdb.Time(ctx).Result()
}

// cutoff is the newest score that is no longer inside the window at now.
func cutoff(now time.Time) int64 { return now.Add(-window).UnixMilli() }

// admit checks every set of caps and, when all pass, records one request in
// each of them. KEYS: per set its rpm, tpm and spm keys. ARGV: now ms, cutoff
// ms, session ("" = none), event id, ttl ms, max token events, then per set
// rpm, tpm, spm and the tokens to reserve. A set passes RPM below its cap and
// TPM while its tokens plus the reservation fit the cap. A session already
// active in a set passes its spm and is refreshed; a new one passes while the
// set has fewer active sessions than spm. Without a session spm is not checked
// and nothing is added to the sessions. A refusal changes nothing and returns
// {0, ms until the set would pass}.
var admit = redis.NewScript(`
local now=ARGV[1]
local cutoff=tonumber(ARGV[2])
local min='('..ARGV[2]
local session=ARGV[3]
local event=ARGV[4]
local ttl=ARGV[5]
local cap=tonumber(ARGV[6])
local n=#KEYS/3
local function amount(member) return tonumber(string.match(member,'|(%d+)$')) or 0 end
for i=0,n-1 do
  local k=3*i
  local a=7+4*i
  local rpm=tonumber(ARGV[a])
  local tpm=tonumber(ARGV[a+1])
  local spm=tonumber(ARGV[a+2])
  local tokens=tonumber(ARGV[a+3])
  if rpm>0 then
    local count=redis.call('ZCOUNT',KEYS[k+1],min,'+inf')
    if count>=rpm then
      local frees=redis.call('ZRANGEBYSCORE',KEYS[k+1],min,'+inf','WITHSCORES','LIMIT',count-rpm,1)
      return {0, tonumber(frees[2])-cutoff}
    end
  end
  if tpm>0 then
    if redis.call('ZCARD',KEYS[k+2])>cap then
      return {0, 1000}
    end
    local events=redis.call('ZRANGEBYSCORE',KEYS[k+2],min,'+inf','WITHSCORES')
    local sum=0
    for j=1,#events,2 do sum=sum+amount(events[j]) end
    local need=math.max(tokens,1)
    if sum+need>tpm then
      for j=1,#events,2 do
        sum=sum-amount(events[j])
        if sum+need<=tpm then return {0, tonumber(events[j+1])-cutoff} end
      end
      return {0, 1000}
    end
  end
  if spm>0 and session~='' and tonumber(redis.call('ZSCORE',KEYS[k+3],session) or cutoff)<=cutoff then
    local active=redis.call('ZCOUNT',KEYS[k+3],min,'+inf')
    if active>=spm then
      local at=redis.call('ZCOUNT',KEYS[k+3],'-inf',cutoff)+active-spm
      local frees=redis.call('ZRANGE',KEYS[k+3],at,at,'WITHSCORES')
      return {0, tonumber(frees[2])-cutoff}
    end
  end
end
for i=0,n-1 do
  local k=3*i
  local a=7+4*i
  redis.call('ZREMRANGEBYSCORE',KEYS[k+1],'-inf',cutoff)
  redis.call('ZADD',KEYS[k+1],now,event)
  redis.call('PEXPIRE',KEYS[k+1],ttl)
  if tonumber(ARGV[a+3])>0 then
    redis.call('ZREMRANGEBYSCORE',KEYS[k+2],'-inf',cutoff)
    redis.call('ZADD',KEYS[k+2],now,event..'|'..ARGV[a+3])
    redis.call('PEXPIRE',KEYS[k+2],ttl)
  end
  if session~='' then
    redis.call('ZREMRANGEBYSCORE',KEYS[k+3],'-inf',cutoff)
    redis.call('ZADD',KEYS[k+3],now,session)
    redis.call('PEXPIRE',KEYS[k+3],ttl)
  end
end
return {1}`)

// settle replaces a reservation by what the request really used. KEYS: the
// tpm keys. ARGV: now ms, cutoff ms, ttl ms, event id, actual tokens, then per
// key the tokens reserved there. A reservation still in the window is replaced
// at its original time. One that already left the window (a stream longer than
// 60 seconds) was counted for its full 60 seconds, so only what the request
// used beyond it is added, at now; the same goes for a key with no reservation.
var settle = redis.NewScript(`
local now=ARGV[1]
local cutoff=tonumber(ARGV[2])
local ttl=ARGV[3]
local event=ARGV[4]
local actual=tonumber(ARGV[5])
for i=1,#KEYS do
  local reserved=tonumber(ARGV[5+i])
  local score=false
  if reserved>0 then
    local member=event..'|'..ARGV[5+i]
    score=redis.call('ZSCORE',KEYS[i],member)
    if score then redis.call('ZREM',KEYS[i],member) end
  end
  if score and tonumber(score)>cutoff then
    if actual>0 then
      redis.call('ZADD',KEYS[i],score,event..'|'..ARGV[5])
      redis.call('PEXPIRE',KEYS[i],ttl)
    end
  elseif actual>reserved then
    redis.call('ZREMRANGEBYSCORE',KEYS[i],'-inf',cutoff)
    redis.call('ZADD',KEYS[i],now,event..'|'..string.format('%.0f',actual-reserved))
    redis.call('PEXPIRE',KEYS[i],ttl)
  end
end
return 1`)

// readWindows returns, per set, the requests, tokens and sessions of the
// window and whether session is one of them. KEYS: per set its rpm, tpm and
// spm keys. ARGV: cutoff ms, session ("" = none), max token events, then per
// set 1 when its tokens are wanted.
var readWindows = redis.NewScript(`
local cutoff=tonumber(ARGV[1])
local min='('..ARGV[1]
local session=ARGV[2]
local cap=tonumber(ARGV[3])
local out={}
for i=0,#KEYS/3-1 do
  local k=3*i
  local sum=0
  if ARGV[4+i]=='1' then
    local events=redis.call('ZRANGEBYSCORE',KEYS[k+2],min,'+inf','LIMIT',0,cap)
    for j=1,#events do sum=sum+(tonumber(string.match(events[j],'|(%d+)$')) or 0) end
  end
  local holds=0
  if session~='' and tonumber(redis.call('ZSCORE',KEYS[k+3],session) or cutoff)>cutoff then holds=1 end
  out[#out+1]=redis.call('ZCOUNT',KEYS[k+1],min,'+inf')
  out[#out+1]=sum
  out[#out+1]=redis.call('ZCOUNT',KEYS[k+3],min,'+inf')
  out[#out+1]=holds
end
return out`)

// Admit checks the last 60 seconds of id against rpm and tpm (0 = unlimited)
// and counts one request when it is under both, without reserving tokens. A
// refused request gets the time until it would be admitted.
func (m *Minute) Admit(ctx context.Context, id int64, rpm int, tpm int64) (ok bool, retry time.Duration, err error) {
	return m.AdmitAll(ctx, []Limits{{ID: id, RPM: rpm, TPM: tpm}}, "")
}

// Reserve is Admit that also reserves tokens against tpm until Settle.
func (m *Minute) Reserve(ctx context.Context, id int64, rpm int, tpm, tokens int64) (core.RateHold, bool, time.Duration, error) {
	return m.ReserveAll(ctx, []Limits{{ID: id, RPM: rpm, TPM: tpm}}, "", tokens)
}

// AdmitAll is Admit for several sets of caps at once: one request is counted
// in every set, or in none when one of them is at its cap. A non-empty
// session is also checked against each set's SPM on its own and, when
// admitted, counted as active in every set (CONTRACTS §71).
func (m *Minute) AdmitAll(ctx context.Context, sets []Limits, session string) (ok bool, retry time.Duration, err error) {
	_, ok, retry, err = m.ReserveAll(ctx, sets, session, 0)
	return ok, retry, err
}

// ReserveAll is AdmitAll that also reserves tokens in every set with a TPM
// cap, at most the cap so that a request larger than the cap can pass an empty
// window. Sets without a TPM cap reserve nothing: their tokens are counted
// when the request settles.
func (m *Minute) ReserveAll(ctx context.Context, sets []Limits, session string, tokens int64) (core.RateHold, bool, time.Duration, error) {
	if m.rdb == nil || len(sets) == 0 {
		return core.RateHold{}, true, 0, nil
	}
	now, err := m.now(ctx)
	if err != nil {
		return core.RateHold{}, false, 0, err
	}
	hold := core.RateHold{ID: uuid.NewString(), Subject: sets[0].ID, Items: make([]core.RateHoldItem, len(sets))}
	keys := make([]string, 0, 3*len(sets))
	args := make([]any, 0, 6+4*len(sets))
	args = append(args, now.UnixMilli(), cutoff(now), session, hold.ID, keyTTL.Milliseconds(), maxWindowEvents)
	for i, l := range sets {
		reserve := int64(0)
		if l.TPM > 0 && tokens > 0 {
			reserve = min(tokens, l.TPM)
		}
		hold.Items[i] = core.RateHoldItem{Sub: l.Sub, Tokens: reserve}
		keys = append(keys, SubKey(m.scope, l.ID, l.Sub, "rpm"), SubKey(m.scope, l.ID, l.Sub, "tpm"), SessionKey(m.scope, l.ID, l.Sub))
		args = append(args, l.RPM, l.TPM, l.SPM, reserve)
	}
	res, err := admit.Run(ctx, m.rdb, keys, args...).Int64Slice()
	if err != nil {
		return core.RateHold{}, false, 0, err
	}
	if len(res) > 0 && res[0] == 1 {
		return hold, true, 0, nil
	}
	retry := time.Second
	if len(res) == 2 {
		retry = max((time.Duration(res[1])*time.Millisecond + time.Second - 1).Truncate(time.Second), time.Second)
	}
	return core.RateHold{}, false, retry, nil
}

// Settle replaces what hold reserved by the tokens the request really used
// (0 returns the reservation; its request stays counted).
func (m *Minute) Settle(ctx context.Context, hold core.RateHold, actual int64) {
	if m.rdb == nil || len(hold.Items) == 0 {
		return
	}
	reserved := false
	keys := make([]string, len(hold.Items))
	args := make([]any, 0, 5+len(hold.Items))
	for i, item := range hold.Items {
		keys[i] = SubKey(m.scope, hold.Subject, item.Sub, "tpm")
		reserved = reserved || item.Tokens > 0
	}
	if !reserved && actual <= 0 {
		return
	}
	now, err := m.now(ctx)
	if err != nil {
		slog.WarnContext(ctx, "ratelimit: read shared time", "scope", m.scope, "id", hold.Subject, "err", err)
		return
	}
	args = append(args, now.UnixMilli(), cutoff(now), keyTTL.Milliseconds(), hold.ID, max(actual, 0))
	for _, item := range hold.Items {
		args = append(args, item.Tokens)
	}
	if err := settle.Run(ctx, m.rdb, keys, args...).Err(); err != nil {
		slog.WarnContext(ctx, "ratelimit: settle tokens", "scope", m.scope, "id", hold.Subject, "err", err)
	}
}

// AddTokens counts the tokens of a finished response admitted without a
// reservation.
func (m *Minute) AddTokens(ctx context.Context, id, n int64) { m.AddSubTokens(ctx, id, "", n) }

// AddSubTokens adds tokens to the counters sub of id.
func (m *Minute) AddSubTokens(ctx context.Context, id int64, sub string, n int64) {
	if n <= 0 {
		return
	}
	m.Settle(ctx, core.RateHold{ID: uuid.NewString(), Subject: id, Items: []core.RateHoldItem{{Sub: sub}}}, n)
}

// ReleaseSession removes session from the active sessions of every set, so a
// session that moved to another subject no longer holds a slot of this one.
func (m *Minute) ReleaseSession(ctx context.Context, sets []Limits, session string) {
	if m.rdb == nil || session == "" || len(sets) == 0 {
		return
	}
	pipe := m.rdb.Pipeline()
	for _, l := range sets {
		pipe.ZRem(ctx, SessionKey(m.scope, l.ID, l.Sub), session)
	}
	if _, err := pipe.Exec(ctx); err != nil {
		slog.WarnContext(ctx, "ratelimit: release session", "scope", m.scope, "id", sets[0].ID, "err", err)
	}
}

// Usage returns the last-60-seconds counters of ids.
func (m *Minute) Usage(ctx context.Context, ids []int64) (map[int64]core.RateUsage, error) {
	sets := make([]Limits, len(ids))
	for i, id := range ids {
		sets[i] = Limits{ID: id}
	}
	used, err := m.UsageOf(ctx, sets)
	out := make(map[int64]core.RateUsage, len(ids))
	for i, id := range ids {
		if used != nil {
			out[id] = used[i]
		}
	}
	return out, err
}

// UsageOf returns the last-60-seconds counters of each set (caps ignored),
// in order; nil when they cannot be read.
func (m *Minute) UsageOf(ctx context.Context, sets []Limits) ([]core.RateUsage, error) {
	if m.rdb == nil || len(sets) == 0 {
		return make([]core.RateUsage, len(sets)), nil
	}
	wins, err := m.read(ctx, sets, "", func(Limits) bool { return true })
	if err != nil {
		return nil, err
	}
	out := make([]core.RateUsage, len(sets))
	for i, w := range wins {
		out[i] = core.RateUsage{RPM: w.requests, TPM: w.tokens, Sessions: w.sessions}
	}
	return out, nil
}

// Reached returns the ids of which a set reached one of its caps for the
// session ("" = none): a set at its SPM refuses a session it does not hold.
// Sets without caps are never read.
func (m *Minute) Reached(ctx context.Context, limits []Limits, session string) (map[int64]bool, error) {
	out := map[int64]bool{}
	var capped []Limits
	for _, l := range limits {
		if l.RPM > 0 || l.TPM > 0 || (session != "" && l.SPM > 0) {
			capped = append(capped, l)
		}
	}
	if m.rdb == nil || len(capped) == 0 {
		return out, nil
	}
	wins, err := m.read(ctx, capped, session, func(l Limits) bool { return l.TPM > 0 })
	if err != nil {
		return out, err
	}
	for i, l := range capped {
		w := wins[i]
		if (l.RPM > 0 && w.requests >= int64(l.RPM)) || (l.TPM > 0 && w.tokens >= l.TPM) ||
			(session != "" && l.SPM > 0 && !w.holds && w.sessions >= int64(l.SPM)) {
			out[l.ID] = true
		}
	}
	return out, nil
}

// counts is what read found for one set.
type counts struct {
	requests, tokens int64
	sessions         int64 // sessions active in the last 60 seconds
	holds            bool  // the session read along is one of them
}

// read fetches, for each set, its counters in the window and whether session
// ("" = none) is one of its active sessions. tokens says for which sets the
// token events are added up.
func (m *Minute) read(ctx context.Context, sets []Limits, session string, tokens func(Limits) bool) ([]counts, error) {
	now, err := m.now(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]counts, 0, len(sets))
	for start := 0; start < len(sets); start += readBatch {
		batch := sets[start:min(start+readBatch, len(sets))]
		keys := make([]string, 0, 3*len(batch))
		args := make([]any, 0, 3+len(batch))
		args = append(args, strconv.FormatInt(cutoff(now), 10), session, maxWindowEvents)
		for _, l := range batch {
			keys = append(keys, SubKey(m.scope, l.ID, l.Sub, "rpm"), SubKey(m.scope, l.ID, l.Sub, "tpm"), SessionKey(m.scope, l.ID, l.Sub))
			want := 0
			if tokens(l) {
				want = 1
			}
			args = append(args, want)
		}
		res, err := readWindows.Run(ctx, m.rdb, keys, args...).Int64Slice()
		if err != nil {
			return nil, err
		}
		for i := range batch {
			out = append(out, counts{requests: res[4*i], tokens: res[4*i+1], sessions: res[4*i+2], holds: res[4*i+3] == 1})
		}
	}
	return out, nil
}
