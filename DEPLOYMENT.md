### 📄 FILE 73: DEPLOYMENT.md
```markdown
# Deployment Guide

## Recommended: Render.com (Free tier available)

1. Create Render account
2. New → Web Service → Connect GitHub repo
3. Settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add all environment variables from `.env.example`
5. Deploy!

## Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
