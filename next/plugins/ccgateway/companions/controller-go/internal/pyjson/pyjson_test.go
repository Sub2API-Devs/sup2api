package pyjson

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"math"
	"net/netip"
	"strings"
	"testing"

	"ccgateway/controller/internal/pyreftest"
)

// covers: PV3 W12 G5 RB3 RB4 RB5 H7 (json.dumps byte format)
func TestMarshalMatchesPythonVectors(t *testing.T) {
	for _, c := range pyreftest.Cases(t, "json_dumps.json") {
		name, input := pyreftest.Str(c, "name"), pyreftest.Str(c, "input")
		v, err := Decode([]byte(input))
		if err != nil {
			t.Fatalf("%s: decode %q: %v", name, input, err)
		}
		got, err := Marshal(v)
		if err != nil || string(got) != pyreftest.Str(c, "dumps") {
			t.Errorf("%s: Marshal(%q)\n got  %s (%v)\n want %s", name, input, got, err, pyreftest.Str(c, "dumps"))
		}
		sorted, err := MarshalSorted(v)
		if err != nil || string(sorted) != pyreftest.Str(c, "dumps_sorted") {
			t.Errorf("%s: MarshalSorted(%q)\n got  %s\n want %s", name, input, sorted, pyreftest.Str(c, "dumps_sorted"))
		}
		sum := sha256.Sum256(sorted)
		if hex.EncodeToString(sum[:]) != pyreftest.Str(c, "sha256_sorted") {
			t.Errorf("%s: digest of the sorted dump differs", name)
		}
	}
}

type semantics struct {
	Int []struct {
		Input string `json:"input"`
		Int   *int64 `json:"int"`
		Error string `json:"error"`
	} `json:"int"`
	Truthy []struct {
		Input string `json:"input"`
		Bool  bool   `json:"bool"`
	} `json:"truthy"`
	IsSpace  []int `json:"isspace"`
	URLSplit []struct {
		Input, Scheme, Netloc, Path, Query, Fragment, Error string
		Hostname                                            *string
		HasUserinfo                                         bool `json:"has_userinfo"`
	} `json:"urlsplit"`
	IPv4 []struct {
		Input, Address, Error string
	} `json:"ipv4"`
	Networks []struct {
		Input, Loose, Strict string
	} `json:"networks"`
}

func loadSemantics(t *testing.T) semantics {
	var doc struct {
		Cases []semantics `json:"cases"`
	}
	pyreftest.Load(t, "python_semantics.json", &doc)
	if len(doc.Cases) != 1 {
		t.Fatal("python_semantics.json: one case expected")
	}
	return doc.Cases[0]
}

// covers: N5 V10 E5 (Python int())
func TestIntOfMatchesPython(t *testing.T) {
	s := loadSemantics(t)
	for _, c := range s.Int {
		v, err := Decode([]byte(c.Input))
		if err != nil {
			t.Fatalf("decode %s: %v", c.Input, err)
		}
		got, err := IntOf(v)
		switch {
		case c.Int != nil && (err != nil || got != *c.Int):
			t.Errorf("IntOf(%s) = %d, %v; want %d", c.Input, got, err, *c.Int)
		case c.Int == nil && err == nil:
			t.Errorf("IntOf(%s) = %d; want %s", c.Input, got, c.Error)
		}
	}
}

// covers: A4 A2 (Python truthiness)
func TestTruthyMatchesPython(t *testing.T) {
	for _, c := range loadSemantics(t).Truthy {
		v, err := Decode([]byte(c.Input))
		if err != nil {
			t.Fatal(err)
		}
		if Truthy(v) != c.Bool {
			t.Errorf("Truthy(%s) = %v, want %v", c.Input, !c.Bool, c.Bool)
		}
	}
}

// covers: V5 (str.isspace)
func TestIsSpaceMatchesPython(t *testing.T) {
	want := map[rune]bool{}
	for _, c := range loadSemantics(t).IsSpace {
		want[rune(c)] = true
	}
	if len(want) < 20 {
		t.Fatalf("only %d space characters in the vectors", len(want))
	}
	for r := rune(0); r <= 0x10ffff; r++ {
		if IsSpace(r) != want[r] {
			t.Errorf("IsSpace(%U) = %v", r, IsSpace(r))
		}
	}
}

// covers: V5 (urllib.parse.urlsplit)
func TestURLSplitMatchesPython(t *testing.T) {
	for _, c := range loadSemantics(t).URLSplit {
		u, err := URLSplit(c.Input)
		if c.Error != "" {
			if err == nil {
				t.Errorf("URLSplit(%q) accepted; Python raised %s", c.Input, c.Error)
			}
			continue
		}
		if err != nil {
			t.Errorf("URLSplit(%q): %v", c.Input, err)
			continue
		}
		host := ""
		if c.Hostname != nil {
			host = *c.Hostname
		}
		if u.Scheme != c.Scheme || u.Netloc != c.Netloc || u.Path != c.Path || u.Query != c.Query ||
			u.Fragment != c.Fragment || u.Hostname() != host || u.HasUserinfo() != c.HasUserinfo {
			t.Errorf("URLSplit(%q) = %+v host=%q userinfo=%v; want %+v", c.Input, u, u.Hostname(), u.HasUserinfo(), c)
		}
	}
}

