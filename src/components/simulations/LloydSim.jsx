import React, { useState, useEffect, useRef } from 'react';
import { getWavelengthRGB } from '../../utils/color';
import { PhaseInversionBadge, PhysicsPanelLayout, RelatedLinksUI, CrossSectionAndVisualWrapper } from '../common/CommonUI';

const calculateIntensities = (width, lambda, d, L) => {
    const intensities = new Float32Array(width);
    const screenSpan = 40; // -20mm to +20mm

    for (let x = 0; x < width; x++) {
        const y_pos = (x - width / 2) * (screenSpan / width);
        // 鏡の面を y=0 (x=width/2相当) とする。
        // リュイド鏡は直達光と反射光が干渉するため、反射光の光路長は仮想光源(距離d)からの光路長に等しい。
        // 光路差 = d * y_pos / L (ヤングの実験と同じ)
        const opd_mm = (d / 1000) * (y_pos) / (L / 1000); // mm単位の光路差近似
        const opd_nm = opd_mm * 1e6; // nmに変換

        // リュイド鏡では、鏡で反射する光のみ位相がπずれるため、全体の位相差に π を足す
        const phi = 2 * Math.PI * opd_nm / lambda + Math.PI;

        // y < 0 (鏡より下) の領域は、光が到達しないか鏡の裏なので今回は描画しない(強度0)として扱うか、
        // あるいは仮想的にスクリーン全体に干渉縞ができるように見せるか。
        // 直達光と反射光の両方が届く領域（y > 0）のみ干渉縞を描画するのが正確。
        if (y_pos < 0) {
            intensities[x] = 0; // 反射光が届かない領域
        } else {
            intensities[x] = Math.cos(phi / 2) ** 2;
        }
    }
    return intensities;
};

const FringeView = ({ lambda, d, L }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        const color = getWavelengthRGB(lambda);
        const intensities = calculateIntensities(width, lambda, d, L);

        const imageData = ctx.createImageData(width, height);
        for (let x = 0; x < width; x++) {
            const I = Math.pow(intensities[x], 0.8);
            const r = Math.floor(color.r * I);
            const g = Math.floor(color.g * I);
            const b = Math.floor(color.b * I);

            for (let y = 0; y < height; y++) {
                const idx = (y * width + x) * 4;
                imageData.data[idx] = r;
                imageData.data[idx + 1] = g;
                imageData.data[idx + 2] = b;
                imageData.data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);

        // 鏡の位置(中央)に境界線を引く
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('鏡の面 (x=0)', width / 2 + 5, height - 5);

    }, [lambda, d, L]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
            <canvas ref={canvasRef} width={600} height={100} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
    );
};

const GraphView = ({ lambda, d, L }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        const yZero = height - 20;
        ctx.moveTo(0, yZero);
        ctx.lineTo(width, yZero);
        ctx.stroke();

        const intensities = calculateIntensities(width, lambda, d, L);
        const color = getWavelengthRGB(lambda);
        const colorStr = `rgb(${color.r},${color.g},${color.b})`;

        ctx.beginPath();
        for (let x = 0; x < width; x++) {
            const py = yZero - intensities[x] * (height - 40);
            if (x === 0) ctx.moveTo(x, py);
            else ctx.lineTo(x, py);
        }
        ctx.strokeStyle = colorStr;
        ctx.lineWidth = 2;
        ctx.stroke();

    }, [lambda, d, L]);

    return (
        <div style={{ width: '100%', height: '140px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '1rem' }}>
            <canvas ref={canvasRef} width={600} height={140} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
    );
};

const SchematicView = ({ lambda }) => {
    const color = getWavelengthRGB(lambda);
    const colorStr = `rgb(${color.r},${color.g},${color.b})`;

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '280px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
            <svg width="100%" height="100%" viewBox="0 0 500 300" style={{ backgroundColor: '#f8fafc' }}>
                <defs>
                    <marker id="arrowY" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                    </marker>
                </defs>

                {/* 光源S1 (実光源) */}
                <circle cx="120" cy="130" r="4" fill={colorStr} />
                <text x="100" y="134" fontSize="14" fill="#1e293b" fontWeight="bold">S₁</text>

                {/* 仮想光源S2 */}
                <circle cx="120" cy="170" r="4" fill="none" stroke={colorStr} strokeWidth="2" strokeDasharray="2 2" />
                <text x="100" y="174" fontSize="14" fill="#64748b">S₂ (虚)</text>

                <text x="70" y="154" fontSize="14" fill="#64748b" fontWeight="bold">d 間隔</text>
                <line x1="120" y1="130" x2="120" y2="170" stroke="#64748b" />

                {/* 鏡 (y=150) */}
                <rect x="200" y="148" width="150" height="4" fill="#94a3b8" />
                <text x="250" y="165" fontSize="14" fill="#475569" fontWeight="bold">鏡</text>

                {/* スクリーン */}
                <rect x="420" y="10" width="6" height="280" fill="#cbd5e1" />

                {/* 光線 */}
                {/* 直達光S1 -> P */}
                <line x1="120" y1="130" x2="420" y2="70" stroke={colorStr} strokeWidth="1.5" opacity="0.6" />
                {/* 反射光S1 -> 鏡 -> P */}
                <line x1="120" y1="130" x2="270" y2="148" stroke={colorStr} strokeWidth="1.5" opacity="0.6" />
                <line x1="270" y1="148" x2="420" y2="70" stroke={colorStr} strokeWidth="1.5" opacity="0.6" />
                {/* 仮想光線 S2 -> 鏡 */}
                <line x1="120" y1="170" x2="270" y2="148" stroke={colorStr} strokeWidth="1.5" strokeDasharray="4 2" opacity="0.4" />

                {/* 位相反転マーク */}
                <g transform="translate(250, 140)">
                    <path d="M 0 0 L 10 -10 L 20 0" fill="none" stroke="#ef4444" strokeWidth="2" />
                    <text x="-5" y="-12" fontSize="12" fill="#ef4444" fontWeight="bold">π 反転</text>
                </g>

                {/* 点P */}
                <circle cx="420" cy="70" r="4" fill="#ef4444" />
                <text x="432" y="74" fontSize="14" fill="#1e293b" fontWeight="bold">P (位置 x)</text>

                {/* 中心軸と基準 */}
                <line x1="120" y1="150" x2="420" y2="150" stroke="#94a3b8" strokeDasharray="6 4" />
                <text x="432" y="154" fontSize="14" fill="#64748b">O (中央 x=0)</text>
            </svg>
        </div>
    );
};

