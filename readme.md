# Integrating llm-report npm Package

## Installation

To begin, make sure you have npm installed on your machine. Then, Run the following command in your project terminal:

```bash
pnpm install llm-report
```

This will install the `llm-report` package and its dependencies into your project.

## Initializing the Package

Once the installation is complete, you can start integrating the llm-report package into your application. If you are using Express.js as your server framework, you will need to import the llmReportSdk module and initialize it with your API key. Here is an example:

```javascript
import { llmReportSdk } from "llm-report";

const sdk = llmReportSdk("api key here");
sdk.start();
```

Make sure to replace "api key here" with your actual API key. If you don't have an API key, you can obtain one by visiting the [llm.report website](https://llm.report/).

## Shutting Down the Package

Once you are done using the llm-report package in your application, it is important to properly shut it down to release any resources it may be using. You can do this by calling the `sdk.shutdown()` method. Here is an example:

```javascript
sdk.shutdown();
```

Make sure to include this code when you are gracefully shutting down your server or when you no longer need to use llm reports.
