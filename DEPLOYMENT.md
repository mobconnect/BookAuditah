# Deployment recommendations

BookAuditah uses a Vite frontend and an Express server build.

## Recommended option

Deploy the full application to **Render** for a straightforward Node service:

```bash
npm run build
npm start
```

Use **Google Cloud Run** when autoscaling and managed secrets are preferred. **Railway** and **Fly.io** are suitable alternatives. Keep Gemini and Firebase credentials server-side and use durable storage for user documents.
