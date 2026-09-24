package authz

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// RegisterRoutes mounts /roles, /permissions and /me/menus.
func (s *Service) RegisterRoutes(r *httpapi.Router) {
	r.Authed(http.MethodGet, "/me/menus", s.handleMenus)
	r.Perm(http.MethodGet, "/roles", "role:read", s.handleListRoles)
	r.Perm(http.MethodGet, "/roles/:id", "role:read", s.handleGetRole)
	r.Perm(http.MethodPost, "/roles", "role:manage", s.handleCreateRole)
	r.Perm(http.MethodPatch, "/roles/:id", "role:manage", s.handleUpdateRole)
	r.Perm(http.MethodDelete, "/roles/:id", "role:manage", s.handleDeleteRole)
	r.Perm(http.MethodPut, "/roles/:id/permissions", "role:manage", s.handleSetRolePermissions)
	r.Perm(http.MethodGet, "/permissions", "role:read", s.handleListPermissions)
}

func (s *Service) handleMenus(c *gin.Context) {
	uid, _ := core.UserID(c.Request.Context())
	menus, err := s.Menus(c.Request.Context(), uid)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, menus)
}

func (s *Service) handleListRoles(c *gin.Context) {
	roles, err := s.ListRoles(c.Request.Context())
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, roles)
}

func (s *Service) handleGetRole(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	role, err := s.GetRole(c.Request.Context(), id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, role)
}

func (s *Service) handleCreateRole(c *gin.Context) {
	var in CreateRoleInput
	if !httpapi.BindJSON(c, &in) {
		return
	}
	role, err := s.CreateRole(c.Request.Context(), in)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.Created(c, role)
}

func (s *Service) handleUpdateRole(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in UpdateRoleInput
	if !httpapi.BindJSON(c, &in) {
		return
	}
	role, err := s.UpdateRole(c.Request.Context(), id, in)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, role)
}

func (s *Service) handleDeleteRole(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	if err := s.DeleteRole(c.Request.Context(), id); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.NoContent(c)
}

func (s *Service) handleSetRolePermissions(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in struct {
		PermissionKeys []string `json:"permission_keys"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	role, err := s.SetRolePermissions(c.Request.Context(), id, in.PermissionKeys)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, role)
}

func (s *Service) handleListPermissions(c *gin.Context) {
	mods, err := s.ListPermissions(c.Request.Context())
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, mods)
}
