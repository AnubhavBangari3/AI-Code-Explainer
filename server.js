import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import ollama from "ollama";

const app = express();

const ALLOWED_MODELS = [
  "codellama:7b",
  "deepseek-coder",
  "llama3",
  "mistral",
  "gemma",
];

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

  fixed = fixed.replace(
    /^(\s*def\s+\w+\s*\([^)]*\))\s*;\s*$/gm,
    "$1:"
  );

  fixed = fixed.replace(
    /^(\s*(def|if|elif|else|for|while|class|try|except|finally)\b[^\n]*)\s*;\s*$/gm,
    "$1:"
  );

  return fixed;
}

function extractFixedCode(text) {
  const markerMatch = text.match(
    /FIXED_CODE_START\s*([\s\S]*?)\s*FIXED_CODE_END/i
  );
  if (markerMatch?.[1]?.trim()) {
    return markerMatch[1].trim();
  }

  const fenceMatch = text.match(/```[a-zA-Z]*\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]?.trim()) {
    return fenceMatch[1].trim();
  }

  return "";
}

function sanitizeModel(requestedModel) {
  if (requestedModel && ALLOWED_MODELS.includes(requestedModel)) {
    return requestedModel;
  }

  return process.env.OLLAMA_MODEL || "deepseek-coder";
}

function getExplainPrompts(language, selectedModel, code) {
  const explainSystemPrompt = `
You are an expert beginner-friendly code explainer.

Rules:
- Be clear, structured, and practical
- Explain in simple language
- Do not skip important logic
- Mention possible improvements if relevant
- Keep formatting clean
`;

  const explainUserPrompt = `
The user selected this language: ${language || "unknown"}.
The user selected this model: ${selectedModel}.
First verify whether the code matches that language.

Return the answer in this exact format:

1. Language Check
2. What this code does
3. Step-by-step explanation
4. Important concepts used
5. Possible issues or improvements

Code:
${code}
`;

  return { explainSystemPrompt, explainUserPrompt };
}

function getDebugPrompts(language, selectedModel, code) {
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
Model selected by user: ${selectedModel}

Debug this code and return the result in the exact required format.

Code:
${code}
`;

  return { systemPrompt, userPrompt };
}

app.get("/api/models", (req, res) => {
  return res.status(200).json({
    success: true,
    models: ALLOWED_MODELS,
    defaultModel: process.env.OLLAMA_MODEL || "deepseek-coder",
  });
});

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Server is running",
    models: ALLOWED_MODELS,
  });
});

app.post("/api/explaincode", async (req, res) => {
  try {
    const { code, language, mode, model } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: "Code is required" });
    }

    const selectedMode = mode || "explain";
    const selectedModel = sanitizeModel(model);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Selected-Model", selectedModel);
    res.flushHeaders?.();

    if (selectedMode === "debug") {
      const { systemPrompt, userPrompt } = getDebugPrompts(
        language,
        selectedModel,
        code
      );

      let fullResponse = "";

      try {
        const stream = await ollama.chat({
          model: selectedModel,
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
- Suggestion: Try DeepSeek Coder or CodeLlama for stronger coding output

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

    const { explainSystemPrompt, explainUserPrompt } = getExplainPrompts(
      language,
      selectedModel,
      code
    );

    const stream = await ollama.chat({
      model: selectedModel,
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

    return res.end();
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