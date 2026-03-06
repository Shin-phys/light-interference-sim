import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// 指定波長(nm)からRGBカラーを近似的に算出する関数
const getWavelengthRGB = (lambda) => {
    let R, G, B;
    if (lambda >= 380 && lambda < 440) {
        R = -(lambda - 440) / (440 - 380);
        G = 0.0;
        B = 1.0;
    } else if (lambda >= 440 && lambda < 490) {
        R = 0.0;
        G = (lambda - 440) / (490 - 440);
        B = 1.0;
    } else if (lambda >= 490 && lambda < 510) {
        R = 0.0;
        G = 1.0;
        B = -(lambda - 510) / (510 - 490);
    } else if (lambda >= 510 && lambda < 580) {
        R = (lambda - 510) / (580 - 510);
        G = 1.0;
        B = 0.0;
    } else if (lambda >= 580 && lambda < 645) {
        R = 1.0;
        G = -(lambda - 645) / (645 - 580);
        B = 0.0;
    } else if (lambda >= 645 && lambda <= 780) {
        R = 1.0;
        G = 0.0;
        B = 0.0;
    } else {
        R = 0.0; G = 0.0; B = 0.0;
    }
    let intensity = 1.0;
    if (lambda >= 380 && lambda < 420) intensity = 0.3 + 0.7 * (lambda - 380) / (420 - 380);
    else if (lambda > 700 && lambda <= 780) intensity = 0.3 + 0.7 * (780 - lambda) / (780 - 700);

    return {
        r: Math.round(R * intensity * 255),
        g: Math.round(G * intensity * 255),
        b: Math.round(B * intensity * 255)
    };
};

// 共通の強度計算ロジック（表示幅 -20mm 〜 20mm の範囲について強度配列を返す）
const calculateIntensities = (width, lambda, d, L, nMed, s, nPlate, N) => {
    const intensities = new Float32Array(width);
    const screenSpan = 40; // 表示幅を40mm（-20mm ～ +20mm）とする

    for (let x = 0; x < width; x++) {
        const y_pos = (x - width / 2) * (screenSpan / width);
        // 元の光路差(nm) = y * d / L * nMed
        // ※ y(mm), d(μm), L(mm) → (d * y / L) * 1000 で nm 単位になる
        let opd_nm = 1000 * (d * y_pos / L) * nMed;

        // 板が挿入されている場合、上側のスリット(y>0相当)の光路長が s*(nPlate-nMed) 増加するとする
        if (s > 0) {
            opd_nm -= s * 1000 * (nPlate - nMed);
        }

        const phi = 2 * Math.PI * opd_nm / lambda;
        if (N === 2) {
            intensities[x] = Math.cos(phi / 2) ** 2;
        } else {
            if (Math.abs(Math.sin(phi / 2)) < 1e-6) {
                intensities[x] = 1.0;
            } else {
                intensities[x] = (Math.sin(N * phi / 2) / (N * Math.sin(phi / 2))) ** 2;
            }
        }
    }
    return intensities;
};

