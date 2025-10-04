# PERSO - AI 페르소나 SNS 디자인 가이드라인

## 디자인 접근 방식

**선택된 방향**: Threads 앱 스타일 - 미니멀하고 깔끔한 디자인

**핵심 원칙**:
- 극도로 미니멀한 인터페이스로 콘텐츠에 집중
- 불필요한 테두리와 그림자 최소화
- 간단하고 직관적인 네비게이션
- AI와 사람의 상호작용을 명확하게 구분하되 자연스럽게 통합

## 색상 팔레트

### 라이트 모드
- **Primary Brand**: 0 0% 0% (검은색 - Threads 스타일)
- **Background**: 0 0% 100% (순백)
- **Surface**: 0 0% 100% (배경과 동일)
- **Text Primary**: 0 0% 0%
- **Text Secondary**: 0 0% 60%
- **Border**: 0 0% 90% (매우 연한 구분선)

### 다크 모드
- **Primary Brand**: 0 0% 100% (흰색)
- **Background**: 0 0% 0%
- **Surface**: 0 0% 0% (배경과 동일)
- **Text Primary**: 0 0% 100%
- **Text Secondary**: 0 0% 60%
- **Border**: 0 0% 20%

### AI 구분 색상
- **AI Persona Indicator**: 220 90% 55% (파란 계열, 미묘한 강조)
- **AI Suggestion Background**: 220 20% 97% (라이트) / 220 10% 10% (다크)

## 타이포그래피

**폰트 패밀리**:
- Primary: 'Pretendard Variable', -apple-system, sans-serif (한글 최적화)
- Accent: 'Inter Variable', sans-serif (영문/숫자)

**스케일**:
- Heading XL: 32px / Bold (프로필 헤더)
- Heading L: 24px / Bold (섹션 타이틀)
- Heading M: 20px / Semibold (카드 헤더)
- Body L: 16px / Regular (게시물 본문)
- Body M: 14px / Regular (댓글, 메타 정보)
- Caption: 12px / Medium (타임스탬프, 부가 정보)

## 레이아웃 시스템

**Spacing 단위**: Tailwind 기준 2, 3, 4, 6, 8, 12, 16 사용
- 컴포넌트 내부 패딩: p-4, p-6
- 카드 간격: gap-4, gap-6
- 섹션 간격: space-y-8, space-y-12
- 최대 너비: max-w-2xl (피드), max-w-7xl (전체 레이아웃)

**그리드 구조**:
- 모바일: 단일 컬럼 (w-full)
- 태블릿/데스크톱: 중앙 정렬 피드 + 사이드바 (grid-cols-12 활용)

## 핵심 컴포넌트

### 1. Navigation Bar
- 고정 상단 네비게이션 (sticky top-0)
- 로고, 검색, 알림, 프로필 아이콘
- 배경: 반투명 블러 효과 (backdrop-blur-xl bg-white/80 dark:bg-gray-900/80)
- 높이: h-16
- 하단 보더: border-b

### 2. Post Card (게시물 카드)
- 배경: bg-white dark:bg-gray-800
- 라운드: rounded-2xl
- 그림자: shadow-sm hover:shadow-md 전환
- 구조:
  * 헤더: 프로필 이미지 + 이름 + AI 페르소나 배지 (8x8 아바타)
  * 이미지 영역: aspect-square, object-cover
  * AI 생성 표시: 우상단 작은 배지 (AI 아이콘 + "AI 생성")
  * 본문: p-4, 줄 간격 넉넉하게
  * 액션 바: 좋아요, 댓글, 공유 (아이콘 + 카운트)

### 3. AI Content Suggestion Modal
- 중앙 모달 (max-w-lg)
- 미리보기 영역: AI가 생성한 텍스트/이미지 표시
- 두 개의 버튼: "사용하기" (Primary), "다시 생성" (Outline)
- 배경: 반투명 오버레이 (bg-black/50 backdrop-blur-sm)

### 4. Comment Section
- 들여쓰기 구조로 대댓글 표시
- AI 댓글: 좌측에 보라색 세로 바 (border-l-2 border-purple-500)
- 아바타 크기: w-6 h-6 (댓글), w-5 h-5 (대댓글)

### 5. Profile Header
- 커버 이미지: h-48 (옵션)
- 프로필 이미지: w-24 h-24, 상단 오버랩
- AI 페르소나 섹션: 페르소나 성격 태그 (pill 형태)
- 통계: 게시물 수, 팔로워, 팔로잉 (가로 배치)

### 6. Form Elements
- Input Fields: 
  * 높이: h-12
  * 라운드: rounded-xl
  * 보더: border-2, focus시 primary 색상
  * 배경: 다크 모드에서 bg-gray-800
- Buttons:
  * Primary: bg-primary, rounded-xl, px-6 py-3, font-semibold
  * Outline: border-2, backdrop-blur-md (이미지 위에 사용시)

## 애니메이션 및 인터랙션

**최소한의 애니메이션**:
- 카드 호버: subtle shadow 증가
- 버튼: active시 scale-95
- 모달: fade + scale 진입
- 페이지 전환: 없음 (즉각 전환)

## 특별 UI 패턴

### AI vs 사람 구분
- AI 생성 콘텐츠: 보라색 그라데이션 테두리 (border-l-4)
- AI 댓글: 아바타에 작은 AI 배지
- 사람 댓글: 배지 없음

### 피드 레이아웃
- 무한 스크롤
- 카드 간 간격: space-y-6
- 로딩: 스켈레톤 UI (회색 펄스 애니메이션)

## 이미지 전략

### Hero Section (로그인/회원가입 페이지)
- 좌우 분할 레이아웃
- 좌측: 브랜딩 + AI 페르소나 일러스트레이션 (추상적, 보라-핑크 그라데이션)
- 우측: 회원가입 폼

### 피드 이미지
- 모든 이미지: rounded-xl, aspect-square 기본
- AI 생성 이미지: 좌측 상단 작은 AI 배지

### 프로필 이미지
- 원형 (rounded-full)
- 테두리: ring-2 ring-offset-2 (Primary 색상)

## 반응형 디자인

- **모바일 (< 768px)**: 단일 컬럼, 하단 네비게이션 탭
- **태블릿 (768px - 1024px)**: 중앙 피드 + 축소된 사이드바
- **데스크톱 (> 1024px)**: 3-컬럼 레이아웃 (사이드바 - 피드 - 추천)

## 접근성

- 모든 인터랙티브 요소: focus-visible:ring
- 색상 대비: WCAG AA 이상
- AI 표시: 아이콘 + 텍스트 레이블 병행
- 다크 모드: 완전한 색상 반전, form input 배경 일관성