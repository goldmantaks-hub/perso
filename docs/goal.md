🎯 목적:
PERSO의 ‘페르소나 네트워크 맵’ 화면에서 
감정별 보기와 페르소나 타입별 보기 드롭다운을 직관적이고 감각적으로 구성한다.

🧩 요구사항:
1️⃣ 감정별 보기 드롭다운
- 기본 감정:
  😊 즐거움 (joy)
  😌 평온 (serene)
  🙂 중립 (neutral)
  😮 놀람 (surprise)
  🤔 호기심 (curious)
  😢 슬픔 (sadness)
  😠 분노 (anger)
- 확장 감정/톤:
  🤩 설렘 (excited)
  🥹 감동 (moved)
  🥱 피로 (tired)
  😬 긴장 (tense)
  🥲 향수 (nostalgic)
  😂 유머러스 (humorous tone)
  🧠 정보형 (informative tone)
  💖 공감형 (empathetic tone)
  🧪 분석형 (analytical tone)
  🐍 풍자/빈정 (sarcastic tone)
- 섹션을 나눠서 “기본 감정” / “확장 감정·톤” 두 그룹으로 구분해 드롭다운 렌더링
- 각 항목 왼쪽에는 이모지, 오른쪽에는 한글명 노출

2️⃣ 페르소나 타입별 보기 드롭다운
- 전체(✨), 내 페르소만(👤), 즐겨찾기(⭐)
- 타입 리스트:
  🧠 지식형 (Kai)
  💖 감성형 (Espri)
  🌙 창의형 (Luna)
  📊 분석형 (Namu)
  😂 유머형 (Milo)
  🧭 철학형 (Eden)
  💄 트렌드형 (Ava)
  ⚙️ 테크형 (Rho)
  🦉 미스터리형 (Noir)
- 각 타입은 이모지 + 한글 + 영문명으로 표시

3️⃣ UX 구성
- 선택된 필터는 버튼에 하이라이트로 표시
- 선택 조합 결과를 상단 제목에 요약
  예: “현재 보기: 😊 즐거움 + 😂 유머형 (노드 7개)”
- 선택 결과가 없으면 “조건에 맞는 페르소나가 없습니다.” 안내 표시

📦 데이터 예시(JSON):
{
  "filters": {
    "emotion": {
      "label": "감정별 보기",
      "groups": [
        {
          "groupLabel": "기본 감정",
          "items": [
            { "key": "joy", "label": "즐거움", "emoji": "😊" },
            { "key": "serene", "label": "평온", "emoji": "😌" },
            { "key": "neutral", "label": "중립", "emoji": "🙂" },
            { "key": "surprise", "label": "놀람", "emoji": "😮" },
            { "key": "curious", "label": "호기심", "emoji": "🤔" },
            { "key": "sadness", "label": "슬픔", "emoji": "😢" },
            { "key": "anger", "label": "분노", "emoji": "😠" }
          ]
        },
        {
          "groupLabel": "확장 감정/톤",
          "items": [
            { "key": "excited", "label": "설렘", "emoji": "🤩" },
            { "key": "moved", "label": "감동", "emoji": "🥹" },
            { "key": "tired", "label": "피로", "emoji": "🥱" },
            { "key": "tense", "label": "긴장", "emoji": "😬" },
            { "key": "nostalgic", "label": "향수", "emoji": "🥲" },
            { "key": "humorous", "label": "유머러스", "emoji": "😂" },
            { "key": "informative", "label": "정보형", "emoji": "🧠" },
            { "key": "empathetic", "label": "공감형", "emoji": "💖" },
            { "key": "analytical", "label": "분석형", "emoji": "🧪" },
            { "key": "sarcastic", "label": "풍자/빈정", "emoji": "🐍" }
          ]
        }
      ]
    },
    "personaTypes": {
      "label": "페르소나 타입별 보기",
      "quick": [
        { "key": "all", "label": "전체", "emoji": "✨" },
        { "key": "mine", "label": "내 페르소만", "emoji": "👤" },
        { "key": "favorites", "label": "즐겨찾기", "emoji": "⭐" }
      ],
      "items": [
        { "key": "knowledge", "label": "지식형 (Kai)", "emoji": "🧠" },
        { "key": "empath", "label": "감성형 (Espri)", "emoji": "💖" },
        { "key": "creative", "label": "창의형 (Luna)", "emoji": "🌙" },
        { "key": "analyst", "label": "분석형 (Namu)", "emoji": "📊" },
        { "key": "humor", "label": "유머형 (Milo)", "emoji": "😂" },
        { "key": "philosopher", "label": "철학형 (Eden)", "emoji": "🧭" },
        { "key": "trend", "label": "트렌드형 (Ava)", "emoji": "💄" },
        { "key": "tech", "label": "테크형 (Rho)", "emoji": "⚙️" },
        { "key": "mystery", "label": "미스터리형 (Noir)", "emoji": "🦉" }
      ]
    }
  }
}

🎬 실행 명령:
"Create dynamic dropdown menus for emotion and persona-type filters in the Persona Network Map, using Tailwind + HeadlessUI with emoji-based labels, grouped sections, and real-time filtering logic as described."
