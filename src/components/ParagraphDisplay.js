export default function ParagraphDisplay({ paragraphs }) {
  return (
    <div className="space-y-6">
      {paragraphs.map((paragraph, index) => (
        <div key={index} className="border rounded p-4">
          <h3 className="text-lg font-semibold mb-2">
            Paragraph from Page {paragraph.pageNumber}
          </h3>
          <p className="text-gray-700 leading-relaxed">
            {paragraph.content}
          </p>
          {paragraph.fontSize && (
            <div className="text-sm text-gray-500 mt-2">
              Font Size: {paragraph.fontSize}
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 