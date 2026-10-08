package gateway

import (
	"errors"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
)

func TestStrictConversionAdmissionDoesNotFailOver(t *testing.T) {
	e, q, plugin := convEnv(t, &fakeConv{reqErr: &convert.RequestError{Cause: errors.New("messages[1].role: no equivalent target role")}})
	res := e.messages(body(testModel, false))
	if res.status != 400 || res.json().Get("error.code").String() != "unsupported_conversion" {
		t.Fatalf("admission response: %d %s", res.status, res.body)
	}
	if plugin.buildCount() != 0 || len(q.bodies) != 0 || len(e.up.keys()) != 0 {
		t.Fatal("strictly rejected request reached a plugin or another provider")
	}
	if rec := e.record(); rec.Attempts != 1 || rec.ErrorType != errTypeInvalidRequest || rec.Success {
		t.Fatalf("admission record: %+v", rec)
	}
}
