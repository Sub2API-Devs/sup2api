package goldentest

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// Fixed inputs shared by every plugin's matrix.
const (
	// Key is a valid API key for every plugin (OpenAI's sk- prefix and
	// minimum length included).
	Key = "sk-golden-key-0123456789"
	// AccountID is the id of every account in the matrix.
	AccountID = 42
	// UnsupportedProtocol is an upstream protocol no plugin serves.
	UnsupportedProtocol = "unknown.protocol"
	// Model is the model the build and test cases ask for.
	Model = "golden-model"
	// BaseURL is the base_url of the default account and credential form
	// (relay requires one).
	BaseURL = "https://upstream.example.com"
)

// Now is the clock of every classify case.
var Now = time.Date(2026, 9, 25, 12, 0, 0, 0, time.UTC)

// Headers is a header map (inbound or response headers).
type Headers = map[string]string

// Variant is one named value of a matrix dimension.
type Variant[T any] struct {
	Name  string
	Value T
}

// Matrix is a plugin's case table: the common input matrix is derived from
// it, plus the plugin's own inbound header sets and classify inputs.
type Matrix struct {
	// Plugin is the plugin key (the golden file name).
	Plugin string
	// AccountType is the account type the plugin implements.
	AccountType string
	// Protocols are the upstream protocols the plugin serves; "" and
	// UnsupportedProtocol are added.
	Protocols []string
	// ForwardHeaders are the client headers the plugin forwards.
	ForwardHeaders []string
	// Inbound are plugin-specific inbound header sets, tried after the
	// common ones.
	Inbound []Variant[Headers]
	// Errors are the classify inputs; CommonErrors are appended.
	Errors []ErrorInput
}

// Record runs every case of m against s.
func (m Matrix) Record(s Subject) (*File, error) {
	f := &File{Plugin: m.Plugin, AccountType: m.AccountType}
	seen := map[string]bool{}
	for _, c := range m.Cases() {
		if seen[c.Name] {
			return nil, fmt.Errorf("duplicate case %q", c.Name)
		}
		seen[c.Name] = true
		r, err := Run(s, c)
		if err != nil {
			return nil, err
		}
		f.Cases = append(f.Cases, r)
	}
	return f, nil
}

// Cases is the full input matrix of m.
func (m Matrix) Cases() []Case {
	var cs []Case
	for _, part := range [][]Case{m.buildCases(), m.testCases(), m.modelsCases(), m.validateCases(), m.classifyCases()} {
		cs = append(cs, part...)
	}
	return cs
}

// ---------------------------------------------------------------- accounts

// obj encodes key/value pairs as a JSON object.
func obj(kv ...any) string {
	o := make(map[string]any, len(kv)/2)
	for i := 0; i+1 < len(kv); i += 2 {
		o[kv[i].(string)] = kv[i+1]
	}
	b, _ := json.Marshal(o)
	return string(b)
}

func (m Matrix) account(creds, settings string) *pluginv1.Account {
	return &pluginv1.Account{Id: AccountID, Type: m.AccountType, CredentialsJson: creds, SettingsJson: settings}
}

func (m Matrix) typedAccount(typ string) *pluginv1.Account {
	a := m.account(obj("api_key", Key), obj("base_url", BaseURL))
	a.Type = typ
	return a
}

// baseURLs are the base_url settings every request kind is tried with; ""
// means no base_url.
var baseURLs = []Variant[string]{
	{"custom", BaseURL},
	{"absent", ""},
	{"v1", "https://upstream.example.com/v1"},
	{"v1beta", "https://upstream.example.com/v1beta"},
	{"http port prefix v1 slash", "http://upstream.example.com:8080/prefix/v1/"},
}

// baseURLAccounts are valid-key accounts with each base_url setting; the
// first one ("base_url=custom") is the default account of the matrix.
func (m Matrix) baseURLAccounts() []Variant[*pluginv1.Account] {
	out := make([]Variant[*pluginv1.Account], len(baseURLs))
	for i, b := range baseURLs {
		settings := ""
		if b.Value != "" {
			settings = obj("base_url", b.Value)
		}
		out[i] = Variant[*pluginv1.Account]{"base_url=" + b.Name, m.account(obj("api_key", Key), settings)}
	}
	return out
}

