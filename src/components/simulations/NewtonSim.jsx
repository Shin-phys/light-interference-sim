import React, { useState, useEffect, useRef } from 'react';
import { getWavelengthRGB } from '../../utils/color';
import { PhaseInversionBadge, PhysicsPanelLayout, RelatedLinksUI, CrossSectionAndVisualWrapper } from '../common/CommonUI';

const NewtonSim = ({ level }) => {
    const isAdvanced = level === 'advanced';

    const [lambda, setLambda] = useState(500);
    const [R_curvature, setRCurvature] = useState(1.0); // レンズ曲率半径(m)
    const [h, setH] = useState(0); // 発展用：レンズを浮かせた高さ(nm)

    const calculateIntensities = (width, height) => {
        const intensities = new Float32Array(width * height);
        // 画面中心を原点とする(x, y)の範囲を -10mm ～ 10mm とする
        const span = 20;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const realX = (x / width - 0.5) * span;
                const realY = (y / height - 0.5) * span;
                const r_mm = Math.sqrt(realX * realX + realY * realY);

                // レンズ下面とガラス板の隙間 d = r^2 / (2R)  (Rは[m]なので単位に注意)
                // r_mm^2 / (2 R [m]) = [mm^2] / [m] = 10^-6 [m^2] / [m] = μm
                // nm にするには x 1000
                const d_nm = (r_mm * r_mm) / (2 * R_curvature) * 1000 + h;

                // 全干渉が起こる光路差 2d
                const opd_nm = 2 * d_nm;

                // パターン：下面反射時に位相反転(+π)
                const phi = 2 * Math.PI * opd_nm / lambda + Math.PI;

                // h を浮かせた場合、隙間が大きすぎると見えなくなる等の効果は無視
                const I = Math.cos(phi / 2) ** 2;
                intensities[y * width + x] = I;
            }
        }
        return intensities;
    };

    const NewtonRingsView = () => {
        const canvasRef = useRef(null);

        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;

            const intensities = calculateIntensities(width, height);
            const color = getWavelengthRGB(lambda);

            const imageData = ctx.createImageData(width, height);
            for (let i = 0; i < width * height; i++) {
                const I = Math.pow(intensities[i], 0.8);
                const r = Math.floor(color.r * I);
                const g = Math.floor(color.g * I);
                const b = Math.floor(color.b * I);

                imageData.data[i * 4] = r;
                imageData.data[i * 4 + 1] = g;
                imageData.data[i * 4 + 2] = b;
                imageData.data[i * 4 + 3] = 255;
            }
            ctx.putImageData(imageData, 0, 0);

            // 中心線のマーキング
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.moveTo(width / 2, 0);
            ctx.lineTo(width / 2, height);
            ctx.moveTo(0, height / 2);
            ctx.lineTo(width, height / 2);
            ctx.stroke();

        }, [lambda, R_curvature, h]);

        return (
            <div style={{ position: 'relative', margin: '0 auto', width: '250px', height: '250px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                <canvas ref={canvasRef} width={250} height={250} style={{ width: '100%', height: '100%', display: 'block', backgroundColor: '#000' }} />
                <div style={{ position: 'absolute', bottom: '5px', left: '10px', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>上から見た像</div>
            </div>
        );
    };

    const SchematicView = () => {
        return (
            <svg width="100%" height="150" viewBox="0 0 500 150" style={{ backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                {/* 背景のガラス板 */}
                <rect x="50" y="100" width="400" height="20" fill="rgba(148, 163, 184, 0.4)" stroke="#64748b" />

                {/* 平凸レンズ */}
                <path d="M 150 100 Q 250 -0 350 100" fill="rgba(148, 163, 184, 0.2)" stroke="#3b82f6" strokeWidth="2" transform={`translate(0, ${-h / 100})`} />

                {/* レンズが置かれた状態のマーキング */}
                <line x1="250" y1="20" x2="250" y2="100" stroke="#94a3b8" strokeDasharray="4 2" />

                <text x="210" y="25" fontSize="12" fill="#3b82f6">曲率半径 R</text>

                <circle cx="250" cy="100" r="3" fill="#ef4444" />
                <text x="260" y="115" fontSize="12" fill="#ef4444" fontWeight="bold">中心 (d≈0)</text>

                {h > 0 && <text x="260" y="90" fontSize="12" fill="#f59e0b" fontWeight="bold">浮かせた高さ h</text>}
            </svg>
        );
    };

    const GraphView = () => {
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
            ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height);
            const yZero = height - 10;
            ctx.moveTo(0, yZero); ctx.lineTo(width, yZero);
            ctx.stroke();

            const span = 20; // 20mm
            const color = getWavelengthRGB(lambda);
            const colorStr = `rgb(${color.r},${color.g},${color.b})`;

            ctx.beginPath();
            for (let x = 0; x < width; x++) {
                const realX = (x / width - 0.5) * span;
                const d_nm = (realX * realX) / (2 * R_curvature) * 1000 + h;
                const phi = 2 * Math.PI * (2 * d_nm) / lambda + Math.PI;
                const I = Math.cos(phi / 2) ** 2;
                const py = yZero - I * (height - 20);
                if (x === 0) ctx.moveTo(x, py);
                else ctx.lineTo(x, py);
            }
            ctx.strokeStyle = colorStr;
            ctx.lineWidth = 2;
            ctx.stroke();
        }, [lambda, R_curvature, h]);

        return (
            <div style={{ width: '100%', height: '100px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '1rem' }}>
                <canvas ref={canvasRef} width={500} height={100} style={{ width: '100%', height: '100%', display: 'block' }} />
            </div>
        );
    };

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
                        <span>レンズ曲率半径 R</span>
                        <span style={{ fontWeight: 'bold' }}>{(R_curvature).toFixed(1)} m</span>
                    </label>
                    <input type="range" min="0.5" max="5.0" step="0.5" value={R_curvature} onChange={(e) => setRCurvature(Number(e.target.value))} style={{ width: '100%' }} />
                </div>

                {isAdvanced && (
                    <div style={{ marginTop: 'auto', borderTop: '2px solid #e2e8f0', paddingTop: '1rem' }}>
                        <h4 style={{ color: '#059669', marginBottom: '0.5rem', fontSize: '0.9rem' }}>発展機能</h4>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>レンズを浮かす高さ h: <strong>{h} nm</strong></label>
                            <input type="range" min="0" max="500" step="10" value={h} onChange={(e) => setH(Number(e.target.value))} style={{ width: '100%' }} />
                            <p style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.4rem' }}>
                                少し持ち上げると、中心の空気層の厚みが<br />$\lambda/4$ に達した時点で中心が明るくなります。
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="panel schematic-area" style={{ gridColumn: '2 / 4' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>断面と観察像</h3>
                <CrossSectionAndVisualWrapper title="1. 断面図 (横から)">
                    <SchematicView />
                </CrossSectionAndVisualWrapper>

                <CrossSectionAndVisualWrapper title="2. 観察像と半径方向の強度分布" note="二次元的に広がるくさび形と考えると、等間隔ではない円形のしま模様が現れます。">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <NewtonRingsView />
                        <GraphView />
                    </div>
                </CrossSectionAndVisualWrapper>
            </div>

            <div className="panel physics-panel">
                <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>縞間隔への影響・物理的意味</h3>
                <PhysicsPanelLayout
                    causeOfDifference="レンズとガラスに挟まれた空気層の厚さ d = x²/2R の変化"
                    hasInversion={true}
                    formulaText="ΔL = 2d = x²/R"
                    formulaDesc="中心から離れるほど厚さの変化が急になるため、くさび形と異なり外側の明線ほど間隔が狭くなります。"
                    conditionBright="x²/R = (m + 0.5)λ"
                    conditionDark="x²/R = mλ"
                />
            </div>

            <div className="panel related-panel" style={{ backgroundColor: '#f8fafc' }}>
                <h3>関連現象へ進む</h3>
                <RelatedLinksUI links={[
                    { id: 'wedge', name: 'くさび形空気層', desc: '原理は同じです。厚みが一方向ではなく放射状に変化します。', color: '#ef4444' }
                ]} />
            </div>
        </div>
    );
};

export default NewtonSim;
