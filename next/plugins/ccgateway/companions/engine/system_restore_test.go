package engine

import (
	"encoding/json"
	"strings"
	"testing"
)

func wireBody(t *testing.T, raw string) Object {
	t.Helper()
	body, err := decodeObject([]byte(raw))
	if err != nil {
		t.Fatal(err)
	}
	return body
}

func canonical(t *testing.T, v any) string {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	o, _ := decodeObject(append(append([]byte(`{"v":`), b...), '}'))
	var out strings.Builder
	encoder := json.NewEncoder(&out)
	encoder.SetEscapeHTML(false)
	_ = encoder.Encode(o["v"])
	return strings.TrimSuffix(out.String(), "\n")
}
