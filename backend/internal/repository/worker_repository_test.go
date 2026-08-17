package repository

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/Wei-Shaw/sub2api/internal/service"
)

func TestWorkerRepositoryUpdatePreservesConcurrentLifecycleState(t *testing.T) {
	var executedSQL string
	db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherFunc(
		func(_, actual string) error {
			executedSQL = actual
			return nil
		},
	)))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	mock.ExpectExec("worker update").
		WithArgs(int64(7), "renamed", "http://worker", "cipher", true, 20, 4, false).
		WillReturnResult(sqlmock.NewResult(0, 1))

	repo := &workerRepository{db: db}
	err = repo.UpdateWorker(context.Background(), &service.Worker{
		ID: 7, Name: "renamed", BaseURL: "http://worker", ManagementKeyCipher: "cipher",
		Enabled: true, HeartbeatIntervalSeconds: 20, HeartbeatTimeoutSeconds: 4,
	}, false)
	if err != nil {
		t.Fatal(err)
	}
	for _, fragment := range []string{
		"enabled=CASE WHEN $8 THEN $5 ELSE enabled END",
		"WHEN NOT $8 THEN status",
		"WHEN enabled THEN status",
	} {
		if !strings.Contains(executedSQL, fragment) {
			t.Fatalf("worker config update is not concurrency-safe; missing %q in:\n%s", fragment, executedSQL)
		}
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestWorkerRepositoryRepeatedEnableKeepsHealthyStatus(t *testing.T) {
	var executedSQL string
	db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherFunc(
		func(_, actual string) error {
			executedSQL = actual
			return nil
		},
	)))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	mock.ExpectExec("worker enabled").
		WithArgs(int64(9), true).
		WillReturnResult(sqlmock.NewResult(0, 1))

	repo := &workerRepository{db: db}
	if err := repo.SetWorkerEnabled(context.Background(), 9, true); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(executedSQL, "WHEN enabled THEN status") {
		t.Fatal(fmt.Sprintf("repeated enable would reset a healthy status:\n%s", executedSQL))
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
