// ---- Element refs ----
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const errorBanner = document.getElementById('errorBanner');

const processingEl = document.getElementById('processing');
const statusText = document.getElementById('statusText');

const resultsEl = document.getElementById('results');
const sourceBadge = document.getElementById('sourceBadge');
const filenameLabel = document.getElementById('filenameLabel');
const statsLabel = document.getElementById('statsLabel');
const lengthToggle = document.getElementById('lengthToggle');
const summaryTextEl = document.getElementById('summaryText');
const keywordsEl = document.getElementById('keywords');
const rawTextEl = document.getElementById('rawText');
const copyBtn = document.getElementById('copyBtn');
const resetBtn = document.getElementById('resetBtn');

// pdf.js worker
if (window['pdfjsLib']) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

let currentText = '';
let currentLength = 'medium';

const HIGHLIGHTER_SVG = `<svg viewBox="0 0 100 10" preserveAspectRatio="none">
  <path d="M1,7 Q25,2 50,6 T99,5" stroke="#FFD23F" stroke-width="7" fill="none" stroke-linecap="round"/>
</svg>`;

// ---- State helpers ----
function showState(state) {
  dropzone.style.display = state === 'upload' ? 'block' : 'none';
  processingEl.style.display = state === 'processing' ? 'block' : 'none';
  resultsEl.style.display = state === 'results' ? 'block' : 'none';
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.style.display = 'block';
  showState('upload');
}

function clearError() {
  errorBanner.style.display = 'none';
  errorBanner.textContent = '';
}

function setStatus(msg) {
  statusText.textContent = msg;
}

// ---- Upload wiring ----
browseBtn.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('click', (e) => {
  if (e.target !== browseBtn) fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
});

['dragenter', 'dragover'].forEach(evt => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
});
['dragleave', 'drop'].forEach(evt => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
  });
});
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) handleFile(file);
});

resetBtn.addEventListener('click', () => {
  currentText = '';
  fileInput.value = '';
  clearError();
  showState('upload');
});

// ---- Main handler ----
async function handleFile(file) {
  clearError();

  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isImage = file.type.startsWith('image/');

  if (!isPdf && !isImage) {
    showError('Unsupported file type. Please upload a PDF, JPG, PNG, or WEBP file.');
    return;
  }

  const maxSizeMB = 25;
  if (file.size > maxSizeMB * 1024 * 1024) {
    showError(`File is too large. Please upload something under ${maxSizeMB}MB.`);
    return;
  }

  showState('processing');

  try {
    let text = '';
    if (isPdf) {
      setStatus('Parsing PDF pages…');
      text = await extractPdfText(file);
      if (!text.trim()) {
        setStatus('No embedded text found — running OCR instead…');
        text = await extractPdfViaOcr(file);
      }
      renderResults(text, file.name, 'PDF');
    } else {
      setStatus('Running OCR on image…');
      text = await extractImageText(file);
      renderResults(text, file.name, 'OCR');
    }
  } catch (err) {
    console.error(err);
    showError('Something went wrong while reading that file. Please try a different file, or a clearer scan.');
  }
}

// ---- PDF extraction ----
async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    setStatus(`Extracting text — page ${i} of ${pdf.numPages}…`);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n\n';
  }
  return fullText.trim();
}

// Fallback for scanned PDFs with no embedded text: rasterize pages and OCR them.
async function extractPdfViaOcr(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const worker = await Tesseract.createWorker('eng');
  let fullText = '';
  const pageLimit = Math.min(pdf.numPages, 8); // cap to keep it fast for the assignment scope
  for (let i = 1; i <= pageLimit; i++) {
    setStatus(`OCR reading page ${i} of ${pageLimit}…`);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const { data } = await worker.recognize(canvas);
    fullText += data.text + '\n\n';
  }
  await worker.terminate();
  return fullText.trim();
}

// ---- Image OCR ----
async function extractImageText(file) {
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        setStatus(`Reading image — ${Math.round(m.progress * 100)}%…`);
      }
    }
  });
  const { data } = await worker.recognize(file);
  await worker.terminate();
  return data.text.trim();
}

// ---- Results rendering ----
function renderResults(text, filename, sourceType) {
  if (!text || text.trim().length < 20) {
    showError('Couldn\'t find enough readable text in that file. Try a clearer scan or a text-based PDF.');
    return;
  }

  currentText = text;
  sourceBadge.textContent = sourceType;
  filenameLabel.textContent = filename;
  rawTextEl.textContent = text;

  const wordCount = (text.match(/\S+/g) || []).length;
  statsLabel.textContent = `${wordCount.toLocaleString()} words extracted`;

  renderSummary();
  showState('results');
}

function renderSummary() {
  const { summary, sentences, keywords } = summarize(currentText, currentLength);

  summaryTextEl.innerHTML = sentences
    .map(s => `<mark>${HIGHLIGHTER_SVG}${escapeHtml(s)}</mark>`)
    .join(' ');

  keywordsEl.innerHTML = keywords
    .map(k => `<span>${escapeHtml(k)}</span>`)
    .join('');

  const summaryWordCount = (summary.match(/\S+/g) || []).length;
  const originalWordCount = (currentText.match(/\S+/g) || []).length;
  const reduction = originalWordCount > 0
    ? Math.round((1 - summaryWordCount / originalWordCount) * 100)
    : 0;
  statsLabel.textContent = `${originalWordCount.toLocaleString()} words → ${summaryWordCount.toLocaleString()} words (${reduction}% shorter)`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Length toggle ----
lengthToggle.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-len]');
  if (!btn) return;
  currentLength = btn.dataset.len;
  [...lengthToggle.querySelectorAll('button')].forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderSummary();
});

// ---- Copy ----
copyBtn.addEventListener('click', async () => {
  const { summary } = summarize(currentText, currentLength);
  try {
    await navigator.clipboard.writeText(summary);
    const original = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    setTimeout(() => (copyBtn.textContent = original), 1500);
  } catch (err) {
    showError('Could not copy to clipboard. Please select and copy the text manually.');
  }
});
