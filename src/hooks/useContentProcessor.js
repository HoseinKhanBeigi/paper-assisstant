import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

export default function useContentProcessor() {
  const [content, setContent] = useState({
    tables: [],
    paragraphs: [],
    text: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const setupPdfWorker = async () => {
      const worker = await import('pdfjs-dist/build/pdf.worker.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default;
    };
    setupPdfWorker();
  }, []);

  const detectTables = (items) => {
    // Sort items by Y position
    const sortedByY = [...items].sort((a, b) => a.y - b.y);
    
    // Group items by Y position
    const rows = [];
    let currentRow = [];
    let currentY = null;
    
    sortedByY.forEach(item => {
      if (currentY === null) {
        currentY = item.y;
        currentRow.push(item);
      } else if (Math.abs(item.y - currentY) < 5) {
        currentRow.push(item);
      } else {
        if (currentRow.length >= 2) {
          rows.push([...currentRow]);
        }
        currentRow = [item];
        currentY = item.y;
      }
    });
    
    if (currentRow.length >= 2) {
      rows.push(currentRow);
    }
    
    if (rows.length >= 2) {
      const columnCounts = rows.map(row => row.length);
      const isConsistentColumns = Math.max(...columnCounts) - Math.min(...columnCounts) <= 1;
      
      if (isConsistentColumns) {
        return rows.map(row => 
          row.sort((a, b) => a.x - b.x).map(item => item.str)
        );
      }
    }
    
    return null;
  };

  const detectParagraphs = (items, pageNumber) => {
    const paragraphs = [];
    let currentParagraph = [];
    let currentY = null;
    let currentFontSize = null;

    items.forEach(item => {
      if (currentY === null) {
        currentY = item.y;
        currentFontSize = item.fontSize;
        currentParagraph.push(item.str);
      } else if (Math.abs(item.y - currentY) < 5 && item.fontSize === currentFontSize) {
        currentParagraph.push(item.str);
      } else {
        if (currentParagraph.length > 0) {
          paragraphs.push({
            pageNumber,
            content: currentParagraph.join(' '),
            fontSize: currentFontSize
          });
        }
        currentParagraph = [item.str];
        currentY = item.y;
        currentFontSize = item.fontSize;
      }
    });

    if (currentParagraph.length > 0) {
      paragraphs.push({
        pageNumber,
        content: currentParagraph.join(' '),
        fontSize: currentFontSize
      });
    }

    return paragraphs;
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    
    setLoading(true);
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    
    reader.onload = async function () {
      try {
        const typedArray = new Uint8Array(reader.result);
        const loadingTask = pdfjsLib.getDocument(typedArray);
        const pdf = await loadingTask.promise;
        let detectedTables = [];
        let detectedParagraphs = [];
        let fullText = "";

        // Process all pages
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.0 });
          const textContent = await page.getTextContent();
          
          // Prepare items with position info
          const items = textContent.items.map(item => {
            const [scaleX, skewX, skewY, scaleY, x, y] = item.transform;
            return {
              str: item.str,
              x,
              y: viewport.height - y,
              fontSize: item.height
            };
          });

          // Add to full text
          fullText += items.map(item => item.str).join(' ') + '\n\n';

          // Detect tables
          for (let j = 0; j < items.length; j += 20) {
            const chunk = items.slice(j, j + 40);
            const table = detectTables(chunk);
            if (table) {
              detectedTables.push({
                pageNumber: i,
                table
              });
            }
          }

          // Detect paragraphs
          const paragraphs = detectParagraphs(items, i);
          detectedParagraphs.push(...paragraphs);
        }

        setContent({
          tables: detectedTables,
          paragraphs: detectedParagraphs,
          text: fullText
        });
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
    content,
    loading,
    handleFileSelect
  };
} 