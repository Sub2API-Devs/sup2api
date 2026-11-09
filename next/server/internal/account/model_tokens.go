package account

import (
	"cmp"
	"context"
	"log/slog"
	"maps"
	"slices"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/x"
)

// Today's tokens of each client model of an account (CONTRACTS §68.7), in one
// Redis hash per account and UTC hour (field = model, value = tokens), as
// new-api's per-channel TPD hash: hours let "today" follow the reader's time
// zone (whole-hour zones exactly, others from the hour holding midnight), and
// the hashes double as the list of models the account served.
const (
	// tokenHourTTL keeps an hour while a "today" of any time zone or the
	// recent hour can still read it.
	tokenHourTTL = 26 * time.Hour
	// tokenRecent names the models of the last hour even before midnight: a
	// request's tokens land when it ends, and it is in the window until then.
	tokenRecent = time.Hour
	// maxRateModels bounds the models one answer lists, the most tokens first.
	maxRateModels = 100
)

func tokenKey(id int64, hour time.Time) string {
	return "rl:account:" + x.Itoa64(id) + ":tpd:" + x.Itoa64(hour.Unix())
}

// modelTokens reads and writes the hourly hashes; without a client nothing is
// counted.
type modelTokens struct{ rdb redis.UniversalClient }

func (t modelTokens) add(ctx context.Context, id int64, model string, n int64, now time.Time) {
	if t.rdb == nil || model == "" || n <= 0 {
		return
	}
	key := tokenKey(id, now.Truncate(time.Hour))
	pipe := t.rdb.Pipeline()
	pipe.HIncrBy(ctx, key, model, n)
	pipe.Expire(ctx, key, tokenHourTTL)
	if _, err := pipe.Exec(ctx); err != nil {
		slog.WarnContext(ctx, "account: count model tokens", "account", id, "err", err)
	}
}

// modelTPD is one model's tokens since midnight.
type modelTPD struct {
	model  string
	tokens int64
}

// today returns the models of the hours since the earlier of midnight and
// tokenRecent ago with their tokens since midnight, the most first, at most
// maxRateModels; and the tokens of every model since midnight.
func (t modelTokens) today(ctx context.Context, id int64, midnight, now time.Time) ([]modelTPD, int64, error) {
	if t.rdb == nil {
		return nil, 0, nil
	}
	day, from := midnight.Truncate(time.Hour), now.Add(-tokenRecent).Truncate(time.Hour)
	if day.Before(from) {
		from = day
	}
	var hours []time.Time
	for h := from; !h.After(now); h = h.Add(time.Hour) {
		hours = append(hours, h)
	}
	cmds := make([]*redis.MapStringStringCmd, len(hours))
	if _, err := t.rdb.Pipelined(ctx, func(p redis.Pipeliner) error {
		for i, h := range hours {
			cmds[i] = p.HGetAll(ctx, tokenKey(id, h))
		}
		return nil
	}); err != nil {
		return nil, 0, err
	}
	sums, total := map[string]int64{}, int64(0)
	for i, cmd := range cmds {
		for model, v := range cmd.Val() {
			n, _ := strconv.ParseInt(v, 10, 64)
			if hours[i].Before(day) {
				n = 0
			}
			sums[model] += n
			total += n
		}
	}
	out := make([]modelTPD, 0, len(sums))
	for _, model := range slices.Sorted(maps.Keys(sums)) {
		out = append(out, modelTPD{model, sums[model]})
	}
	slices.SortStableFunc(out, func(a, b modelTPD) int { return cmp.Compare(b.tokens, a.tokens) })
	return out[:min(len(out), maxRateModels)], total, nil
}
