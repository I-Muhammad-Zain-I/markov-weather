import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import { toast } from 'sonner';
import styles from "./Header.module.css";

const Header = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = async () => {
    try {
      await api.post('/logout');
      localStorage.removeItem('token');
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Error logging out. Please try again.');
    }
  };

  return (
    <header className={styles["header"]}>
      <h1 className={styles["header__title"]}>WEATHERITE</h1>
      <nav className={styles["header__nav"]}>
        <ul className={`${styles["nav__nav-list"]} aleo-h5-16`}>
          {token ? (
            <>
              <li>
                <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
                  Weather
                </Link>
              </li>
              <li>
                <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>
                  Dashboard
                </Link>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  className={styles["prediction_btn"]}
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/login" style={{ color: 'white', textDecoration: 'none' }}>
                  Login
                </Link>
              </li>
              <li>
                <Link to="/signup" style={{ color: 'white', textDecoration: 'none' }}>
                  Sign Up
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;
