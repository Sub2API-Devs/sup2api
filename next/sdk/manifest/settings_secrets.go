package manifest

import (
	"encoding/json"
	"slices"
	"sort"
	"strconv"
	"strings"
)

// SecretField is a masked plugin setting (CONTRACTS §75.1). Credentials
// (writeOnly or format password) are values the plugin presents to someone
// else; sensitive fields (x-sensitive only) are addresses such as webhook
// URLs: masked on read, but not credentials themselves.
type SecretField struct {
	Path       []string
	Credential bool
}

// Pointer is the field's JSON pointer below the values ("a/b"; "~" and "/" in
// names escaped as in RFC 6901), the form schema errors use too.
func (f SecretField) Pointer() string {
	parts := make([]string, len(f.Path))
	for i, p := range f.Path {
		parts[i] = pointerEscaper.Replace(p)
	}
	return strings.Join(parts, "/")
}

var (
	pointerEscaper   = strings.NewReplacer("~", "~0", "/", "~1")
	pointerUnescaper = strings.NewReplacer("~1", "/", "~0", "~")
)

// MaxSecretDepth bounds the walk through nested object properties: a field
// may sit at most this many properties deep to be masked on its own.
const MaxSecretDepth = 8

// SettingsSecrets reads the secret markers (writeOnly, format password,
// x-sensitive) of a settings JSON Schema. It is the one reading of them: the
// packaging check and the core's masking both call it.
//
// fields are the markers a value path leads to - properties of nested object
// properties, at most MaxSecretDepth deep - sorted by pointer. A marked field
// is masked as a whole, so nothing below it is listed.
//
// unreachable are the schema locations (JSON pointers, sorted) of the markers
// no fixed value path leads to, which therefore cannot be masked one by one:
// those under items, additionalProperties, patternProperties, allOf/anyOf/
// oneOf, if/then/else, $defs and every other keyword holding a schema, those
// deeper than MaxSecretDepth, and each "$ref" whose target carries one. A
// package whose settings schema has any is refused at packaging time;
// UnmaskableFields says what the core masks for one that is already installed.
func SettingsSecrets(schema []byte) (fields []SecretField, unreachable []string) {
	var root map[string]any
	if json.Unmarshal(schema, &root) != nil || root == nil {
		return []SecretField{}, nil
	}
	w := &secretWalk{root: root, fields: []SecretField{}}
	if secret, _ := marked(root); secret {
		w.unreachable = append(w.unreachable, "")
	}
	w.object(root, nil, "")
	sort.Slice(w.fields, func(i, j int) bool { return w.fields[i].Pointer() < w.fields[j].Pointer() })
	slices.Sort(w.unreachable)
	return w.fields, slices.Compact(w.unreachable)
}

// UnmaskableFields turns the unreachable markers of SettingsSecrets into what
// has to be masked instead: the top-level settings that contain them, or all
// of them when a marker is not below one top-level property. Markers inside
// $defs/definitions are skipped: they only matter where a "$ref" uses them,
// and that location is reported on its own.
func UnmaskableFields(unreachable []string) (fields []string, all bool) {
	for _, loc := range unreachable {
		parts := strings.Split(strings.TrimPrefix(loc, "/"), "/")
		switch {
		case parts[0] == "$defs" || parts[0] == "definitions":
		case parts[0] == "properties" && len(parts) > 1:
			fields = append(fields, pointerUnescaper.Replace(parts[1]))
		default:
			all = true
		}
	}
	slices.Sort(fields)
	return slices.Compact(fields), all
}

// secretWalk collects the result of SettingsSecrets.
type secretWalk struct {
	root        map[string]any
	fields      []SecretField
	unreachable []string
}

// dataKeywords hold instance data, not schemas: nothing in them is a marker.
var dataKeywords = map[string]bool{"default": true, "examples": true, "const": true, "enum": true}

// schemaMaps are the keywords whose value maps names to schemas: its keys are
// names chosen by the author, not keywords.
var schemaMaps = map[string]bool{"properties": true, "patternProperties": true, "$defs": true, "definitions": true, "dependentSchemas": true}

// marked classifies the node's own markers.
func marked(node map[string]any) (secret, credential bool) {
	writeOnly, _ := node["writeOnly"].(bool)
	format, _ := node["format"].(string)
	sensitive, _ := node["x-sensitive"].(bool)
	credential = writeOnly || format == "password"
	return credential || sensitive, credential
}

