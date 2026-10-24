package ccgateway

import (
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

// This endpoint describes the request path the core speaks to a Worker, not
// a live capability probe. A disconnected or older Worker must never appear
// verified here; per-account evidence is served by serveFeatures.
func (s *Service) featuresGet(c *gin.Context) {
	httpapi.NoStore(c)
	httpapi.OK(c, features.RequestCatalog("request_build"))
}
