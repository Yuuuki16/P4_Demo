package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type Server struct {
	store Store
	now   func() time.Time
}

func NewServer(store Store) *Server {
	return &Server{store: store, now: time.Now}
}

// Routes は API のルーティングを登録する（Go 1.22 以降の "METHOD /path" 形式）。
func (s *Server) Routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/health", s.health)
	mux.HandleFunc("POST /api/responses", s.createResponse)
	mux.HandleFunc("GET /api/stats", s.stats)
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// POST /api/responses  体験前後のアンケート回答を1件保存する
func (s *Server) createResponse(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 4<<10) // 4KB より大きいリクエストは拒否
	var in Response
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "JSONの形式が正しくありません")
		return
	}
	if err := validate(in); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	in.CreatedAt = s.now().UTC()

	if err := s.store.Add(in); err != nil {
		log.Printf("save response: %v", err)
		writeError(w, http.StatusInternalServerError, "保存に失敗しました")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": in.ID})
}

func validate(r Response) error {
	if r.ID == "" || len(r.ID) > 64 {
		return fmt.Errorf("id が不正です")
	}
	if r.Dataset != nil && *r.Dataset != "A" && *r.Dataset != "B" && *r.Dataset != "C" {
		return fmt.Errorf("dataset は A・B・C のいずれかです")
	}
	for name, a := range map[string]Answers{"pre": r.Pre, "post": r.Post} {
		for _, v := range []int{a.Scary, a.Understand, a.Fixable} {
			if v < 1 || v > 5 {
				return fmt.Errorf("%s の回答は 1〜5 で指定してください", name)
			}
		}
	}
	return nil
}

// Averages は3問それぞれの平均値。
type Averages struct {
	Scary      float64 `json:"scary"`
	Understand float64 `json:"understand"`
	Fixable    float64 `json:"fixable"`
}

type StatsResponse struct {
	Count int      `json:"count"`
	Pre   Averages `json:"pre"`
	Post  Averages `json:"post"`
}

// GET /api/stats  体験前と体験後の平均を返す
func (s *Server) stats(w http.ResponseWriter, _ *http.Request) {
	all, err := s.store.All()
	if err != nil {
		log.Printf("load responses: %v", err)
		writeError(w, http.StatusInternalServerError, "集計に失敗しました")
		return
	}
	writeJSON(w, http.StatusOK, summarize(all))
}

func summarize(all []Response) StatsResponse {
	out := StatsResponse{Count: len(all)}
	if len(all) == 0 {
		return out
	}
	n := float64(len(all))
	for _, r := range all {
		out.Pre.Scary += float64(r.Pre.Scary) / n
		out.Pre.Understand += float64(r.Pre.Understand) / n
		out.Pre.Fixable += float64(r.Pre.Fixable) / n
		out.Post.Scary += float64(r.Post.Scary) / n
		out.Post.Understand += float64(r.Post.Understand) / n
		out.Post.Fixable += float64(r.Post.Fixable) / n
	}
	return out
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