// object walks a schema whose value is reached by path: its properties are
// reachable fields, everything else it holds is not.
func (w *secretWalk) object(node map[string]any, path []string, loc string) {
	if w.refMarked(node) {
		w.unreachable = append(w.unreachable, loc+"/$ref")
	}
	for key, val := range node {
		if key != "properties" {
			w.scan(key, val, loc+"/"+pointerEscaper.Replace(key))
			continue
		}
		props, _ := val.(map[string]any)
		for name, raw := range props {
			prop, ok := raw.(map[string]any)
			if !ok {
				continue
			}
			w.property(prop, append(slices.Clone(path), name), loc+"/properties/"+pointerEscaper.Replace(name))
		}
	}
}

// property handles one reachable property: a marked one is a field, an
// unmarked one is walked further while the depth allows.
func (w *secretWalk) property(prop map[string]any, path []string, loc string) {
	secret, credential := marked(prop)
	switch {
	case secret:
		w.fields = append(w.fields, SecretField{Path: path, Credential: credential})
	case len(path) >= MaxSecretDepth:
		w.scan("", prop, loc)
	default:
		w.object(prop, path, loc)
	}
}

// scan records every marker below val, a keyword's value no value path leads
// through, as unreachable.
func (w *secretWalk) scan(key string, val any, loc string) {
	if dataKeywords[key] {
		return
	}
	switch v := val.(type) {
	case []any:
		for i, item := range v {
			w.scan("", item, loc+"/"+strconv.Itoa(i))
		}
	case map[string]any:
		if schemaMaps[key] {
			for name, child := range v {
				w.scan("", child, loc+"/"+pointerEscaper.Replace(name))
			}
			return
		}
		if secret, _ := marked(v); secret {
			w.unreachable = append(w.unreachable, loc)
			return
		}
		if w.refMarked(v) {
			w.unreachable = append(w.unreachable, loc+"/$ref")
		}
		for k, child := range v {
			w.scan(k, child, loc+"/"+pointerEscaper.Replace(k))
		}
	}
}

// refMarked reports whether node references ("$ref", "$dynamicRef") a schema
// that carries a marker.
func (w *secretWalk) refMarked(node map[string]any) bool {
	for _, kw := range []string{"$ref", "$dynamicRef"} {
		if ref, ok := node[kw].(string); ok && w.targetMarked(ref, map[string]bool{}) {
			return true
		}
	}
	return false
}

// targetMarked reports whether the schema ref points to holds a marker,
// following further references. A reference that cannot be resolved inside the
// document (an anchor, another document) counts as marked when the document
// has any marker at all.
func (w *secretWalk) targetMarked(ref string, seen map[string]bool) bool {
	if seen[ref] {
		return false
	}
	seen[ref] = true
	target, ok := w.resolve(ref)
	if !ok {
		return w.holdsMarker("", w.root, nil)
	}
	return w.holdsMarker("", target, seen)
}

// resolve follows a same-document JSON pointer reference ("#", "#/a/b").
func (w *secretWalk) resolve(ref string) (any, bool) {
	if ref == "#" {
		return w.root, true
	}
	rest, ok := strings.CutPrefix(ref, "#/")
	if !ok {
		return nil, false
	}
	var cur any = w.root
	for _, part := range strings.Split(rest, "/") {
		part = pointerUnescaper.Replace(part)
		switch v := cur.(type) {
		case map[string]any:
			if cur, ok = v[part]; !ok {
				return nil, false
			}
		case []any:
			i, err := strconv.Atoi(part)
			if err != nil || i < 0 || i >= len(v) {
				return nil, false
			}
			cur = v[i]
		default:
			return nil, false
		}
	}
	return cur, true
}

// holdsMarker reports whether val, the value of keyword key ("" for a schema),
// or anything below it carries a marker. References are followed unless seen
// is nil.
func (w *secretWalk) holdsMarker(key string, val any, seen map[string]bool) bool {
	if dataKeywords[key] {
		return false
	}
	switch v := val.(type) {
	case string:
		return seen != nil && (key == "$ref" || key == "$dynamicRef") && w.targetMarked(v, seen)
	case []any:
		return slices.ContainsFunc(v, func(item any) bool { return w.holdsMarker("", item, seen) })
	case map[string]any:
		if secret, _ := marked(v); secret && !schemaMaps[key] {
			return true
		}
		for k, child := range v {
			if schemaMaps[key] {
				k = ""
			}
			if w.holdsMarker(k, child, seen) {
				return true
			}
		}
	}
	return false
}
