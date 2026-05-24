import React from 'react';
import './landing.css';
import Navbar from '../navbar/Navbar';
import { useNavigate } from "react-router-dom";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const features = [
  {
    icon: '🌿',
    title: 'AI-Powered Recommendations',
    desc: 'Advanced NLP and NER technology to match your health needs with the right supplements.',
  },
  {
    icon: '🇮🇳',
    title: 'India & USA Coverage',
    desc: 'Trusted brands from both NIH-certified US supplements and top Indian Ayurvedic brands.',
  },
  {
    icon: '🛡️',
    title: 'Allergy-Safe Filtering',
    desc: 'Automatic allergen detection ensures you only see supplements safe for your profile.',
  },
  {
    icon: '📋',
    title: 'Full Label Transparency',
    desc: 'Access complete NIH supplement labels and detailed product information instantly.',
  },
];

const Landing = () => {
    const navigate = useNavigate();

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <div className='landing'>
                <div className='landing_inner'>
                    <div className='landing_content'>
                        {/* Left - Hero Text */}
                        <div className='landing_left'>
                            <div className='landing_badge'>
                                <span className='landing_badge_dot'></span>
                                Powered by NIH DSLD & Ayurvedic Research
                            </div>

                            <h1 className='landing_title'>
                                Your Personal<br />
                                <span className='landing_title_accent'>Health Supplement</span><br />
                                Advisor
                            </h1>

                            <p className='landing_subtitle'>
                                Get personalized supplement recommendations based on your unique health goals, powered by scientific data from the NIH Dietary Supplement database and trusted Indian wellness brands.
                            </p>

                            <div className='landing_actions'>
                                <button
                                    className='landing_cta_btn'
                                    onClick={() => navigate('/register')}
                                >
                                    Start Health Assessment
                                    <ArrowForwardIcon style={{ fontSize: 18 }} />
                                </button>
                                <button
                                    className='landing_cta_secondary'
                                    onClick={() => navigate('/login')}
                                >
                                    Already have an account?
                                </button>
                            </div>

                            <div className='landing_stats'>
                                <div className='landing_stat'>
                                    <span className='landing_stat_value'>80K+</span>
                                    <span className='landing_stat_label'>US Supplements</span>
                                </div>
                                <div className='landing_stat'>
                                    <span className='landing_stat_value'>40+</span>
                                    <span className='landing_stat_label'>Indian Products</span>
                                </div>
                                <div className='landing_stat'>
                                    <span className='landing_stat_value'>2</span>
                                    <span className='landing_stat_label'>Countries</span>
                                </div>
                            </div>
                        </div>

                        {/* Right - Feature cards */}
                        <div className='landing_right'>
                            {features.map((f, i) => (
                                <div className='landing_feature_card' key={i}>
                                    <div className='landing_feature_icon'>{f.icon}</div>
                                    <div className='landing_feature_text'>
                                        <h3>{f.title}</h3>
                                        <p>{f.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom trust bar */}
                <div className='landing_bottom_bar'>
                    <div className='landing_bottom_inner'>
                        <div className='landing_trust_badges'>
                            <div className='landing_trust_badge'>
                                <CheckCircleIcon style={{ fontSize: 15 }} />
                                NIH DSLD Certified Data
                            </div>
                            <div className='landing_trust_badge'>
                                <CheckCircleIcon style={{ fontSize: 15 }} />
                                FSSAI Licensed Indian Brands
                            </div>
                            <div className='landing_trust_badge'>
                                <CheckCircleIcon style={{ fontSize: 15 }} />
                                AYUSH Approved Formulations
                            </div>
                        </div>
                        <div className='landing_country_flags'>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>Available in</span>
                            <span className='flag'>🇺🇸</span>
                            <span className='flag'>🇮🇳</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Landing;
