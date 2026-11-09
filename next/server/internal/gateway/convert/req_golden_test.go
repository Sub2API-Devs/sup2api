package convert

import (
	"bytes"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"slices"
	"strings"
	"testing"
)

// TestGoldenRequests checks the request side of the golden samples of the
// pairs this file knows (CONVERT-MATRIX §10.1): in.request.json converts to
// want.request.json with the losses of want.losses.json, or fails with the
// RequestError text of want.request_error.txt. SUP2API_GOLDEN_UPDATE=1
// rewrites the want files (review them before committing).
//
// TODO(convert-matrix T2): superseded by golden_test.go once it drives
// Prepare for every pair; then this file goes.
func TestGoldenRequests(t *testing.T) {
	dirs, _ := filepath.Glob("testdata/golden/*~*/*")
	for _, dir := range dirs {
		from, to, _ := strings.Cut(filepath.Base(filepath.Dir(dir)), "~")
		conv := goldenRequestConverter(from, to)
		if conv == nil {
			continue
		}
		t.Run(filepath.Base(filepath.Dir(dir))+"/"+filepath.Base(dir), func(t *testing.T) {
			checkGoldenRequest(t, dir, conv)
		})
	}
}

type goldenConvert func(body []byte, opt Options) ([]byte, []Loss, error)

// goldenRequestConverter runs the request side of a T3 pair, nil for other
// pairs.
func goldenRequestConverter(from, to string) goldenConvert {
	if from == pChat && to == pResponses {
		return func(body []byte, opt Options) ([]byte, []Loss, error) {
			c, out, err := (&chatResponses{}).Prepare(body, opt)
			if err != nil {
				return nil, nil, err
			}
			return out, Losses(c), nil
		}
	}
	i := slices.IndexFunc(canonPairs, func(p canonPair) bool { return p.from == from && p.to == to })
	if i < 0 {
		return nil
	}
	return func(body []byte, opt Options) ([]byte, []Loss, error) {
		var l losses
		out, _, err := canonPairs[i].req(body, opt, &l)
		return out, l.sorted(), err
	}
}

// goldenCase is case.json.
type goldenCase struct {
	Options struct {
		Model  string `json:"model"`
		Stream bool   `json:"stream"`
	} `json:"options"`
	ClaudeDefaultMaxTokens map[string]int `json:"claude_default_max_tokens"`
}

func (c goldenCase) options() Options {
	opt := Options{Model: c.Options.Model, Stream: c.Options.Stream}
	if m := c.ClaudeDefaultMaxTokens; m != nil {
		opt.ClaudeDefaultMaxTokens = func(model string) int {
			if n, ok := m[model]; ok {
				return n
			}
			return m["default"]
		}
	}
	return opt
}

func checkGoldenRequest(t *testing.T, dir string, conv goldenConvert) {
	var c goldenCase
	readGoldenJSON(t, filepath.Join(dir, "case.json"), &c)
	in, err := os.ReadFile(filepath.Join(dir, "in.request.json"))
	if err != nil {
		t.Fatal(err)
	}
	out, lost, err := conv(in, c.options())
	update := os.Getenv("SUP2API_GOLDEN_UPDATE") == "1"
	if err != nil {
		var re *RequestError
		if !errors.As(err, &re) {
			t.Fatalf("not a RequestError: %v", err)
		}
		checkGoldenFile(t, filepath.Join(dir, "want.request_error.txt"), []byte(err.Error()+"\n"), update)
		return
	}
	checkGoldenFile(t, filepath.Join(dir, "want.request.json"), indentJSON(t, out), update)
	checkGoldenFile(t, filepath.Join(dir, "want.losses.json"), indentJSON(t, lossesJSON(t, lost)), update)
}

// lossesJSON renders losses as {"<category>": [paths]}, without empty
// categories.
func lossesJSON(t *testing.T, ls []Loss) []byte {
	m := map[LossCategory][]string{}
	for _, l := range ls {
		m[l.Category] = append(m[l.Category], l.Path)
	}
	b, err := json.Marshal(m)
	if err != nil {
		t.Fatal(err)
	}
	return b
}

// decodeExact decodes JSON keeping numbers exact.
func decodeExact(raw []byte) (any, error) {
	var v any
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	err := dec.Decode(&v)
	return v, err
}

func indentJSON(t *testing.T, raw []byte) []byte {
	v, err := decodeExact(raw)
	if err != nil {
		t.Fatalf("invalid JSON %s: %v", raw, err)
	}
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(v); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func readGoldenJSON(t *testing.T, path string, v any) {
	b, err := os.ReadFile(path)
	if err == nil {
		err = json.Unmarshal(b, v)
	}
	if err != nil {
		t.Fatalf("%s: %v", path, err)
	}
}

// checkGoldenFile compares got with the file (JSON semantically), or
// writes it when updating.
func checkGoldenFile(t *testing.T, path string, got []byte, update bool) {
	if update {
		if err := os.WriteFile(path, got, 0o644); err != nil {
			t.Fatal(err)
		}
		return
	}
	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("missing %s; got:\n%s", path, got)
	}
	if strings.HasSuffix(path, ".json") {
		a, errA := decodeExact(want)
		b, errB := decodeExact(got)
		if errA == nil && errB == nil && reflect.DeepEqual(a, b) {
			return
		}
	} else if bytes.Equal(want, got) {
		return
	}
	t.Errorf("%s differs; got:\n%s", path, got)
}
