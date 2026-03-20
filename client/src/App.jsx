import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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

/**
 * Recommended first comparison set
 */
const COMPARISON_MODELS = [
  "deepseek-coder:6.7b",
  "llama3:8b",
  "mistral:7b",
  "gemma:2b",
  "codellama:7b",
];

const API_BASE_URL = "http://localhost:5000";

function App() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [mode, setMode] = useState("explain");
  const [model, setModel] = useState("deepseek-coder");
  const [explanation, setExplanation] = useState("");
  const [fixedCode, setFixedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [comparisonView, setComparisonView] = useState(false);
  const [modelResults, setModelResults] = useState({});

  const comparisonSectionRef = useRef(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : true;
  });

  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  /**
   * Auto-focus / scroll to comparison dashboard
   */
  useEffect(() => {
    if (comparisonView && comparisonSectionRef.current) {
      setTimeout(() => {
        comparisonSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);
    }
  }, [comparisonView]);

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
      /:\s*(string|number|boolean|any|unknown|void|object)(\[\])?/.test(
        trimmedCode
      )
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
    if (comparisonView) {
      return "Compare multiple AI models side by side with real-time streaming, response quality tracking, and live scoring.";
    }

    if (mode === "debug") {
      return `Paste code and detect bugs with AI using ${
        selectedModelMeta?.label || "Ollama"
      }.`;
    }

    return `Paste code and get AI-powered explanation using ${
      selectedModelMeta?.label || "Ollama"
    }.`;
  }, [comparisonView, mode, selectedModelMeta]);

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
    const match = text.match(/FIXED_CODE_START\s*([\s\S]*?)\s*FIXED_CODE_END/i);
    return match ? match[1].trim() : "";
  }, []);

  /**
   * Detect whether response includes a bug list
   */
  const hasBugList = useCallback((text) => {
    return /BUGS_FOUND:/i.test(text);
  }, []);

  /**
   * Detect whether response is structured
   */
  const hasStructuredSections = useCallback((text) => {
    const explainSections = [
      /1\.\s*Language Check/i,
      /2\.\s*What this code does/i,
      /3\.\s*Step-by-step explanation/i,
    ];

    const debugSections = [
      /LANGUAGE_CHECK:/i,
      /BUGS_FOUND:/i,
      /SEVERITY:/i,
      /EXPLANATION_OF_FIX:/i,
    ];

    const matchedExplainCount = explainSections.filter((pattern) =>
      pattern.test(text)
    ).length;
    const matchedDebugCount = debugSections.filter((pattern) =>
      pattern.test(text)
    ).length;

    return matchedExplainCount >= 2 || matchedDebugCount >= 2;
  }, []);

  /**
   * Simple language verification inside model response
   */
  const responseMentionsLanguage = useCallback(
    (text, lang) => {
      if (!lang) return false;
      const label = getLanguageLabel(lang).toLowerCase();
      return text.toLowerCase().includes(label.toLowerCase());
    },
    [getLanguageLabel]
  );

  /**
   * Best-for label by model
   */
  const getBestFor = useCallback((modelName) => {
    switch (modelName) {
      case "deepseek-coder":
      case "deepseek-coder:6.7b":
        return "Debugging";
      case "llama3":
      case "llama3:8b":
        return "Explanation clarity";
      case "mistral":
      case "mistral:7b":
        return "Speed";
      case "codellama:7b":
        return "Code baseline";
      case "gemma":
      case "gemma:2b":
        return "Simple summaries";
      default:
        return "General use";
    }
  }, []);

  /**
   * Human label for model
   */
  const getModelLabel = useCallback((modelValue) => {
    const found = MODEL_OPTIONS.find((item) => item.value === modelValue);
    return found?.label || modelValue;
  }, []);

  /**
   * Score model response out of 100
   */
  const calculateScore = useCallback(
    (result, currentMode, finalLanguage) => {
      if (!result) return 0;

      let score = 0;

      if (hasStructuredSections(result.text)) score += 20;
      if (
        result.timeToFirstTokenMs !== null &&
        result.timeToFirstTokenMs < 2500
      )
        score += 15;
      else if (
        result.timeToFirstTokenMs !== null &&
        result.timeToFirstTokenMs < 5000
      )
        score += 8;

      if (
        result.totalResponseTimeMs !== null &&
        result.totalResponseTimeMs < 8000
      )
        score += 15;
      else if (
        result.totalResponseTimeMs !== null &&
        result.totalResponseTimeMs < 15000
      )
        score += 8;

      if (responseMentionsLanguage(result.text, finalLanguage)) score += 15;

      if (currentMode === "debug") {
        if (result.hasBugList) score += 20;
        if (result.hasFixedCode) score += 20;
        if (result.fixedCodeLength > 0) score += 10;
        if (result.responseLength > 250) score += 5;
      } else {
        if (result.responseLength > 250) score += 15;
        if (/important concepts used/i.test(result.text)) score += 10;
        if (/possible issues or improvements/i.test(result.text)) score += 10;
      }

      return Math.min(100, score);
    },
    [hasStructuredSections, responseMentionsLanguage]
  );

  /**
   * Reset comparison state
   */
  const resetComparisonState = useCallback(() => {
    setModelResults({});
    setComparisonLoading(false);
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

  const handleModeChange = useCallback(
    (e) => {
      setMode(e.target.value);
      setExplanation("");
      setFixedCode("");
      setError("");
      setComparisonView(false);
      resetComparisonState();
    },
    [resetComparisonState]
  );

  const handleModelChange = useCallback((e) => {
    setModel(e.target.value);
    setExplanation("");
    setFixedCode("");
    setError("");
  }, []);

  /**
   * Send code to backend and stream single-model response
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
      setComparisonView(false);
      resetComparisonState();
      setLoading(true);
      setError("");
      setExplanation("");
      setFixedCode("");
      setWarning("");

      const response = await fetch(`${API_BASE_URL}/api/explaincode`, {
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
  }, [
    code,
    language,
    detectedLanguage,
    mode,
    model,
    extractFixedCode,
    resetComparisonState,
  ]);

  /**
   * Run one streaming request for comparison mode
   */
  const runModelStream = useCallback(
    async (modelName, finalLanguage, currentMode) => {
      const startedAt = performance.now();

      setModelResults((prev) => ({
        ...prev,
        [modelName]: {
          model: modelName,
          text: "",
          status: "waiting",
          startedAt,
          firstTokenAt: null,
          endedAt: null,
          timeToFirstTokenMs: null,
          totalResponseTimeMs: null,
          responseLength: 0,
          hasFixedCode: false,
          fixedCode: "",
          fixedCodeLength: 0,
          hasBugList: false,
          score: 0,
          error: "",
        },
      }));

      try {
        const response = await fetch(`${API_BASE_URL}/api/explaincode`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            language: finalLanguage,
            mode: currentMode,
            model: modelName,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed for ${modelName}`);
        }

        if (!response.body) {
          throw new Error(`No readable stream for ${modelName}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        let fullText = "";
        let firstTokenAt = null;
        let streamDone = false;

        setModelResults((prev) => ({
          ...prev,
          [modelName]: {
            ...prev[modelName],
            status: "streaming",
          },
        }));

        while (!streamDone) {
          const result = await reader.read();
          streamDone = result.done;

          if (result.value) {
            const chunkText = decoder.decode(result.value, { stream: true });
            fullText += chunkText;

            if (firstTokenAt === null) {
              firstTokenAt = performance.now();
            }

            const extractedFixedCode =
              currentMode === "debug" ? extractFixedCode(fullText) : "";

            const nextResult = {
              model: modelName,
              text: fullText,
              status: "streaming",
              startedAt,
              firstTokenAt,
              endedAt: null,
              timeToFirstTokenMs:
                firstTokenAt !== null
                  ? Math.round(firstTokenAt - startedAt)
                  : null,
              totalResponseTimeMs: null,
              responseLength: fullText.length,
              hasFixedCode: Boolean(extractedFixedCode),
              fixedCode: extractedFixedCode,
              fixedCodeLength: extractedFixedCode.length,
              hasBugList: hasBugList(fullText),
              score: 0,
              error: "",
            };

            nextResult.score = calculateScore(
              nextResult,
              currentMode,
              finalLanguage
            );

            setModelResults((prev) => ({
              ...prev,
              [modelName]: nextResult,
            }));
          }
        }

        const endedAt = performance.now();
        const extractedFixedCode =
          currentMode === "debug" ? extractFixedCode(fullText) : "";

        const finalResult = {
          model: modelName,
          text: fullText,
          status: "done",
          startedAt,
          firstTokenAt,
          endedAt,
          timeToFirstTokenMs:
            firstTokenAt !== null ? Math.round(firstTokenAt - startedAt) : null,
          totalResponseTimeMs: Math.round(endedAt - startedAt),
          responseLength: fullText.length,
          hasFixedCode: Boolean(extractedFixedCode),
          fixedCode: extractedFixedCode,
          fixedCodeLength: extractedFixedCode.length,
          hasBugList: hasBugList(fullText),
          score: 0,
          error: "",
        };

        finalResult.score = calculateScore(
          finalResult,
          currentMode,
          finalLanguage
        );

        setModelResults((prev) => ({
          ...prev,
          [modelName]: finalResult,
        }));
      } catch (err) {
        console.error(`Comparison stream error for ${modelName}:`, err);

        setModelResults((prev) => ({
          ...prev,
          [modelName]: {
            ...prev[modelName],
            status: "error",
            error: err.message || "Failed to stream response.",
          },
        }));
      }
    },
    [code, extractFixedCode, hasBugList, calculateScore]
  );

  /**
   * Start multi-model comparison
   */
  const handleMultiModelComparison = useCallback(async () => {
    if (!code.trim()) {
      setError("Please enter some code.");
      return;
    }

    const finalLanguage = detectedLanguage || language;

    try {
      setComparisonView(true);
      setLoading(false);
      setComparisonLoading(true);
      setError("");
      setWarning("");
      setExplanation("");
      setFixedCode("");
      setModelResults({});

      await Promise.all(
        COMPARISON_MODELS.map((modelName) =>
          runModelStream(modelName, finalLanguage, mode)
        )
      );
    } catch (err) {
      console.error("Comparison error:", err);
      setError(err.message || "Comparison failed.");
    } finally {
      setComparisonLoading(false);
    }
  }, [code, detectedLanguage, language, mode, runModelStream]);

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

  const comparisonResultsArray = useMemo(() => {
    return COMPARISON_MODELS.map((modelName) => modelResults[modelName]).filter(
      Boolean
    );
  }, [modelResults]);

  const bestOverallModel = useMemo(() => {
    if (!comparisonResultsArray.length) return null;

    const completed = comparisonResultsArray.filter(
      (item) => item.status === "done" || item.status === "streaming"
    );

    if (!completed.length) return null;

    return [...completed].sort((a, b) => b.score - a.score)[0];
  }, [comparisonResultsArray]);

  const fastestModel = useMemo(() => {
    const doneResults = comparisonResultsArray.filter(
      (item) => item.status === "done" && item.timeToFirstTokenMs !== null
    );

    if (!doneResults.length) return null;

    return [...doneResults].sort(
      (a, b) => a.timeToFirstTokenMs - b.timeToFirstTokenMs
    )[0];
  }, [comparisonResultsArray]);

  const comparisonCompleted = useMemo(() => {
    if (!comparisonView || !comparisonResultsArray.length) return false;

    return comparisonResultsArray.length === COMPARISON_MODELS.length &&
      comparisonResultsArray.every(
        (item) => item.status === "done" || item.status === "error"
      );
  }, [comparisonView, comparisonResultsArray]);

  const winnerModel = useMemo(() => {
    if (!comparisonCompleted) return null;

    const successfulModels = comparisonResultsArray.filter(
      (item) => item.status === "done"
    );

    if (!successfulModels.length) return null;

    return [...successfulModels].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const aTime = a.totalResponseTimeMs ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.totalResponseTimeMs ?? Number.MAX_SAFE_INTEGER;

      if (aTime !== bTime) return aTime - bTime;

      return (b.responseLength ?? 0) - (a.responseLength ?? 0);
    })[0];
  }, [comparisonCompleted, comparisonResultsArray]);

  const winnerReason = useMemo(() => {
    if (!winnerModel) return "";

    if (mode === "debug") {
      if (winnerModel.hasFixedCode && winnerModel.hasBugList) {
        return "It gave the strongest debugging response with both bug detection and corrected code.";
      }

      if (winnerModel.hasFixedCode) {
        return "It stood out by returning corrected code with a strong overall score.";
      }

      return "It achieved the best overall debugging score among completed models.";
    }

    if ((winnerModel.timeToFirstTokenMs ?? Infinity) < 3000) {
      return "It balanced strong explanation quality with very fast response speed.";
    }

    return "It delivered the strongest overall explanation quality based on structure, completeness, and score.";
  }, [winnerModel, mode]);

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
                disabled={comparisonLoading}
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
              disabled={loading || comparisonLoading}
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

            <button
              onClick={handleMultiModelComparison}
              disabled={loading || comparisonLoading}
              className="button secondary-button"
              type="button"
            >
              {comparisonLoading
                ? "Comparing Models..."
                : "Multi Model Comparison"}
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

          {!comparisonView && explanation && (
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

          {!comparisonView && mode === "debug" && fixedCode && (
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

          {comparisonView && (
            <section
              ref={comparisonSectionRef}
              className="output comparison-section"
            >
              <div className="output-header">
                <h2>Multi Model Comparison Dashboard</h2>
                <span className="output-model-chip">
                  {mode === "debug"
                    ? "Bug Detection Comparison"
                    : "Explanation Comparison"}
                </span>
              </div>

              <div className="comparison-summary">
                {bestOverallModel && (
                  <div className="summary-badge best-badge">
                    Best Overall:{" "}
                    <strong>{getModelLabel(bestOverallModel.model)}</strong>
                  </div>
                )}

                {fastestModel && (
                  <div className="summary-badge fast-badge">
                    Fastest First Token:{" "}
                    <strong>{getModelLabel(fastestModel.model)}</strong>
                  </div>
                )}

                <div className="summary-badge neutral-badge">
                  Models: <strong>{COMPARISON_MODELS.length}</strong>
                </div>
              </div>

              {comparisonCompleted && winnerModel && (
                <div className="winner-banner">
                  <div className="winner-badge">Winner Model</div>
                  <h3 className="winner-title">{getModelLabel(winnerModel.model)}</h3>
                  <p className="winner-reason">{winnerReason}</p>

                  <div className="winner-stats">
                    <div className="winner-stat">
                      Score: <strong>{winnerModel.score}</strong>
                    </div>
                    <div className="winner-stat">
                      First token:{" "}
                      <strong>
                        {winnerModel.timeToFirstTokenMs !== null
                          ? `${winnerModel.timeToFirstTokenMs} ms`
                          : "--"}
                      </strong>
                    </div>
                    <div className="winner-stat">
                      Total time:{" "}
                      <strong>
                        {winnerModel.totalResponseTimeMs !== null
                          ? `${winnerModel.totalResponseTimeMs} ms`
                          : "--"}
                      </strong>
                    </div>
                    <div className="winner-stat">
                      Response length:{" "}
                      <strong>{winnerModel.responseLength ?? 0}</strong>
                    </div>
                    <div className="winner-stat">
                      Best for: <strong>{getBestFor(winnerModel.model)}</strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="comparison-grid">
                {COMPARISON_MODELS.map((modelName) => {
                  const result = modelResults[modelName];
                  const isBest = bestOverallModel?.model === modelName;
                  const meta = MODEL_OPTIONS.find(
                    (item) => item.value === modelName
                  );

                  return (
                    <div
                      key={modelName}
                      className={`comparison-card ${
                        isBest ? "comparison-card-best" : ""
                      }`}
                    >
                      <div className="comparison-card-header">
                        <div>
                          <h3>{meta?.label || modelName}</h3>
                          <p className="comparison-card-subtitle">
                            {meta?.description || "AI model"}
                          </p>
                        </div>

                        <div className="comparison-badges">
                          {isBest && <span className="mini-badge">Best</span>}
                          <span
                            className={`status-badge status-${
                              result?.status || "waiting"
                            }`}
                          >
                            {result?.status || "waiting"}
                          </span>
                        </div>
                      </div>

                      <div className="comparison-stats">
                        <div className="stat-pill">
                          Score: <strong>{result?.score ?? 0}</strong>
                        </div>
                        <div className="stat-pill">
                          First token:{" "}
                          <strong>
                            {result?.timeToFirstTokenMs !== null &&
                            result?.timeToFirstTokenMs !== undefined
                              ? `${result.timeToFirstTokenMs} ms`
                              : "--"}
                          </strong>
                        </div>
                        <div className="stat-pill">
                          Length: <strong>{result?.responseLength ?? 0}</strong>
                        </div>
                      </div>

                      {result?.error ? (
                        <p className="error">{result.error}</p>
                      ) : (
                        <pre className="comparison-pre">
                          {result?.text || "Waiting for response..."}
                        </pre>
                      )}

                      {mode === "debug" && result?.fixedCode && (
                        <div className="comparison-fixed-code-box">
                          <div className="comparison-fixed-title">
                            Fixed Code Found
                          </div>
                          <SyntaxHighlighter
                            language={previewLanguage}
                            style={syntaxTheme}
                            showLineNumbers
                            wrapLongLines
                            customStyle={{
                              borderRadius: "12px",
                              padding: "12px",
                              fontSize: "13px",
                              marginTop: "10px",
                            }}
                          >
                            {result.fixedCode}
                          </SyntaxHighlighter>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="comparison-table-wrapper">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Status</th>
                      <th>First Token</th>
                      <th>Total Time</th>
                      <th>Response Length</th>
                      <th>Bug List</th>
                      <th>Fixed Code</th>
                      <th>Score</th>
                      <th>Best For</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_MODELS.map((modelName) => {
                      const result = modelResults[modelName];

                      return (
                        <tr key={modelName}>
                          <td>{getModelLabel(modelName)}</td>
                          <td>{result?.status || "waiting"}</td>
                          <td>
                            {result?.timeToFirstTokenMs !== null &&
                            result?.timeToFirstTokenMs !== undefined
                              ? `${result.timeToFirstTokenMs} ms`
                              : "--"}
                          </td>
                          <td>
                            {result?.totalResponseTimeMs !== null &&
                            result?.totalResponseTimeMs !== undefined
                              ? `${result.totalResponseTimeMs} ms`
                              : result?.status === "streaming"
                              ? "Streaming..."
                              : "--"}
                          </td>
                          <td>{result?.responseLength ?? 0}</td>
                          <td>{result?.hasBugList ? "Yes" : "No"}</td>
                          <td>{result?.hasFixedCode ? "Yes" : "No"}</td>
                          <td>{result?.score ?? 0}</td>
                          <td>{getBestFor(modelName)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;