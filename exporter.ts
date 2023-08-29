import { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import axios from "axios";
import { ExportResultCode, ExportResult } from "@opentelemetry/core";
import {
  numTokensFromMessages,
  getTokenCount,
  sha256,
  hrTimeToMilliseconds,
} from "./utils";

export class LlmReportExporter implements SpanExporter {
  private serverAddress: string;
  private xApiKey: string;

  constructor(apiKey: string, serverAddress: string) {
    this.xApiKey = apiKey;
    this.serverAddress = serverAddress;
  }

  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void
  ) {
    spans.forEach(async (span) => {
      if (checkOpenAIUrl(span.attributes["http.url"]?.toString())) {
        try {
          const data = {
            ...convertToOutputFormat(span.attributes),
            duration_in_ms: hrTimeToMilliseconds(span.duration),
          };

          await axios.post(this.serverAddress, data, {
            headers: {
              "x-api-key": this.xApiKey,
            },
          });
        } catch (error) {
          console.error(error);
        }
      }
    });

    return resultCallback({ code: ExportResultCode.SUCCESS });
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

function checkOpenAIUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes("api.openai.com");
}

function convertToOutputFormat(attributes: any) {
  let rb = attributes["http.response.body"];
  let data: any;
  let completion = "";
  try {
    data = JSON.parse(rb);
    try {
      completion = data["choices"][0]["message"]["content"];
    } catch (error) {
      completion = "";
    }
  } catch {
    rb = rb
      .split("\n\n")
      .filter((line: string) => line !== "")
      .map((line: string) =>
        line.startsWith("data:") ? line.substring(6) : line
      )
      .filter((line: string) => line !== "[DONE]");
    rb.forEach((line: string) => {
      let chunkData = JSON.parse(line);
      if (chunkData.choices[0].delta.hasOwnProperty("content")) {
        completion += chunkData.choices[0].delta.content;
      }
    });

    data = JSON.parse(rb[rb.length - 1]);
  }

  const requestHeaders = attributes["http.request.headers"];
  const parsedRequestHeaders = JSON.parse(requestHeaders);
  const authorization = parsedRequestHeaders["Authorization"];
  if (authorization) {
    delete parsedRequestHeaders["Authorization"];
  }
  const userId = parsedRequestHeaders["X-User-Id"] ?? undefined;

  const requestBody = attributes["http.request.body"];
  const parsedRequestBody = JSON.parse(requestBody);
  const model = parsedRequestBody["model"] ?? "";
  const streamed = parsedRequestBody["stream"] ?? false;
  let prompt_tokens = 0;
  let completion_tokens = 0;

  if (data["usage"]) {
    prompt_tokens = data["usage"]["prompt_tokens"];
    completion_tokens = data["usage"]["completion_tokens"];
  } else {
    if (parsedRequestBody["messages"]) {
      prompt_tokens = numTokensFromMessages(parsedRequestBody["messages"]);
      completion_tokens = getTokenCount(completion);
    }
  }

  const hashed_key =
    authorization.split(" ")[1] && authorization.split(" ")[1] !== "undefined"
      ? sha256(authorization.split(" ")[1])
      : undefined;

  return {
    provider_id: data["id"] ?? "",
    user_id: userId,
    url: attributes["http.url"],
    method: attributes["http.method"],
    status: attributes["http.status_code"],
    streamed,
    model,
    prompt_tokens,
    completion_tokens,
    hashed_key,
    completion: completion,
    request_headers: JSON.stringify(parsedRequestHeaders),
    request_body: requestBody,
    response_headers: attributes["http.response.headers"],
    response_body: attributes["http.response.body"],
  };
}
