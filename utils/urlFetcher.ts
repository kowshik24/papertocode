/**
 * Utility for fetching papers from URLs (arXiv, OpenReview, direct PDFs)
 */

export interface FetchResult {
  blob: Blob;
  filename: string;
  source: 'arxiv' | 'openreview' | 'direct' | 'unknown';
}

/**
 * Extract arXiv ID from various URL formats
 */
function extractArxivId(url: string): string | null {
  // Patterns:
  // - https://arxiv.org/abs/2301.12345
  // - https://arxiv.org/pdf/2301.12345.pdf
  // - https://arxiv.org/abs/2301.12345v2
  // - arxiv:2301.12345
  
  const patterns = [
    /arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)/i,
    /arxiv:(\d{4}\.\d{4,5}(?:v\d+)?)/i,
    /(\d{4}\.\d{4,5}(?:v\d+)?)/,  // Just the ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1].replace('.pdf', '');
    }
  }
  return null;
}

/**
 * Extract OpenReview ID from URL
 */
function extractOpenReviewId(url: string): string | null {
  // Pattern: https://openreview.net/forum?id=XXXXX or https://openreview.net/pdf?id=XXXXX
  const match = url.match(/openreview\.net\/(?:forum|pdf)\?id=([a-zA-Z0-9_-]+)/i);
  return match ? match[1] : null;
}

/**
 * Check if URL is a direct PDF link
 */
function isDirectPdfUrl(url: string): boolean {
  return url.toLowerCase().endsWith('.pdf') || 
         url.includes('pdf') && url.includes('download');
}

/**
 * Fetch PDF from arXiv
 */
async function fetchFromArxiv(arxivId: string): Promise<FetchResult> {
  // Use export.arxiv.org which has better CORS support
  const pdfUrl = `https://export.arxiv.org/pdf/${arxivId}.pdf`;
  
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch from arXiv: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  return {
    blob,
    filename: `arxiv_${arxivId}.pdf`,
    source: 'arxiv',
  };
}

/**
 * Fetch PDF from OpenReview
 */
async function fetchFromOpenReview(reviewId: string): Promise<FetchResult> {
  const pdfUrl = `https://openreview.net/pdf?id=${reviewId}`;
  
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch from OpenReview: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  return {
    blob,
    filename: `openreview_${reviewId}.pdf`,
    source: 'openreview',
  };
}

/**
 * Fetch PDF from direct URL
 */
async function fetchDirectPdf(url: string): Promise<FetchResult> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.statusText}`);
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes('pdf')) {
    throw new Error('URL does not point to a PDF file');
  }
  
  const blob = await response.blob();
  
  // Extract filename from URL or Content-Disposition header
  let filename = 'paper.pdf';
  const disposition = response.headers.get('content-disposition');
  if (disposition) {
    const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch) {
      filename = filenameMatch[1].replace(/['"]/g, '');
    }
  } else {
    const urlPath = new URL(url).pathname;
    const urlFilename = urlPath.split('/').pop();
    if (urlFilename && urlFilename.endsWith('.pdf')) {
      filename = urlFilename;
    }
  }
  
  return {
    blob,
    filename,
    source: 'direct',
  };
}

/**
 * Validate and parse a paper URL
 */
export function parsePaperUrl(url: string): {
  type: 'arxiv' | 'openreview' | 'direct' | 'invalid';
  id?: string;
} {
  const trimmedUrl = url.trim();
  
  const arxivId = extractArxivId(trimmedUrl);
  if (arxivId) {
    return { type: 'arxiv', id: arxivId };
  }
  
  const openReviewId = extractOpenReviewId(trimmedUrl);
  if (openReviewId) {
    return { type: 'openreview', id: openReviewId };
  }
  
  if (isDirectPdfUrl(trimmedUrl) || trimmedUrl.startsWith('http')) {
    return { type: 'direct' };
  }
  
  return { type: 'invalid' };
}

/**
 * Fetch a paper PDF from a URL
 * Supports arXiv, OpenReview, and direct PDF links
 */
export async function fetchPaperFromUrl(url: string): Promise<FetchResult> {
  const parsed = parsePaperUrl(url);
  
  switch (parsed.type) {
    case 'arxiv':
      return fetchFromArxiv(parsed.id!);
    
    case 'openreview':
      return fetchFromOpenReview(parsed.id!);
    
    case 'direct':
      return fetchDirectPdf(url);
    
    case 'invalid':
      throw new Error('Invalid paper URL. Please provide an arXiv link, OpenReview link, or direct PDF URL.');
  }
}

/**
 * Convert FetchResult blob to File object for processing
 */
export function blobToFile(result: FetchResult): File {
  return new File([result.blob], result.filename, { type: 'application/pdf' });
}
