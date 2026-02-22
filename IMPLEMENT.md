# IMPLEMENT

## 1. 문서 목적
이 문서는 `REQUIREMENTS.md`와 `DESIGN.md`를 실제 구현 작업으로 분해한 실행 계획이다.  
작업은 Phase 단위로 진행하며, 각 Phase는 `구현 체크리스트 + Baseline Test + Exit Criteria`를 모두 만족해야 완료로 본다.

## 2. 운영 규칙
- 상태 관리는 이 문서의 체크박스를 단일 기준으로 사용한다.
- 각 Phase는 선행 Phase 완료 후 시작한다(병렬 가능 항목은 별도 표기).
- 구현 중 결정이 바뀌면 `DESIGN.md`의 `DC/IC`를 먼저 갱신하고 구현을 진행한다.
- 작업 중단 시 반드시 `진행 로그`에 `done/next/blockers/commit`을 기록한다.
- 배포 전 승인 조건은 `Phase 6 + Phase 7 + MANUAL_TEST_CHECKLIST.md PASS`다.

## 3. Phase 진행 보드
- [ ] Phase 0. SSR 부트스트랩 및 개발 프레임 구성
- [ ] Phase 1. 환경변수/DB 연결/헬스체크 기반 구현
- [ ] Phase 2. 리뷰 도메인 서비스 및 데이터 조회 계약 구현
- [ ] Phase 3. SSR 라우팅과 페이지 골격 구현(카드 리스트 + 상세)
- [ ] Phase 4. Markdown Viewer 품질 구현(GitHub 스타일, 테마, 반응형)
- [ ] Phase 5. 운영 설정 완성(.env 카테고리 필터, 로깅/에러 처리)
- [ ] Phase 6. Test Hardening Phase
- [ ] Phase 7. Integration Test Phase
- [ ] Phase 8. Release Readiness Phase(문서/수동검증/컷오버 준비)

## 4. Phase 상세

### Phase 0. SSR 부트스트랩 및 개발 프레임 구성
#### 구현 체크리스트
- [ ] `npx createLithent` SSR 보일러플레이트로 프로젝트 기본 구조 생성/정리
- [ ] Tailwind 설정(`tailwind.config`, `postcss.config`, 글로벌 CSS 엔트리) 연결
- [ ] 기본 디렉터리 생성: `src/`, `server/`, `tests/`
- [ ] `.env.example` 생성(필수 키 placeholder 포함)
- [ ] `README`에 로컬 실행 절차(install/dev/server/test) 최소 문구 추가

#### Baseline Test
- [ ] 앱 부팅 스모크: SSR 서버가 에러 없이 시작/종료된다.
- [ ] 스타일 스모크: Tailwind 유틸 클래스가 SSR 결과 HTML에서 반영된다.
- [ ] 문서 스모크: `.env.example`의 필수 키가 누락되지 않았다.

#### Exit Criteria
- [ ] 새 작업자가 저장소 clone 후 기본 실행(`install -> dev`)을 재현할 수 있다.

### Phase 1. 환경변수/DB 연결/헬스체크 기반 구현
#### 구현 체크리스트
- [ ] 서버 환경변수 파서 구현: `MONGODB_URI`, `MONGODB_DB_NAME`, `PORT`, `JMEMO_CATEGORY_FILTER`, `LOG_LEVEL`
- [ ] `MONGODB_URI` placeholder 및 형식 검증 구현(fail-fast)
- [ ] Mongo 연결 모듈 구현(`connect`, `disconnect`, `ping`)
- [ ] 헬스체크 라우트 구현: `GET /health/live`, `GET /health/ready`
- [ ] DB 연결 실패/ready 실패 시 표준 에러 응답(`503`) 처리

#### Baseline Test
- [ ] env 파서 단위 테스트(정상/누락/잘못된 형식)
- [ ] DB ping 모킹 테스트(ready 성공/실패)
- [ ] 서버 부팅 시 Mongo 연결 실패 테스트(프로세스 실패 경로 확인)

#### Exit Criteria
- [ ] `.env` 값이 유효하면 서버가 기동되고, `ready`가 DB 상태를 정확히 반영한다.

### Phase 2. 리뷰 도메인 서비스 및 데이터 조회 계약 구현
#### 구현 체크리스트
- [ ] Mongoose 모델 구현: `Jmemo`, `Category`
- [ ] 인덱스 적용: `favorite`, `regdate/moddate`, `category`, `title`
- [ ] 리스트 조회 서비스 구현(정렬: `favorite desc, regdate desc, _id desc`)
- [ ] 카테고리 필터 파서 구현(`JMEMO_CATEGORY_FILTER`, comma split, trim, empty disable)
- [ ] 상세 조회 서비스 구현(잘못된 ID/미존재 데이터 오류 분리)

#### Baseline Test
- [ ] 필터 파서 테스트(`review`, `review,share`, whitespace, empty)
- [ ] 리스트 정렬 테스트(즐겨찾기 우선 + 최신순)
- [ ] 상세 조회 테스트(정상, invalid id, not found)

