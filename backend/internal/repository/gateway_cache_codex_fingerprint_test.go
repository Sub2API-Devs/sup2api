package repository

import (
	"context"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGatewayCacheNextCodexFingerprintWindowIndex(t *testing.T) {
	redisServer := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: redisServer.Addr()})
	store, ok := NewGatewayCache(client).(service.CodexFingerprintWindowStore)
	require.True(t, ok)

	ctx := context.Background()
	first, err := store.NextCodexFingerprintWindowIndex(ctx, 9, "thread-a")
	require.NoError(t, err)
	assert.Equal(t, 0, first)

	for i := 1; i < service.CodexFingerprintWindowTurnStride(); i++ {
		n, err := store.NextCodexFingerprintWindowIndex(ctx, 9, "thread-a")
		require.NoError(t, err)
		assert.Equal(t, 0, n)
	}
	next, err := store.NextCodexFingerprintWindowIndex(ctx, 9, "thread-a")
	require.NoError(t, err)
	assert.Equal(t, 1, next)

	other, err := store.NextCodexFingerprintWindowIndex(ctx, 9, "thread-b")
	require.NoError(t, err)
	assert.Equal(t, 0, other)
}
