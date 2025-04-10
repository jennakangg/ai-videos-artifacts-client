import {BrowserRouter as Router, Navigate, Route, Routes} from "react-router-dom";
import Login from "./pages/Login";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import VideoAnnotator from "./pages/VideoAnnotator";


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
                <Route index element={<Navigate to="/videoannotator" />} />
                <Route path ="/login"  element={<Login />} />
                <Route path ="/videoannotator"
                       element={ <VideoAnnotator videoRef="./img/test_video.mp4" />} />
              </Route>
            </Routes>
          </div>
        </ThemeProvider>
      </Router>
  );
}

export default App;