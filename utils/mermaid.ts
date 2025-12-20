
import { SchemaTable } from '../types';

export const generateMermaidFromTables = (tables: SchemaTable[]): string => {
  let mermaid = 'erDiagram\n';

  // Tables
  tables.forEach(table => {
    // Sanitize name
    const tableName = table.name.replace(/\s+/g, '_');
    mermaid += `  ${tableName} {\n`;
    table.columns.forEach(col => {
      const type = col.type.replace(/\s+/g, '_');
      const name = col.name.replace(/\s+/g, '_');
      // Mermaid format: type name comment
      // We map description to comment if possible, or constraint
      const comment = col.constraints ? `"${col.constraints}"` : '';
      mermaid += `    ${type} ${name} ${comment}\n`;
    });
    mermaid += `  }\n`;
  });

  // Relationships (Naive inference based on naming conventions like user_id, author_id)
  // A robust system would store relationships explicitly, but we infer for now to keep state simple.
  tables.forEach(source => {
    source.columns.forEach(col => {
      if (col.name.endsWith('_id') || col.name.endsWith('Id')) {
        const targetName = col.name.replace(/_id$|Id$/, '');
        // Find target table (naive pluralization check)
        const target = tables.find(t => 
            t.name.toLowerCase() === targetName.toLowerCase() || 
            t.name.toLowerCase() === targetName.toLowerCase() + 's'
        );
        
        if (target) {
            const sourceName = source.name.replace(/\s+/g, '_');
            const targetTableName = target.name.replace(/\s+/g, '_');
            // Assuming One-to-Many for simplicity in auto-generation
            if (sourceName !== targetTableName) {
                mermaid += `  ${targetTableName} ||--o{ ${sourceName} : "has"\n`;
            }
        }
      }
    });
  });

  return mermaid;
};
