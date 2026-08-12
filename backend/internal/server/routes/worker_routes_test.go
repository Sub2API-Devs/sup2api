package routes

import (
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/handler"
	"github.com/Wei-Shaw/sub2api/internal/handler/admin"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestRegisterWorkerRoutesExposesCompleteAdminContract(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	handlers := &handler.Handlers{Admin: &handler.AdminHandlers{Worker: admin.NewWorkerHandler(nil)}}
	registerWorkerRoutes(router.Group("/api/v1/admin"), handlers)
	routes := make(map[string]struct{})
	for _, route := range router.Routes() {
		routes[route.Method+" "+route.Path] = struct{}{}
	}
	for _, expected := range []string{
		"GET /api/v1/admin/workers",
		"POST /api/v1/admin/workers",
		"GET /api/v1/admin/workers/nats-security",
		"PUT /api/v1/admin/workers/nats-security",
		"GET /api/v1/admin/workers/:id",
		"PUT /api/v1/admin/workers/:id",
		"PATCH /api/v1/admin/workers/:id/enabled",
		"DELETE /api/v1/admin/workers/:id",
		"POST /api/v1/admin/workers/:id/test",
		"GET /api/v1/admin/workers/:id/accounts",
		"POST /api/v1/admin/workers/:id/accounts/openai/api-key",
		"POST /api/v1/admin/workers/:id/accounts/openai/oauth/start",
		"POST /api/v1/admin/workers/:id/accounts/openai/oauth/complete",
		"POST /api/v1/admin/workers/:id/accounts/:account_id/refresh",
		"POST /api/v1/admin/workers/:id/accounts/:account_id/test",
		"DELETE /api/v1/admin/workers/:id/accounts/:account_id",
		"GET /api/v1/admin/workers/:id/logs",
	} {
		_, ok := routes[expected]
		require.Truef(t, ok, "missing route %s", expected)
	}
}
