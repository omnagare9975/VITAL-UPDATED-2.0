import { useState } from "react";
import "./Register.css";
import { useNavigate } from "react-router-dom";
import TextField from '@mui/material/TextField';
import Lottie from "lottie-react";
import { createUserAPIMethod, loginUserAPIMethod } from "../../api/auth";
import { useDispatch } from "react-redux";
import { login } from "../../features/userSlice";
import landingData1 from "../../assets/Lottie/ProcessIndicator.json";
import Navbar from '../navbar/Navbar';
import logo2 from "../../assets/images/logo2.png";

const steps = [
    { num: '1', text: 'Create your free account' },
    { num: '2', text: 'Complete your health assessment' },
    { num: '3', text: 'Get personalized recommendations' },
];

const fieldStyle = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '10px',
        fontSize: '0.9375rem',
    }
};

const Register = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [failed, setFailed] = useState(false);
    const [registerLoading, setRegisterIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPwd: ''
    });

    const lottieStyle = { height: 46, width: 46 };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errorMessage) setErrorMessage(null);
        if (failed) setFailed(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPwd) {
            setErrorMessage("Passwords do not match.");
            return;
        }
        if (formData.password.length < 6) {
            setErrorMessage("Password must be at least 6 characters.");
            return;
        }

        setRegisterIsLoading(true);

        const user = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            password: formData.password
        };

        createUserAPIMethod(user)
            .then((response) => {
                if (response.ok) {
                    loginUserAPIMethod(user)
                        .then((res) => {
                            if (res.ok) {
                                res.json().then((jsonResult) => {
                                    dispatch(login(jsonResult));
                                    navigate(`/form/${jsonResult.user._id}`);
                                });
                            }
                        })
                        .catch(() => setErrorMessage("Account created. Please sign in."))
                        .finally(() => setRegisterIsLoading(false));
                } else {
                    setFailed(true);
                    setRegisterIsLoading(false);
                }
            })
            .catch(() => {
                setErrorMessage("Registration failed. Please try again.");
                setRegisterIsLoading(false);
            });
    };

    return (
        <div className="register_page">
            <Navbar />
            <div className="register_layout">
                {/* Left panel */}
                <div className="register_panel_left">
                    <div className="register_panel_brand">
                        <img src={logo2} className="register_panel_logo" alt="VITAL" />
                        <div className="register_panel_brand_name">vital<span>.</span></div>
                        <p className="register_panel_tagline">
                            Join thousands discovering the right supplements for their unique health profile.
                        </p>
                    </div>
                    <div className="register_panel_steps">
                        {steps.map((s) => (
                            <div className="register_step" key={s.num}>
                                <div className="register_step_number">{s.num}</div>
                                <span className="register_step_text">{s.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right form panel */}
                <div className="register_panel_right">
                    <div className="register_form_card">
                        <div className="register_form_header">
                            <h1>Create account</h1>
                            <p>Free forever. Start your health assessment today.</p>
                        </div>

                        <form className="register_form" onSubmit={handleSubmit}>
                            <div className="register_row">
                                <div className="form_field">
                                    <label className="form_label" htmlFor="firstName">First Name</label>
                                    <TextField
                                        id="firstName"
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        required
                                        fullWidth
                                        autoComplete="given-name"
                                        size="small"
                                        placeholder="Jane"
                                        sx={fieldStyle}
                                    />
                                </div>
                                <div className="form_field">
                                    <label className="form_label" htmlFor="lastName">Last Name</label>
                                    <TextField
                                        id="lastName"
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        required
                                        fullWidth
                                        autoComplete="family-name"
                                        size="small"
                                        placeholder="Doe"
                                        sx={fieldStyle}
                                    />
                                </div>
                            </div>

                            <div className="form_field">
                                <label className="form_label" htmlFor="reg_email">Email address</label>
                                <TextField
                                    id="reg_email"
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    autoComplete="email"
                                    size="small"
                                    placeholder="you@example.com"
                                    sx={fieldStyle}
                                />
                            </div>

                            <div className="form_field">
                                <label className="form_label" htmlFor="reg_password">Password</label>
                                <TextField
                                    id="reg_password"
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    autoComplete="new-password"
                                    size="small"
                                    placeholder="Min. 6 characters"
                                    sx={fieldStyle}
                                />
                            </div>

                            <div className="form_field">
                                <label className="form_label" htmlFor="confirmPwd">Confirm Password</label>
                                <TextField
                                    id="confirmPwd"
                                    type="password"
                                    name="confirmPwd"
                                    value={formData.confirmPwd}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    autoComplete="new-password"
                                    size="small"
                                    placeholder="Repeat your password"
                                    sx={fieldStyle}
                                />
                            </div>

                            {(errorMessage || failed) && (
                                <div className="register_error">
                                    {errorMessage || "Registration failed. Please check your information and make sure this email is not already registered."}
                                </div>
                            )}

                            {registerLoading ? (
                                <div className="register_loading_wrap">
                                    <Lottie animationData={landingData1} style={lottieStyle} />
                                </div>
                            ) : (
                                <button type="submit" className="register_submit_btn">
                                    Create Free Account
                                </button>
                            )}

                            <p className="register_login_prompt">
                                Already have an account?{' '}
                                <span onClick={() => navigate('/login')}>Sign in</span>
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
