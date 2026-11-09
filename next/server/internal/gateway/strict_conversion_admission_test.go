package gateway

import (
	"errors"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
)

// A request the converter cannot express skips the converting type: a native
// account serves it, and without one it ends with 400 unsupported_conversion
// and no attempt (CONVERT-MATRIX §2.4).
func TestUnconvertibleRequestSkipsType(t *testing.T) {
	refused := &convert.RequestError{Cause: errors.New("messages[1].role: no equivalent target role")}
	e, q, plugin := convEnv(t, &fakeConv{reqErr: refused})
	if res := e.messages(body(testModel, false)); res.status != 200 {
		t.Fatalf("native fallback: %d %s", res.status, res.body)
	}
	if rec := e.record(); rec.Attempts != 1 || *rec.AccountID != 1 || plugin.buildCount() != 0 || len(q.bodies) != 0 {
		t.Fatalf("native fallback record: %+v", rec)
	}

	e, q, plugin = convEnv(t, &fakeConv{reqErr: refused})
	disableNative(e)
	res := e.messages(body(testModel, false))
	if res.status != 400 || res.json().Get("error.code").String() != "unsupported_conversion" ||
		res.json().Get("error.message").String() != "request cannot be converted to q.chat: "+refused.Error() {
		t.Fatalf("admission response: %d %s", res.status, res.body)
	}
	if plugin.buildCount() != 0 || len(q.bodies) != 0 || len(e.up.keys()) != 0 {
		t.Fatal("unconvertible request reached a plugin or a provider")
	}
	if rec := e.record(); rec.Attempts != 0 || rec.ErrorType != errTypeInvalidRequest || rec.Success {
		t.Fatalf("admission record: %+v", rec)
	}
}
