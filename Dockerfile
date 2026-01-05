# Node.js 20 Alpine 이미지 사용 (경량화)
FROM node:20-alpine

# 보안을 위한 non-root 사용자 생성
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 프로덕션 의존성만 설치
RUN npm ci --only=production && npm cache clean --force

# 소스 코드 복사
COPY --chown=nodejs:nodejs src ./src
COPY --chown=nodejs:nodejs public ./public

# 환경변수 설정 (기본값)
ENV NODE_ENV=production
ENV PORT=8080

# uploads 디렉토리 생성 (파일 업로드용) - USER nodejs 이전에 생성
RUN mkdir -p uploads && chown -R nodejs:nodejs /app

# non-root 사용자로 전환
USER nodejs

# 포트 노출
EXPOSE 8080

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 애플리케이션 실행
CMD ["node", "src/server.js"]
