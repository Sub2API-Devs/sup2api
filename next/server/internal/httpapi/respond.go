// Package httpapi is the console HTTP framework: response envelope, error
// rendering, authentication and permission middleware. Modules register their
// routes through Router; they never touch gin.Engine directly.
package httpapi

import (
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Page is the pagination block of list responses.
type Page struct {
	Page     int   `json:"page"`
	PageSize int   `json:"page_size"`
	Total    int64 `json:"total"`
}

// OK renders {"data": data} with 200.
func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, gin.H{"data": data})
}

// Created renders {"data": data} with 201.
func Created(c *gin.Context, data any) {
	c.JSON(http.StatusCreated, gin.H{"data": data})
}

// List renders {"data": items, "page": {...}}.
func List(c *gin.Context, items any, p Page) {
	c.JSON(http.StatusOK, gin.H{"data": items, "page": p})
}

// NoContent renders 204.
func NoContent(c *gin.Context) { c.Status(http.StatusNoContent) }

// Fail renders {"error": {...}} using core.Error; unknown errors become
// "internal" and are logged with their cause.
func Fail(c *gin.Context, err error) {
	e := core.AsError(err)
	if e.Status >= 500 {
		slog.ErrorContext(c.Request.Context(), "request failed",
			"request_id", core.RequestID(c.Request.Context()), "path", c.FullPath(), "err", err)
	}
	c.AbortWithStatusJSON(e.Status, gin.H{"error": e})
}

// Pagination reads ?page=&page_size= (defaults 1/20, max 200).
func Pagination(c *gin.Context) (page, size int) {
	page, _ = strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ = strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if size < 1 {
		size = 20
	}
	if size > 200 {
		size = 200
	}
	return page, size
}

// BindJSON decodes the body or renders invalid_argument.
func BindJSON(c *gin.Context, v any) bool {
	if err := c.ShouldBindJSON(v); err != nil {
		Fail(c, core.ErrInvalidArgument.WithMessage(err.Error()))
		return false
	}
	return true
}

// PathID parses a positive int64 path parameter or renders invalid_argument.
func PathID(c *gin.Context, name string) (int64, bool) {
	id, err := strconv.ParseInt(c.Param(name), 10, 64)
	if err != nil || id <= 0 {
		Fail(c, core.ErrInvalidArgument.WithMessage("invalid "+name))
		return 0, false
	}
	return id, true
}
