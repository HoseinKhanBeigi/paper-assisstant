'use client'
import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import styles from './PdfViewer.module.scss';

// // Initialize PDF.js worker
// if (typeof window !== 'undefined') {
//   pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
// }

export default function PdfViewer({ file }) {
  const canvasRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [pageCount, setPageCount] = useState(0);
  const [selectedContent, setSelectedContent] = useState(null);
  const [items, setItems] = useState([]);
  const [pageStructure, setPageStructure] = useState(null);
  const [error, setError] = useState(null);

  // Initialize worker
  useEffect(() => {
    const setupWorker = async () => {
      try {
        console.log('Setting up PDF worker...');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.mjs',
          import.meta.url,
        ).toString();
        console.log('Worker setup complete');
      } catch (error) {
        console.error('Worker setup error:', error);
        setError('Failed to initialize PDF worker');
      }
    };
    setupWorker();
  }, []);

  useEffect(() => {
    if (!file) return;

    const loadPdf = async () => {
      console.log('Loading PDF...');
      const reader = new FileReader();
      reader.onload = async function () {
        try {
          console.log('File read complete, creating PDF document...');
          const typedArray = new Uint8Array(reader.result);
          const loadingTask = pdfjsLib.getDocument(typedArray);
          const loadedPdf = await loadingTask.promise;
          console.log('PDF document created, pages:', loadedPdf.numPages);
          setPdf(loadedPdf);
          setPageCount(loadedPdf.numPages);
          renderPage(1, loadedPdf);
        } catch (error) {
          console.error('PDF loading error:', error);
          setError('Failed to load PDF');
        }
      };
      reader.onerror = () => {
        console.error('File reading error');
        setError('Failed to read file');
      };
      reader.readAsArrayBuffer(file);
    };

    loadPdf();
  }, [file]);

  const analyzePageStructure = (items) => {
    // Group items by their vertical position (with some tolerance)
    const lineGroups = {};
    items.forEach(item => {
      const roundedY = Math.round(item.y / 5) * 5; // 5px tolerance
      if (!lineGroups[roundedY]) {
        lineGroups[roundedY] = [];
      }
      lineGroups[roundedY].push(item);
    });

    // Sort items in each line by X position
    Object.values(lineGroups).forEach(line => {
      line.sort((a, b) => a.x - b.x);
    });

    // Analyze lines to detect paragraphs and tables
    const structure = [];
    const yPositions = Object.keys(lineGroups).map(Number).sort((a, b) => a - b);
    
    let currentBlock = [];
    let currentType = null;
    let lastY = null;

    yPositions.forEach(y => {
      const line = lineGroups[y];
      const lineInfo = {
        y,
        items: line,
        text: line.map(item => item.text).join(' '),
        avgFontSize: line.reduce((sum, item) => sum + item.fontSize, 0) / line.length,
        itemCount: line.length,
        // Calculate average spacing between items
        spacing: line.length > 1 ? 
          (line[line.length - 1].x - line[0].x) / (line.length - 1) :
          0
      };

      if (!lastY) {
        currentBlock = [lineInfo];
        lastY = y;
        return;
      }

      const yGap = y - lastY;
      const isNewBlock = yGap > Math.max(20, lineInfo.avgFontSize * 1.5);

      if (isNewBlock && currentBlock.length > 0) {
        // Analyze current block
        const blockType = detectBlockType(currentBlock);
        if (blockType) {
          structure.push({
            type: blockType,
            lines: currentBlock,
            yStart: currentBlock[0].y,
            yEnd: currentBlock[currentBlock.length - 1].y
          });
        }
        currentBlock = [lineInfo];
      } else {
        currentBlock.push(lineInfo);
      }

      lastY = y;
    });

    // Handle last block
    if (currentBlock.length > 0) {
      const blockType = detectBlockType(currentBlock);
      if (blockType) {
        structure.push({
          type: blockType,
          lines: currentBlock,
          yStart: currentBlock[0].y,
          yEnd: currentBlock[currentBlock.length - 1].y
        });
      }
    }

    setPageStructure(structure);
  };

  const detectBlockType = (block) => {
    if (block.length === 0) return null;

    // Check for headers (larger font size)
    if (block.length === 1 && block[0].avgFontSize > 14) {
      return 'header';
    }

    // Check for tables
    const isTable = block.every(line => {
      // Tables typically have consistent item counts and spacing
      return Math.abs(line.itemCount - block[0].itemCount) <= 1 &&
             Math.abs(line.spacing - block[0].spacing) < 5 &&
             line.itemCount >= 2;
    });
    if (isTable && block.length >= 2) {
      return 'table';
    }

    // Check for paragraphs
    const isParagraph = block.every(line => {
      // Paragraphs have consistent font sizes and typically longer text
      return Math.abs(line.avgFontSize - block[0].avgFontSize) < 2 &&
             line.text.length > 20;
    });
    if (isParagraph) {
      return 'paragraph';
    }

    // Default to text if no other type matches
    return 'text';
  };

  const renderPage = async (pageNumber, pdfDoc = pdf) => {
    if (!pdfDoc) {
      console.log('No PDF document available');
      return;
    }

    try {
      console.log('Rendering page', pageNumber);
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      console.log('Canvas size set to:', canvas.width, 'x', canvas.height);

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      console.log('Starting page render...');
      await page.render(renderContext).promise;
      console.log('Page render complete');

      const textContent = await page.getTextContent();
      const pageItems = textContent.items.map(item => {
        const [scaleX, skewX, skewY, scaleY, x, y] = item.transform;
        return {
          text: item.str,
          x: x * scale,
          y: (viewport.height - y) * scale,
          width: item.width * scale,
          height: item.height * scale,
          fontSize: item.height * scale
        };
      });
      setItems(pageItems);
      analyzePageStructure(pageItems);
      console.log('Page processing complete');

    } catch (error) {
      console.error('Page rendering error:', error);
      setError('Failed to render page');
    }
  };

  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;

    if (!pageStructure) return;

    // Find the block that contains the click
    const clickedBlock = pageStructure.find(block => 
      clickY >= block.yStart && clickY <= block.yEnd
    );

    if (clickedBlock) {
      setSelectedContent({
        type: clickedBlock.type,
        text: clickedBlock.lines.map(line => line.text).join('\n'),
        fontSize: clickedBlock.lines[0].avgFontSize
      });
    }
  };

  return (
    <div className={styles.container}>
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
      <div className={styles.controls}>
        <button
          onClick={() => currentPage > 1 && setCurrentPage(p => {
            renderPage(p - 1);
            return p - 1;
          })}
          className={styles.button}
          disabled={currentPage <= 1}
        >
          Previous
        </button>
        <span className={styles.pageInfo}>
          Page {currentPage} of {pageCount}
        </span>
        <button
          onClick={() => currentPage < pageCount && setCurrentPage(p => {
            renderPage(p + 1);
            return p + 1;
          })}
          className={styles.button}
          disabled={currentPage >= pageCount}
        >
          Next
        </button>
        <select 
          value={scale} 
          onChange={(e) => {
            setScale(Number(e.target.value));
            renderPage(currentPage);
          }}
          className={styles.select}
        >
          <option value={1}>100%</option>
          <option value={1.5}>150%</option>
          <option value={2}>200%</option>
        </select>
      </div>

      <div className={styles.canvasContainer}>
        <canvas 
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={styles.canvas}
        />
      </div>

      {selectedContent && (
        <div className={styles.resultContainer}>
          <h3 className={styles.resultTitle}>
            Detected Content Type: {selectedContent.type}
          </h3>
          <p className={styles.resultText}>{selectedContent.text}</p>
        </div>
      )}
    </div>
  );
} 