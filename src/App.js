import React, { useEffect, useRef, useState } from "react";
import ePub from "epubjs";

function App() {
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

  // ✅ 항상 최신 manifest를 참조하기 위한 ref
  const manifestRef = useRef(null);
  useEffect(() => {
    manifestRef.current = manifest;
  }, [manifest]);

  useEffect(() => {
    const opfUrl =
      "https://files-kids-english.s3.ap-northeast-2.amazonaws.com/books/urn%3Auuid%3Apublishing-3e1d27df/epub/OEBPS/content.opf";
    const manifestUrl =
      "https://files-kids-english.s3.ap-northeast-2.amazonaws.com/books/urn%3Auuid%3Apublishing-3e1d27df/manifest.json";

    fetch(manifestUrl)
      .then((res) => res.json())
      .then((data) => {
        setManifest(data);

        const leftBook = ePub(opfUrl);
        const rightBook = ePub(opfUrl);
        leftBookRef.current = leftBook;
        rightBookRef.current = rightBook;

        Promise.all([leftBook.ready, rightBook.ready]).then(() => {
          console.log("Spine lengths:", leftBook.spine.items.length, rightBook.spine.items.length);
          setTimeout(() => loadPage(0), 0);
        });
      });
  }, []);

  // iframe 내부에 강력 리셋과 정렬을 주입
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
      // viewport 메타 보강
      if (!doc.querySelector('meta[name="viewport"]')) {
        const meta = doc.createElement("meta");
        meta.name = "viewport";
        meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";
        doc.head.appendChild(meta);
      }
      // 즉시 적용
      try {
        if (doc.documentElement && doc.documentElement.style) {
          doc.documentElement.style.setProperty("margin", "0", "important");
          doc.documentElement.style.setProperty("padding", "0", "important");
          doc.documentElement.style.setProperty("border", "0", "important");
          doc.documentElement.style.setProperty("border-radius", "0", "important");
        }
        if (doc.body && doc.body.style) {
          doc.body.style.setProperty("margin", "0", "important");
          doc.body.style.setProperty("padding", "0", "important");
          doc.body.style.setProperty("border", "0", "important");
          doc.body.style.setProperty("border-radius", "0", "important");
          doc.body.style.setProperty("display", "flex", "important");
          doc.body.style.setProperty("align-items", "center", "important");
          doc.body.style.setProperty("justify-content", justify, "important");
        }
        // 1뎁스 자식들에도 즉시 제거
        if (doc.body) {
          Array.from(doc.body.children).forEach((el) => {
            if (!el || !el.style) return;
            el.style.setProperty("margin", "0", "important");
            el.style.setProperty("padding", "0", "important");
            el.style.setProperty("border", "0", "important");
            el.style.setProperty("border-radius", "0", "important");
          });
        }
      } catch {}
      doc.querySelectorAll(".page-text, .textLayer, .layer-text").forEach((el) => {
        el.style.display = "none";
      });
      doc.querySelectorAll("img, svg, canvas, video").forEach((el) => {
        el.style.maxWidth = "100%";
        el.style.height = "auto";
        el.style.display = "block";
        el.style.margin = "0";
        el.style.padding = "0";
        el.style.border = "0";
        el.style.borderRadius = "0";
      });

      // body/html 스타일이 변경되면 다시 0으로 되돌리기
      try {
        const ensureZero = () => {
          if (doc.documentElement && doc.documentElement.style) {
            doc.documentElement.style.setProperty("margin", "0", "important");
            doc.documentElement.style.setProperty("padding", "0", "important");
            doc.documentElement.style.setProperty("border", "0", "important");
            doc.documentElement.style.setProperty("border-radius", "0", "important");
          }
          if (doc.body && doc.body.style) {
            doc.body.style.setProperty("margin", "0", "important");
            doc.body.style.setProperty("padding", "0", "important");
            doc.body.style.setProperty("border", "0", "important");
            doc.body.style.setProperty("border-radius", "0", "important");
            doc.body.style.setProperty("display", "flex", "important");
            doc.body.style.setProperty("align-items", "center", "important");
            doc.body.style.setProperty("justify-content", justify, "important");
          }
        };
        ensureZero();
        const mo = new MutationObserver(() => ensureZero());
        mo.observe(doc.documentElement, { attributes: true, attributeFilter: ["style", "class"], subtree: false });
        if (doc.body) {
          mo.observe(doc.body, { attributes: true, attributeFilter: ["style", "class"], childList: true, subtree: false });
        }
      } catch {}
    } catch {}
  };

  // 클릭 캐처 오버레이 생성/갱신
  const ensureClickCatcher = (container, side, indexProvider) => {
    try {
      if (!container) return;
      container.style.position = container.style.position || "relative";
      const id = side === "left" ? "click-catcher-left" : "click-catcher-right";
      let catcher = container.querySelector(`#${id}`);
      if (!catcher) {
        catcher = document.createElement("div");
        catcher.id = id;
        catcher.style.position = "absolute";
        catcher.style.top = "0";
        catcher.style.right = "0";
        catcher.style.bottom = "0";
        catcher.style.left = "0";
        catcher.style.zIndex = "9999";
        catcher.style.background = "transparent";
        catcher.style.pointerEvents = "auto";
        catcher.style.cursor = "pointer";
        container.appendChild(catcher);
      }
      catcher.onclick = () => {
        const idx = indexProvider();
        try { console.log(`[${side}:overlay-click] index=`, idx); } catch {}
        if (Number.isFinite(idx)) playCurrentPageAudio(idx);
      };
    } catch {}
  };

  const attachClickHandlersToDoc = (doc, getIndex) => {
    try {
      doc.addEventListener(
        "click",
        () => {
          const idx = getIndex();
          if (Number.isFinite(idx)) playCurrentPageAudio(idx);
        },
        true
      );
    } catch {}
    try {
      if (doc.body) {
        doc.body.onclick = () => {
          const idx = getIndex();
          if (Number.isFinite(idx)) playCurrentPageAudio(idx);
        };
      }
    } catch {}
    try {
      const nodes = doc.querySelectorAll("img, svg, canvas, video");
      nodes.forEach((node) => {
        node.style.cursor = "pointer";
        node.onclick = () => {
          const idx = getIndex();
          if (Number.isFinite(idx)) playCurrentPageAudio(idx);
        };
      });
    } catch {}
  };

  // 컨테이너 크기 변화에 따라 듀얼/싱글 모드 전환 및 렌더러 리사이즈
  useEffect(() => {
    const container = spreadContainerRef.current;
    if (!container) return;

    const handleResize = () => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || (window.innerHeight - 150);
      const nextDual = width >= 900; // 임계값: 필요시 조정
      setDualMode(nextDual);

      const panelWidth = nextDual ? Math.floor(width / 2) : width;
      try { leftRenditionRef.current && leftRenditionRef.current.resize(panelWidth, height); } catch {}
      try { rightRenditionRef.current && rightRenditionRef.current.resize(panelWidth, height); } catch {}
    };

    const ro = new ResizeObserver(() => handleResize());
    ro.observe(container);
    window.addEventListener("resize", handleResize);
    // 초기 1회 호출
    setTimeout(handleResize, 0);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // ✅ 현재 재생 중인 오디오 정지
  const stopCurrentAudio = () => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        try { audioRef.current.currentTime = 0; } catch {}
      }
    } catch {}
  };

  // ✅ 좌/우 두 렌더러: 항상 짝수(left), 다음 홀수(right)
  const loadPage = (index) => {
    // 페이지 전환 시 오디오 정지
    stopCurrentAudio();
    if (!leftBookRef.current || !rightBookRef.current) return;
    const spineLen = leftBookRef.current.spine.items.length;
    // 첫 페이지를 우측(recto)에만 표시하는 특수 케이스
    if (dualMode && index === 0) {
      const rightHrefOnly = rightBookRef.current.spine.items[0]?.href;
      const options = {
        width: "100%",
        height: "100%",
        flow: "paginated",
        spread: "none",
        allowScriptedContent: true,
        minSpreadWidth: 0,
      };
      // 좌측 렌더러 비우기
      try {
        if (leftViewerRef.current) {
          leftViewerRef.current.innerHTML = "";
        }
        if (leftRenditionRef.current && typeof leftRenditionRef.current.destroy === "function") {
          leftRenditionRef.current.destroy();
          leftRenditionRef.current = null;
        }
      } catch {}
      // 우측 렌더러 준비 및 표시
      if (!rightRenditionRef.current) {
        rightRenditionRef.current = rightBookRef.current.renderTo(rightViewerRef.current, options);
        try {
          rightRenditionRef.current.themes.select("override");
        } catch {}
        rightRenditionRef.current.on("rendered", () => {
          const iframe = rightViewerRef.current?.querySelector("iframe");
          injectReset(iframe, "right");
        });
      }
      if (rightHrefOnly) {
        rightRenditionRef.current.display(rightHrefOnly).catch(() => {});
      }
      // 오버레이 즉시 준비 (rendered 미호출 대비)
      ensureClickCatcher(rightViewerRef.current, "right", () => 0);
      leftCurrentIndexRef.current = null;
      rightCurrentIndexRef.current = 0;
      try {
        console.log("[spread:init] recto only → rightIndex: 0");
      } catch {}
      setCurrentPage(0);
      return;
    }
    let leftIndex;
    if (dualMode) {
      // 듀얼 모드에서는 [1,2], [3,4]처럼 홀수 인덱스를 좌측으로 사용
      if (index <= 0) {
        leftIndex = 1;
      } else {
        leftIndex = index % 2 === 1 ? index : index + 1;
      }
      if (leftIndex >= spineLen) leftIndex = Math.max(spineLen - 2, 0);
      if (leftIndex < 1 && spineLen > 1) leftIndex = 1;
    } else {
      // 싱글 모드: 요청 인덱스 그대로 표시
      leftIndex = Math.max(0, Math.min(index, spineLen - 1));
    }

    const leftHref = leftBookRef.current.spine.items[leftIndex]?.href;
    const rightHref = dualMode && leftIndex + 1 < spineLen
      ? rightBookRef.current.spine.items[leftIndex + 1]?.href
      : undefined;
    leftCurrentIndexRef.current = leftIndex;
    rightCurrentIndexRef.current = rightHref ? leftIndex + 1 : null;
    try {
      console.log("[spread:load]", {
        dualMode,
        leftIndex,
        rightIndex: rightHref ? leftIndex + 1 : null,
        leftHref,
        rightHref: !!rightHref,
      });
    } catch {}

    const options = {
      width: "100%",
      height: "100%",
      flow: "paginated",
      spread: "none",
      allowScriptedContent: true,
      minSpreadWidth: 0,
    };

    if (!leftRenditionRef.current) {
      leftRenditionRef.current = leftBookRef.current.renderTo(leftViewerRef.current, options);
      try {
        leftRenditionRef.current.themes.register("override", {
          "@page": {
            margin: "0 !important",
          },
          "html, body": {
            margin: "0 !important",
            padding: "0 !important",
            height: "100% !important",
            minWidth: "0 !important",
          },
          "*": {
            boxSizing: "border-box !important",
          },
          "img, svg, canvas, video": {
            width: "100% !important",
            height: "100% !important",
            maxWidth: "100% !important",
            maxHeight: "100% !important",
            objectFit: "contain !important",
            display: "block !important",
            margin: "0 !important",
            padding: "0 !important",
            border: "0 !important",
            borderRadius: "0 !important",
          },
          "figure, .page, section, article, div": {
            margin: "0 !important",
            padding: "0 !important",
            border: "0 !important",
            borderRadius: "0 !important",
            minWidth: "0 !important",
          },
          ".page-text, .textLayer, .layer-text": {
            display: "none !important",
          },
          body: {
            overflow: "hidden !important",
            WebkitColumnCount: "initial !important",
            columnCount: "initial !important",
            WebkitColumnGap: "0 !important",
            columnGap: "0 !important",
          },
        });
        leftRenditionRef.current.themes.select("override");
      } catch {}
      leftRenditionRef.current.on("rendered", (section) => {
        const iframe = leftViewerRef.current?.querySelector("iframe");
        injectReset(iframe, "left");
        try { if (iframe) iframe.style.pointerEvents = "none"; } catch {}
        ensureClickCatcher(leftViewerRef.current, "left", () => leftCurrentIndexRef.current ?? section.index);
        try {
          if (!iframe) return;
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          attachClickHandlersToDoc(doc, () => leftCurrentIndexRef.current ?? section.index);
        } catch {}
      });
    }
    if (!rightRenditionRef.current) {
      rightRenditionRef.current = rightBookRef.current.renderTo(rightViewerRef.current, options);
      try {
        rightRenditionRef.current.themes.register("override", {
          "@page": {
            margin: "0 !important",
          },
          "html, body": {
            margin: "0 !important",
            padding: "0 !important",
            height: "100% !important",
            minWidth: "0 !important",
          },
          "*": {
            boxSizing: "border-box !important",
          },
          "img, svg, canvas, video": {
            width: "100% !important",
            height: "100% !important",
            maxWidth: "100% !important",
            maxHeight: "100% !important",
            objectFit: "contain !important",
            display: "block !important",
            margin: "0 !important",
            padding: "0 !important",
            border: "0 !important",
            borderRadius: "0 !important",
          },
          "figure, .page, section, article, div": {
            margin: "0 !important",
            padding: "0 !important",
            border: "0 !important",
            borderRadius: "0 !important",
            minWidth: "0 !important",
          },
          ".page-text, .textLayer, .layer-text": {
            display: "none !important",
          },
          body: {
            overflow: "hidden !important",
            WebkitColumnCount: "initial !important",
            columnCount: "initial !important",
            WebkitColumnGap: "0 !important",
            columnGap: "0 !important",
          },
        });
        rightRenditionRef.current.themes.select("override");
      } catch {}
      rightRenditionRef.current.on("rendered", (section) => {
        const iframe = rightViewerRef.current?.querySelector("iframe");
        injectReset(iframe, "right");
        try { if (iframe) iframe.style.pointerEvents = "none"; } catch {}
        ensureClickCatcher(rightViewerRef.current, "right", () => {
          let idx = rightCurrentIndexRef.current ?? section.index;
          if (!Number.isFinite(idx) && leftCurrentIndexRef.current != null) idx = leftCurrentIndexRef.current + 1;
          return idx;
        });
        try {
          if (!iframe) return;
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          attachClickHandlersToDoc(doc, () => {
            let idx = rightCurrentIndexRef.current ?? section.index;
            if (!Number.isFinite(idx) && leftCurrentIndexRef.current != null) idx = leftCurrentIndexRef.current + 1;
            return idx;
          });
        } catch {}
      });
    }

    const tasks = [];
    if (leftHref) {
      try { console.log("[display:left] href=", leftHref); } catch {}
      tasks.push(leftRenditionRef.current.display(leftHref));
    }
    if (rightHref) {
      try { console.log("[display:right] href=", rightHref); } catch {}
      tasks.push(rightRenditionRef.current.display(rightHref));
    }
    // 오버레이 즉시 준비 (rendered 미호출 대비)
    ensureClickCatcher(leftViewerRef.current, "left", () => leftCurrentIndexRef.current ?? leftIndex);
    if (rightHref) {
      ensureClickCatcher(rightViewerRef.current, "right", () => {
        const ri = rightCurrentIndexRef.current != null ? rightCurrentIndexRef.current : (leftCurrentIndexRef.current != null ? leftCurrentIndexRef.current + 1 : leftIndex + 1);
        return ri;
      });
    }
    Promise.all(tasks).catch((e) => { try { console.warn("[display:error]", e); } catch {} });

    setCurrentPage(leftIndex);
  };

  // ✅ 해당 페이지 오디오 실행
  const playCurrentPageAudio = (index) => {
    const manifestData = manifestRef.current;
    if (!manifestData || !manifestData.pages) {
      console.warn("Manifest not loaded");
      return;
    }
    try { console.log("[audio] request index=", index); } catch {}
    // pageNumber는 1부터 시작 → index + 1 매핑
    let page = manifestData.pages.find((p) => p.pageNumber === index + 1);
    // 보조 매핑: 배열 인덱스로 직접 접근
    if (!page && manifestData.pages[index]) {
      page = manifestData.pages[index];
    }

    // 보정: 해당 인덱스에 오디오가 없으면 이웃 페이지에서 보정
    if (!page || !page.audioUrl) {
      const candidates = [index - 1, index + 1, index - 2, index + 2];
      for (const cand of candidates) {
        if (cand < 0) continue;
        let alt = manifestData.pages.find((p) => p.pageNumber === cand + 1);
        if (!alt && manifestData.pages[cand]) alt = manifestData.pages[cand];
        if (alt && alt.audioUrl) {
          page = alt;
          break;
        }
      }
    }

    if (!page) {
      console.warn("No page found for index:", index);
      return;
    }

    if (page && page.audioUrl && audioRef.current) {
      try { console.log("[audio] resolved page=", page.pageNumber, "url=", page.audioUrl); } catch {}
      audioRef.current.src = page.audioUrl;
      audioRef.current.load(); // ✅ 강제로 리로드
      audioRef.current
        .play()
        .then(() => console.log("Playing audio:", page.audioUrl))
        .catch((err) =>
          console.warn("Play failed (probably autoplay blocked):", err)
        );
    } else {
      console.warn("No audio URL for page:", index, page);
    }
  };

  // ✅ Prev / Next 버튼 (두 페이지 단위 이동)
  const goToPrevPage = () => {
    if (dualMode) {
      // [1,2]에서 이전이면 특수 첫 페이지(0 우측)로 복귀
      if (currentPage <= 1) {
        loadPage(0);
        return;
      }
      const candidate = currentPage - 2;
      const newIndex = candidate < 1 ? 1 : candidate; // 홀수 유지
      loadPage(newIndex);
    } else {
      const newIndex = Math.max(currentPage - 1, 0);
      loadPage(newIndex);
    }
  };

  const goToNextPage = () => {
    if (!leftBookRef.current) return;
    const total = leftBookRef.current.spine.items.length;
    if (dualMode) {
      // 첫 페이지(0 우측만) 다음은 [1,2]
      if (currentPage === 0) {
        const nextIndex = total > 1 ? 1 : 0;
        loadPage(nextIndex);
        return;
      }
      // 현재가 [홀수, 짝수] 시작이므로 다음도 +2의 홀수로 유지
      const candidate = currentPage + 2;
      const newIndex = candidate >= total ? Math.max(total - 2, 1) : candidate;
      loadPage(newIndex);
    } else {
      const maxStart = Math.max(total - 1, 0);
      const newIndex = Math.min(currentPage + 1, maxStart);
      loadPage(newIndex);
    }
  };

  // 패널 외곽(iframe 바깥) 클릭 핸들러 - 제스처 기반 재생 보장
  const handleLeftPanelClick = () => {
    const idx = leftCurrentIndexRef.current ?? currentPage;
    try { console.log("[left:panel-click] index=", idx); } catch {}
    if (Number.isFinite(idx)) playCurrentPageAudio(idx);
  };

  const handleRightPanelClick = () => {
    let idx = rightCurrentIndexRef.current;
    if (!Number.isFinite(idx) && leftCurrentIndexRef.current != null) {
      idx = leftCurrentIndexRef.current + 1;
    }
    if (!Number.isFinite(idx)) idx = currentPage + 1;
    try { console.log("[right:panel-click] index=", idx); } catch {}
    if (Number.isFinite(idx)) playCurrentPageAudio(idx);
  };

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        height: "100vh",
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          padding: "15px",
          background: "#2c3e50",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "24px" }}>
          {manifest?.title || "Loading..."}
        </h1>
        <div>
          Page {currentPage + 1} / {manifest?.pages.length || "?"}
        </div>
      </div>

      {/* EPUB 뷰어: 좌/우 컨테이너 */}
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
          background: "#f5f5f5",
          overflow: "hidden",
        }}
      >
        <div
          ref={leftViewerRef}
          onClick={handleLeftPanelClick}
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
            contain: "content",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            cursor: "pointer",
          }}
        />
        {dualMode && (
        <div
          ref={rightViewerRef}
          onClick={handleRightPanelClick}
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
            contain: "content",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            cursor: "pointer",
          }}
        />)}
      </div>

      {/* 하단 컨트롤 */}
      <div
        style={{
          padding: "15px",
          background: "white",
          borderTop: "2px solid #ddd",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={goToPrevPage}
          disabled={currentPage === 0}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            background: "#3498db",
            color: "white",
            border: "none",
            borderRadius: "5px",
          }}
        >
          ← Previous
        </button>

        <audio ref={audioRef} controls style={{ width: "400px" }} />

        <button
          onClick={goToNextPage}
          disabled={manifest && currentPage === manifest.pages.length - 1}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            background: "#3498db",
            color: "white",
            border: "none",
            borderRadius: "5px",
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default App;