package gateway

import (
	"context"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestStickyKeyServes(t *testing.T) {
	for _, tc := range []struct {
		key  string
		want bool
	}{
		{"sticky:r:7:gpt-4o:abc", true},
		{"sticky:_:7:gpt-4o:abc", true},
		{"sticky:r:_:gpt-4o:abc", true},
		{"sticky:r:7:_:abc", true},
		{"sticky:r:_:_:abc", true},
		{"sticky:r:8:gpt-4o:abc", false},
		{"sticky:r:7:gpt-4o-mini:abc", false},
		{"sticky:stats:r", false},
		{"sticky:r:7:llama3:8b:abc", false},
		{"sticky:r", false},
	} {
		require.Equal(t, tc.want, stickyKeyServes(tc.key, "7", "gpt-4o"), tc.key)
	}
	require.True(t, stickyKeyServes("sticky:r:7:llama3:8b:abc", "7", "llama3:8b"))
}

func TestClearStickyBindings(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	ctx := context.Background()
	for i := range 200 {
		require.NoError(t, rdb.Set(ctx, "sticky:r:7:m:"+itoa(int64(i)), "42", 0).Err())
	}
	require.NoError(t, rdb.Set(ctx, "sticky:r:7:m:policy", bindingValue(42), 0).Err())
	require.NoError(t, rdb.Set(ctx, "sticky:r:7:m:other", "43", 0).Err())
	require.NoError(t, rdb.Set(ctx, "sticky:r:8:m:group", "42", 0).Err())
	require.NoError(t, rdb.HSet(ctx, "sticky:stats:r", "hits", 1).Err())
	c := NewStickyClearer(rdb)

	matched, cleared, err := c.ClearStickyBindings(ctx, core.StickyClearRequest{AccountID: 42, GroupID: 7, Model: "m", Percent: 50, Salt: "w1"})
	require.NoError(t, err)
	require.EqualValues(t, 201, matched)
	require.Greater(t, cleared, int64(50))
	require.Less(t, cleared, int64(150))

	matched, cleared, err = c.ClearStickyBindings(ctx, core.StickyClearRequest{AccountID: 42, GroupID: 7, Model: "m", Percent: 100, Salt: "w2"})
	require.NoError(t, err)
	require.Equal(t, matched, cleared)
	require.True(t, mr.Exists("sticky:r:7:m:other"))
	require.True(t, mr.Exists("sticky:r:8:m:group"))
	require.True(t, mr.Exists("sticky:stats:r"))
}
