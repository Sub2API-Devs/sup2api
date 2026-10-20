package engine

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

const requestIdentityEnv = "CCG_REQUEST_IDENTITY"

// configureRequestIdentity enables the mapping only for a request-mode runtime
// whose CLI declares it: the native session factory is what carries the mapped
// session into the metadata and the transport headers.
func (g *Gateway) configureRequestIdentity() {
	g.requestIdentityEnabled = !g.MaintenanceOnly && g.RequestMode != "" && g.CLIInfo.supports(features.RequestIdentityCapability)
}

// accountIdentityKey derives the mapping key from the account's Claude email.
// An API-key account keeps its identifiers untouched: there is no Claude
// account behind it, so nothing would be gained by rewriting them. The same
// email always yields the same key, so every Worker of one account maps a
// client identifier to one value and two accounts never share a mapping.
func accountIdentityKey(env []string) ([]byte, bool) {
	if environmentValue(env, "ANTHROPIC_API_KEY") != "" || storedOAuthIn(env).access == "" {
		return nil, false
	}
	email := strings.TrimSpace(environmentValue(env, "CLAUDE_CODE_USER_EMAIL"))
	if email == "" {
		config, err := readSnapshotObject(snapshotGlobalConfigPath(env))
		if err != nil || config == nil {
			return nil, false
		}
		account, _ := config["oauthAccount"].(map[string]any)
		email = strings.TrimSpace(str(account, "emailAddress"))
	}
	if email == "" {
		return nil, false
	}
	sum := sha256.Sum256([]byte("ccgateway-request-identity-key-v1\x00" + strings.ToLower(email)))
	return sum[:], true
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

// mapRequestIdentity resolves what the upstream request must carry. The client
// value is only ever replaced when it exists: a request without an identity is
// forwarded without metadata instead of being given one.
func mapRequestIdentity(key, raw []byte, mode string) (requestIdentity, error) {
	result := requestIdentity{Version: 2, Mode: mode}
	metadata, err := identityProperty(raw, "metadata")
	if err != nil || len(metadata) == 0 || bytes.Equal(bytes.TrimSpace(metadata), []byte("null")) {
		return result, err
	}
	value, err := identityProperty(metadata, "user_id")
	if err != nil || len(value) == 0 || bytes.Equal(bytes.TrimSpace(value), []byte("null")) {
		return result, err
	}
	// metadata.user_id reaches us in three carriers: the identity object, a
	// string holding that object, and the legacy flat
	// user_<hex>_account_<uuid>_session_<uuid> string. Each is split into its
	// own fields, and the reply keeps the carrier's shape.
	var fields map[string]string
	carrier := bytes.TrimSpace(value)
	switch {
	case len(carrier) > 0 && carrier[0] == '{':
		if fields, _, err = identityFields(carrier); err != nil {
			return result, err
		}
		result.Carrier = "object"
	case len(carrier) > 0 && carrier[0] == '"':
		var userID string
		if json.Unmarshal(carrier, &userID) != nil || utf8.RuneCountInString(userID) > 512 {
			return result, errors.New("metadata.user_id must be a string of at most 512 characters")
		}
		if userID == "" {
			return result, nil
		}
		inner := bytes.TrimSpace([]byte(userID))
		switch match := legacyUserID.FindStringSubmatch(userID); {
		case len(inner) > 0 && inner[0] == '{':
			var present bool
			if fields, present, err = identityFields(inner); err != nil {
				return result, err
			}
			if !present {
				fields = map[string]string{"device_id": userID}
			}
			result.Carrier = "json"
		case match != nil:
			fields = map[string]string{"device_id": match[1], "session_id": match[3]}
			if match[2] != "" {
				fields["account_uuid"] = match[2]
			}
			result.Carrier = "flat"
		default:
			// An opaque user identifier is the whole mapping input.
			fields = map[string]string{"device_id": userID}
			result.Carrier = "json"
		}
	default:
		return result, errors.New("metadata.user_id must be an object or a string")
	}
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
		// Forwarded unchanged; only the CLI session follows the client's own.
		if nativeSessionName.MatchString(session) {
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
