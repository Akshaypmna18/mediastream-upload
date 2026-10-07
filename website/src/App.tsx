import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./Layout";
import { ApiPage } from "./pages/ApiPage";
import { BackendPage } from "./pages/BackendPage";
import { ReactDemoPage, VanillaWalkthroughPage } from "./pages/DemoPages";
import { GuidePage } from "./pages/GuidePage";
import { HomePage } from "./pages/HomePage";

export function App() {
  return (
    <BrowserRouter basename="/mediastream-upload">
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="guide" element={<GuidePage />} />
          <Route path="api" element={<ApiPage />} />
          <Route path="backend" element={<BackendPage />} />
          <Route path="examples/react" element={<ReactDemoPage />} />
          <Route path="examples/vanilla" element={<VanillaWalkthroughPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
