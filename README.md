# 🚀 AI Code Explainer

An AI-powered developer tool that helps you **understand, debug, and compare code using multiple LLMs in real-time**.

---

## 📌 Overview

AI Code Explainer is a full-stack application that leverages **local AI models (via Ollama)** to:

* 📖 Explain code in simple terms
* 🐞 Detect bugs and fix them automatically
* ⚡ Compare multiple AI models side-by-side

It is designed to showcase **real-world AI system design + frontend engineering + backend streaming architecture**.

---

## ✨ Features

### 🧠 Code Explanation Mode

* Converts complex code into beginner-friendly explanations
* Structured output:

  * Language check
  * What the code does
  * Step-by-step breakdown
  * Concepts used
  * Improvements

---

### 🐞 Bug Detection Mode (Debug Engine)

* Detects:

  * Syntax errors
  * Logical issues
  * Code smells

* Returns:

  * Bug list
  * Severity (Critical / Warning / Suggestion)
  * Fixed code

* Includes fallback fixer if model fails

---

### ⚡ Multi-Model Comparison Dashboard

Compare multiple AI models in **real-time streaming**:

* CodeLlama
* DeepSeek Coder
* Mistral

#### Shows:

* Response streaming
* First token latency
* Total response time
* Output length
* Bug detection capability
* Final score (out of 100)

🏆 Automatically selects the **best model**

---

### 🧩 Smart Language Detection

* Automatically detects programming language
* Supports:

  * Python
  * JavaScript
  * Java
  * C++
  * TypeScript

---

### 🎨 Developer-Friendly UI

* Dark / Light mode
* Syntax highlighting
* Real-time streaming output
* Clean comparison dashboard

---

## 🏗️ Architecture

```
Frontend (React)
      ↓
Backend API (Node.js + Express)
      ↓
LLM Layer (Ollama - Local Models)
      ↓
Streaming Response → UI
```

---

## ⚙️ Tech Stack

### Frontend

* React (Hooks, Memoization)
* Prism Syntax Highlighter

### Backend

* Node.js
* Express
* Ollama

### AI Models

* DeepSeek Coder
* CodeLlama
* Mistral

---

## 🔥 Advanced Concepts Used

* Real-time streaming (ReadableStream API)
* Parallel model execution (Promise.allSettled)
* Prompt engineering
* Response scoring system
* Fallback error handling
* Rate limiting + security middleware

---

## 📂 Project Structure

```
├── server.js        # Backend API (Express + Ollama)
├── package.json     # Dependencies
├── App.jsx          # Frontend UI
├── App.css          # Styling
```

---

## 🚀 Getting Started

### 1️⃣ Install Ollama

Download and install:
👉 https://ollama.com

Pull required models:

```
ollama pull deepseek-coder
ollama pull codellama:7b
ollama pull mistral
```

---

### 2️⃣ Clone the Repository

```
git clone <your-repo-url>
cd ai-code-explainer
```

---

### 3️⃣ Backend Setup

```
npm install
npm run dev
```

---

### 4️⃣ Frontend Setup

If using Vite/React:

```
npm install
npm run dev
```

---

### 5️⃣ Environment Variables

Create `.env` file:

```
PORT=5000
OLLAMA_MODEL=deepseek-coder
FRONTEND_URL=http://localhost:5173
```

---

## 🧪 Usage

1. Paste your code
2. Select:

   * Mode (Explain / Debug)
   * Language
   * Model
3. Click:

   * **Explain Code**
   * OR **Detect Bugs & Fix**
   * OR **Multi Model Comparison**

---

## 📊 Example Output

### Debug Mode

```
BUGS_FOUND:
- Syntax error in function definition

SEVERITY:
- Critical: Invalid syntax

FIXED_CODE_START
def add(a, b):
    return a + b
FIXED_CODE_END
```

---

## 💡 Why This Project is Powerful

* Combines **AI + system design + frontend UX**
* Demonstrates **production-grade architecture**
* Shows **ML system thinking without heavy ML training**
* Unique **multi-model benchmarking system**

---

## 🎯 Future Improvements

* Add more models (Llama 3, Gemma)
* Add code execution sandbox
* Add code complexity analysis
* Add GitHub repo integration
* Add history & saved sessions

---

## 🧑‍💻 Author

**Anubhav Bangari**

* Full Stack Developer | AI Enthusiast
* Built with ❤️ using React, Node.js, and AI

---

## ⭐ One-Line Pitch

> AI-powered platform that explains, debugs, and compares multiple LLMs in real-time using streaming APIs and a scoring engine.

---

