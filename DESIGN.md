# DESIGN

## 1. 문서 목적
이 문서는 `REQUIREMENTS.md`를 구현 가능한 설계 기준으로 구체화한 문서다.  
`doc-driven-designer-v1` 규칙에 따라 아키텍처, 계약, 운영 정책, 오픈 결정을 한 곳에서 관리한다.

## 2. 입력 기준 및 참조
- 기준 요구사항: `REQUIREMENTS.md`
- 레퍼런스 프로젝트(동작/구조 참고):
  - `../jwreview`: 카드 리스트 + 상세뷰 UX, GitHub 스타일 마크다운 렌더링, 기존 `review` 카테고리 필터 맥락
  - `../memo`: Atlas 연결/환경변수 검증/서비스 분리 패턴
- 본 프로젝트 원칙: 레퍼런스는 "참고"만 하며 런타임 의존으로 직접 import하지 않는다.

## 3. 설계 원칙
1. 기능 동등성 우선: `../jwreview`의 핵심 UX(카드 리스트, 상세 마크다운 읽기)를 먼저 재현한다.
2. 환경변수 중심 운영: DB 연결/카테고리 필터/테마 기본값 등 운영 변경 포인트는 `.env`에서 제어한다.
3. SSR 우선 렌더링: 첫 화면 가독성과 SEO/초기 응답 안정성을 위해 SSR 기반을 유지한다.
4. 구현 분리: View(SSR/UI), Domain(Service), Infra(DB/Env) 경계를 분리해 리팩토링 비용을 낮춘다.
5. 검증 가능 설계: 각 결정은 테스트 또는 수동 검증 시나리오와 연결한다.

## 4. 목표 아키텍처
### 4.1 런타임/스택
- 앱 부트스트랩: `npx createLithent` SSR 보일러플레이트
- UI 스타일링: Tailwind CSS
- DB: MongoDB Atlas(Mongoose)
- 서버: Node.js 기반 SSR + HTTP 라우팅

### 4.2 계층 구조
1. Presentation Layer
- Lithent SSR 페이지(리스트/상세), 테마 토글 UI, 카드 UI

2. Domain Layer
- 노트 조회/상세 조회/필터 적용을 담당하는 서비스

3. Infrastructure Layer
- Mongo 연결 모듈, Mongoose 모델, 환경변수 파싱/검증 모듈

### 4.3 요청 흐름
1. 사용자가 리스트 페이지(`/`) 요청
2. 서버가 `.env`의 카테고리 필터를 해석
3. 서비스가 Mongo 조회 후 SSR HTML 렌더
4. 클라이언트 hydration 후 테마 토글/내비게이션 상호작용 유지

## 5. 디렉터리/모듈 구조(초안)
```text
jmemo-view/
  src/
    app/
      root.tsx                   # SSR 루트 레이아웃
    features/
      review-list/
        review-list-page.tsx
        review-card.tsx
      review-detail/
        review-detail-page.tsx
      markdown/
        markdown-render.ts        # markdown -> safe html
      theme/
        theme-store.ts            # light/dark 상태 + persistence
    shared/
      types.ts
      constants.ts
      env-client.ts
  server/
    index.mjs                     # 서버 진입점
    app.mjs                       # 라우트/미들웨어 조립
    db.mjs                        # Mongo connect/ping/disconnect
    env.mjs                       # 서버 환경변수 파싱/검증
    models/
      jmemo-model.mjs
      category-model.mjs
    services/
      review-service.mjs
    routes/
      pages.mjs                   # /, /notes/:id, /:id(alias)
      health.mjs                  # /health/live, /health/ready
  public/
    styles/
      markdown-github.css         # GitHub 스타일 오버라이드
```

## 6. 데이터 설계
### 6.1 컬렉션 모델(`jmemos`)
`../jwreview`, `../memo` 공통 구조를 따른다.

- `title: string` (required)
- `note: string`
- `regdate: Date`
- `moddate: Date`
- `favorite: boolean`
- `category: string[]`

### 6.2 인덱스
- `{ favorite: -1 }`
- `{ moddate: -1 }`
- `{ category: 1 }`
- `{ title: 1 }`

### 6.3 목록 정렬
- 기본 정렬: `favorite DESC -> regdate DESC -> _id DESC`
- 이유: 기존 사용성이던 "중요(favorite) 우선 + 최신순"을 유지한다.

