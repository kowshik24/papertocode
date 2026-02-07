
import type { EnrichedDocument, PaperMetadata, PaperDomain } from '../types';

const DOMAIN_KEYWORDS: Record<PaperDomain, string[]> = {
  'ML-Training': ['optimization', 'gradient', 'loss', 'convergence', 'learning rate', 'training', 'sgd', 'optimizer'],
  'NLP-Language': ['language', 'attention', 'transformer', 'embedding', 'token', 'nlp', 'text', 'semantic', 'bert', 'gpt'],
  'Vision-Perception': ['image', 'convolution', 'filter', 'detection', 'segmentation', 'cnn', 'visual', 'pixel', 'resnet'],
  'RL-Control': ['reward', 'policy', 'q-learning', 'agent', 'state-action', 'reinforcement', 'mdp', 'exploration'],
  'Other': []
};

export const extractTextFromPdf = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const typedarray = new Uint8Array(reader.result as ArrayBuffer);
        
        // @ts-ignore - pdfjsLib is loaded via CDN in index.html
        const loadingTask = window.pdfjsLib.getDocument({ data: typedarray });
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        const numPages = pdf.numPages;

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            // @ts-ignore
            .map((item) => item.str)
            .join(' ');
          fullText += `--- Page ${i} ---\n${pageText}\n\n`;
        }
        
        resolve(fullText);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

const detectDomain = (text: string): PaperDomain => {
  const lowerText = text.toLowerCase();
  const scores: Record<PaperDomain, number> = {
    'ML-Training': 0,
    'NLP-Language': 0,
    'Vision-Perception': 0,
    'RL-Control': 0,
    'Other': 0
  };

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        scores[domain as PaperDomain]++;
      }
    }
  }

  const maxDomain = Object.entries(scores).reduce((max, [domain, score]) => 
    score > max[1] ? [domain, score] : max
  , ['Other', 0])[0] as PaperDomain;

  return scores[maxDomain] > 0 ? maxDomain : 'Other';
};

const extractMetadataFromText = (fullText: string): Partial<PaperMetadata> => {
  const lines = fullText.split('\n');
  const firstPage = fullText.split('--- Page 2 ---')[0] || fullText.substring(0, 5000);
  
  // Extract title (usually first substantial line)
  let title = 'Untitled Paper';
  const titleMatch = firstPage.match(/^(?:--- Page \d+ ---\n)?([\w\s:]+?)(?:\n|$)/);
  if (titleMatch) {
    const potentialTitle = titleMatch[1].trim();
    if (potentialTitle.length > 10 && potentialTitle.length < 200) {
      title = potentialTitle;
    }
  }

  // Extract year (look for 4-digit year pattern)
  let year = new Date().getFullYear();
  const yearMatch = firstPage.match(/\b(20\d{2}|19\d{2})\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1]);
  }

  // Extract authors (look for patterns like "Author1, Author2" or "by Author Name")
  const authors: string[] = [];
  const authorPatterns = [
    /(?:Authors?|By):?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+(?:,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)*)/,
    /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*[A-Z][a-z]+\s+[A-Z][a-z]+)+)/
  ];
  
  for (const pattern of authorPatterns) {
    const match = firstPage.match(pattern);
    if (match) {
      const authorList = match[1].split(',').map(a => a.trim()).filter(a => a.length > 0);
      authors.push(...authorList);
      break;
    }
  }

  // Extract abstract
  let abstract = '';
  const abstractMatch = fullText.match(/(?:Abstract|ABSTRACT)[\s\n]+([\s\S]{100,2000}?)(?:\n\n|\n\d|\nintroduction|Introduction)/i);
  if (abstractMatch) {
    abstract = abstractMatch[1].trim().replace(/\s+/g, ' ');
  }

  // Extract key algorithms (look for "Algorithm", "Method", etc.)
  const keyAlgorithms: string[] = [];
  const algorithmPatterns = [
    /Algorithm\s+\d+:?\s+([^\n]{5,100})/gi,
    /(?:Our|We propose|We present)\s+(?:a|an|the)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})/g
  ];
  
  for (const pattern of algorithmPatterns) {
    const matches = fullText.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        keyAlgorithms.push(match[1].trim());
      }
    }
  }

  return {
    title,
    authors: authors.length > 0 ? authors : ['Anonymous'],
    year,
    abstract,
    keyAlgorithms: keyAlgorithms.slice(0, 5) // Max 5 algorithms
  };
};

export const extractEnrichedDocument = async (file: File): Promise<EnrichedDocument> => {
  const fullText = await extractTextFromPdf(file);
  const partialMetadata = extractMetadataFromText(fullText);
  
  // Combine title and abstract for domain detection
  const textForDomain = `${partialMetadata.title} ${partialMetadata.abstract}`;
  const estimatedDomain = detectDomain(textForDomain);

  const metadata: PaperMetadata = {
    title: partialMetadata.title || 'Untitled Paper',
    authors: partialMetadata.authors || ['Anonymous'],
    year: partialMetadata.year || new Date().getFullYear(),
    conference: undefined,
    abstract: partialMetadata.abstract || 'No abstract found.',
    keyAlgorithms: partialMetadata.keyAlgorithms || [],
    estimatedDomain
  };

  return {
    metadata,
    fullText,
    estimatedDomain
  };
};