// accounts are the credential placements and faults besides base_url; the
// ones not about base_url carry BaseURL in settings.
func (m Matrix) accounts() []Variant[*pluginv1.Account] {
	keyed, based := obj("api_key", Key), obj("base_url", BaseURL)
	return []Variant[*pluginv1.Account]{
		{"base_url in credentials", m.account(obj("api_key", Key, "base_url", "https://creds.example.com/v1"), "")},
		{"base_url in both", m.account(obj("api_key", Key, "base_url", "https://creds.example.com"), obj("base_url", "https://settings.example.com"))},
		{"api_key in settings", m.account("{}", obj("api_key", Key, "base_url", BaseURL))},
		{"api_key in both", m.account(keyed, obj("api_key", "sk-settings-key-0000", "base_url", BaseURL))},
		{"padded api_key", m.account(obj("api_key", "  "+Key+"  "), based)},
		{"missing api_key", m.account("", based)},
		{"blank api_key", m.account(obj("api_key", "   "), based)},
		{"non-string api_key", m.account(obj("api_key", 12345), based)},
		{"type mismatch", m.typedAccount("oauth")},
		{"type empty", m.typedAccount("")},
		{"base_url with query", m.account(keyed, obj("base_url", "https://upstream.example.com/v1?x=1"))},
		{"base_url not http", m.account(keyed, obj("base_url", "ftp://upstream.example.com"))},
		{"base_url non-string", m.account(keyed, obj("base_url", 123))},
		{"base_url blank", m.account(keyed, obj("base_url", "   "))},
		{"invalid credentials json", m.account("{", based)},
		{"invalid settings json", m.account(keyed, "[")},
		{"nil account", nil},
	}
}

func (m Matrix) allAccounts() []Variant[*pluginv1.Account] {
	return append(m.baseURLAccounts(), m.accounts()...)
}

// ---------------------------------------------------------------- build

// modelInput is the model of a build request: meta.model and the raw JSON of
// fields["model"] ("" = absent).
type modelInput struct{ meta, field string }

var buildModels = []Variant[modelInput]{
	{"meta+field", modelInput{Model, `"field-model"`}},
	{"meta", modelInput{Model, ""}},
	{"field", modelInput{"", `"field-model"`}},
	{"none", modelInput{}},
	{"models/ prefix", modelInput{"models/" + Model, ""}},
	{"padded models/ prefix", modelInput{"  models/" + Model + "  ", ""}},
	{"field models/ prefix", modelInput{Model, `"models/field-model"`}},
	{"non-string field", modelInput{Model, `123`}},
	{"empty field", modelInput{Model, `""`}},
}

// commonInbound are the inbound header sets every plugin is tried with.
func (m Matrix) commonInbound() []Variant[Headers] {
	each := func(value func(name string) string, extra Headers) Headers {
		h := Headers{}
		for _, name := range m.ForwardHeaders {
			h[name] = value(name)
		}
		for k, v := range extra {
			h[k] = v
		}
		return h
	}
	return []Variant[Headers]{
		{"none", nil},
		{"forwarded", each(func(n string) string { return n + "-value" }, nil)},
		{"forwarded+unlisted", each(func(n string) string { return n + "-value" }, Headers{
			"x-unlisted": "unlisted-value", "authorization": "Bearer client-key", "x-api-key": "client-key", "cookie": "a=b",
		})},
		{"padded", each(func(n string) string { return "  padded-" + n + "  " }, nil)},
		{"blank", each(func(string) string { return "   " }, Headers{"anthropic-version": "   "})},
		{"mixed case", Headers{"User-Agent": "mixed-case-agent", "Anthropic-Version": "2099-01-01"}},
		{"anthropic-version", Headers{"anthropic-version": "2024-10-22"}},
	}
}

type buildInput struct {
	protocol string
	account  Variant[*pluginv1.Account]
	stream   bool
	inbound  Variant[Headers]
	model    Variant[modelInput]
}

