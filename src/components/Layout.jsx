import React from 'react';
import { Link } from 'react-router-dom';

const Layout = ({ children }) => {
    return (
        <div className="layout">
            <header className="header">
                <div className="header-container">
                    <Link to="/" className="brand">光の干渉・回折シミュレーター</Link>
                    <nav className="nav-links">
                        <Link to="/">ホーム</Link>
                        <Link to="/recommended">おすすめ順</Link>
                    </nav>
                </div>
            </header>
            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

export default Layout;
