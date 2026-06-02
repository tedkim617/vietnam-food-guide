# 배포 방법

## 1. VPS 또는 클라우드 서버 배포

```bash
git clone <repo-url>
cd vietnam-food-guide
cp .env.example .env
nano .env
node server/server.js
```

운영에서는 PM2를 권장합니다.

```bash
npm install -g pm2
pm2 start server/server.js --name viet-menu-guide
pm2 save
```

## 2. Docker 배포

```bash
cp .env.example .env
docker compose up -d --build
```

## 3. HTTPS 적용

운영에서는 Nginx 또는 Cloudflare를 통해 HTTPS를 적용하세요.

Nginx 리버스 프록시 예시:

```nginx
server {
  server_name your-domain.com;
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## 4. 보안 체크리스트

- ADMIN_PASSWORD 변경
- JWT_SECRET 변경
- HTTPS 적용
- 관리자 페이지 접근 제한 고려
- 이미지 저작권 확인
- 정기 백업 설정
- data/foods.json 백업 자동화
