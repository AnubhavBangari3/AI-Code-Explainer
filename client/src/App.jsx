import { useState } from "react"; // React hook for managing state
import axios from "axios"; // For making API calls
import "./App.css";

function App() {
  /**
   * ---------------------------
   * STATE VARIABLES
   * ---------------------------
   */

  const [code, setCode] = useState(""); // Stores user input code
  const [language, setLanguage] = useState("javascript"); // Selected language
  const [explanation, setExplanation] = useState(""); // AI response
  const [loading, setLoading] = useState(false); // Loading state for button
  const [error, setError] = useState(""); // Error message

  /**
   * ---------------------------
   * HANDLE EXPLAIN FUNCTION
   * ---------------------------
   */

  const handleExplain = async () => {
    // Validate input
    if (!code.trim()) {
      setError("Please enter some code.");
      return;
    }

    try {
      setLoading(true); // Start loading
      setError(""); // Clear previous error
      setExplanation(""); // Clear previous result

      // Call backend API
      const response = await axios.post("http://localhost:5000/api/explaincode", {
        code,
        language,
      });

      // Store AI explanation in state
      setExplanation(response.data.explanation);
    } catch (err) {
      console.error(err);

      // Handle API error
      setError(err?.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false); // Stop loading
    }
  };

  /**
   * ---------------------------
   * UI RENDERING
   * ---------------------------
   */

  return (
    <div className="page">
      <div className="container">
        <h1>AI Code Explainer</h1>
        <p>Paste code and get a simple explanation using Ollama.</p>

        {/* Language Dropdown */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="select"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="typescript">TypeScript</option>
        </select>

        {/* Code Input Area */}
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code here..."
          rows={15}
          className="textarea"
        />

        {/* Submit Button */}
        <button onClick={handleExplain} disabled={loading} className="button">
          {loading ? "Explaining..." : "Explain Code"}
        </button>

        {/* Error Message */}
        {error && <p className="error">{error}</p>}

        {/* Output Section */}
        {explanation && (
          <div className="output">
            <h2>Explanation</h2>
            <pre className="pre">{explanation}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;