### 6.4 카테고리 필터 정책(.env)
- 환경변수 키: `JMEMO_CATEGORY_FILTER`
- 기본값: `review`
- 형식: 콤마 구분 문자열(예: `review,share`)
- 해석 규칙:
  - 값이 비어있지 않으면 `category: { $in: [tags...] }`
  - 값이 빈 문자열이면 카테고리 필터를 비활성화(전체 조회)

## 7. 페이지/라우팅 계약
### 7.1 페이지 라우트
- `GET /`: 카드 리스트 페이지
- `GET /notes/:id`: 상세 페이지
- `GET /:id`: 기존 `../jwreview` 링크 호환용 alias(`302 -> /notes/:id`)

### 7.2 응답 계약(SSR)
1. 리스트 페이지
- 카드 필드: `id`, `title`, `dateLabel`, `favorite`, `tags[]`
- 카드 클릭 시 상세 페이지로 이동

2. 상세 페이지
- `title`, `noteMarkdown`, `renderedHtml`
- 렌더링 본문 래퍼 클래스: `.markdown-body`

### 7.3 오류 라우팅
- 잘못된 ID/문서 없음: `404` + 사용자용 메시지 페이지
- DB 연결 불가: `503`(ready 기준) + 기본 에러 페이지

## 8. UI/UX 설계
### 8.1 리스트(카드) 화면
- 레이아웃: 반응형 grid
- 카드 폭 기준: 모바일 1열, 태블릿 2열, 데스크톱 3~4열
- 카드 내용: 제목(우선), 태그 칩, 작성/등록일
- 레퍼런스 반영: `../jwreview/dist/css/review.css`의 카드 밀도/가독성 방향 유지

### 8.2 상세(마크다운 뷰어) 화면
- GitHub 스타일 기반 타이포그래피 사용
- 제목/본문/코드블록/표/인용구 가독성 우선
- PC 최대 너비 제한: 기본 `max-width: 860px`(추후 디자인 QA에서 미세조정 가능)
- 모바일에서는 `max-width` 제한 대신 화면 폭 100% 사용

### 8.3 라이트/다크 모드
- 토글 위치: 상세 페이지 상단 우측 고정(리스트에도 공통 적용)
- 저장 키: `jmemo_theme`
- 값: `light | dark`
- 초기 결정 순서:
  1. 서버 쿠키(`jmemo_theme`)가 있으면 우선
  2. 없으면 `prefers-color-scheme`
  3. 최종값으로 SSR 클래스 주입 후 hydration

### 8.4 마크다운 스타일 적용 방식
- 기본 채택: GitHub 스타일 CSS(차용) + Tailwind 레이아웃 유틸 조합
- 이유: 요구사항의 "GitHub 스타일 기반 읽기 경험" 충족을 가장 직접적으로 보장

## 9. 환경변수/운영 정책
### 9.1 환경변수 계약
- `MONGODB_URI` (required): Atlas 연결 URI
- `MONGODB_DB_NAME` (optional, default: `jmemo`)
- `PORT` (optional, default: `4000`)
- `JMEMO_CATEGORY_FILTER` (optional, default: `review`)
- `LOG_LEVEL` (optional, default: `info`)

### 9.2 검증 정책
- 서버 시작 시 환경변수 파싱/검증 실패하면 즉시 종료(fail-fast)
- `MONGODB_URI`는 placeholder 문자열 금지

### 9.3 헬스체크
- `GET /health/live`: 프로세스 생존
- `GET /health/ready`: DB ping 포함 준비 상태

## 10. 보안/안정성 정책
1. 시크릿 관리
- DB URI/자격정보는 `.env`로만 주입, 코드 저장 금지

2. 마크다운 렌더링 안전장치
- 렌더 후 sanitize 단계 적용
- `script`, inline event handler(`on*`)는 제거
- 개인 사용성 요구를 해치지 않는 범위에서 최소 제한 정책 적용

3. 로깅
- 구조화 로그 최소 필드: `time`, `level`, `requestId`, `route`, `status`, `latencyMs`
- 민감정보는 로그 출력 금지/마스킹

## 11. 검증 전략(설계 기준)
### 11.1 자동 테스트 기준
- env 파서 단위 테스트
- 카테고리 필터 파서 단위 테스트(`review`, `review,share`, empty)
- 서비스 레이어 테스트(정렬, 필터, 존재하지 않는 ID)
- SSR 라우트 테스트(`/`, `/notes/:id`, `/:id` alias)

