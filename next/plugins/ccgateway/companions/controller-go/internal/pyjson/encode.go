// Package pyjson reproduces the bytes of Python's json.dumps with its
// default arguments (ensure_ascii=True, separators ", " and ": ",
// allow_nan=True), with and without sort_keys, plus the small pieces of
// Python semantics the controller's validation depends on (truthiness,
// int(), str.isspace, urllib.parse.urlsplit, ipaddress).
//
// Why: the credential fingerprint, container_identity, the outbound tag and
// the cleanup identity are digests or byte copies of json.dumps output that
// Python 0.1.118 stored (02 §6.4). Go's encoding/json differs (compact,
// escapes <>&, no \u escaping of non-ASCII), so it can never be used for them.
//
// Values understood by Marshal:
//   - nil (null), bool, string, every int and uint kind, float32/float64
//     (Python float repr), json.Number (an integer literal stays an int, any
//     other literal is a Python float), json.RawMessage (decoded in order and
//     re-encoded);
//   - Ordered (a Python dict: insertion order kept unless sorting);
//   - map[string]T (keys always sorted: a Go map has no insertion order);
//   - slices and arrays (a nil slice is [], a nil map is {});
//   - structs (exported fields in declaration order, `json` tag names,
//     "-" and omitempty honoured; fields sorted by name when sorting);
//   - pointers and interfaces (nil is null);
//   - any type implementing Valuer (encoded as the value it returns).
//
// FROZEN: Marshal, MarshalSorted, Decode, Ordered and the helpers are used by
// every package that writes state, labels, digests or HTTP answers.
package pyjson

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"math/big"
	"reflect"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"unicode/utf8"
)

// KV is one key of an Ordered object.
type KV struct {
	Key   string
	Value any
}

// Ordered is a JSON object that keeps Python dict insertion order.
type Ordered []KV

// Get is dict.get: the value of key and whether it is present.
func (o Ordered) Get(key string) (any, bool) {
	for _, kv := range o {
		if kv.Key == key {
			return kv.Value, true
		}
	}
	return nil, false
}

// Has reports whether key is present.
func (o Ordered) Has(key string) bool {
	_, ok := o.Get(key)
	return ok
}

// Set is d[key] = value: an existing key keeps its position.
func (o *Ordered) Set(key string, value any) {
	for i := range *o {
		if (*o)[i].Key == key {
			(*o)[i].Value = value
			return
		}
	}
	*o = append(*o, KV{key, value})
}

// Delete is d.pop(key, None); it reports whether the key was present.
func (o *Ordered) Delete(key string) bool {
	for i := range *o {
		if (*o)[i].Key == key {
			*o = append((*o)[:i:i], (*o)[i+1:]...)
			return true
		}
	}
	return false
}

// Keys in order.
func (o Ordered) Keys() []string {
	out := make([]string, len(o))
	for i, kv := range o {
		out[i] = kv.Key
	}
	return out
}

// Clone is a shallow copy (the values are shared).
func (o Ordered) Clone() Ordered { return append(Ordered(nil), o...) }

// Valuer is implemented by types that encode as another value (typically an
// Ordered with Python's key order).
type Valuer interface {
	PyValue() any
}

// Marshal is json.dumps(v).
func Marshal(v any) ([]byte, error) { return encode(v, false) }

// MarshalSorted is json.dumps(v, sort_keys=True).
func MarshalSorted(v any) ([]byte, error) { return encode(v, true) }

// MustMarshal is Marshal for values known to be encodable; it panics otherwise.
func MustMarshal(v any) []byte {
	b, err := Marshal(v)
	if err != nil {
		panic(err)
	}
	return b
}

// MustMarshalSorted is MarshalSorted for values known to be encodable.
func MustMarshalSorted(v any) []byte {
	b, err := MarshalSorted(v)
	if err != nil {
		panic(err)
	}
	return b
}

func encode(v any, sortKeys bool) ([]byte, error) {
	e := &encoder{sort: sortKeys}
	if err := e.value(v, 0); err != nil {
		return nil, err
	}
	return e.buf.Bytes(), nil
}

