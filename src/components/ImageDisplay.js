export default function ImageDisplay({ src, text }) {
  return (
    <div className="border p-2 my-2">
      <p className="font-semibold">Image Content:</p>
      <p className="text-sm">{text}</p>
      {src && (
        <img 
          src={src} 
          alt="Extracted from PDF" 
          className="max-w-full h-auto mt-2"
        />
      )}
    </div>
  );
} 