package manifest

import (
	"encoding/json"
	"maps"
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

// Bounds of following local references (SettingsSecrets): how many may be
// followed inside one another, and how many schema nodes all expansions may
// visit together. Past either, the reference is unreachable.
const (
	MaxSecretRefDepth = 32
	MaxSecretRefNodes = 10000
)

// SettingsSecrets reads the secret markers (writeOnly, format password,
// x-sensitive) of a settings JSON Schema. It is the one reading of them: the
// packaging check and the core's masking both call it.
//
// fields are the markers a value path leads to - properties of nested object
// properties, at most MaxSecretDepth deep - sorted by pointer. A marked field
// is masked as a whole, so nothing below it is listed.
//
// A local reference "#/$defs/<name>" or "#/definitions/<name>" (one RFC 6901
// token, ~0 and ~1 decoded, nothing percent-encoded) to the root's $defs or
// definitions is followed as if the target were written in its place: the
// target's markers and properties count where the reference stands. The
// root's $defs and definitions are only read through such references.
// Expansion is bounded: a target is followed once per value path, a target
// already being followed (a cycle), more than MaxSecretRefDepth references
// inside one another, or more than MaxSecretRefNodes nodes visited by all
// expansions leave the reference unreachable. A reference whose target holds
// no marker (directly or through further references) is not followed.
//
// unreachable are the schema locations (JSON pointers, sorted) of the markers
// no fixed value path leads to, which therefore cannot be masked one by one:
// those under items, additionalProperties, patternProperties, allOf/anyOf/
// oneOf, if/then/else, a nested $defs and every other keyword holding a
// schema, and those deeper than MaxSecretDepth. A marker reached through a
// reference is reported below the reference ("/properties/a/$ref/items").
// In a schema that holds any marker, every other reference is unreachable
// too: "$dynamicRef", "$recursiveRef", any other "$ref" form (external,
// anchors, other pointers), any reference below a nested "$id" (which
// changes the base URI), and a local reference to a marked target from where
// no value path leads. The root itself ("") is unreachable when it is marked
// or the schema is not a JSON object. A package whose settings schema has any
// is refused at packaging time; UnmaskableFields says what the core masks for
// one that is already installed.
//
// The walk visits every schema node once, plus at most MaxSecretRefNodes
// through references; each level copies its location path, so the cost also
// grows with the nesting depth.
func SettingsSecrets(schema []byte) (fields []SecretField, unreachable []string) {
	var root map[string]any
	if json.Unmarshal(schema, &root) != nil || root == nil {
		return []SecretField{}, []string{""}
	}
	w := newSecretWalk(root)
	if secret, _ := marked(root); secret {
		w.unreachable = append(w.unreachable, "")
	}
	body := maps.Clone(root)
	delete(body, "$defs")
	delete(body, "definitions")
	w.object(body, at{})
	slices.Sort(w.unreachable)
	return w.sortedFields(), slices.Compact(w.unreachable)
}

// UnmaskableFields turns the unreachable markers of SettingsSecrets into what
// has to be masked instead: the top-level settings that contain them, or all
// of them when a marker is not below one top-level property.
func UnmaskableFields(unreachable []string) (fields []string, all bool) {
	for _, loc := range unreachable {
		parts := strings.Split(strings.TrimPrefix(loc, "/"), "/")
		if parts[0] == "properties" && len(parts) > 1 {
			fields = append(fields, pointerUnescaper.Replace(parts[1]))
			continue
		}
		all = true
	}
	slices.Sort(fields)
	return slices.Compact(fields), all
}

// secretWalk collects the result of SettingsSecrets.
type secretWalk struct {
	// refsUnreachable: the schema holds a marker somewhere, so no reference
	// in it can be trusted to lead away from one unless it is followed.
	refsUnreachable bool
	// defs are the root's $defs and definitions by local reference; marking
	// those that lead to a marker or to a reference not followed.
	defs        map[string]map[string]any
	marking     map[string]bool
	fields      []SecretField
	unreachable []string
	// following are the targets being expanded; followed the (value path,
	// target) pairs done; nodes counts the nodes expansions visited.
	following map[string]bool
	followed  map[string]bool
	nodes     int
}

// at is where the walk stands: the value path (nil where none leads), the
// schema location, and whether a nested $id changed the base URI.
type at struct {
	path    []string
	loc     string
	rebased bool
}

// dataKeywords hold instance data, not schemas: nothing in them is a marker.
var dataKeywords = map[string]bool{"default": true, "examples": true, "const": true, "enum": true}

// schemaMaps are the keywords whose value maps names to schemas: its keys are
// names chosen by the author, not keywords. ("dependencies" is the draft-07
// form of dependentSchemas.)
var schemaMaps = map[string]bool{"properties": true, "patternProperties": true, "$defs": true, "definitions": true,
	"dependentSchemas": true, "dependencies": true}

// refKeywords reference another schema.
var refKeywords = []string{"$ref", "$dynamicRef", "$recursiveRef"}

// marked classifies the node's own markers.
func marked(node map[string]any) (secret, credential bool) {
	writeOnly, _ := node["writeOnly"].(bool)
	format, _ := node["format"].(string)
	sensitive, _ := node["x-sensitive"].(bool)
	credential = writeOnly || format == "password"
	return credential || sensitive, credential
}

// holdsMarker reports whether any object below val looks marked. It reads
// every value, data keywords included: a reference may point anywhere.
func holdsMarker(val any) bool {
	switch v := val.(type) {
	case []any:
		return slices.ContainsFunc(v, holdsMarker)
	case map[string]any:
		if secret, _ := marked(v); secret {
			return true
		}
		for _, child := range v {
			if holdsMarker(child) {
				return true
			}
		}
	}
	return false
}

// localRef is the root definition a "$ref" value names in one of the two
// supported forms, "" for any other value.
func localRef(ref string) string {
	for _, kw := range []string{"$defs", "definitions"} {
		token, ok := strings.CutPrefix(ref, "#/"+kw+"/")
		if ok && validToken(token) {
			return kw + "/" + pointerUnescaper.Replace(token)
		}
	}
	return ""
}

// validToken: one non-empty RFC 6901 reference token whose every "~" starts
// "~0" or "~1", not percent-encoded.
func validToken(token string) bool {
	if token == "" || strings.ContainsAny(token, "/%") {
		return false
	}
	for i := range len(token) {
		if token[i] == '~' && (i+1 == len(token) || (token[i+1] != '0' && token[i+1] != '1')) {
			return false
		}
	}
	return true
}

// hasID reports a node's own "$id", which changes the base URI below it.
func hasID(node map[string]any) bool {
	_, ok := node["$id"].(string)
	return ok
}

func newSecretWalk(root map[string]any) *secretWalk {
	w := &secretWalk{refsUnreachable: holdsMarker(root), defs: map[string]map[string]any{},
		following: map[string]bool{}, followed: map[string]bool{}, fields: []SecretField{}}
	for _, kw := range []string{"$defs", "definitions"} {
		defs, _ := root[kw].(map[string]any)
		for name, raw := range defs {
			if def, ok := raw.(map[string]any); ok {
				w.defs[kw+"/"+name] = def
			}
		}
	}
	w.marking = w.markingDefs()
	return w
}

// markingDefs are the definitions that lead to a marker: holding one, a
// reference not followed (in a schema with markers), or a local reference to
// such a definition. Found backwards from the ones that hold or refer out,
// so cycles cost nothing extra.
func (w *secretWalk) markingDefs() map[string]bool {
	marking := map[string]bool{}
	users := map[string][]string{} // target -> definitions referring to it
	var queue []string
	for key, def := range w.defs {
		direct := holdsMarker(def)
		eachRef(def, false, func(kw, ref string, rebased bool) {
			if target := localRef(ref); kw == "$ref" && !rebased && w.defs[target] != nil {
				users[target] = append(users[target], key)
			} else if w.refsUnreachable {
				direct = true
			}
		})
		if direct {
			marking[key] = true
			queue = append(queue, key)
		}
	}
	for len(queue) > 0 {
		key := queue[0]
		queue = queue[1:]
		for _, user := range users[key] {
			if !marking[user] {
				marking[user] = true
				queue = append(queue, user)
			}
		}
	}
	return marking
}

// eachRef calls fn for every reference below val; rebased says a nested $id
// stands between (the definition's own $id included).
func eachRef(val any, rebased bool, fn func(kw, ref string, rebased bool)) {
	switch v := val.(type) {
	case []any:
		for _, item := range v {
			eachRef(item, rebased, fn)
		}
	case map[string]any:
		rebased = rebased || hasID(v)
		for _, kw := range refKeywords {
			if ref, ok := v[kw].(string); ok {
				fn(kw, ref, rebased)
			}
		}
		for _, child := range v {
			eachRef(child, rebased, fn)
		}
	}
}

// target is the marking definition the node's "$ref" follows to, if any.
func (w *secretWalk) target(node map[string]any, rebased bool) string {
	ref, _ := node["$ref"].(string)
	if key := localRef(ref); !rebased && w.marking[key] {
		return key
	}
	return ""
}

// refs records the references of a schema node: where a value path leads
// they are followed, elsewhere a marking one is unreachable, and one that
// is not followed is unreachable in a schema with markers.
func (w *secretWalk) refs(node map[string]any, pos at) {
	for _, kw := range refKeywords {
		ref, ok := node[kw].(string)
		if !ok {
			continue
		}
		key := localRef(ref)
		switch {
		case kw == "$ref" && !pos.rebased && w.defs[key] != nil && !w.marking[key]:
		case kw == "$ref" && !pos.rebased && w.defs[key] != nil && pos.path != nil:
			w.follow(key, pos)
		case w.refsUnreachable:
			w.unreachable = append(w.unreachable, pos.loc+"/"+kw)
		}
	}
}

// follow walks the marking definition key where pos stands, as if written
// there, within the expansion bounds.
func (w *secretWalk) follow(key string, pos at) {
	done := pointerOf(pos.path) + "\x00" + key
	if w.followed[done] {
		return
	}
	loc := pos.loc + "/$ref"
	if w.following[key] || len(w.following) >= MaxSecretRefDepth || w.nodes >= MaxSecretRefNodes {
		w.unreachable = append(w.unreachable, loc)
		return
	}
	w.followed[done] = true
	w.following[key] = true
	defer delete(w.following, key)
	def := w.defs[key]
	if secret, _ := marked(def); secret { // the root's target, or a cycle's
		w.unreachable = append(w.unreachable, loc)
		return
	}
	w.object(def, at{path: pos.path, loc: loc, rebased: hasID(def)})
}

// visit counts a node an expansion reaches.
func (w *secretWalk) visit() {
	if len(w.following) > 0 {
		w.nodes++
	}
}

// object walks a schema whose value is reached by pos.path: its properties
// are reachable fields, everything else it holds is not.
func (w *secretWalk) object(node map[string]any, pos at) {
	w.visit()
	if pos.path == nil {
		pos.path = []string{}
	}
	w.refs(node, pos)
	for key, val := range node {
		if key != "properties" {
			w.scan(key, val, at{loc: pos.loc + "/" + pointerEscaper.Replace(key), rebased: pos.rebased})
			continue
		}
		props, _ := val.(map[string]any)
		for name, raw := range props {
			prop, ok := raw.(map[string]any)
			if !ok {
				continue
			}
			w.property(prop, at{path: append(slices.Clone(pos.path), name),
				loc: pos.loc + "/properties/" + pointerEscaper.Replace(name), rebased: pos.rebased || hasID(prop)})
		}
	}
}

// property handles one reachable property: a marked one (by itself or
// through the definitions its $ref follows to) is a field, an unmarked one
// is walked further while the depth allows.
func (w *secretWalk) property(prop map[string]any, pos at) {
	secret, credential := w.markedThrough(prop, pos.rebased)
	switch {
	case secret:
		w.fields = append(w.fields, SecretField{Path: pos.path, Credential: credential})
	case len(pos.path) >= MaxSecretDepth:
		w.scan("", prop, at{loc: pos.loc, rebased: pos.rebased})
	default:
		w.object(prop, pos)
	}
}

// markedThrough is marked for node, or else for the chain of definitions its
// "$ref" leads through (at most MaxSecretRefDepth, a cycle ends it).
func (w *secretWalk) markedThrough(node map[string]any, rebased bool) (secret, credential bool) {
	seen := map[string]bool{}
	for range MaxSecretRefDepth {
		if secret, credential = marked(node); secret {
			return
		}
		key := w.target(node, rebased)
		if key == "" || seen[key] {
			return
		}
		seen[key] = true
		node = w.defs[key]
		rebased = hasID(node)
	}
	return
}

// scan records every marker below val, the value of keyword key ("" for a
// schema) that no value path leads through, as unreachable.
func (w *secretWalk) scan(key string, val any, pos at) {
	if dataKeywords[key] {
		return
	}
	switch v := val.(type) {
	case []any:
		for i, item := range v {
			w.scan("", item, at{loc: pos.loc + "/" + strconv.Itoa(i), rebased: pos.rebased})
		}
	case map[string]any:
		if schemaMaps[key] {
			for name, child := range v {
				w.scan("", child, at{loc: pos.loc + "/" + pointerEscaper.Replace(name), rebased: pos.rebased})
			}
			return
		}
		w.visit()
		pos.rebased = pos.rebased || hasID(v)
		if secret, _ := marked(v); secret {
			w.unreachable = append(w.unreachable, pos.loc)
			return
		}
		w.refs(v, pos)
		for k, child := range v {
			w.scan(k, child, at{loc: pos.loc + "/" + pointerEscaper.Replace(k), rebased: pos.rebased})
		}
	}
}

// sortedFields sorts the fields by pointer, one per pointer: a field reached
// both directly and through a reference is a credential if either says so.
func (w *secretWalk) sortedFields() []SecretField {
	sort.SliceStable(w.fields, func(i, j int) bool { return w.fields[i].Pointer() < w.fields[j].Pointer() })
	out := w.fields[:0]
	for _, f := range w.fields {
		if n := len(out); n > 0 && out[n-1].Pointer() == f.Pointer() {
			out[n-1].Credential = out[n-1].Credential || f.Credential
			continue
		}
		out = append(out, f)
	}
	return out
}

func pointerOf(path []string) string { return SecretField{Path: path}.Pointer() }
