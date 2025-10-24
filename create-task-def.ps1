$json = Get-Content task-def-full.json | ConvertFrom-Json
$newTaskDef = @{
    family = $json.family
    taskRoleArn = $json.taskRoleArn
    executionRoleArn = $json.executionRoleArn
    networkMode = $json.networkMode
    containerDefinitions = $json.containerDefinitions
    requiresCompatibilities = $json.requiresCompatibilities
    cpu = $json.cpu
    memory = $json.memory
}
$newTaskDef | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 task-def-new.json
Write-Host "New task definition created"
