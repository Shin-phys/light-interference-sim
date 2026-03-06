import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import { getWavelengthRGB } from '../../utils/color';

// 白色光用の代表的な波長セット（nm）
const WHITE_LIGHT_LAMBDAS = [400, 450, 500, 550, 600, 650, 700];

// パラメータに基づいて回折格子の強度を計算する関数
// x_mm: スクリーン上の位置(mm), d_um: 格子定数(μm), L_mm: 距離(mm), lambda_nm: 波長(nm)
// numSlits: N (Nが大きいほど単スリット干渉より多スリット干渉が支配的。ここでは理論的な極限に近い大きなNとする)
// a_um, b_um, nPlate: 特殊格子用（厚みa,bが交互に並ぶ）
const calculateGratingIntensity = (x_mm, d_um, L_mm, lambda_nm, isSpecial, a_um, b_um, nPlate) => {
    const N = 50; // 計算用スリット数（十分に鋭い線にするため）
    const theta = Math.atan(x_mm / L_mm);

    // 基本の光路差（隣り合うスリットからの経路差）: d * sin(theta) [単位合わせ: dはμm -> nmへ (*1000)]
    let opd_basic_nm = d_um * Math.sin(theta) * 1000;

    // 特殊格子の場合の位相差補正
    // 奇数番目と偶数番目のスリットで、厚みaと厚みbを通るため、光路長が異なる
    // 透過時の追加光路長はそれぞれ a*(n-1), b*(n-1) となる（通常媒質を1.0とする）
    let delta_phi_special = 0;
    if (isSpecial) {
        // 隣り合う要素間の余分な光路差 = |a - b| * (nPlate - 1) * 1000 (nm)
        const extra_opd = (a_um - b_um) * (nPlate - 1.0) * 1000;
        delta_phi_special = 2 * Math.PI * extra_opd / lambda_nm;
    }

    const phi = 2 * Math.PI * opd_basic_nm / lambda_nm;

    let I = 0;
    if (Math.abs(Math.sin(phi / 2)) < 1e-6 && !isSpecial) {
        I = 1.0;
    } else {
        if (!isSpecial) {
            // 通常の回折格子
            I = Math.pow(Math.sin(N * phi / 2) / (N * Math.sin(phi / 2)), 2);
        } else {
            // 特殊格子 (厚み a, b が交互)
            // 2つの要素を1ペア(周期 2d)として計算
            // ペア内の位相差: phi (基本) + delta_phi_special
            const phi_pair = 2 * phi; // 周期2dの位相差
            const form_factor = Math.cos((phi + delta_phi_special) / 2); // 単位ユニット(2スリット)の干渉項
            const N_pairs = N / 2;

            let array_factor;
            if (Math.abs(Math.sin(phi_pair / 2)) < 1e-6) {
                array_factor = 1.0;
            } else {
                array_factor = Math.sin(N_pairs * phi_pair / 2) / (N_pairs * Math.sin(phi_pair / 2));
            }
            I = Math.pow(form_factor, 2) * Math.pow(array_factor, 2);
        }
    }
    return I;
};

