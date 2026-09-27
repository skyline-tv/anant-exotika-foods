export const PRODUCT_CSV_COLUMNS = [
  'name',
  'sku',
  'mrp',
  'sellingRate',
  'category',
  'subCategory',
  'shortDescription',
  'description',
  'brand',
  'tags',
  'stock',
  'lowStockThreshold',
  'weight',
  'length',
  'width',
  'height',
  'dimensionUnit',
  'status',
  'isFeatured',
  'isNewArrival',
  'isBestSeller',
  'displayOrder',
  'imageUrl',
  'seoTitle',
  'seoDescription',
];

const SAMPLE_ROW = [
  'Premium Almonds',
  'EXAMPLE-SKU',
  '499',
  '399',
  'Dry Fruits',
  '',
  'Roasted almonds, 250 g',
  'A short catalogue description.',
  'ANANT EXOTIKA',
  'almonds|gift',
  '20',
  '5',
  '250',
  '10',
  '10',
  '5',
  'cm',
  'draft',
  'no',
  'yes',
  'no',
  '0',
  '',
  '',
  '',
];

const escapeCell = (value) => {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

export function downloadProductTemplate() {
  const csv = [PRODUCT_CSV_COLUMNS, SAMPLE_ROW].map((row) => row.map(escapeCell).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}\n`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'anant-exotika-products-template.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function parseProductCsv(text) {
  const grid = parseCsvGrid(String(text || '').replace(/^\uFEFF/, ''));
  if (grid.length === 0) {
    return { columns: [], products: [], missingColumns: PRODUCT_CSV_COLUMNS.slice(0, 5) };
  }

  const headers = grid[0].map((cell) => cell.trim());
  const indexByHeader = new Map(headers.map((header, index) => [header.toLowerCase(), index]));
  const aliases = {
    sellingrate: 'sellingRate',
    price: 'sellingRate',
    compareatprice: 'mrp',
    subcategory: 'subCategory',
    shortdescription: 'shortDescription',
    lowstockthreshold: 'lowStockThreshold',
    dimensionunit: 'dimensionUnit',
    isfeatured: 'isFeatured',
    isnewarrival: 'isNewArrival',
    isbestseller: 'isBestSeller',
    displayorder: 'displayOrder',
    imageurl: 'imageUrl',
    seotitle: 'seoTitle',
    seodescription: 'seoDescription',
  };
  const columnIndex = (column) => {
    const direct = column.toLowerCase();
    if (indexByHeader.has(direct)) return indexByHeader.get(direct);
    const alias = Object.keys(aliases).find((key) => aliases[key] === column && indexByHeader.has(key));
    return alias ? indexByHeader.get(alias) : undefined;
  };

  const missingColumns = ['name', 'sku', 'mrp', 'sellingRate', 'category'].filter(
    (column) => columnIndex(column) === undefined
  );

  const products = grid.slice(1).map((cells, index) => {
    const product = { row: index + 2 };
    PRODUCT_CSV_COLUMNS.forEach((column) => {
      const resolved = columnIndex(column);
      product[column] = resolved === undefined ? '' : String(cells[resolved] ?? '').trim();
    });
    return product;
  }).filter((product) => PRODUCT_CSV_COLUMNS.some((column) => product[column]));

  return { columns: headers, products, missingColumns };
}

function parseCsvGrid(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((value) => String(value).trim()));
}
