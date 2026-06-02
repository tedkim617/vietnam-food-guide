# Viet Menu Guide

베트남어나 베트남 음식 문화를 잘 모르는 외국인이 휴대폰으로 음식 정보를 확인하고 현장에서 바로 주문할 수 있도록 만든 모바일 우선 PWA 앱입니다.

## 핵심 기능

- 음식 카테고리: 식사, 요리, 간식, 음료, 주류, 기타
- 음식별 상세 정보
  - 음식사진
  - 베트남어 명칭
  - 영어 명칭
  - 한국어 명칭/독음
  - 간단한 음식소개
  - 주요재료 및 소스
  - 먹는방법
  - 평균 금액
  - 추천 식당 / Google Maps 링크
  - 직원에게 보여줄 주문 문장
- 한국어, 영어, 베트남어, 독음 기반 검색
- 모바일 최적화 UI
- PWA 설치 지원
- 관리자 페이지에서 음식 추가/수정/삭제
- 관리자 페이지에서 음식사진 직접 업로드/교체
- 업로드 이미지는 `public/uploads/foods` 폴더에 저장
- JSON 파일 기반 데이터 저장

## 로컬 실행

Node.js 18 이상 권장.

```bash
cd vietnam-food-guide
node server/server.js
```

브라우저에서 접속:

```text
http://localhost:8080
```

## 테스트

```bash
npm test
```

## 관리자 페이지

사용자 화면 우측 상단의 `관리자` 버튼을 누릅니다.

기본 비밀번호는 개발 환경에서 다음 값입니다.

```text
admin1234
```

운영 배포 시 반드시 `.env` 또는 서버 환경변수에서 `ADMIN_PASSWORD`를 변경하세요.

## Docker 실행

```bash
cp .env.example .env
docker compose up --build
```

## 환경변수

```text
PORT=8080
ADMIN_PASSWORD=change-this-password
JWT_SECRET=replace-with-long-random-string
DATA_FILE=./data/foods.json
```

## 이미지 관리 방식

이 버전은 이미지 URL을 직접 연결하지 않고, 관리자 페이지에서 이미지 파일을 선택해 업로드하는 방식입니다. 업로드된 파일은 프로젝트 내부의 다음 폴더에 저장됩니다.

```text
public/uploads/foods
```

관리자 화면에서 음식을 추가하거나 수정할 때 `음식사진 직접 업로드` 항목에서 JPG, PNG, WEBP, GIF, SVG 이미지를 선택하면 서버가 파일을 저장하고 음식 데이터의 `image` 값을 `/uploads/foods/파일명` 형태로 자동 기록합니다.

## 데이터 저장 방식

현재 MVP는 `data/foods.json` 파일에 음식 데이터를 저장합니다. 이는 빠른 시제품 제작과 현장 테스트에 적합합니다.

운영 서비스로 확장할 경우 다음 구조로 이전하는 것을 권장합니다.

- Supabase PostgreSQL
- Firebase Firestore
- 자체 Node.js API + PostgreSQL
- 이미지 저장: Supabase Storage, Cloudflare R2, S3

## 권장 운영 방식

1. 초기 음식 50개 정도를 등록합니다.
2. 호치민 현지 식당에서 실제 주문 문장을 테스트합니다.
3. 가격은 고정값이 아니라 범위로 관리합니다.
4. 음식 사진은 저작권이 확인된 이미지 또는 직접 촬영 이미지를 사용합니다.
5. 추천 식당은 Google Maps 링크와 함께 등록합니다.
6. 사용자 반응을 확인한 뒤 위치 기반 추천, AI 메뉴판 번역, 음성 발음 기능을 추가합니다.

## 주의사항

- 기본 데이터의 이미지는 프로젝트 내부 `public/uploads/foods` 폴더의 로컬 이미지 경로를 사용합니다. 실제 상업 서비스에서는 직접 촬영 이미지 또는 사용권이 명확한 이미지를 업로드하세요.
- 음식 가격은 지역, 매장, 관광지 여부에 따라 달라질 수 있으므로 범위로 표시해야 합니다.
- 베트남어 주문 문장은 현지 사용 전 베트남어 사용자에게 검수받는 것이 좋습니다.
