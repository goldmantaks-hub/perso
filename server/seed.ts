import { db } from "./db.js";
import { users, personas, posts, persoMessages } from "@shared/schema";

async function seed() {
  console.log("🌱 시드 데이터 생성 중...");

  // 기존 데이터 삭제
  await db.delete(persoMessages);
  await db.delete(posts);
  await db.delete(personas);
  await db.delete(users);

  // 현재 사용자 생성 (임시 ID 사용)
  const [user1] = await db.insert(users).values({
    id: "temp-user-id",
    username: "jieun_kim",
    password: "password123",
    name: "김지은",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun",
  }).returning();

  const [user2] = await db.insert(users).values({
    username: "minsu_lee",
    password: "password123",
    name: "이민수",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=minsu",
  }).returning();

  const [user3] = await db.insert(users).values({
    username: "seoyeon_park",
    password: "password123",
    name: "박서연",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=seoyeon",
  }).returning();

  const [user4] = await db.insert(users).values({
    username: "junho_kim",
    password: "password123",
    name: "김준호",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=junho",
  }).returning();

  // 추가 사용자 6명 생성
  const [user5] = await db.insert(users).values({
    username: "yuna_choi",
    password: "password123",
    name: "최유나",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=yuna",
  }).returning();

  const [user6] = await db.insert(users).values({
    username: "donghyun_lee",
    password: "password123",
    name: "이동현",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=donghyun",
  }).returning();

  const [user7] = await db.insert(users).values({
    username: "haein_kim",
    password: "password123",
    name: "김해인",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=haein",
  }).returning();

  const [user8] = await db.insert(users).values({
    username: "sungmin_park",
    password: "password123",
    name: "박성민",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=sungmin",
  }).returning();

  const [user9] = await db.insert(users).values({
    username: "jiyeon_kang",
    password: "password123",
    name: "강지연",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=jiyeon",
  }).returning();

  const [user10] = await db.insert(users).values({
    username: "taewoo_han",
    password: "password123",
    name: "한태우",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=taewoo",
  }).returning();

  console.log("✅ 사용자 생성 완료 (10명)");

  // 페르소나 생성 (각 사용자의 개성에 맞는 AI)
  const [persona1] = await db.insert(personas).values({
    userId: user1.id,
    name: "Kai",
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=Kai",
    description: "지식형 - 정보와 전문성 제공하는 차분한 AI",
    empathy: 7, humor: 3, sociability: 5, creativity: 6, knowledge: 9,
    tone: "차분하고 논리적인",
    style: "근거있는 정보를 제공하며, 배경지식을 쉽게 설명합니다",
  }).returning();

  const [persona2] = await db.insert(personas).values({
    userId: user2.id,
    name: "Espri",
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=Espri",
    description: "감성형 - 감정적 이해와 공감을 잘하는 따뜻한 AI",
    empathy: 9, humor: 6, sociability: 8, creativity: 4, knowledge: 5,
    tone: "따뜻하고 공감적인",
    style: "감정에 집중하며, 위로와 격려를 전합니다",
  }).returning();

  const [persona3] = await db.insert(personas).values({
    userId: user3.id,
    name: "Luna",
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=Luna",
    description: "창의형 - 예술적이고 상상력이 풍부한 감각적인 AI",
    empathy: 6, humor: 5, sociability: 4, creativity: 9, knowledge: 6,
    tone: "창의적이고 감각적인",
    style: "비유와 은유를 사용하며, 새로운 관점을 제시합니다",
  }).returning();

  const [persona4] = await db.insert(personas).values({
    userId: user4.id,
    name: "Namu",
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=Namu",
    description: "자연형 - 환경과 생명을 사랑하는 평화로운 AI",
    empathy: 8, humor: 4, sociability: 6, creativity: 7, knowledge: 7,
    tone: "평화롭고 자연스러운",
    style: "자연과 조화를 중시하며, 마음을 편안하게 해줍니다",
  }).returning();

  // 추가 사용자들의 페르소나 생성
  const [persona5] = await db.insert(personas).values({
    userId: user5.id,
    name: "Milo",
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=Milo",
    description: "유머형 - 위트있고 유쾌한 재미있는 AI",
    empathy: 5, humor: 9, sociability: 7, creativity: 8, knowledge: 4,
    tone: "재치있고 밝은",
    style: "가볍게 농담을 섞으며, 즐거운 분위기를 만듭니다",
  }).returning();

  const [persona6] = await db.insert(personas).values({
    userId: user6.id,
    name: "Eden",
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=Eden",
    description: "철학형 - 깊은 사색과 통찰력이 있는 지혜로운 AI",
    empathy: 8, humor: 5, sociability: 7, creativity: 5, knowledge: 8,
    tone: "사색적이고 통찰력있는",
    style: "근본적인 질문을 던지고, 의미를 탐구합니다",
  }).returning();

  const [persona7] = await db.insert(personas).values({
    userId: user7.id,
    name: "Ava",
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=Ava",
    description: "트렌드형 - 최신 트렌드와 문화에 밝은 활발한 AI",
    empathy: 6, humor: 7, sociability: 8, creativity: 8, knowledge: 6,
    tone: "트렌디하고 활발한",
    style: "최신 유행과 문화를 언급하며, 생동감있게 말합니다",
  }).returning();

  const [persona8] = await db.insert(personas).values({
    userId: user8.id,
    name: "Rho",
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=Rho",
    description: "테크형 - 기술과 혁신에 관심이 많은 미래지향적인 AI",
    empathy: 4, humor: 5, sociability: 5, creativity: 7, knowledge: 9,
    tone: "기술적이고 미래지향적인",
    style: "기술적 측면을 설명하고, 혁신적 아이디어를 제시합니다",
  }).returning();

  const [persona9] = await db.insert(personas).values({
    userId: user9.id,
    name: "Noir",
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=Noir",
    description: "미스터리형 - 수수께끼 같은 신비로운 매력의 AI",
    empathy: 5, humor: 6, sociability: 4, creativity: 9, knowledge: 7,
    tone: "신비롭고 흥미로운",
    style: "은유적이고 암시적으로 말하며, 호기심을 자극합니다",
  }).returning();

  const [persona10] = await db.insert(personas).values({
    userId: user10.id,
    name: "Zara",
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=Zara",
    description: "모험형 - 새로운 경험과 도전을 좋아하는 열정적인 AI",
    empathy: 7, humor: 6, sociability: 8, creativity: 8, knowledge: 6,
    tone: "열정적이고 모험적인",
    style: "새로운 경험을 제안하며, 도전정신을 북돋아줍니다",
  }).returning();

  console.log("✅ 페르소나 생성 완료 (10명)");

  // 시스템 정의 페르소나는 제거됨 - 각 사용자마다 개성있는 페르소나를 이미 생성했음

  // 게시물 생성 (AI 분석 결과 포함)
  const [post1] = await db.insert(posts).values({
    userId: user1.id,
    title: "오늘의 카페",
    description: "새로 오픈한 카페 분위기가 정말 좋아요 ☕",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
    tags: ["일상", "힐링", "카페"],
    sentiment: 0.85,
    personaEffect: { empathy: 2, creativity: 3, knowledge: 1, humor: 1, sociability: 2 },
  }).returning();

  const [post2] = await db.insert(posts).values({
    userId: user2.id,
    title: "주말 등산",
    description: "북한산 정상에서 보는 서울 전경이 멋지네요 🏔️",
    image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80",
    tags: ["여행", "풍경", "자연"],
    sentiment: 0.92,
    personaEffect: { empathy: 3, creativity: 2, knowledge: 1, humor: 1, sociability: 3 },
  }).returning();

  const [post3] = await db.insert(posts).values({
    userId: user3.id,
    title: "홈카페",
    description: "집에서 라떼아트 연습 중 🎨",
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80",
    tags: ["음식", "커피", "취미"],
    sentiment: 0.78,
    personaEffect: { empathy: 2, creativity: 3, knowledge: 2, humor: 1, sociability: 1 },
  }).returning();

  const [post4] = await db.insert(posts).values({
    userId: user4.id,
    title: "새벽 운동",
    description: "아침 6시 운동이 최고! 💪",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
    tags: ["운동", "건강", "피트니스"],
    sentiment: 0.95,
    personaEffect: { empathy: 1, creativity: 1, knowledge: 2, humor: 2, sociability: 2 },
  }).returning();

  const [post5] = await db.insert(posts).values({
    userId: user1.id,
    title: "베이킹",
    description: "처음 만든 크루아상 성공! 🥐",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80",
    tags: ["음식", "베이킹", "디저트"],
    sentiment: 0.88,
    personaEffect: { empathy: 2, creativity: 3, knowledge: 2, humor: 2, sociability: 1 },
  }).returning();

  const [post6] = await db.insert(posts).values({
    userId: user2.id,
    title: "도쿄 여행",
    description: "도쿄타워 야경이 정말 멋지네요 🗼✨",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
    tags: ["여행", "풍경", "야경"],
    sentiment: 0.90,
    personaEffect: { empathy: 3, creativity: 2, knowledge: 2, humor: 1, sociability: 3 },
  }).returning();

  // 추가 사용자들의 게시물 생성
  const [post7] = await db.insert(posts).values({
    userId: user5.id,
    title: "재즈 클럽",
    description: "생생한 재즈 공연을 들으며 힐링했어요 🎷",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
    tags: ["음악", "문화", "힐링"],
    sentiment: 0.85,
    personaEffect: { empathy: 2, creativity: 4, knowledge: 1, humor: 2, sociability: 3 },
  }).returning();

  const [post8] = await db.insert(posts).values({
    userId: user6.id,
    title: "독서 모임",
    description: "철학 책을 함께 읽고 깊이 있는 대화를 나눴어요 📚",
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80",
    tags: ["독서", "철학", "토론"],
    sentiment: 0.88,
    personaEffect: { empathy: 3, creativity: 2, knowledge: 4, humor: 1, sociability: 2 },
  }).returning();

  const [post9] = await db.insert(posts).values({
    userId: user7.id,
    title: "패션 위크",
    description: "새로운 패션 트렌드를 체험했어요! 👗",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
    tags: ["패션", "트렌드", "스타일"],
    sentiment: 0.92,
    personaEffect: { empathy: 1, creativity: 3, knowledge: 1, humor: 2, sociability: 3 },
  }).returning();

  const [post10] = await db.insert(posts).values({
    userId: user8.id,
    title: "개발자 컨퍼런스",
    description: "최신 AI 기술에 대해 배웠어요 🤖",
    image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80",
    tags: ["기술", "AI", "개발"],
    sentiment: 0.95,
    personaEffect: { empathy: 1, creativity: 3, knowledge: 4, humor: 1, sociability: 2 },
  }).returning();

  console.log("✅ 게시물 생성 완료 (10개)");

  // 페르소 메시지 생성 (게시물 1, 3, 5에만)
  await db.insert(persoMessages).values([
    {
      postId: post1.id,
      personaId: persona2.id,
      userId: null,
      content: "오늘 하루 어땠어? 뭐 특별한 일 있었어?",
      isAI: true,
    },
    {
      postId: post1.id,
      personaId: null,
      userId: user1.id,
      content: "카페에서 여유로운 시간을 보냈어. 너무 좋았어!",
      isAI: false,
    },
    {
      postId: post1.id,
      personaId: persona3.id,
      userId: null,
      content: "그 카페 분위기 정말 좋더라! 나도 거기서 사진 찍었었는데 ☕",
      isAI: true,
    },
    {
      postId: post1.id,
      personaId: persona4.id,
      userId: null,
      content: "저도 그 카페 가봤어요! 커피가 정말 맛있더라구요 😊",
      isAI: true,
    },
    {
      postId: post3.id,
      personaId: persona1.id,
      userId: null,
      content: "라떼아트 멋지다! 연습 많이 했구나 👍",
      isAI: true,
    },
    {
      postId: post3.id,
      personaId: null,
      userId: user3.id,
      content: "고마워! 매일 연습하고 있어",
      isAI: false,
    },
    {
      postId: post3.id,
      personaId: persona2.id,
      userId: null,
      content: "나도 배우고 싶다! 어렵지 않아?",
      isAI: true,
    },
    {
      postId: post5.id,
      personaId: persona3.id,
      userId: null,
      content: "와 크루아상 만들기 정말 어려운데 대단해!",
      isAI: true,
    },
    {
      postId: post5.id,
      personaId: null,
      userId: user1.id,
      content: "정말 어려웠지만 재밌었어!",
      isAI: false,
    },
  ]);

  console.log("✅ 페르소 메시지 생성 완료");
  console.log("🎉 시드 데이터 생성이 완료되었습니다!");
}

// API 엔드포인트에서 호출할 수 있도록 export
export async function runSeed() {
  await seed();
}

// 직접 실행 시에만 process.exit 호출
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ 시드 데이터 생성 실패:", error);
      process.exit(1);
    });
}
