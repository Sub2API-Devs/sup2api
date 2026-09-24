package iam

import (
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// RegisterRoutes mounts /auth/*, /me, /me/password and /users*.
// (PUT /users/:id/groups belongs to the group module.)
func (s *Service) RegisterRoutes(r *httpapi.Router) {
	r.Public(http.MethodPost, "/auth/login", s.handleLogin)
	r.Public(http.MethodPost, "/auth/refresh", s.handleRefresh)
	r.Authed(http.MethodPost, "/auth/logout", s.handleLogout)
	r.Authed(http.MethodPost, "/auth/step-up", s.handleStepUp)
	r.Authed(http.MethodGet, "/me", s.handleMe)
	r.Authed(http.MethodPut, "/me/password", s.handleChangePassword)

	r.Perm(http.MethodGet, "/users", "user:read", s.handleListUsers)
	r.Perm(http.MethodPost, "/users", "user:create", s.handleCreateUser)
	r.Perm(http.MethodGet, "/users/:id", "user:read", s.handleGetUser)
	r.Perm(http.MethodPatch, "/users/:id", "user:update", s.handleUpdateUser)
	r.Perm(http.MethodDelete, "/users/:id", "user:delete", s.handleDeleteUser)
	r.Perm(http.MethodPut, "/users/:id/roles", "role:manage", s.handleSetUserRoles)
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
	pair, err := s.Login(c.Request.Context(), in.Email, in.Password)
	if err != nil {
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
	pair, err := s.Refresh(c.Request.Context(), in.RefreshToken)
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

func (s *Service) handleStepUp(c *gin.Context) {
	var in struct {
		Password string `json:"password"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	token, err := s.StepUp(c.Request.Context(), actor(c), in.Password)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, gin.H{"step_up_token": token, "expires_in": int64(StepUpTTL.Seconds())})
}

func (s *Service) handleMe(c *gin.Context) {
	me, err := s.GetMe(c.Request.Context(), actor(c))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, me)
}

func (s *Service) handleChangePassword(c *gin.Context) {
	var in struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if err := s.ChangePassword(c.Request.Context(), actor(c), in.OldPassword, in.NewPassword); err != nil {
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
	page, size := httpapi.Pagination(c)
	users, total, err := s.ListUsers(c.Request.Context(), ListUsersFilter{
		Query: c.Query("q"), Status: c.Query("status"), Role: c.Query("role"), Page: page, PageSize: size,
	})
	if err == nil {
		err = s.redactBalance(c, users...)
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.List(c, users, httpapi.Page{Page: page, PageSize: size, Total: total})
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
	// role:manage (a sensitive permission, hence step-up) as well.
	if !IsDefaultRoles(in.RoleKeys) {
		ok, err := s.authz.Can(ctx, uid, "role:manage")
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		if !ok {
			httpapi.Fail(c, core.ErrPermissionDenied.WithDetails(map[string]any{"permission": "role:manage"}))
			return
		}
		if err := s.VerifyStepUp(ctx, uid, c.GetHeader("X-Step-Up-Token")); err != nil {
			httpapi.Fail(c, core.ErrStepUpRequired.WithCause(err))
			return
		}
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
	u, err := s.UpdateUser(c.Request.Context(), actor(c), id, in)
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
