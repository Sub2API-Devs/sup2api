package pluginsdktest

import (
	"context"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// The fake follows the host's contract for AccountScopeCheck: the same
// argument checks before the callback, the callback's answer and error as
// they are, and "reaches every account" without one.
func TestFakeHostAccountScopeCheck(t *testing.T) {
	ctx := context.Background()
	f := NewFakeHost()
	ok := &pluginv1.AccountScopeCheckRequest{UserId: 7, Action: "read", AccountIds: []int64{1, 2}}
	if r, err := f.AccountScopeCheck(ctx, ok); err != nil || !r.GetAll() || len(r.GetAllowedIds()) != 0 {
		t.Fatalf("no callback: %v %v", r, err)
	}

	called := 0
	f.AccountScope = func(uid int64, action string, ids []int64) (bool, []int64, error) {
		called++
		if uid != 7 || action != "read" {
			return false, nil, status.Error(codes.PermissionDenied, "no account key")
		}
		return false, ids[:1], nil
	}
	if r, err := f.AccountScopeCheck(ctx, ok); err != nil || r.GetAll() || len(r.GetAllowedIds()) != 1 || r.GetAllowedIds()[0] != 1 {
		t.Fatalf("own scope: %v %v", r, err)
	}
	if _, err := f.AccountScopeCheck(ctx, &pluginv1.AccountScopeCheckRequest{UserId: 8, Action: "read"}); status.Code(err) != codes.PermissionDenied {
		t.Fatalf("callback error: %v", err)
	}

	called = 0
	tooMany := make([]int64, manifest.MaxAccountBatch+1)
	for i := range tooMany {
		tooMany[i] = int64(i + 1)
	}
	for name, in := range map[string]*pluginv1.AccountScopeCheckRequest{
		"no user":     {Action: "read"},
		"no action":   {UserId: 7},
		"zero id":     {UserId: 7, Action: "read", AccountIds: []int64{1, 0}},
		"negative id": {UserId: 7, Action: "read", AccountIds: []int64{-3}},
		"too many":    {UserId: 7, Action: "read", AccountIds: tooMany},
	} {
		if _, err := f.AccountScopeCheck(ctx, in); status.Code(err) != codes.InvalidArgument {
			t.Fatalf("%s: %v", name, err)
		}
	}
	if called != 0 {
		t.Fatalf("invalid arguments reached the callback %d times", called)
	}
	if _, err := f.AccountScopeCheck(ctx, &pluginv1.AccountScopeCheckRequest{UserId: 7, Action: "read", AccountIds: tooMany[:manifest.MaxAccountBatch]}); err != nil {
		t.Fatalf("a full batch: %v", err)
	}
}
