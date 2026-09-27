import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Upload } from 'lucide-react';
import Button from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';
import { bulkCreateProducts } from '../../services/productService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { downloadProductTemplate, parseProductCsv } from '../../utils/productCsv';

function BulkProducts() {
  const toast = useToast();
  const [fileName, setFileName] = useState('');
  const [products, setProducts] = useState([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const importable = useMemo(
    () => products.filter((product) => String(product.sku).toUpperCase() !== 'EXAMPLE-SKU'),
    [products]
  );
  const sampleIgnored = products.length - importable.length;

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setResult(null);
    setParseError('');
    setProducts([]);
    setFileName('');
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Use the CSV template. Excel files need to be saved as CSV first.');
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseProductCsv(text);
      if (parsed.missingColumns.length) {
        setParseError(`The file is missing required columns: ${parsed.missingColumns.join(', ')}.`);
        return;
      }
      if (parsed.products.length === 0) {
        setParseError('The file has a header row but no products.');
        return;
      }
      setFileName(file.name);
      setProducts(parsed.products);
    } catch (error) {
      setParseError(getErrorMessage(error, 'Unable to read that file.'));
    }
  };

  const handleImport = async () => {
    if (importable.length === 0) {
      toast.error('Add products to the template before importing. The sample row is ignored.');
      return;
    }

    setImporting(true);
    setResult(null);
    try {
      const data = await bulkCreateProducts(importable);
      setResult(data);
      if (data.createdCount) {
        toast.success(`${data.createdCount} product${data.createdCount === 1 ? '' : 's'} created.`);
      } else {
        toast.error('No products were created. Check the row errors below.');
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to import products.'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Bulk add products</h1>
          <p>Download the template, fill one product per row, then import the CSV.</p>
        </div>
        <div className="page-actions">
          <Link className="btn btn--secondary" to="/products">
            Back to products
          </Link>
        </div>
      </div>

      <section className="card">
        <div className="card-body">
          <h2>Template</h2>
          <p className="muted">
            Required columns are name, SKU, MRP, selling rate, and category. Category must match an existing
            category name or slug. Weight is in grams. Status can be draft, active, inactive, or out_of_stock.
            Use yes or no for featured, new arrival, and best seller. Separate tags with a vertical bar.
            The sample row uses SKU EXAMPLE-SKU and is skipped on import.
          </p>
          <div className="toolbar" style={{ marginTop: '1rem' }}>
            <Button type="button" variant="secondary" onClick={downloadProductTemplate}>
              <Download size={16} />
              Download template
            </Button>
            <Button type="button" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} />
              Choose CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              hidden
            />
          </div>
          {fileName ? <p style={{ marginBottom: 0 }}>Selected file: {fileName}</p> : null}
          {parseError ? <p className="field-error">{parseError}</p> : null}
        </div>
      </section>

      {products.length ? (
        <section className="card">
          <div className="card-header">
            <h2>Preview</h2>
            <Button type="button" onClick={handleImport} loading={importing} disabled={!importable.length}>
              Import {importable.length} product{importable.length === 1 ? '' : 's'}
            </Button>
          </div>
          <div className="card-body">
            {sampleIgnored ? (
              <p className="muted">The sample row (EXAMPLE-SKU) will not be imported.</p>
            ) : null}
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>MRP</th>
                    <th>Selling rate</th>
                    <th>Category</th>
                    <th>Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, 25).map((product) => (
                    <tr key={`${product.row}-${product.sku}`}>
                      <td>{product.row}</td>
                      <td className="cell-wrap">{product.name || '—'}</td>
                      <td>{product.sku || '—'}</td>
                      <td>{product.mrp || '—'}</td>
                      <td>{product.sellingRate || '—'}</td>
                      <td>{product.category || '—'}</td>
                      <td>{product.stock || '0'}</td>
                      <td>{product.status || 'draft'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {products.length > 25 ? <p className="muted">Showing the first 25 of {products.length} rows.</p> : null}
          </div>
        </section>
      ) : null}

      {result ? (
        <section className="card">
          <div className="card-header">
            <h2>Import result</h2>
          </div>
          <div className="card-body">
            <p>
              Created {result.createdCount}. Failed {result.errorCount}.
            </p>
            {result.errors?.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>SKU</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((error) => (
                      <tr key={`${error.row}-${error.sku}`}>
                        <td>{error.row}</td>
                        <td>{error.sku || '—'}</td>
                        <td className="cell-wrap">{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default BulkProducts;
