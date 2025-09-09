# 🚀 Quick Start - Deploy Spotter App to AWS

## Prerequisites (5 minutes)
1. **AWS Account** - Sign up at aws.amazon.com
2. **Install AWS CLI** - `winget install Amazon.AWSCLI`
3. **Install Docker Desktop** - Download from docker.com
4. **OpenAI API Key** - Get from platform.openai.com

## Configure AWS CLI (2 minutes)
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
# Default output format: json
```

## Deploy with One Command (5-10 minutes)
```powershell
# Open PowerShell in your project folder and run:
.\deploy-to-aws.ps1 -OpenAIKey "sk-your-openai-key-here"
```

## That's it! 🎉
The script will output your public URL when done:
```
🌐 Your Spotter app is available at: http://spotter-alb-123456789.us-east-1.elb.amazonaws.com
```

---

## What the Script Does
✅ Creates container registry  
✅ Builds & uploads your app  
✅ Sets up load balancer  
✅ Configures security  
✅ Deploys to AWS  
✅ Gives you the URL  

**Total time: ~10-15 minutes**  
**Monthly cost: ~$30-50**

## Need Help?
- Check `AWS_DEPLOYMENT_GUIDE.md` for detailed instructions
- View `PRODUCTION.md` for deployment options
- Run `aws ecs describe-services --cluster spotter-cluster --services spotter-service` to check status