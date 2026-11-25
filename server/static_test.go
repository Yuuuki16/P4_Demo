package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestStaticHandlerCacheControl(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "assets"), 0o755); err != nil {
		t.Fatal(err)
	}
	for name, body := range map[string]string{"index.html": "<html></html>", "assets/index-abc.js": "x", "favicon.svg": "<svg/>"} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	h := staticHandler(dir)
	cases := map[string]struct {
		status int
		cache  string
	}{
		"/":                    {http.StatusOK, "no-cache"},
		"/favicon.svg":         {http.StatusOK, "no-cache"},
		"/assets/index-abc.js": {http.StatusOK, "public, max-age=31536000, immutable"},
	}
	for path, want := range cases {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest("GET", path, nil))
		if rec.Code != want.status || rec.Header().Get("Cache-Control") != want.cache {
			t.Errorf("%s: status %d, Cache-Control %q; want %d, %q", path, rec.Code, rec.Header().Get("Cache-Control"), want.status, want.cache)
		}
	}
}
