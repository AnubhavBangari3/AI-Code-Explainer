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

function trySimplePythonFix(code) {
  let fixed = code;

  // Fix: def func(a,b);  -> def func(a,b):
  fixed = fixed.replace(
    /^(\s*def\s+\w+\s*\([^)]*\))\s*;\s*$/gm,
    "$1:"
  );

  // Trim weird trailing semicolon on python control/function lines
  fixed = fixed.replace(
    /^(\s*(def|if|elif|else|for|while|class|try|except|finally)\b[^\n]*)\s*;\s*$/gm,
    "$1:"
  );

  return fixed;
}

function extractFixedCode(text) {
  const markerMatch = text.match(/FIXED_CODE_START\s*([\s\S]*?)\s*FIXED_CODE_END/i);
  if (markerMatch?.[1]?.trim()) {
    return markerMatch[1].trim();
  }

  // fallback: extract from code fence
  const fenceMatch = text.match(/```[a-zA-Z]*\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]?.trim()) {
    return fenceMatch[1].trim();
  }

  return "";
}

app.post("/api/explaincode", async (req, res) => {
  try {
    const { code, language, mode } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: "Code is required" });
    }

    const selectedMode = mode || "explain";

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    // -------- DEBUG MODE --------
    if (selectedMode === "debug") {
      const systemPrompt = `
You are a strict code debugger.
Do NOT explain code like a teacher.
Do NOT give general summaries.
You MUST debug the code.

Your response MUST follow exactly this format:

LANGUAGE_CHECK:
<one short sentence>

BUGS_FOUND:
- <bug 1>
- <bug 2>

SEVERITY:
- Critical: <items>
- Warning: <items>
- Suggestion: <items>

EXPLANATION_OF_FIX:
<short explanation>

FIXED_CODE_START
<only corrected code here, no markdown backticks>
FIXED_CODE_END

Rules:
- Always include FIXED_CODE_START and FIXED_CODE_END
- If code is already valid, return original code inside the markers
- Focus on syntax and obvious logical issues
- Never omit the corrected code
`;

      const userPrompt = `
Language selected by user: ${language || "unknown"}

Debug this code and return the result in the exact required format.

Code:
${code}
`;

      let fullResponse = "";

      try {
        const stream = await ollama.chat({
          model: process.env.OLLAMA_MODEL || "codellama:7b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk?.message?.content || "";
          if (content) {
            fullResponse += content;
            res.write(content);
          }
        }
      } catch (modelErr) {
        console.error("Ollama debug mode error:", modelErr);
      }

      // If model failed to return fixed code, write a fallback section
      const fixedFromModel = extractFixedCode(fullResponse);

      if (!fixedFromModel) {
        const fallbackFixed =
          language === "python" || /def\s+\w+\s*\(/.test(code)
            ? trySimplePythonFix(code)
            : code;

        const fallbackText = `

LANGUAGE_CHECK:
The code appears to be ${language || "the selected language"}.

BUGS_FOUND:
- The model did not return a structured debug response.
- Applied a fallback correction for common syntax issues where possible.

SEVERITY:
- Critical: Possible syntax issue
- Warning: Model output format not followed
- Suggestion: Use a stronger coding model for better fixes

EXPLANATION_OF_FIX:
A local fallback fixer was used because the model response did not include corrected code markers.

FIXED_CODE_START
${fallbackFixed}
FIXED_CODE_END
`;
        res.write(fallbackText);
      }

      return res.end();
    }

    // -------- EXPLAIN MODE --------
    const explainSystemPrompt = `
You are an expert beginner-friendly code explainer.
Explain clearly and simply.
`;

    const explainUserPrompt = `
The user selected this language: ${language || "unknown"}.
First verify whether the code matches that language.

Return the answer in this format:

1. Language Check
2. What this code does
3. Step-by-step explanation
4. Important concepts used
5. Possible issues or improvements

Code:
${code}
`;

    const stream = await ollama.chat({
      model: process.env.OLLAMA_MODEL || "codellama:7b",
      messages: [
        { role: "system", content: explainSystemPrompt },
        { role: "user", content: explainUserPrompt },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk?.message?.content || "";
      if (content) {
        res.write(content);
      }
    }

    res.end();
  } catch (err) {
    console.error("Streaming API Error:", err);

    if (res.headersSent) {
      res.write("\n\nError: Server error while streaming response.");
      return res.end();
    }

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