// covers: V24 N1 (ipaddress)
func TestIPAddressMatchesPython(t *testing.T) {
	s := loadSemantics(t)
	for _, c := range s.IPv4 {
		a, err := CanonicalIPv4(c.Input)
		if (c.Error != "") != (err != nil) || (err == nil && a != c.Address) {
			t.Errorf("IPv4Address(%q) = %q, %v; want %q %s", c.Input, a, err, c.Address, c.Error)
		}
	}
	for _, c := range s.Networks {
		for strict, want := range map[bool]string{false: c.Loose, true: c.Strict} {
			p, err := IPv4Network(c.Input, strict)
			got := p.String()
			if err != nil {
				got = "error"
			}
			if (len(want) > 6 && want[:6] == "error:") != (err != nil) || (err == nil && got != want) {
				t.Errorf("IPv4Network(%q, strict=%v) = %s; want %s", c.Input, strict, got, want)
			}
		}
	}
}

// covers: H7
func TestFloatRepr(t *testing.T) {
	cases := map[float64]string{0: "0.0", 1: "1.0", -1.5: "-1.5", 0.1: "0.1", 1e16: "1e+16", 1e15: "1000000000000000.0",
		1e-4: "0.0001", 1e-5: "1e-05", 123456789.5: "123456789.5", 1e22: "1e+22", math.MaxFloat64: "1.7976931348623157e+308",
		5e-324: "5e-324", math.Inf(1): "Infinity", math.Inf(-1): "-Infinity", 2.5e-5: "2.5e-05", 100: "100.0"}
	for f, want := range cases {
		if got := FloatRepr(f); got != want {
			t.Errorf("FloatRepr(%v) = %s, want %s", f, got, want)
		}
	}
	if FloatRepr(math.NaN()) != "NaN" || FloatRepr(math.Copysign(0, -1)) != "-0.0" {
		t.Error("NaN or -0.0")
	}
}

type sample struct {
	B     int            `json:"b"`
	A     string         `json:"a,omitempty"`
	Skip  string         `json:"-"`
	Inner map[string]int `json:"inner"`
	Ptr   *int
}

// covers: H7
func TestMarshalGoValues(t *testing.T) {
	n := 3
	cases := []struct {
		v      any
		plain  string
		sorted string
	}{
		{sample{B: 1, Inner: map[string]int{"z": 1, "y": 2}}, `{"b": 1, "inner": {"y": 2, "z": 1}, "Ptr": null}`, `{"Ptr": null, "b": 1, "inner": {"y": 2, "z": 1}}`},
		{&sample{A: "é", Ptr: &n}, `{"b": 0, "a": "%u00e9", "inner": {}, "Ptr": 3}`, `{"Ptr": 3, "a": "%u00e9", "b": 0, "inner": {}}`},
		{[]string(nil), `[]`, `[]`},
		{[2]int{1, 2}, `[1, 2]`, `[1, 2]`},
		{Ordered{{"b", 1}, {"a", Ordered{{"d", nil}, {"c", true}}}}, `{"b": 1, "a": {"d": null, "c": true}}`, `{"a": {"c": true, "d": null}, "b": 1}`},
		{json.RawMessage(`{"y":1,"x":[1.0,2]}`), `{"y": 1, "x": [1.0, 2]}`, `{"x": [1.0, 2], "y": 1}`},
		{json.Number("1.50"), `1.5`, `1.5`},
		{uint8(7), `7`, `7`},
		{"<&>" + string(rune(0x2028)), `"<&>%u2028"`, `"<&>%u2028"`},
	}
	bs := string(rune(92)) // a backslash
	for _, c := range cases {
		c.plain = strings.ReplaceAll(c.plain, "%u", bs+"u")
		c.sorted = strings.ReplaceAll(c.sorted, "%u", bs+"u")
		if got := string(MustMarshal(c.v)); got != c.plain {
			t.Errorf("Marshal(%#v) = %s, want %s", c.v, got, c.plain)
		}
		if got := string(MustMarshalSorted(c.v)); got != c.sorted {
			t.Errorf("MarshalSorted(%#v) = %s, want %s", c.v, got, c.sorted)
		}
	}
	if _, err := Marshal(map[int]int{1: 1}); err == nil {
		t.Error("non-string map keys must fail")
	}
	if _, err := Marshal([]byte("x")); err == nil {
		t.Error("bytes must fail")
	}
	if _, err := Marshal(json.Number("1x")); err == nil {
		t.Error("an invalid number literal must fail")
	}
}

type valued struct{ x int }

func (v valued) PyValue() any { return Ordered{{"z", v.x}, {"a", "first"}} }

