
# Instagram Caption Fetcher with Instaloader

This directory contains Python scripts for fetching Instagram post data using the Instaloader library.

## Setup

### Install Dependencies
```bash
cd /home/ubuntu/spotter/python_scripts
pip3 install -r requirements.txt
```

### Dependencies
- `instaloader==4.13.1` - Instagram scraper library
- `requests==2.31.0` - HTTP library for additional requests

## Usage

### Command Line
```bash
python3 instagram_fetcher.py "https://www.instagram.com/p/ABC123xyz/"
```

### API Integration
The `instagram_fetcher.py` script is called by the Next.js API at `/api/fetch-caption` via Node.js child process.

## Features

### Supported Data Extraction
- **Caption text** - Full post caption content
- **Hashtags** - All hashtags in the post
- **Mentions** - All @mentions in the post
- **Metadata** - Date, likes, post type (image/video)
- **Location** - Location data if available
- **Owner info** - Username of post owner

### Error Handling
- **Rate limiting** - Handles Instagram's rate limits gracefully
- **Private posts** - Detects and reports login-required posts
- **Invalid URLs** - Validates Instagram URL format
- **Connection issues** - Handles network and server errors

### URL Format Support
- `https://www.instagram.com/p/ABC123xyz/`
- `https://instagram.com/p/ABC123xyz/`
- `https://www.instagram.com/reel/ABC123xyz/`
- URLs with query parameters (utm_source, etc.)

## Response Format

### Success Response
```json
{
  "success": true,
  "caption": "Post caption text here...",
  "hashtags": ["workout", "fitness", "gym"],
  "mentions": ["username1", "username2"],
  "date": "2025-08-15T10:30:00",
  "likes": 1250,
  "is_video": false,
  "typename": "GraphImage",
  "url": "https://www.instagram.com/p/ABC123xyz/",
  "owner_username": "fitness_account",
  "shortcode": "ABC123xyz",
  "location": {
    "name": "Gym Name",
    "id": "123456789"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Post not found or is private",
  "error_type": "post_unavailable"
}
```

### Error Types
- `invalid_url` - Malformed Instagram URL
- `post_unavailable` - Post not found or private
- `rate_limited` - Instagram rate limiting
- `login_required` - Private account, login needed
- `connection_error` - Network or server issues
- `unknown_error` - Unexpected errors

## Integration with Next.js

The Python script is integrated with the Next.js API route at `/app/api/fetch-caption/route.ts`:

1. **API receives** Instagram URL from frontend
2. **Validates** URL format and Instagram domain
3. **Spawns** Python process with URL parameter
4. **Receives** JSON response from Python script
5. **Returns** formatted data to frontend

### Process Flow
```
Frontend → Next.js API → Python Script → Instaloader → Instagram → Response Chain
```

## Advantages over Basic HTTP Scraping

1. **Better reliability** - Instaloader handles Instagram's anti-bot measures
2. **Rich metadata** - Extracts comprehensive post information
3. **Error handling** - Specific error types for better user experience
4. **Active maintenance** - Instaloader is actively maintained for Instagram changes
5. **Structured data** - Clean JSON output with consistent format

## Rate Limiting & Best Practices

- **Timeout handling** - 30-second timeout for API calls
- **Connection limits** - Single connection attempt to avoid hammering
- **User agent** - Custom user agent for identification
- **Graceful failures** - Always provides fallback to manual input

## Troubleshooting

### Common Issues

**Import Error**
```bash
# Make sure Python dependencies are installed
pip3 install -r requirements.txt
```

**Permission Denied**
```bash
# Make script executable
chmod +x instagram_fetcher.py
```

**Rate Limiting**
- Instagram may rate limit requests
- Use manual caption copying as fallback
- Wait several minutes between requests

**Private Posts**
- Private accounts require Instagram login
- Public posts should work without authentication
- Some posts may require user to be logged in
