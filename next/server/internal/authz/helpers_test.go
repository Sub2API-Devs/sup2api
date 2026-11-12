package authz

import (
	"context"
	"errors"
	"slices"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestCanGrant(t *testing.T) {
	s := &Service{
		users: map[int64]core.PermissionSet{
			1: {Keys: map[string]struct{}{"users:read": {}, "users:write": {}}, Version: 1},
			2: {Superuser: true, Version: 1},
			3: {Keys: map[string]struct{}{"users:read": {}}, Version: 1},
		},
		minVersion: 1,
	}

	tests := []struct {
		name    string
		actorID int64
		perms   []string
		wantErr bool
	}{
		{
			name:    "superuser can grant anything",
			actorID: 2,
			perms:   []string{"users:read", "users:write", "settings:manage"},
			wantErr: false,
		},
		{
			name:    "can grant subset of own permissions",
			actorID: 1,
			perms:   []string{"users:read"},
			wantErr: false,
		},
		{
			name:    "can grant all own permissions",
			actorID: 1,
			perms:   []string{"users:read", "users:write"},
			wantErr: false,
		},
		{
			name:    "cannot grant permission not held",
			actorID: 3,
			perms:   []string{"users:write"},
			wantErr: true,
		},
		{
			name:    "cannot grant mix of held and not held",
			actorID: 3,
			perms:   []string{"users:read", "users:write"},
			wantErr: true,
		},
		{
			name:    "empty permissions allowed",
			actorID: 1,
			perms:   []string{},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := s.CanGrant(context.Background(), tt.actorID, tt.perms)
			if (err != nil) != tt.wantErr {
				t.Errorf("CanGrant() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// H1: granting a superuser role needs the superuser flag, which an access
// key never carries, even one of a superuser.
func TestCanGrantSetSuperuser(t *testing.T) {
	s := &Service{
		users: map[int64]core.PermissionSet{
			1: {Keys: map[string]struct{}{"role:manage": {}}, Version: 1},
			2: {Superuser: true, Version: 1},
		},
		minVersion: 1,
	}
	want := core.PermissionSet{Superuser: true, Keys: map[string]struct{}{}}
	keyed := core.WithAccessKey(context.Background(), core.AccessKeyIdentity{UserID: 2, Permissions: []string{"role:manage"}})
	tests := []struct {
		name    string
		ctx     context.Context
		actorID int64
		wantErr bool
	}{
		{"system", context.Background(), 0, false},
		{"superuser", context.Background(), 2, false},
		{"superuser's access key", keyed, 2, true},
		{"not a superuser", context.Background(), 1, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := s.canGrantSet(tt.ctx, tt.actorID, want)
			if (err != nil) != tt.wantErr {
				t.Fatalf("canGrantSet() error = %v, wantErr %v", err, tt.wantErr)
			}
			var e *core.Error
			if tt.wantErr && (!errors.As(err, &e) || e.Details["superuser"] != true) {
				t.Fatalf("details = %v", err)
			}
		})
	}
}

func TestCanActOn(t *testing.T) {
	s := &Service{
		users: map[int64]core.PermissionSet{
			1: {Keys: map[string]struct{}{"users:read": {}, "users:write": {}}, Version: 1},
			2: {Superuser: true, Version: 1},
			3: {Keys: map[string]struct{}{"users:read": {}}, Version: 1},
			4: {Keys: map[string]struct{}{"users:read": {}, "users:write": {}, "settings:manage": {}}, Version: 1},
		},
		minVersion: 1,
	}

	tests := []struct {
		name     string
		actorID  int64
		targetID int64
		wantErr  bool
	}{
		{
			name:     "can act on self",
			actorID:  1,
			targetID: 1,
			wantErr:  false,
		},
		{
			// Actor 0 is the system (CLI recovery, the last-super-admin
			// check), as in guardTarget and the audit log.
			name:     "system can act on a superuser",
			actorID:  0,
			targetID: 2,
			wantErr:  false,
		},
		{
			name:     "superuser can act on anyone",
			actorID:  2,
			targetID: 1,
			wantErr:  false,
		},
		{
			name:     "superuser can act on superuser",
			actorID:  2,
			targetID: 2,
			wantErr:  false,
		},
		{
			name:     "cannot act on superuser",
			actorID:  1,
			targetID: 2,
			wantErr:  true,
		},
		{
			name:     "can act on user with subset of permissions",
			actorID:  1,
			targetID: 3,
			wantErr:  false,
		},
		{
			name:     "can act on user with same permissions",
			actorID:  1,
			targetID: 1,
			wantErr:  false,
		},
		{
			name:     "cannot act on user with superset of permissions",
			actorID:  3,
			targetID: 1,
			wantErr:  true,
		},
		{
			name:     "cannot act on user with additional permissions",
			actorID:  1,
			targetID: 4,
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := s.CanActOnUser(context.Background(), tt.actorID, tt.targetID)
			if (err != nil) != tt.wantErr {
				t.Errorf("CanActOnUser() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestAddedKeys(t *testing.T) {
	tests := []struct {
		name       string
		want, have []string
		added      []string
	}{
		{"all new", []string{"a", "b"}, nil, []string{"a", "b"}},
		{"none new", []string{"a", "b"}, []string{"b", "a"}, nil},
		{"some new, order kept", []string{"c", "a", "d"}, []string{"a", "b"}, []string{"c", "d"}},
		{"removal only", nil, []string{"a"}, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := addedKeys(tt.want, tt.have); !slices.Equal(got, tt.added) {
				t.Errorf("addedKeys(%v, %v) = %v, want %v", tt.want, tt.have, got, tt.added)
			}
		})
	}
}
