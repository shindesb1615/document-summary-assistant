/**
 * summarizer.js
 * A small, dependency-free extractive summarizer.
 *
 * Approach:
 * 1. Split raw text into sentences.
 * 2. Build a word-frequency table (stopwords removed).
 * 3. Score every sentence by the frequency of the meaningful words it
 *    contains, normalized by sentence length, with a small bonus for
 *    sentences near the start of the document (headline/lede effect).
 * 4. Take the top-N scoring sentences and re-order them back into the
 *    order they originally appeared, so the summary still reads
 *    naturally as a shortened version of the document.
 *
 * This is intentionally simple (TF-based extractive summarization,
 * similar in spirit to classic algorithms like Luhn's) so it needs no
 * external API, no API key, and no network call at summarize-time.
 */

const STOPWORDS = new Set(`a about above after again against all am an and any are aren't as at be
because been before being below between both but by can't cannot could couldn't did didn't do does
doesn't doing don't down during each few for from further had hadn't has hasn't have haven't having
he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in
into is isn't it it's its itself let's me more most mustn't my myself no nor not of off on once only
or other ought our ours ourselves out over own same shan't she she'd she'll she's should shouldn't so
some such than that that's the their theirs them themselves then there there's these they they'd
they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're
we've were weren't what what's when when's where where's which while who who's whom why why's with
won't would wouldn't you you'd you'll you're you've your yours yourself yourselves also just now
etc`.split(/\s+/));

function splitSentences(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  // Split on sentence-ending punctuation followed by a space and a capital/number/quote.
  const raw = clean.match(/[^.!?]+[.!?]+["')\]]?|[^.!?]+$/g) || [clean];
  return raw.map(s => s.trim()).filter(s => s.length > 0 && s.split(' ').length > 2);
}

function wordFrequencies(sentences) {
  const freq = {};
  sentences.forEach(sentence => {
    const words = sentence.toLowerCase().match(/[a-z0-9']+/g) || [];
    words.forEach(w => {
      if (w.length < 3 || STOPWORDS.has(w)) return;
      freq[w] = (freq[w] || 0) + 1;
    });
  });
  return freq;
}

function scoreSentences(sentences, freq) {
  return sentences.map((sentence, idx) => {
    const words = sentence.toLowerCase().match(/[a-z0-9']+/g) || [];
    const meaningful = words.filter(w => w.length >= 3 && !STOPWORDS.has(w));
    let raw = meaningful.reduce((sum, w) => sum + (freq[w] || 0), 0);
    const norm = meaningful.length > 0 ? raw / meaningful.length : 0;
    const positionBonus = idx < 3 ? 1.15 : 1.0; // lede sentences carry more weight
    return { sentence, idx, score: norm * positionBonus };
  });
}

const LENGTH_TARGETS = {
  short: 3,
  medium: 6,
  long: 12
};

/**
 * summarize(text, lengthKey) -> { summary: string, sentences: string[], keywords: string[] }
 */
function summarize(text, lengthKey = 'medium') {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return { summary: '', sentences: [], keywords: [] };
  }

  const freq = wordFrequencies(sentences);
  const scored = scoreSentences(sentences, freq);

  const target = Math.min(LENGTH_TARGETS[lengthKey] || 6, sentences.length);
  const top = [...scored].sort((a, b) => b.score - a.score).slice(0, target);
  const ordered = top.sort((a, b) => a.idx - b.idx);

  const keywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);

  return {
    summary: ordered.map(s => s.sentence).join(' '),
    sentences: ordered.map(s => s.sentence),
    keywords
  };
}
