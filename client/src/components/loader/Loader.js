import React from 'react';
import './loader.css';

const Loader = ({ loading = true, text = 'Loading...' }) => {
  if (!loading) return null;

  return (
    <div className="loader-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="loader-container">
        <div className="loader-cube">
          <span className="face face-1"></span>
          <span className="face face-2"></span>
          <span className="face face-3"></span>
          <span className="face face-4"></span>
          <span className="face face-5"></span>
          <span className="face face-6"></span>
        </div>
        <p className="loader-text">{text}</p>
      </div>
    </div>
  );
};

export default Loader;