import {BrowserRouter as Router, Navigate, Route, Routes} from "react-router-dom";
import Login from "./pages/Login";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ExperimentManager from "./pages/ExperimentManager";
import AnnotationManager from "./pages/AnnotationManager";
import Complete from "./pages/Complete";
import IntroConsent from "./pages/IntroConsent";
import Directions from "./pages/Directions";


const THEME = createTheme({
  typography: {
    "fontFamily": "monospace"
  }
});

function App() {
  return (
      <Router>
        <ThemeProvider theme={THEME}>
          <div>
            <Routes>
              <Route path="/">
                <Route index element={<Navigate to="/login" />} />
                <Route path ="/login"  element={<Login />} />
                <Route path ="/experimentmanager"  element={<ExperimentManager />} />
                <Route path ="/annotationmanager"  element={<AnnotationManager />} />
                <Route path="/complete" element={<Complete />} />
                <Route path="/introconsent" element={<IntroConsent />} />
                <Route path="/directions" element={<Directions />} />
                <Route path="*" element={<Navigate to="/login" />} />
              </Route>
            </Routes>
          </div>
        </ThemeProvider>
      </Router>
  );
}

export default App;