type encoder struct {
	buf  bytes.Buffer
	sort bool
}

const maxDepth = 1000 // Python's default recursion limit is of the same order

var (
	numberType  = reflect.TypeOf(json.Number(""))
	rawType     = reflect.TypeOf(json.RawMessage(nil))
	orderedType = reflect.TypeOf(Ordered(nil))
	valuerType  = reflect.TypeOf((*Valuer)(nil)).Elem()
)

func (e *encoder) value(v any, depth int) error {
	if depth > maxDepth {
		return fmt.Errorf("pyjson: nesting too deep")
	}
	switch x := v.(type) {
	case nil:
		e.buf.WriteString("null")
		return nil
	case Valuer:
		if rv := reflect.ValueOf(x); rv.Kind() == reflect.Pointer && rv.IsNil() {
			e.buf.WriteString("null")
			return nil
		}
		return e.value(x.PyValue(), depth+1)
	case json.RawMessage:
		if x == nil {
			e.buf.WriteString("null")
			return nil
		}
		d, err := Decode(x)
		if err != nil {
			return err
		}
		return e.value(d, depth+1)
	case json.Number:
		return e.number(x)
	case Ordered:
		return e.ordered(x, depth)
	case *Ordered:
		if x == nil {
			e.buf.WriteString("null")
			return nil
		}
		return e.ordered(*x, depth)
	case bool:
		if x {
			e.buf.WriteString("true")
		} else {
			e.buf.WriteString("false")
		}
		return nil
	case string:
		writeString(&e.buf, x)
		return nil
	case float64:
		e.buf.WriteString(FloatRepr(x))
		return nil
	case float32:
		e.buf.WriteString(FloatRepr(float64(x)))
		return nil
	case int:
		e.buf.WriteString(strconv.FormatInt(int64(x), 10))
		return nil
	case int64:
		e.buf.WriteString(strconv.FormatInt(x, 10))
		return nil
	case []any:
		return e.list(len(x), func(i int) any { return x[i] }, depth)
	case map[string]any:
		return e.mapValue(reflect.ValueOf(x), depth)
	}
	return e.reflect(reflect.ValueOf(v), depth)
}

func (e *encoder) reflect(rv reflect.Value, depth int) error {
	switch rv.Kind() {
	case reflect.Invalid:
		e.buf.WriteString("null")
		return nil
	case reflect.Pointer, reflect.Interface:
		if rv.IsNil() {
			e.buf.WriteString("null")
			return nil
		}
		return e.value(rv.Elem().Interface(), depth+1)
	case reflect.Bool:
		return e.value(rv.Bool(), depth)
	case reflect.String:
		if rv.Type() == numberType {
			return e.number(json.Number(rv.String()))
		}
		writeString(&e.buf, rv.String())
		return nil
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		e.buf.WriteString(strconv.FormatInt(rv.Int(), 10))
		return nil
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64, reflect.Uintptr:
		e.buf.WriteString(strconv.FormatUint(rv.Uint(), 10))
		return nil
	case reflect.Float32, reflect.Float64:
		e.buf.WriteString(FloatRepr(rv.Float()))
		return nil
	case reflect.Slice:
		if rv.Type() == rawType {
			return e.value(json.RawMessage(rv.Bytes()), depth)
		}
		if rv.Type() == orderedType {
			return e.ordered(rv.Interface().(Ordered), depth)
		}
		if rv.Type().Elem().Kind() == reflect.Uint8 {
			return fmt.Errorf("pyjson: cannot encode %s", rv.Type())
		}
		return e.list(rv.Len(), func(i int) any { return rv.Index(i).Interface() }, depth)
	case reflect.Array:
		return e.list(rv.Len(), func(i int) any { return rv.Index(i).Interface() }, depth)
	case reflect.Map:
		if rv.Type().Key().Kind() != reflect.String {
			return fmt.Errorf("pyjson: map key type %s", rv.Type().Key())
		}
		return e.mapValue(rv, depth)
	case reflect.Struct:
		return e.structValue(rv, depth)
	}
	return fmt.Errorf("pyjson: cannot encode %s", rv.Type())
}

