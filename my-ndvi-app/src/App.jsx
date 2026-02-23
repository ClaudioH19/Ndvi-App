import React, { useState } from "react";
import Header from "./components/header";
import RawMaskEditor from "./components/imageEditor";

function App() {

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-green-100">
      <Header />
      <RawMaskEditor />
    </div>
  );
}

export default App;