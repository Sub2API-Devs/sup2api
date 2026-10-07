package ccgateway

import (
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

// This endpoint is a versioned implementation catalog, not a live capability
// probe. A disconnected or older Worker must never appear verified here.
func (s *Service) featuresGet(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	httpapi.OK(c, features.Catalog())
}
