package account

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

// GET /accounts/:id/rate-models names the models of today's usage records
// with their throughput tokens (cache reads left out under either input
// semantics); older records name none.
func TestRateModelsTokensToday(t *testing.T) {
	e := setup(t)
	ctx := t.Context()
	id := e.mkRawAccount("anthropic", "apikey", "rate-models", "sk-good-key-123", true)
	_, err := e.db.Pool.Exec(ctx, `INSERT INTO usage_logs (request_id, user_id, api_key_id, group_id, account_id, protocol, endpoint, status_code, success,
		model, input_tokens, output_tokens, cache_read_tokens, billing_detail, created_at) VALUES
		('rm1', 1, 1, 1, $1, 'anthropic.messages', '/v1/messages', 200, true, 'a', 100, 10, 40, '{}', now()),
		('rm2', 1, 1, 1, $1, 'openai.chat', '/v1/chat/completions', 200, true, 'a', 50, 5, 30, '{"inputs":{"semantics":"inclusive"}}', now()),
		('rm3', 1, 1, 1, $1, 'anthropic.messages', '/v1/messages', 200, true, 'b', 7, 7, 0, '{}', now() - interval '2 days')`, id)
	require.NoError(t, err)
	code, out := e.do("GET", "/accounts/"+itoa(id)+"/rate-models?tz=UTC", nil)
	require.Equal(t, 200, code, out)
	raw, err := json.Marshal(out["data"])
	require.NoError(t, err)
	var got RateModels
	require.NoError(t, json.Unmarshal(raw, &got), out)
	require.Equal(t, []RateFigures{{Model: "a", InUse: 1, TPD: 135}}, got.Models)
	require.Equal(t, RateFigures{InUse: int(id % 7), TPD: 135}, got.Total)
}
