# Approach (≤200 words)

I built the Document Summary Assistant as a single-page, dependency-free static app — plain HTML/CSS/JS with no build step — so it deploys anywhere and is trivial for a reviewer to run.

**Extraction:** PDFs are parsed with pdf.js to preserve embedded text and reading order. If a PDF has no embedded text (i.e., it's a scanned document), the app automatically falls back to rendering each page to a canvas and running OCR with Tesseract.js. Standalone images go straight through the same OCR path.

**Summarization:** rather than depend on an external AI API (which requires the reviewer to supply their own key and adds network fragility), I implemented a transparent extractive summarizer: sentences are scored by the frequency of their meaningful words (stopwords removed), normalized by length, with a small boost for early sentences. Top-scoring sentences are selected for the chosen length (short/medium/long) and restored to their original order.

**UX:** drag-and-drop upload, a scanning-line loading state, highlighter-style emphasis on selected summary sentences, key-term chips, copy-to-clipboard, and mobile-responsive layout with visible error states for unsupported files or unreadable scans.

Everything runs client-side — no server, no stored files, no API costs.