#### Exit Criteria
- [ ] `.env` 필터 값 변경만으로 조회 결과가 코드 수정 없이 변경된다.

### Phase 3. SSR 라우팅과 페이지 골격 구현(카드 리스트 + 상세)
#### 구현 체크리스트
- [ ] 라우트 구현: `GET /`, `GET /notes/:id`, `GET /:id` alias(`302`)
- [ ] 리스트 페이지 SSR 구현(카드 클릭 내비게이션)
- [ ] 카드 표시 정보를 `title/tag/date` 기준으로 고정
- [ ] 카드 전체 영역 클릭 시 상세 이동되도록 구현
- [ ] 상세 페이지 SSR 구현(`.markdown-body` 래퍼 사용)
- [ ] 404/500 기본 에러 페이지 구현
- [ ] 데이터 바인딩 계약 고정: 리스트(`id,title,dateLabel,favorite,tags`), 상세(`title,renderedHtml`)

#### Baseline Test
- [ ] 라우트 테스트(`/`, `/notes/:id`, `/:id` alias)
- [ ] 상세 페이지 404 테스트(없는 문서/잘못된 ID)
- [ ] SSR 렌더 스냅샷 테스트(리스트/상세 핵심 마크업)

#### Exit Criteria
- [ ] `../jwreview`의 핵심 정보 구조(카드 리스트 + 상세 읽기)가 SSR에서 동등하게 동작한다.

### Phase 4. Markdown Viewer 품질 구현(GitHub 스타일, 테마, 반응형)
#### 구현 체크리스트
- [ ] Markdown 렌더 모듈 구현(`markdown -> safe html`)
- [ ] GitHub 스타일 계열 CSS 적용(`.markdown-body` 기반)
- [ ] 라이트/다크 모드 토글 구현 + 저장(`jmemo_theme`)
- [ ] 라이트/다크 모두 차분한 톤 팔레트로 디자인 토큰 구성
- [ ] 권장 폰트 스택(`Pretendard Variable` 계열) 및 본문/메타 타이포그래피 적용
- [ ] SSR 초기 테마 결정(쿠키 -> `prefers-color-scheme`)
- [ ] 반응형 레이아웃 적용(모바일/태블릿/PC)
- [ ] PC 최대 너비 제한 적용(`../jwreview` 기준 `768px`)

#### Baseline Test
- [ ] Markdown 요소 렌더 테스트(heading/list/code/table/blockquote)
- [ ] 테마 토글 상태 유지 테스트(새로고침/재접속)
- [ ] 반응형 스타일 테스트(주요 브레이크포인트)
- [ ] 카드 전역 클릭 영역 테스트(카드 내부 어느 영역 클릭해도 이동)
- [ ] 카드 정보 노출 테스트(`title/tag/date`)
- [ ] sanitize 테스트(`script`, inline handler 제거)

#### Exit Criteria
- [ ] 뷰어 가독성(라이트/다크), 반응형, PC 최대 너비 제한 요구가 모두 충족된다.

### Phase 5. 운영 설정 완성(.env 카테고리 필터, 로깅/에러 처리)
#### 구현 체크리스트
- [ ] 구조화 로깅 적용(`time`, `level`, `requestId`, `route`, `status`, `latencyMs`)
- [ ] 민감정보 마스킹 규칙 적용(DB URI, 토큰, 쿠키)
- [ ] 공통 에러 포맷/에러 코드 규칙 정리
- [ ] `.env.example`와 운영 문서에 카테고리 필터 변경 가이드 추가
- [ ] 기본 성능 보호(목록 조회 limit/필드 projection) 반영

#### Baseline Test
- [ ] 로깅 포맷 테스트(필수 필드 존재)
- [ ] 민감정보 마스킹 테스트
- [ ] 에러 응답 포맷 테스트(400/404/500/503)

#### Exit Criteria
- [ ] 운영 중 문제 재현/추적에 필요한 로그와 에러 정보가 충분히 남는다.

### Phase 6. Test Hardening Phase
#### 구현 체크리스트
- [ ] 서비스 경계 테스트 확대(빈 데이터셋, 대량 데이터, 특수문자 태그)
- [ ] UI 회귀 테스트 확대(테마 전환, 좁은 화면, 긴 문서 렌더)
- [ ] 보안 회귀 테스트 확대(sanitize 우회 시도 케이스)
- [ ] 실패 주입 테스트(DB 다운, timeout, malformed env)
- [ ] 테스트 리포트 포맷 통일(예: JUnit/텍스트 요약)

#### Baseline Test
- [ ] `unit + route + ui` 통합 실행이 안정적으로 통과한다.
- [ ] 실패 주입 케이스에서 기대 상태코드/메시지를 반환한다.
- [ ] hardening 추가 케이스가 기존 기능을 깨지 않는다.

