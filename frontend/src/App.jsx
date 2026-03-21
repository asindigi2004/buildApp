import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Builder from './pages/Builder'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import SharedBuild from './pages/SharedBuild'
import Gallery from './pages/Gallery'
import NotFound from './pages/NotFound'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/builds/:token" element={<SharedBuild />} />
        <Route path="/builder/:deviceId" element={
          <PrivateRoute><Builder /></PrivateRoute>
        } />
        <Route path="/dashboard" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App