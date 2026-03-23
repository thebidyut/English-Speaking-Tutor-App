# 🚀 Quick Start Guide

## How to Open This HTML App

This is **NOT** a simple HTML file you can just double-click. It's a **React web application** that needs to be run through a development server.

### Step-by-Step Instructions:

#### 1️⃣ Install Node.js
If you don't have Node.js installed:
- Go to https://nodejs.org/
- Download and install the LTS version
- Verify installation: Open terminal/command prompt and type `node --version`

#### 2️⃣ Open Terminal/Command Prompt
- **Windows**: Press `Win + R`, type `cmd`, press Enter
- **Mac**: Press `Cmd + Space`, type `terminal`, press Enter
- **Linux**: Press `Ctrl + Alt + T`

#### 3️⃣ Navigate to Project Folder
```bash
cd path/to/English-Speaking-Tutor-App
```

#### 4️⃣ Install Dependencies (First Time Only)
```bash
npm install
```
Wait for this to complete (may take 1-2 minutes)

#### 5️⃣ Create API Key File (First Time Only)
1. Create a new file called `.env.local` in the project folder
2. Add this line:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
3. Get your free API key from: https://makersuite.google.com/app/apikey

#### 6️⃣ Start the App
```bash
npm run dev
```

#### 7️⃣ Open in Browser
- The terminal will show a URL like: `http://localhost:5173`
- Open this URL in your web browser
- The app should now be running! 🎉

---

## 💡 Summary

**You CANNOT just open `index.html` in a browser!**

Instead, run these 3 commands:
```bash
npm install          # First time only
npm run dev          # Every time you want to use the app
```

Then open the URL shown in your terminal (usually http://localhost:5173)

---

## ❓ Common Questions

**Q: Why can't I just click on index.html?**
A: This is a modern React application that uses TypeScript and needs to be compiled/bundled before it runs.

**Q: Do I need internet?**
A: Yes, for two reasons:
   1. To download dependencies (first time)
   2. To use the Gemini AI features while using the app

**Q: Is this free?**
A: Yes! The Gemini API has a free tier with generous limits.

**Q: What if I get errors?**
A: Check the Troubleshooting section in README.md

---

## 🆘 Need Help?

1. Make sure Node.js is installed: `node --version`
2. Make sure you're in the right folder: `ls` (should show package.json)
3. Try deleting `node_modules` and running `npm install` again
4. Check that your `.env.local` file has the correct API key
