import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupWebSocket } from "./websocket";
import { autoChat } from "./api/autoChat.js";
import { config, isDevelopment, logConfigInfo } from "../shared/config.js";
import { APP_CONSTANTS } from "../shared/constants.js";
import "./engine/autoTick.js"; // 자동 틱 스케줄러 시작
import { storage } from "./storage.js";
import { persoRoomManager } from "./engine/persoRoom.js";
import { checkDatabaseConnection } from "./db.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Static files: 업로드된 이미지 서빙
app.use('/uploads', express.static('public/uploads'));

// Auto-chat API 라우터 등록
app.use('/api/auto', autoChat);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// 서버 시작 시 기존 Room들을 모두 삭제 (이미지 분석과 함께 재생성하기 위해)
async function clearAllRooms() {
  try {
    console.log('[INIT] Clearing all existing rooms for fresh image analysis...');
    
    // 모든 Room 삭제
    const allRoomIds = persoRoomManager.ids();
    for (const roomId of allRoomIds) {
      persoRoomManager.deleteRoom(roomId);
    }
    
    console.log(`[INIT] Cleared ${allRoomIds.length} rooms. Rooms will be recreated with image analysis on next access.`);
  } catch (error) {
    console.error('[INIT] Error clearing rooms:', error);
  }
}

(async () => {
  const server = await registerRoutes(app);
  
  // WebSocket 서버 초기화
  const io = setupWebSocket(server);
  
  // io 객체를 app에 저장해서 라우트에서 접근 가능하도록
  app.set("io", io);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (isDevelopment) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  server.listen({
    port: config.PORT,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    logConfigInfo();
    log(`serving on port ${config.PORT}`);
    console.log(`🚀 Server started successfully on port ${config.PORT}`);
    console.log(`📡 API endpoints available at http://localhost:${config.PORT}/api/`);
    console.log(`🔌 WebSocket server ready for connections`);
    
    // 데이터베이스 연결 확인
    console.log(`🔍 Checking database connection...`);
    console.log(`🔍 Environment variables:`, {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? '설정됨' : '설정되지 않음'
    });
    
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      console.error(`❌ Database connection failed!`);
      console.error(`❌ 서버는 시작되지만 데이터베이스 연결이 실패했습니다.`);
    } else {
      console.log(`✅ Database connection successful!`);
    }
    
    // 서버 시작 후 기존 Room 삭제 (이미지 분석과 함께 재생성하기 위해)
    await clearAllRooms();
  });
})();
