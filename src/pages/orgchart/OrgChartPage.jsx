import { useState, useEffect } from 'react';
import { orgChartApi, departmentApi } from '../../services/api';
import './OrgChartPage.css';

const ROLE_LABELS = {
    director: 'Giám đốc',
    department_head: 'Trưởng phòng',
    team_lead: 'Trưởng nhóm',
    senior: 'NV cao cấp',
    staff: 'Nhân viên',
};

const ROLE_COLORS = {
    director: '#e74c3c',
    department_head: '#714B67',
    team_lead: '#2980b9',
    senior: '#27ae60',
    staff: '#7f8c8d',
};

function OrgNode({ node, depth = 0, expandedMap, onToggle }) {
    const isExpanded = expandedMap[node.id] !== false; // default expanded
    const hasChildren = node.children && node.children.length > 0;

    return (
        <li className="org-node-li">
            <div className={`org-node org-role-${node.role}`} onClick={() => hasChildren && onToggle(node.id)}>
                <div className="org-node-avatar" style={{ background: node.avatar_color || '#714B67' }}>
                    {node.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="org-node-info">
                    <span className="org-node-name">{node.name}</span>
                    <span className="org-node-position">{node.job_position_name || '—'}</span>
                    {node.department_name && (
                        <span className="org-node-dept">{node.department_name}</span>
                    )}
                </div>
                <span className="org-node-role-badge" style={{ background: ROLE_COLORS[node.role] || '#7f8c8d' }}>
                    {ROLE_LABELS[node.role] || node.role}
                </span>
                {hasChildren && (
                    <span className="org-node-toggle">
                        {node.subordinate_count > 0 && (
                            <span className="org-node-count">{node.subordinate_count}</span>
                        )}
                        <svg className={`org-chevron ${isExpanded ? 'expanded' : ''}`} viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </span>
                )}
            </div>
            {hasChildren && isExpanded && (
                <ul className="org-children">
                    {node.children.map(child => (
                        <OrgNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            expandedMap={expandedMap}
                            onToggle={onToggle}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}

export default function OrgChartPage() {
    const [tree, setTree] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [totalEmployees, setTotalEmployees] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filterDept, setFilterDept] = useState('');
    const [search, setSearch] = useState('');
    const [expandedMap, setExpandedMap] = useState({});

    useEffect(() => {
        departmentApi.list().then(setDepartments).catch(console.error);
    }, []);

    useEffect(() => {
        setLoading(true);
        const fetchChart = filterDept
            ? orgChartApi.getDepartmentChart(filterDept)
            : orgChartApi.getFullChart();

        fetchChart
            .then(data => {
                setTree(data.tree || []);
                setTotalEmployees(data.total_employees || 0);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [filterDept]);

    const handleToggle = (id) => {
        setExpandedMap(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));
    };

    const expandAll = () => {
        const map = {};
        const walk = (nodes) => nodes.forEach(n => { map[n.id] = true; if (n.children) walk(n.children); });
        walk(tree);
        setExpandedMap(map);
    };

    const collapseAll = () => {
        const map = {};
        const walk = (nodes) => nodes.forEach(n => { map[n.id] = false; if (n.children) walk(n.children); });
        walk(tree);
        setExpandedMap(map);
    };

    // Search filter — highlight matching nodes
    const filterTree = (nodes, term) => {
        if (!term) return nodes;
        const lowerTerm = term.toLowerCase();
        return nodes.reduce((acc, node) => {
            const match = node.name.toLowerCase().includes(lowerTerm) ||
                (node.job_position_name || '').toLowerCase().includes(lowerTerm) ||
                (node.department_name || '').toLowerCase().includes(lowerTerm);
            const filteredChildren = filterTree(node.children || [], term);
            if (match || filteredChildren.length > 0) {
                acc.push({ ...node, children: filteredChildren });
            }
            return acc;
        }, []);
    };

    const displayTree = filterTree(tree, search);

    // Stats
    const countByRole = (nodes, role) => {
        let count = 0;
        nodes.forEach(n => {
            if (n.role === role) count++;
            if (n.children) count += countByRole(n.children, role);
        });
        return count;
    };

    return (
        <div className="orgchart-page">
            {/* Header */}
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Sơ đồ tổ chức</h1>
                    <span className="record-count">{totalEmployees} nhân viên</span>
                </div>
                <div className="content-header-right">
                    <button className="header-btn header-btn-secondary" onClick={expandAll}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        Mở rộng
                    </button>
                    <button className="header-btn header-btn-secondary" onClick={collapseAll}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                        Thu gọn
                    </button>
                </div>
            </div>

            {/* Filter bar */}
            <div className="filter-bar">
                <input
                    type="text"
                    placeholder="Tìm theo tên, chức vụ..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="filter-input"
                    style={{ maxWidth: 280 }}
                />
                <select
                    value={filterDept}
                    onChange={e => setFilterDept(e.target.value)}
                    className="filter-select"
                >
                    <option value="">Tất cả phòng ban</option>
                    {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
            </div>

            {/* Role Legend */}
            <div className="org-legend">
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <span key={key} className="org-legend-item">
                        <span className="org-legend-dot" style={{ background: ROLE_COLORS[key] }}></span>
                        {label}
                        <span className="org-legend-count">{countByRole(tree, key)}</span>
                    </span>
                ))}
            </div>

            {/* Tree */}
            <div className="org-tree-container">
                {loading ? (
                    <div className="loading-state">Đang tải sơ đồ...</div>
                ) : displayTree.length === 0 ? (
                    <div className="empty-list-state">
                        <h3>Chưa có dữ liệu sơ đồ tổ chức</h3>
                        <p>Hãy chạy migration và gán vai trò cho nhân viên.</p>
                    </div>
                ) : (
                    <ul className="org-tree">
                        {displayTree.map(node => (
                            <OrgNode
                                key={node.id}
                                node={node}
                                expandedMap={expandedMap}
                                onToggle={handleToggle}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
