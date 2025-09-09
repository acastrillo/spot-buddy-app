# Spotter App - Complete AWS Deployment Guide

## 🎯 **Overview**
This guide will deploy your Spotter app to AWS using ECS (Elastic Container Service) with Fargate for serverless container hosting.

## 📋 **Prerequisites**
- AWS Account with admin access
- AWS CLI installed
- Docker Desktop installed
- Domain name (optional but recommended)

---

## **STEP 1: Install and Configure AWS CLI**

### 1.1 Install AWS CLI
```bash
# Windows (if not already installed)
winget install Amazon.AWSCLI

# Verify installation
aws --version
```

### 1.2 Configure AWS CLI
```bash
# Configure with your AWS credentials
aws configure

# Enter when prompted:
# - AWS Access Key ID: [Your access key]
# - AWS Secret Access Key: [Your secret key]  
# - Default region name: us-east-1 (or your preferred region)
# - Default output format: json
```

**🔑 Getting AWS Credentials:**
1. Go to AWS Console → IAM → Users → Your User → Security Credentials
2. Create Access Key → Command Line Interface (CLI)
3. Copy the Access Key ID and Secret Access Key

---

## **STEP 2: Create AWS Infrastructure**

### 2.1 Create ECR Repository (Container Registry)
```bash
# Create ECR repository to store your Docker image
aws ecr create-repository --repository-name spotter-app --region us-east-1

# Expected output will include repositoryUri - SAVE THIS!
# Example: 123456789012.dkr.ecr.us-east-1.amazonaws.com/spotter-app
```

### 2.2 Create ECS Cluster
```bash
# Create ECS cluster for running containers
aws ecs create-cluster --cluster-name spotter-cluster --region us-east-1
```

### 2.3 Create VPC and Networking (if you don't have default VPC)
```bash
# Check if you have a default VPC
aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --region us-east-1

# If no default VPC, create one (most AWS accounts have this already)
# Skip this if you see a VPC in the output above
```

---

## **STEP 3: Build and Push Docker Image**

### 3.1 Build Docker Image Locally
```bash
# Navigate to your project directory
cd "C:\dev\spotter_app\spotter-fresh"

# Build the Docker image
docker build -t spotter-app .
```

### 3.2 Test Docker Image Locally (Optional)
```bash
# Test locally first
docker run -p 3000:3000 -e OPENAI_API_KEY=your_openai_key_here spotter-app

# Visit http://localhost:3000 to verify it works
# Press Ctrl+C to stop
```

### 3.3 Push to ECR
```bash
# Get login token for ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Tag your image (replace with your actual ECR URI from Step 2.1)
docker tag spotter-app:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

# Push to ECR
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
```

---

## **STEP 4: Create ECS Task Definition**

### 4.1 Create Task Definition JSON File
I've created the task definition file (`aws-task-definition.json`) for you.

---

## **STEP 4: AUTOMATED DEPLOYMENT (EASIEST METHOD)**

### 4.1 One-Click Deployment Script
I've created a PowerShell script that automates the entire deployment process!

```powershell
# Run this command from PowerShell in your project directory:
.\deploy-to-aws.ps1 -OpenAIKey "your_openai_api_key_here"

# Optional: specify different region
.\deploy-to-aws.ps1 -OpenAIKey "your_openai_api_key_here" -Region "us-west-2"
```

**What the script does:**
✅ Creates ECR repository  
✅ Builds and pushes Docker image  
✅ Stores OpenAI API key securely in AWS Systems Manager  
✅ Creates IAM roles and policies  
✅ Sets up ECS cluster  
✅ Creates Application Load Balancer  
✅ Configures security groups  
✅ Deploys your application  
✅ Provides your public URL  

**Expected Output:**
```
🎉 Deployment completed successfully!
🌐 Your Spotter app is available at: http://spotter-alb-123456789.us-east-1.elb.amazonaws.com
```

---

## **STEP 5: MANUAL DEPLOYMENT (Advanced Users)**

If you prefer to do each step manually, continue with the sections below:

### 5.1 Store OpenAI API Key Securely
```bash
# Store your OpenAI API key in AWS Systems Manager
aws ssm put-parameter \
  --name "/spotter-app/openai-api-key" \
  --value "your_openai_api_key_here" \
  --type "SecureString" \
  --region us-east-1
```

### 5.2 Create IAM Roles
```bash
# Create ECS task execution role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ecs-tasks.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# Attach required policies
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Add policy for accessing Systems Manager parameters
aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name SsmParameterAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ],
        "Resource": "arn:aws:ssm:us-east-1:YOUR_ACCOUNT_ID:parameter/spotter-app/*"
      }
    ]
  }'
```

### 5.3 Update Task Definition
```bash
# Get your AWS account ID
aws sts get-caller-identity --query Account --output text

# Update aws-task-definition.json:
# Replace "YOUR_ACCOUNT_ID" with your actual AWS account ID
```

