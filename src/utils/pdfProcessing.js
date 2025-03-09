import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Detect if a group of items forms a table
export const detectTable = (items) => {
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
      rows.push([...currentRow]);
      currentRow = [item];
      currentY = item.y;
    }
  });
  
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }
  
  // Check if this looks like a table (multiple rows with similar number of columns)
  if (rows.length >= 2) {
    const columnCounts = rows.map(row => row.length);
    const isConsistentColumns = Math.max(...columnCounts) - Math.min(...columnCounts) <= 1;
    
    if (isConsistentColumns && Math.min(...columnCounts) >= 2) {
      return {
        isTable: true,
        rows: rows.map(row => 
          row.sort((a, b) => a.x - b.x).map(item => item.str)
        )
      };
    }
  }
  
  return { isTable: false };
};

// Extract text from an image using Tesseract
export const extractTextFromImage = async (imageData) => {
  const worker = await createWorker();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  const { data: { text } } = await worker.recognize(imageData);
  await worker.terminate();
  return text;
};

// Process a single page
export const processPage = async (page) => {
  const viewport = page.getViewport({ scale: 1.0 });
  
  // Handle images
  const operatorList = await page.getOperatorList();
  const images = [];
  
  for (let j = 0; j < operatorList.fnArray.length; j++) {
    if (operatorList.fnArray[j] === pdfjsLib.OPS.paintImageXObject) {
      const imgData = operatorList.argsArray[j][0];
      if (imgData) {
        try {
          const img = await page.objs.get(imgData);
          if (img && img.data) {
            // Create a canvas to draw the image
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            // Create ImageData and draw it
            const imageData = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
            ctx.putImageData(imageData, 0, 0);
            
            // Convert to base64 for display and OCR
            const imageUrl = canvas.toDataURL();
            const imageText = await extractTextFromImage(imageUrl);
            
            images.push({
              type: 'image',
              text: imageText,
              src: imageUrl
            });
          }
        } catch (error) {
          console.error('Error processing image:', error);
        }
      }
    }
  }
  
  // Get text content with positions and styles
  const textContent = await page.getTextContent();
  const pageHeight = viewport.height;
  
  let pageItems = [];
  let currentY = 0;
  let currentParagraph = [];
  let potentialTableItems = [];
  
  // Process each text item
  textContent.items.forEach((item) => {
    const { str, transform, fontName, fontSize } = item;
    const [scaleX, skewX, skewY, scaleY, x, y] = transform;
    
    // Store item with position info for table detection
    potentialTableItems.push({
      str,
      x,
      y: pageHeight - y,
      fontSize,
      fontName
    });
    
    // Detect if this is likely a header based on font size
    const isHeader = fontSize > 14;
    
    // Detect new paragraph based on Y position change
    const yPos = pageHeight - y;
    if (currentY === 0) {
      currentY = yPos;
    }
    
    const yDiff = Math.abs(yPos - currentY);
    if (yDiff > fontSize * 1.5) {
      // Check if accumulated items form a table
      const tableCheck = detectTable(potentialTableItems);
      if (tableCheck.isTable) {
        pageItems.push({
          type: 'table',
          content: tableCheck.rows,
          y: currentY
        });
        potentialTableItems = [];
      } else if (currentParagraph.length > 0) {
        pageItems.push({
          type: 'paragraph',
          content: currentParagraph.join(' '),
          y: currentY,
          fontSize,
          fontName
        });
      }
      currentParagraph = [];
      currentY = yPos;
    }
    
    if (isHeader) {
      pageItems.push({
        type: 'header',
        content: str,
        y: yPos,
        fontSize,
        fontName
      });
    } else {
      currentParagraph.push(str);
    }
  });
  
  // Handle last paragraph or table
  const finalTableCheck = detectTable(potentialTableItems);
  if (finalTableCheck.isTable) {
    pageItems.push({
      type: 'table',
      content: finalTableCheck.rows,
      y: currentY
    });
  } else if (currentParagraph.length > 0) {
    pageItems.push({
      type: 'paragraph',
      content: currentParagraph.join(' '),
      y: currentY,
      fontSize: potentialTableItems[potentialTableItems.length - 1]?.fontSize,
      fontName: potentialTableItems[potentialTableItems.length - 1]?.fontName
    });
  }
  
  // Add images to page items
  pageItems.push(...images);
  
  return {
    items: pageItems.sort((a, b) => a.y - b.y),
    text: textContent.items.map(item => item.str).join(' ')
  };
}; 