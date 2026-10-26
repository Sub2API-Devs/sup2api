package engine

import (
	"bytes"
	"encoding/json"
	"errors"
	"strings"
)

// requestBody is one request's body, read once: its top-level members with the
// bytes the client wrote, and the two facts every later step needs about the
// bytes as a whole. Request preparation -- the credential scan, the identity
// carrier, the log's summary, the CLI envelope -- reads this one parse instead
// of parsing the body again.
type requestBody struct {
	raw []byte
	// top is nil when the body is not a JSON object. Build keeps every
	// non-generation key as the client wrote it; direct forwards the raw body.
	// A repeated top-level name keeps its last value, as it always did.
	top map[string]json.RawMessage
	// escaped: the bytes spell something with a \u escape, so a key may be
	// written another way than it reads. The identity carrier then falls back
	// to its byte-level reader, which also refuses a duplicate key.
	escaped bool
	// metadataTwice: the top-level bytes name metadata more than once, so the
	// identity carrier reads them where a duplicate key is refused.
	metadataTwice bool
	// valid: the credential scan can read the body. Not json.Valid: the scan
	// decodes a tree, and a number a float64 cannot hold fails that decode, so
	// such a body stays unreadable to it -- and never safe to retain raw.
	valid bool
	// err: the body is not exactly one JSON object (messagesObject's answer).
	err error
}

var errNotMessagesObject = errors.New("expected a Messages JSON object")

// parseRequestBody reads the top-level members in one pass and keeps each
// value's bytes exactly as written (json.RawMessage, as the whole-body read
// kept them).
func parseRequestBody(raw []byte) *requestBody {
	body := &requestBody{raw: raw}
	var top map[string]json.RawMessage
	if json.Unmarshal(raw, &top) != nil || top == nil {
		body.err = errNotMessagesObject
		body.valid = json.Valid(raw)
	} else {
		body.top = top
		body.valid = true
	}
	body.escaped = bytes.Contains(raw, []byte(`\u`))
	body.metadataTwice = appearsTwice(raw, metadataMember)
	if body.valid && hasUnrepresentableNumber(raw) {
		body.valid = false
	}
	return body
}

// metadataMember is the bytes of the top-level name the identity carrier reads.
var metadataMember = []byte(`"metadata"`)

// appearsTwice reports whether data holds needle at least twice.
func appearsTwice(data, needle []byte) bool {
	first := bytes.Index(data, needle)
	if first < 0 {
		return false
	}
	return bytes.Contains(data[first+len(needle):], needle)
}

// model is the request's model: what the CLI's checkModelRequest requires of
// every request, in either mode.
func (body *requestBody) model() (string, error) {
	if body.err != nil {
		return "", body.err
	}
	var model string
	if json.Unmarshal(body.top["model"], &model) != nil || strings.TrimSpace(model) == "" {
		return "", errors.New("model must be a non-empty string")
	}
	return model, nil
}

// summaryInput is the part of the body the request log describes. It is taken
// before the build envelope reads the members: the fields are computed later,
// off the request goroutine (request_log_diagnostic.go).
type summaryInput struct {
	invalid                         bool
	model, stream, system, messages []byte
}

func (body *requestBody) summaryInput() summaryInput {
	return summaryInput{
		invalid:  body.err != nil,
		model:    body.top["model"],
		stream:   body.top["stream"],
		system:   body.top["system"],
		messages: body.top["messages"],
	}
}

// credentialKeys are the body keys whose values are credentials: the log never
// keeps a raw request that carries one.
var credentialKeys = []string{"authorization_token", "fallback_credit_token"}

// mayHoldCredential says whether either key can appear in the body. A key
// reaches us either spelled as itself (in any case) or with at least one \u
// escape -- JSON has no other way to spell its letters -- so a body with
// neither cannot hold one, and the common case skips the tree walk.
func (body *requestBody) mayHoldCredential() bool {
	return body.escaped || containsAnyFoldASCII(body.raw, credentialKeys)
}

