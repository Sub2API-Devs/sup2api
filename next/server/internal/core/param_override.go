package core

import (
	"context"

	"github.com/Sub2API-Devs/sup2api/next/sdk/paramoverride"
)

// Request parameter override (CONTRACTS §84). The engine lives in
// sdk/paramoverride, where manifest/check validates declared upstreams with
// the same parser; these names keep the core's callers unchanged.

type (
	// ParamOverride is a compiled override. nil means none.
	ParamOverride = paramoverride.Override
	// ParamOverrideError is what a return_error operation answers the client.
	ParamOverrideError = paramoverride.Error
	// ParamOverrideContext are the request facts conditions can read.
	ParamOverrideContext = paramoverride.Context
	// ParamOverrideResult is the overridden body and the header decisions.
	ParamOverrideResult = paramoverride.Result
	// HeaderOverride is what the header operations decided.
	HeaderOverride = paramoverride.HeaderOverride
)

const (
	// MaxParamOverrideBytes caps the serialized override of one account.
	MaxParamOverrideBytes = paramoverride.MaxBytes
	// MaxParamOverrideOperations caps its operations.
	MaxParamOverrideOperations = paramoverride.MaxOperations
)

// LoadParamOverride compiles a stored override. One that no longer compiles
// (it was validated when saved) fails every request of the account.
func LoadParamOverride(raw []byte) *ParamOverride { return paramoverride.Load(raw) }

// CompileParamOverride validates and compiles an override, with the messages
// in the request locale. null, {} and an override without operations or keys
// compile to nil (none).
func CompileParamOverride(ctx context.Context, field string, raw []byte) (*ParamOverride, []FieldError) {
	p, errs := paramoverride.Compile(field, raw, Locale(ctx) == "zh")
	if len(errs) == 0 {
		return p, nil
	}
	out := make([]FieldError, len(errs))
	for i, e := range errs {
		out[i] = FieldError(e)
	}
	return nil, out
}