// covers: H7
func TestValuer(t *testing.T) {
	if got := string(MustMarshal([]any{valued{1}, (*valued)(nil)})); got != `[{"z": 1, "a": "first"}, null]` {
		t.Fatal(got)
	}
}

// covers: H6 (json.loads: duplicates keep the first position and the last value)
func TestDecodeOrderedAndStrict(t *testing.T) {
	v, err := Decode([]byte(` {"b":1,"a":2,"b":3} `))
	if err != nil {
		t.Fatal(err)
	}
	if got := string(MustMarshal(v)); got != `{"b": 3, "a": 2}` {
		t.Fatal(got)
	}
	for _, bad := range []string{``, `{`, `{} {}`, `[1,]`, `NaN`, `Infinity`, `{"a" 1}`, `tru`} {
		if _, err := Decode([]byte(bad)); err == nil {
			t.Errorf("Decode(%q) accepted", bad)
		}
	}
	if _, err := DecodeObject([]byte(`[1]`)); err == nil {
		t.Error("DecodeObject of a list")
	}
	o, err := DecodeObject([]byte(`{"k":[{"n":1.5}]}`))
	if err != nil {
		t.Fatal(err)
	}
	plain := Plain(o).(map[string]any)
	if plain["k"].([]any)[0].(map[string]any)["n"] != json.Number("1.5") {
		t.Fatal("Plain")
	}
}

// covers: K9 (ordered dict operations)
func TestOrdered(t *testing.T) {
	var o Ordered
	o.Set("a", 1)
	o.Set("b", 2)
	o.Set("a", 3)
	if got := string(MustMarshal(o)); got != `{"a": 3, "b": 2}` {
		t.Fatal(got)
	}
	if !o.Delete("a") || o.Delete("a") || o.Has("a") || len(o.Keys()) != 1 {
		t.Fatal("Delete")
	}
	c := o.Clone()
	c.Set("c", 1)
	if o.Has("c") {
		t.Fatal("Clone shares")
	}
	if v, ok := c.Get("b"); !ok || v != 2 {
		t.Fatal("Get")
	}
}

// covers: PV4 (dict equality: saved == cli)
func TestEqual(t *testing.T) {
	d := func(s string) any {
		v, err := Decode([]byte(s))
		if err != nil {
			t.Fatal(err)
		}
		return v
	}
	eq := [][2]any{{d(`{"a":1,"b":[1,2]}`), d(`{"b":[1,2.0],"a":true}`)}, {d(`1`), 1}, {d(`0`), false},
		{d(`"x"`), "x"}, {nil, nil}, {d(`{"a":{}}`), map[string]any{"a": map[string]any{}}}, {d(`1e400`), math.Inf(1)}}
	for _, p := range eq {
		if !Equal(p[0], p[1]) {
			t.Errorf("Equal(%v, %v) = false", p[0], p[1])
		}
	}
	ne := [][2]any{{d(`{"a":1}`), d(`{"a":1,"b":2}`)}, {d(`[1,2]`), d(`[2,1]`)}, {d(`"1"`), 1}, {nil, false},
		{d(`1.5`), 1}, {d(`[]`), d(`{}`)}, {math.NaN(), math.NaN()}}
	for _, p := range ne {
		if Equal(p[0], p[1]) {
			t.Errorf("Equal(%v, %v) = true", p[0], p[1])
		}
	}
	type s struct {
		A int `json:"a"`
	}
	if !Equal(s{1}, d(`{"a":1}`)) {
		t.Error("struct vs object")
	}
}

func mustPrefix(t *testing.T, s string) netip.Prefix {
	t.Helper()
	p, err := netip.ParsePrefix(s)
	if err != nil {
		t.Fatal(err)
	}
	return p
}

// covers: V12 V14 (isinstance int)
func TestIsInt(t *testing.T) {
	for in, want := range map[string]bool{`5`: true, `-5`: true, `5.0`: false, `5e0`: false, `true`: false, `"5"`: false} {
		v, _ := Decode([]byte(in))
		if IsInt(v) != want {
			t.Errorf("IsInt(%s) != %v", in, want)
		}
	}
	if !IsInt(int64(3)) || !IsTrue(true) || IsTrue(1) || !IsBool(false) || IsBool(nil) {
		t.Error("Go values")
	}
	if s, ok := String("x"); !ok || s != "x" {
		t.Error("String")
	}
	if !HasSpace("a\x1fb") || HasSpace("ab") {
		t.Error("HasSpace")
	}
	if !SubnetOf(mustPrefix(t, "10.1.0.0/16"), mustPrefix(t, "10.0.0.0/8")) || !Overlaps(mustPrefix(t, "10.0.0.0/8"), mustPrefix(t, "10.1.0.0/16")) {
		t.Error("prefix helpers")
	}
	if v, err := FromGo(struct {
		X []int `json:"x"`
	}{[]int{1}}); err != nil || string(MustMarshal(v)) != `{"x": [1]}` {
		t.Error("FromGo")
	}
}
