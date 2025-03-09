export default function ContentTypeSelector({ activeType, onTypeChange }) {
  const types = [
    { id: 'tables', label: 'Tables' },
    { id: 'paragraphs', label: 'Paragraphs' },
    { id: 'text', label: 'Raw Text' }
  ];

  return (
    <div className="flex space-x-4 mb-6">
      {types.map(type => (
        <button
          key={type.id}
          onClick={() => onTypeChange(type.id)}
          className={`px-4 py-2 rounded-lg ${
            activeType === type.id
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
} 