const GratingFringeView = ({ isWhiteLight, lambda, d, L, zoom, isSpecial, a, b, nPlate }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // 表示スパン(mm)。ズーム1.0の時、全体のスクリーン幅を表現（例：-L*tan(30度)くらいまで）
        // ズームが大きいほど表示する幅(mm)は小さくなる。
        // ここではズーム1.0で 幅1000mm(-500~500), ズーム5.0で 幅200mm(-100~100) とする
        const baseSpan = 1000;
        const screenSpan = baseSpan / zoom;

        // 描画データ配列の初期化
        const rArr = new Float32Array(width);
        const gArr = new Float32Array(width);
        const bArr = new Float32Array(width);

        const lambdasToRender = isWhiteLight ? WHITE_LIGHT_LAMBDAS : [lambda];

        lambdasToRender.forEach(lam => {
            const color = getWavelengthRGB(lam);
            for (let x = 0; x < width; x++) {
                const x_mm = (x - width / 2) * (screenSpan / width);
                const I = calculateGratingIntensity(x_mm, d, L, lam, isSpecial, a, b, nPlate);

                // 強度を少し強調 (鋭くするため)
                const I_adj = Math.min(1.0, Math.pow(I, 0.5) * (isWhiteLight ? 1.5 : 1.0));

                rArr[x] += color.r * I_adj / (isWhiteLight ? 2.5 : 1.0);
                gArr[x] += color.g * I_adj / (isWhiteLight ? 2.5 : 1.0);
                bArr[x] += color.b * I_adj / (isWhiteLight ? 2.5 : 1.0);
            }
        });

        const imageData = ctx.createImageData(width, height);
        for (let x = 0; x < width; x++) {
            const r = Math.min(255, Math.floor(rArr[x]));
            const g = Math.min(255, Math.floor(gArr[x]));
            const b_val = Math.min(255, Math.floor(bArr[x]));

            for (let y = 0; y < height; y++) {
                const idx = (y * width + x) * 4;
                imageData.data[idx] = r;
                imageData.data[idx + 1] = g;
                imageData.data[idx + 2] = b_val;
                imageData.data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);

        // 中心線などの描画
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';

        ctx.beginPath();
        ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height);
        ctx.stroke();
        ctx.fillText('0', width / 2, 12);

    }, [isWhiteLight, lambda, d, L, zoom, isSpecial, a, b, nPlate]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
            <canvas ref={canvasRef} width={800} height={100} style={{ width: '100%', height: '100%', display: 'block' }} />
            <div style={{ position: 'absolute', top: '5px', left: '10px', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>スクリーン上</div>
        </div>
    );
};

