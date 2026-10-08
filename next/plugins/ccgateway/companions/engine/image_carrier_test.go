package engine

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func carrierRequest(t *testing.T) *Request {
	t.Helper()
	one := Object{"type": "image", "source": Object{"type": "base64", "media_type": "image/png", "data": "YQ=="}, "transformations": Object{"oversized_image": "error"}}
	two, _ := jsonCopyObject(one)
	two["transformations"] = Object{"oversized_image": "downsize"}
	body := basic()
	body["messages"] = []any{Object{"role": "user", "content": []any{one, two, Object{"type": "text", "text": "q"}}}}
	r, err := parsePolicyRequest(mustServerJSON(body), nil)
	if err != nil {
		t.Fatal(err)
	}
	return r
}

func TestImageCarriersArePositionBoundAndNeverForwarded(t *testing.T) {
	r := carrierRequest(t)
	for _, mode := range []string{"valid", "reordered", "extra", "missing", "transformation-conflict", "text-leak"} {
		wire, _ := jsonCopyObject(Object{"messages": []Message{r.cliWireMessage(r.Messages[0])}})
		content := wire["messages"].([]any)[0].(Object)["content"].([]any)
		switch mode {
		case "reordered":
			content[0], content[1] = content[1], content[0]
		case "extra":
			wire["messages"].([]any)[0].(Object)["content"] = append(content, content[0])
		case "missing":
			wire["messages"].([]any)[0].(Object)["content"] = content[1:]
		case "transformation-conflict":
			content[0].(Object)["transformations"] = Object{"oversized_image": "downsize"}
		case "text-leak":
			content[2].(Object)["text"] = content[0].(Object)["source"].(Object)["url"]
		}
		err := r.restoreImageCarriers(wire)
		if err == nil {
			err = r.restoreImageTransformations(wire)
		}
		if mode == "valid" {
			if err != nil {
				t.Fatal(err)
			}
			raw, _ := json.Marshal(wire)
			if r.containsImageCarrier(raw) {
				t.Fatal("carrier survived")
			}
		} else if err == nil {
			t.Fatal("unsafe image carrier restoration", mode)
		}
	}
}

func TestImageCarrierAuxiliaryRequestFailsClosed(t *testing.T) {
	r := carrierRequest(t)
	scope := newMainRequestScope()
	if err := scope.enter(); err != nil {
		t.Fatal(err)
	}
	relay := &outboundRelay{scope: scope, path: "/carrier-test"}
	forwarded := false
	handler := relay.handler(r, http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) { forwarded = true; w.WriteHeader(200) }))
	body := Object{"model": r.Model, "max_tokens": 1, "messages": []Message{r.cliWireMessage(r.Messages[0])}, "system": "unmarked classifier"}
	raw, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", "http://local/carrier-test/messages", bytes.NewReader(raw))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != 400 || forwarded {
		t.Fatal("auxiliary carrier leaked", res.Code)
	}
}
