package testutil

import "context"

// StepUpPassed is a core.StepUpVerifier accepting every request, for module
// tests whose subject is not step-up verification (httpapi and iam test it).
// Embed it in a test TokenVerifier so httpapi.NewRouter picks it up.
type StepUpPassed struct{}

// ConsumeStepUp implements core.StepUpVerifier.
func (StepUpPassed) ConsumeStepUp(context.Context, string) error { return nil }
