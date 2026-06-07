import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MainPage } from './pages/MainPage'
import { StageSelectPage } from './pages/StageSelectPage'
import { BattlePage } from './pages/BattlePage'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/stages" element={<StageSelectPage />} />
        <Route path="/battle/:stageId" element={<BattlePage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
