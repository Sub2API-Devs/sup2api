package gateway

import (
	"bytes"
	"encoding/json"
	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"io"
	"net/http"
	"strings"
	"testing"
)

func TestReviewHelperReplyCannotChangeNegotiatedPayload(t *testing.T) {
	for _, versions := range [][2]int{{0, 2}, {2, 0}, {1, 2}, {2, 1}} {
		expected := wire.RequestEnvelope{Version: 1, PayloadVersion: versions[0], AttemptID: "a", RequestDigest: strings.Repeat("a", 64), Namespace: "n", Identity: resources.Identity{PrincipalID: "p", Generation: "g"}}
		reply := wire.ResponseEnvelope{Version: 1, PayloadVersion: versions[1], AttemptID: "a", RequestDigest: expected.RequestDigest, Namespace: "n", Identity: expected.Identity, StatusCode: 200, ContentType: "application/json", Body: []byte(`{"type":"message"}`), Delta: json.RawMessage(`{"version":1,"segments":[]}`)}
		raw, _ := json.Marshal(reply)
		c := &call{helperHistory: &helperHistoryRequest{dispatched: true, envelope: expected}}
		response := &http.Response{Header: http.Header{"Content-Type": {wire.ContentType}}, Body: io.NopCloser(bytes.NewReader(raw))}
		if err := c.unwrapHelperHistoryResponse(response, nil); err == nil {
			t.Fatalf("selection drift accepted %v", versions)
		}
		if c.helperHistory.response != nil {
			t.Fatal("untrusted reply installed before selection check")
		}
	}
}
