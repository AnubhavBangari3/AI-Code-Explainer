// Load environment variables from .env file
import "dotenv/config";

// Import required libraries
import express from "express"; // Backend framework
import cors from "cors"; // Handle cross-origin requests
import rateLimit from "express-rate-limit"; // Prevent API abuse
import helmet from "helmet"; // Security middleware
import ollama from "ollama"; // Local LLM (AI model)

// Create Express app instance
const app = express();

/**
 * ---------------------------
 * SECURITY MIDDLEWARE
 * ---------------------------
 */

// Adds security headers (protects from common attacks like XSS, clickjacking)
app.use(helmet());

/**
 * ---------------------------
 * CORS CONFIGURATION
 * ---------------------------
 */

// Allow frontend (React app) to call backend API
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // Allowed frontend URL
    credentials: true, // Allow cookies/auth headers
  })
);

/**
 * ---------------------------
 * 🚦 RATE LIMITING
 * ---------------------------
 */

// Limit API requests to prevent abuse (100 requests per 15 mins per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max requests
  message: "Too many requests from this IP, please try again after some time",
});

// Apply rate limiter to all routes
app.use(limiter);

/**
 * ---------------------------
 * BODY PARSER
 * ---------------------------
 */

// Parse incoming JSON requests (limit size to 10MB)
app.use(express.json({ limit: "10mb" }));

/**
 * ---------------------------
 * AI CODE EXPLAIN API
 * ---------------------------
 */

// POST endpoint to explain code
app.post("/api/explaincode", async (req, res) => {
  try {
    // Extract code and language from request body
    const { code, language } = req.body;

    // Validate input
    if (!code || !code.trim()) {
      return res.status(400).json({ error: "Code is required" });
    }

    /**
     * Prompt Engineering
     * This prompt is sent to the AI model (Ollama)
     */
    const prompt = `
You are an expert code explainer.

Explain the following ${language || "code"} in very simple terms.

Return your answer in this format:
1. What this code does
2. Step-by-step explanation
3. Important concepts used
4. Possible issues or improvements

Code:
${code}
`;

    /**
     * Call Ollama AI Model
     */
    const response = await ollama.chat({
      model: process.env.OLLAMA_MODEL || "codellama:7b", // Use env model or default
      messages: [
        {
          role: "user",
          content: prompt, // Send prompt to model
        },
      ],
    });

    /**
     * ✅ Send success response to frontend
     */
    return res.status(200).json({
      success: true,
      explanation: response.message.content, // AI-generated explanation
    });
  } catch (err) {
    /**
     * Error Handling
     */
    console.error("API Error:", err);

    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
});

/**
 * ---------------------------
 * SERVER START
 * ---------------------------
 */

// Set port from env or default 5000
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});