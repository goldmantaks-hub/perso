import { db } from "./db";
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

  console.log("✅ 사용자 생성 완료");

  // 페르소나 생성 (프로필 이미지와 다른 이미지)
  const [persona1] = await db.insert(personas).values({
    userId: user1.id,
    name: "지은이의 AI 페르소나",
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=persona-jieun",
    description: "감성적이고 따뜻한 AI",
    empathy: 5,
    humor: 5,
    sociability: 5,
    creativity: 5,
    knowledge: 5,
  }).returning();

  const [persona2] = await db.insert(personas).values({
    userId: user2.id,
    name: "민수의 AI 페르소나",
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=persona-minsu",
    description: "활발하고 유머러스한 AI",
    empathy: 5,
    humor: 5,
    sociability: 5,
    creativity: 5,
    knowledge: 5,
  }).returning();

  const [persona3] = await db.insert(personas).values({
    userId: user3.id,
    name: "서연이의 AI 페르소나",
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=persona-seoyeon",
    description: "지적이고 차분한 AI",
    empathy: 5,
    humor: 5,
    sociability: 5,
    creativity: 5,
    knowledge: 5,
  }).returning();

  const [persona4] = await db.insert(personas).values({
    userId: user4.id,
    name: "준호의 AI 페르소나",
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=persona-junho",
    description: "열정적이고 긍정적인 AI",
    empathy: 5,
    humor: 5,
    sociability: 5,
    creativity: 5,
    knowledge: 5,
  }).returning();

  console.log("✅ 페르소나 생성 완료");

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

  console.log("✅ 게시물 생성 완료");

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
