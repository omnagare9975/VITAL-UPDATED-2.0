import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import TextField from '@mui/material/TextField';
import "./Login.css";
import { loginUserAPIMethod } from "../../api/auth";
import { login } from "../../features/userSlice";
import Lottie from "lottie-react";
import landingData1 from "../../assets/Lottie/ProcessIndicator.json";
import Navbar from '../navbar/Navbar';
import logo2 from "../../assets/images/logo2.png";

const benefits = [
    { icon: '🧬', text: 'AI-powered health profiling' },
    { icon: '🌿', text: 'Personalized supplement matches' },
    { icon: '🛡️', text: 'Allergen-safe filtering' },
    { icon: '🇮🇳', text: 'Indian & US brands covered' },
];

const Login = () => {
    const navigate = useNavigate();
    const [errorMessage, setErrorMessage] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginLoading, setLoginIsLoading] = useState(false);
    const dispatch = useDispatch();

    useEffect(() => {
        if (isLoggedIn) navigate("/mainpage");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoggedIn]);

    const lottieStyle = { height: 46, width: 46 };

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errorMessage) setErrorMessage(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoginIsLoading(true);

        loginUserAPIMethod({ email: formData.email, password: formData.password })
            .then((res) => {
                if (res.ok) {
                    res.json().then((jsonResult) => {
                        dispatch(login(jsonResult));
                        setIsLoggedIn(true);
                    });
                } else {
                    setIsLoggedIn(false);
                    setErrorMessage("Incorrect email or password. Please try again.");
                }
            })
            .catch(() => {
                setIsLoggedIn(false);
                setErrorMessage("Something went wrong. Please try again.");
            })
            .finally(() => setLoginIsLoading(false));
    };

    return (
        <div className="login_page">
            <Navbar />
            <div className="login_layout">
                {/* Left decorative panel */}
                <div className="login_panel_left">
                    <div className="login_panel_brand">
                        <img src={logo2} className="login_panel_logo" alt="VITAL" />
                        <div className="login_panel_brand_name">vital<span>.</span></div>
                        <p className="login_panel_tagline">
                            Your personalized health supplement advisor. Science-backed recommendations for your wellness journey.
                        </p>
                    </div>
                    <div className="login_panel_benefits">
                        {benefits.map((b, i) => (
                            <div className="login_panel_benefit" key={i}>
                                <span className="login_panel_benefit_icon">{b.icon}</span>
                                <span className="login_panel_benefit_text">{b.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right form panel */}
                <div className="login_panel_right">
                    <div className="login_form_card">
                        <div className="login_form_header">
                            <h1>Welcome back</h1>
                            <p>Sign in to continue your health journey.</p>
                        </div>

                        <form className="login_form" onSubmit={handleSubmit}>
                            <div className="form_field">
                                <label className="form_label" htmlFor="email">Email address</label>
                                <TextField
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    autoComplete="email"
                                    size="small"
                                    placeholder="you@example.com"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '10px',
                                            fontSize: '0.9375rem',
                                        }
                                    }}
                                />
                            </div>

                            <div className="form_field">
                                <label className="form_label" htmlFor="password">Password</label>
                                <TextField
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    autoComplete="current-password"
                                    size="small"
                                    placeholder="••••••••"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '10px',
                                            fontSize: '0.9375rem',
                                        }
                                    }}
                                />
                            </div>

                            {errorMessage && (
                                <div className="pwd_err">{errorMessage}</div>
                            )}

                            <div className="login_form_actions">
                                {loginLoading ? (
                                    <div className="login_loading_wrap">
                                        <Lottie animationData={landingData1} style={lottieStyle} />
                                    </div>
                                ) : (
                                    <button type="submit" className="login_submit_btn">
                                        Sign In
                                    </button>
                                )}

                                <div className="login_divider">or</div>

                                <p className="login_register_prompt">
                                    Don't have an account?{' '}
                                    <span onClick={() => navigate('/register')}>Create one free</span>
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
