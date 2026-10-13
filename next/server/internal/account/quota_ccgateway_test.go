package account

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/stretchr/testify/require"
)

type quotaRuntimeFixture struct {
	core.AccountLifecycleResource
	calls     atomic.Int32
	mu        sync.Mutex
	id        int64
	operation string
}

func (r *quotaRuntimeFixture) QueryAccountQuota(ctx context.Context, id int64, op string) (*pluginv1.ParseQuotaResponseRequest, error) {
	r.calls.Add(1)
	r.mu.Lock()
	r.id, r.operation = id, op
	r.mu.Unlock()
	return &pluginv1.ParseQuotaResponseRequest{Status: 200, Body: []byte(`{"opaque":true}`)}, nil
}

type runtimeQuotaPlugin struct {
	*fakePlatform
	parsed  atomic.Int32
	account int64
}

func (p *runtimeQuotaPlugin) BuildQuotaRequest(context.Context, *pluginv1.BuildQuotaRequestRequest) (*pluginv1.BuildQuotaRequestResponse, error) {
	return &pluginv1.BuildQuotaRequestResponse{RuntimeOperation: "usage"}, nil
}
func (p *runtimeQuotaPlugin) ParseQuotaResponse(ctx context.Context, in *pluginv1.ParseQuotaResponseRequest) (*pluginv1.QuotaResult, error) {
	p.parsed.Add(1)
	p.account = in.Account.Id
	if string(in.Body) != `{"opaque":true}` {
		return nil, fmt.Errorf("unexpected raw response")
	}
	return &pluginv1.QuotaResult{Windows: []*pluginv1.QuotaWindow{{Key: "custom", Utilization: 12}}}, nil
}

func TestQuotaRuntimeBoundToOwningPlugin(t *testing.T) {
	e := setup(t)
	e.withQuota(&manifest.AccountQuota{Query: true})
	plugin := &runtimeQuotaPlugin{fakePlatform: e.plat}
	e.gen.types[0].Client = plugin
	runtime := &quotaRuntimeFixture{}
	e.svc.d.LifecycleResources = map[string]core.AccountLifecycleResource{"anthropic": runtime}
	id := e.mkRawAccount("anthropic", "apikey", "quota", "sk-good-key-123", true)
	code, out := e.do("GET", fmt.Sprintf("/accounts/%d/quota?force=true", id), nil)
	require.Equal(t, 200, code)
	require.Equal(t, "active", data(out)["source"])
	require.Equal(t, id, runtime.id)
	require.Equal(t, "usage", runtime.operation)
	require.Equal(t, id, plugin.account)
	require.EqualValues(t, 1, plugin.parsed.Load())
	e.do("GET", fmt.Sprintf("/accounts/%d/quota?force=true", id), nil)
	require.EqualValues(t, 1, runtime.calls.Load())
	snapshots, err := e.svc.AccountQuotaSnapshots(t.Context(), []int64{id})
	require.NoError(t, err)
	require.Equal(t, "custom", snapshots[id].Windows[0].Key)
	require.EqualValues(t, 1, runtime.calls.Load())
}
