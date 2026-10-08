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

func TestReviewHelperResponseWithoutOptionalHeaders(t *testing.T) {
	out := wire.ResponseEnvelope{Version: 1, AttemptID: "attempt", RequestDigest: strings.Repeat("a", 64), Namespace: "namespace", Identity: resources.Identity{PrincipalID: "issuer", Generation: "epoch"}, StatusCode: 200, ContentType: "application/json", Body: []byte(`{}`), Delta: json.RawMessage(`{"version":1,"segments":[]}`)}
	if err := out.Validate(); err != nil {
		t.Fatal(err)
	}
	c := &call{helperHistory: &helperHistoryRequest{dispatched: true, envelope: wire.RequestEnvelope{AttemptID: out.AttemptID, RequestDigest: out.RequestDigest, Namespace: out.Namespace, Identity: out.Identity}}}
	raw, _ := json.Marshal(out)
	resp := &http.Response{Header: http.Header{"Content-Type": []string{wire.ContentType}}, Body: io.NopCloser(bytes.NewReader(raw))}
	if err := c.unwrapHelperHistoryResponse(resp, nil); err != nil {
		t.Fatal(err)
	}
	if resp.Header.Get("Content-Type") != "application/json" {
		t.Fatal("public content type lost")
	}
}
