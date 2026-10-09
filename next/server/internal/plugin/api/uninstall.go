package api

import (
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/install"
	"github.com/gin-gonic/gin"
)

func (a *API) uninstallState(c *gin.Context) {
	out, err := a.d.Install.UninstallState(ctx(c), c.Param("key"))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

func (a *API) confirmStopped(c *gin.Context) {
	var in install.ConfirmStoppedRequest
	if err := c.ShouldBindJSON(&in); err != nil {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("invalid stop confirmation"))
		return
	}
	out, err := a.d.Install.ConfirmUninstallStopped(ctx(c), c.Param("key"), in, actor(c))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

func (a *API) listRetiredKeys(c *gin.Context) {
	out, err := a.d.Install.ListRetiredKeys(ctx(c))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, gin.H{"items": out})
}

func (a *API) releaseRetiredKey(c *gin.Context) {
	var in install.ReleaseOptions
	if c.Request.ContentLength != 0 {
		if err := c.ShouldBindJSON(&in); err != nil {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("invalid release options"))
			return
		}
	}
	out, err := a.d.Install.ReleaseRetiredKey(ctx(c), c.Param("key"), in, actor(c))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}