### 11.2 수동 검증 기준
- `.env`의 `JMEMO_CATEGORY_FILTER` 값을 변경하면 리스트 결과가 즉시 바뀌는지 확인
- 라이트/다크 모드 전환 후 새로고침/재접속 시 유지되는지 확인
- 모바일/PC에서 레이아웃 깨짐 없는지 확인
- PC에서 상세 본문 최대 너비 제한이 적용되는지 확인

## 12. 오픈 결정 사항
- 대상 사용자 프로파일 및 사용 빈도(문서에 아직 미기재)
- 최종 PC 최대 너비 값(`860px` 유지 vs `768px` 회귀) 디자인 QA 확정 필요
- Markdown 스타일 적용 경로(패키지 CSS 직접 사용 vs 저장소 내 정적 사본 유지) 확정 필요

## 13. 결정 체크리스트(DC)
- [x] DC-01 기술 스택은 `createLithent SSR + Tailwind + MongoDB Atlas`로 확정한다.
- [x] DC-02 카테고리 필터는 코드 하드코딩 대신 `.env(JMEMO_CATEGORY_FILTER)`로 제어한다.
- [x] DC-03 카테고리 필터 기본값은 `review`로 둔다.
- [x] DC-04 상세 뷰 마크다운 스타일은 GitHub 스타일 계열을 채택한다.
- [x] DC-05 라이트/다크 모드 토글과 사용자 선택값 persistence를 지원한다.
- [x] DC-06 라우팅은 `/`, `/notes/:id`, `/:id(alias)`로 설계한다.
- [x] DC-07 뷰어는 반응형이며 PC에서 최대 너비 제한을 둔다.
- [ ] DC-08 상세 본문 최대 너비 최종 픽셀값을 디자인 QA로 확정한다. (`TBD`)
- [ ] DC-09 Markdown CSS 자산 공급 방식(외부 패키지 vs 로컬 사본)을 확정한다. (`TBD`)

## 14. 구현 계약 체크리스트(IC)
- [x] IC-01 `JMEMO_CATEGORY_FILTER`는 콤마 구분 태그 목록으로 파싱한다.
- [x] IC-02 `JMEMO_CATEGORY_FILTER`가 빈 문자열이면 카테고리 필터를 비활성화한다.
- [x] IC-03 리스트 쿼리 기본 정렬은 `favorite desc, regdate desc, _id desc`를 사용한다.
- [x] IC-04 카드 클릭 시 상세 라우트로 이동하며 브라우저 뒤로가기를 보장한다.
- [x] IC-05 상세 본문 HTML은 `.markdown-body` 래퍼로 렌더링한다.
- [x] IC-06 테마 토글 값은 `jmemo_theme` 키로 저장하고 SSR 쿠키와 동기화한다.
- [x] IC-07 `GET /health/ready`는 DB ping 실패 시 `503`을 반환한다.
- [x] IC-08 잘못된 문서 ID 또는 미존재 문서는 `404`로 일관 처리한다.
- [ ] IC-09 카드 리스트 페이지에서 페이지네이션 도입 여부를 확정한다. (`TBD`)
- [ ] IC-10 상세 페이지 내 TOC(목차) 제공 여부를 확정한다. (`TBD`)

## 15. 결정 로그
- DC-01: 사용자 요청에 따라 SSR 보일러플레이트(`createLithent`)와 Tailwind를 고정한다.
- DC-02/DC-03: `../jwreview`의 `review` 필터 문맥을 유지하되, 운영 변경 가능성을 위해 `.env`로 이관한다.
- DC-04: 요구사항의 핵심 포인트가 "GitHub 스타일 기반 가독성"이므로 직접 반영 가능한 스타일 전략을 택한다.
- DC-05: 마크다운 뷰어 사용성 요구(라이트/다크 전환)를 충족하기 위해 토글 + persistence를 기본 기능으로 확정한다.
- DC-06: 레거시 링크 호환성과 신규 라우팅 가독성을 동시에 만족하기 위해 alias 라우트를 포함한다.
- DC-07: 반응형 + PC 최대 너비 제한은 요구사항에 명시되어 있으므로 필수 계약으로 확정한다.