// 1. 干渉縞の描画コンポーネント
const FringeView = ({ lambda, d, L, nMed, s, nPlate, N }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        const color = getWavelengthRGB(lambda);
        const intensities = calculateIntensities(width, lambda, d, L, nMed, s, nPlate, N);

        // 画像データを作成して一気に描画
        const imageData = ctx.createImageData(width, height);
        for (let x = 0; x < width; x++) {
            // 視覚的なコントラスト向上のため、少しガンマ補正っぽくする
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

        // 軸・目盛りの描画
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';

        // 中央線
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();

    }, [lambda, d, L, nMed, s, nPlate, N]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
            <canvas ref={canvasRef} width={600} height={100} style={{ width: '100%', height: '100%', display: 'block' }} />
            <div style={{ position: 'absolute', top: '5px', left: '10px', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>スクリーン上</div>
        </div>
    );
};

// 2. 強度分布グラフの描画コンポーネント
const GraphView = ({ lambda, d, L, nMed, s, nPlate, N }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // 背景グリッドと軸
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // 縦軸（中央=0）
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        // 横軸（y=0 ライン、表示領域の下部）
        const yZero = height - 20;
        ctx.moveTo(0, yZero);
        ctx.lineTo(width, yZero);
        ctx.stroke();

        const intensities = calculateIntensities(width, lambda, d, L, nMed, s, nPlate, N);
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

        // 目盛り文字 (表示幅は-20mm ～ 20mm なので、x = -10, 0, 10 に線を引く)
        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('0', width / 2, height - 5);
        ctx.fillText('x', width - 10, height - 5);
        ctx.fillText('I', width / 2 + 10, 15);

    }, [lambda, d, L, nMed, s, nPlate, N]);

    return (
        <div style={{ width: '100%', height: '140px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <canvas ref={canvasRef} width={600} height={140} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
    );
};

// 3. スキマティック（光学系）モデルの描画コンポーネント
const SchematicView = ({ lambda, subTab, s, nMed, N }) => {
    const color = getWavelengthRGB(lambda);
    const colorStr = `rgb(${color.r},${color.g},${color.b})`;
    const isMulti = subTab === 'multi';
    const hasMedium = subTab === 'medium' && nMed > 1.0;

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '280px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
            <svg width="100%" height="100%" viewBox="0 0 500 300" style={{ backgroundColor: hasMedium ? '#e0f2fe' : '#f8fafc' }}>
                <defs>
                    <marker id="arrowY" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                    </marker>
                </defs>

                {hasMedium && <text x="10" y="20" fill="#0369a1" fontSize="12" fontWeight="bold">媒質 (屈折率 n = {nMed.toFixed(2)})</text>}

                {/* スリット（壁）の描画 */}
                <rect x="120" y="10" width="8" height="280" fill="#334155" />

                {/* N個（または2個）の隙間を空ける */}
                {Array.from({ length: N }).map((_, i) => {
                    const span = 40; // スリットの全体の広がり幅
                    const offset = (N === 1) ? 0 : (i * span / (N - 1)) - span / 2;
                    const yPos = 150 + offset;
                    return (
                        <g key={i}>
                            <rect x="119" y={yPos - 2} width="10" height="4" fill={hasMedium ? '#e0f2fe' : '#f8fafc'} />
                            {/* 板の挿入 (上側のスリット i=0 にのみ挿入) */}
                            {subTab === 'plate' && i === 0 && s > 0 && (
                                <rect x="129" y={yPos - 4} width={Math.min(s * 3, 20)} height="8" fill="rgba(16, 185, 129, 0.6)" stroke="#059669" />
                            )}
                        </g>
                    );
                })}

                {/* スクリーン */}
                <rect x="420" y="10" width="6" height="280" fill="#94a3b8" />

                {/* 光線（代表として最初と最後のスリットから点Pへ） */}
                <g stroke={colorStr} strokeWidth="1.5" opacity="0.6" strokeDasharray="4 2">
                    <line x1="130" y1={150 - 20} x2="420" y2="70" />
                    <line x1="130" y1={150 + (N > 1 ? 20 : 0)} x2="420" y2="70" />
                </g>

                {/* 点P */}
                <circle cx="420" cy="70" r="4" fill="#ef4444" />
                <text x="432" y="74" fontSize="14" fill="#1e293b" fontWeight="bold">P (位置 x)</text>

                {/* 中心軸と基準 */}
                <line x1="120" y1="150" x2="420" y2="150" stroke="#94a3b8" strokeDasharray="6 4" />
                <text x="432" y="154" fontSize="14" fill="#64748b">O (中央 x=0)</text>

                <text x="70" y="154" fontSize="14" fill="#64748b" fontWeight="bold">d 間隔</text>

                <line x1="130" y1="280" x2="420" y2="280" stroke="#64748b" markerEnd="url(#arrowY)" markerStart="url(#arrowY)" />
                <text x="260" y="272" fontSize="14" fill="#64748b" fontWeight="bold">距離 L</text>

                {/* --- 経路差の拡大図モジュール --- */}
                {!isMulti && (
                    <g transform="translate(15, 180)">
                        <rect x="0" y="0" width="160" height="105" fill="#ffffff" stroke="#cbd5e1" rx="4" />
                        <text x="10" y="18" fontSize="11" fill="#475569" fontWeight="bold">拡大図：経路差と近似</text>

                        <circle cx="40" cy="40" r="3" fill="#1e293b" />
                        <text x="20" y="44" fontSize="11">S₁</text>

                        <circle cx="40" cy="80" r="3" fill="#1e293b" />
                        <text x="20" y="84" fontSize="11">S₂</text>

                        {/* スリットからの光線 */}
                        <line x1="40" y1="40" x2="140" y2="20" stroke={colorStr} strokeWidth="1.5" />
                        <line x1="40" y1="80" x2="140" y2="60" stroke={colorStr} strokeWidth="1.5" />

                        {/* 経路差の垂線と赤太線 */}
                        <line x1="40" y1="40" x2="55" y2="76" stroke="#94a3b8" strokeDasharray="2 2" />
                        <path d="M 40 80 L 55 77" stroke="#ef4444" strokeWidth="2.5" />
                        <text x="42" y="98" fontSize="12" fill="#ef4444" fontWeight="bold">ΔL</text>

                        <path d="M 40 65 A 15 15 0 0 0 49 78" fill="none" stroke="#64748b" />
                        <text x="30" y="65" fontSize="10" fill="#64748b">θ</text>
                        <text x="70" y="95" fontSize="10" fill="#64748b">ΔL ≈ d sinθ</text>

                        {/* スリット間隔 d */}
                        <line x1="15" y1="40" x2="15" y2="80" stroke="#64748b" />
                        <text x="5" y="64" fontSize="11" fill="#64748b">d</text>
                    </g>
                )}
            </svg>
        </div>
    );
};