func (e *encoder) list(n int, at func(int) any, depth int) error {
	e.buf.WriteByte('[')
	for i := 0; i < n; i++ {
		if i > 0 {
			e.buf.WriteString(", ")
		}
		if err := e.value(at(i), depth+1); err != nil {
			return err
		}
	}
	e.buf.WriteByte(']')
	return nil
}

func (e *encoder) object(keys []string, at func(int) any, depth int) error {
	order := make([]int, len(keys))
	for i := range order {
		order[i] = i
	}
	if e.sort {
		sort.SliceStable(order, func(a, b int) bool { return keys[order[a]] < keys[order[b]] })
	}
	e.buf.WriteByte('{')
	for n, i := range order {
		if n > 0 {
			e.buf.WriteString(", ")
		}
		writeString(&e.buf, keys[i])
		e.buf.WriteString(": ")
		if err := e.value(at(i), depth+1); err != nil {
			return err
		}
	}
	e.buf.WriteByte('}')
	return nil
}

func (e *encoder) ordered(o Ordered, depth int) error {
	keys := make([]string, len(o))
	for i, kv := range o {
		keys[i] = kv.Key
	}
	return e.object(keys, func(i int) any { return o[i].Value }, depth)
}

func (e *encoder) mapValue(rv reflect.Value, depth int) error {
	keys := make([]string, 0, rv.Len())
	for _, k := range rv.MapKeys() {
		keys = append(keys, k.String())
	}
	sort.Strings(keys) // no insertion order to keep
	return e.object(keys, func(i int) any {
		return rv.MapIndex(reflect.ValueOf(keys[i]).Convert(rv.Type().Key())).Interface()
	}, depth)
}

type field struct {
	name      string
	index     int
	omitEmpty bool
}

func structFields(t reflect.Type) []field {
	var out []field
	for i := 0; i < t.NumField(); i++ {
		f := t.Field(i)
		if !f.IsExported() {
			continue
		}
		name, omit := f.Name, false
		if tag, ok := f.Tag.Lookup("json"); ok {
			if tag == "-" {
				continue
			}
			parts := splitComma(tag)
			if parts[0] != "" {
				name = parts[0]
			}
			for _, p := range parts[1:] {
				if p == "omitempty" {
					omit = true
				}
			}
		}
		out = append(out, field{name: name, index: i, omitEmpty: omit})
	}
	return out
}

func splitComma(s string) []string {
	var out []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == ',' {
			out = append(out, s[start:i])
			start = i + 1
		}
	}
	return append(out, s[start:])
}

func (e *encoder) structValue(rv reflect.Value, depth int) error {
	fields := structFields(rv.Type())
	var keys []string
	var vals []any
	for _, f := range fields {
		fv := rv.Field(f.index)
		if f.omitEmpty && fv.IsZero() {
			continue
		}
		keys = append(keys, f.name)
		vals = append(vals, fv.Interface())
	}
	return e.object(keys, func(i int) any { return vals[i] }, depth)
}

var intLiteral = regexp.MustCompile(`^-?(?:0|[1-9][0-9]*)$`)

func (e *encoder) number(n json.Number) error {
	s := string(n)
	if intLiteral.MatchString(s) {
		if s == "-0" {
			s = "0" // Python int('-0') is 0
		}
		e.buf.WriteString(s)
		return nil
	}
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		var ne *strconv.NumError
		if !(asNumError(err, &ne) && ne.Err == strconv.ErrRange) {
			return fmt.Errorf("pyjson: invalid number %q", s)
		}
	}
	e.buf.WriteString(FloatRepr(f))
	return nil
}

func asNumError(err error, target **strconv.NumError) bool {
	ne, ok := err.(*strconv.NumError)
	if ok {
		*target = ne
	}
	return ok
}

const hexDigits = "0123456789abcdef"

