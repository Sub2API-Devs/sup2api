// Package ratelimit counts requests, tokens and sessions of a kind of subject
// (accounts, API keys) over rolling windows, shared by every node through
// Redis (CONTRACTS §68.3, §71). A window is cut into Segments segments of
// equal length, numbered by Redis time in milliseconds divided by that
// length, and each count is a Redis hash of segment → amount. The window
// ending in segment cur adds up segments cur-Segments to cur: the oldest one
// counts until it has wholly left, so no window's length of time passes more
// than a cap, and a check costs the same whatever the traffic. Requests and
// tokens are counted over 60 seconds, sessions over each set's own window.
// Tokens are reserved when a request is admitted and replaced by what it
// really used when it finishes (§78.3). Times come from Redis TIME so nodes
// with skewed clocks agree on them. Without a Redis client nothing is counted
// and everything is admitted.
package ratelimit

import (
	"context"
	"log/slog"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/x"
)

const (
	// Segments is how many segments a window is cut into.
	Segments = 20
	// rateWindow is the window of requests and tokens.
	rateWindow = time.Minute
	// defaultSPMWindow is the session window, in seconds, of a set naming
	// none.
	defaultSPMWindow = 60
	// readBatch is how many sets one read script covers: a page of busy
	// accounts is read in several short scripts rather than one long one.
	readBatch = 50
)

// Key kinds of a subject's request and token counters: hashes of segment →
// requests, segment → tokens.
const (
	Requests = "rpmb"
	Tokens   = "tpmb"
)

var _ core.RateWindows = (*Minute)(nil)

// Minute holds the windows of one scope ("account", "apikey").
type Minute struct {
	rdb   redis.UniversalClient
	scope string
	// Now replaces Redis TIME in tests.
	Now func() time.Time
}

// Limits are a subject's caps; 0 = unlimited. Requests and tokens are counted
// over 60 seconds, sessions over SPMWindow seconds (0 = 60). Sub names a
// separate set of counters of the subject ("" = its own; accounts use one per
// model list and per model). SPM caps the distinct sessions.
type Limits struct {
	ID        int64
	Sub       string
	RPM       int
	TPM       int64
	SPM       int
	SPMWindow int
}

// sessionWindow is the session window of l in seconds.
func (l Limits) sessionWindow() int {
	if l.SPMWindow > 0 {
		return l.SPMWindow
	}
	return defaultSPMWindow
}

// sessionMs is the session window of l in ms, as the scripts take it.
func (l Limits) sessionMs() int64 { return int64(l.sessionWindow()) * 1000 }

// Session is a request's session for the SPM caps (CONTRACTS §71); Key ""
// is none: it is neither checked nor counted. A session is remembered with
// the segment it was last seen in and counted there only, so it holds its
// slot while it keeps coming back within the window. Once marks a session
// that never comes back (a request without a sticky session): it is counted
// where it is seen and never remembered.
type Session struct {
	Key  string
	Once bool
}

func NewMinute(rdb redis.UniversalClient, scope string) *Minute {
	return &Minute{rdb: rdb, scope: scope}
}

// Key is the Redis key of the kind (Requests, Tokens) counters of the
// subject.
func Key(scope string, id int64, kind string) string {
	return SubKey(scope, id, "", kind)
}

// SubKey is Key for the counters sub of the subject.
func SubKey(scope string, id int64, sub, kind string) string {
	if sub != "" {
		kind = sub + ":" + kind
	}
	return "rl:" + scope + ":" + x.Itoa64(id) + ":" + kind
}

// SessionKeys are the Redis keys of the sessions of the counters sub of the
// subject over a window of secs seconds: a hash of segment → sessions last
// seen there, and a sorted set of the remembered sessions scored by that
// segment. The window is part of the names, so segments of different lengths
// never mix: changing the window starts the count anew.
func SessionKeys(scope string, id int64, sub string, secs int) (counts, members string) {
	w := strconv.Itoa(secs)
	return SubKey(scope, id, sub, "spmb:"+w), SubKey(scope, id, sub, "spms:"+w)
}

// keys are the Redis keys of the counters of l in the order the scripts take
// them: requests, tokens, session counts, session members.
func (m *Minute) keys(l Limits) []string {
	counts, members := SessionKeys(m.scope, l.ID, l.Sub, l.sessionWindow())
	return []string{SubKey(m.scope, l.ID, l.Sub, Requests), SubKey(m.scope, l.ID, l.Sub, Tokens), counts, members}
}

func (m *Minute) now(ctx context.Context) (time.Time, error) {
	if m.Now != nil {
		return m.Now(), nil
	}
	return m.rdb.Time(ctx).Result()
}

