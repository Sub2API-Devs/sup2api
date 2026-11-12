package manifest

import (
	"fmt"
	"reflect"
	"strings"
	"testing"
	"time"
)

// nested wraps leaf in depth object properties named p1..p<depth>.
func nested(depth int, leaf string) string {
	s := leaf
	for i := depth; i >= 1; i-- {
		s = fmt.Sprintf(`{"type":"object","properties":{"p%d":%s}}`, i, s)
	}
	return s
}

func TestSettingsSecrets(t *testing.T) {
	const secret = `{"type":"string","writeOnly":true}`
	deepPath := func(n int) string {
		parts := make([]string, n)
		for i := range parts {
			parts[i] = fmt.Sprintf("p%d", i+1)
		}
		return strings.Join(parts, "/")
	}
	cases := []struct {
		name, schema string
		fields       map[string]bool // pointer -> credential
		unreachable  []string
	}{
		{name: "not a schema", schema: `not json`, unreachable: []string{""}},
		{name: "null", schema: `null`, unreachable: []string{""}},
		{name: "boolean schema", schema: `true`, unreachable: []string{""}},
		{name: "array", schema: `[{"writeOnly":true}]`, unreachable: []string{""}},
		{name: "empty schema", schema: `{}`},
		{name: "classification", schema: `{"properties":{
			"plain":{"type":"string"},
			"url":{"type":"string","x-sensitive":true},
			"key":{"type":"string","writeOnly":true},
			"pw":{"type":"string","format":"password"},
			"both":{"type":"string","writeOnly":true,"x-sensitive":true},
			"off":{"type":"string","writeOnly":false,"x-sensitive":false,"format":"uri"},
			"up":{"type":"object","properties":{"api/key":{"writeOnly":true},"a~b":{"x-sensitive":true}}}}}`,
			fields: map[string]bool{"url": false, "key": true, "pw": true, "both": true, "up/api~1key": true, "up/a~0b": false}},
		{name: "a marked object is one field", schema: `{"properties":{"creds":{"type":"object","writeOnly":true,
			"properties":{"inner":{"writeOnly":true}},"items":{"writeOnly":true}}}}`,
			fields: map[string]bool{"creds": true}},
		{name: "deepest reachable field", schema: nested(MaxSecretDepth, secret),
			fields: map[string]bool{deepPath(MaxSecretDepth): true}},
		{name: "beyond the depth limit", schema: nested(MaxSecretDepth+1, secret),
			unreachable: []string{"/properties/" + strings.ReplaceAll(deepPath(MaxSecretDepth+1), "/", "/properties/")}},
		{name: "items", schema: `{"properties":{"hooks":{"type":"array","items":{"type":"object","properties":{"token":{"writeOnly":true}}}}}}`,
			unreachable: []string{"/properties/hooks/items/properties/token"}},
		{name: "items itself and prefixItems", schema: `{"properties":{"keys":{"type":"array","items":{"format":"password"},"prefixItems":[{},{"x-sensitive":true}]}}}`,
			unreachable: []string{"/properties/keys/items", "/properties/keys/prefixItems/1"}},
		{name: "additionalProperties", schema: `{"properties":{"m":{"type":"object","additionalProperties":{"writeOnly":true}}}}`,
			unreachable: []string{"/properties/m/additionalProperties"}},
		{name: "patternProperties", schema: `{"properties":{"m":{"patternProperties":{"^k_":{"x-sensitive":true}}}}}`,
			unreachable: []string{"/properties/m/patternProperties/^k_"}},
		{name: "allOf anyOf oneOf", schema: `{"properties":{"a":{"allOf":[{"properties":{"x":{"writeOnly":true}}}]},
			"b":{"anyOf":[{"type":"string"},{"format":"password"}]},"c":{"oneOf":[{"x-sensitive":true}]}}}`,
			unreachable: []string{"/properties/a/allOf/0/properties/x", "/properties/b/anyOf/1", "/properties/c/oneOf/0"}},
		{name: "if then else", schema: `{"properties":{"a":{"if":{"properties":{"k":{"writeOnly":true}}},
			"then":{"properties":{"t":{"writeOnly":true}}},"else":{"properties":{"e":{"writeOnly":true}}}}}}`,
			unreachable: []string{"/properties/a/else/properties/e", "/properties/a/if/properties/k", "/properties/a/then/properties/t"}},
		{name: "root level keywords", schema: `{"allOf":[{"properties":{"x":{"writeOnly":true}}}],"additionalProperties":{"format":"password"}}`,
			unreachable: []string{"/additionalProperties", "/allOf/0/properties/x"}},
		{name: "marked root", schema: `{"type":"object","writeOnly":true}`, unreachable: []string{""}},
		{name: "$defs and the $ref using it", schema: `{"properties":{"a":{"$ref":"#/$defs/secret"},"b":{"$ref":"#/$defs/plain"},
			"c":{"type":"array","items":{"$ref":"#/$defs/via"}}},
			"$defs":{"secret":{"writeOnly":true},"plain":{"type":"string"},"via":{"properties":{"k":{"$ref":"#/$defs/secret"}}}}}`,
			unreachable: []string{"/$defs/secret", "/$defs/via/properties/k/$ref", "/properties/a/$ref", "/properties/b/$ref", "/properties/c/items/$ref"}},
		{name: "$ref to a reachable field", schema: `{"properties":{"a":{"writeOnly":true},"b":{"$ref":"#/properties/a"}}}`,
			fields: map[string]bool{"a": true}, unreachable: []string{"/properties/b/$ref"}},
		{name: "recursive $ref", schema: `{"properties":{"tree":{"$ref":"#/$defs/node"}},
			"$defs":{"node":{"properties":{"next":{"$ref":"#/$defs/node"},"k":{"writeOnly":true}}}}}`,
			unreachable: []string{"/$defs/node/properties/k", "/$defs/node/properties/next/$ref", "/properties/tree/$ref"}},
		{name: "recursive $ref without markers", schema: `{"properties":{"tree":{"$ref":"#/$defs/node"}},
			"$defs":{"node":{"properties":{"next":{"$ref":"#/$defs/node"}}}}}`},
		{name: "unresolvable $ref in a schema with markers", schema: `{"properties":{"a":{"writeOnly":true},"b":{"$ref":"#anchor"}}}`,
			fields: map[string]bool{"a": true}, unreachable: []string{"/properties/b/$ref"}},
		{name: "unresolvable $ref without markers", schema: `{"properties":{"b":{"$ref":"other.json"}}}`},
		{name: "properties named like keywords", schema: `{"properties":{"default":{"writeOnly":true},
			"list":{"type":"array","items":{"properties":{"enum":{"writeOnly":true},"writeOnly":{"type":"boolean"}}}},
			"r":{"$ref":"#/$defs/const"}},"$defs":{"const":{"properties":{"examples":{"format":"password"}}}}}`,
			fields:      map[string]bool{"default": true},
			unreachable: []string{"/$defs/const/properties/examples", "/properties/list/items/properties/enum", "/properties/r/$ref"}},
		{name: "$recursiveRef and $dynamicRef", schema: `{"$recursiveAnchor":true,"properties":{"key":{"writeOnly":true},
			"child":{"$recursiveRef":"#"},"dyn":{"$dynamicRef":"#node"}}}`,
			fields: map[string]bool{"key": true}, unreachable: []string{"/properties/child/$recursiveRef", "/properties/dyn/$dynamicRef"}},
		{name: "draft-07 dependencies", schema: `{"properties":{"default":{"type":"boolean"}},
			"dependencies":{"default":{"properties":{"k":{"writeOnly":true}}},"enum":["default"]}}`,
			unreachable: []string{"/dependencies/default/properties/k"}},
		{name: "percent-encoded $ref", schema: `{"properties":{"a":{"properties":{"k":{"writeOnly":true}}},"b":{"$ref":"#/properties/%61"},"%61":{}}}`,
			fields: map[string]bool{"a/k": true}, unreachable: []string{"/properties/b/$ref"}},
		{name: "$ref below an embedded $id", schema: `{"properties":{"s":{},"b":{"$id":"http://e/x",
			"properties":{"c":{"$ref":"#/properties/s"},"s":{"properties":{"k":{"writeOnly":true}}}}}}}`,
			fields: map[string]bool{"b/s/k": true}, unreachable: []string{"/properties/b/properties/c/$ref"}},
		{name: "$ref into a data keyword", schema: `{"properties":{"a":{"$ref":"#/properties/x/default"},
			"x":{"default":{"properties":{"k":{"writeOnly":true}}}}}}`,
			unreachable: []string{"/properties/a/$ref"}},
		{name: "a property named $ref is not a reference", schema: `{"properties":{"k":{"writeOnly":true},"$ref":{"type":"string"}}}`,
			fields: map[string]bool{"k": true}},
		{name: "data keywords are not schemas", schema: `{"properties":{"a":{"type":"object","default":{"writeOnly":true},
			"examples":[{"format":"password"}],"const":{"x-sensitive":true},"enum":[{"writeOnly":true}]}}}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			fields, unreachable := SettingsSecrets([]byte(tc.schema))
			if fields == nil {
				t.Fatal("fields must not be nil")
			}
			got := map[string]bool{}
			for i, f := range fields {
				got[f.Pointer()] = f.Credential
				if i > 0 && fields[i-1].Pointer() >= f.Pointer() {
					t.Fatalf("fields not sorted: %v", fields)
				}
			}
			if tc.fields == nil {
				tc.fields = map[string]bool{}
			}
			if !reflect.DeepEqual(got, tc.fields) {
				t.Errorf("fields = %v, want %v", got, tc.fields)
			}
			if !reflect.DeepEqual(unreachable, tc.unreachable) {
				t.Errorf("unreachable = %q, want %q", unreachable, tc.unreachable)
			}
		})
	}
}

func TestUnmaskableFields(t *testing.T) {
	cases := []struct {
		name        string
		unreachable []string
		fields      []string
		all         bool
	}{
		{name: "none"},
		{name: "below top-level properties", fields: []string{"a/b", "hooks"},
			unreachable: []string{"/properties/hooks/items/properties/token", "/properties/a~1b/$ref", "/properties/hooks/items"}},
		{name: "$defs alone are judged where they are used", unreachable: []string{"/$defs/secret", "/definitions/x/properties/k"}},
		{name: "root keyword", unreachable: []string{"/properties/a/items", "/allOf/0/properties/x"}, fields: []string{"a"}, all: true},
		{name: "root reference", unreachable: []string{"/$ref"}, all: true},
		{name: "marked root", unreachable: []string{""}, all: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			fields, all := UnmaskableFields(tc.unreachable)
			if !reflect.DeepEqual(fields, tc.fields) || all != tc.all {
				t.Fatalf("= %q, %v; want %q, %v", fields, all, tc.fields, tc.all)
			}
		})
	}
}

// A schema is uploaded with a package: reading it must stay cheap however its
// references are arranged.
func TestSettingsSecretsCostIsLinear(t *testing.T) {
	var b strings.Builder
	b.WriteString(`{"properties":{"k":{"writeOnly":true}`)
	const n = 20000
	for i := range n {
		fmt.Fprintf(&b, `,"p%d":{"allOf":[{"$ref":"#"},{"$ref":"#/properties/p%d"},{"$ref":"#anchor"}]}`, i, (i+1)%n)
	}
	b.WriteString(`}}`)
	start := time.Now()
	fields, unreachable := SettingsSecrets([]byte(b.String()))
	if len(fields) != 1 || len(unreachable) != 3*n {
		t.Fatalf("fields %d, unreachable %d", len(fields), len(unreachable))
	}
	if d := time.Since(start); d > 5*time.Second {
		t.Fatalf("took %s", d)
	}
}
