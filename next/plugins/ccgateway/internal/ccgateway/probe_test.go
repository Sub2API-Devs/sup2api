package ccgateway

import (
	"context"
	"encoding/json"
	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"strings"
	"testing"
)

func TestProbeUsesNativeBuilderAndRequestedModel(t *testing.T) {
	p := New()
	a := &pluginv1.Account{Type: AccountTypeManaged, CredentialsJson: "{}"}
	r, err := p.BuildTestRequest(context.Background(), &pluginv1.BuildTestRequestRequest{Account: a, Model: "claude-opus-5-5"})
	if err != nil || r.Url != VirtualTestURL {
		t.Fatal(r, err)
	}
	var body map[string]any
	if err = json.Unmarshal([]byte(r.BodyJson), &body); err != nil {
		t.Fatal(err)
	}
	if body["model"] != "claude-opus-5-5" || body["system"] == "" || strings.Contains(r.BodyJson, "You are Claude Code") {
		t.Fatal("probe must ask the native builder for its identity", r.BodyJson)
	}
}
