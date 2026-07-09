import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './styles/global.css'

// 路由懒加载: 每个页面单独 chunk, 首屏只加载当前路由
const MainPage = lazy(() => import('./pages/MainPage').then(m => ({ default: m.MainPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const StageSelectPage = lazy(() => import('./pages/StageSelectPage').then(m => ({ default: m.StageSelectPage })))
const BattlePage = lazy(() => import('./pages/BattlePage').then(m => ({ default: m.BattlePage })))
const HeroPage = lazy(() => import('./pages/HeroPage').then(m => ({ default: m.HeroPage })))
const RecruitPage = lazy(() => import('./pages/RecruitPage').then(m => ({ default: m.RecruitPage })))
const CityPage = lazy(() => import('./pages/CityPage').then(m => ({ default: m.CityPage })))
const BackpackPage = lazy(() => import('./pages/BackpackPage').then(m => ({ default: m.BackpackPage })))
const SmelterPage = lazy(() => import('./pages/SmelterPage').then(m => ({ default: m.SmelterPage })))
const TreasureWorkshopPage = lazy(() => import('./pages/TreasureWorkshopPage').then(m => ({ default: m.TreasureWorkshopPage })))
const TreasurePavilionPage = lazy(() => import('./pages/TreasurePavilionPage').then(m => ({ default: m.TreasurePavilionPage })))

// 轻量 fallback (不引 framer-motion 等大库, 避免污染主 chunk)
const PageLoader = () => (
  <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: 'var(--text-gold)' }}>
    <div style={{ fontSize: '18px' }}>加载中…</div>
  </div>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/stages" element={<StageSelectPage />} />
          <Route path="/battle/:stageId" element={<BattlePage />} />
          <Route path="/heroes" element={<HeroPage />} />
          <Route path="/recruit" element={<RecruitPage />} />
          <Route path="/backpack" element={<BackpackPage />} />
          <Route path="/city" element={<CityPage />} />
          <Route path="/smelter" element={<SmelterPage />} />
          <Route path="/treasure-workshop" element={<TreasureWorkshopPage />} />
          <Route path="/treasure-pavilion" element={<TreasurePavilionPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
)
