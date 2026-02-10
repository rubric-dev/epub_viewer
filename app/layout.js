import "./globals.css";

export const metadata = {
  title: "Kid's English - EPUB Viewer",
  description: "EPUB 뷰어와 문제풀기",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
