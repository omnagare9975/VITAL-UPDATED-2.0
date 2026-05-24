import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../navbar/Navbar';
import './notfound.css';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="notfound_page">
      <Navbar />
      <div className="notfound_body">
        <div className="notfound_code">404</div>
        <div className="notfound_emoji">🌿</div>
        <h1 className="notfound_title">Page Not Found</h1>
        <p className="notfound_sub">
          Looks like this page doesn't exist. Let's get you back on track.
        </p>
        <div className="notfound_actions">
          <button className="btn-primary" onClick={() => navigate('/')}>Go Home</button>
          <button className="btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
