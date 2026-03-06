import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RecommendedPath from './pages/RecommendedPath';
import SimulationPage from './pages/SimulationPage';
import Layout from './components/Layout';

function App() {
    return (
        <Router>
            <Layout>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/recommended" element={<RecommendedPath />} />
                    <Route path="/sim/:id" element={<SimulationPage />} />
                </Routes>
            </Layout>
        </Router>
    );
}

export default App;
