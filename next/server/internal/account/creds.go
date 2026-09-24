package account

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"slices"
	"strconv"
	"strings"

	"github.com/santhosh-tekuri/jsonschema/v6"
	"github.com/santhosh-tekuri/jsonschema/v6/kind"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
	"golang.org/x/text/language"
	"golang.org/x/text/message"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func itoa(n int64) string { return strconv.FormatInt(n, 10) }

func aad(platform string) []byte { return []byte("account:" + platform) }

type fields = map[string]json.RawMessage

// parseObject decodes a JSON object; nil/empty input is an empty object.
func parseObject(b []byte) (fields, error) {
	m := fields{}
	if len(bytes.TrimSpace(b)) == 0 {
		return m, nil
	}
	if err := json.Unmarshal(b, &m); err != nil {
		return nil, err
	}
	if m == nil {
		m = fields{}
	}
	return m, nil
}

func mustJSON(m fields) []byte {
	if m == nil {
		m = fields{}
	}
	b, _ := json.Marshal(m)
	return b
}

// split separates top-level settings keys (stored as plain JSONB) from the
// rest (encrypted).
func split(all fields, settingsFields []string) (secretPart, settings fields) {
	secretPart, settings = fields{}, fields{}
	for k, v := range all {
		if slices.Contains(settingsFields, k) {
			settings[k] = v
		} else {
			secretPart[k] = v
		}
	}
	return secretPart, settings
}

// merge combines the decrypted secret part and settings into the object the
// console submitted.
func merge(secretJSON, settingsJSON []byte) (fields, error) {
	all, err := parseObject(secretJSON)
	if err != nil {
		return nil, err
	}
	st, err := parseObject(settingsJSON)
	if err != nil {
		return nil, err
	}
	for k, v := range st {
		all[k] = v
	}
	return all, nil
}

// mask replaces non-empty sensitive values (gjson paths) with Mask.
func mask(b []byte, sensitive []string) []byte {
	for _, p := range sensitive {
		r := gjson.GetBytes(b, p)
		if !r.Exists() || r.Type == gjson.Null || (r.Type == gjson.String && r.Str == "") {
			continue
		}
		if nb, err := sjson.SetBytes(b, p, Mask); err == nil {
			b = nb
		}
	}
	return b
}

// maskAll masks every top-level value (used when the account type is no
// longer registered and its sensitive fields are unknown).
func maskAll(secretPart fields) fields {
	out := make(fields, len(secretPart))
	for k := range secretPart {
		out[k] = json.RawMessage(strconv.Quote(Mask))
	}
	return out
}

// unmask puts stored values back where the client sent Mask.
func unmask(b, old []byte, sensitive []string) []byte {
	for _, p := range sensitive {
		r := gjson.GetBytes(b, p)
		if r.Type != gjson.String || r.Str != Mask {
			continue
		}
		var err error
		var nb []byte
		if o := gjson.GetBytes(old, p); o.Exists() {
			nb, err = sjson.SetRawBytes(b, p, []byte(o.Raw))
		} else {
			nb, err = sjson.DeleteBytes(b, p)
		}
		if err == nil {
			b = nb
		}
	}
	return b
}

// ---------------------------------------------------------------- JSON Schema

var printer = message.NewPrinter(language.English)

func (s *Service) compiled(schema []byte) (*jsonschema.Schema, error) {
	sum := sha256.Sum256(schema)
	key := hex.EncodeToString(sum[:])
	if v, ok := s.schemas.Load(key); ok {
		return v.(*jsonschema.Schema), nil
	}
	doc, err := jsonschema.UnmarshalJSON(bytes.NewReader(schema))
	if err != nil {
		return nil, err
	}
	c := jsonschema.NewCompiler()
	loc := "https://sub2api.invalid/forms/" + key + ".json"
	if err := c.AddResource(loc, doc); err != nil {
		return nil, err
	}
	sch, err := c.Compile(loc)
	if err != nil {
		return nil, err
	}
	s.schemas.Store(key, sch)
	return sch, nil
}

// validateSchema checks credentials against the account type's form schema.
func (s *Service) validateSchema(ctx context.Context, bt core.AccountTypeBinding, creds []byte) error {
	if bt.Type.Form.Mode != "schema" || len(bytes.TrimSpace(bt.FormSchema)) == 0 {
		return nil
	}
	sch, err := s.compiled(bt.FormSchema)
	if err != nil {
		return core.ErrPluginUnavailable.WithMessage(t(ctx, "the account form schema of the plugin is invalid",
			"插件的账号表单 schema 无效")).WithCause(err)
	}
	inst, err := jsonschema.UnmarshalJSON(bytes.NewReader(creds))
	if err != nil {
		return core.ErrInvalidArgument.WithMessage("invalid credentials JSON")
	}
	err = sch.Validate(inst)
	if err == nil {
		return nil
	}
	var ve *jsonschema.ValidationError
	if !errors.As(err, &ve) {
		return core.ErrInvalidArgument.WithMessage(err.Error())
	}
	var fe []core.FieldError
	collect(ve, &fe)
	if len(fe) == 0 {
		fe = append(fe, core.FieldError{Field: "credentials", Code: "invalid", Message: ve.Error()})
	}
	return core.InvalidFields(fe...)
}

