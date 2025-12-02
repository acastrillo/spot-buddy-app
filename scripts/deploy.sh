#!/bin/bash
set -e

echo "🚀 Starting Spotter App deployment to AWS..."

# Variables
REGION="us-east-1"
CLUSTER_NAME="spotter-cluster"
SERVICE_NAME="spotter-service"
TASK_FAMILY="spotter-app-task"

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$ACCOUNT_ID" ]; then
    echo "❌ Failed to get AWS Account ID"
    exit 1
fi
echo "✅ AWS Account ID: $ACCOUNT_ID"

ECR_REPO="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/spotter-app"

# Step 1: Create ECR repository
echo "📦 Step 1: Creating ECR repository..."
aws ecr create-repository --repository-name spotter-app --region $REGION 2>/dev/null || echo "ℹ️  ECR repository already exists"

# Step 2: Build Docker image
echo "🏗️  Step 2: Building Docker image..."
docker build -t spotter-app . || { echo "❌ Docker build failed"; exit 1; }
echo "✅ Docker image built successfully"

# Step 3: Login to ECR
echo "🔑 Step 3: Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REPO || { echo "❌ ECR login failed"; exit 1; }
echo "✅ Logged into ECR successfully"

# Step 4: Tag and push image
echo "📤 Step 4: Pushing image to ECR..."
docker tag spotter-app:latest "$ECR_REPO:latest"
docker push "$ECR_REPO:latest" || { echo "❌ Failed to push image"; exit 1; }
echo "✅ Image pushed to ECR successfully"

# Step 5: Check if cluster exists
echo "🎯 Step 5: Checking ECS cluster..."
aws ecs describe-clusters --clusters $CLUSTER_NAME --region $REGION --query "clusters[0].status" --output text 2>/dev/null | grep -q "ACTIVE" || {
    echo "Creating new cluster..."
    aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $REGION
}
echo "✅ ECS cluster ready"

# Step 6: Update task definition
echo "📝 Step 6: Registering task definition..."
# Read and update task definition
TASK_DEF=$(cat aws-task-definition.json | sed "s/YOUR_ACCOUNT_ID/$ACCOUNT_ID/g" | sed "s/us-east-1/$REGION/g")
echo "$TASK_DEF" > /tmp/task-def-updated.json
aws ecs register-task-definition --cli-input-json file:///tmp/task-def-updated.json --region $REGION || { echo "❌ Failed to register task definition"; exit 1; }
echo "✅ Task definition registered"

# Step 7: Update service (or create if doesn't exist)
echo "🚀 Step 7: Updating ECS service..."
SERVICE_EXISTS=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION --query "services[0].status" --output text 2>/dev/null)

if [ "$SERVICE_EXISTS" = "ACTIVE" ] || [ "$SERVICE_EXISTS" = "DRAINING" ]; then
    echo "Updating existing service..."
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service $SERVICE_NAME \
        --task-definition $TASK_FAMILY \
        --force-new-deployment \
        --region $REGION
    echo "✅ Service updated successfully"
else
    echo "⚠️  Service doesn't exist. Please run the full deploy-to-aws.ps1 script first to create infrastructure"
    exit 1
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Check deployment status:"
echo "aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION"
echo ""
echo "📝 View logs:"
echo "aws logs tail /ecs/spotter-app --follow --region $REGION"
