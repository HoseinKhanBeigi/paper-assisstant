import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

export default function useTableDetector() {
  const [tables, setTables] = useState([]);
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
    
    // Group items by Y position (within a small threshold)
    const rows = [];
    let currentRow = [];
    let currentY = null;
    
    sortedByY.forEach(item => {
      if (currentY === null) {
        currentY = item.y;
        currentRow.push(item);
      } else if (Math.abs(item.y - currentY) < 5) { // Items within 5 units are considered in the same row
        currentRow.push(item);
      } else {
        if (currentRow.length >= 2) { // Only consider rows with at least 2 items
          rows.push([...currentRow]);
        }
        currentRow = [item];
        currentY = item.y;
      }
    });
    
    if (currentRow.length >= 2) {
      rows.push(currentRow);
    }
    
    // Check if this looks like a table (multiple rows with similar number of columns)
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
              y: viewport.height - y
            };
          });

          // Try to detect tables in chunks of items
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
        }

        setTables(detectedTables);
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
    tables,
    loading,
    handleFileSelect
  };
} 