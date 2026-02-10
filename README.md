# Kid's English - EPUB Viewer

EPUB 전자책 뷰어와 AI 기반 문제풀기 기능을 제공하는 Next.js 앱입니다.

## 기능

- 📖 듀얼/싱글 모드 EPUB 뷰어
- 🔊 페이지별 오디오 재생
- 📝 **마지막 페이지 도달 시 문제풀기**: 책 내용을 기반으로 AI가 자동 생성한 5개의 객관식 문제
- ✅ 퀴즈 채점 및 해설 표시

## 시작하기

### 1. 의존성 설치

```bash
npm install
# 또는
pnpm install
```

### 2. OpenAI API 키 설정 (문제 생성용)

`.env.local` 파일을 생성하고 OpenAI API 키를 추가하세요:

```
OPENAI_API_KEY=sk-your-openai-api-key-here
```

`.env.example` 파일을 참고할 수 있습니다.

### 3. 개발 서버 실행

```bash
npm run dev
# 또는
pnpm dev
```

[http://localhost:3000](http://localhost:3000)에서 앱을 확인할 수 있습니다.

### 4. 빌드 및 배포

```bash
npm run build
npm start
```

## 사용 방법

1. 책을 읽으며 마지막 페이지까지 넘겨 주세요.
2. 마지막 페이지에 도달하면 하단에 **「문제 풀기」** 버튼이 나타납니다.
3. 버튼을 누르면 AI가 책 내용을 분석해 5개의 객관식 문제를 생성합니다.
4. 문제를 풀고 **제출하기**를 누르면 정답 여부와 해설을 확인할 수 있습니다.

## 기술 스택

- Next.js 14 (App Router)
- React 19
- epub.js (EPUB 렌더링)
- OpenAI GPT-4o-mini (문제 생성)
