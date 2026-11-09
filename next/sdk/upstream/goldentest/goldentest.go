// Package goldentest records and replays the golden cases of the declarative
// upstream engine (docs/UPSTREAM-DECLARATIVE.md §7): the four code plugins
// (openai, anthropic, gemini, relay) write what they answer for an input
// matrix to sdk/upstream/testdata/golden/<plugin>.json, and the engine must
// answer every recorded input byte for byte the same.
//
// The plugin side calls Golden with its Matrix; the engine side calls Replay.
// Both encode through Run and Marshal, so the comparison is exact.
package goldentest

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

var update = flag.Bool("update-golden", false, "rewrite sdk/upstream/testdata/golden/<plugin>.json from the current code")

// Kind names the entry point a case calls.
type Kind string

// The five entry points of an account type's upstream.
const (
	KindBuild    Kind = "build"
	KindTest     Kind = "test"
	KindModels   Kind = "models"
	KindValidate Kind = "validate"
	KindClassify Kind = "classify"
)

// Subject is the implementation under test: a code plugin (FromPlugin) or
// the engine's Profile.
type Subject interface {
	Validate(*pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error)
	Build(*pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error)
	Test(*pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error)
	Models(*pluginv1.BuildModelsRequestRequest) (*pluginv1.BuildModelsRequestResponse, error)
	Classify(time.Time, *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error)
}

// Case is one input: Input is the request message of Kind; Now is the clock
// of a classify case (zero otherwise).
type Case struct {
	Name  string
	Kind  Kind
	Now   time.Time
	Input proto.Message
}

// Error is a gRPC status: Code is codes.Code.String().
type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Result is one recorded case. Input and Output are Marshal'ed messages;
// Output and Error are null when absent.
type Result struct {
	Name   string          `json:"name"`
	Kind   Kind            `json:"kind"`
	Now    string          `json:"now,omitempty"`
	Input  json.RawMessage `json:"input"`
	Output json.RawMessage `json:"output"`
	Error  *Error          `json:"error"`
}

// File is the content of one golden file.
type File struct {
	Plugin      string   `json:"plugin"`
	AccountType string   `json:"account_type"`
	Cases       []Result `json:"cases"`
}

// ProtoJSON encodes every message of a golden file.
var ProtoJSON = protojson.MarshalOptions{UseProtoNames: true}

// Marshal encodes m with ProtoJSON and re-encodes it through encoding/json,
// which sorts object keys and drops protojson's unstable whitespace. A nil
// message encodes as null.
func Marshal(m proto.Message) (json.RawMessage, error) {
	if m == nil || !m.ProtoReflect().IsValid() {
		return nil, nil
	}
	b, err := ProtoJSON.Marshal(m)
	if err != nil {
		return nil, err
	}
	dec := json.NewDecoder(bytes.NewReader(b))
	dec.UseNumber()
	var v any
	if err := dec.Decode(&v); err != nil {
		return nil, err
	}
	return encodeJSON(v, "")
}

// encodeJSON is encoding/json without HTML escaping and the trailing newline.
func encodeJSON(v any, indent string) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", indent)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	return bytes.TrimSuffix(buf.Bytes(), []byte("\n")), nil
}

// kind binds a Kind to its request type and Subject method.
type kind struct {
	newInput func() proto.Message
	call     func(Subject, time.Time, proto.Message) (proto.Message, error)
}

func op[Req, Resp proto.Message](f func(Subject, time.Time, Req) (Resp, error)) kind {
	return kind{
		newInput: func() proto.Message {
			var zero Req
			return zero.ProtoReflect().New().Interface()
		},
		call: func(s Subject, now time.Time, in proto.Message) (proto.Message, error) {
			return f(s, now, in.(Req))
		},
	}
}

func noNow[Req, Resp any](f func(Subject, Req) (Resp, error)) func(Subject, time.Time, Req) (Resp, error) {
	return func(s Subject, _ time.Time, in Req) (Resp, error) { return f(s, in) }
}

var kinds = map[Kind]kind{
	KindBuild:    op(noNow(Subject.Build)),
	KindTest:     op(noNow(Subject.Test)),
	KindModels:   op(noNow(Subject.Models)),
	KindValidate: op(noNow(Subject.Validate)),
	KindClassify: op(Subject.Classify),
}

// Run calls the entry point of c on s and records the answer.
func Run(s Subject, c Case) (Result, error) {
	k, ok := kinds[c.Kind]
	if !ok {
		return Result{}, fmt.Errorf("case %q: unknown kind %q", c.Name, c.Kind)
	}
	r := Result{Name: c.Name, Kind: c.Kind}
	if c.Kind == KindClassify {
		r.Now = c.Now.UTC().Format(time.RFC3339)
	}
	out, callErr := k.call(s, c.Now, c.Input)
	if callErr != nil {
		st := status.Convert(callErr)
		r.Error = &Error{Code: st.Code().String(), Message: st.Message()}
	}
	var err error
	if r.Input, err = Marshal(c.Input); err != nil {
		return Result{}, fmt.Errorf("case %q: input: %w", c.Name, err)
	}
	if r.Output, err = Marshal(out); err != nil {
		return Result{}, fmt.Errorf("case %q: output: %w", c.Name, err)
	}
	return r, nil
}

// Case decodes r back into the input it was recorded from.
func (r Result) Case() (Case, error) {
	k, ok := kinds[r.Kind]
	if !ok {
		return Case{}, fmt.Errorf("case %q: unknown kind %q", r.Name, r.Kind)
	}
	c := Case{Name: r.Name, Kind: r.Kind, Input: k.newInput()}
	if err := protojson.Unmarshal(r.Input, c.Input); err != nil {
		return Case{}, fmt.Errorf("case %q: input: %w", r.Name, err)
	}
	if r.Now == "" {
		return c, nil
	}
	now, err := time.Parse(time.RFC3339, r.Now)
	if err != nil {
		return Case{}, fmt.Errorf("case %q: now: %w", r.Name, err)
	}
	c.Now = now
	return c, nil
}

// Path is the golden file of plugin.
func Path(plugin string) string {
	_, self, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(self), "..", "testdata", "golden", plugin+".json")
}

// Load reads the golden file of plugin.
func Load(plugin string) (*File, error) {
	b, err := os.ReadFile(Path(plugin))
	if err != nil {
		return nil, err
	}
	var f File
	if err := json.Unmarshal(b, &f); err != nil {
		return nil, fmt.Errorf("%s: %w", Path(plugin), err)
	}
	return &f, nil
}

// Encode is the byte form of a golden file.
func (f *File) Encode() ([]byte, error) {
	b, err := encodeJSON(f, "  ")
	return append(b, '\n'), err
}

func (f *File) write() error {
	b, err := f.Encode()
	if err != nil {
		return err
	}
	path := Path(f.Plugin)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, b, 0o644)
}