// writeString is the C encoder's ascii_escape_unicode: printable ASCII
// (0x20..0x7e) except quote and backslash is copied; \b \f \n \r \t use the
// short escapes; everything else, DEL included, is \uXXXX in lower case,
// with a surrogate pair above the BMP. Invalid UTF-8 bytes are U+FFFD.
func writeString(buf *bytes.Buffer, s string) {
	buf.WriteByte('"')
	for i := 0; i < len(s); {
		c := s[i]
		if c >= 0x20 && c <= 0x7e && c != '"' && c != '\\' {
			buf.WriteByte(c)
			i++
			continue
		}
		r, size := rune(c), 1
		if c >= 0x80 {
			r, size = utf8.DecodeRuneInString(s[i:])
		}
		i += size
		switch r {
		case '"':
			buf.WriteString(`\"`)
		case '\\':
			buf.WriteString(`\\`)
		case '\b':
			buf.WriteString(`\b`)
		case '\f':
			buf.WriteString(`\f`)
		case '\n':
			buf.WriteString(`\n`)
		case '\r':
			buf.WriteString(`\r`)
		case '\t':
			buf.WriteString(`\t`)
		default:
			if r > 0xffff {
				r -= 0x10000
				writeU(buf, 0xd800|((r>>10)&0x3ff))
				writeU(buf, 0xdc00|(r&0x3ff))
			} else {
				writeU(buf, r)
			}
		}
	}
	buf.WriteByte('"')
}

func writeU(buf *bytes.Buffer, r rune) {
	buf.WriteString(`\u`)
	buf.WriteByte(hexDigits[(r>>12)&0xf])
	buf.WriteByte(hexDigits[(r>>8)&0xf])
	buf.WriteByte(hexDigits[(r>>4)&0xf])
	buf.WriteByte(hexDigits[r&0xf])
}

// FloatRepr is Python's repr(float) (float_repr_style 'short'): the shortest
// digits that round-trip; positional notation while the decimal exponent
// decpt (value = 0.d1d2... * 10**decpt) satisfies -4 < decpt <= 16, with ".0"
// added to integral values; otherwise d.ddde±XX with at least two exponent
// digits. json.dumps spells the non-finite values Infinity, -Infinity, NaN.
func FloatRepr(f float64) string {
	switch {
	case math.IsNaN(f):
		return "NaN"
	case math.IsInf(f, 1):
		return "Infinity"
	case math.IsInf(f, -1):
		return "-Infinity"
	case f == 0:
		if math.Signbit(f) {
			return "-0.0"
		}
		return "0.0"
	}
	s := strconv.FormatFloat(f, 'e', -1, 64) // -d.ddde±XX
	sign := ""
	if s[0] == '-' {
		sign, s = "-", s[1:]
	}
	epos := strings.IndexByte(s, 'e')
	mant, expText := s[:epos], s[epos+1:]
	exp, _ := strconv.Atoi(expText)
	digits := mant[:1]
	if len(mant) > 2 {
		digits += mant[2:]
	}
	decpt := exp + 1
	if decpt <= -4 || decpt > 16 {
		out := sign + digits[:1]
		if len(digits) > 1 {
			out += "." + digits[1:]
		}
		e := exp
		esign := "+"
		if e < 0 {
			esign, e = "-", -e
		}
		es := strconv.Itoa(e)
		if len(es) < 2 {
			es = "0" + es
		}
		return out + "e" + esign + es
	}
	switch {
	case decpt <= 0:
		return sign + "0." + zeros(-decpt) + digits
	case decpt >= len(digits):
		return sign + digits + zeros(decpt-len(digits)) + ".0"
	default:
		return sign + digits[:decpt] + "." + digits[decpt:]
	}
}

func zeros(n int) string {
	b := make([]byte, n)
	for i := range b {
		b[i] = '0'
	}
	return string(b)
}

// bigInt parses an integer literal of a json.Number.
func bigInt(s string) (*big.Int, bool) {
	if !intLiteral.MatchString(s) {
		return nil, false
	}
	n, ok := new(big.Int).SetString(s, 10)
	return n, ok
}
