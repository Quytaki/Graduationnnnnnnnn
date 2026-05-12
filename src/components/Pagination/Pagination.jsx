import './Pagination.css';

export default function Pagination({
    currentPage = 1,
    totalItems = 234,
    pageSize = 50,
    onPageChange,
    onPageSizeChange
}) {
    const totalPages = Math.ceil(totalItems / pageSize);
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    const pageSizes = [10, 25, 50, 100];

    return (
        <div className="pagination">
            <div className="pagination-info">
                <span className="pagination-showing">
                    Hiển thị <strong>{startItem}-{endItem}</strong> trong <strong>{totalItems}</strong> bản ghi
                </span>
            </div>

            <div className="pagination-controls">
                {/* Page Size Selector */}
                <div className="pagination-size">
                    <label htmlFor="page-size" className="size-label">Số dòng/trang:</label>
                    <select
                        id="page-size"
                        className="size-select"
                        value={pageSize}
                        onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                    >
                        {pageSizes.map(size => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </div>

                {/* Page Navigator */}
                <div className="pagination-nav">
                    <button
                        className="pagination-btn"
                        disabled={currentPage === 1}
                        onClick={() => onPageChange?.(1)}
                        aria-label="Trang đầu"
                        title="Trang đầu"
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    </button>

                    <button
                        className="pagination-btn"
                        disabled={currentPage === 1}
                        onClick={() => onPageChange?.(currentPage - 1)}
                        aria-label="Trang trước"
                        title="Trang trước"
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>

                    <span className="pagination-current">
                        Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong>
                    </span>

                    <button
                        className="pagination-btn"
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange?.(currentPage + 1)}
                        aria-label="Trang sau"
                        title="Trang sau"
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>

                    <button
                        className="pagination-btn"
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange?.(totalPages)}
                        aria-label="Trang cuối"
                        title="Trang cuối"
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 001.414 0l5-5a1 1 0 000-1.414l-5-5a1 1 0 00-1.414 1.414L8.586 10l-4.293 4.293a1 1 0 000 1.414zm6 0a1 1 0 001.414 0l5-5a1 1 0 000-1.414l-5-5a1 1 0 00-1.414 1.414L14.586 10l-4.293 4.293a1 1 0 000 1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
