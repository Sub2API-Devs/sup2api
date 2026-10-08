package gateway

import (
	"context"
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/tidwall/gjson"
	"net/http"
	"testing"
	"time"
)

func fileReferenceBody(id string) map[string]any {
	b := body(testModel, false)
	b["messages"] = []any{map[string]any{"role": "user", "content": []any{map[string]any{"type": "document", "source": map[string]any{"type": "file", "file_id": id}}}}}
	return b
}
func seedReference(e *env, s *memoryResourceStore, id string, account int64) core.ProviderResource {
	p := e.auth.keys[testKey]
	r := core.ProviderResource{PublicID: id, RemoteID: "remote_" + id, Owner: core.ResourceOwner{UserID: p.UserID, GroupID: p.Group.ID}, PluginKey: "ccgateway", Kind: "file", State: "ready", Binding: core.ResourceBinding{AccountID: account, PrincipalID: "synthetic_issuer", Generation: "v1"}}
	s.rows[id] = r
	return r
}
func TestFileReferenceHTTPAccountPinningAndHeaders(t *testing.T) {
	e, s, _ := resourceTestEnv(t)
	seedReference(e, s, "file_local", 2)
	for i := 0; i < 3; i++ {
		res := e.messages(fileReferenceBody("file_local"))
		if res.status != 200 {
			t.Fatalf("%d %s", res.status, res.body)
		}
		e.record()
	}
	for _, key := range e.up.keys() {
		if key != "acc-2" {
			t.Fatal("file request escaped original account", key)
		}
	}
	up := e.up.last()
	if gjson.GetBytes(up.body, "messages.0.content.0.source.file_id").String() != "remote_file_local" {
		t.Fatal("public ID not mapped")
	}
	if up.header.Get(resources.ResourceIDsHeader) != `["remote_file_local"]` || up.header.Get(resources.PrincipalHeader) != "synthetic_issuer" {
		t.Fatal("missing trusted resource context", up.header)
	}
}
func TestFileReferenceHTTPAdmissionFailures(t *testing.T) {
	for _, kind := range []string{"owner", "group", "deleted", "expired", "issuer"} {
		t.Run(kind, func(t *testing.T) {
			e, s, tr := resourceTestEnv(t)
			r := seedReference(e, s, "file_local", 1)
			switch kind {
			case "owner":
				r.Owner.UserID++
			case "group":
				r.Owner.GroupID++
			case "deleted":
				r.State = "deleted"
			case "expired":
				r.ExpiresAt = time.Now().Add(-time.Hour)
			case "issuer":
				tr.generation = "v2"
			}
			s.rows[r.PublicID] = r
			res := e.messages(fileReferenceBody("file_local"))
			if res.status != 404 || len(e.up.keys()) != 0 {
				t.Fatalf("%s admitted: %d %s", kind, res.status, res.body)
			}
			e.record()
		})
	}
}
func TestFileReferencePatchAndConversionGuard(t *testing.T) {
	before := []byte(`{"messages":[{"content":[{"type":"image","source":{"type":"file","file_id":"a"}}]}]}`)
	after := []byte(`{"messages":[{"content":[{"type":"image","source":{"type":"file","file_id":"b"}}]}]}`)
	if validateResourceReferencePatches("anthropic.messages", before, after) == nil {
		t.Fatal("patch swapped file")
	}
	c := &call{}
	if _, err := c.mapResourceReferences(context.Background(), before, &core.AccountRef{}, &typeRoute{upstream: "anthropic.messages", conv: &fakeConv{}}); err == nil {
		t.Fatal("conversion injected file")
	}
	req, _ := http.NewRequest("POST", "http://example.invalid", nil)
	req.Header.Set(resources.PrincipalHeader, "forged")
	req.Header.Set(resources.ResourceIDsHeader, `["a"]`)
	if err := c.applyResourceHeaders(context.Background(), req, &core.Account{}, nil); err != nil {
		t.Fatal(err)
	}
	if req.Header.Get(resources.PrincipalHeader) != "" || req.Header.Get(resources.ResourceIDsHeader) != "" {
		t.Fatal("external resource headers retained")
	}
}

func TestFileReferenceHTTPKeyRotationAndCount(t *testing.T) {
	e, s, _ := resourceTestEnv(t)
	seedReference(e, s, "file_local", 2)
	p := *e.auth.keys[testKey]
	p.KeyID++
	e.auth.keys["rotated-key"] = &p
	raw, _ := json.Marshal(fileReferenceBody("file_local"))
	for _, path := range []string{"/v1/messages", "/v1/messages/count_tokens"} {
		status, res := fileRequest(t, e, "POST", path, "rotated-key", "", raw, "application/json")
		if status != 200 {
			t.Fatalf("rotation/count %d %s", status, res)
		}
		e.record()
		if e.up.last().key != "acc-2" || gjson.GetBytes(e.up.last().body, "messages.0.content.0.source.file_id").String() != "remote_file_local" {
			t.Fatal("count/rotated request escaped binding")
		}
	}
}
func TestFileReferenceHTTPMixedAndPluginPatch(t *testing.T) {
	for _, kind := range []string{"mixed", "replace", "remove", "introduce", "hook"} {
		t.Run(kind, func(t *testing.T) {
			e, s, _ := resourceTestEnv(t)
			seedReference(e, s, "file_local", 1)
			seedReference(e, s, "file_other", 2)
			b := fileReferenceBody("file_local")
			switch kind {
			case "mixed":
				b["messages"] = append(b["messages"].([]any), fileReferenceBody("file_other")["messages"].([]any)...)
			case "replace":
				e.plat.patches = []*pluginv1.BodyPatch{{Op: pluginv1.BodyPatch_OP_SET, Path: "messages.0.content.0.source.file_id", ValueJson: `"remote_unowned"`}}
			case "remove":
				e.plat.patches = []*pluginv1.BodyPatch{{Op: pluginv1.BodyPatch_OP_SET, Path: "messages", ValueJson: `[]`}}
			case "introduce":
				b = body(testModel, false)
				e.plat.patches = []*pluginv1.BodyPatch{{Op: pluginv1.BodyPatch_OP_SET, Path: "messages", ValueJson: `[{"role":"user","content":[{"type":"image","source":{"type":"file","file_id":"remote_unowned"}}]}]`}}
			case "hook":
				h := &fakeHook{fn: func(context.Context, *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error) {
					return &pluginv1.GatewayRequestHookResponse{Decision: pluginv1.GatewayRequestHookResponse_DECISION_ALLOW, Patches: []*pluginv1.BodyPatch{{Op: pluginv1.BodyPatch_OP_SET, Path: "messages.0.content.0.source.file_id", ValueJson: `"unowned"`}}}, nil
				}}
				hk := guardHook(300, "closed")
				hk.Needs = []string{"messages"}
				e.addHook(hk, []string{"messages"}, h)
			}
			res := e.messages(b)
			if res.status == 200 || len(e.up.keys()) != 0 {
				t.Fatalf("%s bypassed %d %s", kind, res.status, res.body)
			}
			e.record()
		})
	}
}
