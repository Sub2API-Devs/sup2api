package testutil

import (
	"context"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// StepUpPassed is a core.StepUpVerifier accepting every request, for module
// tests whose subject is not step-up verification (httpapi and iam test it).
// Embed it in a test TokenVerifier so httpapi.NewRouter picks it up.
type StepUpPassed struct{}

// ConsumeStepUp implements core.StepUpVerifier.
func (StepUpPassed) ConsumeStepUp(context.Context, string) error { return nil }

// StepUpRefused is a core.StepUpVerifier refusing every request, for tests
// asserting which routes need a step-up proof.
type StepUpRefused struct{}

// ConsumeStepUp implements core.StepUpVerifier.
func (StepUpRefused) ConsumeStepUp(_ context.Context, scope string) error {
	return core.ErrVerificationRequired.WithDetails(map[string]any{"scope": scope})
}
