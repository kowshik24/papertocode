
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
