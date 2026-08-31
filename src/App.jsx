import "./App.css";
import { useState } from "react";
import NotesHome from "./components/NotesHome";
import LockScreen from "./components/auth/LockScreen";
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  createRoutesFromElements,
} from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<NotesHome />} />
    </>
  )
);

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return sessionStorage.getItem("tp_authenticated") === "true";
    } catch {
      return false;
    }
  });

  if (!isAuthenticated) {
    return <LockScreen onUnlock={() => setIsAuthenticated(true)} />;
  }

  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};

export default App;
