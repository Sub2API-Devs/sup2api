package core

import (
	"context"
	"errors"
	"slices"
	"testing"
)

func TestPermissionSetMissing(t *testing.T) {
	super := PermissionSet{Superuser: true}
	plain := PermissionSetOf("user:read", "role:manage")
	superWant := PermissionSet{Superuser: true, Keys: map[string]struct{}{"user:read": {}}}
	tests := []struct {
		name      string
		have      PermissionSet
		want      PermissionSet
		superuser bool
		keys      []string
	}{
		{"superuser covers a superuser", super, superWant, false, nil},
		{"superuser covers any key", super, PermissionSetOf("user:delete"), false, nil},
		{"plain misses the superuser flag", plain, superWant, true, nil},
		{"plain misses the flag and keys", plain, PermissionSet{Superuser: true, Keys: map[string]struct{}{"x:b": {}, "x:a": {}}}, true, []string{"x:a", "x:b"}},
		{"plain covers its subset", plain, PermissionSetOf("user:read"), false, nil},
		{"plain misses other keys", plain, PermissionSetOf("user:read", "user:delete"), false, []string{"user:delete"}},
		{"nothing wanted", plain, PermissionSet{}, false, nil},
		// An access key narrows a superuser to plain keys (Restrict).
		{"restricted superuser misses the flag", super.Restrict([]string{"role:manage"}), superWant, true, []string{"user:read"}},
		{"restricted superuser covers its keys", super.Restrict([]string{"role:manage"}), PermissionSetOf("role:manage"), false, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := tt.have.Missing(tt.want)
			if m.Superuser != tt.superuser || !slices.Equal(m.Keys, tt.keys) {
				t.Fatalf("Missing = %+v, want superuser=%v keys=%v", m, tt.superuser, tt.keys)
			}
			if m.Empty() != (!tt.superuser && len(tt.keys) == 0) {
				t.Fatalf("Empty = %v for %+v", m.Empty(), m)
			}
		})
	}
}

func TestMissingDetails(t *testing.T) {
	d := Missing{Superuser: true}.Details()
	if keys, ok := d["missing"].([]string); !ok || keys == nil || len(keys) != 0 || d["superuser"] != true {
		t.Fatalf("details = %#v", d)
	}
}

// guardFunc adapts a function to UserGuard.
type guardFunc func(actorID int64, targetIDs ...int64) error

func (f guardFunc) CanActOnUsers(_ context.Context, actorID int64, targetIDs ...int64) error {
	return f(actorID, targetIDs...)
}

func TestActOnOthers(t *testing.T) {
	ctx := context.Background()
	asked := false
	g := guardFunc(func(int64, ...int64) error { asked = true; return nil })
	if err := ActOnOthers(ctx, g, 7, 3, 7); !errors.Is(err, ErrSelfTarget) || asked {
		t.Fatalf("self among targets: err = %v, asked = %v", err, asked)
	}
	if err := ActOnOthers(ctx, g, 7, 3, 4); err != nil || !asked {
		t.Fatalf("others: err = %v, asked = %v", err, asked)
	}
	asked = false
	if err := ActOnOthers(ctx, g, 0, 0, 3); err != nil || !asked {
		t.Fatalf("system: err = %v, asked = %v", err, asked)
	}
	denied := guardFunc(func(int64, ...int64) error { return ErrPermissionDenied })
	if err := ActOnOthers(ctx, denied, 7, 3); !errors.Is(err, ErrPermissionDenied) {
		t.Fatalf("guard's denial: %v", err)
	}
}

func TestGuardOrDeny(t *testing.T) {
	if err := GuardOrDeny(nil).CanActOnUsers(context.Background(), 0); !errors.Is(err, ErrInternal) {
		t.Fatalf("nil guard: %v", err)
	}
	g := guardFunc(func(int64, ...int64) error { return nil })
	if err := GuardOrDeny(g).CanActOnUsers(context.Background(), 1, 2); err != nil {
		t.Fatalf("wired guard: %v", err)
	}
}
