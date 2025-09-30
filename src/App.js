import React, { useEffect, useRef, useState } from "react";
import ePub from "epubjs";

function App() {
  const viewerRef = useRef(null);
  const audioRef = useRef(null);

  const bookRef = useRef(null);
  const renditionRef = useRef(null); // ✅ 렌더링 객체 1회만 생성

  const [manifest, setManifest] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const opfUrl =
      "https://files-kids-english.s3.ap-northeast-2.amazonaws.com/books/urn%3Auuid%3Apublishing-3e1d27df/epub/OEBPS/content.opf";
    const manifestUrl =
      "https://files-kids-english.s3.ap-northeast-2.amazonaws.com/books/urn%3Auuid%3Apublishing-3e1d27df/manifest.json";

    fetch(manifestUrl)
      .then((res) => res.json())
      .then((data) => {
        setManifest(data);

        const epubBook = ePub(opfUrl);
        bookRef.current = epubBook;

        epubBook.ready.then(() => {
          console.log("Spine length:", epubBook.spine.items.length);
          loadPage(0); // ✅ 첫 페이지 로드
        });
      });
  }, []);

  // ✅ spine 인덱스 기반으로 페이지 로딩
  const loadPage = (index) => {
    if (!bookRef.current) return;

    const href = bookRef.current.spine.items[index].href;

    // 렌더링 객체는 1번만 생성
    if (!renditionRef.current) {
      renditionRef.current = bookRef.current.renderTo(viewerRef.current, {
        width: "100%",
        height: "calc(100vh - 150px)",
        flow: "scrolled-doc",
        spread: "none",
        allowScriptedContent: true
      });

      // 렌더링 끝나면 이미지에 이벤트 추가
      renditionRef.current.on("rendered", () => {
        const iframe = viewerRef.current.querySelector("iframe");
        if (!iframe) return;

        const doc = iframe.contentDocument || iframe.contentWindow.document;
        const imgs = doc.querySelectorAll("img");

        imgs.forEach((img) => {
          img.style.width = "100%";
          img.style.height = "auto";
          img.style.display = "block";
          img.style.maxWidth = "100%";
          img.style.maxHeight = "100%";

          img.onclick = () => {
            console.log("Image clicked on page:", index);
            playCurrentPageAudio(index);
          };
        });
      });
    }

    // 페이지 전환
    renditionRef.current.display(href);
    setCurrentPage(index);
  };

  // ✅ 해당 페이지 오디오 실행
  const playCurrentPageAudio = (index) => {
    if (!manifest || !manifest.pages[index]) {
      console.warn("No audio for page:", index);
      return;
    }
    const page = manifest.pages[index];
    if (page.audioUrl && audioRef.current) {
      audioRef.current.src = page.audioUrl;
      audioRef.current.play();
      console.log("Playing audio:", page.audioUrl);
    }
  };

  // ✅ Prev / Next 버튼
  const goToPrevPage = () => {
    const newIndex = Math.max(currentPage - 1, 0);
    loadPage(newIndex);
  };

  const goToNextPage = () => {
    if (!manifest) return;
    const newIndex = Math.min(currentPage + 1, manifest.pages.length - 1);
    loadPage(newIndex);
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      {/* 헤더 */}
      <div
        style={{
          padding: "15px",
          background: "#2c3e50",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <h1 style={{ margin: 0, fontSize: "24px" }}>
          {manifest?.title || "Loading..."}
        </h1>
        <div>
          Page {currentPage + 1} / {manifest?.pages.length || "?"}
        </div>
      </div>

      {/* EPUB 뷰어 */}
      <div
        ref={viewerRef}
        style={{
          width: "100%",
          height: "calc(100vh - 150px)",
          background: "#f5f5f5"
        }}
      ></div>

      {/* 하단 컨트롤 */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "15px",
          background: "white",
          borderTop: "2px solid #ddd",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
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
            borderRadius: "5px"
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
            borderRadius: "5px"
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default App;