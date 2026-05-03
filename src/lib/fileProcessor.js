import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Process an uploaded file and return structured content for the LLM.
 * - CSV/TXT → parsed as text
 * - PDF → text extracted with pdf.js
 * - Images → Returns base64 so it can be passed via the Vercel AI SDK to vision models
 */
export async function processFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const type = file.type;

  // CSV / TXT
  if (ext === 'csv' || ext === 'txt' || type === 'text/csv' || type === 'text/plain') {
    const text = await file.text();
    return {
      type: 'text',
      fileName: file.name,
      content: text,
      preview: `📎 ${file.name} (${formatSize(file.size)})`,
    };
  }

  // PDF
  if (ext === 'pdf' || type === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      pages.push(pageText);
    }
    return {
      type: 'text',
      fileName: file.name,
      content: pages.join('\n\n--- Page Break ---\n\n'),
      preview: `📎 ${file.name} (${pdf.numPages} pages, ${formatSize(file.size)})`,
    };
  }

  // Images 
  if (type.startsWith('image/')) {
    const dataUrl = await fileToBase64(file);
    return {
      type: 'image',
      fileName: file.name,
      dataUrl,
      preview: `🖼️ ${file.name} (Ready for vision model, ${formatSize(file.size)})`,
    };
  }

  throw new Error(`Unsupported file type: ${ext}. Use CSV, PDF, TXT, or image files.`);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
