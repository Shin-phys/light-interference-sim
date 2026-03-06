import React from 'react';
import { Link } from 'react-router-dom';

const RecommendedPath = () => {
    return (
        <div className="recommended-container">
            <h2 className="page-title">おすすめ順で学ぶ</h2>
            <p className="page-description">基礎から順番に、３つのステップで光の干渉をマスターしよう。</p>

            <div className="steps-container">

                <div className="step-card">
                    <div className="step-header">
                        <span className="step-number">Step 1</span>
                        <h3 className="step-title">縞の間隔は何で決まる？</h3>
                    </div>
                    <p className="step-desc">まずは基本となるスリットの干渉から。波長やスリット間隔と縞の関係を理解します。</p>
                    <div className="step-links">
                        <Link to="/sim/young" className="step-link">ヤングの実験</Link>
                        <Link to="/sim/grating" className="step-link">回折格子</Link>
                    </div>
                </div>

                <div className="step-card">
                    <div className="step-header">
                        <span className="step-number">Step 2</span>
                        <h3 className="step-title">なぜ中央が暗くなる？</h3>
                    </div>
                    <p className="step-desc">光が反射するときに生じる「位相反転」について学び、反射が絡む干渉を理解します。</p>
                    <div className="step-links">
                        <Link to="/sim/lloyd" className="step-link">リュイド鏡</Link>
                        <Link to="/sim/wedge" className="step-link">くさび形空気層</Link>
                        <Link to="/sim/thin-film" className="step-link">薄膜干渉</Link>
                    </div>
                </div>

                <div className="step-card">
                    <div className="step-header">
                        <span className="step-number">Step 3</span>
                        <h3 className="step-title">なぜ形や色が変わる？</h3>
                    </div>
                    <p className="step-desc">円形の干渉縞や、白色光によるグラデーションなど、少し複雑で美しい干渉模様の仕組みに迫ります。</p>
                    <div className="step-links">
                        <Link to="/sim/newton" className="step-link">ニュートンリング</Link>
                        <Link to="/sim/thin-film" className="step-link">薄膜干渉</Link>
                        <Link to="/sim/grating" className="step-link">回折格子（白色光）</Link>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default RecommendedPath;