const LloydSim = ({ level }) => {
    const [lambda, setLambda] = useState(500);
    const [d, setD] = useState(50);
    const [L, setL] = useState(2000);

    return (
        <div className="sim-grid">
            <div className="panel control-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3>操作パネル</h3>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                        <span>波長 λ</span>
                        <span style={{ fontWeight: 'bold' }}>{lambda} nm</span>
                    </label>
                    <input type="range" min="400" max="700" step="10" value={lambda} onChange={(e) => setLambda(Number(e.target.value))} style={{ width: '100%' }} />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                        <span>実光源と仮想光源の間隔 d</span>
                        <span style={{ fontWeight: 'bold' }}>{d} μm</span>
                    </label>
                    <input type="range" min="10" max="100" step="5" value={d} onChange={(e) => setD(Number(e.target.value))} style={{ width: '100%' }} />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                        <span>スクリーン距離 L</span>
                        <span style={{ fontWeight: 'bold' }}>{L} mm</span>
                    </label>
                    <input type="range" min="1000" max="5000" step="100" value={L} onChange={(e) => setL(Number(e.target.value))} style={{ width: '100%' }} />
                </div>
            </div>

            <div className="panel schematic-area">
                <h3 style={{ marginBottom: '0.5rem' }}>光学系モデル (リュイド鏡)</h3>
                <SchematicView lambda={lambda} />
            </div>

            <div className="panel fringe-area">
                <h3 style={{ marginBottom: '0.5rem' }}>干渉パターン</h3>
                <FringeView lambda={lambda} d={d} L={L} />
                <GraphView lambda={lambda} d={d} L={L} />

                <div style={{ marginTop: '1rem', backgroundColor: '#eff6ff', padding: '0.8rem', borderRadius: '6px', borderLeft: '4px solid #ef4444' }}>
                    <p style={{ fontSize: '0.9rem', color: '#b91c1c', margin: 0, fontWeight: 'bold' }}>ヤングの実験との違い</p>
                    <p style={{ fontSize: '0.8rem', color: '#3b82f6', margin: '0.2rem 0 0 0' }}>
                        鏡での反射時に位相がπずれるため、中央（$x=0$）の光路差が0になる場所でも<strong>波の山と谷が重なり、必ず暗線</strong>となります。
                    </p>
                </div>
            </div>

            <div className="panel physics-panel">
                <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>縞間隔への影響・物理的意味</h3>
                <PhysicsPanelLayout
                    causeOfDifference="直達光と鏡で反射した光の経路差 ΔL"
                    hasInversion={true}
                    formulaText="ΔL ≈ d(x/L)"
                    formulaDesc="ヤングの実験と同じく、dは実光源と仮想光源（鏡像）の間の距離を表します。"
                    conditionBright="ΔL = (m + 0.5)λ"
                    conditionDark="ΔL = mλ"
                />
            </div>

            <div className="panel related-panel" style={{ backgroundColor: '#f8fafc' }}>
                <h3>関連現象へ進む</h3>
                <RelatedLinksUI links={[
                    { id: 'young', name: 'ヤングの実験', desc: '反射がない（位相の反転がない）場合の基本的な干渉です。', color: '#3b82f6' }
                ]} />
            </div>
        </div>
    );
};

export default LloydSim;
