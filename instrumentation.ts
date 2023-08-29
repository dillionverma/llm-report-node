/*instrumentation.ts*/
import {
  HttpInstrumentation,
  HttpInstrumentationConfig,
} from "@opentelemetry/instrumentation-http";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LlmReportExporter } from "./exporter";

const configuration: HttpInstrumentationConfig = {
  ignoreOutgoingRequestHook: (options) => {
    // Only trace requests to the OpenAI API
    return options.hostname !== "api.openai.com";
  },
  requestHook: (span, options: any) => {
    // Intercept request to add body to span
    const chunks: Buffer[] = [];
    const originalWrite = options.write;
    const originalEnd = options.end;

    options.write = function (chunk: any) {
      chunks.push(Buffer.from(chunk));
      originalWrite.apply(this, arguments);
    };

    options.end = function (chunk: any) {
      if (chunk) chunks.push(Buffer.from(chunk));
      const requestBody = Buffer.concat(chunks).toString();
      span.setAttribute("http.request.body", requestBody);
      originalEnd.apply(this, arguments);
    };

    return options;
  },
  startOutgoingSpanHook: (request) => {
    // Add request headers to span
    return {
      "http.request.headers": JSON.stringify(request.headers),
    } as any;
  },
  responseHook: (span, response: any) => {
    // Add response headers and body to span
    span.setAttribute(
      "http.response.headers",
      JSON.stringify(response.headers)
    );

    let body = "";
    response.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    response.on("end", () => {
      span.setAttribute("http.response.body", body);
      response.removeAllListeners();
    });
  },
};

export const llmReportSdk = (
  apiKey: string,
  loggingApiUrl: string = "https://llm.report/api/v1/log/openai"
) => {
  return new NodeSDK({
    traceExporter: new LlmReportExporter(apiKey, loggingApiUrl),
    instrumentations: [new HttpInstrumentation(configuration)],
  });
};
