import { useState, useEffect, useMemo, useCallback } from "react";
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

  // Stores selected language from dropdown
  const [language, setLanguage] = useState("javascript");

  // Stores AI-generated explanation
  const [explanation, setExplanation] = useState("");

  // Tracks loading state
  const [loading, setLoading] = useState(false);

  // Stores error message
  const [error, setError] = useState("");

  // Stores informational warning
  const [warning, setWarning] = useState("");

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : true;
  });

  /**
   * ---------------------------
   * SIDE EFFECTS
   * ---------------------------
   */

  // Persist theme in localStorage
  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  /**
   * ---------------------------
   * HELPER FUNCTIONS
   * ---------------------------
   */

  /**
   * Detect probable language from input code.
   * This is heuristic-based, so it handles common cases.
   */
  const detectLanguage = useCallback((inputCode) => {
    const trimmedCode = inputCode.trim();

    if (!trimmedCode) return "";

    // Python
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

    // TypeScript
    if (
      /interface\s+\w+/.test(trimmedCode) ||
      /type\s+\w+\s*=/.test(trimmedCode) ||
      /:\s*(string|number|boolean|any|unknown|void|object)(\[\])?/.test(trimmedCode)
    ) {
      return "typescript";
    }

    // Java
    if (
      /public\s+class\s+\w+/.test(trimmedCode) ||
      /public\s+static\s+void\s+main/.test(trimmedCode) ||
      /System\.out\.println/.test(trimmedCode) ||
      /private\s+\w+\s+\w+;/.test(trimmedCode)
    ) {
      return "java";
    }

    // C++
    if (
      /#include\s*<\w+(\.h)?>/.test(trimmedCode) ||
      /std::/.test(trimmedCode) ||
      /cout\s*<</.test(trimmedCode) ||
      /cin\s*>>/.test(trimmedCode) ||
      /int\s+main\s*\(/.test(trimmedCode)
    ) {
      return "cpp";
    }

    // JavaScript
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
   * Convert language key to a human-friendly label.
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

  const syntaxTheme = useMemo(() => {
    return isDarkMode ? oneDark : oneLight;
  }, [isDarkMode]);

  const appThemeClass = isDarkMode ? "app dark" : "app light";

  const detectedLanguage = useMemo(() => {
    return detectLanguage(code);
  }, [code, detectLanguage]);

  const previewLanguage = detectedLanguage || language;

  /**
   * ---------------------------
   * SIDE EFFECTS FOR LANGUAGE AUTO-SYNC
   * ---------------------------
   *
   * If user pastes code of another language,
   * automatically update the dropdown.
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

  // Toggle theme
  const handleThemeToggle = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // Update code input
  const handleCodeChange = useCallback((e) => {
    setCode(e.target.value);
    setError("");
    setExplanation("");
  }, []);

  /**
   * When user changes dropdown language:
   * 1) clear textarea
   * 2) clear old explanation / error / warning
   */
  const handleLanguageChange = useCallback((e) => {
    setLanguage(e.target.value);
    setCode("");
    setExplanation("");
    setError("");
    setWarning("");
  }, []);

  /**
   * Streaming explain request
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

      const response = await fetch("http://localhost:5000/api/explaincode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          language: finalLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to stream explanation.");
      }

      if (!response.body) {
        throw new Error("Readable stream not supported in this browser.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let done = false;

      while (!done) {
        const result = await reader.read();
        done = result.done;

        if (result.value) {
          const chunkText = decoder.decode(result.value, { stream: true });
          setExplanation((prev) => prev + chunkText);
        }
      }
    } catch (err) {
      console.error("Explain streaming error:", err);
      setError(err.message || "Something went wrong.");
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

          {/* Streaming explanation */}
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