"use client";

import { useState } from 'react';
import PdfUploader from '../components/PdfUploader';
import PdfViewer from '../components/PdfViewer';

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (selectedFile) => {
    setLoading(true);
    setFile(selectedFile);
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Interactive PDF Analyzer</h1>
      <p className="text-gray-600 mb-4">
        Upload a PDF and click on any section to detect its content type.
      </p>

      <PdfUploader 
        onFileSelect={handleFileSelect}
        loading={loading}
      />

      {file && (
        <div className="mt-6">
          <PdfViewer file={file} />
        </div>
      )}
    </div>
  );
}
