package pyjson

import (
	"encoding/json"
	"errors"
	"math"
	"math/big"
	"reflect"
	"strconv"
	"unicode"
)

// Truthy is Python's bool(v) for a decoded JSON value: null, false, zero
// numbers, "", empty lists and empty objects are false.
func Truthy(v any) bool {
	switch x := v.(type) {
	case nil:
		return false
	case bool:
		return x
	case string:
		return x != ""
	case json.Number:
		if n, ok := bigInt(string(x)); ok {
			return n.Sign() != 0
		}
		f, err := strconv.ParseFloat(string(x), 64)
		return err != nil || f != 0 // an overflowing literal is ±inf: true
	case Ordered:
		return len(x) > 0
	case []any:
		return len(x) > 0
	case map[string]any:
		return len(x) > 0
	case float64:
		return x != 0
	case int:
		return x != 0
	case int64:
		return x != 0
	}
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Slice, reflect.Map, reflect.Array, reflect.String:
		return rv.Len() > 0
	case reflect.Pointer, reflect.Interface:
		return !rv.IsNil()
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return rv.Int() != 0
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return rv.Uint() != 0
	case reflect.Float32, reflect.Float64:
		return rv.Float() != 0
	}
	return true
}

// IsInt is isinstance(v, int) and not a bool: an integer JSON literal (5.0
// and 5e0 are Python floats) or a Go integer.
func IsInt(v any) bool {
	switch x := v.(type) {
	case json.Number:
		return intLiteral.MatchString(string(x))
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
		return true
	}
	return false
}

// IsBool is isinstance(v, bool).
func IsBool(v any) bool {
	_, ok := v.(bool)
	return ok
}

// IsTrue is `v is True`.
func IsTrue(v any) bool {
	b, ok := v.(bool)
	return ok && b
}

// String is v when it is a str.
func String(v any) (string, bool) {
	s, ok := v.(string)
	return s, ok
}

// ErrNotInt is returned by IntOf for values int() refuses.
var ErrNotInt = errors.New("pyjson: invalid literal for int()")

// IntOf is Python int(v) for a decoded JSON value, limited to int64:
//   - bool is 0 or 1;
//   - an integer literal is itself; any other number literal is a float,
//     truncated toward zero (inf and nan are refused);
//   - a string is stripped of str.isspace() characters and parsed as an
//     optionally signed decimal with single underscores between digits; any
//     Unicode decimal digit counts (int('１２') == 12);
//   - anything else (null, lists, objects) is refused.
func IntOf(v any) (int64, error) {
	switch x := v.(type) {
	case bool:
		if x {
			return 1, nil
		}
		return 0, nil
	case json.Number:
		if n, ok := bigInt(string(x)); ok {
			if !n.IsInt64() {
				return 0, ErrNotInt
			}
			return n.Int64(), nil
		}
		f, err := strconv.ParseFloat(string(x), 64)
		if err != nil {
			return 0, ErrNotInt
		}
		return floatToInt(f)
	case float64:
		return floatToInt(x)
	case string:
		return parsePyInt(x)
	case int:
		return int64(x), nil
	case int64:
		return x, nil
	case int32:
		return int64(x), nil
	}
	return 0, ErrNotInt
}

func floatToInt(f float64) (int64, error) {
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return 0, ErrNotInt
	}
	t := math.Trunc(f)
	if t < math.MinInt64 || t >= math.MaxInt64 {
		return 0, ErrNotInt
	}
	return int64(t), nil
}

// intSpace is the whitespace int() strips: ASCII space and TAB..CR
// (Py_ISSPACE)
// and, from U+007F on, Unicode whitespace (mapped to a space first). The
// ASCII separators U+001C..U+001F are not stripped although isspace() is true.
func intSpace(r rune) bool {
	if r < 0x7f {
		return r == 0x20 || r >= 0x09 && r <= 0x0d
	}
	return IsSpace(r)
}

func parsePyInt(s string) (int64, error) {
	runes := []rune(s)
	start, end := 0, len(runes)
	for start < end && intSpace(runes[start]) {
		start++
	}
	for end > start && intSpace(runes[end-1]) {
		end--
	}
	runes = runes[start:end]
	neg := false
	if len(runes) > 0 && (runes[0] == '+' || runes[0] == '-') {
		neg = runes[0] == '-'
		runes = runes[1:]
	}
	if len(runes) == 0 {
		return 0, ErrNotInt
	}
	n := new(big.Int)
	ten := big.NewInt(10)
	prevDigit := false
	for i, r := range runes {
		if r == '_' {
			if !prevDigit || i == len(runes)-1 {
				return 0, ErrNotInt
			}
			prevDigit = false
			continue
		}
		d, ok := decimalValue(r)
		if !ok {
			return 0, ErrNotInt
		}
		n.Mul(n, ten)
		n.Add(n, big.NewInt(int64(d)))
		prevDigit = true
	}
	if neg {
		n.Neg(n)
	}
	if !n.IsInt64() {
		return 0, ErrNotInt
	}
	return n.Int64(), nil
}

