package paramoverride

import (
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"strings"
	"testing"
)

// The SDK module has no assertion library; these few helpers keep the
// engine's tests (moved here from the core) as they were written.

func note(args []any) string {
	if len(args) == 0 {
		return ""
	}
	if f, ok := args[0].(string); ok && len(args) > 1 {
		return " (" + fmt.Sprintf(f, args[1:]...) + ")"
	}
	return " (" + fmt.Sprint(args...) + ")"
}

func isEmpty(v any) bool {
	if v == nil {
		return true
	}
	r := reflect.ValueOf(v)
	switch r.Kind() {
	case reflect.Slice, reflect.Map, reflect.String, reflect.Array, reflect.Chan:
		return r.Len() == 0
	case reflect.Pointer, reflect.Interface:
		return r.IsNil()
	}
	return r.IsZero()
}

func isNil(v any) bool {
	if v == nil {
		return true
	}
	r := reflect.ValueOf(v)
	switch r.Kind() {
	case reflect.Pointer, reflect.Interface, reflect.Slice, reflect.Map, reflect.Func, reflect.Chan:
		return r.IsNil()
	}
	return false
}

func assertEqual(t *testing.T, want, got any, args ...any) {
	t.Helper()
	if !reflect.DeepEqual(want, got) {
		t.Errorf("got %#v, want %#v%s", got, want, note(args))
	}
}

func assertJSONEq(t *testing.T, want, got string, args ...any) {
	t.Helper()
	var w, g any
	if err := json.Unmarshal([]byte(want), &w); err != nil {
		t.Fatalf("want is not JSON: %v", err)
	}
	if err := json.Unmarshal([]byte(got), &g); err != nil || !reflect.DeepEqual(w, g) {
		t.Errorf("got %s, want %s%s", got, want, note(args))
	}
}

func assertContains(t *testing.T, s, sub string, args ...any) {
	t.Helper()
	if !strings.Contains(s, sub) {
		t.Errorf("%q does not contain %q%s", s, sub, note(args))
	}
}

func assertErrorContains(t *testing.T, err error, sub string) {
	t.Helper()
	if err == nil {
		t.Errorf("no error, want one containing %q", sub)
		return
	}
	assertContains(t, err.Error(), sub)
}

func assertEmpty(t *testing.T, v any, args ...any) {
	t.Helper()
	if !isEmpty(v) {
		t.Errorf("%#v is not empty%s", v, note(args))
	}
}

func assertNil(t *testing.T, v any, args ...any) {
	t.Helper()
	if !isNil(v) {
		t.Errorf("%#v is not nil%s", v, note(args))
	}
}

func assertTrue(t *testing.T, ok bool, args ...any) {
	t.Helper()
	if !ok {
		t.Errorf("false%s", note(args))
	}
}

func requireNoError(t *testing.T, err error, args ...any) {
	t.Helper()
	if err != nil {
		t.Fatalf("unexpected error %v%s", err, note(args))
	}
}

func requireError(t *testing.T, err error) {
	t.Helper()
	if err == nil {
		t.Fatal("no error")
	}
}

func requireErrorAs(t *testing.T, err error, target any) {
	t.Helper()
	if !errors.As(err, target) {
		t.Fatalf("%v is not a %T", err, target)
	}
}

func requireEmpty(t *testing.T, v any, args ...any) {
	t.Helper()
	if !isEmpty(v) {
		t.Fatalf("%#v is not empty%s", v, note(args))
	}
}

func requireNotEmpty(t *testing.T, v any) {
	t.Helper()
	if isEmpty(v) {
		t.Fatal("empty")
	}
}

func requireLen(t *testing.T, v any, n int, args ...any) {
	t.Helper()
	if l := reflect.ValueOf(v).Len(); l != n {
		t.Fatalf("len %d, want %d: %#v%s", l, n, v, note(args))
	}
}
