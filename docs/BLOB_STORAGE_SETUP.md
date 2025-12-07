# Vercel Blob Storage Setup Guide

This guide explains how to set up Vercel Blob storage for file uploads in the Daily Pulse AI Chatbot.

## 🚨 Error: "Vercel Blob: No token found"

If you encounter the following error when uploading files:

```
Blob storage upload failed: {
  fileName: 'your-file.pdf',
  fileType: 'application/pdf',
  fileSize: 123456,
  error: 'Vercel Blob: No token found. Either configure the `BLOB_READ_WRITE_TOKEN` environment variable, or pass a `token` option to your calls.'
}
```

This means the Vercel Blob storage token is not properly configured.

## 🔑 Solution: Set up BLOB_READ_WRITE_TOKEN

### For Local Development

1. **Create a Vercel account** (if you don't have one): [https://vercel.com/signup](https://vercel.com/signup)

2. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

3. **Log in to Vercel**:
   ```bash
   vercel login
   ```

4. **Create a new Vercel project** (if you haven't already):
   ```bash
   vercel
   ```

5. **Generate a Blob token**:
   - Go to your Vercel project dashboard
   - Navigate to "Storage" → "Blob"
   - Click "Create Token"
   - Copy the generated token

6. **Add the token to your environment variables**:
   - Open `.env.local` file
   - Add or update the following line:
     ```env
     BLOB_READ_WRITE_TOKEN=your_generated_token_here
     ```

### For Vercel Deployments

1. Go to your Vercel project dashboard
2. Navigate to "Settings" → "Environment Variables"
3. Add a new environment variable:
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: Your generated Blob token
4. Redeploy your project

## 📝 Alternative: Use Vercel Blob without token (for testing)

For local testing without a token, you can modify the upload route to use a different storage solution or mock the blob upload. However, this is not recommended for production.

## 🔧 Verification

After setting up the token:

1. Restart your development server:
   ```bash
   pnpm dev
   ```

2. Try uploading a file again - the error should be resolved

## 📚 Official Documentation

For more information about Vercel Blob storage:
- [Vercel Blob Documentation](https://vercel.com/docs/vercel-blob)
- [Vercel Blob Quickstart](https://vercel.com/docs/vercel-blob/quickstart)

## 🛠 Troubleshooting

If you still encounter issues:
- Ensure the token is correctly formatted (no extra spaces)
- Verify the token has read/write permissions
- Check that your Vercel project has Blob storage enabled
- Restart your development server after making changes