import "./App.css";

import NotesHome from "./components/NotesHome";
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
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};

export default App;
