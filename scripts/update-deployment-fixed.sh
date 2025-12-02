#!/bin/bash
set -e

echo "🚀 Updating Spot Buddy deployment..."

# Variables
REGION="us-east-1"
CLUSTER_NAME="SpotterCluster"
SERVICE_NAME="spotter-app"
TASK_FAMILY="spotter-app"

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

# Step 3: Tag and push image with unique tag
IMAGE_TAG="$(date +%Y%m%d-%H%M%S)"
echo "📤 Step 3: Pushing image to ECR with tag: $IMAGE_TAG..."
docker tag spotter-app:latest "$ECR_REPO:$IMAGE_TAG"
docker tag spotter-app:latest "$ECR_REPO:latest"
docker push "$ECR_REPO:$IMAGE_TAG" || { echo "❌ Failed to push tagged image"; exit 1; }
docker push "$ECR_REPO:latest" || { echo "❌ Failed to push latest"; exit 1; }
echo "✅ Image pushed to ECR successfully"

# Step 4: Get current task definition
echo "📝 Step 4: Getting current task definition..."
TASK_DEF_JSON=$(aws ecs describe-task-definition --task-definition $TASK_FAMILY --region $REGION)
echo "✅ Retrieved task definition"

# Step 5: Register new task definition with updated image
echo "🔄 Step 5: Registering new task definition..."

# Extract the task definition and update the image
NEW_TASK_DEF=$(echo $TASK_DEF_JSON | jq --arg IMAGE "$ECR_REPO:$IMAGE_TAG" '
  .taskDefinition |
  .containerDefinitions[0].image = $IMAGE |
  del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)
')

# Register the new task definition
NEW_TASK_DEF_ARN=$(echo $NEW_TASK_DEF | aws ecs register-task-definition --region $REGION --cli-input-json file:///dev/stdin | jq -r '.taskDefinition.taskDefinitionArn')

echo "✅ New task definition registered: $NEW_TASK_DEF_ARN"

# Step 6: Update service to use new task definition
echo "🚀 Step 6: Updating service to use new task definition..."
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --task-definition $NEW_TASK_DEF_ARN \
    --force-new-deployment \
    --region $REGION \
    --query "service.{ServiceName:serviceName,Status:status,TaskDef:taskDefinition,DesiredCount:desiredCount,RunningCount:runningCount}" \
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
