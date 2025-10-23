import sys
import boto3
sys.stdout.reconfigure(encoding="utf-8")
logs = boto3.client("logs")
stream='ecs/spotter-web/9154d9435f66415d82155c236031c111'
resp = logs.get_log_events(logGroupName='/ecs/spotter-app', logStreamName=stream, startTime=1760486400000, limit=200)
for event in resp['events']:
    print(event['timestamp'], event['message'])
