# Document Summary Assistant

Upload a PDF or a scanned image, and get an instant, adjustable-length summary with key terms highlighted — all processed entirely in the browser, no backend, no API keys.

**Live demo:** 

## Features

- **Upload:** drag-and-drop or click-to-browse, for PDF, JPG, PNG, and WEBP files
- **Text extraction:**
  - PDFs are parsed directly with [pdf.js](https://mozilla.github.io/pdf.js/) (preserves reading order)
  - Scanned PDFs with no embedded text automatically fall back to OCR
  - Images are read with [Tesseract.js](https://tesseract.projectnaptha.com/) (OCR)
- **Summary generation:** short / medium / long length toggle, key terms extraction, highlighter-style emphasis on the sentences selected for the summary
- **UX:** scanning-line loading animation, inline error handling, mobile-responsive layout, "copy summary" and "view full extracted text" actions

## Why no AI API?

The assignment allows any free-tier AI/ML service, but API keys expire, get rate-limited, or require the reviewer to configure their own credentials to test the app. Instead, this uses a **transparent, dependency-free extractive summarization algorithm** (TF-based sentence scoring, similar in spirit to classic algorithms like Luhn's):

1. Split the extracted text into sentences.
2. Build a word-frequency table, ignoring common stopwords.
3. Score each sentence by the frequency of its meaningful words, normalized by sentence length, with a small boost for early sentences (lede effect).
4. Take the top-N scoring sentences for the chosen length, and restore their original order so the summary still reads naturally.

This means the app works instantly, offline-capable after first load, with zero cost and nothing to configure — and it's easy to swap in a real LLM API later (see `summarizer.js` — the `summarize()` function is the only place that would need to change).

## Tech stack

Plain HTML/CSS/JavaScript — no build step, no framework, no `npm install` required.

- `index.html` — markup + styles
- `app.js` — upload handling, PDF/OCR extraction, UI state
- `summarizer.js` — the extractive summarization engine

External libraries are loaded via CDN (pdf.js, Tesseract.js), so the project can be deployed as a static site with zero build tooling.

## Running locally

Just open `index.html` in a browser, or serve the folder with any static server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

## Deploying

This is a static site — drag the folder into [Netlify Drop](https://app.netlify.com/drop), or connect the GitHub repo to Netlify/Vercel and deploy with no build command and `/` as the publish directory.

## Known limitations

- OCR accuracy depends on scan quality; very low-resolution or skewed scans may extract poorly.
- Scanned (image-only) PDFs are capped at 8 pages for OCR to keep processing time reasonable in-browser.
- Summarization is extractive (selects real sentences from the source) rather than abstractive (generated new sentences), by design — see "Why no AI API?" above.
