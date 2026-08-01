package requeststate

import (
	"context"
	"errors"
	"sync"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
)

// ErrLeaseRevoked is the cancellation cause installed when the authoritative
// control plane rejects a renewal or the last acknowledged lease expires. It
// must not be reported as a client cancellation in billing facts.
var ErrLeaseRevoked = errors.New("request lease revoked")

type contextKey struct{}

// State carries per-request admission, proxy, and settlement facts. It is the
// only coordination surface shared by the Caddy HTTP modules.
type State struct {
	RequestID       string
	ClientIP        string
	RequestedModel  string
	ModelValueStart int64
	ModelValueEnd   int64
	ModelInPath     bool
	Stream          bool
	Auth            *AuthGrant
	Admission       *controlv1.OpenRequestResponse
	StartedAt       time.Time

	mu               sync.Mutex
	upstreamStarted  bool
	firstByteAt      time.Time
	finishedAt       time.Time
	statusCode       int
	responseBytes    int64
	errorCode        string
	attempts         int32
	usage            Usage
	responseRewrites [][2]string
	protocolData     map[string][]byte
}

// SetResponseRewrites installs request-scoped protocol replacements used by a
// streaming response transformer (for example Claude tool-name restoration).
func (s *State) SetResponseRewrites(rewrites [][2]string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.responseRewrites = append(s.responseRewrites[:0], rewrites...)
}

func (s *State) ResponseRewrites() [][2]string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([][2]string(nil), s.responseRewrites...)
}

func (s *State) SetProtocolData(key string, value []byte) {
	if key == "" {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.protocolData == nil {
		s.protocolData = make(map[string][]byte)
	}
	s.protocolData[key] = append([]byte(nil), value...)
}

func (s *State) ProtocolData(key string) []byte {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]byte(nil), s.protocolData[key]...)
}

// AuthGrant is the immutable request-local projection of the control-plane
// grant. It intentionally contains no plaintext API key or upstream secret.
type AuthGrant struct {
	GrantToken             string
	CredentialDigest       string
	APIKeyID               int64
	UserID                 int64
	GroupID                int64
	ExpiresAtUnixMilli     int64
	APIKeyExpiresUnixMilli int64
	IPWhitelist            []string
	IPBlacklist            []string
	PolicyVersion          string
}

func (g *AuthGrant) Clone() *AuthGrant {
	if g == nil {
		return nil
	}
	clone := *g
	clone.IPWhitelist = append([]string(nil), g.IPWhitelist...)
	clone.IPBlacklist = append([]string(nil), g.IPBlacklist...)
	return &clone
}

func WithContext(ctx context.Context, state *State) context.Context {
	return context.WithValue(ctx, contextKey{}, state)
}

func FromContext(ctx context.Context) (*State, bool) {
	state, ok := ctx.Value(contextKey{}).(*State)
	return state, ok && state != nil
}

func ClientCancelled(ctx context.Context) bool {
	return ctx != nil && ctx.Err() != nil && !errors.Is(context.Cause(ctx), ErrLeaseRevoked)
}

func (s *State) MarkUpstreamStarted() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.upstreamStarted = true
	s.attempts++
}

func (s *State) MarkUpstreamRetry() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.attempts++
}

func (s *State) ObserveWrite(status int, bytes int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.firstByteAt.IsZero() {
		s.firstByteAt = time.Now()
	}
	if status > 0 {
		s.statusCode = status
	}
	if bytes > 0 {
		s.responseBytes += int64(bytes)
	}
}

func (s *State) SetStatus(status int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.statusCode = status
}

func (s *State) SetError(code string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.errorCode = code
}

func (s *State) SetErrorIfEmpty(code string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.errorCode == "" {
		s.errorCode = code
	}
}

func (s *State) SetUsage(usage Usage) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.usage = usage
}

func (s *State) Finish() Snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.finishedAt.IsZero() {
		s.finishedAt = time.Now()
	}
	usage := s.usage
	usage.ResponseBytes = s.responseBytes
	return Snapshot{
		UpstreamStarted: s.upstreamStarted,
		FirstByteAt:     s.firstByteAt,
		FinishedAt:      s.finishedAt,
		StatusCode:      s.statusCode,
		ResponseBytes:   s.responseBytes,
		ErrorCode:       s.errorCode,
		Attempts:        s.attempts,
		Usage:           usage,
	}
}

type Snapshot struct {
	UpstreamStarted bool
	FirstByteAt     time.Time
	FinishedAt      time.Time
	StatusCode      int
	ResponseBytes   int64
	ErrorCode       string
	Attempts        int32
	Usage           Usage
}

// Usage is deliberately independent from generated protobuf messages, which
// contain internal synchronization state and must never be copied by value.
type Usage struct {
	InputTokens         int64
	OutputTokens        int64
	CacheReadTokens     int64
	CacheCreationTokens int64
	ReasoningTokens     int64
	ResponseBytes       int64
}
