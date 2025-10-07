import json
import subprocess
import sys
from datetime import datetime

# Configuration
REGION = "us-east-1"
TASK_FAMILY = "spotter-app"
CLUSTER_NAME = "SpotterCluster"
SERVICE_NAME = "spotter-app"

# Get account ID
account_id = subprocess.check_output(['aws', 'sts', 'get-caller-identity', '--query', 'Account', '--output', 'text']).decode().strip()
ECR_REPO = f"{account_id}.dkr.ecr.{REGION}.amazonaws.com/spotter-app"
IMAGE_TAG = datetime.now().strftime("%Y%m%d-%H%M%S")
NEW_IMAGE = f"{ECR_REPO}:{IMAGE_TAG}"

print(f"[1/5] Getting current task definition for {TASK_FAMILY}...")

# Get current task definition
task_def_json = subprocess.check_output([
    'aws', 'ecs', 'describe-task-definition',
    '--task-definition', TASK_FAMILY,
    '--region', REGION
], text=True)

task_def = json.loads(task_def_json)['taskDefinition']

print(f"[2/5] Creating new task definition with image: {NEW_IMAGE}")

# Update image
task_def['containerDefinitions'][0]['image'] = NEW_IMAGE

# Remove fields that can't be in registration
for field in ['taskDefinitionArn', 'revision', 'status', 'requiresAttributes', 'compatibilities', 'registeredAt', 'registeredBy']:
    task_def.pop(field, None)

# Register new task definition
print(f"[3/5] Registering new task definition...")
register_output = subprocess.check_output([
    'aws', 'ecs', 'register-task-definition',
    '--region', REGION,
    '--cli-input-json', json.dumps(task_def)
], text=True)

new_task_def_arn = json.loads(register_output)['taskDefinition']['taskDefinitionArn']
print(f"[4/5] New task definition registered: {new_task_def_arn}")

# Update service
print(f"[5/5] Updating service to use new task definition...")
subprocess.run([
    'aws', 'ecs', 'update-service',
    '--cluster', CLUSTER_NAME,
    '--service', SERVICE_NAME,
    '--task-definition', new_task_def_arn,
    '--force-new-deployment',
    '--region', REGION
], check=True)

print(f"SUCCESS: Deployment initiated!")
print(f"New image: {NEW_IMAGE}")
print(f"New task definition: {new_task_def_arn}")
