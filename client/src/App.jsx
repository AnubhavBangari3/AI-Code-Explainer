import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import "./App.css";

// Syntax highlighter imports
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

function App() {
  /**
   * ---------------------------
   * STATE VARIABLES
   * ---------------------------
   */

  // Stores user input code
  const [code, setCode] = useState("");

  // Stores selected programming language from dropdown
  const [language, setLanguage] = useState("javascript");

  // Stores AI-generated explanation
  const [explanation, setExplanation] = useState("");

  // Tracks loading state during API call
  const [loading, setLoading] = useState(false);

  // Stores API / validation error message
  const [error, setError] = useState("");

  // Stores helpful warning / info message
  const [warning, setWarning] = useState("");

  // Theme state: dark or light
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : true;
  });

  /**
   * ---------------------------
   * SIDE EFFECTS
   * ---------------------------
   */

  // Persist theme in localStorage whenever user changes it
  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  /**
   * ---------------------------
   * HELPER FUNCTIONS
   * ---------------------------
   */

  /**
   * Detect probable language from code content.
   * This uses simple heuristics for common patterns.
   */
  const detectLanguage = useCallback((inputCode) => {
    const trimmedCode = inputCode.trim();

    if (!trimmedCode) {
      return "";
    }

    // Python patterns
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

    // TypeScript patterns
    if (
      /interface\s+\w+/.test(trimmedCode) ||
      /type\s+\w+\s*=/.test(trimmedCode) ||
      /:\s*(string|number|boolean|any|unknown|void|object)(\[\])?/.test(trimmedCode)
    ) {
      return "typescript";
    }

    // Java patterns
    if (
      /public\s+class\s+\w+/.test(trimmedCode) ||
      /public\s+static\s+void\s+main/.test(trimmedCode) ||
      /System\.out\.println/.test(trimmedCode) ||
      /private\s+\w+\s+\w+;/.test(trimmedCode)
    ) {
      return "java";
    }

    // C++ patterns
    if (
      /#include\s*<\w+(\.h)?>/.test(trimmedCode) ||
      /std::/.test(trimmedCode) ||
      /cout\s*<</.test(trimmedCode) ||
      /cin\s*>>/.test(trimmedCode) ||
      /int\s+main\s*\(/.test(trimmedCode)
    ) {
      return "cpp";
    }

    // JavaScript patterns
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
   * Convert internal language key into display label.
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
   * ---------------------------
   * MEMOIZED VALUES
   * ---------------------------
   */

  // Memoized theme for syntax highlighter
  const syntaxTheme = useMemo(() => {
    return isDarkMode ? oneDark : oneLight;
  }, [isDarkMode]);

  // Theme class for root element
  const appThemeClass = isDarkMode ? "app dark" : "app light";

  // Detect language from code
  const detectedLanguage = useMemo(() => {
    return detectLanguage(code);
  }, [code, detectLanguage]);

  // Use detected language for code preview if available
  const previewLanguage = detectedLanguage || language;

  /**
   * ---------------------------
   * SIDE EFFECTS FOR LANGUAGE SYNC
   * ---------------------------
   */

  /**
   * Auto-update dropdown language if pasted code clearly matches another language.
   * Example: JS selected but pasted Python code -> dropdown becomes Python.
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
   * ---------------------------
   * EVENT HANDLERS
   * ---------------------------
   */

  // Toggle dark/light mode
  const handleThemeToggle = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  /**
   * Handle code change.
   * Also clears old error/explanation for a cleaner UX.
   */
  const handleCodeChange = useCallback((e) => {
    setCode(e.target.value);
    setError("");
    setExplanation("");
  }, []);

  /**
   * Handle language dropdown change.
   * Requirement:
   * 1) Empty textarea on changing language
   */
  const handleLanguageChange = useCallback((e) => {
    setLanguage(e.target.value);
    setCode("");
    setExplanation("");
    setError("");
    setWarning("");
  }, []);

  /**
   * Handle explain request.
   * Uses detected language if available.
   */
  const handleExplain = useCallback(async () => {
    if (!code.trim()) {
      setError("Please enter some code.");
      setExplanation("");
      return;
    }

    const finalLanguage = detectedLanguage || language;

    try {
      setLoading(true);
      setError("");
      setExplanation("");

      const response = await axios.post("http://localhost:5000/api/explaincode", {
        code,
        language: finalLanguage,
      });

      setExplanation(response.data.explanation || "No explanation returned.");
    } catch (err) {
      console.error("Explain API error:", err);
      setError(err?.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [code, language, detectedLanguage]);

  /**
   * ---------------------------
   * UI RENDERING
   * ---------------------------
   */

  return (
    <div className={appThemeClass}>
      {/* Navbar */}
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
            {isDarkMode ? "☀ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="page">
        <div className="container">
          <p className="subtitle">
            Paste code and get a simple explanation using Ollama.
          </p>

          {/* Language selector */}
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

          {/* Detected language info */}
          {code.trim() && (
            <p className="detected-language">
              <strong>Detected Language:</strong> {getLanguageLabel(previewLanguage)}
            </p>
          )}

          {/* Warning / info message */}
          {warning && <p className="warning">{warning}</p>}

          {/* Code input */}
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

          {/* Explain button */}
          <button
            onClick={handleExplain}
            disabled={loading}
            className="button"
            type="button"
          >
            {loading ? "Explaining..." : "Explain Code"}
          </button>

          {/* Error message */}
          {error && <p className="error">{error}</p>}

          {/* Code preview */}
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

          {/* Explanation */}
          {explanation && (
            <section className="output">
              <h2>Explanation</h2>
              <pre className="pre">{explanation}</pre>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;