// containsAnyFoldASCII reports whether data holds any of needles (lowercase)
// ignoring ASCII case, in one pass over data without copying it.
func containsAnyFoldASCII(data []byte, needles []string) bool {
	for i := 0; i < len(data); i++ {
		c := asciiLower(data[i])
		for _, needle := range needles {
			if c != needle[0] || i+len(needle) > len(data) {
				continue
			}
			j := 1
			for j < len(needle) && asciiLower(data[i+j]) == needle[j] {
				j++
			}
			if j == len(needle) {
				return true
			}
		}
	}
	return false
}

func asciiLower(b byte) byte {
	if 'A' <= b && b <= 'Z' {
		return b + 'a' - 'A'
	}
	return b
}

// hasUnrepresentableNumber reports whether the body holds a number a float64
// cannot represent (a magnitude above 1.8e308). json.Valid accepts one, the
// credential scan's tree decode does not, so the scan never read such a body
// and it was never retained raw. Every other number is decided from its
// digits; only one whose decade sits at the limit's own is converted.
func hasUnrepresentableNumber(raw []byte) bool {
	for i := 0; i < len(raw); i++ {
		switch raw[i] {
		case '"': // a string's bytes spell no number
			for i++; i < len(raw) && raw[i] != '"'; i++ {
				if raw[i] == '\\' {
					i++
				}
			}
		case '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9':
			end, decade := scanJSONNumber(raw, i)
			switch {
			case decade > 308:
				return true
			case decade == 308:
				// 1e308 is representable and 1.8e308 is not: only the value
				// itself settles it.
				var value float64
				if json.Unmarshal(raw[i:end], &value) != nil {
					return true
				}
			}
			i = end - 1
		}
	}
	return false
}

// scanJSONNumber reads the number token at raw[start:] and returns where it
// ends and the decade of its value: the power of ten of its first significant
// digit (so 0.1e308 is 307). Its digits are used as written, so a value that
// is only zeros has no decade at all and reads as -1.
func scanJSONNumber(raw []byte, start int) (end, decade int) {
	i := start
	if raw[i] == '-' {
		i++
	}
	integerStart := i
	for ; i < len(raw) && '0' <= raw[i] && raw[i] <= '9'; i++ {
	}
	integerEnd := i
	fractionStart, fractionEnd := i, i
	if i+1 < len(raw) && raw[i] == '.' && '0' <= raw[i+1] && raw[i+1] <= '9' {
		fractionStart = i + 1
		for i += 2; i < len(raw) && '0' <= raw[i] && raw[i] <= '9'; i++ {
		}
		fractionEnd = i
	}
	exponent := 0
	if i < len(raw) && (raw[i] == 'e' || raw[i] == 'E') {
		i++
		negative := false
		if i < len(raw) && (raw[i] == '+' || raw[i] == '-') {
			negative = raw[i] == '-'
			i++
		}
		for ; i < len(raw) && '0' <= raw[i] && raw[i] <= '9'; i++ {
			if exponent < 1_000_000 { // past this it overflows on its own
				exponent = exponent*10 + int(raw[i]-'0')
			}
		}
		if negative {
			exponent = -exponent
		}
	}
	return i, firstDigitDecade(raw[integerStart:integerEnd], raw[fractionStart:fractionEnd]) + exponent
}

// firstDigitDecade is the power of ten of the first non-zero digit of a
// number's integer and fraction digits (before its exponent).
func firstDigitDecade(integer, fraction []byte) int {
	for index, digit := range integer {
		if digit != '0' {
			return len(integer) - index - 1
		}
	}
	for index, digit := range fraction {
		if digit != '0' {
			return -index - 1
		}
	}
	return noSignificantDigit // zero: never too large, whatever its exponent
}

// noSignificantDigit keeps a number of only zeros out of the decade test.
const noSignificantDigit = -1 << 20
