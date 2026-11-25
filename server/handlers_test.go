package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
)

func newTestServer(t *testing.T) http.Handler {
	t.Helper()
	store := NewFileStore(filepath.Join(t.TempDir(), "responses.jsonl"))
	mux := http.NewServeMux()
	NewServer(store).Routes(mux)
	return mux
}

func do(h http.Handler, method, path, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestSaveAndStats(t *testing.T) {
	h := newTestServer(t)

	bodies := []string{
		`{"id":"a","dataset":"B","pre":{"scary":4,"understand":1,"fixable":2},"post":{"scary":2,"understand":4,"fixable":5}}`,
		`{"id":"b","dataset":"A","pre":{"scary":2,"understand":3,"fixable":2},"post":{"scary":2,"understand":4,"fixable":3}}`,
		`{"id":"c","dataset":"C","pre":{"scary":3,"understand":2,"fixable":2},"post":{"scary":2,"understand":4,"fixable":4}}`,
	}
	for _, b := range bodies {
		if rec := do(h, "POST", "/api/responses", b); rec.Code != http.StatusCreated {
			t.Fatalf("POST status = %d, body = %s", rec.Code, rec.Body)
		}
	}

	rec := do(h, "GET", "/api/stats", "")
	var got StatsResponse
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}
	if got.Count != 3 || got.Pre.Scary != 3 || got.Post.Fixable != 4 {
		t.Errorf("stats = %+v", got)
	}
}

func TestStatsEmpty(t *testing.T) {
	rec := do(newTestServer(t), "GET", "/api/stats", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"count":0`) {
		t.Errorf("status = %d, body = %s", rec.Code, rec.Body)
	}
}

func TestRejectInvalid(t *testing.T) {
	h := newTestServer(t)
	cases := map[string]string{
		"壊れたJSON":    `{`,
		"idなし":       `{"pre":{"scary":1,"understand":1,"fixable":1},"post":{"scary":1,"understand":1,"fixable":1}}`,
		"範囲外の回答":     `{"id":"x","pre":{"scary":9,"understand":1,"fixable":1},"post":{"scary":1,"understand":1,"fixable":1}}`,
		"回答が足りない":    `{"id":"x","pre":{"scary":1},"post":{"scary":1,"understand":1,"fixable":1}}`,
		"不明なdataset": `{"id":"x","dataset":"Z","pre":{"scary":1,"understand":1,"fixable":1},"post":{"scary":1,"understand":1,"fixable":1}}`,
	}
	for name, body := range cases {
		if rec := do(h, "POST", "/api/responses", body); rec.Code != http.StatusBadRequest {
			t.Errorf("%s: status = %d", name, rec.Code)
		}
	}
}