### 5.4 Create CloudWatch Log Group
```bash
aws logs create-log-group --log-group-name "/ecs/spotter-app" --region us-east-1
```

### 5.5 Register Task Definition
```bash
aws ecs register-task-definition \
  --cli-input-json file://aws-task-definition.json \
  --region us-east-1
```

### 5.6 Set Up Load Balancer and Security Groups
```bash
# Get default VPC ID
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text --region us-east-1)

# Get subnet IDs
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[*].SubnetId" --output text --region us-east-1)

# Create security group for ALB
ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name spotter-alb-sg \
  --description "Security group for Spotter ALB" \
  --vpc-id $VPC_ID \
  --query "GroupId" --output text --region us-east-1)

# Allow HTTP traffic to ALB
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region us-east-1

# Create security group for ECS tasks
ECS_SG_ID=$(aws ec2 create-security-group \
  --group-name spotter-ecs-sg \
  --description "Security group for Spotter ECS tasks" \
  --vpc-id $VPC_ID \
  --query "GroupId" --output text --region us-east-1)

# Allow traffic from ALB to ECS tasks
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 3000 \
  --source-group $ALB_SG_ID \
  --region us-east-1

# Create Application Load Balancer
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name spotter-alb \
  --subnets $SUBNET_IDS \
  --security-groups $ALB_SG_ID \
  --query "LoadBalancers[0].LoadBalancerArn" --output text --region us-east-1)

# Create target group
TG_ARN=$(aws elbv2 create-target-group \
  --name spotter-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path "/" \
  --query "TargetGroups[0].TargetGroupArn" --output text --region us-east-1)

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region us-east-1
```

### 5.7 Create ECS Service
```bash
aws ecs create-service \
  --cluster spotter-cluster \
  --service-name spotter-service \
  --task-definition spotter-app-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=$TG_ARN,containerName=spotter-app,containerPort=3000 \
  --region us-east-1
```

### 5.8 Get Your Application URL
```bash
# Get the ALB DNS name
aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query "LoadBalancers[0].DNSName" \
  --output text \
  --region us-east-1
```

---

## **STEP 6: Verify Deployment**

### 6.1 Check Service Status
```bash
aws ecs describe-services \
  --cluster spotter-cluster \
  --services spotter-service \
  --region us-east-1
```

### 6.2 Check Task Logs
```bash
aws logs describe-log-streams \
  --log-group-name "/ecs/spotter-app" \
  --region us-east-1

# Get logs (replace LOG_STREAM_NAME with actual stream name)
aws logs get-log-events \
  --log-group-name "/ecs/spotter-app" \
  --log-stream-name "LOG_STREAM_NAME" \
  --region us-east-1
```

---

## **STEP 7: Custom Domain Setup (Optional)**

### 7.1 Route 53 Domain Setup
```bash
# Create hosted zone for your domain
aws route53 create-hosted-zone \
  --name yourdomain.com \
  --caller-reference $(date +%s)

# Create record set pointing to your ALB
# (Use AWS Console for easier setup)
```

### 7.2 SSL Certificate with AWS Certificate Manager
```bash
# Request SSL certificate
aws acm request-certificate \
  --domain-name yourdomain.com \
  --domain-name www.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

---

## **STEP 8: Monitoring and Scaling**

### 8.1 Set Up CloudWatch Alarms
```bash
# CPU utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "spotter-high-cpu" \
  --alarm-description "High CPU utilization" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=spotter-service Name=ClusterName,Value=spotter-cluster \
  --evaluation-periods 2
```

### 8.2 Auto Scaling Setup
```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/spotter-cluster/spotter-service \
  --min-capacity 1 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/spotter-cluster/spotter-service \
  --policy-name spotter-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    }
  }'
```

---

## **🎯 RECOMMENDED: Use the Automated Script**

**For fastest deployment, use the PowerShell script:**

```powershell
.\deploy-to-aws.ps1 -OpenAIKey "your_openai_api_key_here"
```

This will handle all the complexity and give you a working deployment in ~5-10 minutes!

---

## **📞 Troubleshooting**

### Common Issues:

**1. "Repository does not exist"**
- Solution: Run the ECR creation command first

**2. "Task failed to start"**
- Check CloudWatch logs for error messages
- Verify OpenAI API key is correctly stored

**3. "Service unhealthy"**
- Check security group settings
- Verify container is listening on port 3000

**4. "Cannot connect to Docker daemon"**
- Start Docker Desktop
- Make sure Docker is running

### Get Help:
```bash
# Check service status
aws ecs describe-services --cluster spotter-cluster --services spotter-service

# View logs
aws logs tail /ecs/spotter-app --follow
```

---

## **💰 Cost Estimate**
- **ALB**: ~$16/month
- **ECS Fargate**: ~$15-30/month (depending on usage)
- **Data transfer**: ~$1-5/month
- **Total**: ~$32-51/month

**Cost optimization:**
- Use t4g.small EC2 instances instead of Fargate for lower costs
- Set up auto-scaling to reduce costs during low usage