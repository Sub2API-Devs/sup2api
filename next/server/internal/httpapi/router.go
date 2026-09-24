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