// --- メインコンポーネント ---
const YoungSim = ({ level }) => {
    const isAdvanced = level === 'advanced';

    // 基本パラメータ
    // 波長: nm, d: μm, L: mm
    const [lambda, setLambda] = useState(500);
    const [d, setD] = useState(50);
    const [L, setL] = useState(2000);

    // 発展パラメータ
    const [subTab, setSubTab] = useState('none');
    const [N, setN] = useState(2);        // スリット数
    const [nMed, setNMed] = useState(1.0); // 媒質の屈折率
    const [s, setS] = useState(0);         // 板の厚さ(μm)
    const [nPlate, setNPlate] = useState(1.5); // 板の屈折率

    // レベル変更時に発展パラメータをリセットする
    useEffect(() => {
        if (!isAdvanced) {
            setSubTab('none');
            setN(2);
            setNMed(1.0);
            setS(0);
        }
    }, [isAdvanced]);

    // 教育用表示のための指標計算
    // 基本の縞間隔 Δx = (L * λ / 1000) / d  [単位: mm]
    const deltaX = (L * (lambda / nMed) / 1000) / d;

    // 板による中央明線の移動量 shift = L * s * (nPlate - nMed) / (nMed * d) [単位: mm]
    const shift = subTab === 'plate' ? (L * s * (nPlate - nMed)) / (nMed * d) : 0;

    return (
        <div className="sim-grid">
            {/* 左：操作パネル */}
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
                        <span>スリット間隔 d</span>
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

                {/* 発展モードのトグルメニュー */}
                {isAdvanced && (
                    <div style={{ marginTop: 'auto', borderTop: '2px solid #e2e8f0', paddingTop: '1rem' }}>
                        <h4 style={{ color: '#059669', marginBottom: '0.5rem', fontSize: '0.9rem' }}>発展機能切替</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '1rem' }}>
                            {[
                                { id: 'none', label: '標準 (発展オフ)' },
                                { id: 'multi', label: '多スリット' },
                                { id: 'medium', label: '媒質中の干渉' },
                                { id: 'plate', label: '板の挿入' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => { setSubTab(tab.id); if (tab.id !== 'multi') setN(2); if (tab.id !== 'medium') setNMed(1.0); if (tab.id !== 'plate') setS(0); }}
                                    style={{
                                        flex: '1 1 45%', padding: '0.4rem', fontSize: '0.8rem', cursor: 'pointer',
                                        backgroundColor: subTab === tab.id ? '#10b981' : '#f1f5f9',
                                        color: subTab === tab.id ? '#fff' : '#475569',
                                        border: '1px solid', borderColor: subTab === tab.id ? '#059669' : '#cbd5e1',
                                        borderRadius: '4px', fontWeight: subTab === tab.id ? 'bold' : 'normal'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* サブ条件パネル群 */}
                        {subTab === 'multi' && (
                            <div style={{ background: '#ecfdf5', padding: '0.8rem', borderRadius: '6px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>スリット数 N: <strong>{N}</strong></label>
                                <input type="range" min="2" max="10" step="1" value={N} onChange={(e) => setN(Number(e.target.value))} style={{ width: '100%' }} />
                                <p style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.4rem' }}>スリットを増やすと明線が鋭くなります（回折格子への橋渡し）。</p>
                            </div>
                        )}
                        {subTab === 'medium' && (
                            <div style={{ background: '#ecfdf5', padding: '0.8rem', borderRadius: '6px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>液体等の屈折率 n: <strong>{nMed.toFixed(2)}</strong></label>
                                <input type="range" min="1.0" max="2.0" step="0.05" value={nMed} onChange={(e) => setNMed(Number(e.target.value))} style={{ width: '100%' }} />
                                <p style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.4rem' }}>媒質中では波長が λ/n に縮み、縞間隔が狭くなります（振動数は一定）。</p>
                            </div>
                        )}
                        {subTab === 'plate' && (
                            <div style={{ background: '#ecfdf5', padding: '0.8rem', borderRadius: '6px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>板の厚さ s: <strong>{s} μm</strong></label>
                                <input type="range" min="0" max="10" step="1" value={s} onChange={(e) => setS(Number(e.target.value))} style={{ width: '100%' }} />
                                <label style={{ display: 'block', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>板の屈折率: <strong>{nPlate.toFixed(1)}</strong></label>
                                <input type="range" min="1.0" max="2.5" step="0.1" value={nPlate} onChange={(e) => setNPlate(Number(e.target.value))} style={{ width: '100%' }} />
                                <p style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.4rem' }}>板を通ることで光学的距離が延び、全体がシフトします。</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 中央：光学系図エリア */}
            <div className="panel schematic-area">
                <h3 style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>光学系モデル</span>
                    {subTab === 'medium' && nMed > 1.0 && <span style={{ fontSize: '0.8rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>媒質中 λ' = {(lambda / nMed).toFixed(0)} nm</span>}
                </h3>
                <SchematicView lambda={lambda} d={d} L={L} nMed={nMed} s={s} subTab={subTab} N={N} />
            </div>

            {/* 右：干渉縞エリア */}
            <div className="panel fringe-area">
                <h3 style={{ marginBottom: '0.5rem' }}>干渉パターン</h3>
                <FringeView lambda={lambda} d={d} L={L} nMed={nMed} s={s} nPlate={nPlate} N={N} />

                {/* 動的な一言説明領域 */}
                <div style={{ marginTop: '1rem', backgroundColor: '#eff6ff', padding: '0.8rem', borderRadius: '6px', borderLeft: '4px solid #3b82f6' }}>
                    <p style={{ fontSize: '0.9rem', color: '#1d4ed8', margin: 0, fontWeight: 'bold' }}>現在の縞間隔: 約 {deltaX.toFixed(1)} mm</p>
                    <p style={{ fontSize: '0.8rem', color: '#3b82f6', margin: '0.2rem 0 0 0' }}>
                        {subTab === 'plate' && s > 0 ? (
                            <>上側スリットの光路が延びたため、模様が<strong>上方へ {shift.toFixed(1)} mm 移動</strong>しています。</>
                        ) : (
                            `波長が ${(lambda > 550) ? '長め' : '短め'} で、間隔が ${(d > 50) ? '広め' : '狭め'} なので、この間隔になります。`
                        )}
                    </p>
                </div>
            </div>

            {/* 下：強度分布グラフエリア */}
            <div className="panel graph-area">
                <h3 style={{ marginBottom: '0.5rem' }}>強度分布グラフ</h3>
                <GraphView lambda={lambda} d={d} L={L} nMed={nMed} s={s} nPlate={nPlate} N={N} />
            </div>

            {/* 右下または下部：物理・数式解説領域 */}
            <div className="panel physics-panel">
                <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>縞間隔への影響・物理的意味</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

                    <div>
                        <ul className="physics-list" style={{ listStyle: 'none', padding: 0 }}>
                            <li style={{ paddingBottom: '0.8rem', borderBottom: '1px dashed #cbd5e1', marginBottom: '0.8rem' }}>
                                <strong style={{ color: '#0f172a' }}>差の原因:</strong> <br />
                                2つの光がたどる距離の差（<strong>経路差 ΔL</strong>）
                            </li>
                            <li style={{ paddingBottom: '0.8rem', borderBottom: '1px dashed #cbd5e1' }}>
                                <strong style={{ color: '#0f172a' }}>位相反転の有無:</strong> <span style={{ fontWeight: 'bold', color: '#ef4444' }}>なし</span> <br />
                                （反射を含まないため、通常の進行のみ）
                            </li>
                        </ul>
                    </div>

                    <div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '0.5rem' }}>経路差の近似式（小角近似）</h4>
                            <p style={{ fontSize: '1.2rem', textAlign: 'center', margin: '0.5rem 0', fontWeight: 'bold' }}>ΔL = d sinθ ≈ <span style={{ color: '#3b82f6' }}>d(x/L)</span></p>
                            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>※ スクリーンまでの距離 L が d や位置 x に比べて十分大きいと近似できます。</p>
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100%' }}>
                            <div style={{ flex: 1, borderLeft: '4px solid #ef4444', padding: '0.5rem 1rem', background: '#fef2f2', borderRadius: '0 6px 6px 0' }}>
                                <h4 style={{ color: '#b91c1c', fontSize: '0.85rem' }}>明線条件（強め合う）</h4>
                                <p style={{ fontSize: '1.1rem', margin: '0.2rem 0', fontWeight: 'bold' }}>ΔL = mλ</p>
                            </div>
                            <div style={{ flex: 1, borderLeft: '4px solid #10b981', padding: '0.5rem 1rem', background: '#ecfdf5', borderRadius: '0 6px 6px 0' }}>
                                <h4 style={{ color: '#047857', fontSize: '0.85rem' }}>暗線条件（弱め合う）</h4>
                                <p style={{ fontSize: '1.1rem', margin: '0.2rem 0', fontWeight: 'bold' }}>ΔL = (m + 0.5)λ</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* 関連現象リンク */}
            <div className="panel related-panel" style={{ backgroundColor: '#f8fafc' }}>
                <h3>関連現象へ進む</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                    <Link to="/sim/lloyd" style={{ display: 'block', padding: '0.8rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', textDecoration: 'none', color: '#1e293b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <strong style={{ display: 'block', color: '#3b82f6' }}>リュイド鏡</strong>
                        <span style={{ fontSize: '0.75rem' }}>片方の光が反射することで、中央の明暗条件が逆転します。</span>
                    </Link>
                    <Link to="/sim/grating" style={{ display: 'block', padding: '0.8rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', textDecoration: 'none', color: '#1e293b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <strong style={{ display: 'block', color: '#10b981' }}>回折格子</strong>
                        <span style={{ fontSize: '0.75rem' }}>スリット数を極限まで増やし、明線を鋭くしたものです。</span>
                    </Link>
                </div>
            </div>

        </div>
    );
};

export default YoungSim;
