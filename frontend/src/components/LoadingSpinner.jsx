import React from 'react';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import '../styles/loading.css';

const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-container">
      <div className="spinner-wrapper">
        <AiOutlineLoading3Quarters className="spinner-icon" />
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
