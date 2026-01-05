#!/bin/bash

# GCP Cloud Run + Cloud SQL 배포 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 환경 변수 확인
if [ -z "$PROJECT_ID" ] || [ -z "$INSTANCE_CONNECTION_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_NAME" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}Error: 필수 환경 변수가 설정되지 않았습니다.${NC}"
    echo "필수 환경 변수:"
    echo "  - PROJECT_ID: GCP 프로젝트 ID"
    echo "  - INSTANCE_CONNECTION_NAME: Cloud SQL 인스턴스 연결 이름 (예: project:region:instance)"
    echo "  - DB_USER: 데이터베이스 사용자"
    echo "  - DB_NAME: 데이터베이스 이름"
    echo "  - DB_PASSWORD: 데이터베이스 비밀번호"
    echo ""
    echo "사용법:"
    echo "  PROJECT_ID=your-project \\"
    echo "  INSTANCE_CONNECTION_NAME=project:region:instance \\"
    echo "  DB_USER=user \\"
    echo "  DB_NAME=dbname \\"
    echo "  DB_PASSWORD=password \\"
    echo "  ./deploy-with-cloudsql.sh"
    exit 1
fi

REGION=${REGION:-asia-northeast3}

echo -e "${GREEN}=== GCP Cloud Run + Cloud SQL 배포 시작 ===${NC}"
echo -e "프로젝트 ID: ${YELLOW}$PROJECT_ID${NC}"
echo -e "리전: ${YELLOW}$REGION${NC}"
echo -e "Cloud SQL 인스턴스: ${YELLOW}$INSTANCE_CONNECTION_NAME${NC}"

# 1. GCP 프로젝트 설정
echo -e "\n${GREEN}[1/8] GCP 프로젝트 설정 중...${NC}"
gcloud config set project $PROJECT_ID

# 2. Docker 인증 설정
echo -e "\n${GREEN}[2/8] Docker 인증 설정 중...${NC}"
gcloud auth configure-docker --quiet
gcloud auth configure-docker $REGION-docker.pkg.dev --quiet 2>/dev/null || true

# 3. API 활성화
echo -e "\n${GREEN}[3/8] 필요한 API 활성화 중...${NC}"
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    artifactregistry.googleapis.com

# 4. Secret Manager에 DB 비밀번호 저장
echo -e "\n${GREEN}[4/8] Secret Manager에 데이터베이스 비밀번호 저장 중...${NC}"
echo -n "$DB_PASSWORD" | gcloud secrets create db-password --data-file=- --replication-policy=automatic 2>/dev/null || \
echo -n "$DB_PASSWORD" | gcloud secrets versions add db-password --data-file=-

# 5. Docker 이미지 빌드
echo -e "\n${GREEN}[5/8] Docker 이미지 빌드 중...${NC}"
docker build -t gcr.io/$PROJECT_ID/api-server:latest .

# 6. Container Registry에 푸시
echo -e "\n${GREEN}[6/8] Container Registry에 이미지 푸시 중...${NC}"
docker push gcr.io/$PROJECT_ID/api-server:latest

# 7. Cloud Run 서비스 계정 생성 (이미 존재하면 스킵)
echo -e "\n${GREEN}[7/8] Cloud Run 서비스 계정 설정 중...${NC}"
SERVICE_ACCOUNT="cloud-run-sql-sa@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud iam service-accounts create cloud-run-sql-sa \
    --display-name="Cloud Run SQL Service Account" 2>/dev/null || true

# Cloud SQL 클라이언트 권한 부여
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/cloudsql.client" \
    --condition=None 2>/dev/null || true

# Secret Manager 접근 권한 부여
gcloud secrets add-iam-policy-binding db-password \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" 2>/dev/null || true

# 8. Cloud Run에 배포
echo -e "\n${GREEN}[8/8] Cloud Run에 배포 중...${NC}"
SERVICE_NAME=${SERVICE_NAME:-api-server-jun0}
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/api-server:latest \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --service-account=$SERVICE_ACCOUNT \
    --add-cloudsql-instances=$INSTANCE_CONNECTION_NAME \
    --set-env-vars "NODE_ENV=production,DB_HOST=/cloudsql/$INSTANCE_CONNECTION_NAME,DB_PORT=5432,DB_USER=$DB_USER,DB_NAME=$DB_NAME" \
    --set-secrets="DB_PASSWORD=db-password:latest" \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 10 \
    --min-instances 0 \
    --timeout 300 \
    --port 3000

# 배포된 URL 확인
echo -e "\n${GREEN}=== 배포 완료! ===${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')
echo -e "${GREEN}배포된 서비스 URL: ${YELLOW}$SERVICE_URL${NC}"
echo -e "\n테스트 명령어:"
echo -e "  헬스체크: ${YELLOW}curl $SERVICE_URL/health${NC}"
echo -e "  API 테스트: ${YELLOW}curl $SERVICE_URL/api/user${NC}"

echo -e "\n${GREEN}=== 배포가 성공적으로 완료되었습니다! ===${NC}"