const GratingGraphView = ({ isWhiteLight, lambda, d, L, zoom, isSpecial, a, b, nPlate }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // 軸描画
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height); // Y軸
        const yZero = height - 20;
        ctx.moveTo(0, yZero); ctx.lineTo(width, yZero); // X軸
        ctx.stroke();

        const baseSpan = 1000;
        const screenSpan = baseSpan / zoom;
        const lambdasToRender = isWhiteLight ? WHITE_LIGHT_LAMBDAS : [lambda];

        // グラフの描画
        lambdasToRender.forEach(lam => {
            ctx.beginPath();
            const color = getWavelengthRGB(lam);
            // 白色光の場合は線を少し透明にして重なりを見やすくする
            ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b}, ${isWhiteLight ? 0.7 : 1.0})`;
            ctx.lineWidth = isWhiteLight ? 1.5 : 2;

            for (let x = 0; x < width; x += 2) {
                const x_mm = (x - width / 2) * (screenSpan / width);
                const I = calculateGratingIntensity(x_mm, d, L, lam, isSpecial, a, b, nPlate);
                // グラフが見やすいように高さを調整
                const I_disp = Math.min(1.2, I);
                const py = yZero - I_disp * (height - 30);

                if (x === 0) ctx.moveTo(x, py);
                else ctx.lineTo(x, py);
            }
            ctx.stroke();
        });

        // 厳密な位置(x)と近似の位置(x)のラベル表示（代表波長のみ、低次・高次）
        // 厳密: x = L * tan(asin(m*λ/d))
        // 近似: x ≈ L * (m*λ/d)
        ctx.fillStyle = '#64748b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';

        const repLambda = isWhiteLight ? 550 : lambda; // 代表波長
        const d_nm = d * 1000;

        // m=1, 2, 3 の位置にマークをつける (近似と厳密のズレを示すため)
        [1, 2, 3].forEach(m => {
            const sinTheta = (m * repLambda) / d_nm;
            if (sinTheta < 1) { // 物理的に可能な場合
                const x_exact = L * Math.tan(Math.asin(sinTheta));
                const x_approx = L * sinTheta; // 小角近似

                // 画面(canvas)のx座標に変換
                const cx_exact_R = width / 2 + (x_exact / screenSpan) * width;
                const cx_approx_R = width / 2 + (x_approx / screenSpan) * width;

                // 描画範囲内なら
                if (cx_exact_R < width) {
                    ctx.fillStyle = '#ef4444'; // 厳密 (赤っぽく表示)
                    ctx.fillText(`m=${m}`, cx_exact_R, 10);
                    ctx.beginPath(); ctx.moveTo(cx_exact_R, 12); ctx.lineTo(cx_exact_R, yZero); ctx.strokeStyle = 'rgba(239,68,68,0.2)'; ctx.stroke();
                }
                if (cx_approx_R < width && Math.abs(cx_exact_R - cx_approx_R) > 5) {
                    ctx.fillStyle = '#3b82f6'; // 近似 (青っぽく表示)
                    ctx.fillText(`(近似)`, cx_approx_R, 22);
                    ctx.beginPath(); ctx.moveTo(cx_approx_R, 24); ctx.lineTo(cx_approx_R, yZero); ctx.strokeStyle = 'rgba(59,130,246,0.2)'; ctx.stroke();
                }
            }
        });

    }, [isWhiteLight, lambda, d, L, zoom, isSpecial, a, b, nPlate]);

    return (
        <div style={{ width: '100%', height: '140px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', position: 'relative' }}>
            <canvas ref={canvasRef} width={800} height={140} style={{ width: '100%', height: '100%', display: 'block' }} />
            <div style={{ position: 'absolute', top: '5px', left: '10px', fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '10px' }}>
                <span style={{ color: '#ef4444' }}>■ 厳密位置 (sinθベース)</span>
                <span style={{ color: '#3b82f6' }}>■ 近似位置 (小角近似)</span>
            </div>
        </div>
    );
};

const GratingSim = ({ level }) => {
    const isAdvanced = level === 'advanced';

    // 操作項目
    const [isWhiteLight, setIsWhiteLight] = useState(false);
    const [lambda, setLambda] = useState(550);       // nm (単色光時)
    const [d, setD] = useState(2.0);                 // 格子定数 μm (初期: 1mmあたり500本 -> d=2μm)
    const [L, setL] = useState(1000);                // スクリーン距離 mm
    const [zoom, setZoom] = useState(2.0);           // スクリーン表示ズーム

    // 発展項目のタブ切替
    // 'none': 通常 (発展オフ), 'white': 白色光, 'special': 板の厚さが違う(特殊格子), 'diff': 近似と厳密の強調
    const [subTab, setSubTab] = useState('none');

    // 特殊格子用パラメータ
    const [a, setA] = useState(0.5); // 厚みa (μm)
    const [b, setB] = useState(0.2); // 厚みb (μm)
    const [nPlate, setNPlate] = useState(1.5); // 板の屈折率

    useEffect(() => {
        if (!isAdvanced) {
            setSubTab('none');
            setIsWhiteLight(false);
        }
    }, [isAdvanced]);

    // サブタブ切り替え時の処理
    useEffect(() => {
        if (subTab === 'white') setIsWhiteLight(true);
        else setIsWhiteLight(false);
    }, [subTab]);


    // 教育的メッセージの決定
    let msgTitle = "回折格子の性質";
    let msgBody = "スリット数が多い（格子）ため、明線が非常に鋭く現れています。";

    if (subTab === 'white') {
        msgTitle = "白色光の分散 (スペクトル)";
        msgBody = "各波長(色)によって回折角 θ が異なるため、0次より外側では虹色に分かれます。波長が長い(赤)ほど外側に曲がります。";
    } else if (subTab === 'special') {
        msgTitle = "特殊格子の干渉 (今年度入試関連)";
        msgBody = "透過する板の厚さが交互に違うため、隣り合う光に余分な経路差 (n-1)(a-b) が生じます。これにより、本来の明線の一部が消えたりシフトしたりします。";
    } else if (subTab === 'diff') {
        msgTitle = "近似式 vs 厳密式";
        msgBody = "高次(mが大きい)ほど、角度θが大きくなるため「sinθ ≒ tanθ」の小角近似が崩れます。グラフ上の赤(厳密)と青(近似)のズレに注目してください。";
    } else if (d < 1.0) {
        msgBody = "格子定数 d が小さい（1mmあたりの本数が多い）ほど、明線の間隔は大きく広がります。";
    }

    return (
        <div className="sim-grid">
            {/* 操作パネル */}
            <div className="panel control-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3>操作パネル</h3>

                {!isWhiteLight && (
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                            <span>波長 λ (単色光)</span>
                            <span style={{ fontWeight: 'bold' }}>{lambda} nm</span>
                        </label>
                        <input type="range" min="400" max="750" step="10" value={lambda} onChange={(e) => setLambda(Number(e.target.value))} style={{ width: '100%' }} />
                    </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                        <span>格子定数 d</span>
                        <span style={{ fontWeight: 'bold' }}>{d} μm</span>
                    </label>
                    <input type="range" min="0.5" max="10.0" step="0.5" value={d} onChange={(e) => setD(Number(e.target.value))} style={{ width: '100%' }} />
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'right' }}>
                        ( 1mmあたり {Math.round(1000 / d)} 本 )
                    </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                        <span>スクリーン距離 L</span>
                        <span style={{ fontWeight: 'bold' }}>{L} mm</span>
                    </label>
                    <input type="range" min="500" max="3000" step="100" value={L} onChange={(e) => setL(Number(e.target.value))} style={{ width: '100%' }} />
                </div>

                <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '6px' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                        <span>📺 画面ズーム (見やすさ用)</span>
                        <span style={{ fontWeight: 'bold' }}>x{zoom.toFixed(1)}</span>
                    </label>
                    <input type="range" min="0.5" max="5.0" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: '100%' }} />
                    <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>高次の縞を見るにはズームを下げてください。</p>
                </div>

                {/* 発展モードのトグルメニュー */}
                {isAdvanced && (
                    <div style={{ marginTop: 'auto', borderTop: '2px solid #e2e8f0', paddingTop: '1rem' }}>
                        <h4 style={{ color: '#059669', marginBottom: '0.5rem', fontSize: '0.9rem' }}>発展機能切替</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '1rem' }}>
                            {[
                                { id: 'none', label: '標準' },
                                { id: 'white', label: '白色光と分散' },
                                { id: 'diff', label: '近似と厳密のズレ' },
                                { id: 'special', label: '特殊格子(段差)' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setSubTab(tab.id)}
                                    style={{
                                        flex: '1 1 45%', padding: '0.4rem', fontSize: '0.75rem', cursor: 'pointer',
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

                        {/* 特殊格子用の追加設定 */}
                        {subTab === 'special' && (
                            <div style={{ background: '#ecfdf5', padding: '0.8rem', borderRadius: '6px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.2rem' }}>厚み $a$ (奇数番目前): <strong>{a} μm</strong></label>
                                <input type="range" min="0" max="2.0" step="0.1" value={a} onChange={(e) => setA(Number(e.target.value))} style={{ width: '100%' }} />
                                <label style={{ display: 'block', fontSize: '0.8rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>厚み $b$ (偶数番目前): <strong>{b} μm</strong></label>
                                <input type="range" min="0" max="2.0" step="0.1" value={b} onChange={(e) => setB(Number(e.target.value))} style={{ width: '100%' }} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 中央および右：グラフィック表現 */}
            <div className="panel schematic-area" style={{ gridColumn: '2 / 4' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>回折格子の干渉パターン</h3>

                {/* 動的な一言説明領域 */}
                <div style={{ marginBottom: '1rem', backgroundColor: '#eff6ff', padding: '0.8rem', borderRadius: '6px', borderLeft: '4px solid #3b82f6' }}>
                    <p style={{ fontSize: '0.9rem', color: '#1d4ed8', margin: 0, fontWeight: 'bold' }}>{msgTitle}</p>
                    <p style={{ fontSize: '0.8rem', color: '#3b82f6', margin: '0.2rem 0 0 0' }}>{msgBody}</p>
                </div>

                <GratingFringeView
                    isWhiteLight={isWhiteLight} lambda={lambda} d={d} L={L} zoom={zoom}
                    isSpecial={subTab === 'special'} a={a} b={b} nPlate={nPlate}
                />
                <div style={{ height: '1rem' }}></div>
                <GratingGraphView
                    isWhiteLight={isWhiteLight} lambda={lambda} d={d} L={L} zoom={zoom}
                    isSpecial={subTab === 'special'} a={a} b={b} nPlate={nPlate}
                />
            </div>

            {/* 下部：物理パネル */}
            <div className="panel physics-panel">
                <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>回折格子の物理</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

                    <div>
                        <ul className="physics-list" style={{ listStyle: 'none', padding: 0 }}>
                            <li style={{ paddingBottom: '0.8rem', borderBottom: '1px dashed #cbd5e1', marginBottom: '0.8rem' }}>
                                <strong style={{ color: '#0f172a' }}>差の原因:</strong> <br />
                                隣り合うスリット(間隔d)から出る光の経路差<br />
                                {subTab === 'special' && <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>★段差による追加経路差: (n-1)|a-b| が発生！</span>}
                            </li>
                            <li style={{ paddingBottom: '0.8rem', borderBottom: '1px dashed #cbd5e1' }}>
                                <strong style={{ color: '#0f172a' }}>高次の明線:</strong> <br />
                                ヤングの実験と違い、角θが大きくなるため小角近似(sinθ≈tanθ)は高次では成り立ちません。
                            </li>
                        </ul>
                    </div>

                    <div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '0.5rem' }}>明線条件（厳密式）</h4>
                            <p style={{ fontSize: '1.2rem', textAlign: 'center', margin: '0.5rem 0', fontWeight: 'bold' }}>d sinθ = mλ</p>
                            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>※ スクリーン上の位置は x = L tanθ で決まるため、近似式 x = mLλ/d とはずれが生じます。</p>
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100%' }}>
                            <div style={{ flex: 1, borderLeft: '4px solid #8b5cf6', padding: '0.5rem 1rem', background: '#f5f3ff', borderRadius: '0 6px 6px 0' }}>
                                <h4 style={{ color: '#6d28d9', fontSize: '0.85rem' }}>スペクトル (白色光)</h4>
                                <p style={{ fontSize: '0.8rem', margin: '0.2rem 0', color: '#4c1d95' }}>
                                    波長 λ が長い（赤）ほど sinθ が大きくなり、外側に曲がります。m=0(中央)では経路差が0なのでそのまま白色になります。
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* 関連現象リンク */}
            <div className="panel related-panel" style={{ backgroundColor: '#f8fafc' }}>
                <h3>関連現象へ戻る</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                    <Link to="/sim/young" style={{ display: 'block', padding: '0.8rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', textDecoration: 'none', color: '#1e293b' }}>
                        <strong style={{ display: 'block', color: '#3b82f6' }}>ヤングの実験</strong>
                        <span style={{ fontSize: '0.75rem' }}>回折格子の基礎となる2スリットの干渉です。</span>
                    </Link>
                    <Link to="/sim/thin-film" style={{ display: 'block', padding: '0.8rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', textDecoration: 'none', color: '#1e293b' }}>
                        <strong style={{ display: 'block', color: '#f59e0b' }}>薄膜干渉</strong>
                        <span style={{ fontSize: '0.75rem' }}>特殊格子での「厚み」の違いによる光路差の考え方が共通しています。</span>
                    </Link>
                </div>
            </div>

        </div>
    );
};

export default GratingSim;
