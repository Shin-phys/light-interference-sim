import React, { useState, useEffect, useRef } from 'react';
import { getWavelengthRGB } from '../../utils/color';
import { PhysicsPanelLayout, RelatedLinksUI, CrossSectionAndVisualWrapper } from '../common/CommonUI';

const WedgeSim = ({ level }) => {
    const isAdvanced = level === 'advanced';

    const [lambda, setLambda] = useState(500);
    const [alphaScaled, setAlphaScaled] = useState(50); // 10^-4 rad 相当のスケール
    const [nMed, setNMed] = useState(1.0); // 発展用：くさびの間の媒質屈折率

    // 実際のくさびの角度 (rad)
    const alpha = alphaScaled * 1e-4;

    const calculateIntensities = (width) => {
        const intensities = new Float32Array(width);
        // 画面幅を 50mm とする（xは 0 から 50mm）
        const screenSpan = 50;

        for (let x = 0; x < width; x++) {
            const realX_mm = (x / width) * screenSpan; // 0 ~ 50mm

            // 厚さ d = α * x [mm]
            const thickness_mm = alpha * realX_mm;
            const thickness_nm = thickness_mm * 1e6;

            // 光路差 ΔL = 2 * n * d (垂直入射)
            const opd_nm = 2 * nMed * thickness_nm;

            // 位相反転：ガラス->空気(反転なし)、空気->ガラス(反転あり)。合計で1回反転(π)
            // ※nMed > 1.0 (空気以外の液体など) の場合は、ガラス(n~1.5)との屈折率の大小に依存するが、
            // ここでは空気(n=1.0)または水(n=1.33)を仮定し、ガラス(n=1.5)より小さいとして常に反転1回とする。
            const phi = 2 * Math.PI * opd_nm / lambda + Math.PI;

            intensities[x] = Math.cos(phi / 2) ** 2;
        }
        return intensities;
    };

    const FringeAndGraphView = () => {
        const canvasRef = useRef(null);

        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;

            const intensities = calculateIntensities(width);
            const color = getWavelengthRGB(lambda);
            const colorStr = `rgb(${color.r},${color.g},${color.b})`;

            // --- 干渉縞の描画 (上部) ---
            const fringeHeight = 60;
            const imageData = ctx.createImageData(width, fringeHeight);
            for (let x = 0; x < width; x++) {
                const I = Math.pow(intensities[x], 0.8);
                const r = Math.floor(color.r * I);
                const g = Math.floor(color.g * I);
                const b = Math.floor(color.b * I);

                for (let y = 0; y < fringeHeight; y++) {
                    const idx = (y * width + x) * 4;
                    imageData.data[idx] = r;
                    imageData.data[idx + 1] = g;
                    imageData.data[idx + 2] = b;
                    imageData.data[idx + 3] = 255; // alpha
                }
            }
            ctx.putImageData(imageData, 0, 0);

            // 先端(x=0)を示す線
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(0, 0, 2, fringeHeight);

            // --- 強度分布グラフの描画 (下部) ---
            const graphY = fringeHeight + 10;
            const graphHeight = height - fringeHeight - 10;
            const yZero = height - 10;

            // グラフ背景
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, graphY, width, graphHeight);
            ctx.strokeStyle = '#e2e8f0';
            ctx.strokeRect(0, graphY, width, graphHeight);

            // グラフの線
            ctx.beginPath();
            for (let x = 0; x < width; x++) {
                const py = yZero - intensities[x] * (graphHeight - 20);
                if (x === 0) ctx.moveTo(x, py);
                else ctx.lineTo(x, py);
            }
            ctx.strokeStyle = colorStr;
            ctx.lineWidth = 2;
            ctx.stroke();

        }, [lambda, alphaScaled, nMed]);

        return (
            <canvas ref={canvasRef} width={600} height={180} style={{ width: '100%', display: 'block', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
        );
    };

    const SchematicView = () => {
        return (
            <svg width="100%" height="150" viewBox="0 0 500 150">
                {/* 背景 */}
                <rect width="100%" height="100%" fill="#f8fafc" />

                {/* 上のガラス板 (傾いている) */}
                <polygon points="50,60 450,20 450,30 50,70" fill="rgba(148, 163, 184, 0.5)" stroke="#64748b" />
                {/* 下のガラス板 (水平) */}
                <rect x="50" y="70" width="400" height="10" fill="rgba(148, 163, 184, 0.5)" stroke="#64748b" />

                {/* 中間の空気層(媒質) */}
                {nMed > 1.0 && (
                    <polygon points="50,70 450,30 450,70" fill="rgba(56, 189, 248, 0.2)" />
                )}

                {/* 光線（入射から反射） */}
                <g stroke={getWavelengthRGB(lambda) && `rgb(${getWavelengthRGB(lambda).r},${getWavelengthRGB(lambda).g},${getWavelengthRGB(lambda).b})`} strokeWidth="1.5">
                    {/* x=200 付近の光線 */}
                    <line x1="200" y1="10" x2="200" y2="45" opacity="0.6" /> {/* 入射 */}
                    <line x1="200" y1="45" x2="190" y2="10" opacity="0.6" strokeDasharray="3 2" /> {/* ガラス下面反射 (反転なし) */}
                    <line x1="200" y1="45" x2="200" y2="70" opacity="0.8" /> {/* 透過 */}
                    <line x1="200" y1="70" x2="210" y2="10" opacity="0.8" /> {/* ガラス上面反射 (π反転) */}
                </g>

                {/* π反転のマーカー */}
                <circle cx="200" cy="70" r="4" fill="#ef4444" />
                <text x="210" y="85" fontSize="12" fill="#ef4444" fontWeight="bold">π 反転</text>

                <text x="30" y="70" fontSize="14" fill="#1e293b" fontWeight="bold">先端 (x=0)</text>
                <text x="400" y="55" fontSize="14" fill="#64748b">厚さ d</text>
                <path d="M 450 30 L 450 70" stroke="#64748b" markerEnd="url(#arrowY)" markerStart="url(#arrowY)" />
            </svg>
        );
    };

    const deltaX = lambda / (2 * nMed * alpha * 1e6); // mm

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
                        <span>くさびの角度 α (×10⁻⁴ rad)</span>
                        <span style={{ fontWeight: 'bold' }}>{alphaScaled}</span>
                    </label>
                    <input type="range" min="10" max="100" step="1" value={alphaScaled} onChange={(e) => setAlphaScaled(Number(e.target.value))} style={{ width: '100%' }} />
                </div>

                {isAdvanced && (
                    <div style={{ marginTop: 'auto', borderTop: '2px solid #e2e8f0', paddingTop: '1rem' }}>
                        <h4 style={{ color: '#059669', marginBottom: '0.5rem', fontSize: '0.9rem' }}>発展機能</h4>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>隙間の媒質屈折率 n: <strong>{nMed.toFixed(2)}</strong></label>
                        <input type="range" min="1.0" max="1.5" step="0.05" value={nMed} onChange={(e) => setNMed(Number(e.target.value))} style={{ width: '100%' }} />
                        <p style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.4rem' }}>水などで満たすと光学的厚さが増し、縞間隔が狭くなります。</p>
                    </div>
                )}
            </div>

            <div className="panel schematic-area" style={{ gridColumn: '2 / 4' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>断面図と干渉縞の対応</h3>
                <CrossSectionAndVisualWrapper title="1. 断面図 (光の進み方)">
                    <SchematicView />
                </CrossSectionAndVisualWrapper>

                <CrossSectionAndVisualWrapper title="2. 上から見た観察像 (縞模様と強度)" note={`現在の縞間隔 Δx = ${deltaX.toFixed(2)} mm`}>
                    <FringeAndGraphView />
                    <div style={{ marginTop: '0.8rem', padding: '0.5rem', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', fontSize: '0.9rem' }}>
                        <strong>先端が暗線になる理由:</strong> <br />
                        先端 ($x=0$) では空気層の厚さがほぼ0となり、光路差は0になります。しかし、<strong>下のガラス面で反射するときだけ位相がπ反転する</strong>ため、波の山と谷が完全に重なって打ち消し合い、暗線となります。
                    </div>
                </CrossSectionAndVisualWrapper>
            </div>

            <div className="panel physics-panel">
                <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>縞間隔への影響・物理的意味</h3>
                <PhysicsPanelLayout
                    causeOfDifference="空気層の厚さ d が場所(x)によって変化するため。往復分の 2d が経路差となる。"
                    hasInversion={true}
                    formulaText="ΔL = 2d = 2αx"
                    formulaDesc="α は極めて小さいため、d = x tanα ≈ αx と近似します。"
                    conditionBright="2αx = (m + 0.5)λ"
                    conditionDark="2αx = mλ"
                />
            </div>

            <div className="panel related-panel" style={{ backgroundColor: '#f8fafc' }}>
                <h3>関連現象へ進む</h3>
                <RelatedLinksUI links={[
                    { id: 'newton', name: 'ニュートンリング', desc: '厚さが場所で変わる点は同じですが、2次元（レンズ）になると円形の縞になります。', color: '#10b981' },
                    { id: 'thin-film', name: '薄膜干渉', desc: '反射と位相反転の原理は共通しています。', color: '#a855f7' }
                ]} />
            </div>
        </div>
    );
};

export default WedgeSim;
