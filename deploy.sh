#!/bin/bash

# GCP 프로젝트 배포 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 환경 변수 확인
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: PROJECT_ID 환경 변수가 설정되지 않았습니다.${NC}"
    echo "사용법: PROJECT_ID=your-project-id ./deploy.sh"
    exit 1
fi

echo -e "${GREEN}=== GCP Cloud Run 배포 시작 ===${NC}"
echo -e "프로젝트 ID: ${YELLOW}$PROJECT_ID${NC}"

# 1. GCP 프로젝트 설정
echo -e "\n${GREEN}[1/6] GCP 프로젝트 설정 중...${NC}"
gcloud config set project $PROJECT_ID

# 2. API 활성화
echo -e "\n${GREEN}[2/6] 필요한 API 활성화 중...${NC}"
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    sqladmin.googleapis.com

# 3. Docker 이미지 빌드
echo -e "\n${GREEN}[3/6] Docker 이미지 빌드 중...${NC}"
docker build -t gcr.io/$PROJECT_ID/api-server:latest .

# 4. Container Registry에 푸시
echo -e "\n${GREEN}[4/6] Container Registry에 이미지 푸시 중...${NC}"
docker push gcr.io/$PROJECT_ID/api-server:latest

# 5. Cloud Run에 배포
echo -e "\n${GREEN}[5/6] Cloud Run에 배포 중...${NC}"
gcloud run deploy api-server \
    --image gcr.io/$PROJECT_ID/api-server:latest \
    --region asia-northeast3 \
    --platform managed \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 10 \
    --min-instances 0 \
    --timeout 300

# 6. 배포된 URL 확인
echo -e "\n${GREEN}[6/6] 배포 완료!${NC}"
SERVICE_URL=$(gcloud run services describe api-server --region asia-northeast3 --format 'value(status.url)')
echo -e "${GREEN}배포된 서비스 URL: ${YELLOW}$SERVICE_URL${NC}"
echo -e "\n헬스체크: ${YELLOW}$SERVICE_URL/health${NC}"
echo -e "API 엔드포인트: ${YELLOW}$SERVICE_URL/api/user${NC}"

echo -e "\n${GREEN}=== 배포가 성공적으로 완료되었습니다! ===${NC}"
