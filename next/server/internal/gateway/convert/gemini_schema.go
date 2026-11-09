package convert

import (
	"slices"
	"strings"
)

// Gemini takes JSON Schema as is (parametersJsonSchema, responseJsonSchema),
// so a conversion to Gemini passes schemas through. A Gemini client may give
// the older Schema form instead (parameters, responseSchema): an OpenAPI 3.0
// subset with upper-case type names and nullable, converted here to the JSON
// Schema OpenAI tools and formats take (CONVERT-MATRIX §9.1, §9.3).

// Members of a Gemini Schema whose values are schemas: a map of them, a list
// of them, or one.
var (
	schemaMapMembers  = []string{"properties", "$defs", "definitions", "patternProperties"}
	schemaListMembers = []string{"anyOf", "oneOf", "allOf", "prefixItems"}
	schemaOneMembers  = []string{"items", "additionalProperties", "not"}
)

// openAPISchema returns the JSON Schema of a Gemini Schema at path: type
// names in lower case, nullable folded into the type, and propertyOrdering
// (a Gemini generation hint JSON Schema has no keyword for) left out as an
// "other" loss. Other keywords are the same in both and kept.
func openAPISchema(v any, path string, l *losses) any {
	o, ok := v.(jobject)
	if !ok {
		return v
	}
	out := make(jobject, len(o))
	for k, x := range o {
		p := path + "." + k
		switch {
		case k == "type":
			out[k] = lowerType(x)
		case k == "nullable":
		case k == "propertyOrdering":
			l.add(LossOther, p)
		case slices.Contains(schemaMapMembers, k):
			out[k] = mapSchemas(x, p, l)
		case slices.Contains(schemaListMembers, k):
			out[k] = listSchemas(x, p, l)
		case slices.Contains(schemaOneMembers, k):
			out[k] = openAPISchema(x, p, l)
		default:
			out[k] = x
		}
	}
	if o["nullable"] == true {
		out["type"] = withNull(out["type"])
	}
	return out
}

func lowerType(v any) any {
	if s, ok := v.(string); ok {
		return strings.ToLower(s)
	}
	return v
}

// withNull adds "null" to a JSON Schema type; a schema without a type is
// left as it is (any value already includes null).
func withNull(t any) any {
	switch x := t.(type) {
	case string:
		if x != "null" {
			return []any{x, "null"}
		}
	case []any:
		if !slices.Contains(x, any("null")) {
			return append(x, "null")
		}
	}
	return t
}

func mapSchemas(v any, path string, l *losses) any {
	m, ok := v.(jobject)
	if !ok {
		return v
	}
	out := make(jobject, len(m))
	for k, x := range m {
		out[k] = openAPISchema(x, path+"."+k, l)
	}
	return out
}

func listSchemas(v any, path string, l *losses) any {
	list, ok := v.([]any)
	if !ok {
		return v
	}
	out := make([]any, len(list))
	for i, x := range list {
		out[i] = openAPISchema(x, jpos(path, i), l)
	}
	return out
}