// segments is the prelude of every script, whose ARGV[1] is the Redis time
// in ms. A script reads all it needs before it writes.
//   - span gives, for a window of w ms, the segment holding ms (default now),
//     the segment length and the TTL of the window's keys: the window and one
//     segment, as long as the newest segment counts.
//   - window adds up the segments of the hash key inside the window ending in
//     segment cur and deletes older ones, once per key and script. It returns
//     the total and the amounts by segment, from the oldest (1) to cur
//     (Segments+1).
//   - frees is the ms until at least over of those amounts has left the
//     window, a segment leaving whole: amount at leaves at segment cur+at.
//   - held is the segment the session was last seen in when that is inside
//     the window ending in cur, else false.
//   - add adds n to segment s of the hash key after window, drops the segment
//     when it falls to 0 or below, and renews the key's TTL.
var segments = `
local SEGMENTS=` + strconv.Itoa(Segments) + `
local now=tonumber(ARGV[1])
local function int(n) return string.format('%.0f',n) end
local function span(w,ms)
  local len=w/SEGMENTS
  return math.floor((ms or now)/len),len,w+len
end
local memo={}
local function window(key,cur)
  local w=memo[key]
  if w then return w[1],w[2] end
  local fields=redis.call('HGETALL',key)
  local total,by,stale=0,{},{}
  for i=1,#fields,2 do
    local s=tonumber(fields[i])
    local at=s-cur+SEGMENTS+1
    if at<1 then
      stale[#stale+1]=fields[i]
    else
      by[at]=tonumber(fields[i+1])
      total=total+by[at]
    end
  end
  if #stale>0 then redis.call('HDEL',key,unpack(stale)) end
  memo[key]={total,by}
  return total,by
end
local function frees(by,cur,len,over)
  local gone=0
  for at=1,SEGMENTS+1 do
    gone=gone+(by[at] or 0)
    if gone>=over then return (cur+at)*len-now end
  end
  return (cur+SEGMENTS+1)*len-now
end
local function held(key,session,cur)
  local s=tonumber(redis.call('ZSCORE',key,session))
  return s~=nil and s>=cur-SEGMENTS and s
end
local function add(key,cur,s,n,ttl)
  window(key,cur)
  if redis.call('HINCRBY',key,int(s),int(n))<=0 then redis.call('HDEL',key,int(s)) end
  redis.call('PEXPIRE',key,int(ttl))
end
`

// admit checks every set of caps and, when all pass, counts one request in
// each of them. KEYS: per set its requests, tokens, session counts and
// session members keys. ARGV: now ms, rate window ms, session ("" = none),
// 1 when the session is remembered, then per set rpm, tpm, spm, session
// window ms and the tokens to reserve. A set passes RPM below its cap and TPM
// while its tokens plus the reservation (at least 1) fit the cap. A
// remembered session seen in the set's session window passes its spm and
// moves to the current segment; any other session passes while the set
// counts fewer sessions than spm. Without a session spm is not checked and
// no session is counted. A refusal counts nothing and returns {0, ms until
// the set would pass}.
var admit = redis.NewScript(segments + `
local cur,len,ttl=span(tonumber(ARGV[2]))
local session=ARGV[3]
local remember=ARGV[4]=='1'
local function last(k,scur) return remember and held(KEYS[k+4],session,scur) end
for i=0,#KEYS/4-1 do
  local k,a=4*i,5+5*i
  local rpm,tpm,spm=tonumber(ARGV[a]),tonumber(ARGV[a+1]),tonumber(ARGV[a+2])
  if rpm>0 then
    local used,by=window(KEYS[k+1],cur)
    if used>=rpm then return {0,frees(by,cur,len,used-rpm+1)} end
  end
  if tpm>0 then
    local used,by=window(KEYS[k+2],cur)
    local need=math.max(tonumber(ARGV[a+4]),1)
    if used+need>tpm then return {0,frees(by,cur,len,used+need-tpm)} end
  end
  if spm>0 and session~='' then
    local scur,slen=span(tonumber(ARGV[a+3]))
    if not last(k,scur) then
      local active,by=window(KEYS[k+3],scur)
      if active>=spm then return {0,frees(by,scur,slen,active-spm+1)} end
    end
  end
end
for i=0,#KEYS/4-1 do
  local k,a=4*i,5+5*i
  add(KEYS[k+1],cur,cur,1,ttl)
  local tokens=tonumber(ARGV[a+4])
  if tokens>0 then add(KEYS[k+2],cur,cur,tokens,ttl) end
  if session~='' then
    local scur,_,sttl=span(tonumber(ARGV[a+3]))
    local seen=last(k,scur)
    if seen~=scur then
      if seen then add(KEYS[k+3],scur,seen,-1,sttl) end
      add(KEYS[k+3],scur,scur,1,sttl)
    end
    if remember then
      redis.call('ZREMRANGEBYSCORE',KEYS[k+4],'-inf','('..int(scur-SEGMENTS))
      redis.call('ZADD',KEYS[k+4],scur,session)
      redis.call('PEXPIRE',KEYS[k+4],int(sttl))
    end
  end
end
return {1}`)

