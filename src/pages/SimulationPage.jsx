import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { phenomenaList } from '../data/phenomena';
import YoungSim from '../components/simulations/YoungSim';
import LloydSim from '../components/simulations/LloydSim';
import WedgeSim from '../components/simulations/WedgeSim';
import ThinFilmSim from '../components/simulations/ThinFilmSim';
import NewtonSim from '../components/simulations/NewtonSim';
import GratingSim from '../components/simulations/GratingSim';

const SimulationPage = () => {
    const { id } = useParams();
    const phenomenon = phenomenaList.find(p => p.id === id) || phenomenaList[0];
    const [level, setLevel] = useState('basic'); // 'basic' = 受験, 'advanced' = 発展

    return (
        <div className="simulation-page">
            <div className="sim-header">
                <h2 className="sim-title">{phenomenon.name}</h2>
                <div className="level-toggle">
                    <button
                        className={`toggle-btn ${level === 'basic' ? 'active' : ''}`}
                        onClick={() => setLevel('basic')}
                    >
                        受験 (基本)
                    </button>
                    <button
                        className={`toggle-btn ${level === 'advanced' ? 'active' : ''}`}
                        onClick={() => setLevel('advanced')}
                    >
                        発展
                    </button>
                </div>
            </div>

            {phenomenon.id === 'young' && <YoungSim level={level} />}
            {phenomenon.id === 'lloyd' && <LloydSim level={level} />}
            {phenomenon.id === 'wedge' && <WedgeSim level={level} />}
            {phenomenon.id === 'thin-film' && <ThinFilmSim level={level} />}
            {phenomenon.id === 'newton' && <NewtonSim level={level} />}
            {phenomenon.id === 'grating' && <GratingSim level={level} />}

        </div>
    );
};

export default SimulationPage;
