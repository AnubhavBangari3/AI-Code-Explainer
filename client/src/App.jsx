import { useState, useEffect, useMemo, useCallback } from "react";
import "./App.css";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

/**
 * Supported Ollama models shown in dropdown
 */
const MODEL_OPTIONS = [
  {
    value: "codellama:7b",
    label: "CodeLlama 7B",
    description: "Good baseline for code explanation tasks",
  },
  {
    value: "deepseek-coder",
    label: "DeepSeek Coder",
    description: "Best choice for coding, debugging, and fixes",
  },
  {
    value: "llama3",
    label: "Llama 3",
    description: "Strong general-purpose model with balanced output",
  },
  {
    value: "mistral",
    label: "Mistral",
    description: "Fast and lightweight model",
  },
  {
    value: "gemma",
    label: "Gemma",
    description: "Simple and clean explanations",
  },
];

function App() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [mode, setMode] = useState("explain");
  const [model, setModel] = useState("deepseek-coder");
  const [explanation, setExplanation] = useState("");
  const [fixedCode, setFixedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : true;
  });

  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  /**
   * Detect programming language from pasted code
   */
  const detectLanguage = useCallback((inputCode) => {
    const trimmedCode = inputCode.trim();

    if (!trimmedCode) return "";

    if (
      /^def\s+\w+\s*\(/m.test(trimmedCode) ||
      /^import\s+\w+/m.test(trimmedCode) ||
      /^from\s+\w+\s+import\s+/m.test(trimmedCode) ||
      /print\s*\(/.test(trimmedCode) ||
      /elif\s+/.test(trimmedCode) ||
      /:\s*$/.test(trimmedCode.split("\n")[0])
    ) {
      return "python";
    }

    if (
      /interface\s+\w+/.test(trimmedCode) ||
      /type\s+\w+\s*=/.test(trimmedCode) ||
      /:\s*(string|number|boolean|any|unknown|void|object)(\[\])?/.test(trimmedCode)
    ) {
      return "typescript";
    }

    if (
      /public\s+class\s+\w+/.test(trimmedCode) ||
      /public\s+static\s+void\s+main/.test(trimmedCode) ||
      /System\.out\.println/.test(trimmedCode) ||
      /private\s+\w+\s+\w+;/.test(trimmedCode)
    ) {
      return "java";
    }

    if (
      /#include\s*<\w+(\.h)?>/.test(trimmedCode) ||
      /std::/.test(trimmedCode) ||
      /cout\s*<</.test(trimmedCode) ||
      /cin\s*>>/.test(trimmedCode) ||
      /int\s+main\s*\(/.test(trimmedCode)
    ) {
      return "cpp";
    }

    if (
      /function\s+\w+\s*\(/.test(trimmedCode) ||
      /const\s+\w+\s*=/.test(trimmedCode) ||
      /let\s+\w+\s*=/.test(trimmedCode) ||
      /var\s+\w+\s*=/.test(trimmedCode) ||
      /console\.log\s*\(/.test(trimmedCode) ||
      /=>/.test(trimmedCode)
    ) {
      return "javascript";
    }

    return "";
  }, []);

  /**
   * Convert language key to readable label
   */
  const getLanguageLabel = useCallback((lang) => {
    const languageMap = {
      javascript: "JavaScript",
      python: "Python",
      java: "Java",
      cpp: "C++",
      typescript: "TypeScript",
    };

    return languageMap[lang] || lang;
  }, []);

  /**
   * Get selected model meta info
   */
  const selectedModelMeta = useMemo(() => {
    return MODEL_OPTIONS.find((item) => item.value === model);
  }, [model]);

  const syntaxTheme = useMemo(() => {
    return isDarkMode ? oneDark : oneLight;
  }, [isDarkMode]);

  const appThemeClass = isDarkMode ? "app dark" : "app light";

  const detectedLanguage = useMemo(() => {
    return detectLanguage(code);
  }, [code, detectLanguage]);

  const previewLanguage = detectedLanguage || language;

  const dynamicSubtitle = useMemo(() => {
  if (mode === "debug") {
    return `Paste code and detect bugs with AI using ${
      selectedModelMeta?.label || "Ollama"
    }.`;
  }

  return `Paste code and get AI-powered explanation using ${
    selectedModelMeta?.label || "Ollama"
  }.`;
}, [mode, selectedModelMeta]);

  /**
   * Auto-switch language if detected from code
   */
  useEffect(() => {
    if (!code.trim() || !detectedLanguage) {
      setWarning("");
      return;
    }

    if (detectedLanguage !== language) {
      setLanguage(detectedLanguage);
      setWarning(
        `Language automatically changed to ${getLanguageLabel(
          detectedLanguage
        )} based on your code.`
      );
    } else {
      setWarning("");
    }
  }, [code, detectedLanguage, language, getLanguageLabel]);

  /**
   * Extract fixed code from backend debug response
   */
  const extractFixedCode = useCallback((text) => {
    const match = text.match(/FIXED_CODE_START\s*([\s\S]*?)\s*FIXED_CODE_END/);
    return match ? match[1].trim() : "";
  }, []);

  const handleThemeToggle = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  const handleCodeChange = useCallback((e) => {
    setCode(e.target.value);
    setError("");
    setExplanation("");
    setFixedCode("");
  }, []);

  const handleLanguageChange = useCallback((e) => {
    setLanguage(e.target.value);
    setExplanation("");
    setFixedCode("");
    setError("");
    setWarning("");
  }, []);

  const handleModeChange = useCallback((e) => {
    setMode(e.target.value);
    setExplanation("");
    setFixedCode("");
    setError("");
  }, []);

  const handleModelChange = useCallback((e) => {
    setModel(e.target.value);
    setExplanation("");
    setFixedCode("");
    setError("");
  }, []);

  /**
   * Send code to backend and stream response
   */
  const handleAnalyze = useCallback(async () => {
    if (!code.trim()) {
      setError("Please enter some code.");
      setExplanation("");
      setFixedCode("");
      return;
    }

    const finalLanguage = detectedLanguage || language;

    try {
      setLoading(true);
      setError("");
      setExplanation("");
      setFixedCode("");
      setWarning("");

      const response = await fetch("http://localhost:5000/api/explaincode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          language: finalLanguage,
          mode,
          model,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to stream response.");
      }

      if (!response.body) {
        throw new Error("Readable stream not supported in this browser.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let fullText = "";
      let done = false;

      while (!done) {
        const result = await reader.read();
        done = result.done;

        if (result.value) {
          const chunkText = decoder.decode(result.value, { stream: true });
          fullText += chunkText;
          setExplanation(fullText);

          if (mode === "debug") {
            const extracted = extractFixedCode(fullText);
            setFixedCode(extracted);
          }
        }
      }
    } catch (err) {
      console.error("Streaming error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [code, language, detectedLanguage, mode, model, extractFixedCode]);

  const handleApplyFix = useCallback(() => {
    if (!fixedCode.trim()) return;
    setCode(fixedCode);
    setExplanation("");
    setWarning("Fixed code applied to editor.");
  }, [fixedCode]);

  const handleCopyFixedCode = useCallback(async () => {
    if (!fixedCode.trim()) return;

    try {
      await navigator.clipboard.writeText(fixedCode);
      setWarning("Fixed code copied to clipboard.");
    } catch (err) {
      setError("Failed to copy fixed code.");
    }
  }, [fixedCode]);

  return (
    <div className={appThemeClass}>
      <nav className="navbar">
        <div className="navbar-left">
          <h1 className="navbar-title">AI Code Explainer</h1>
        </div>

        <div className="navbar-right">
          <button
            onClick={handleThemeToggle}
            className="theme-toggle-btn"
            aria-label="Toggle dark and light mode"
            type="button"
          >
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      </nav>

      <main className="page">
        <div className="container">
         <p className="subtitle">{dynamicSubtitle}</p>

          <div className="controls-grid">
            <div>
              <label htmlFor="mode-select" className="label">
                Select Mode
              </label>
              <select
                id="mode-select"
                value={mode}
                onChange={handleModeChange}
                className="select"
              >
                <option value="explain">Explain Code</option>
                <option value="debug">Bug Detection Mode</option>
              </select>
            </div>

            <div>
              <label htmlFor="language-select" className="label">
                Select Language
              </label>
              <select
                id="language-select"
                value={language}
                onChange={handleLanguageChange}
                className="select"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="typescript">TypeScript</option>
              </select>
            </div>

            <div>
              <label htmlFor="model-select" className="label">
                Select AI Model
              </label>
              <select
                id="model-select"
                value={model}
                onChange={handleModelChange}
                className="select"
              >
                {MODEL_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <p className="model-hint">{selectedModelMeta?.description}</p>
            </div>
          </div>

          {code.trim() && (
            <p className="detected-language">
              <strong>Detected Language:</strong> {getLanguageLabel(previewLanguage)}
            </p>
          )}

          <div className="status-row">
            {warning && <p className="warning">{warning}</p>}
            {error && <p className="error">{error}</p>}
          </div>

          <label htmlFor="code-input" className="label">
            Paste Your Code
          </label>
          <textarea
            id="code-input"
            value={code}
            onChange={handleCodeChange}
            placeholder="Paste your code here..."
            rows={15}
            className="textarea"
          />

          <div className="action-row">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="button"
              type="button"
            >
              {loading
                ? mode === "debug"
                  ? "Detecting Bugs..."
                  : "Explaining..."
                : mode === "debug"
                ? "Detect Bugs & Fix"
                : "Explain Code"}
            </button>

            <div className="selected-model-badge">
              Active model: <strong>{selectedModelMeta?.label || model}</strong>
            </div>
          </div>

          {code.trim() && (
            <section className="output">
              <h2>Your Code</h2>
              <SyntaxHighlighter
                language={previewLanguage}
                style={syntaxTheme}
                showLineNumbers
                wrapLongLines
                customStyle={{
                  borderRadius: "12px",
                  padding: "16px",
                  fontSize: "14px",
                  marginTop: "12px",
                }}
              >
                {code}
              </SyntaxHighlighter>
            </section>
          )}

          {explanation && (
            <section className="output">
              <div className="output-header">
                <h2>{mode === "debug" ? "Bug Analysis" : "Explanation"}</h2>
                <span className="output-model-chip">
                  Generated with {selectedModelMeta?.label || model}
                </span>
              </div>
              <pre className="pre">{explanation}</pre>
            </section>
          )}

          {mode === "debug" && fixedCode && (
            <section className="output">
              <h2>Fixed Code</h2>

              <div className="fix-actions">
                <button onClick={handleApplyFix} className="button" type="button">
                  Apply Fix
                </button>

                <button onClick={handleCopyFixedCode} className="button" type="button">
                  Copy Fixed Code
                </button>
              </div>

              <SyntaxHighlighter
                language={previewLanguage}
                style={syntaxTheme}
                showLineNumbers
                wrapLongLines
                customStyle={{
                  borderRadius: "12px",
                  padding: "16px",
                  fontSize: "14px",
                  marginTop: "12px",
                }}
              >
                {fixedCode}
              </SyntaxHighlighter>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;