func collect(ve *jsonschema.ValidationError, out *[]core.FieldError) {
	if len(ve.Causes) > 0 {
		for _, c := range ve.Causes {
			collect(c, out)
		}
		return
	}
	loc := ve.InstanceLocation
	code := "invalid"
	if kp := ve.ErrorKind.KeywordPath(); len(kp) > 0 {
		code = kp[0]
	}
	msg := ve.ErrorKind.LocalizedString(printer)
	if r, ok := ve.ErrorKind.(*kind.Required); ok && len(r.Missing) > 0 {
		for _, m := range r.Missing {
			*out = append(*out, core.FieldError{Field: credField(append(slices.Clone(loc), m)), Code: "required", Message: msg})
		}
		return
	}
	*out = append(*out, core.FieldError{Field: credField(loc), Code: code, Message: msg})
}

func credField(path []string) string {
	if len(path) == 0 {
		return "credentials"
	}
	return "credentials." + strings.Join(path, ".")
}

// ---------------------------------------------------------------- preparation

// prepared is the storable form of submitted credentials.
type prepared struct {
	enc      []byte
	settings []byte
	secret   []byte
}

// prepare validates credentials (schema, then plugin) and encrypts the
// non-settings part. old is the merged plaintext of the stored credentials
// (nil on create); Mask values are replaced from it.
func (s *Service) prepare(ctx context.Context, bt core.AccountTypeBinding, raw json.RawMessage, old []byte) (*prepared, error) {
	raw = bytes.TrimSpace(raw)
	if len(raw) == 0 || raw[0] != '{' {
		return nil, core.InvalidFields(core.FieldError{Field: "credentials", Code: "invalid",
			Message: t(ctx, "credentials must be a JSON object", "凭证必须为 JSON 对象")})
	}
	if _, err := parseObject(raw); err != nil {
		return nil, core.InvalidFields(core.FieldError{Field: "credentials", Code: "invalid",
			Message: t(ctx, "credentials must be a JSON object", "凭证必须为 JSON 对象")})
	}
	b := []byte(raw)
	if old != nil {
		b = unmask(b, old, bt.Type.SensitiveFields)
	}
	if err := s.validateSchema(ctx, bt, b); err != nil {
		return nil, err
	}
	all, err := parseObject(b)
	if err != nil {
		return nil, err
	}
	sec, st := split(all, bt.Type.SettingsFields)
	secJSON, stJSON := mustJSON(sec), mustJSON(st)
	if bt.Validator != nil {
		resp, err := bt.Validator.ValidateCredentials(ctx, &pluginv1.ValidateCredentialsRequest{
			AccountType:     bt.Type.ID,
			CredentialsJson: string(secJSON),
			SettingsJson:    string(stJSON),
		})
		if err != nil {
			return nil, err
		}
		if len(resp.GetErrors()) > 0 {
			fe := make([]core.FieldError, 0, len(resp.GetErrors()))
			for _, e := range resp.GetErrors() {
				f := "credentials"
				if p := strings.TrimPrefix(e.GetField(), "/"); p != "" {
					f += "." + strings.ReplaceAll(p, "/", ".")
				}
				fe = append(fe, core.FieldError{Field: f, Code: e.GetCode(), Message: e.GetMessage()})
			}
			return nil, core.InvalidFields(fe...)
		}
		if resp.GetNormalizedCredentialsJson() != "" || resp.GetNormalizedSettingsJson() != "" {
			nc, ns := secJSON, stJSON
			if v := resp.GetNormalizedCredentialsJson(); v != "" {
				nc = []byte(v)
			}
			if v := resp.GetNormalizedSettingsJson(); v != "" {
				ns = []byte(v)
			}
			all, err := merge(nc, ns)
			if err != nil {
				return nil, core.ErrPluginUnavailable.WithMessage("plugin returned invalid normalized credentials").WithCause(err)
			}
			sec, st = split(all, bt.Type.SettingsFields)
			secJSON, stJSON = mustJSON(sec), mustJSON(st)
		}
	}
	enc, err := s.d.Cipher.Encrypt(secJSON, aad(bt.Platform))
	if err != nil {
		return nil, err
	}
	return &prepared{enc: enc, settings: stJSON, secret: secJSON}, nil
}

// decrypt returns the plaintext secret part of an account.
func (s *Service) decrypt(platform string, enc []byte) ([]byte, error) {
	return s.d.Cipher.Decrypt(enc, aad(platform))
}
