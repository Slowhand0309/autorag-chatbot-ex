import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { Hono } from "hono";
import { streamText } from "hono/streaming";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/", (c) => c.json({ name: "Cloudflare" }));

app.get("/openai_query", async (c) => {
  const query = c.req.query("q");
  const target = c.req.query("target");
  if (!query) {
    return c.json({ error: "Query parameter is required" }, 400);
  }
  if (!target) {
    return c.json({ error: "Target parameter is required" }, 400);
  }

  try {
    const result = await c.env.AI.autorag("autorag-chatbot-ex").search({
      query,
      rewrite_query: true,
      filters: {
        type: "eq",
        key: "folder",
        value: `${target}/`,
      },
    });
    if (result.data.length === 0) {
      return Response.json({ text: `No data found for query "${query}"` });
    }
    const chunks = result.data
      .map((item) => {
        const data = item.content
          .map((content) => {
            return content.text;
          })
          .join("\n\n");

        return `<file name="${item.filename}">${data}</file>`;
      })
      .join("\n\n");
    const generateResult = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant and your task is to answer the user question using the provided files.",
        },
        { role: "user", content: chunks },
        { role: "user", content: query },
      ],
    });
    return c.json(generateResult);
  } catch (error) {
    console.error("AutoRAG query failed:", error);
    return c.json({ error: "Failed to process query" }, 500);
  }
});

app.get("/query", async (c) => {
  const query = c.req.query("q");
  const target = c.req.query("target");
  if (!query) {
    return c.json({ error: "Query parameter is required" }, 400);
  }
  if (!target) {
    return c.json({ error: "Target parameter is required" }, 400);
  }

  try {
    const result = await c.env.AI.autorag("autorag-chatbot-ex").aiSearch({
      query,
      rewrite_query: true,
      filters: {
        type: "eq",
        key: "folder",
        value: `${target}/`,
      },
    });
    return c.json(result);
  } catch (error) {
    console.error("AutoRAG query failed:", error);
    return c.json({ error: "Failed to process query" }, 500);
  }
});

app.post("/chat", async (c) => {
  try {
    const body = await c.req.json();
    const { query, messages } = body;

    if (!query) {
      return c.json({ error: "Query parameter is required" }, 400);
    }

    return streamText(c, async (stream) => {
      let contextQuery = query;

      if (messages && messages.length > 0) {
        const recentMessages = messages.slice(-6);
        const context = recentMessages
          .map(
            (msg: { role: string; content: string }) =>
              `${msg.role}: ${msg.content}`
          )
          .join("\n");
        contextQuery = `Previous conversation:\n${context}\n\nCurrent question: ${query}`;
      }

      const result = await c.env.AI.autorag("autorag-chatbot-ex").aiSearch({
        query: contextQuery,
        rewrite_query: true,
      });

      if (result && result.response) {
        stream.write(result.response);
      }
    });
  } catch (error) {
    console.error("AutoRAG chat failed:", error);
    return c.json({ error: "Failed to process chat" }, 500);
  }
});

export default app;
