# 데이터 구조

## categories

```json
{
  "id": "meal",
  "nameKo": "식사",
  "nameEn": "Meal",
  "nameVi": "Bữa ăn",
  "icon": "🍜",
  "description": "한 끼 식사로 좋은 대표 음식"
}
```

## foods

```json
{
  "id": "pho-bo",
  "categoryId": "meal",
  "image": "/uploads/foods/pho-bo.jpg",
  "nameVi": "Phở bò",
  "nameEn": "Vietnamese Beef Noodle Soup",
  "nameKo": "소고기 쌀국수",
  "pronunciationKo": "퍼 보",
  "shortIntro": "간단한 음식소개",
  "ingredients": "주요재료 및 소스",
  "howToEat": "먹는방법",
  "priceMin": 40000,
  "priceMax": 80000,
  "currency": "VND",
  "spicyLevel": 1,
  "hasCilantro": true,
  "dietTags": ["beef", "noodle"],
  "region": "전국 / Ho Chi Minh",
  "orderPhraseVi": "Tôi muốn gọi một tô phở bò.",
  "orderPhraseKo": "소고기 쌀국수 한 그릇 주세요.",
  "keywords": ["pho", "쌀국수", "퍼"],
  "restaurants": [
    {
      "name": "Phở Hòa Pasteur",
      "city": "Ho Chi Minh",
      "note": "외국인 방문이 많은 유명 쌀국수 식당",
      "mapUrl": "https://maps.google.com/?q=..."
    }
  ],
  "featured": true,
  "published": true
}
```

## 이미지 저장 규칙

- 외부 URL 대신 `/uploads/foods/파일명` 형식의 내부 경로를 사용합니다.
- 관리자 페이지에서 파일을 업로드하면 서버가 `public/uploads/foods` 폴더에 저장합니다.
- 파일명은 자동으로 영문 슬러그와 시간값으로 생성됩니다.
- 허용 형식: JPG, PNG, WEBP, GIF, SVG
- 최대 업로드 크기: 8MB

## Supabase 확장 시 권장 테이블

- categories
- foods
- restaurants
- food_restaurants
- order_phrases
- favorites
- admin_users
- food_revisions
