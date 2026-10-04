package authz

import (
	"context"
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
