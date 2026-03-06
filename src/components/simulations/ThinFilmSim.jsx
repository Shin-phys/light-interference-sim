import React, { useState, useEffect, useRef } from 'react';
import { getWavelengthRGB, visibleWavelengths } from '../../utils/color';
import { PhysicsPanelLayout, RelatedLinksUI, CrossSectionAndVisualWrapper } from '../common/CommonUI';

const ThinFilmSim = ({ level }) => {
    const isAdvanced = level === 'advanced';

    const [lambda, setLambda] = useState(500);
    const [d, setD] = useState(250); // 膜の厚さ(nm)
    const [n, setN] = useState(1.33); // 水、シャボン玉など
    const [isWhite, setIsWhite] = useState(false); // 白色光モード
    const [theta, setTheta] = useState(0); // 発展用：入射角 (度)

    // 白色光の色を重み付きで計算
    const mixWhiteLightColor = (thickness_nm, n_med, theta_deg = 0) => {
        let R = 0, G = 0, B = 0;
        const theta_rad = theta_deg * Math.PI / 180;
        // スネルの法則 sin(θ1) = n * sin(θ2) → θ2 = asin(sin(θ1)/n)
        let cos_theta_t = 1.0;
        if (theta_deg > 0) {
            const sin_t = Math.sin(theta_rad) / n_med;
            cos_theta_t = Math.sqrt(1 - sin_t * sin_t);
        }
        const opd = 2 * n_med * thickness_nm * cos_theta_t;

        visibleWavelengths.forEach(wl => {
            // 膜の表(空気→膜)でπ反転、裏(膜→空気)で反転なし
            const phi = 2 * Math.PI * opd / wl + Math.PI;
            const I = Math.cos(phi / 2) ** 2;
            const c = getWavelengthRGB(wl);
            R += c.r * I;
            G += c.g * I;
            B += c.b * I;
        });
        // 正規化 (約 16ステップあるので経験的な係数で割る)
        const factor = 0.25;
        return {
            r: Math.min(255, Math.floor(R * factor)),
            g: Math.min(255, Math.floor(G * factor)),
            b: Math.min(255, Math.floor(B * factor))
        };
    };

    const getIntensity = (thickness_nm, n_med, wl, theta_deg = 0) => {
        const theta_rad = theta_deg * Math.PI / 180;
        let cos_theta_t = 1.0;
        if (theta_deg > 0) {
            const sin_t = Math.sin(theta_rad) / n_med;
            cos_theta_t = Math.sqrt(1 - sin_t * sin_t);
        }
        const opd = 2 * n_med * thickness_nm * cos_theta_t;
        const phi = 2 * Math.PI * opd / wl + Math.PI;
        return Math.cos(phi / 2) ** 2;
    };

    const currentColor = isWhite
        ? mixWhiteLightColor(d, n, theta)
        : (() => {
            const I = getIntensity(d, n, lambda, theta);
            const c = getWavelengthRGB(lambda);
            return {
                r: Math.floor(c.r * I),
                g: Math.floor(c.g * I),
                b: Math.floor(c.b * I)
            };
        })();

    const colorStr = `rgb(${currentColor.r},${currentColor.g},${currentColor.b})`;

    // 厚さに伴う色の変化を描画するビュー（油膜のイメージ）
    const WedgeFilmView = () => {
        const canvasRef = useRef(null);
        useEffect(() => {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;

            const imageData = ctx.createImageData(width, height);
            for (let x = 0; x < width; x++) {
                // x=0 で 厚さ0, x=width で 厚さ 800nm とする
                const t_nm = (x / width) * 800;
                let c;
                if (isWhite) {
                    c = mixWhiteLightColor(t_nm, n, theta);
                } else {
                    const I = getIntensity(t_nm, n, lambda, theta);
                    const base = getWavelengthRGB(lambda);
                    // コントラスト強化
                    const I_p = Math.pow(I, 0.8);
                    c = { r: Math.floor(base.r * I_p), g: Math.floor(base.g * I_p), b: Math.floor(base.b * I_p) };
                }
                for (let y = 0; y < height; y++) {
                    const idx = (y * width + x) * 4;
                    imageData.data[idx] = c.r;
                    imageData.data[idx + 1] = c.g;
                    imageData.data[idx + 2] = c.b;
                    imageData.data[idx + 3] = 255;
                }
            }
            ctx.putImageData(imageData, 0, 0);

            // 現在の厚さにマーカーを引く
            const currentX = (d / 800) * width;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(currentX, 0);
            ctx.lineTo(currentX, height);
            ctx.stroke();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.stroke();
        }, [d, n, lambda, isWhite, theta]);

        return (
            <div style={{ position: 'relative', width: '100%', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                <canvas ref={canvasRef} width={600} height={100} style={{ width: '100%', height: '100%', display: 'block' }} />
                <div style={{ position: 'absolute', bottom: '5px', left: '10px', color: '#fff', textShadow: '1px 1px 2px #000', fontSize: '0.8rem' }}>厚さ: 0nm</div>
                <div style={{ position: 'absolute', bottom: '5px', right: '10px', color: '#fff', textShadow: '1px 1px 2px #000', fontSize: '0.8rem' }}>厚さ: 800nm</div>
                <div style={{ position: 'absolute', top: '5px', left: `${(d / 800) * 100}%`, transform: 'translateX(-50%)', backgroundColor: '#fff', padding: '2px 4px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    {d} nm
                </div>
            </div>
        );
    };

    return (
        <div className="sim-grid">
            <div className="panel control-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3>操作パネル</h3>

                <div style={{ marginBottom: '1rem', padding: '0.8rem', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                        <input type="checkbox" checked={isWhite} onChange={(e) => setIsWhite(e.target.checked)} />
                        白色光モード
                    </label>
                </div>

                {!isWhite && (
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                            <span>波長 λ</span>
                            <span style={{ fontWeight: 'bold' }}>{lambda} nm</span>
                        </label>
                        <input type="range" min="400" max="700" step="10" value={lambda} onChange={(e) => setLambda(Number(e.target.value))} style={{ width: '100%' }} />
                    </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.2rem', color: '#0369a1', fontWeight: 'bold' }}>
                        <span>膜の厚さ d</span>
                        <span>{d} nm</span>
                    </label>
                    <input type="range" min="0" max="800" step="10" value={d} onChange={(e) => setD(Number(e.target.value))} style={{ width: '100%' }} />
                </div>

                {isAdvanced && (
                    <div style={{ marginTop: 'auto', borderTop: '2px solid #e2e8f0', paddingTop: '1rem' }}>
                        <h4 style={{ color: '#059669', marginBottom: '0.5rem', fontSize: '0.9rem' }}>発展機能</h4>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>入射角 θ: <strong>{theta}°</strong></label>
                            <input type="range" min="0" max="80" step="5" value={theta} onChange={(e) => setTheta(Number(e.target.value))} style={{ width: '100%' }} />
                            <p style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.4rem' }}>斜めに入射すると、膜内部での光路差は cos(θ_t)倍 となり、短くなります（青みを帯びます）。</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="panel schematic-area" style={{ gridColumn: '2 / 4' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>膜による反射と干渉</h3>

                <CrossSectionAndVisualWrapper title={`指定した厚さ d = ${d} nm での色`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{
                            width: '100px', height: '100px', borderRadius: '50%', backgroundColor: colorStr,
                            boxShadow: 'inset -10px -10px 20px rgba(0,0,0,0.3), inset 5px 5px 10px rgba(255,255,255,0.5), 0 4px 6px -1px rgba(0,0,0,0.1)',
                            border: '1px solid rgba(255,255,255,0.4)'
                        }}></div>
                        <p style={{ fontSize: '0.9rem', flex: 1, color: '#334155' }}>
                            左の球体は、指定した厚さ <strong style={{ color: '#0369a1' }}>{d} nm</strong> の膜から反射される光の色（シャボン玉の一部と同じイメージ）です。
                            {!isWhite ? '単色光のため明暗のみですが、' : '白色光のため、様々な波長が重なり合って自然な色づきになります。'}
                            膜の厚さをスライダーで変えると反射色が変わることを確かめてください。
                        </p>
                    </div>
                </CrossSectionAndVisualWrapper>

                <CrossSectionAndVisualWrapper title="膜の厚さ分布と見え方のグラフ" note="厚さが場所によって徐々に変化する膜（例：重力で垂れた油膜）の色の分布です。">
                    <WedgeFilmView />
                </CrossSectionAndVisualWrapper>
            </div>

            <div className="panel physics-panel">
                <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>縞間隔への影響・物理的意味</h3>
                <PhysicsPanelLayout
                    causeOfDifference="膜の表と裏で反射した2つの光の経路差。"
                    hasInversion={true}
                    formulaText={isAdvanced && theta > 0 ? "ΔL = 2nd cos(θt)" : "ΔL = 2nd"}
                    formulaDesc="nは膜の屈折率です。表面(空気→膜)でπ反転し、裏面(膜→空気)では反転しません。そのため全体で位相がπ反転します。"
                    conditionBright="2nd = (m + 0.5)λ"
                    conditionDark="2nd = mλ"
                />
            </div>

            <div className="panel related-panel" style={{ backgroundColor: '#f8fafc' }}>
                <h3>関連現象へ進む</h3>
                <RelatedLinksUI links={[
                    { id: 'wedge', name: 'くさび形空気層', desc: '厚さの変化による干渉を扱う点で非常に似ています。', color: '#ef4444' },
                    { id: 'young', name: 'ヤングの実験', desc: '反射や厚みを使わない干渉の基本です。', color: '#3b82f6' }
                ]} />
            </div>
        </div>
    );
};

export default ThinFilmSim;
