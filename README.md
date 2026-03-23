<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Bangla English Tutor AI

An interactive English learning application for Bengali speakers.

View your app in AI Studio: https://ai.studio/apps/drive/1O3PVGiZaKHfmChx-PmSzVr5TSZvVlXTj

## 🚀 How to Open and Run This App

### Prerequisites
- **Node.js** (version 16 or higher) - [Download here](https://nodejs.org/)
- A modern web browser (Chrome, Firefox, Edge, or Safari)

### Method 1: Run with Development Server (Recommended)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up your API key:**
   - Create a file named `.env.local` in the project root
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```
   - Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in your browser:**
   - The app will automatically open, or
   - Navigate to the URL shown in the terminal (usually `http://localhost:5173`)

### Method 2: Build and Preview

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the app:**
   ```bash
   npm run build
   ```

3. **Preview the built app:**
   ```bash
   npm run preview
   ```

4. **Open the URL shown in terminal** (usually `http://localhost:4173`)

### ⚠️ Important Notes

- **Cannot open `index.html` directly**: This is a React application that requires a build process. Simply opening `index.html` in your browser won't work.
- **Need Node.js**: Make sure Node.js is installed before running the commands above
- **Internet required**: The app needs internet connection for:
  - Loading external dependencies (React, Tailwind CSS)
  - Gemini AI API calls for interactive features

## 📁 Project Structure

```
├── index.html          # Entry HTML file
├── App.tsx             # Main application component
├── index.tsx           # Application entry point
├── components/         # React components
├── lib/               # Utility functions
└── package.json       # Project dependencies
```

## 🛠️ Troubleshooting

**Problem: Command not found**
- Make sure Node.js and npm are installed: `node --version` and `npm --version`

**Problem: Port already in use**
- The dev server will automatically use the next available port
- Or stop other applications using the same port

**Problem: Dependencies not found**
- Run `npm install` again
- Delete `node_modules` folder and `package-lock.json`, then run `npm install`

## 🌐 Deployment

To deploy this app, build it first (`npm run build`) then deploy the `dist` folder to any static hosting service like Netlify, Vercel, or GitHub Pages.
