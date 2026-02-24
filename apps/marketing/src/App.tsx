import { BranchKit } from "branchkit";
import { IndexPage } from "./pages/IndexPage";

const showBranchKit = import.meta.env.MODE !== "production";

function App() {
  return (
    <>
      <IndexPage />
      {showBranchKit && <BranchKit />}
    </>
  );
}

export default App;