// settle replaces reservations by what the request really used. KEYS: the
// tokens keys. ARGV: now ms, rate window ms, the ms the request was admitted
// at, actual tokens, then per key the tokens reserved there. A reservation
// still in the window is replaced in its own segment. One that already left
// (a stream longer than the window) was counted for the whole window, so only
// what the request used beyond it is added, in the current segment; the same
// goes for a key with no reservation.
var settle = redis.NewScript(segments + `
local cur,_,ttl=span(tonumber(ARGV[2]))
local at=span(tonumber(ARGV[2]),tonumber(ARGV[3]))
local actual=tonumber(ARGV[4])
for i=1,#KEYS do
  local reserved=tonumber(ARGV[4+i])
  if reserved>0 and at>=cur-SEGMENTS then
    if actual~=reserved then add(KEYS[i],cur,at,actual-reserved,ttl) end
  elseif actual>reserved then
    add(KEYS[i],cur,cur,actual-reserved,ttl)
  end
end
return 1`)

// readWindows returns, per set, the requests, tokens and sessions of its
// windows and 1 when it remembers session in its session window. KEYS: as
// admit. ARGV: now ms, rate window ms, session ("" = none), then per set its
// session window ms.
var readWindows = redis.NewScript(segments + `
local cur=span(tonumber(ARGV[2]))
local session=ARGV[3]
local out={}
for i=0,#KEYS/4-1 do
  local k=4*i
  local scur=span(tonumber(ARGV[4+i]))
  out[#out+1]=window(KEYS[k+1],cur)
  out[#out+1]=window(KEYS[k+2],cur)
  out[#out+1]=window(KEYS[k+3],scur)
  out[#out+1]=(session~='' and held(KEYS[k+4],session,scur)) and 1 or 0
end
return out`)

// release forgets session in every set: it leaves the members, and the
// segment it was last seen in counts one session less. KEYS: per set its
// session counts and members keys. ARGV: now ms, session, then per set its
// session window ms.
var release = redis.NewScript(segments + `
local session=ARGV[2]
for i=0,#KEYS/2-1 do
  local cur,_,ttl=span(tonumber(ARGV[3+i]))
  local seen=held(KEYS[2*i+2],session,cur)
  redis.call('ZREM',KEYS[2*i+2],session)
  if seen then add(KEYS[2*i+1],cur,seen,-1,ttl) end
end
return 1`)

// Admit checks the last 60 seconds of id against rpm and tpm (0 = unlimited)
// and counts one request when it is under both, without reserving tokens. A
// refused request gets the time until it would be admitted.
func (m *Minute) Admit(ctx context.Context, id int64, rpm int, tpm int64) (ok bool, retry time.Duration, err error) {
	return m.AdmitAll(ctx, []Limits{{ID: id, RPM: rpm, TPM: tpm}}, Session{})
}

// Reserve is Admit that also reserves tokens against tpm until Settle.
func (m *Minute) Reserve(ctx context.Context, id int64, rpm int, tpm, tokens int64) (core.RateHold, bool, time.Duration, error) {
	return m.ReserveAll(ctx, []Limits{{ID: id, RPM: rpm, TPM: tpm}}, Session{}, tokens)
}

// AdmitAll is Admit for several sets of caps at once: one request is counted
// in every set, or in none when one of them is at its cap. A session is also
// checked against each set's SPM on its own and, when admitted, counted in
// every set (CONTRACTS §71).
func (m *Minute) AdmitAll(ctx context.Context, sets []Limits, session Session) (ok bool, retry time.Duration, err error) {
	_, ok, retry, err = m.ReserveAll(ctx, sets, session, 0)
	return ok, retry, err
}

