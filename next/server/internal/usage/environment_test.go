package usage

import (
	"context"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// fakeEnvironment sets the task variables for account 1 and only the
// timeout for the group alone (account 0).
type fakeEnvironment struct{}

func (fakeEnvironment) ResolveEnvironment(_ context.Context, _, accountID int64) (core.Environment, error) {
	if accountID == 0 {
		return core.Environment{core.EnvVarTaskTimeoutMinutes: 7}, nil
	}
	return core.Environment{core.EnvVarTaskTimeoutMinutes: 5, core.EnvVarTaskPollMaxFailures: 3}, nil
}

func (fakeEnvironment) GlobalEnvironment(context.Context) core.EnvironmentValues { return nil }

// The task timeout and poll failure limit of the row's group and account
// override the reconcile settings; a row without an account resolves its
// group alone.
func TestWithEnvironment(t *testing.T) {
	s := &Service{opts: Options{Environment: fakeEnvironment{}}}
	base := resolved{maxAge: time.Hour, maxPollFailures: 10}
	account := int64(1)
	if got := s.withEnvironment(context.Background(), base, 7, &account); got.maxAge != 5*time.Minute || got.maxPollFailures != 3 {
		t.Fatalf("overridden: %+v", got)
	}
	if got := s.withEnvironment(context.Background(), base, 7, nil); got.maxAge != 7*time.Minute || got.maxPollFailures != 10 {
		t.Fatalf("group alone: %+v", got)
	}
}
