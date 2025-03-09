export default function TableDisplay({ tables }) {
  return (
    <div className="space-y-6">
      {tables.map((tableData, tableIndex) => (
        <div key={tableIndex} className="border rounded p-4">
          <h3 className="text-lg font-semibold mb-2">
            Table from Page {tableData.pageNumber}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <tbody>
                {tableData.table.map((row, rowIndex) => (
                  <tr 
                    key={rowIndex}
                    className={'bg-silver'}
                  >
                    {row.map((cell, cellIndex) => (
                      <td 
                        key={cellIndex}
                        className="border px-4 py-2 text-sm"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
} 