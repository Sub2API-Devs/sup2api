package core

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The engine's own tests are in sdk/paramoverride; this covers what the core
// adds on top: the request locale and the core field error type.
func TestCompileParamOverrideLocale(t *testing.T) {
	_, errs := CompileParamOverride(WithLocale(context.Background(), "zh"), "param_override", []byte(`{"operations":[{"mode":"set"}]}`))
	require.NotEmpty(t, errs)
	assert.Equal(t, FieldError{Field: "param_override", Code: "required", Message: "operations[0].path: 必填"}, errs[0])

	p, errs := CompileParamOverride(context.Background(), "param_override", []byte(`{"a":1}`))
	require.Nil(t, errs)
	assert.Equal(t, `{"a":1}`, string(p.Raw()))
}
