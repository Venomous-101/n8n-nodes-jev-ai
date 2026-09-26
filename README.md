# n8n-nodes-jev-ai

[![npm version](https://img.shields.io/npm/v/n8n-nodes-jev-ai.svg)](https://www.npmjs.com/package/n8n-nodes-jev-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![n8n community node](https://img.shields.io/badge/n8n-community--node-ea4b71.svg)](https://n8n.io)

An n8n community node for **TypeSafe Jev**, the System-1 decision intelligence model. 

Traditional conversational LLMs are designed to generate natural language text, which makes them slow, expensive, and prone to formatting errors when used strictly for software logic. Jev is purpose-built for deterministic decision tasks: it evaluates inputs against typed questions and returns structured decisions with calibrated probabilities in under a second.

---

## Why Jev in n8n Workflows?

| Feature | Standard LLM (GPT-4 / Claude) | TypeSafe Jev AI |
| :--- | :--- | :--- |
| **Output Type** | Unstructured text or Markdown | Typed primitives (Choice, Score, Boolean) |
| **Confidence** | Subjective / Uncalibrated | Mathematical probabilities (0.0 to 1.0) |
| **Latency** | 2,000ms - 8,000ms | 100ms - 400ms |
| **Hallucination Risk** | High | Zero (constrained schema) |
| **Cost** | High token overhead | Fraction of conversational LLM cost |

---

## Core Capabilities

### 1. Ask Questions
Evaluate text or structured JSON state across three distinct decision primitives:
* **Choice:** Multi-class classification with confidence scores and full probability distributions across all choices.
* **Score:** Ordinal numerical ratings evaluated against sequential criteria (for example, urgency levels 1 through 5, sentiment severity, or customer frustration).
* **Noul:** Calibrated boolean decisions (Yes / No) with explicit positive and negative criteria.

### 2. Route by Choice
Split incoming data across multiple visual branches directly on the n8n canvas:
* Each configured choice dynamically generates a distinct output port on the node.
* Includes an automated **Low Confidence** fallback port. If Jev's certainty falls below your configured threshold, the item routes to human review rather than executing automated downstream actions.

### 3. Policy & Safety Guardrails
Evaluate user prompts, external payloads, or generative model completions against security and compliance rules:
* Configurable actions on violation: split execution into Passed and Violated branches, raise an error to halt the workflow, or flag the payload with violation metrics.

### 4. Native AI Agent Tool
The node implements `usableAsTool: true`. You can connect Jev AI directly to the Tools input of n8n's LangChain AI Agent nodes, allowing conversational agents to delegate fast, deterministic routing decisions without extra token overhead.

---

## Installation

### Method 1: Community Nodes (Recommended)
1. In your n8n workspace, navigate to **Settings** > **Community Nodes**.
2. Click **Install a community node**.
3. Enter `n8n-nodes-jev-ai` in the package name field.
4. Accept the community node terms and click **Install**.

### Method 2: Docker / Self-Hosted CLI
Run the following command inside your n8n installation directory:
```bash
npm install n8n-nodes-jev-ai
```
Restart your n8n instance after installation.

---

## Credentials Setup

1. Obtain your API key from the [TypeSafe Console](https://console.typesafe.ai).
2. In n8n, create a new credential and select **Jev AI API**.
3. Enter your **API Key** (prefixed with `ts_`).
4. (Optional) Provide a custom **Base URL** (defaults to `https://api.typesafe.ai/v1`).
5. Click **Save**. n8n validates the credential with an automated health check against the endpoint.

---

## Operations Reference

### Operation: Ask Questions (`askQuestions`)

Evaluates the incoming state against one or more questions configured via Form Builder or raw JSON.

#### Example Input State:
```json
{
  "ticketId": "TCK-8041",
  "text": "I was double billed on invoice INV-204. Please reverse the duplicate charge."
}
```

#### Example Output:
```json
{
  "ticketId": "TCK-8041",
  "text": "I was double billed on invoice INV-204. Please reverse the duplicate charge.",
  "jev": {
    "department": "billing",
    "department_confidence": 0.96,
    "department_probabilities": {
      "billing": 0.96,
      "technical": 0.03,
      "sales": 0.01
    },
    "_model": "jev-1.13.0"
  }
}
```

---

### Operation: Route by Choice (`route`)

Directs each item to a designated output connector based on the evaluated choice.

1. **Routing Instructions:** The prompt question guiding the model (for example, *Which team should handle this inquiry?*).
2. **Routes:** Define two or more target routes with descriptions.
3. **Confidence Threshold:** Items where top-choice confidence is below this value (default `0.60`) automatically divert to the **Low Confidence** branch.

---

### Operation: Policy Guardrail (`guardrail`)

Validates content against safety, data privacy, or compliance criteria.

* **Policy Criteria:** Plain text description of what constitutes a violation (for example, *Contains API keys, passwords, or personal identifying numbers*).
* **Action on Violation:**
  * `Split into Passed / Violated Outputs`: Directs compliant items to Port 1 and violations to Port 2.
  * `Stop Workflow with Error`: Halts workflow execution immediately.
  * `Flag in Output Only`: Adds `jev_guardrail` metadata to the item without altering workflow flow.

---

## Security and Reliability

* **Zero Runtime Dependencies:** The package ships with zero third-party runtime npm dependencies, eliminating supply-chain vulnerabilities.
* **Prototype Pollution Protection:** Property parsing explicitly validates and rejects object prototype keys (`__proto__`, `constructor`, `prototype`).
* **Protocol Validation:** Strict URL parsing ensures only `http:` and `https:` endpoints can be queried.
* **Memory Exhaustion Defense:** Payload inputs have a 2MB length safety threshold to prevent memory consumption attacks.
* **Transient Error Handling:** Built-in exponential backoff with jitter automatically handles rate limits (`429`), server overload (`529`), and temporary cloud gateway responses (`502`, `503`, `504`).

---

## Local Development

```bash
# Clone the repository
git clone https://github.com/Venomous-101/n8n-nodes-jev-ai.git
cd n8n-nodes-jev-ai

# Install dependencies
npm install

# Compile TypeScript and copy assets
npm run build

# Watch mode during development
npm run dev
```

---

## License

[MIT](LICENSE) © Ali Abdullah