func (b buildInput) toCase() Case {
	in := &pluginv1.BuildUpstreamRequestRequest{
		Meta:           &pluginv1.RequestMeta{Protocol: b.protocol, Model: b.model.Value.meta, Stream: b.stream},
		Account:        b.account.Value,
		InboundHeaders: b.inbound.Value,
	}
	if b.model.Value.field != "" {
		in.Fields = map[string]string{"model": b.model.Value.field}
	}
	return Case{
		Name: fmt.Sprintf("build protocol=%q account=%s stream=%t inbound=%s model=%s",
			b.protocol, b.account.Name, b.stream, b.inbound.Name, b.model.Name),
		Kind:  KindBuild,
		Input: in,
	}
}

// buildCases varies one dimension at a time from the default input, per
// protocol: base_url × stream, inbound headers × stream, model; and the
// account faults for the first protocol, "" and an unsupported one (which
// check runs first). Inputs reached twice are kept once.
func (m Matrix) buildCases() []Case {
	inbound := append(m.commonInbound(), m.Inbound...)
	def := buildInput{account: m.baseURLAccounts()[0], inbound: inbound[0], model: buildModels[0]}
	var ins []buildInput
	for _, p := range append(append([]string(nil), m.Protocols...), "", UnsupportedProtocol) {
		def.protocol = p
		for _, stream := range []bool{false, true} {
			def.stream = stream
			ins = append(ins, vary(def, m.baseURLAccounts(), func(b *buildInput, v Variant[*pluginv1.Account]) { b.account = v })...)
			ins = append(ins, vary(def, inbound, func(b *buildInput, v Variant[Headers]) { b.inbound = v })...)
		}
		def.stream = false
		ins = append(ins, vary(def, buildModels, func(b *buildInput, v Variant[modelInput]) { b.model = v })...)
	}
	for _, p := range []string{m.Protocols[0], "", UnsupportedProtocol} {
		def.protocol = p
		ins = append(ins, vary(def, m.accounts(), func(b *buildInput, v Variant[*pluginv1.Account]) { b.account = v })...)
	}
	return uniqueCases(ins)
}

// vary returns def with one dimension set to each of values.
func vary[T any](def buildInput, values []Variant[T], set func(*buildInput, Variant[T])) []buildInput {
	out := make([]buildInput, len(values))
	for i, v := range values {
		out[i] = def
		set(&out[i], v)
	}
	return out
}

func uniqueCases(ins []buildInput) []Case {
	seen := map[string]bool{}
	var cs []Case
	for _, in := range ins {
		c := in.toCase()
		if !seen[c.Name] {
			seen[c.Name] = true
			cs = append(cs, c)
		}
	}
	return cs
}

// ---------------------------------------------------------------- test, models

var testModels = []Variant[string]{
	{"empty", ""},
	{"set", Model},
	{"padded", "  " + Model + "  "},
	{"models/ prefix", "models/" + Model},
}

func (m Matrix) testCases() []Case {
	var cs []Case
	for _, a := range m.allAccounts() {
		for _, mv := range testModels {
			cs = append(cs, Case{
				Name:  fmt.Sprintf("test account=%s model=%s", a.Name, mv.Name),
				Kind:  KindTest,
				Input: &pluginv1.BuildTestRequestRequest{Account: a.Value, Model: mv.Value},
			})
		}
	}
	return cs
}

func (m Matrix) modelsCases() []Case {
	var cs []Case
	for _, a := range m.allAccounts() {
		cs = append(cs, Case{
			Name:  "models account=" + a.Name,
			Kind:  KindModels,
			Input: &pluginv1.BuildModelsRequestRequest{Account: a.Value},
		})
	}
	return cs
}

// ---------------------------------------------------------------- validate

