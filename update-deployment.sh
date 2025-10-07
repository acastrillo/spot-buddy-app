#!/bin/bash
set -e

echo "🚀 Updating Spotter App deployment..."

# Variables (using existing infrastructure)
REGION="us-east-1"
CLUSTER_NAME="SpotterCluster"
SERVICE_NAME="spotter-app"
TASK_FAMILY="SpotterAppTaskDefinition"

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✅ AWS Account ID: $ACCOUNT_ID"

ECR_REPO="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/spotter-app"

# Step 1: Build Docker image
echo "🏗️  Step 1: Building Docker image (this may take 5-10 minutes)..."
docker build -t spotter-app . || { echo "❌ Docker build failed"; exit 1; }
echo "✅ Docker image built successfully"

# Step 2: Login to ECR
echo "🔑 Step 2: Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com" || { echo "❌ ECR login failed"; exit 1; }
echo "✅ Logged into ECR successfully"

# Step 3: Tag and push image
echo "📤 Step 3: Pushing image to ECR (this may take a few minutes)..."
docker tag spotter-app:latest "$ECR_REPO:latest"
docker push "$ECR_REPO:latest" || { echo "❌ Failed to push image"; exit 1; }
echo "✅ Image pushed to ECR successfully"

# Step 4: Get current task definition
echo "📝 Step 4: Getting current task definition..."
TASK_DEF_ARN=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION --query "services[0].taskDefinition" --output text)
echo "Current task definition: $TASK_DEF_ARN"

# Step 5: Force new deployment
echo "🚀 Step 5: Forcing new deployment..."
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --force-new-deployment \
    --region $REGION \
    --query "service.{ServiceName:serviceName,Status:status,DesiredCount:desiredCount,RunningCount:runningCount}" \
    --output table

echo ""
echo "🎉 Deployment initiated successfully!"
echo ""
echo "⏳ The new version will be deployed in 2-5 minutes"
echo ""
echo "📊 Monitor deployment progress:"
echo "   aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION --query \"services[0].{Status:status,Running:runningCount,Desired:desiredCount,Deployments:deployments}\" --output table"
echo ""
echo "📝 View application logs:"
echo "   aws logs tail /ecs/spotter-app --follow --region $REGION"
echo ""
echo "🌐 Your app URL: https://spotter.cannashieldct.com"
