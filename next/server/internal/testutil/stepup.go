package testutil

import (
	"context"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// StepUpPassed is a core.StepUpVerifier and core.StepUpSessions accepting
// every request, for module tests whose subject is not step-up verification
// (httpapi and iam test it). Embed it in a test TokenVerifier so
// httpapi.NewRouter picks it up.
type StepUpPassed struct{}

// ConsumeStepUp implements core.StepUpVerifier.
func (StepUpPassed) ConsumeStepUp(context.Context, string) error { return nil }

// OpenStepUpSession implements core.StepUpSessions.
func (StepUpPassed) OpenStepUpSession(context.Context, string, string) error { return nil }

// ContinueStepUpSession implements core.StepUpSessions.
func (StepUpPassed) ContinueStepUpSession(context.Context, string, string) error { return nil }

// StepUpRefused is a core.StepUpVerifier and core.StepUpSessions refusing
// every request, for tests asserting which routes need a step-up proof or
// continue a step-up session.
type StepUpRefused struct{}

// ConsumeStepUp implements core.StepUpVerifier.
func (StepUpRefused) ConsumeStepUp(_ context.Context, scope string) error {
	return core.ErrVerificationRequired.WithDetails(map[string]any{"scope": scope})
}

// OpenStepUpSession implements core.StepUpSessions.
func (StepUpRefused) OpenStepUpSession(_ context.Context, scope, _ string) error {
	return core.ErrVerificationRequired.WithDetails(map[string]any{"scope": scope})
}

// ContinueStepUpSession implements core.StepUpSessions.
func (StepUpRefused) ContinueStepUpSession(_ context.Context, scope, _ string) error {
	return core.ErrVerificationExpired.WithDetails(map[string]any{"scope": scope})
}
