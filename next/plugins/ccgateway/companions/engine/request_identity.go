package engine

import (
	"bytes"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

const (
	requestIdentityEnv = "CCG_REQUEST_IDENTITY"
	// directPolicyEnv carries the direct billing context (entrypoint, billing
	// sources); never an identity line (request levels: direct is level none).
	directPolicyEnv           = "CCG_DIRECT_POLICY"
	requestIdentitySecretFile = "request-identity.key"
)

// configureRequestIdentity enables the mapping only for a runtime whose CLI
// declares it: the native session factory is what carries the mapped
// session into the metadata and the transport headers. The account's mapping
// secret lives in the persistent data directory, so restarts and in-place
// updates keep every mapping.
func (g *Gateway) configureRequestIdentity(root string) error {
	g.requestIdentityEnabled = !g.MaintenanceOnly && g.CLIInfo.supports(features.RequestIdentityCapability)
	if !g.requestIdentityEnabled {
		return nil
	}
	secret, err := loadRequestIdentitySecret(filepath.Join(root, requestIdentitySecretFile))
	if err != nil {
		return fmt.Errorf("request identity secret: %w", err)
	}
	g.requestIdentitySecret = secret
	return nil
}

// loadRequestIdentitySecret reads the account secret, creating it once. The
// secret is published with a hard link so that of two processes starting on
// one volume, exactly one complete secret survives.
func loadRequestIdentitySecret(path string) ([]byte, error) {
	raw, err := os.ReadFile(path)
	if err == nil {
		if len(raw) != 32 {
			return nil, errors.New("stored secret is invalid")
		}
		return raw, nil
	}
	if !os.IsNotExist(err) {
		return nil, err
	}
	secret := make([]byte, 32)
	if _, err = rand.Read(secret); err != nil {
		return nil, err
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), ".request-identity-*")
	if err != nil {
		return nil, err
	}
	defer os.Remove(tmp.Name())
	_, err = tmp.Write(secret)
	if err == nil {
		err = tmp.Sync()
	}
	if closeErr := tmp.Close(); err == nil {
		err = closeErr
	}
	if err == nil {
		err = os.Chmod(tmp.Name(), 0600)
	}
	if err != nil {
		return nil, err
	}
	if err = os.Link(tmp.Name(), path); os.IsExist(err) {
		return loadRequestIdentitySecret(path)
	}
	return secret, err
}

// requestIdentityKey derives the mapping key of the account's Claude login:
// the Worker's private secret, keyed by the login's email. The secret makes the
// mapping unlinkable for anyone who knows the email; the email gives an account
// re-authorised with another Claude login a mapping of its own. oauth is false
// for an API-key account, which has no Claude account to map for; the key is
// nil when the login's email is unknown.
func requestIdentityKey(secret []byte, env []string) (key []byte, oauth bool) {
	if environmentValue(env, "ANTHROPIC_API_KEY") != "" || storedOAuthIn(env).access == "" {
		return nil, false
	}
	email := strings.TrimSpace(environmentValue(env, "CLAUDE_CODE_USER_EMAIL"))
	if email == "" {
		if config, err := readSnapshotObject(snapshotGlobalConfigPath(env)); err == nil && config != nil {
			account, _ := config["oauthAccount"].(map[string]any)
			email = strings.TrimSpace(str(account, "emailAddress"))
		}
	}
	if email == "" || len(secret) == 0 {
		return nil, true
	}
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte("ccgateway-request-identity-key-v2\x00" + strings.ToLower(email)))
	return mac.Sum(nil), true
}

// resolveRequestIdentity is the identity build gives one request: the
// client's value mapped with the account key (replace, the one source since
// 2026-10-21). Replace needs a key: an API-key account keeps the client's
// value, and a login whose email is unknown falls back to the Worker's own
// identity rather than forwarding the client's.
func (g *Gateway) resolveRequestIdentity(env []string, client clientIdentity) (requestIdentity, error) {
	key, oauth := requestIdentityKey(g.requestIdentitySecret, env)
	mode := features.RequestIdentityDefault
	if !oauth {
		mode = "client"
	} else if key == nil {
		mode = "worker"
	}
	return mapRequestIdentity(key, client, mode)
}

// legacyUserID is the flat form older clients put in metadata.user_id:
// user_<64 hex>_account_<uuid>_session_<uuid>. The account segment is optional
// and may be empty, as some clients sent user_<hex>_account__session_<uuid>.
var legacyUserID = regexp.MustCompile(`(?i)^user_([0-9a-f]{64})(?:_account_([0-9a-f-]*))?_session_([0-9a-f-]+)$`)

// requestIdentity is the per-request context the CLI needs to produce the
// upstream metadata. Mode is the configured source, Rewrite says whether the
// client's value is replaced at all, and Session is the root session the CLI
// must adopt so its transport header matches the metadata.
type requestIdentity struct {
	Version int    `json:"version"`
	Mode    string `json:"mode"`
	Rewrite bool   `json:"rewrite"`
	Session string `json:"session_id,omitempty"`
	Device  string `json:"device_id,omitempty"`
	Parent  string `json:"parent_session_id,omitempty"`
	// Carrier is the shape the client used, so the rewritten value keeps it.
	Carrier string `json:"carrier,omitempty"`
}

// identityProperty reads one property of a JSON object, preserving the
// surrounding bytes and rejecting ambiguous identity carriers (including
// escaped spellings of a duplicate key).
func identityProperty(raw []byte, name string) (json.RawMessage, error) {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	token, err := decoder.Token()
	if err != nil || token != json.Delim('{') {
		return nil, errors.New("request identity requires JSON objects")
	}
	var result json.RawMessage
	for decoder.More() {
		key, err := decoder.Token()
		if err != nil {
			return nil, err
		}
		var value json.RawMessage
		if err = decoder.Decode(&value); err != nil {
			return nil, err
		}
		if key == name {
			if result != nil {
				return nil, errors.New("duplicate request identity property")
			}
			result = value
		}
	}
	if _, err = decoder.Token(); err != nil {
		return nil, err
	}
	if _, err = decoder.Token(); err != io.EOF {
		return nil, errors.New("invalid request identity JSON")
	}
	return result, nil
}

