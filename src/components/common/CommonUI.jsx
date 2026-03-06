import React from 'react';
import { Link } from 'react-router-dom';

// 位相反転表示コンポーネント
export const PhaseInversionBadge = ({ hasInversion, label = "位相反転の有無:" }) => (
    <li style={{ paddingBottom: '0.8rem', borderBottom: '1px dashed #cbd5e1' }}>
        <strong style={{ color: '#0f172a' }}>{label}</strong>{' '}
        <span style={{
            fontWeight: 'bold',
            color: hasInversion ? '#ef4444' : '#10b981',
            backgroundColor: hasInversion ? '#fef2f2' : '#ecfdf5',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.9rem'
        }}>
            {hasInversion ? "あり (πずれる)" : "なし"}
        </span>
    </li>
);

// 物理パネルの共通フォーマット
export const PhysicsPanelLayout = ({ causeOfDifference, hasInversion, conditionBright, conditionDark, formulaText, formulaDesc }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div>
            <ul className="physics-list" style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ paddingBottom: '0.8rem', borderBottom: '1px dashed #cbd5e1', marginBottom: '0.8rem' }}>
                    <strong style={{ color: '#0f172a' }}>差の原因:</strong> <br />
                    {causeOfDifference}
                </li>
                <PhaseInversionBadge hasInversion={hasInversion} />
            </ul>
        </div>

        <div>
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '0.5rem' }}>経路差の近似式</h4>
                <p style={{ fontSize: '1.2rem', textAlign: 'center', margin: '0.5rem 0', fontWeight: 'bold' }}>
                    {formulaText}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{formulaDesc}</p>
            </div>
        </div>

        <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100%' }}>
                <div style={{ flex: 1, borderLeft: '4px solid #ef4444', padding: '0.5rem 1rem', background: '#fef2f2', borderRadius: '0 6px 6px 0' }}>
                    <h4 style={{ color: '#b91c1c', fontSize: '0.85rem' }}>明線条件（強め合う）</h4>
                    <p style={{ fontSize: '1.1rem', margin: '0.2rem 0', fontWeight: 'bold' }}>{conditionBright}</p>
                </div>
                <div style={{ flex: 1, borderLeft: '4px solid #10b981', padding: '0.5rem 1rem', background: '#ecfdf5', borderRadius: '0 6px 6px 0' }}>
                    <h4 style={{ color: '#047857', fontSize: '0.85rem' }}>暗線条件（弱め合う）</h4>
                    <p style={{ fontSize: '1.1rem', margin: '0.2rem 0', fontWeight: 'bold' }}>{conditionDark}</p>
                </div>
            </div>
        </div>
    </div>
);

// 関連現象リンクUI
export const RelatedLinksUI = ({ links }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
        {links.map((link, idx) => (
            <Link key={idx} to={`/sim/${link.id}`} style={{ display: 'block', padding: '0.8rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', textDecoration: 'none', color: '#1e293b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <strong style={{ display: 'block', color: link.color || '#3b82f6' }}>{link.name}</strong>
                <span style={{ fontSize: '0.75rem' }}>{link.desc}</span>
            </Link>
        ))}
    </div>
);

export const CrossSectionAndVisualWrapper = ({ title, children, note }) => (
    <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ marginBottom: '0.5rem', color: '#334155' }}>{title}</h4>
        {children}
        {note && <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>{note}</p>}
    </div>
);
