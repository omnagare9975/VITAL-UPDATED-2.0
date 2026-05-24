import React, { useState, useRef, useEffect } from 'react';
import './navbar.css';
import logo2 from "../../assets/images/logo2.png";
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../features/userSlice";
import { useLocation } from 'react-router-dom';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import CalculateIcon from '@mui/icons-material/Calculate';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

const Navbar = () => {
    const navigate = useNavigate();
    const isAuthenticated = useSelector((state) => state.user.isAuthenticated);
    const user = useSelector((state) => state.user.user);
    const dispatch = useDispatch();
    const [modal, setModal] = useState(false);
    const modalRef = useRef(null);
    useLocation(); // keep router context active

    const handleLogout = () => {
        dispatch(logout());
        navigate("/");
        setModal(false);
    };

    // Close modal on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                setModal(false);
            }
        };
        if (modal) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [modal]);

    return (
        <nav className="navbar_container">
            <div className='navbar_inner'>
                <div
                    className="navbar_logo_container"
                    onClick={() => navigate(isAuthenticated ? "/mainpage" : "/")}
                    role="button"
                    aria-label="Go to homepage"
                >
                    <img src={logo2} className="main_logo" alt="VITAL logo" />
                    vital
                </div>

                {!isAuthenticated ? (
                    <div className="navbar_links">
                        <button
                            className="btn-secondary"
                            style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
                            onClick={() => navigate('/login')}
                        >
                            Login
                        </button>
                        <button
                            className="btn-primary"
                            style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', boxShadow: 'none' }}
                            onClick={() => navigate('/register')}
                        >
                            Get Started
                        </button>
                    </div>
                ) : (
                    <div ref={modalRef} style={{ position: 'relative' }}>
                        <div className='logout_container' onClick={() => setModal(!modal)}>
                            <MenuIcon style={{ color: "var(--text-muted)", fontSize: 20 }} />
                            <AccountCircleIcon style={{ color: "var(--primary)", fontSize: 28 }} />
                        </div>

                        {modal && (
                            <div className='logout_modal'>
                                {user?.firstName && (
                                    <div style={{
                                        padding: '0.875rem 1.25rem 0.625rem',
                                        borderBottom: '1px solid var(--border)',
                                        marginBottom: '0.25rem'
                                    }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                            {user.firstName} {user.lastName}
                                        </div>
                                        <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                                            {user.email}
                                        </div>
                                    </div>
                                )}
                                <div
                                    className='logout_modal_item'
                                    onClick={() => { navigate('/mainpage'); setModal(false); }}
                                >
                                    <DashboardIcon style={{ fontSize: 17 }} />
                                    Dashboard
                                </div>
                                <div
                                    className='logout_modal_item'
                                    onClick={() => {
                                        const userId = user?._id || localStorage.getItem("userId");
                                        if (userId) navigate(`/form/${userId}`);
                                        setModal(false);
                                    }}
                                >
                                    <AssignmentIcon style={{ fontSize: 17 }} />
                                    New Assessment
                                </div>
                                <div className='logout_modal_item' onClick={() => { navigate('/profile'); setModal(false); }}>
                                    <PersonIcon style={{ fontSize: 17 }} />
                                    My Profile
                                </div>
                                <div className='logout_modal_item' onClick={() => { navigate('/bmi'); setModal(false); }}>
                                    <CalculateIcon style={{ fontSize: 17 }} />
                                    BMI Calculator
                                </div>
                                <div className='logout_modal_item' onClick={() => { navigate('/admin'); setModal(false); }}>
                                    <AdminPanelSettingsIcon style={{ fontSize: 17 }} />
                                    Admin Panel
                                </div>
                                <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.25rem' }}>
                                    <div className='logout_modal_item danger' onClick={handleLogout}>
                                        <LogoutIcon style={{ fontSize: 17 }} />
                                        Sign Out
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
