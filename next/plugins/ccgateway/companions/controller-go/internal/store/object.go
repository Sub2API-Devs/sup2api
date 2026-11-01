package store

import (
	"errors"
	"fmt"
	"sort"

	"ccgateway/controller/internal/pyjson"
)

// Opt is a value that may be absent from a JSON object (Python dict.get /
// pop semantics): Set=false means the key is missing and is not written.
type Opt[T any] struct {
	Set bool
	V   T
}

// Some is a present value.
func Some[T any](v T) Opt[T] { return Opt[T]{Set: true, V: v} }

// Get is (value, present).
func (o Opt[T]) Get() (T, bool) { return o.V, o.Set }

// Or is dict.get(key, def).
func (o Opt[T]) Or(def T) T {
	if o.Set {
		return o.V
	}
	return def
}

// spec is one known key of an object kept in file order.
type spec struct {
	key     string
	present func() bool
	get     func() any // the value to encode
	set     func(any) error
	unset   func()
}

// object is the order and unknown keys of a typed JSON object: decoding
// keeps the file's key order, encoding writes the keys in that order, then
// newly set known keys in their canonical order, so a file read and written
// back unchanged is byte-identical to what Python wrote.
type object struct {
	order []string
	Extra pyjson.Ordered // unknown keys, in file order (exported for tests and callers)
}

func (o *object) decode(raw pyjson.Ordered, specs []spec) error {
	o.order = o.order[:0]
	o.Extra = nil
	byKey := make(map[string]spec, len(specs))
	for _, s := range specs {
		byKey[s.key] = s
		s.unset()
	}
	for _, kv := range raw {
		o.order = append(o.order, kv.Key)
		if s, ok := byKey[kv.Key]; ok {
			if err := s.set(kv.Value); err != nil {
				return fmt.Errorf("%s: %w", kv.Key, err)
			}
			continue
		}
		o.Extra = append(o.Extra, kv)
	}
	return nil
}

func (o *object) encode(specs []spec) pyjson.Ordered {
	byKey := make(map[string]spec, len(specs))
	for _, s := range specs {
		byKey[s.key] = s
	}
	out := pyjson.Ordered{}
	written := map[string]bool{}
	for _, k := range o.order {
		if written[k] {
			continue
		}
		if s, ok := byKey[k]; ok {
			if s.present() {
				out = append(out, pyjson.KV{Key: k, Value: s.get()})
				written[k] = true
			}
			continue
		}
		if v, ok := o.Extra.Get(k); ok {
			out = append(out, pyjson.KV{Key: k, Value: v})
			written[k] = true
		}
	}
	for _, s := range specs {
		if !written[s.key] && s.present() {
			out = append(out, pyjson.KV{Key: s.key, Value: s.get()})
			written[s.key] = true
		}
	}
	for _, kv := range o.Extra {
		if !written[kv.Key] {
			out = append(out, kv)
			written[kv.Key] = true
		}
	}
	return out
}

// pop removes key from the order (a later assignment appends it, as a
// Python dict does after pop).
func (o *object) pop(key string) {
	for i, k := range o.order {
		if k == key {
			o.order = append(o.order[:i:i], o.order[i+1:]...)
			return
		}
	}
}

// keys present, in output order.
func (o *object) keysOf(specs []spec) []string { return o.encode(specs).Keys() }

var errType = errors.New("unexpected JSON type")

func asString(v any) (string, error) {
	s, ok := v.(string)
	if !ok {
		return "", errType
	}
	return s, nil
}

func asBool(v any) (bool, error) {
	b, ok := v.(bool)
	if !ok {
		return false, errType
	}
	return b, nil
}

func asInt(v any) (int64, error) {
	if !pyjson.IsInt(v) {
		return 0, errType
	}
	return pyjson.IntOf(v)
}

func asObject(v any) (pyjson.Ordered, error) {
	o, ok := v.(pyjson.Ordered)
	if !ok {
		return nil, errType
	}
	return o, nil
}

// has reports whether key is in the object's order (read from the file or
// assigned through mark).
func (o *object) has(key string) bool {
	for _, k := range o.order {
		if k == key {
			return true
		}
	}
	return false
}

// mark appends keys that are not in the order yet (a new Python dict literal).
func (o *object) mark(keys ...string) {
	for _, k := range keys {
		if !o.has(k) {
			o.order = append(o.order, k)
		}
	}
}

// strField is a plain string key: present when it is in the order (read, or
// created by a constructor) or non-empty.
func strField(o *object, key string, dst *string) spec {
	return spec{
		key:     key,
		present: func() bool { return *dst != "" || o.has(key) },
		get:     func() any { return *dst },
		set: func(v any) error {
			s, err := asString(v)
			*dst = s
			return err
		},
		unset: func() { *dst = "" },
	}
}

func optField[T any](key string, dst *Opt[T], conv func(any) (T, error), enc func(T) any) spec {
	return spec{
		key:     key,
		present: func() bool { return dst.Set },
		get: func() any {
			if enc != nil {
				return enc(dst.V)
			}
			return dst.V
		},
		set: func(v any) error {
			t, err := conv(v)
			if err != nil {
				return err
			}
			*dst = Some(t)
			return nil
		},
		unset: func() { *dst = Opt[T]{} },
	}
}

func anyConv(v any) (any, error) { return v, nil }

func sortedKeys[T any](m map[string]T) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}
