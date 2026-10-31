package gateway

import (
	"bytes"
	"encoding/json"
	"net/http"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// maxJSONDepth bounds the nesting of a request body. gjson validates and
// reads JSON recursively, and a body of a few million '[' overflows the
// goroutine stack - a fatal error that takes the whole process down, not a
// panic a handler can recover. encoding/json stops at the same depth.
const maxJSONDepth = 10000

// smallObjectKeys is how many keys an object keeps in a slice before its
// duplicate check switches to a map.
const smallObjectKeys = 16

// jsonShape is what scanJSONShape found in a body.
type jsonShape struct {
	tooDeep bool
	// dupKey is the first object key seen twice in one object (unescaped);
	// dup reports whether there was one.
	dup    bool
	dupKey string
}

type keyFrame struct {
	keys [][]byte // unescaped keys while the object is small
	set  map[string]struct{}
}

func (f *keyFrame) add(k []byte) (dup bool) {
	if f.set != nil {
		if _, ok := f.set[string(k)]; ok {
			return true
		}
		f.set[string(k)] = struct{}{}
		return false
	}
	for _, s := range f.keys {
		if bytes.Equal(s, k) {
			return true
		}
	}
	f.keys = append(f.keys, k)
	if len(f.keys) > smallObjectKeys {
		f.set = make(map[string]struct{}, 2*len(f.keys))
		for _, s := range f.keys {
			f.set[string(s)] = struct{}{}
		}
	}
	return false
}

// scanJSONShape looks for repeated object keys and excessive nesting in one
// pass over b, without decoding it. Strings are skipped with IndexByte, so a
// body that is mostly base64 costs about a memory scan. Keys are compared
// after unescaping (a key spelled with a \u escape equals its plain
// spelling). It does not
// validate: run it on any bytes, then judge validity separately.
//
// Why reject repeated keys (CONTRACTS §25.9): gjson, which hooks read their
// fields with, takes the first of them, while encoding/json and most
// upstreams take the last, so {"messages":[benign],"messages":[other]}
// would let a hook review one prompt and the upstream answer another.
func scanJSONShape(b []byte) jsonShape {
	var (
		kinds   []byte // '{' or '[' per open container
		frames  []keyFrame
		wantKey bool
	)
	n := len(b)
	for i := 0; i < n; {
		switch b[i] {
		case '{', '[':
			if len(kinds) >= maxJSONDepth {
				return jsonShape{tooDeep: true}
			}
			kinds = append(kinds, b[i])
			if b[i] == '{' {
				if len(frames) < cap(frames) {
					frames = frames[:len(frames)+1]
					f := &frames[len(frames)-1]
					f.keys, f.set = f.keys[:0], nil
				} else {
					frames = append(frames, keyFrame{})
				}
				wantKey = true
			} else {
				wantKey = false
			}
			i++
		case '}', ']':
			if len(kinds) > 0 {
				if kinds[len(kinds)-1] == '{' {
					frames = frames[:len(frames)-1]
				}
				kinds = kinds[:len(kinds)-1]
			}
			wantKey = false
			i++
		case ',':
			wantKey = len(kinds) > 0 && kinds[len(kinds)-1] == '{'
			i++
		case ':':
			wantKey = false
			i++
		case '"':
			end := stringEnd(b, i+1)
			if end < 0 {
				return jsonShape{} // unterminated: the validator says so
			}
			if wantKey && len(frames) > 0 {
				k := b[i+1 : end]
				if bytes.IndexByte(k, '\\') >= 0 {
					var s string
					if json.Unmarshal(b[i:end+1], &s) != nil {
						return jsonShape{}
					}
					k = []byte(s)
				}
				if frames[len(frames)-1].add(k) {
					return jsonShape{dup: true, dupKey: string(k)}
				}
				wantKey = false
			}
			i = end + 1
		default:
			i++
		}
	}
	return jsonShape{}
}

// stringEnd returns the index of the quote closing the string whose
// contents start at from, or -1.
func stringEnd(b []byte, from int) int {
	for at := from; ; {
		j := bytes.IndexByte(b[at:], '"')
		if j < 0 {
			return -1
		}
		q := at + j
		k := q - 1
		for k >= from && b[k] == '\\' {
			k--
		}
		if (q-1-k)%2 == 0 {
			return q
		}
		at = q + 1
	}
}

// maxDupKeyShown bounds the key quoted in the error message.
const maxDupKeyShown = 64

// jsonShapeError is the client error for a body scanJSONShape objects to,
// or nil.
func jsonShapeError(s jsonShape, what string) *gwError {
	switch {
	case s.tooDeep:
		return &gwError{Status: http.StatusBadRequest, Code: core.ErrInvalidArgument.Code,
			Message: what + " is nested too deeply", RecordType: errTypeInvalidRequest}
	case s.dup:
		return &gwError{Status: http.StatusBadRequest, Code: core.ErrInvalidArgument.Code,
			Message: what + " contains duplicate key " + strconvQuote(truncateUTF8(s.dupKey, maxDupKeyShown)) +
				": each object key may appear only once", RecordType: errTypeInvalidRequest}
	}
	return nil
}
