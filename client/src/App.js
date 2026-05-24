import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";

import MainPage from "./components/mainpage/MainPage";
import Login from "./components/login/Login";
import Register from "./components/register/Register";
import Landing from "./components/landing/Landing";
import Form from "./components/form/Form";
import Recommendation from "./components/recommendation/Recommendation";
import MainpageDetails from "./components/mainpage_details/MainpageDetails";
import Profile from "./components/profile/Profile";
import BMICalculator from "./components/bmi/BMICalculator";
import AdminPanel from "./components/admin/AdminPanel";
import NotFound from "./components/notfound/NotFound";
import './App.css';

function App() {
  const isAuthenticated = useSelector((state) => state.user.isAuthenticated);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/"            element={isAuthenticated ? <MainPage /> : <Landing />} />
          <Route path="/mainpage"    element={isAuthenticated ? <MainPage /> : <Landing />} />
          <Route path="/login"       element={<Login />} />
          <Route path="/register"    element={<Register />} />
          <Route path="/landing"     element={<Landing />} />
          <Route path="/form/:userId" element={<Form />} />
          <Route path="/mainpagedetails/:postId" element={<MainpageDetails />} />
          <Route path="/recommendation/:questionId/:age/:description" element={<Recommendation />} />
          <Route path="/profile"     element={isAuthenticated ? <Profile /> : <Login />} />
          <Route path="/bmi"         element={<BMICalculator />} />
          <Route path="/admin"       element={isAuthenticated ? <AdminPanel /> : <Login />} />
          <Route path="*"            element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
