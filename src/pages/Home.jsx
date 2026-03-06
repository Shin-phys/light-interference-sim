import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { phenomenaList } from '../data/phenomena';

const Home = () => {
    const navigate = useNavigate();

    return (
        <div className="home-container">
            <section className="hero-section">
                <h1 className="hero-title">光の干渉・回折シミュレーター</h1>
                <h2 className="hero-subtitle">見える模様と、式・図のつながりを確かめよう</h2>
                <div className="hero-intro">
                    <ul>
                        <li>見たい現象を選んで、すぐに試せること</li>
                        <li>波長・間隔・屈折率などを変えながら変化を確かめられること</li>
                        <li>迷ったら「おすすめ順で学ぶ」から進められること</li>
                    </ul>
                </div>

                <div className="hero-actions">
                    <button className="btn-primary" onClick={() => {
                        document.getElementById('phenomena-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}>
                        現象名から選ぶ
                    </button>
                    <button className="btn-secondary" onClick={() => navigate('/recommended')}>
                        おすすめ順で学ぶ
                    </button>
                </div>
            </section>

            <section id="phenomena-section" className="phenomena-section">
                <h3 className="section-title">現象一覧</h3>
                <div className="cards-grid">
                    {phenomenaList.map(item => (
                        <Link to={`/sim/${item.id}`} key={item.id} className="phenomenon-card">
                            <h4 className="card-title">{item.name}</h4>
                            <p className="card-description">{item.description}</p>
                            <div className="card-tags">
                                {item.tags.map(tag => (
                                    <span key={tag} className="tag">{tag}</span>
                                ))}
                            </div>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Home;
