package usage

import (
	"context"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type fakeEnvironment struct{ env core.Environment }

func (f fakeEnvironment) ResolveEnvironment(context.Context, int64, int64) (core.Environment, error) {
	return f.env, nil
}

func (fakeEnvironment) GlobalEnvironment(context.Context) core.EnvironmentValues { return nil }

// The task timeout and poll failure limit of the row's group and account
// override the reconcile settings; a row without an account keeps them.
func TestWithEnvironment(t *testing.T) {
	s := &Service{opts: Options{Environment: fakeEnvironment{core.Environment{core.EnvTaskTimeoutMinutes: 5, core.EnvTaskPollMaxFailures: 3}}}}
	base := resolved{maxAge: time.Hour, maxPollFailures: 10}
	account := int64(1)
	got := s.withEnvironment(context.Background(), base, 7, &account)
	if got.maxAge != 5*time.Minute || got.maxPollFailures != 3 {
		t.Fatalf("overridden: %+v", got)
	}
	if got := s.withEnvironment(context.Background(), base, 7, nil); got.maxAge != time.Hour || got.maxPollFailures != 10 {
		t.Fatalf("no account: %+v", got)
	}
}
