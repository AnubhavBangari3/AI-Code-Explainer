import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import ollama from "ollama";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after some time",
});

app.use(limiter);
app.use(express.json({ limit: "10mb" }));

app.post("/api/explaincode", async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: "Code is required" });
    }

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

    const response = await ollama.chat({
      model: process.env.OLLAMA_MODEL || "codellama:7b",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return res.status(200).json({
      success: true,
      explanation: response.message.content,
    });
  } catch (err) {
    console.error("API Error:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

