package iam

import (
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/segment"
)

// RegisterRoutes mounts /auth/*, /me, /me/password, /users*, the members of
// a segment, which are a users list, and the super admin transfer.
func (s *Service) RegisterRoutes(r *httpapi.Router) {
	r.Public(http.MethodPost, "/auth/login", s.handleLogin)
	r.Public(http.MethodPost, "/auth/refresh", s.handleRefresh)
	r.Authed(http.MethodPost, "/auth/logout", s.handleLogout)
	r.AuthedRead("/me", s.handleMe)
	r.Authed(http.MethodPut, "/me", s.handleUpdateMe)
	r.SessionOnly().StepUp(core.StepUpSelfPassword).Handle(http.MethodPut, "/me/password", s.handleChangePassword)

	r.Perm(http.MethodGet, "/users", "user:read", s.handleListUsers)
	r.Perm(http.MethodPost, "/users", "user:create", s.handleCreateUser)
	r.Perm(http.MethodGet, "/users/:id", "user:read", s.handleGetUser)
	r.Perm(http.MethodPatch, "/users/:id", "user:update", s.handleUpdateUser)
	r.StepUp(core.StepUpUserDelete).Perm(http.MethodDelete, "/users/:id", "user:delete", s.handleDeleteUser)
	r.Perm(http.MethodPut, "/users/:id/roles", "role:assign", s.handleSetUserRoles)
	r.Perm(http.MethodGet, "/segments/:id/members", "segment:read", s.handleSegmentMembers)
	r.SessionOnly().StepUp(core.StepUpSuperAdminTransfer).Handle(http.MethodPost, "/system/super-admin/transfer", s.handleTransferSuperAdmin)
	s.registerSecurityRoutes(r)
}

func actor(c *gin.Context) int64 {
	uid, _ := core.UserID(c.Request.Context())
	return uid
}

func (s *Service) handleLogin(c *gin.Context) {
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	pair, err := s.Login(sessionContext(c, loginMethodPassword), in.Email, in.Password, c.ClientIP())
	if err != nil {
		if e := core.AsError(err); e.Code == core.ErrRateLimited.Code {
			if secs, ok := e.Details["retry_after_seconds"].(int64); ok {
				c.Header("Retry-After", strconv.FormatInt(secs, 10))
			}
		}
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, pair)
}

func (s *Service) handleRefresh(c *gin.Context) {
	var in struct {
		RefreshToken string `json:"refresh_token"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	pair, err := s.Refresh(sessionContext(c, ""), in.RefreshToken)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, pair)
}

func (s *Service) handleLogout(c *gin.Context) {
	var in struct {
		RefreshToken string `json:"refresh_token"`
	}
	// The body is optional: without a refresh token every session is revoked.
	if err := c.ShouldBindJSON(&in); err != nil && !errors.Is(err, io.EOF) {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage(err.Error()))
		return
	}
	if err := s.Logout(c.Request.Context(), actor(c), in.RefreshToken); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.NoContent(c)
}

func (s *Service) handleMe(c *gin.Context) {
	me, err := s.GetMe(c.Request.Context(), actor(c))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, me)
}

func (s *Service) handleUpdateMe(c *gin.Context) {
	var in struct {
		DisplayName string `json:"display_name"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if err := s.UpdateProfile(audit.Context(c), actor(c), in.DisplayName); err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.handleMe(c)
}

func (s *Service) handleChangePassword(c *gin.Context) {
	var in struct {
		NewPassword string `json:"new_password"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if err := s.ChangePassword(c.Request.Context(), actor(c), s.currentFamily(c), in.NewPassword); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.NoContent(c)
}

// redactBalance hides balances from callers without balance:all:read.
func (s *Service) redactBalance(c *gin.Context, users ...*User) error {
	ok, err := s.authz.Can(c.Request.Context(), actor(c), "balance:all:read")
	if err != nil {
		return err
	}
	if !ok {
		for _, u := range users {
			u.Balance = nil
		}
	}
	return nil
}

func (s *Service) handleListUsers(c *gin.Context) {
	s.listUsers(c, ListUsersFilter{Query: c.Query("q"), Status: c.Query("status"), Role: c.Query("role"), Segment: c.Query("segment")})
}

// handleSegmentMembers lists the members of a segment (CONTRACTS §97): the
// users list with one more condition, so it needs user:read besides the
// route's segment:read.
func (s *Service) handleSegmentMembers(c *gin.Context) {
	if !httpapi.CanAny(c, s.authz, "user:read") {
		return
	}
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	if _, err := segment.Ref(c.Request.Context(), s.db.Pool, id, true); err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.listUsers(c, ListUsersFilter{Query: c.Query("q"), Segment: c.Param("id")})
}

// listUsers responds with the page of the users f selects.
func (s *Service) listUsers(c *gin.Context, f ListUsersFilter) {
	f.Page, f.PageSize = httpapi.Pagination(c)
	users, total, err := s.ListUsers(c.Request.Context(), f)
	if err == nil {
		err = s.redactBalance(c, users...)
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.List(c, users, httpapi.Page{Page: f.Page, PageSize: f.PageSize, Total: total})
}

func (s *Service) handleGetUser(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	u, err := s.GetUser(c.Request.Context(), id)
	if err == nil {
		err = s.redactBalance(c, u)
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, u)
}

func (s *Service) handleCreateUser(c *gin.Context) {
	var in CreateUserInput
	if !httpapi.BindJSON(c, &in) {
		return
	}
	ctx := c.Request.Context()
	uid := actor(c)
	// Choosing roles other than the default is a role assignment: it needs
	// role:assign as well.
	if !IsDefaultRoles(in.RoleKeys) && !httpapi.CanAny(c, s.authz, "role:assign") {
		return
	}
	// Choosing the segment is a segment assignment: it needs segment:manage
	// as well.
	if in.SegmentID != nil && !httpapi.CanAny(c, s.authz, "segment:manage") {
		return
	}
	u, err := s.CreateUser(ctx, uid, in)
	if err == nil {
		err = s.redactBalance(c, u)
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.Created(c, u)
}

func (s *Service) handleUpdateUser(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in UpdateUserInput
	if !httpapi.BindJSON(c, &in) {
		return
	}
	u, err := s.UpdateUser(audit.Context(c), actor(c), id, in)
	if err == nil {
		err = s.redactBalance(c, u)
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, u)
}

func (s *Service) handleDeleteUser(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	if err := s.DeleteUser(c.Request.Context(), actor(c), id); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.NoContent(c)
}

func (s *Service) handleSetUserRoles(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in struct {
		RoleKeys []string `json:"role_keys"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	u, err := s.SetUserRoles(c.Request.Context(), actor(c), id, in.RoleKeys)
	if err == nil {
		err = s.redactBalance(c, u)
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, u)
}
