export default function PdfUploader({ onFileSelect, loading }) {
  return (
    <div>
      <input 
        type="file" 
        accept=".pdf" 
        onChange={(e) => onFileSelect(e.target.files[0])}
        className="mb-4"
      />
      {loading && (
        <div className="text-center my-4">
          <p>Processing PDF... This may take a few moments.</p>
        </div>
      )}
    </div>
  );
} 