// ReserveAll is AdmitAll that also reserves tokens in every set with a TPM
// cap, at most the cap so that a request larger than the cap can pass an empty
// window. Sets without a TPM cap reserve nothing: their tokens are counted
// when the request settles.
func (m *Minute) ReserveAll(ctx context.Context, sets []Limits, session Session, tokens int64) (core.RateHold, bool, time.Duration, error) {
	if m.rdb == nil || len(sets) == 0 {
		return core.RateHold{}, true, 0, nil
	}
	now, err := m.now(ctx)
	if err != nil {
		return core.RateHold{}, false, 0, err
	}
	remember := 0
	if !session.Once {
		remember = 1
	}
	hold := core.RateHold{Subject: sets[0].ID, At: now, Items: make([]core.RateHoldItem, len(sets))}
	keys := make([]string, 0, 4*len(sets))
	args := make([]any, 0, 4+5*len(sets))
	args = append(args, now.UnixMilli(), rateWindow.Milliseconds(), session.Key, remember)
	for i, l := range sets {
		reserve := int64(0)
		if l.TPM > 0 && tokens > 0 {
			reserve = min(tokens, l.TPM)
		}
		hold.Items[i] = core.RateHoldItem{Sub: l.Sub, Tokens: reserve}
		keys = append(keys, m.keys(l)...)
		args = append(args, l.RPM, l.TPM, l.SPM, l.sessionMs(), reserve)
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
	for i, item := range hold.Items {
		keys[i] = SubKey(m.scope, hold.Subject, item.Sub, Tokens)
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
	args := make([]any, 0, 4+len(hold.Items))
	args = append(args, now.UnixMilli(), rateWindow.Milliseconds(), hold.At.UnixMilli(), max(actual, 0))
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
	m.Settle(ctx, core.RateHold{Subject: id, Items: []core.RateHoldItem{{Sub: sub}}}, n)
}

// ReleaseSession forgets session in every set, so a session that moved to
// another subject no longer holds a slot of this one. A session counted
// Once is not remembered and stays counted.
func (m *Minute) ReleaseSession(ctx context.Context, sets []Limits, session Session) {
	if m.rdb == nil || session.Key == "" || session.Once || len(sets) == 0 {
		return
	}
	now, err := m.now(ctx)
	if err == nil {
		keys := make([]string, 0, 2*len(sets))
		args := make([]any, 0, 2+len(sets))
		args = append(args, now.UnixMilli(), session.Key)
		for _, l := range sets {
			keys = append(keys, m.keys(l)[2:]...)
			args = append(args, l.sessionMs())
		}
		err = release.Run(ctx, m.rdb, keys, args...).Err()
	}
	if err != nil {
		slog.WarnContext(ctx, "ratelimit: release session", "scope", m.scope, "id", sets[0].ID, "err", err)
	}
}

// Usage returns the counters of ids.
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

// UsageOf returns the counters of each set (caps ignored), in order; nil
// when they cannot be read.
func (m *Minute) UsageOf(ctx context.Context, sets []Limits) ([]core.RateUsage, error) {
	if m.rdb == nil || len(sets) == 0 {
		return make([]core.RateUsage, len(sets)), nil
	}
	wins, err := m.read(ctx, sets, "")
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
// session (Key "" = none): a set at its SPM refuses a session it does not
// hold. Sets without caps are never read.
func (m *Minute) Reached(ctx context.Context, limits []Limits, session Session) (map[int64]bool, error) {
	out := map[int64]bool{}
	var capped []Limits
	for _, l := range limits {
		if l.RPM > 0 || l.TPM > 0 || (session.Key != "" && l.SPM > 0) {
			capped = append(capped, l)
		}
	}
	if m.rdb == nil || len(capped) == 0 {
		return out, nil
	}
	remembered := session.Key
	if session.Once {
		remembered = ""
	}
	wins, err := m.read(ctx, capped, remembered)
	if err != nil {
		return out, err
	}
	for i, l := range capped {
		w := wins[i]
		if (l.RPM > 0 && w.requests >= int64(l.RPM)) || (l.TPM > 0 && w.tokens >= l.TPM) ||
			(session.Key != "" && l.SPM > 0 && !w.holds && w.sessions >= int64(l.SPM)) {
			out[l.ID] = true
		}
	}
	return out, nil
}

// counts is what read found for one set.
type counts struct {
	requests, tokens int64
	sessions         int64 // sessions of the session window
	holds            bool  // the session read along is one of them
}

// read fetches, for each set, its counters and whether it remembers session
// ("" = none) in its session window.
func (m *Minute) read(ctx context.Context, sets []Limits, session string) ([]counts, error) {
	now, err := m.now(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]counts, 0, len(sets))
	for start := 0; start < len(sets); start += readBatch {
		batch := sets[start:min(start+readBatch, len(sets))]
		keys := make([]string, 0, 4*len(batch))
		args := make([]any, 0, 3+len(batch))
		args = append(args, now.UnixMilli(), rateWindow.Milliseconds(), session)
		for _, l := range batch {
			keys = append(keys, m.keys(l)...)
			args = append(args, l.sessionMs())
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
