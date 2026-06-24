import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MainPage } from './pages/MainPage'
import { StageSelectPage } from './pages/StageSelectPage'
import { BattlePage } from './pages/BattlePage'
import { HeroPage } from './pages/HeroPage'
import { RecruitPage } from './pages/RecruitPage'
import { CityPage } from './pages/CityPage'
import { BackpackPage } from './pages/BackpackPage'
import { SmelterPage } from './pages/SmelterPage'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/stages" element={<StageSelectPage />} />
        <Route path="/battle/:stageId" element={<BattlePage />} />
        <Route path="/heroes" element={<HeroPage />} />
        <Route path="/recruit" element={<RecruitPage />} />
        <Route path="/backpack" element={<BackpackPage />} />
        <Route path="/city" element={<CityPage />} />
        <Route path="/smelter" element={<SmelterPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)