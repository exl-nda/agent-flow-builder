# Agentflow wiring: digitization → classify / extract

Use this layout so scanned PDFs are OCR’d once while text-based PDFs skip Azure.

## Flow

1. **startAgentflow** — define any `startState` keys you need.
2. **Upload** — user attaches a PDF (same Flowise upload behavior as other Agentflows).
3. **toolAgentflow** — **Document Digitization Check** (`documentDigitizationCheck`). No tool arguments; it uses `options.uploads` for the first `application/pdf`.
4. **conditionAgentflow** — string **Equal** (variables work on string rows; `isDigitized` is `"true"` / `"false"`):
   - type: **String**
   - `value1`: `{{ <checkToolNodeId>.output.isDigitized }}`
   - `operation`: **Equal**
   - `value2`: `true` (literal string, not boolean)
5. **Branch “true” (already digitized)** — **llmAgentflow**: pass document text via `{{ <checkToolNodeId>.output.text }}` in the user message or system prompt.
6. **Branch “false”** — **toolAgentflow** — **Azure Document Intelligence Digitize** (`azureDocumentIntelligenceDigitize`) with **Azure AI Document Intelligence** credential. Then **llmAgentflow** using `{{ <azureToolNodeId>.output.content }}`.
7. **Converge** — both branches can feed the same **llmAgentflow** configured for JSON classification + field extraction (e.g. `documentType`: `invoice` | `purchase_order` | `shipment_notice`).

## Template variables

| Source node        | Variable examples |
|--------------------|-------------------|
| Digitization check | `{{ node.output.isDigitized }}` (`"true"` \| `"false"`), `{{ node.output.text }}` |
| Azure OCR tool     | `{{ node.output.content }}` (plain string) |

The Tool node always exposes string OCR / text as `output.content`; the check tool also sets `output.isDigitized` and `output.text` when its JSON result is detected.

## Credentials

Create an **Azure AI Document Intelligence** credential (endpoint + key + API version) and assign it to the Azure digitize tool node.

## Manual testing

- **Scanned PDF**: `isDigitized` should be `false`; Azure branch should return non-empty `content`.
- **Digital PDF**: `isDigitized` should be `true`; you can skip Azure and use `output.text` from the check step.
