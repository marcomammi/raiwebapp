// Client-side OCR helpers per il flusso "Nuova trasferta".
// - PDF: estrae prima il testo con pdfjs-dist; se troppo corto/vuoto,
//   renderizza le prime pagine e passa a tesseract.js (ita+eng).
// - Immagini: passa direttamente a tesseract.js.
// Tutto lazy: le librerie sono importate solo quando serve (SSR-safe).

const MIN_TEXT_LENGTH = 40;
const MAX_OCR_PAGES = 2;

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      // Worker via Vite ?url import.
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

let tesseractPromise: Promise<typeof import("tesseract.js")> | null = null;
async function loadTesseract() {
  if (!tesseractPromise) tesseractPromise = import("tesseract.js");
  return tesseractPromise;
}

function looksUseful(text: string): boolean {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length < MIN_TEXT_LENGTH) return false;
  // Heuristica: DocuSign / scansioni contengono spesso solo tag envelope
  if (/docusign envelope id:/i.test(clean) && clean.length < 200) return false;
  const alpha = clean.replace(/[^a-zA-Z]/g, "").length;
  return alpha >= 20;
}

async function ocrImage(source: Blob | string): Promise<string> {
  const t = await loadTesseract();
  const { data } = await t.recognize(source, "ita+eng");
  return (data.text ?? "").trim();
}

async function renderPdfPageToDataUrl(page: import("pdfjs-dist").PDFPageProxy): Promise<string> {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile");
  await page.render({ canvas, canvasContext: ctx, viewport } as unknown as Parameters<typeof page.render>[0]).promise;
  return canvas.toDataURL("image/png");
}

async function extractPdfText(file: File): Promise<{ text: string; ocrUsed: boolean }> {
  const pdfjs = await loadPdfjs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let text = "";
  const pages = Math.min(doc.numPages, 8);
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ");
    text += "\n" + pageText;
  }
  if (looksUseful(text)) return { text: text.trim(), ocrUsed: false };
  // Fallback OCR sulle prime pagine
  let ocrText = "";
  const ocrPages = Math.min(doc.numPages, MAX_OCR_PAGES);
  for (let i = 1; i <= ocrPages; i++) {
    const page = await doc.getPage(i);
    const dataUrl = await renderPdfPageToDataUrl(page);
    ocrText += "\n" + (await ocrImage(dataUrl));
  }
  return { text: ocrText.trim(), ocrUsed: true };
}

export interface OcrResult {
  text: string;
  ocrUsed: boolean;
}

/** Estrae testo da un file (PDF o immagine). Se non riesce, ritorna testo vuoto. */
export async function extractTextFromFile(file: File): Promise<OcrResult> {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const isPdf = type === "application/pdf" || name.endsWith(".pdf");
  const isImage = type.startsWith("image/");
  try {
    if (isPdf) return await extractPdfText(file);
    if (isImage) return { text: await ocrImage(file), ocrUsed: true };
  } catch {
    return { text: "", ocrUsed: false };
  }
  return { text: "", ocrUsed: false };
}