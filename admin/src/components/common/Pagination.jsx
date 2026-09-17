import { ChevronLeft, ChevronRight } from 'lucide-react';

function Pagination({ page = 1, pages = 1, total = 0, onPageChange }) {
  if (pages <= 1 && total <= 0) return null;

  return (
    <div className="pagination">
      <span>
        Page {page} of {Math.max(pages, 1)} · {total} records
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
          Prev
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default Pagination;
