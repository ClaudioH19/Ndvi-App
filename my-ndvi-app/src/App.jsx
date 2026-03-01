import React from "react";
import Header from "./components/header";
import RawMaskEditor from "./components/imageEditor";

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-amber-50">
      <Header />
      <RawMaskEditor />
    </div>
  );
}

export default App;