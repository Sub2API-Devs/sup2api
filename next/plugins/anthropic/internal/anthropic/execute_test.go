package anthropic

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// Exercise the real plugin and SDK RPC boundary, including this adapter's
// protocol, credentials and request patches before acknowledging usage.
func TestExecuteForwardsAndRecordsOnce(t *testing.T) {
	var stage atomic.Int32
	fh := pluginsdktest.NewFakeHost()
	fh.ForwardUpstreamFunc = func(_ context.Context, in *pluginv1.ForwardUpstreamRequest) (*pluginv1.ForwardUpstreamResponse, error) {
		if !stage.CompareAndSwap(0, 1) {
			t.Error("Execute forwarded more than once")
		}
		r := in.GetRequest()
		if in.GetExecutionToken() != "request-1" || r.GetMethod() != "POST" ||
			r.GetUrl() != "https://upstream.invalid/v1/messages" || r.GetUpstreamModel() != "claude-test" {
			t.Errorf("unexpected scoped request: %v", in)
		}
		if r.GetHeaders()["x-api-key"] != "sk-test-execution" {
			t.Error("Execute lost the selected account's credentials")
		}
		return &pluginv1.ForwardUpstreamResponse{}, nil
	}
	fh.RecordUsageFunc = func(_ context.Context, in *pluginv1.RecordUsageRequest) (*pluginv1.ExecutionReceipt, error) {
		if !stage.CompareAndSwap(1, 2) {
			t.Error("usage was recorded before forwarding or more than once")
		}
		if in.GetExecutionToken() != "request-1" || in.GetReport() != nil {
			t.Errorf("declarative usage acknowledgement = %v", in)
		}
		return &pluginv1.ExecutionReceipt{}, nil
	}
	h := pluginsdktest.Start(t, New(), pluginsdktest.Options{Host: fh,
		SDK: []pluginsdk.Option{pluginsdk.WithInfo("anthropic", "0.2.1")}})
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	r, err := h.Platform.Execute(ctx, &pluginv1.ExecuteRequest{
		ExecutionToken: "request-1",
		Request: &pluginv1.BuildUpstreamRequestRequest{
			Meta: &pluginv1.RequestMeta{Protocol: ProtocolMessages, Model: "claude-test", Stream: true},
			Account: &pluginv1.Account{Id: 7, Platform: "anthropic", Type: AccountTypeAPIKey,
				CredentialsJson: `{"api_key":"sk-test-execution"}`, SettingsJson: `{"base_url":"https://upstream.invalid"}`},
		},
	})
	if err != nil || r.GetClassification() != nil || stage.Load() != 2 {
		t.Fatalf("Execute did not finish after one usage acknowledgement: stage=%d result=%v err=%v", stage.Load(), r, err)
	}
	if dials := fh.Dials(); len(dials) != 0 {
		t.Fatalf("Execute used general egress: %v", dials)
	}
}