// identityFields reads the identity fields of a structured carrier. present
// reports whether the carrier is structured at all: one that holds none of
// these keys is an opaque user identifier instead.
func identityFields(raw []byte) (fields map[string]string, present bool, err error) {
	fields = map[string]string{}
	for _, name := range []string{"device_id", "account_uuid", "session_id", "parent_session_id"} {
		value, err := identityProperty(raw, name)
		if err != nil {
			return nil, false, err
		}
		if value == nil {
			continue
		}
		present = true
		if bytes.Equal(bytes.TrimSpace(value), []byte("null")) {
			continue
		}
		var text string
		if json.Unmarshal(value, &text) != nil {
			return nil, false, errors.New("invalid client identity field")
		}
		fields[name] = text
	}
	return fields, present, nil
}

func identityDigest(key []byte, values ...string) [32]byte {
	raw, _ := json.Marshal(append([]string{"ccgateway-request-identity-v1"}, values...))
	mac := hmac.New(sha256.New, key)
	_, _ = mac.Write(raw)
	var sum [32]byte
	copy(sum[:], mac.Sum(nil))
	return sum
}

// clientIdentityFields splits the client's metadata.user_id into its fields
// and names its carrier; nil fields mean the request carries none.
// metadata.user_id reaches us in three carriers: the identity object, a string
// holding that object, and the legacy flat
// user_<hex>_account_<uuid>_session_<uuid> string. Each is split into its own
// fields, and the reply keeps the carrier's shape.
func clientIdentityFields(raw []byte) (map[string]string, string, error) {
	metadata, err := identityProperty(raw, "metadata")
	if err != nil || len(metadata) == 0 || bytes.Equal(bytes.TrimSpace(metadata), []byte("null")) {
		return nil, "", err
	}
	value, err := identityProperty(metadata, "user_id")
	if err != nil || len(value) == 0 || bytes.Equal(bytes.TrimSpace(value), []byte("null")) {
		return nil, "", err
	}
	carrier := bytes.TrimSpace(value)
	switch {
	case len(carrier) > 0 && carrier[0] == '{':
		fields, _, err := identityFields(carrier)
		if err != nil {
			return nil, "", err
		}
		return fields, "object", nil
	case len(carrier) > 0 && carrier[0] == '"':
		var userID string
		if json.Unmarshal(carrier, &userID) != nil || utf8.RuneCountInString(userID) > 512 {
			return nil, "", errors.New("metadata.user_id must be a string of at most 512 characters")
		}
		if userID == "" {
			return nil, "", nil
		}
		inner := bytes.TrimSpace([]byte(userID))
		switch match := legacyUserID.FindStringSubmatch(userID); {
		case len(inner) > 0 && inner[0] == '{':
			fields, present, err := identityFields(inner)
			if err != nil {
				return nil, "", err
			}
			if !present {
				fields = map[string]string{"device_id": userID}
			}
			return fields, "json", nil
		case match != nil:
			fields := map[string]string{"device_id": match[1], "session_id": match[3]}
			if match[2] != "" {
				fields["account_uuid"] = match[2]
			}
			return fields, "flat", nil
		default:
			// An opaque user identifier is the whole mapping input.
			return map[string]string{"device_id": userID}, "json", nil
		}
	default:
		return nil, "", errors.New("metadata.user_id must be an object or a string")
	}
}

// clientIdentity is the client's metadata.user_id split into its fields
// (clientIdentityFields): read once per request, for the identity and the
// agent context alike. err says the Worker could not read it.
type clientIdentity struct {
	fields  map[string]string
	carrier string
	err     error
}

func readClientIdentity(raw []byte) clientIdentity {
	fields, carrier, err := clientIdentityFields(raw)
	return clientIdentity{fields: fields, carrier: carrier, err: err}
}

// mapRequestIdentity resolves what the upstream request must carry. The client
// value is only ever replaced when it exists: a request without an identity is
// forwarded without metadata instead of being given one.
func mapRequestIdentity(key []byte, client clientIdentity, mode string) (requestIdentity, error) {
	result := requestIdentity{Version: 2, Mode: mode}
	fields := client.fields
	if client.err != nil || fields == nil {
		return result, client.err
	}
	result.Carrier = client.carrier
	user, session, parent := fields["device_id"], fields["session_id"], fields["parent_session_id"]
	if user == "" {
		user = fields["account_uuid"]
	}
	if user == "" && session == "" && parent == "" {
		// Nothing usable to map: leave the request exactly as it came.
		result.Carrier = ""
		return result, nil
	}
	switch mode {
	case "client":
		// Forwarded unchanged; only the CLI session follows the client's own,
		// when the CLI can adopt it (audit C6): otherwise the CLI keeps its
		// native random session and the metadata still goes as sent.
		if cliSessionPattern.MatchString(session) {
			result.Session = session
		}
	case "worker":
		// The CLI's own identity replaces the client's value.
		result.Rewrite = true
	default:
		result.Rewrite = true
		result.Session = uuid()
		if user != "" {
			sum := identityDigest(key, "device", user)
			result.Device = hex.EncodeToString(sum[:])
		}
		if session != "" {
			result.Session = digestUUID(identityDigest(key, "session", session))
		}
		if parent != "" {
			result.Parent = digestUUID(identityDigest(key, "session", parent))
		}
	}
	return result, nil
}