// credentialForms are ValidateCredentials inputs: credentials and settings
// JSON of the matrix's account type; the ones not about base_url carry
// BaseURL in settings.
func credentialForms() []struct{ name, creds, settings string } {
	based := obj("base_url", BaseURL)
	return []struct{ name, creds, settings string }{
		{"valid", obj("api_key", Key), based},
		{"valid with other fields", obj("api_key", Key, "organization", "org-1"), obj("base_url", BaseURL, "model_mapping", map[string]string{"a": "b"}, "proxy_id", 7)},
		{"empty form", "", ""},
		{"null credentials", "null", based},
		{"empty key", obj("api_key", ""), based},
		{"blank key", obj("api_key", "   "), based},
		{"null key", `{"api_key":null}`, based},
		{"padded key", obj("api_key", "  "+Key+"  "), based},
		{"inner space key", obj("api_key", "sk-golden key-0123456789"), based},
		{"inner tab key", obj("api_key", "sk-golden\tkey-0123456789"), based},
		{"too short key", obj("api_key", "sk-1234"), based},
		{"nine character key", obj("api_key", "sk-123456"), based},
		{"wrong prefix key", obj("api_key", "ak-golden-key-0123456789"), based},
		{"sess- prefix key", obj("api_key", "sess-golden-key-0123"), based},
		{"too long key", obj("api_key", "sk-"+strings.Repeat("k", 510)), based},
		{"non-ascii key", obj("api_key", "sk-gölden-key-0123456789"), based},
		{"non-string key", obj("api_key", 12345), based},
		{"key in settings", "", obj("api_key", Key, "base_url", BaseURL)},
		{"key in both", obj("api_key", Key), obj("api_key", "sk-settings-key-0000", "base_url", BaseURL)},
		{"base_url absent", obj("api_key", Key), ""},
		{"base_url settings v1", obj("api_key", Key), obj("base_url", BaseURL+"/v1")},
		{"base_url credentials", obj("api_key", Key, "base_url", BaseURL+"/v1/"), ""},
		{"base_url both", obj("api_key", Key, "base_url", "https://creds.example.com"), obj("base_url", "https://settings.example.com/v1")},
		{"base_url v1beta", obj("api_key", Key), obj("base_url", BaseURL+"/v1beta")},
		{"base_url port prefix", obj("api_key", Key), obj("base_url", "http://upstream.example.com:8080/prefix/v1/")},
		{"base_url blank", obj("api_key", Key), obj("base_url", "   ")},
		{"base_url query", obj("api_key", Key), obj("base_url", BaseURL+"/v1?x=1")},
		{"base_url fragment", obj("api_key", Key), obj("base_url", BaseURL+"#frag")},
		{"base_url userinfo", obj("api_key", Key), obj("base_url", "https://user:pw@upstream.example.com")},
		{"base_url not http", obj("api_key", Key), obj("base_url", "ftp://upstream.example.com")},
		{"base_url relative", obj("api_key", Key), obj("base_url", "upstream.example.com/v1")},
		{"base_url non-string", obj("api_key", Key), obj("base_url", 123)},
		{"empty key and bad base_url", obj("api_key", ""), obj("base_url", "ftp://upstream.example.com")},
		{"invalid credentials json", "{", based},
		{"credentials not object", "[1]", based},
		{"invalid settings json", obj("api_key", Key), "["},
	}
}

func (m Matrix) validateCases() []Case {
	validate := func(name, typ, creds, settings string) Case {
		return Case{
			Name:  "validate " + name,
			Kind:  KindValidate,
			Input: &pluginv1.ValidateCredentialsRequest{AccountType: typ, CredentialsJson: creds, SettingsJson: settings},
		}
	}
	cs := []Case{
		validate("account type mismatch", "oauth", obj("api_key", Key), obj("base_url", BaseURL)),
		validate("account type empty", "", obj("api_key", Key), obj("base_url", BaseURL)),
	}
	for _, f := range credentialForms() {
		cs = append(cs, validate(f.name, m.AccountType, f.creds, f.settings))
	}
	return cs
}

// ---------------------------------------------------------------- classify

// ErrorInput is one upstream failure to classify.
type ErrorInput struct {
	Name      string
	Status    int32
	Headers   Headers
	Body      string
	Transport string
}

func (m Matrix) classifyCases() []Case {
	var cs []Case
	for _, e := range append(append([]ErrorInput(nil), m.Errors...), CommonErrors...) {
		cs = append(cs, Case{
			Name: "classify " + e.Name,
			Kind: KindClassify,
			Now:  Now,
			Input: &pluginv1.ClassifyErrorRequest{
				Status: e.Status, Headers: e.Headers, BodyPrefix: []byte(e.Body), TransportError: e.Transport,
			},
		})
	}
	return cs
}
