package pluginsdk

import (
	"cmp"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// Caller sessions: short-lived state of a multi-request flow (an OAuth
// authorization, a device code login) kept in the plugin's KV and bound to
// the console user who started it. The session id alone is not enough to
// continue a flow: a request by anyone else finds nothing, exactly as if the
// session had expired, so a leaked or guessed id cannot be used to finish
// someone else's authorization and read its result.
//
//	id, err := pluginsdk.SaveCallerSession(ctx, host.KV(), "oauth", req, session, 30*time.Minute)
//	ok, err := pluginsdk.LoadCallerSession(ctx, host.KV(), "oauth", id, req, &session)
//
// The routes using them must be authenticated (scope admin or user): a
// request without a caller can neither start nor continue a session.

// ErrNoCaller is returned when a caller session is saved for a request that
// carries no authenticated user.
var ErrNoCaller = errors.New("pluginsdk: the request has no authenticated caller")

// callerSession is the stored form of a caller session.
type callerSession struct {
	UserID  int64           `json:"uid"`
	Payload json.RawMessage `json:"v"`
}

// ErrNoSession is returned by UpdateCallerSession when the caller holds no
// session with that id (never stored, expired, or someone else's).
var ErrNoSession = errors.New("pluginsdk: the caller has no such session")

// SaveCallerSession stores v as a new session of req's caller in namespace
// ns, for ttl, and returns its fresh random id. It fails with ErrNoCaller
// (answer it with Unauthenticated) when the request has no user.
func SaveCallerSession(ctx context.Context, kv KV, ns string, req *pluginv1.HTTPRequest, v any, ttl time.Duration) (id string, err error) {
	id = randomToken(sessionIDBytes)
	if err := putCallerSession(ctx, kv, ns, id, req, v, ttl); err != nil {
		return "", err
	}
	return id, nil
}

// UpdateCallerSession rewrites session id of req's caller with v and ttl.
// The session must be the caller's, as for LoadCallerSession: an id nobody
// holds or another user's is ErrNoSession and nothing is written, so an id
// taken from the request can neither create a session nor take one over.
func UpdateCallerSession(ctx context.Context, kv KV, ns, id string, req *pluginv1.HTTPRequest, v any, ttl time.Duration) error {
	if req.GetCaller().GetUserId() <= 0 {
		return ErrNoCaller
	}
	var held json.RawMessage
	if ok, err := LoadCallerSession(ctx, kv, ns, id, req, &held); err != nil || !ok {
		return cmp.Or(err, ErrNoSession)
	}
	return putCallerSession(ctx, kv, ns, id, req, v, ttl)
}

// putCallerSession writes session id bound to req's caller.
func putCallerSession(ctx context.Context, kv KV, ns, id string, req *pluginv1.HTTPRequest, v any, ttl time.Duration) error {
	uid := req.GetCaller().GetUserId()
	if uid <= 0 {
		return ErrNoCaller
	}
	payload, err := json.Marshal(v)
	if err != nil {
		return err
	}
	raw, err := json.Marshal(callerSession{UserID: uid, Payload: payload})
	if err != nil {
		return err
	}
	return kv.Set(ctx, ns, id, raw, ttl)
}

// LoadCallerSession reads session id of namespace ns into v. ok is false,
// with nothing to tell the cases apart, when the session does not exist, has
// expired, belongs to another user, or was not stored by SaveCallerSession;
// err is only a failed KV call or a payload that does not fit v.
func LoadCallerSession(ctx context.Context, kv KV, ns, id string, req *pluginv1.HTTPRequest, v any) (ok bool, err error) {
	uid := req.GetCaller().GetUserId()
	if uid <= 0 || id == "" {
		return false, nil
	}
	raw, found, err := kv.Get(ctx, ns, id)
	if err != nil || !found {
		return false, err
	}
	var s callerSession
	if json.Unmarshal(raw, &s) != nil || s.UserID != uid || len(s.Payload) == 0 {
		return false, nil
	}
	if err := json.Unmarshal(s.Payload, v); err != nil {
		return false, err
	}
	return true, nil
}

// sessionIDBytes is the entropy of a caller session id (192 bits).
const sessionIDBytes = 24

// randomToken returns n random bytes as unpadded URL-safe base64.
// crypto/rand.Read never fails (it crashes the program instead, since Go
// 1.24).
func randomToken(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}