#### Exit Criteria
- [ ] 핵심 모듈의 경계/예외 경로 회귀 위험이 낮아졌음을 테스트 결과로 설명할 수 있다.

### Phase 7. Integration Test Phase
#### 구현 체크리스트
- [ ] 통합 시나리오 정의:
  - [ ] 시나리오 A: 카테고리 필터(`review`) 리스트 -> 상세 진입
  - [ ] 시나리오 B: `.env` 필터 변경 -> 리스트 결과 변화 확인
  - [ ] 시나리오 C: 테마 토글 -> 재접속 후 유지
  - [ ] 시나리오 D: 모바일/PC 레이아웃 및 최대 너비 확인
- [ ] 통합 테스트 실행 스크립트 정리(`test:integration` 계열)
- [ ] Atlas 접속 필요/불필요 시나리오 분리(로컬 mock/실DB)

#### Baseline Test
- [ ] 통합 시나리오 A~D 자동 또는 반자동 PASS
- [ ] CI/로컬에서 최소 1회 재현 가능한 실행 로그 확보

#### Exit Criteria
- [ ] 기능이 단위 모듈이 아닌 실제 런타임 경로에서 검증된다.

### Phase 8. Release Readiness Phase(문서/수동검증/컷오버 준비)
#### 구현 체크리스트
- [x] `MANUAL_TEST_CHECKLIST.md` 작성 및 최신 설계와 동기화
- [ ] 릴리즈 전 필수 수동 점검 수행 및 PASS/FAIL 기록
- [ ] 운영 `.env` 점검(Atlas URI, 카테고리 필터 기본값, 로그 레벨)
- [ ] 배포 후 점검 절차 고정(`live/ready`, 리스트/상세/테마 스모크)
- [ ] 핸드오프 정보 최종 기록(done/next/blockers/commit)

#### Baseline Test
- [ ] 수동 체크리스트 PASS
- [ ] 릴리즈 스모크 PASS

#### Exit Criteria
- [ ] 배포 가능 상태를 문서와 검증 결과로 명확히 증명할 수 있다.

## 5. 병렬 진행 가이드
- Phase 1과 Phase 0의 일부(문서 작업)는 병렬 가능
- Phase 4 UI 품질 작업과 Phase 5 운영 로깅 작업은 병렬 가능
- Phase 6, Phase 7은 이전 Phase 완료 후 진행(순차 권장)

## 6. 선행 결정 의존성
- [x] DC-08: 상세 본문 최대 너비 `768px` 확정 (`DESIGN.md`)
- [x] DC-09: Markdown CSS 공급 방식 `github-markdown-css` 확정 (`DESIGN.md`)
- [x] IC-09: 카드 리스트 페이지 페이지네이션 도입 확정 (`DESIGN.md`)
- [x] IC-10: 상세 페이지 TOC 미도입 확정 (`DESIGN.md`)
- [x] PD-07: 대상 사용자 프로파일/사용 빈도 확정 (PC/모바일 모두 자주 사용, 모바일 조회 비중 높음) (`DESIGN.md`)

## 7. 중단/재개 체크리스트
- [ ] 마지막으로 완료한 체크박스를 이 문서에 반영했다.
- [ ] 진행 중 이슈와 blocker를 1줄로 요약했다.
- [ ] 다음 시작 지점(Phase/작업 1개)을 명시했다.
- [ ] 관련 커밋 SHA를 기록했다.

## 8. 진행 로그(append-only)
- [ ] `YYYY-MM-DD HH:mm UTC | Phase-X | done: ... | next: ... | blockers: ... | commit: ...`
- [x] `2026-02-22 00:00 UTC | Planning | done: REQUIREMENTS/DESIGN 기반 IMPLEMENT 초안 작성 | next: Phase 0 실행 | blockers: 없음 | commit: (not committed)`
- [x] `2026-02-22 00:10 UTC | Phase-8(partial) | done: MANUAL_TEST_CHECKLIST 초안 작성 및 요구사항/설계 항목 매핑 | next: 수동 점검 실제 수행 후 PASS/FAIL 기록 | blockers: 없음 | commit: (not committed)`
- [x] `2026-02-22 00:20 UTC | Design-sync | done: PD-01~PD-06 확정사항을 DESIGN/IMPLEMENT에 동기화 | next: Phase 0 구현 시작 | blockers: PD-07 미확정 | commit: (not committed)`
- [x] `2026-02-22 00:30 UTC | Design-sync | done: PD-07(사용자 프로파일/사용 빈도) 확정 및 REQUIREMENTS/DESIGN/IMPLEMENT 동기화 | next: Phase 0 구현 시작 | blockers: 없음 | commit: (not committed)`
- [x] `2026-02-22 00:40 UTC | Design-sync | done: 카드 UI 세부기준(title/tag/date, 카드 전체 클릭, 차분한 톤, 권장 폰트) 문서 동기화 | next: Phase 0 구현 시작 | blockers: 없음 | commit: (not committed)`
