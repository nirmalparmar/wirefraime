import { BaseLlm, BaseLlmConnection, LlmRequest, LlmResponse } from "@google/adk";
import type { Part } from "@google/genai";

export class OpenAILlm extends BaseLlm {
  constructor(modelName: string) {
    super({ model: modelName });
  }

  async connect(llmRequest: LlmRequest): Promise<BaseLlmConnection> {
    throw new Error("Live connect not supported for OpenAILlm");
  }

  async *generateContentAsync(llmRequest: LlmRequest, stream?: boolean): AsyncGenerator<LlmResponse, void> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not set");
    }

    const messages = llmRequest.contents.map((content) => {
      // Map ADK roles to OpenAI roles
      let role = content.role === "model" ? "assistant" : "user";
      if (content.role === "system") role = "system";

      const parts = content.parts?.map((part: Part) => {
        if (part.text) {
          return { type: "text", text: part.text };
        } else if (part.inlineData) {
          return {
            type: "image_url",
            image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` },
          };
        }
        return { type: "text", text: "" };
      }) || [];

      // OpenRouter supports string for purely text messages, or array for multimodal
      const msgContent = parts.length === 1 && parts[0].type === "text" 
        ? parts[0].text 
        : parts;

      return { role, content: msgContent };
    });

    const body: any = {
      model: this.model,
      stream: stream ?? true,
      messages,
      temperature: llmRequest.config?.temperature ?? 0.7,
      max_tokens: llmRequest.config?.maxOutputTokens ?? 8192,
    };

    if (llmRequest.config?.responseSchema) {
      body.response_format = {
        type: "json_schema",
        json_schema: {
          name: "output_schema",
          schema: llmRequest.config.responseSchema,
        }
      };
    } else if (llmRequest.config?.responseMimeType === "application/json") {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://wirefraime.app",
        "X-Title": "Wirefraime",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      const txt = await res.text().catch(() => "");
      throw new Error(`OpenRouter error ${res.status}: ${txt}`);
    }

    if (stream || body.stream) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          
          for (const line of frame.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") return;
            
            try {
              const data = JSON.parse(dataStr);
              const text = data.choices?.[0]?.delta?.content;
              if (text) {
                yield {
                  content: { role: "model", parts: [{ text }] },
                  partial: true,
                  turnComplete: false
                };
              }
            } catch (e) {
              // ignore parse errors for partial chunks
            }
          }
        }
      }
    } else {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";
      yield {
        content: { role: "model", parts: [{ text }] },
        partial: false,
        turnComplete: true
      };
    }
  }
}
