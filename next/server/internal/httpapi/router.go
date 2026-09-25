package httpapi

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Router wraps the console API group (/api/v1).
type Router struct {
	api    *gin.RouterGroup
	tokens core.TokenVerifier
	authz  core.Authorizer
	stepUp core.StepUpVerifier
}

// NewRouter mounts common middleware on engine and returns the /api/v1 router.
func NewRouter(engine *gin.Engine, tokens core.TokenVerifier, authz core.Authorizer, stepUp core.StepUpVerifier) *Router {
	engine.Use(RequestContext(), Recover())
	return &Router{api: engine.Group("/api/v1"), tokens: tokens, authz: authz, stepUp: stepUp}
}

// Public registers an unauthenticated route.
func (r *Router) Public(method, path string, h ...gin.HandlerFunc) {
	r.api.Handle(method, path, h...)
}

// Authed registers a route for any logged-in user.
func (r *Router) Authed(method, path string, h ...gin.HandlerFunc) {
	r.api.Handle(method, path, append([]gin.HandlerFunc{r.authenticate()}, h...)...)
}

// Perm registers a route requiring permission; sensitive permissions also
// require a valid X-Step-Up-Token.
func (r *Router) Perm(method, path, permission string, h ...gin.HandlerFunc) {
	chain := []gin.HandlerFunc{r.authenticate(), r.require(permission)}
	r.api.Handle(method, path, append(chain, h...)...)
}

// PermAny registers a route the caller may use with any one of keys, e.g.
// the "all" key and its "own" counterpart (CONTRACTS §21.1). Every key the
// caller holds is recorded in the request context (Granted /
// core.OwnerScope); if any held key is sensitive a valid X-Step-Up-Token is
// required. Without a match the response is permission_denied with
// details.permission = keys[0].
func (r *Router) PermAny(method, path string, handler gin.HandlerFunc, keys ...string) {
	if len(keys) == 0 {
		panic("httpapi: PermAny without permission keys")
	}
	chain := []gin.HandlerFunc{r.authenticate(), r.requireAny(keys), handler}
	r.api.Handle(method, path, chain...)
}

// Granted returns the permission keys the route middleware matched for the
// caller (see core.Granted).
func Granted(c *gin.Context) []string {
	return core.Granted(c.Request.Context())
}

// Group exposes the raw group for special cases (plugin route proxy).
func (r *Router) Group() *gin.RouterGroup { return r.api }

func (r *Router) authenticate() gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		token, ok := strings.CutPrefix(h, "Bearer ")
		if !ok || token == "" {
			Fail(c, core.ErrUnauthenticated)
			return
		}
		uid, err := r.tokens.VerifyAccessToken(c.Request.Context(), token)
		if err != nil {
			Fail(c, core.ErrUnauthenticated.WithCause(err))
			return
		}
		c.Request = c.Request.WithContext(core.WithUserID(c.Request.Context(), uid))
		c.Next()
	}
}

func (r *Router) require(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		uid, _ := core.UserID(ctx)
		ok, err := r.authz.Can(ctx, uid, permission)
		if err != nil {
			Fail(c, err)
			return
		}
		if !ok {
			Fail(c, core.ErrPermissionDenied.WithDetails(map[string]any{"permission": permission}))
			return
		}
		if r.authz.IsSensitive(permission) {
			if err := r.stepUp.VerifyStepUp(ctx, uid, c.GetHeader("X-Step-Up-Token")); err != nil {
				Fail(c, core.ErrStepUpRequired.WithCause(err))
				return
			}
		}
		c.Request = c.Request.WithContext(core.WithGranted(ctx, []string{permission}))
		c.Next()
	}
}

func (r *Router) requireAny(keys []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		uid, _ := core.UserID(ctx)
		granted := make([]string, 0, len(keys))
		sensitive := false
		for _, k := range keys {
			ok, err := r.authz.Can(ctx, uid, k)
			if err != nil {
				Fail(c, err)
				return
			}
			if !ok {
				continue
			}
			granted = append(granted, k)
			sensitive = sensitive || r.authz.IsSensitive(k)
		}
		if len(granted) == 0 {
			Fail(c, core.ErrPermissionDenied.WithDetails(map[string]any{"permission": keys[0]}))
			return
		}
		if sensitive {
			if err := r.stepUp.VerifyStepUp(ctx, uid, c.GetHeader("X-Step-Up-Token")); err != nil {
				Fail(c, core.ErrStepUpRequired.WithCause(err))
				return
			}
		}
		c.Request = c.Request.WithContext(core.WithGranted(ctx, granted))
		c.Next()
	}
}

// RequestContext assigns X-Request-Id and locale (Accept-Language zh*/en).
func RequestContext() gin.HandlerFunc {
	return func(c *gin.Context) {
		rid := c.GetHeader("X-Request-Id")
		if rid == "" || len(rid) > 64 {
			rid = NewRequestID()
		}
		c.Header("X-Request-Id", rid)
		ctx := core.WithRequestID(c.Request.Context(), rid)
		if strings.HasPrefix(strings.ToLower(c.GetHeader("Accept-Language")), "zh") {
			ctx = core.WithLocale(ctx, "zh")
		}
		c.Request = c.Request.WithContext(ctx)
		start := time.Now()
		c.Next()
		slog.DebugContext(ctx, "http", "request_id", rid, "method", c.Request.Method,
			"path", c.Request.URL.Path, "status", c.Writer.Status(), "ms", time.Since(start).Milliseconds())
	}
}

// Recover converts panics to 500 without killing the process.
func Recover() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if p := recover(); p != nil {
				slog.ErrorContext(c.Request.Context(), "panic", "request_id", core.RequestID(c.Request.Context()), "panic", p)
				if !c.Writer.Written() {
					c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": core.ErrInternal})
				}
			}
		}()
		c.Next()
	}
}

// NewRequestID returns a 24-hex-char random id.
func NewRequestID() string {
	var b [12]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}
