"use client";

import React, { useEffect, useRef, useState } from "react";

export default function EpubViewerWithQuiz() {
  const spreadContainerRef = useRef(null);
  const leftViewerRef = useRef(null);
  const rightViewerRef = useRef(null);
  const audioRef = useRef(null);
  const leftBookRef = useRef(null);
  const rightBookRef = useRef(null);
  const leftRenditionRef = useRef(null);
  const rightRenditionRef = useRef(null);
  const leftCurrentIndexRef = useRef(null);
  const rightCurrentIndexRef = useRef(null);

  const [manifest, setManifest] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [dualMode, setDualMode] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizLoading, setQuizLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const manifestRef = useRef(null);
  useEffect(() => {
    manifestRef.current = manifest;
  }, [manifest]);

  const loadPageRef = useRef(() => {});
  loadPageRef.current = (idx) => loadPage(idx);

  const totalPages = manifest?.pages?.length ?? 0;
  const isLastPage = totalPages > 0 && currentPage >= totalPages - 1;

  // 마운트 시 로그
  useEffect(() => {
    console.log("[EpubViewer] 컴포넌트 마운트됨");
    return () => console.log("[EpubViewer] 컴포넌트 언마운트됨");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const opfUrl =
      "https://files-kids-english.s3.ap-northeast-2.amazonaws.com/books/urn%3Auuid%3Apublishing-3e1d27df/epub/OEBPS/content.opf";
    const manifestUrl =
      "https://files-kids-english.s3.ap-northeast-2.amazonaws.com/books/urn%3Auuid%3Apublishing-3e1d27df/manifest.json";

    const init = async () => {
      const [manifestRes, ePubModule] = await Promise.all([
        fetch(manifestUrl).then((r) => r.json()),
        import("epubjs").then((m) => m.default),
      ]);
      console.log("[EpubViewer] manifest 로드됨, pages:", manifestRes?.pages?.length);
      setManifest(manifestRes);
      const ePub = ePubModule;
      const leftBook = ePub(opfUrl);
      const rightBook = ePub(opfUrl);
      leftBookRef.current = leftBook;
      rightBookRef.current = rightBook;
      await Promise.all([leftBook.ready, rightBook.ready]);
      setTimeout(() => loadPageRef.current(0), 0);
    };
    init();
  }, []);

  // 책 로드 후 즉시 문제 생성 시작
  useEffect(() => {
    if (!manifest?.pages?.length) return;
    const bookText = manifest.pages
      .map((p) => (typeof p?.text === "string" ? p.text.trim() : ""))
      .filter(Boolean)
      .join("\n\n")
      .trim();
    if (!bookText) {
      console.warn("[EpubViewer] manifest에 텍스트 없음");
      setQuizLoading(false);
      return;
    }
    console.log("[EpubViewer] 책 로드 완료, 문제 생성 시작, text 길이:", bookText.length);
    fetch("/api/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookText }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.questions?.length) {
          setQuestions(data.questions);
          setQuizLoading(false);
          console.log("[EpubViewer] 문제 생성 완료:", data.questions.length, "개");
        } else {
          console.error("[EpubViewer] 문제 생성 실패:", data.error ?? data);
          setQuizLoading(false);
        }
      })
      .catch((err) => {
        console.error("[EpubViewer] 문제 생성 오류:", err);
        setQuizLoading(false);
      });
  }, [manifest]);

  const injectReset = (iframe, side) => {
    try {
      if (!iframe) return;
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "0";
      iframe.style.display = "block";
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const style = doc.createElement("style");
      const justify = side === "left" ? "flex-end" : "flex-start";
      style.textContent = `
        @page{margin:0 !important;}
        html,body,:root{margin:0 !important;padding:0 !important;height:100% !important;min-width:0 !important;background:transparent !important}
        *{box-sizing:border-box !important;margin:0 !important;padding:0 !important;border:0 !important;border-radius:0 !important;pointer-events:auto !important}
        body{display:flex !important;align-items:center !important;justify-content:${justify} !important;-webkit-column-count:initial !important;column-count:initial !important;-webkit-column-gap:0 !important;column-gap:0 !important;overflow:hidden !important}
        body > *{margin:0 !important;padding:0 !important;border:0 !important;border-radius:0 !important}
        p,figure,section,article,div{margin:0 !important;padding:0 !important;border:0 !important;border-radius:0 !important}
        img,svg,canvas,video{max-width:100% !important;height:auto !important;display:block !important;margin:0 !important;padding:0 !important;border:0 !important;border-radius:0 !important}
        figure,.page,section,article,div{margin:0 !important;padding:0 !important;border:0 !important;border-radius:0 !important;min-width:0 !important}
        .page-text,.textLayer,.layer-text{display:none !important}
        a{pointer-events:auto !important}
      `;
      doc.head.appendChild(style);
      if (!doc.querySelector('meta[name="viewport"]')) {
        const meta = doc.createElement("meta");
        meta.name = "viewport";
        meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";
        doc.head.appendChild(meta);
      }
      try {
        if (doc.documentElement?.style) {
          doc.documentElement.style.setProperty("margin", "0", "important");
          doc.documentElement.style.setProperty("padding", "0", "important");
        }
        if (doc.body?.style) {
          doc.body.style.setProperty("margin", "0", "important");
          doc.body.style.setProperty("padding", "0", "important");
          doc.body.style.setProperty("display", "flex", "important");
          doc.body.style.setProperty("align-items", "center", "important");
          doc.body.style.setProperty("justify-content", justify, "important");
        }
        if (doc.body) {
          Array.from(doc.body.children).forEach((el) => {
            if (el?.style) {
              el.style.setProperty("margin", "0", "important");
              el.style.setProperty("padding", "0", "important");
              el.style.setProperty("border", "0", "important");
              el.style.setProperty("border-radius", "0", "important");
            }
          });
        }
      } catch {}
      doc.querySelectorAll(".page-text, .textLayer, .layer-text").forEach((el) => {
        el.style.display = "none";
      });
    } catch {}
  };

  const ensureClickCatcher = (container, side, indexProvider) => {
    try {
      if (!container) return;
      container.style.position = container.style.position || "relative";
      const id = side === "left" ? "click-catcher-left" : "click-catcher-right";
      let catcher = container.querySelector(`#${id}`);
      if (!catcher) {
        catcher = document.createElement("div");
        catcher.id = id;
        catcher.style.cssText = "position:absolute;top:0;right:0;bottom:0;left:0;z-index:9999;background:transparent;pointer-events:auto;cursor:pointer";
        container.appendChild(catcher);
      }
      catcher.onclick = () => {
        const idx = indexProvider();
        if (Number.isFinite(idx)) playCurrentPageAudio(idx);
      };
    } catch {}
  };

  const attachClickHandlersToDoc = (doc, getIndex) => {
    try {
      doc.addEventListener("click", () => {
        const idx = getIndex();
        if (Number.isFinite(idx)) playCurrentPageAudio(idx);
      }, true);
    } catch {}
    try {
      if (doc.body) {
        doc.body.onclick = () => {
          const idx = getIndex();
          if (Number.isFinite(idx)) playCurrentPageAudio(idx);
        };
      }
    } catch {}
  };

  useEffect(() => {
    const container = spreadContainerRef.current;
    if (!container) return;
    const handleResize = () => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight - 150;
      const nextDual = width >= 900;
      setDualMode(nextDual);
      const panelWidth = nextDual ? Math.floor(width / 2) : width;
      try { leftRenditionRef.current?.resize(panelWidth, height); } catch {}
      try { rightRenditionRef.current?.resize(panelWidth, height); } catch {}
    };
    const ro = new ResizeObserver(() => handleResize());
    ro.observe(container);
    window.addEventListener("resize", handleResize);
    setTimeout(handleResize, 0);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const stopCurrentAudio = () => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } catch {}
  };

  const loadPage = (index) => {
    stopCurrentAudio();
    if (!leftBookRef.current || !rightBookRef.current) return;
    const spine = leftBookRef.current.spine;
    const items = spine?.items ?? spine?.spineItems ?? [];
    const spineLen = Array.isArray(items) ? items.length : 0;
    if (!spineLen) return;

    if (dualMode && index === 0) {
      const rightHrefOnly = items[0]?.href;
      const options = {
        width: "100%", height: "100%", flow: "paginated", spread: "none",
        allowScriptedContent: true, minSpreadWidth: 0,
      };
      try {
        if (leftViewerRef.current) leftViewerRef.current.innerHTML = "";
        if (leftRenditionRef.current?.destroy) {
          leftRenditionRef.current.destroy();
          leftRenditionRef.current = null;
        }
      } catch {}
      if (rightViewerRef.current && !rightRenditionRef.current) {
        rightRenditionRef.current = rightBookRef.current.renderTo(rightViewerRef.current, options);
        rightRenditionRef.current.on("rendered", () => {
          const iframe = rightViewerRef.current?.querySelector("iframe");
          injectReset(iframe, "right");
        });
      }
      if (rightHrefOnly && rightRenditionRef.current) {
        rightRenditionRef.current.display(rightHrefOnly).catch(() => {});
      }
      if (rightViewerRef.current) ensureClickCatcher(rightViewerRef.current, "right", () => 0);
      leftCurrentIndexRef.current = null;
      rightCurrentIndexRef.current = 0;
      setCurrentPage(0);
      return;
    }

    let leftIndex;
    if (dualMode) {
      leftIndex = index <= 0 ? 1 : (index % 2 === 1 ? index : index + 1);
      if (leftIndex >= spineLen) leftIndex = Math.max(spineLen - 2, 0);
      if (leftIndex < 1 && spineLen > 1) leftIndex = 1;
    } else {
      leftIndex = Math.max(0, Math.min(index, spineLen - 1));
    }

    const leftHref = items[leftIndex]?.href;
    let rightHref = dualMode && leftIndex + 1 < spineLen ? items[leftIndex + 1]?.href : undefined;

    if (dualMode && leftIndex === spineLen - 1) {
      rightHref = undefined;
      try {
        if (rightViewerRef.current) rightViewerRef.current.innerHTML = "";
        if (rightRenditionRef.current?.destroy) {
          rightRenditionRef.current.destroy();
          rightRenditionRef.current = null;
        }
      } catch {}
    }

    leftCurrentIndexRef.current = leftIndex;
    rightCurrentIndexRef.current = rightHref ? leftIndex + 1 : null;

    const options = {
      width: "100%", height: "100%", flow: "paginated", spread: "none",
      allowScriptedContent: true, minSpreadWidth: 0,
    };

    if (!leftRenditionRef.current && leftViewerRef.current) {
      leftRenditionRef.current = leftBookRef.current.renderTo(leftViewerRef.current, options);
      leftRenditionRef.current.themes.register("override", {
        "@page": { margin: "0 !important" },
        "html, body": { margin: "0 !important", padding: "0 !important", height: "100% !important", minWidth: "0 !important" },
        "*": { boxSizing: "border-box !important" },
        "img, svg, canvas, video": { width: "100% !important", height: "100% !important", maxWidth: "100% !important", maxHeight: "100% !important", objectFit: "contain !important", display: "block !important", margin: "0 !important", padding: "0 !important", border: "0 !important", borderRadius: "0 !important" },
        "figure, .page, section, article, div": { margin: "0 !important", padding: "0 !important", border: "0 !important", borderRadius: "0 !important", minWidth: "0 !important" },
        ".page-text, .textLayer, .layer-text": { display: "none !important" },
        body: { overflow: "hidden !important", WebkitColumnCount: "initial !important", columnCount: "initial !important", WebkitColumnGap: "0 !important", columnGap: "0 !important" },
      });
      leftRenditionRef.current.themes.select("override");
      leftRenditionRef.current.on("rendered", (section) => {
        const iframe = leftViewerRef.current?.querySelector("iframe");
        injectReset(iframe, "left");
        if (iframe) iframe.style.pointerEvents = "none";
        ensureClickCatcher(leftViewerRef.current, "left", () => leftCurrentIndexRef.current ?? section.index);
        const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
        if (doc) attachClickHandlersToDoc(doc, () => leftCurrentIndexRef.current ?? section.index);
      });
    }

    if (dualMode && rightViewerRef.current && !rightRenditionRef.current) {
      rightRenditionRef.current = rightBookRef.current.renderTo(rightViewerRef.current, options);
      rightRenditionRef.current.themes.register("override", {
        "@page": { margin: "0 !important" },
        "html, body": { margin: "0 !important", padding: "0 !important", height: "100% !important", minWidth: "0 !important" },
        "*": { boxSizing: "border-box !important" },
        "img, svg, canvas, video": { width: "100% !important", height: "100% !important", maxWidth: "100% !important", maxHeight: "100% !important", objectFit: "contain !important", display: "block !important", margin: "0 !important", padding: "0 !important", border: "0 !important", borderRadius: "0 !important" },
        "figure, .page, section, article, div": { margin: "0 !important", padding: "0 !important", border: "0 !important", borderRadius: "0 !important", minWidth: "0 !important" },
        ".page-text, .textLayer, .layer-text": { display: "none !important" },
        body: { overflow: "hidden !important", WebkitColumnCount: "initial !important", columnCount: "initial !important", WebkitColumnGap: "0 !important", columnGap: "0 !important" },
      });
      rightRenditionRef.current.themes.select("override");
      rightRenditionRef.current.on("rendered", (section) => {
        const iframe = rightViewerRef.current?.querySelector("iframe");
        injectReset(iframe, "right");
        if (iframe) iframe.style.pointerEvents = "none";
        ensureClickCatcher(rightViewerRef.current, "right", () => {
          let idx = rightCurrentIndexRef.current ?? section.index;
          if (!Number.isFinite(idx) && leftCurrentIndexRef.current != null) idx = leftCurrentIndexRef.current + 1;
          return idx;
        });
        const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
        if (doc) attachClickHandlersToDoc(doc, () => {
          let idx = rightCurrentIndexRef.current ?? section.index;
          if (!Number.isFinite(idx) && leftCurrentIndexRef.current != null) idx = leftCurrentIndexRef.current + 1;
          return idx;
        });
      });
    } else if ((!dualMode || !rightViewerRef.current) && rightRenditionRef.current) {
      try { rightRenditionRef.current.destroy(); } catch {}
      rightRenditionRef.current = null;
    }

    const tasks = [];
    if (leftHref && leftRenditionRef.current) tasks.push(leftRenditionRef.current.display(leftHref));
    if (rightHref && rightRenditionRef.current) tasks.push(rightRenditionRef.current.display(rightHref));
    if (!rightHref && dualMode && rightViewerRef.current) {
      ensureClickCatcher(rightViewerRef.current, "right", () => null);
    }
    ensureClickCatcher(leftViewerRef.current, "left", () => leftCurrentIndexRef.current ?? leftIndex);
    if (rightHref && dualMode && rightViewerRef.current) {
      ensureClickCatcher(rightViewerRef.current, "right", () => {
        const ri = rightCurrentIndexRef.current ?? leftCurrentIndexRef.current + 1 ?? leftIndex + 1;
        return ri;
      });
    }
    Promise.all(tasks).catch(() => {});

    setCurrentPage(leftIndex);
  };

  const playCurrentPageAudio = (index) => {
    const manifestData = manifestRef.current;
    if (!manifestData?.pages) return;
    let page = manifestData.pages.find((p) => p.pageNumber === index + 1) ?? manifestData.pages[index];
    if (!page?.audioUrl) {
      for (const cand of [index - 1, index + 1]) {
        if (cand < 0) continue;
        const alt = manifestData.pages.find((p) => p.pageNumber === cand + 1) ?? manifestData.pages[cand];
        if (alt?.audioUrl) { page = alt; break; }
      }
    }
    if (page?.audioUrl && audioRef.current) {
      audioRef.current.src = page.audioUrl;
      audioRef.current.load();
      audioRef.current.play().catch(() => {});
    }
  };

  const goToPrevPage = () => {
    if (dualMode) {
      if (currentPage <= 1) { loadPage(0); return; }
      const candidate = currentPage - 2;
      loadPage(candidate < 1 ? 1 : candidate);
    } else {
      loadPage(Math.max(currentPage - 1, 0));
    }
  };

  const goToNextPage = () => {
    if (!leftBookRef.current) return;
    const spine = leftBookRef.current.spine;
    const items = spine?.items ?? spine?.spineItems ?? [];
    const total = Array.isArray(items) ? items.length : 0;
    if (dualMode) {
      if (currentPage === 0) {
        loadPage(total > 1 ? 1 : 0);
        return;
      }
      const candidate = currentPage + 2;
      loadPage(candidate >= total ? Math.max(total - 2, 1) : candidate);
    } else {
      loadPage(Math.min(currentPage + 1, Math.max(total - 1, 0)));
    }
  };

  const handleLeftPanelClick = () => {
    const idx = leftCurrentIndexRef.current ?? currentPage;
    if (Number.isFinite(idx)) playCurrentPageAudio(idx);
  };

  const handleRightPanelClick = () => {
    let idx = rightCurrentIndexRef.current ?? leftCurrentIndexRef.current + 1 ?? currentPage + 1;
    if (Number.isFinite(idx)) playCurrentPageAudio(idx);
  };

  const startQuiz = () => {
    console.log("[startQuiz] 클릭됨");
    setShowQuiz(true);
    setUserAnswers({});
    setQuizSubmitted(false);
    // 이미 생성된 문제가 있으면 그대로 표시, 없으면 로딩 상태 유지
  };

  const handleAnswerSelect = (qIndex, optionIndex) => {
    if (quizSubmitted) return;
    setUserAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }));
  };

  const submitQuiz = () => {
    setQuizSubmitted(true);
  };

  const closeQuiz = () => {
    setShowQuiz(false);
    setQuestions([]);
    setUserAnswers({});
    setQuizSubmitted(false);
  };

  const correctCount = questions.filter((q, i) => userAnswers[i] === q.correctIndex).length;
  const totalCount = questions.length;

  return (
    <div style={{ fontFamily: "Arial, sans-serif", display: "grid", gridTemplateRows: "auto 1fr auto", height: "100vh", position: "relative" }}>
      {quizLoading && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20000,
          }}
        >
          <p style={{ color: "white", fontSize: "18px" }}>준비 중이에요. 잠시만 기다려 주세요!</p>
        </div>
      )}
      <div style={{ padding: "8px 16px", background: "black", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <img src="/logo.png" alt="Logo" style={{ height: "40px" }} />
          <h1 style={{ margin: 0, fontSize: "18px", color: "white" }}>Kid&apos;s English</h1>
        </div>
        {manifest && !showQuiz && questions.length > 0 && (
          <button
            onClick={startQuiz}
            style={{
              padding: "8px 20px",
              background: "#4a90d9",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "bold",
            }}
          >
            📝 문제 풀기
          </button>
        )}
      </div>

      <div
        ref={spreadContainerRef}
        style={{
          display: "grid",
          gridTemplateColumns: dualMode ? "1fr 1fr" : "1fr",
          gap: 0,
          alignItems: "center",
          justifyItems: "center",
          width: "100%",
          height: "100%",
          background: "#E8E8E8",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          ref={leftViewerRef}
          onClick={handleLeftPanelClick}
          style={{ width: "100%", height: "100%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "flex-end", cursor: "pointer" }}
        />
        {dualMode && (
          <div
            ref={rightViewerRef}
            onClick={handleRightPanelClick}
            style={{ width: "100%", height: "100%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "flex-start", cursor: "pointer" }}
          />
        )}

        {showQuiz && (
          <div
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.9)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              zIndex: 10000,
              padding: "24px",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div style={{ maxWidth: "600px", width: "100%", background: "#1a1a1a", borderRadius: "12px", padding: "24px", color: "#fff", marginBottom: "24px", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ margin: 0, fontSize: "22px" }}>📚 문제 풀기</h2>
                <button
                  onClick={closeQuiz}
                  style={{ background: "#333", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}
                >
                  닫기
                </button>
              </div>

              {quizLoading ? (
                <p style={{ textAlign: "center", padding: "40px" }}>준비 중이에요. 잠시만 기다려 주세요!</p>
              ) : questions.length === 0 ? (
                <p style={{ textAlign: "center", padding: "40px" }}>문제를 불러올 수 없었어요. 다시 시도해 주세요.</p>
              ) : (
                <>
                  {questions.map((q, qi) => (
                    <div key={qi} style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: qi < questions.length - 1 ? "1px solid #444" : "none" }}>
                      <p style={{ marginBottom: "12px", fontSize: "16px", lineHeight: 1.5 }}>
                        <strong>{qi + 1}.</strong> {q.question}
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {(q.options ?? []).map((opt, oi) => {
                          const isSelected = userAnswers[qi] === oi;
                          const isCorrect = q.correctIndex === oi;
                          const showResult = quizSubmitted;
                          let bg = "#2a2a2a";
                          if (showResult) {
                            if (isCorrect) bg = "#1a4d1a";
                            else if (isSelected && !isCorrect) bg = "#4d1a1a";
                          } else if (isSelected) bg = "#3a3a5a";
                          return (
                            <button
                              key={oi}
                              onClick={() => handleAnswerSelect(qi, oi)}
                              disabled={quizSubmitted}
                              style={{
                                padding: "12px 16px",
                                background: bg,
                                color: "#fff",
                                border: "1px solid #555",
                                borderRadius: "8px",
                                cursor: quizSubmitted ? "default" : "pointer",
                                textAlign: "left",
                                fontSize: "15px",
                              }}
                            >
                              {["A", "B", "C", "D"][oi]}. {opt}
                            </button>
                          );
                        })}
                      </div>
                      {quizSubmitted && q.explanation && (
                        <p style={{ marginTop: "12px", fontSize: "14px", color: "#aaa" }}>💡 {q.explanation}</p>
                      )}
                    </div>
                  ))}
                  {!quizSubmitted ? (
                    <button
                      onClick={submitQuiz}
                      style={{
                        width: "100%",
                        padding: "14px",
                        background: "#4a90d9",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "16px",
                        fontWeight: "bold",
                      }}
                    >
                      제출하기
                    </button>
                  ) : (
                    <div style={{ textAlign: "center", padding: "20px", fontSize: "18px", fontWeight: "bold", color: "#4ade80" }}>
                      🎉 {correctCount} / {totalCount} 정답!
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "4px", background: "black", borderTop: "2px solid #ddd", display: "flex", justifyContent: "center", alignItems: "center", gap: "16px" }}>
        <button
          onClick={goToPrevPage}
          disabled={currentPage === 0}
          style={{ padding: "4px", fontSize: "16px", cursor: "pointer", background: "transparent", color: "white", border: "none", borderRadius: "5px" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <p style={{ color: "white", fontSize: "16px" }}>
          {currentPage + 1} / {totalPages || "?"}
        </p>
        <audio ref={audioRef} controls style={{ display: "none" }} />
        <button
          onClick={goToNextPage}
          disabled={totalPages > 0 && currentPage >= totalPages - 1}
          style={{ padding: "4px", fontSize: "16px", cursor: "pointer", background: "transparent", color: "white", border: "none", borderRadius: "5px" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