// decimalValue is the value of a Unicode decimal digit (category Nd). Every
// Nd range of the Unicode tables starts at a digit zero and runs in whole
// decades, so the value is the offset modulo 10.
func decimalValue(r rune) (int, bool) {
	if r >= '0' && r <= '9' {
		return int(r - '0'), true
	}
	if r < 0x80 || !unicode.Is(unicode.Nd, r) {
		return 0, false
	}
	for _, rg := range unicode.Nd.R16 {
		if r >= rune(rg.Lo) && r <= rune(rg.Hi) {
			return int(r-rune(rg.Lo)) % 10, true
		}
	}
	for _, rg := range unicode.Nd.R32 {
		if r >= rune(rg.Lo) && r <= rune(rg.Hi) {
			return int(r-rune(rg.Lo)) % 10, true
		}
	}
	return 0, false
}

// Equal is Python's == between two decoded JSON values (or Go values of the
// same shapes): numbers compare by value across int, float and bool
// (True == 1 == 1.0), objects ignore key order, lists compare element-wise.
func Equal(a, b any) bool {
	if ra, ok := numeric(a); ok {
		rb, ok := numeric(b)
		return ok && ra.equal(rb)
	}
	switch x := a.(type) {
	case nil:
		return b == nil
	case string:
		y, ok := b.(string)
		return ok && x == y
	}
	if la, ok := asList(a); ok {
		lb, ok := asList(b)
		if !ok || len(la) != len(lb) {
			return false
		}
		for i := range la {
			if !Equal(la[i], lb[i]) {
				return false
			}
		}
		return true
	}
	if ma, ok := asDict(a); ok {
		mb, ok := asDict(b)
		if !ok || len(ma) != len(mb) {
			return false
		}
		for k, va := range ma {
			vb, ok := mb[k]
			if !ok || !Equal(va, vb) {
				return false
			}
		}
		return true
	}
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	// Go structs and other values: compare their decoded form.
	da, err1 := FromGo(a)
	db, err2 := FromGo(b)
	if err1 != nil || err2 != nil {
		return false
	}
	if _, ok := da.(Ordered); !ok {
		if _, ok := da.([]any); !ok {
			return false
		}
	}
	return Equal(da, db)
}

type num struct {
	rat   *big.Rat
	float float64
	exact bool // rat holds the value; otherwise float (nan/inf)
}

func (n num) equal(o num) bool {
	if n.exact && o.exact {
		return n.rat.Cmp(o.rat) == 0
	}
	if !n.exact && !o.exact {
		return n.float == o.float // nan != nan
	}
	return false
}

func numeric(v any) (num, bool) {
	switch x := v.(type) {
	case bool:
		if x {
			return num{rat: big.NewRat(1, 1), exact: true}, true
		}
		return num{rat: new(big.Rat), exact: true}, true
	case json.Number:
		if n, ok := bigInt(string(x)); ok {
			return num{rat: new(big.Rat).SetInt(n), exact: true}, true
		}
		f, err := strconv.ParseFloat(string(x), 64)
		if err != nil && !math.IsInf(f, 0) {
			return num{}, false
		}
		return floatNum(f), true
	case float64:
		return floatNum(x), true
	case float32:
		return floatNum(float64(x)), true
	}
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return num{rat: new(big.Rat).SetInt64(rv.Int()), exact: true}, true
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return num{rat: new(big.Rat).SetUint64(rv.Uint()), exact: true}, true
	}
	return num{}, false
}

func floatNum(f float64) num {
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return num{float: f}
	}
	r := new(big.Rat)
	r.SetFloat64(f)
	return num{rat: r, exact: true}
}

func asList(v any) ([]any, bool) {
	if l, ok := v.([]any); ok {
		return l, true
	}
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Slice && rv.Type() != orderedType && rv.Type() != rawType && rv.Type().Elem().Kind() != reflect.Uint8 {
		out := make([]any, rv.Len())
		for i := range out {
			out[i] = rv.Index(i).Interface()
		}
		return out, true
	}
	return nil, false
}

func asDict(v any) (map[string]any, bool) {
	switch x := v.(type) {
	case Ordered:
		m := make(map[string]any, len(x))
		for _, kv := range x {
			m[kv.Key] = kv.Value
		}
		return m, true
	case map[string]any:
		return x, true
	case map[string]string:
		m := make(map[string]any, len(x))
		for k, s := range x {
			m[k] = s
		}
		return m, true
	}
	return nil, false
}
