import { useState, useEffect, useCallback } from 'react';
import { essApi } from '../../services/api';
import ESSLayout from '../../components/ESSLayout/ESSLayout';
import Pagination from '../../components/Pagination/Pagination';
import './ess.css';

export default function ESSSalaryPage() {
    const [data, setData] = useState([]);
    const [empName, setEmpName] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    useEffect(() => { essApi.getProfile().then(setProfile).catch(console.error); }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await essApi.getSalary({ page: pagination.page, limit: pagination.limit });
            setData(result.data);
            setEmpName(result.employee_name);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val) + ' ₫';

    return (
        <ESSLayout profile={profile}>
            <div className="ess-page">
                <h1 className="ess-page-title">Bảng lương</h1>

                <div className="ess-table-wrap">
                    {loading ? <div className="ess-loading">Đang tải...</div> : data.length === 0 ? (
                        <div className="ess-empty"><h3>Chưa có dữ liệu lương</h3><p>Bảng lương sẽ hiển thị khi có dữ liệu payroll.</p></div>
                    ) : (
                        <table className="ess-table">
                            <thead><tr>
                                <th>Tháng</th><th className="tac">Ngày công</th><th className="tar">Lương cơ bản</th>
                                <th className="tar">Tăng ca</th><th className="tar">Thưởng</th><th className="tar">Khấu trừ</th>
                                <th className="tar">Thực lãnh</th><th>Trạng thái</th>
                            </tr></thead>
                            <tbody>
                                {data.map(p => (
                                    <tr key={p.id}>
                                        <td><strong>{p.month}</strong></td>
                                        <td className="tac">{p.working_days}</td>
                                        <td className="tar">{formatCurrency(p.base_salary)}</td>
                                        <td className="tar">{formatCurrency(p.overtime_pay)}</td>
                                        <td className="tar" style={{ color: 'var(--color-success)' }}>{formatCurrency(p.bonus)}</td>
                                        <td className="tar" style={{ color: 'var(--color-danger)' }}>-{formatCurrency(p.deductions)}</td>
                                        <td className="tar"><span className="ess-salary-amount">{formatCurrency(p.net_salary)}</span></td>
                                        <td><span className={`ess-badge ${p.status}`}>{p.status === 'paid' ? 'Đã trả' : p.status === 'draft' ? 'Nháp' : p.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {!loading && data.length > 0 && (
                    <Pagination currentPage={pagination.page} totalItems={pagination.total} pageSize={pagination.limit}
                        onPageChange={p => setPagination(prev => ({ ...prev, page: p }))}
                        onPageSizeChange={s => setPagination(prev => ({ ...prev, limit: s, page: 1 }))} />
                )}
            </div>
        </ESSLayout>
    );
}
