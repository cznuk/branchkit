import { Routes, Route } from "react-router-dom";
import { IndexPage } from "./pages/IndexPage";
import { DemoPage } from "./pages/DemoPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/demo" element={<DemoPage />} />
    </Routes>
  );
}

export default App;
