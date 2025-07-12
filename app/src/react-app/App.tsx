// src/App.tsx

import { useEffect, useRef, useState } from "react";
import "./App.css";

interface AutoRagResult {
  object: string;
  search_query: string;
  response: string;
  data: {
    file_id: string;
    filename: string;
    score: number;
    attributes: Record<string, unknown>;
    content: unknown[];
  }[];
  has_more: boolean;
  next_page: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type Targets = "HoloMeet_Pro" | "NeuroNote_X";

function App() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AutoRagResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [openaiQuery, setOpenaiQuery] = useState("");
  const [openaiResponse, setOpenaiResponse] = useState<string | null>(null);
  const [openaiLoading, setOpenaiLoading] = useState(false);
  const [openaiError, setOpenaiError] = useState<string | null>(null);

  const [target, setTarget] = useState<Targets>("HoloMeet_Pro");

  const handleQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `/query?q=${encodeURIComponent(query)}&target=${target}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch");
      }
      const data = await response.json();
      setResult(data);
    } catch {
      setError("Failed to process query");
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setChatLoading(true);
    setCurrentResponse("");

    try {
      const response = await fetch("/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: chatInput,
          messages: chatMessages,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch chat response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let fullResponse = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        fullResponse += chunk;
        setCurrentResponse(fullResponse);
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: fullResponse,
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
      setCurrentResponse("");
    } catch {
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Sorry, I encountered an error processing your message.",
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleOpenaiQuery = async () => {
    if (!openaiQuery.trim()) return;

    setOpenaiLoading(true);
    setOpenaiError(null);
    setOpenaiResponse(null);

    try {
      const response = await fetch(
        `/openai_query?q=${encodeURIComponent(openaiQuery)}&target=${target}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch OpenAI response");
      }
      const data = await response.json();
      setOpenaiResponse(data.text);
    } catch {
      setOpenaiError("Failed to process OpenAI query");
    } finally {
      setOpenaiLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, currentResponse]);

  return (
    <>
      <h1>AutoRAG Query & Chat</h1>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="target">Select Target:</label>
        <select
          id="target"
          value={target}
          onChange={(e) => setTarget(e.target.value as Targets)}
          style={{ marginLeft: "0.5rem", padding: "0.25rem" }}
        >
          <option value="HoloMeet_Pro">HoloMeet Pro</option>
          <option value="NeuroNote_X">NeuroNote X</option>
        </select>
      </div>

      <p>
        Current target: <strong>{target}</strong>
      </p>
      <div
        style={{
          display: "flex",
          gap: "2rem",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div style={{ flex: 1 }}>
          <h2>Search</h2>
          <div className="card">
            <div style={{ marginBottom: "1rem" }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your query..."
                style={{
                  padding: "0.5rem",
                  fontSize: "1rem",
                  width: "300px",
                  marginRight: "0.5rem",
                }}
              />
              <button
                onClick={handleQuery}
                disabled={loading || !query.trim()}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "1rem",
                }}
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
            {error && (
              <div style={{ color: "red", marginBottom: "1rem" }}>
                Error: {error}
              </div>
            )}
            {result && (
              <div
                style={{
                  textAlign: "left",
                  maxWidth: "800px",
                  margin: "0 auto",
                }}
              >
                <h3>Response:</h3>
                <p
                  style={{
                    color: "black",
                    background: "#f5f5f5",
                    padding: "1rem",
                    borderRadius: "4px",
                    lineHeight: "1.6",
                  }}
                >
                  {result.response}
                </p>

                {result.data && result.data.length > 0 && (
                  <div style={{ marginTop: "2rem" }}>
                    <h4>Sources ({result.data.length} documents):</h4>
                    {result.data.map((source) => (
                      <div
                        key={source.file_id}
                        style={{
                          color: "black",
                          background: "#f9f9f9",
                          padding: "1rem",
                          marginBottom: "1rem",
                          borderRadius: "4px",
                          border: "1px solid #e0e0e0",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <strong>{source.filename}</strong>
                          <span style={{ fontSize: "0.9em", color: "#666" }}>
                            Score: {(source.score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "0.9em",
                            color: "#666",
                            marginBottom: "0.5rem",
                          }}
                        >
                          File ID: {source.file_id}
                        </div>
                        {source.content && source.content.length > 0 && (
                          <div>
                            <strong>Content:</strong>
                            <div
                              style={{ marginTop: "0.5rem", fontSize: "0.9em" }}
                            >
                              {Array.isArray(source.content)
                                ? source.content
                                    .map((c) => JSON.stringify(c, null, 2))
                                    .join(" ")
                                : String(
                                    JSON.stringify(source.content, null, 2)
                                  )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    marginTop: "1rem",
                    fontSize: "0.9em",
                    color: "#666",
                  }}
                >
                  <div>Search Query: "{result.search_query}"</div>
                  {result.has_more && <div>More results available...</div>}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* 追加 */}
        <div style={{ flex: 1 }}>
          <h2>Chat</h2>
          <div
            className="card"
            style={{
              height: "600px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
                padding: "1rem",
                marginBottom: "1rem",
                backgroundColor: "#fafafa",
                color: "#333",
              }}
            >
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "1rem",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    backgroundColor:
                      message.role === "user" ? "#e3f2fd" : "#f5f5f5",
                    marginLeft: message.role === "user" ? "2rem" : "0",
                    marginRight: message.role === "assistant" ? "2rem" : "0",
                    textAlign: message.role === "user" ? "right" : "left",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "bold",
                      marginBottom: "0.25rem",
                      fontSize: "0.9em",
                    }}
                  >
                    {message.role === "user" ? "You" : "Assistant"}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>
                    {message.content}
                  </div>
                </div>
              ))}

              {chatLoading && currentResponse && (
                <div
                  style={{
                    marginBottom: "1rem",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    backgroundColor: "#f5f5f5",
                    marginRight: "2rem",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "bold",
                      marginBottom: "0.25rem",
                      fontSize: "0.9em",
                    }}
                  >
                    Assistant
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>
                    {currentResponse}
                  </div>
                </div>
              )}

              {chatLoading && !currentResponse && (
                <div
                  style={{
                    marginBottom: "1rem",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    backgroundColor: "#f5f5f5",
                    marginRight: "2rem",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "bold",
                      marginBottom: "0.25rem",
                      fontSize: "0.9em",
                    }}
                  >
                    Assistant
                  </div>
                  <div>Thinking...</div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your message..."
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  fontSize: "1rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
                disabled={chatLoading}
              />
              <button
                onClick={handleChat}
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  padding: "0.75rem 1.5rem",
                  fontSize: "1rem",
                  borderRadius: "4px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  cursor: chatLoading ? "not-allowed" : "pointer",
                }}
              >
                {chatLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <h2>OpenAI Search</h2>
          <div className="card">
            <div style={{ marginBottom: "1rem" }}>
              <input
                type="text"
                value={openaiQuery}
                onChange={(e) => setOpenaiQuery(e.target.value)}
                placeholder="Enter your query..."
                style={{
                  padding: "0.5rem",
                  fontSize: "1rem",
                  width: "300px",
                  marginRight: "0.5rem",
                }}
              />
              <button
                onClick={handleOpenaiQuery}
                disabled={openaiLoading || !openaiQuery.trim()}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "1rem",
                }}
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
            {openaiError && (
              <div style={{ color: "red", marginBottom: "1rem" }}>
                Error: {openaiError}
              </div>
            )}
            {openaiResponse && (
              <div
                style={{
                  textAlign: "left",
                  maxWidth: "800px",
                  margin: "0 auto",
                }}
              >
                <h3>Response:</h3>
                <p
                  style={{
                    color: "black",
                    background: "#f5f5f5",
                    padding: "1rem",
                    borderRadius: "4px",
                    lineHeight: "1.6",
                  }}
                >
                  {openaiResponse}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
