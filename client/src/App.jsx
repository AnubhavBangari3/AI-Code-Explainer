import { useState } from "react";
import axios from "axios";

function App() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleExplain = async () => {
    if (!code.trim()) {
      setError("Please enter some code.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setExplanation("");

      const response = await axios.post("http://localhost:5000/api/explaincode", {
        code,
        language,
      });

      setExplanation(response.data.explanation);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1>AI Code Explainer</h1>
        <p>Paste code and get a simple explanation using Ollama.</p>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={styles.select}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="typescript">TypeScript</option>
        </select>

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code here..."
          rows={15}
          style={styles.textarea}
        />

        <button onClick={handleExplain} disabled={loading} style={styles.button}>
          {loading ? "Explaining..." : "Explain Code"}
        </button>

        {error && <p style={styles.error}>{error}</p>}

        {explanation && (
          <div style={styles.output}>
            <h2>Explanation</h2>
            <pre style={styles.pre}>{explanation}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "white",
    padding: "30px",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: "900px",
    margin: "0 auto",
  },
  select: {
    padding: "10px",
    marginBottom: "15px",
    width: "200px",
    borderRadius: "8px",
  },
  textarea: {
    width: "100%",
    padding: "15px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "#1e293b",
    color: "white",
    fontSize: "14px",
    marginBottom: "15px",
  },
  button: {
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontSize: "16px",
  },
  output: {
    marginTop: "25px",
    padding: "20px",
    borderRadius: "10px",
    background: "#111827",
    border: "1px solid #374151",
  },
  pre: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    lineHeight: "1.6",
  },
  error: {
    color: "#f87171",
    marginTop: "10px",
  },
};

export default App;