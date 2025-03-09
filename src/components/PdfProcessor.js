import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { processPage } from '../utils/pdfProcessing';

export default function usePdfProcessor() {
  const [file, setFile] = useState(null);
  const [textData, setTextData] = useState("");
  const [structuredContent, setStructuredContent] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const setupPdfWorker = async () => {
      const worker = await import('pdfjs-dist/build/pdf.worker.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default;
    };
    setupPdfWorker();
  }, []);

  const handleFileSelect = async (file) => {
    if (!file) return;
    
    setLoading(true);
    setFile(file);
    
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    
    reader.onload = async function () {
      try {
        const typedArray = new Uint8Array(reader.result);
        const loadingTask = pdfjsLib.getDocument(typedArray);
        const pdf = await loadingTask.promise;
        let extractedText = "";
        let pageStructures = [];

        // Process all pages
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const { items, text } = await processPage(page);
          
          pageStructures.push({
            pageNumber: i,
            items
          });
          
          extractedText += text + "\n\n";
        }

        setTextData(extractedText);
        setStructuredContent(pageStructures);
      } catch (error) {
        console.error('Error processing PDF:', error);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      console.error('Error reading file');
      setLoading(false);
    };
  };

  return {
    file,
    textData,
    structuredContent,
    loading,
    handleFileSelect
  };
} 