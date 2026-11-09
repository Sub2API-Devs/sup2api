package account

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// GET /accounts/:id/rate-models lists the account, then the models it served
// today with their last minute, tokens today and requests in flight, the
// busiest first.
func TestRateModelsEndpoint(t *testing.T) {
	e := setup(t)
	ctx := t.Context()
	id := e.mkRawAccount("anthropic", "apikey", "rate-models", "sk-good-key-123", true)
	lim := e.svc.d.Limiter
	ref := core.AccountRef{ID: id}
	for _, model := range []string{"a", "b", "b"} {
		hold, ok, err := lim.Reserve(ctx, ref, model, "", 0)
		require.True(t, ok)
		require.NoError(t, err)
		lim.Settle(ctx, hold, 10)
		lim.CountModelTokens(ctx, id, model, 10)
	}
	lim.CountModelTokens(ctx, id, "c", 500)
	code, out := e.do("GET", "/accounts/"+itoa(id)+"/rate-models?tz=UTC", nil)
	require.Equal(t, 200, code, out)
	raw, err := json.Marshal(out["data"])
	require.NoError(t, err)
	var got RateModels
	require.NoError(t, json.Unmarshal(raw, &got), out)
	require.Equal(t, core.ModelRates{InUse: int(id % 7), RPM: 3, TPM: 30, TPD: 530}, got.Total)
	require.Equal(t, []core.ModelRates{
		{Model: "b", InUse: 1, RPM: 2, TPM: 20, TPD: 20},
		{Model: "a", InUse: 1, RPM: 1, TPM: 10, TPD: 10},
		{Model: "c", InUse: 1, TPD: 500},
	}, got.Models)
}

// The hourly hashes: an hour before midnight names its models while recent
// but adds nothing to today; older hours are not read.
func TestModelTokensToday(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	tok, ctx := modelTokens{rdb: rdb}, t.Context()
	shanghai := time.FixedZone("UTC+8", 8*3600)
	now := time.Date(2026, 11, 9, 0, 20, 0, 0, shanghai)
	midnight := dayStart(now, shanghai)
	tok.add(ctx, 1, "old", 7, now.Add(-2*time.Hour))
	tok.add(ctx, 1, "late", 5, now.Add(-30*time.Minute))
	tok.add(ctx, 1, "a", 3, now)
	tok.add(ctx, 1, "b", 9, now)
	tok.add(ctx, 1, "", 9, now)
	got, total, err := tok.today(ctx, 1, midnight, now)
	require.NoError(t, err)
	require.Equal(t, []modelTPD{{"b", 9}, {"a", 3}, {"late", 0}}, got)
	require.Equal(t, int64(12), total)
	require.Greater(t, mr.TTL(tokenKey(1, now.Truncate(time.Hour))), 25*time.Hour)
	none, total, err := modelTokens{}.today(ctx, 1, midnight, now)
	require.NoError(t, err)
	require.Empty(t, none)
	require.Zero(t, total)
}
