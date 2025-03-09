export default function TextDisplay({ text }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Raw Text:</h3>
      <textarea 
        value={text} 
        readOnly 
        rows={10} 
        className="w-full p-2 border rounded"
      />
    </div>
  );
} 