package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"regexp"
	"strings"
)

// Upstream metadata.user_id (§53.12). The client's metadata only selects the
// session and never reaches the upstream API. Every upstream model request
// carries the CLI's own user_id, with its session set to U. CLI 2.1.292 sends
// the compact JSON string {"device_id":"<64 hex>","account_uuid":"<uuid or
// empty>","session_id":"<CLI session>"}; only session_id changes, the rest
// keeps its bytes. An older user_<device>_account_<uuid>_session_<uuid>
// string has its session segment replaced. Anything else becomes
// {"device_id":"","account_uuid":"","session_id":U}.

var legacyUserIDSession = regexp.MustCompile(`^(.*_session_)[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func compactJSON(v any) string {
	var b bytes.Buffer
	encoder := json.NewEncoder(&b)
	encoder.SetEscapeHTML(false)
	_ = encoder.Encode(v)
	return strings.TrimSuffix(b.String(), "\n")
}

// cliUserID is a user_id in CLI 2.1.292's own layout and key order.
func cliUserID(device, account, session string) string {
	return `{"device_id":` + compactJSON(device) + `,"account_uuid":` + compactJSON(account) + `,"session_id":` + compactJSON(session) + `}`
}

// sessionUserID is the CLI's user_id string with its session set to session.
func sessionUserID(cli, session string) string {
	var fields map[string]any
	if json.Unmarshal([]byte(cli), &fields) == nil && fields != nil {
		if old, ok := fields["session_id"].(string); ok {
			key := regexp.MustCompile(`("session_id"\s*:\s*)` + regexp.QuoteMeta(compactJSON(old)))
			if len(key.FindAllStringIndex(cli, -1)) == 1 {
				out := key.ReplaceAllStringFunc(cli, func(match string) string {
					return key.FindStringSubmatch(match)[1] + compactJSON(session)
				})
				var check map[string]any
				if json.Unmarshal([]byte(out), &check) == nil && check["session_id"] == session && len(check) == len(fields) {
					return out
				}
			}
		}
		device, _ := fields["device_id"].(string)
		account, _ := fields["account_uuid"].(string)
		return cliUserID(device, account, session)
	}
	if m := legacyUserIDSession.FindStringSubmatch(cli); m != nil {
		return m[1] + session
	}
	return cliUserID("", "", session)
}

// upstreamUserID rewrites the top-level metadata.user_id string of a request
// body to sessionUserID. Only the bytes of that one string value change; a
// body without such a value is returned as is.
func upstreamUserID(body []byte, session string) ([]byte, error) {
	start, end, value, found, err := metadataUserIDSpan(body)
	if err != nil || !found {
		return body, err
	}
	replacement := compactJSON(sessionUserID(value, session))
	out := make([]byte, 0, len(body)-(end-start)+len(replacement))
	out = append(append(append(out, body[:start]...), replacement...), body[end:]...)
	return out, nil
}

// metadataUserIDSpan locates the JSON string token of metadata.user_id.
func metadataUserIDSpan(body []byte) (start, end int, value string, found bool, err error) {
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.UseNumber()
	open := func() (bool, error) {
		token, err := decoder.Token()
		if err != nil {
			return false, err
		}
		delim, ok := token.(json.Delim)
		return ok && delim == '{', nil
	}
	if ok, err := open(); err != nil || !ok {
		return 0, 0, "", false, fmt.Errorf("model request body is not a JSON object")
	}
	for decoder.More() {
		key, err := decoder.Token()
		if err != nil {
			return 0, 0, "", false, err
		}
		if key != "metadata" {
			var skip json.RawMessage
			if err := decoder.Decode(&skip); err != nil {
				return 0, 0, "", false, err
			}
			continue
		}
		if ok, err := open(); err != nil || !ok {
			// null or another type: no user_id to carry.
			return 0, 0, "", false, err
		}
		for decoder.More() {
			inner, err := decoder.Token()
			if err != nil {
				return 0, 0, "", false, err
			}
			if inner != "user_id" {
				var skip json.RawMessage
				if err := decoder.Decode(&skip); err != nil {
					return 0, 0, "", false, err
				}
				continue
			}
			after := int(decoder.InputOffset())
			token, err := decoder.Token()
			if err != nil {
				return 0, 0, "", false, err
			}
			text, ok := token.(string)
			if !ok {
				return 0, 0, "", false, nil
			}
			end = int(decoder.InputOffset())
			start = after
			for start < end && body[start] != '"' {
				start++
			}
			if start >= end {
				return 0, 0, "", false, fmt.Errorf("cannot locate metadata.user_id")
			}
			return start, end, text, true, nil
		}
		return 0, 0, "", false, nil
	}
	if _, err := decoder.Token(); err != nil && err != io.EOF {
		return 0, 0, "", false, err
	}
	return 0, 0, "", false, nil
}
