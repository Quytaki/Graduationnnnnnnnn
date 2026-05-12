import { useState, useRef } from 'react';
import { attendanceApi } from '../../services/api';
import './attendance.css';

export default function ImportAttendancePage() {
    const [rows, setRows] = useState([]);
    const [result, setResult] = useState(null);
    const [importing, setImporting] = useState(false);
    const [dragover, setDragover] = useState(false);
    const fileRef = useRef();

    const parseCSV = (text) => {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        return lines.slice(1).map(line => {
            const vals = line.split(',').map(v => v.trim());
            const row = {};
            headers.forEach((h, i) => { row[h] = vals[i] || ''; });
            return {
                employee_id: parseInt(row.employee_id || row.id || '0'),
                date: row.date || '',
                check_in: row.check_in || row.checkin || '',
                check_out: row.check_out || row.checkout || '',
                status: row.status || 'present',
                notes: row.notes || '',
            };
        }).filter(r => r.employee_id && r.date);
    };

    const handleFile = (file) => {
        if (!file) return;
        setResult(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            const parsed = parseCSV(e.target.result);
            setRows(parsed);
        };
        reader.readAsText(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragover(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const handleImport = async () => {
        setImporting(true);
        setResult(null);
        try {
            const res = await attendanceApi.import(rows);
            setResult(res);
            if (res.created > 0) setRows([]);
        } catch (err) {
            setResult({ error: err.message });
        } finally { setImporting(false); }
    };

    return (
        <div className="att-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Import Chấm công</h1>
                </div>
            </div>

            <div
                className={`att-import-zone ${dragover ? 'dragover' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragover(true); }}
                onDragLeave={() => setDragover(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
            >
                <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                <h3>Kéo thả file CSV hoặc click để chọn</h3>
                <p>Định dạng: employee_id, date, check_in, check_out, status, notes</p>
                <input ref={fileRef} type="file" accept=".csv,.txt" hidden onChange={e => handleFile(e.target.files[0])} />
            </div>

            {rows.length > 0 && (
                <div className="att-import-preview">
                    <div className="content-header" style={{ marginBottom: 'var(--space-3)' }}>
                        <div className="content-header-left">
                            <h2 style={{ fontSize: 'var(--font-size-lg)', margin: 0, fontWeight: 600 }}>Xem trước ({rows.length} dòng)</h2>
                        </div>
                        <div className="content-header-right">
                            <button className="header-btn header-btn-primary" onClick={handleImport} disabled={importing}>
                                {importing ? 'Đang import...' : `Import ${rows.length} dòng`}
                            </button>
                        </div>
                    </div>
                    <div className="att-table-wrap" style={{ maxHeight: 400, overflow: 'auto' }}>
                        <table className="att-table">
                            <thead><tr>
                                <th>Employee ID</th><th>Ngày</th><th>Check In</th>
                                <th>Check Out</th><th>Trạng thái</th><th>Ghi chú</th>
                            </tr></thead>
                            <tbody>
                                {rows.map((r, i) => (
                                    <tr key={i}>
                                        <td>{r.employee_id}</td><td>{r.date}</td>
                                        <td>{r.check_in || '—'}</td><td>{r.check_out || '—'}</td>
                                        <td><span className={`att-badge ${r.status}`}>{r.status}</span></td>
                                        <td>{r.notes || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {result && (
                <div className={`att-import-result ${result.error ? 'error' : 'success'}`}>
                    {result.error
                        ? `❌ Lỗi: ${result.error}`
                        : `✅ Import thành công: ${result.created} bản ghi được tạo, ${result.skipped} bỏ qua.${result.errors?.length ? ' Lỗi: ' + result.errors.join('; ') : ''}`
                    }
                </div>
            )}
        </div>
    );
}
