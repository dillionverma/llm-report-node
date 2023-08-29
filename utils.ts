import GPT3Tokenizer from "gpt3-tokenizer";
import * as crypto from "crypto";

export type Message = {
  role: string;
  content: string;
  name?: string;
  function_call?: string;
};

export function numTokensFromMessages(
  messages: Message[],
  model: string = "gpt-3.5-turbo-0613"
): number {
  const tokenizer = new GPT3Tokenizer({ type: "codex" });
  let tokensPerMessage: number;
  let tokensPerName: number;
  if (
    [
      "gpt-3.5-turbo-0613",
      "gpt-3.5-turbo-16k-0613",
      "gpt-4-0314",
      "gpt-4-32k-0314",
      "gpt-4-0613",
      "gpt-4-32k-0613",
    ].includes(model)
  ) {
    tokensPerMessage = 3;
    tokensPerName = 1;
  } else if (model === "gpt-3.5-turbo-0301") {
    tokensPerMessage = 4; // every message follows {role/name}\n{content}\n
    tokensPerName = -1; // if there's a name, the role is omitted
  } else if (model.includes("gpt-3.5-turbo")) {
    console.log(
      "Warning: gpt-3.5-turbo may update over time. Returning num tokens assuming gpt-3.5-turbo-0613."
    );
    return numTokensFromMessages(messages, "gpt-3.5-turbo-0613");
  } else if (model.includes("gpt-4")) {
    console.log(
      "Warning: gpt-4 may update over time. Returning num tokens assuming gpt-4-0613."
    );
    return numTokensFromMessages(messages, "gpt-4-0613");
  } else {
    throw new Error(
      `numTokensFromMessages() is not implemented for model ${model}. See https://github.com/openai/openai-python/blob/main/chatml.md for information on how messages are converted to tokens.`
    );
  }

  let numTokens = 0;
  for (const message of messages) {
    numTokens += tokensPerMessage;
    for (const [key, value] of Object.entries(message)) {
      const encoded = tokenizer.encode(value);
      numTokens += encoded.bpe.length;
      if (key === "name") {
        numTokens += tokensPerName;
      }
    }
  }
  numTokens += 3; // every reply is primed with assistant
  return numTokens;
}

const tokenizer = new GPT3Tokenizer({ type: "gpt3" }); // or 'codex'

// https://github.com/botisan-ai/gpt3-tokenizer#readme
export const getTokenCount = (str: string) => {
  const encoded: { bpe: number[]; text: string[] } = tokenizer.encode(str);
  return encoded.bpe.length;
};

export function sha256(key: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(key);
  return hash.digest("hex");
}

export function hrTimeToMilliseconds(hrTime: [number, number]): number {
  const milliseconds = hrTime[0] * 1000 + hrTime[1] / 1000000;
  return milliseconds;
}
