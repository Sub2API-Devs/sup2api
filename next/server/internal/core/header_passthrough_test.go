package core

import (
	"context"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeHeaderPassthrough(t *testing.T) {
	cases := []struct {
		name  string
		in    []string
		want  []string
		codes []string
	}{
		{name: "empty", in: []string{" ", ""}, want: []string{}},
		{name: "all and names", in: []string{"*", " X-Claude-Code-Agent-Id ", "x-claude-code-agent-id", "*"},
			want: []string{"*", "x-claude-code-agent-id"}},
		{name: "regex prefixes", in: []string{"re:^x-claude-code-", "REGEX: ^x-stainless-"},
			want: []string{"regex:^x-claude-code-", "regex:^x-stainless-"}},
		{name: "bad regex", in: []string{"regex:(", "re:"}, want: []string{}, codes: []string{"invalid", "invalid"}},
		{name: "bad name", in: []string{"x claude", "x-a:b"}, want: []string{}, codes: []string{"invalid", "invalid"}},
		{name: "blocked names", in: []string{"Authorization", "x-forwarded-for", "X-Kin-Debug", "x-sub2api-entry-node", "proxy-authorization", "cookie"},
			want: []string{}, codes: []string{"blocked", "blocked", "blocked", "blocked", "blocked", "blocked"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, errs := NormalizeHeaderPassthrough(context.Background(), "header_passthrough", tc.in)
			assert.Equal(t, tc.want, got)
			codes := make([]string, len(errs))
			for i, e := range errs {
				codes[i] = e.Code
				assert.Equal(t, "header_passthrough", e.Field)
			}
			if len(tc.codes) == 0 {
				assert.Empty(t, errs)
			} else {
				assert.Equal(t, tc.codes, codes)
			}
		})
	}

	many := make([]string, MaxHeaderPassthroughRules+1)
	for i := range many {
		many[i] = "x-h" + string(rune('a'+i%26)) + string(rune('a'+i/26))
	}
	_, errs := NormalizeHeaderPassthrough(context.Background(), "header_passthrough", many)
	require.Len(t, errs, 1)
	assert.Equal(t, "too_many", errs[0].Code)
}

func TestPassthroughHeaders(t *testing.T) {
	inbound := http.Header{}
	inbound.Add("X-Claude-Code-Agent-Id", "a1")
	inbound.Add("X-Multi", "one")
	inbound.Add("X-Multi", "two")
	inbound.Add("X-Forwarded-For", "203.0.113.9")
	inbound.Add("Forwarded", "for=203.0.113.9")
	inbound.Add("Cf-Connecting-Ip", "203.0.113.9")
	inbound.Add("X-Kin-Vm", "vm-1")
	inbound.Add("Authorization", "Bearer client")
	inbound.Add("Content-Length", "10")

	all := PassthroughHeaders([]string{"*"}, inbound)
	assert.Equal(t, http.Header{"X-Claude-Code-Agent-Id": {"a1"}, "X-Multi": {"one", "two"}}, all)

	byRegex := PassthroughHeaders([]string{"regex:^x-claude-"}, inbound)
	assert.Equal(t, http.Header{"X-Claude-Code-Agent-Id": {"a1"}}, byRegex)

	byName := PassthroughHeaders([]string{"x-multi"}, inbound)
	assert.Equal(t, http.Header{"X-Multi": {"one", "two"}}, byName)

	assert.Empty(t, PassthroughHeaders(nil, inbound))
}
