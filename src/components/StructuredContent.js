import TableDisplay from './TableDisplay';
import ImageDisplay from './ImageDisplay';

export default function StructuredContent({ content }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Structured Content:</h3>
      <div className="border rounded p-4 max-h-[400px] overflow-auto">
        {content.map((page, pageIndex) => (
          <div key={pageIndex} className="mb-6">
            <h4 className="text-md font-semibold mb-2">Page {page.pageNumber}</h4>
            {page.items.map((item, itemIndex) => (
              <div key={itemIndex} className="mb-3">
                {item.type === 'header' && (
                  <div 
                    className="font-bold text-lg"
                    style={{ fontSize: `${item.fontSize}px` }}
                  >
                    {item.content}
                  </div>
                )}
                {item.type === 'paragraph' && (
                  <div className="text-base">
                    {item.content}
                  </div>
                )}
                {item.type === 'table' && (
                  <TableDisplay content={item.content} />
                )}
                {item.type === 'image' && (
                  <ImageDisplay src={item.src} text={item.text} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
} 