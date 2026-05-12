import { useState, useRef, useEffect } from 'react';
import './ExportButton.css';

/**
 * A reusable dropdown export button.
 * Props:
 *   onExportExcel: () => void
 *   onExportPDF:   () => void
 *   disabled?:    boolean
 */
export default function ExportButton({ onExportExcel, onExportPDF, disabled = false }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // Close on outside click
    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div className="export-btn-wrap" ref={ref}>
            <button
                className="header-btn header-btn-export"
                onClick={() => setOpen(o => !o)}
                disabled={disabled}
                title="Xuất báo cáo"
            >
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Xuất báo cáo
                <svg className="export-chevron" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>

            {open && (
                <div className="export-dropdown">
                    <button
                        className="export-option"
                        onClick={() => { onExportExcel(); setOpen(false); }}
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                        </svg>
                        <span>
                            <strong>Excel (.xlsx)</strong>
                            <small>Mở trực tiếp bằng Excel</small>
                        </span>
                    </button>
                    <button
                        className="export-option"
                        onClick={() => { onExportPDF(); setOpen(false); }}
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        <span>
                            <strong>PDF (.pdf)</strong>
                            <small>In hoặc lưu dưới dạng PDF</small>
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
}
