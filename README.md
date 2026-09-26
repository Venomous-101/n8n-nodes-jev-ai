# n8n-nodes-jev-ai

[![npm version](https://img.shields.io/npm/v/n8n-nodes-jev-ai.svg)](https://www.npmjs.com/package/n8n-nodes-jev-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![n8n community node](https://img.shields.io/badge/n8n-community--node-ea4b71.svg)](https://n8n.io)

An advanced community node for [n8n](https://n8n.io/) that brings **TypeSafe Jev AI**—the groundbreaking **"System 1" decision intelligence model**—directly into your automated workflows and AI agents.

Unlike traditional conversational LLMs that generate free-form text token-by-token, **Jev is purpose-built for software logic**. It delivers structured, calibrated, and typed decisions (Choices, Scores, and Probabilities) with sub-second latency and zero hallucination risk.

---

## 🚀 Key Features

* **⚡ Ask Structured Questions (Parallel Evaluator):**
  Evaluate input state in parallel across three decision primitives:
  * **Choice:** Multi-class classification with complete probability distributions and confidence scores.
  * **Score:** Numerical ratings along ordered rubrics (e.g., urgency 1–5, customer frustration, risk severity).
  * **Noul:** Calibrated Yes/No boolean probabilities (0.0 to 1.0) with explicit criteria.

* **🔀 Route by Choice (Dynamic Visual Routing):**
  Dynamically generates visual output branches on your n8n canvas for each designated route, plus an automated **Low Confidence** fallback branch for human-in-the-loop review.

* **🛡️ Policy & Safety Guardrails:**
  Instantly evaluate LLM prompts or outputs against strict compliance rules, safety policies, secret leak detection, or hallucinations with configurable actions (split branch, flag output, or halt workflow).

* **🤖 Native AI Agent Tool Integration:**
  Exposed with `usableAsTool: true`—connect Jev directly into n8n's **AI Agent** nodes as a calibrated decision tool, allowing autonomous agents to execute swift, deterministic policy and routing decisions.

* **🔄 Resilience & Backoff:**
  Built-in exponential backoff and jitter handling for API rate limits (`429`) and server load (`529`), honoring `Retry-After` headers.

---

## 📦 Installation

### Via n8n Community Nodes (Recommended)
1. In your n8n workspace, navigate to **Settings** > **Community Nodes**.
2. Click **Install a community node**.
3. Enter `n8n-nodes-jev-ai` in the package name field.
4. Check the agreement box and click **Install**.

### Self-Hosted / Docker
Run the following command inside your n8n root directory:
```bash
npm install n8n-nodes-jev-ai
```
Or add `n8n-nodes-jev-ai` to your custom n8n Docker image dependencies.

---

## 🔑 Credentials Setup

1. Sign up and obtain an API key from the [TypeSafe Console](https://console.typesafe.ai).
2. In n8n, create a new credential and choose **Jev AI API**.
3. Enter your **API Key** (starts with `ts_`).
4. (Optional) Set the **Base URL** (default is `https://api.typesafe.ai/v1`).
5. Click **Save**—n8n will automatically verify the credential with a live health ping.

---

## 🛠️ Operations Guide

### 1. Ask Questions (`askQuestions`)
Evaluate any incoming text, support ticket, webhook payload, or JSON state with one or more typed questions.

#### Form Builder Mode
Define questions visually in the n8n UI:
* **Output Property ID:** Target key in the output (e.g. `department`).
* **Answer Type:** `Choice`, `Score`, or `Noul`.
* **Instructions:** Exact question for Jev (e.g., *Which department should resolve this ticket?*).
* **Options / Rubrics:** 
  ```text
  billing: Payment errors, invoices, refunds, charges
  technical: System crashes, API bugs, outages
  sales: Product inquiries, enterprise pricing, licenses
  ```

#### JSON Mode
Paste question definitions matching the official TypeSafe schema directly for maximum flexibility.

#### Sample Output (Simplified):
```json
{
  "message": "I was double charged for invoice INV-9021. Please issue a refund.",
  "jev": {
    "department": "billing",
    "department_confidence": 0.96,
    "department_probabilities": {
      "billing": 0.96,
      "technical": 0.03,
      "sales": 0.01
    },
    "is_urgent": true,
    "is_urgent_probability": 0.88,
    "_model": "jev-1.13.0"
  }
}
```

---

### 2. Route by Choice (`route`)
Split incoming items across multiple paths visually on the canvas.

1. **Routing Instructions:** e.g. *Which team should handle this inquiry?*
2. **Routes:** Add two or more named routes. Each route name becomes a distinct output connector on the node!
3. **Low Confidence Fallback:**
   * Set **Low Confidence Handling** to `Send to Low Confidence Output`.
   * Set **Confidence Threshold** (e.g. `0.65`).
   * Any item where Jev's top choice confidence falls below `0.65` will automatically be routed to the **Low Confidence** branch for manual human review!

---

### 3. Policy Guardrail (`guardrail`)
Safeguard AI pipelines against prompt injection, toxic content, data leaks, or policy violations.

* **Policy Criteria:** Plain English rules describing what constitutes a violation.
* **Action on Violation:**
  * `Split into Passed / Violated Outputs`: Output 1 receives compliant items; Output 2 receives violations.
  * `Stop Workflow with Error`: Halts execution immediately if a violation is detected.
  * `Flag in Output Only`: Appends `jev_guardrail: { passed: boolean, violation_probability: number }` to the item.

---

## 📂 Example Workflows

Pre-configured workflows are located in the [`examples/`](examples) directory:

1. **[Customer Ticket Routing](examples/workflow-ticket-routing.json):** Automatically classifies incoming tickets and routes them to `billing`, `technical`, `sales`, or `Low Confidence`.
2. **[LLM Guardrail Gate](examples/workflow-ai-guardrail.json):** Inspects generative AI responses before they reach end users or external databases.

To import: In n8n, click **Workflows** > **Import from File**, select the JSON file, and link your Jev AI credential.

---

## 💡 Best Practices for Jev AI

* **One Decision per Question:** Ask *Is it urgent?* and *Which team?* as separate questions rather than a compound question.
* **Clear Criteria:** Distinguish borderline cases inside your option descriptions.
* **Calibrated Thresholds:** High-stakes actions (such as automated refunds) should require higher confidence thresholds (e.g. `0.85+`), while low-stakes routing can operate safely around `0.55+`.

---

## 🧑‍💻 Development

```bash
# Install dependencies
npm install

# Compile TypeScript and copy assets
npm run build

# Watch mode during development
npm run dev
```

### Local Testing with n8n
To test locally inside your self-hosted n8n instance:
```bash
# In this directory:
npm link

# In your ~/.n8n/custom directory:
npm link n8n-nodes-jev-ai
```

## 📄 License

[MIT](LICENSE) © Ali Abdullah
