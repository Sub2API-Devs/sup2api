package gateway

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func TestHelperResponseBindingIgnoresDescriptiveAuthTypeOnly(t *testing.T) {
	want := resources.Identity{PrincipalID: "issuer", Generation: "epoch"}
	for _, mode := range []string{"api_key", "claude.ai", "changed-issuer", "changed-epoch"} {
		t.Run(mode, func(t *testing.T) {
			identity := want
			identity.AuthType = "api_key"
			switch mode {
			case "claude.ai":
				identity.AuthType = mode
			case "changed-issuer":
				identity.PrincipalID = "other"
			case "changed-epoch":
				identity.Generation = "other"
			}
			out := wire.ResponseEnvelope{Version: 1, AttemptID: "attempt", RequestDigest: strings.Repeat("a", 64), Namespace: "namespace", Identity: identity, StatusCode: 200, ContentType: "application/json", Body: []byte(`{}`), Delta: json.RawMessage(`{"version":1,"segments":[]}`)}
			c := &call{helperHistory: &helperHistoryRequest{dispatched: true, envelope: wire.RequestEnvelope{AttemptID: out.AttemptID, RequestDigest: out.RequestDigest, Namespace: out.Namespace, Identity: want}}}
			raw, _ := json.Marshal(out)
			response := &http.Response{Header: http.Header{"Content-Type": []string{wire.ContentType}}, Body: io.NopCloser(bytes.NewReader(raw))}
			err := c.unwrapHelperHistoryResponse(response, nil)
			if (err == nil) != (mode == "api_key" || mode == "claude.ai") {
				t.Fatalf("mode%s err%v", mode, err)
			}
		})
	}
}
