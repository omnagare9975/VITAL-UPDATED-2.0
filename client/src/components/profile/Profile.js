import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Navbar from '../navbar/Navbar';
import { getUserAPIMethod, updateProfileAPIMethod, changePasswordAPIMethod } from '../../api/user';
import { login } from '../../features/userSlice';
import './profile.css';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: '0.9375rem' }
};

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userId = useSelector(s => s.user.id);
  const reduxUser = useSelector(s => s.user.user);

  const [tab, setTab] = useState('profile');
  const [profileData, setProfileData] = useState({ firstName: '', lastName: '', phone: '', country: '', dateOfBirth: '' });
  const [pwdData, setPwdData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileMsg, setProfileMsg] = useState(null);
  const [pwdMsg, setPwdMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getUserAPIMethod(userId)
      .then(r => r.json())
      .then(u => {
        setProfileData({
          firstName:   u.firstName   || '',
          lastName:    u.lastName    || '',
          phone:       u.phone       || '',
          country:     u.country     || '',
          dateOfBirth: u.dateOfBirth || '',
        });
      })
      .catch(() => {});
  }, [userId]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setProfileMsg(null);
    try {
      const res = await updateProfileAPIMethod(userId, profileData);
      const data = await res.json();
      if (res.ok) {
        setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
        dispatch(login({ user: data, token: localStorage.getItem('token') }));
      } else {
        setProfileMsg({ type: 'error', text: data.message || 'Update failed.' });
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Something went wrong.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdMsg(null);
    if (pwdData.newPassword !== pwdData.confirmPassword) {
      return setPwdMsg({ type: 'error', text: 'New passwords do not match.' });
    }
    if (pwdData.newPassword.length < 6) {
      return setPwdMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
    }
    setSaving(true);
    try {
      const res = await changePasswordAPIMethod(userId, {
        currentPassword: pwdData.currentPassword,
        newPassword: pwdData.newPassword,
      });
      const data = await res.json();
      if (res.ok) {
        setPwdMsg({ type: 'success', text: 'Password changed successfully!' });
        setPwdData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPwdMsg({ type: 'error', text: data.message || 'Change failed.' });
      }
    } catch {
      setPwdMsg({ type: 'error', text: 'Something went wrong.' });
    } finally {
      setSaving(false);
    }
  };

  const initials = (profileData.firstName?.[0] || '?').toUpperCase();

  return (
    <div className="profile_page">
      <Navbar />
      <div className="profile_hero">
        <div className="profile_hero_inner">
          <button className="profile_back_btn" onClick={() => navigate('/mainpage')}>
            <ArrowBackIcon style={{ fontSize: 18 }} /> Dashboard
          </button>
          <div className="profile_hero_content">
            <div className="profile_big_avatar">{initials}</div>
            <div>
              <h1 className="profile_hero_name">{profileData.firstName} {profileData.lastName}</h1>
              <p className="profile_hero_email">{reduxUser?.email || ''}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="profile_body">
        <div className="profile_tabs">
          <button className={`profile_tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
            <PersonIcon style={{ fontSize: 18 }} /> Edit Profile
          </button>
          <button className={`profile_tab ${tab === 'password' ? 'active' : ''}`} onClick={() => setTab('password')}>
            <LockIcon style={{ fontSize: 18 }} /> Change Password
          </button>
        </div>

        {/* Profile tab */}
        {tab === 'profile' && (
          <div className="profile_card">
            <h2 className="profile_section_title">Personal Information</h2>
            <form onSubmit={handleProfileSave} className="profile_form">
              <div className="profile_row">
                <div className="form_field">
                  <label className="form_label">First Name</label>
                  <TextField size="small" fullWidth sx={fieldSx} value={profileData.firstName}
                    onChange={e => setProfileData(p => ({ ...p, firstName: e.target.value }))} required />
                </div>
                <div className="form_field">
                  <label className="form_label">Last Name</label>
                  <TextField size="small" fullWidth sx={fieldSx} value={profileData.lastName}
                    onChange={e => setProfileData(p => ({ ...p, lastName: e.target.value }))} required />
                </div>
              </div>
              <div className="form_field">
                <label className="form_label">Phone Number</label>
                <TextField size="small" fullWidth sx={fieldSx} value={profileData.phone}
                  placeholder="+91 9876543210"
                  onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="profile_row">
                <div className="form_field">
                  <label className="form_label">Date of Birth</label>
                  <TextField size="small" fullWidth sx={fieldSx} type="date"
                    value={profileData.dateOfBirth}
                    InputLabelProps={{ shrink: true }}
                    onChange={e => setProfileData(p => ({ ...p, dateOfBirth: e.target.value }))} />
                </div>
                <div className="form_field">
                  <label className="form_label">Country</label>
                  <TextField size="small" fullWidth sx={fieldSx} value={profileData.country}
                    placeholder="India / USA / Other"
                    onChange={e => setProfileData(p => ({ ...p, country: e.target.value }))} />
                </div>
              </div>
              {profileMsg && (
                <div className={`profile_msg ${profileMsg.type}`}>
                  {profileMsg.type === 'success' && <CheckCircleIcon style={{ fontSize: 16 }} />}
                  {profileMsg.text}
                </div>
              )}
              <button type="submit" className="profile_save_btn" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* Password tab */}
        {tab === 'password' && (
          <div className="profile_card">
            <h2 className="profile_section_title">Change Password</h2>
            <form onSubmit={handlePasswordChange} className="profile_form">
              <div className="form_field">
                <label className="form_label">Current Password</label>
                <TextField size="small" fullWidth sx={fieldSx} type="password"
                  value={pwdData.currentPassword}
                  onChange={e => setPwdData(p => ({ ...p, currentPassword: e.target.value }))} required />
              </div>
              <div className="form_field">
                <label className="form_label">New Password</label>
                <TextField size="small" fullWidth sx={fieldSx} type="password"
                  placeholder="Min. 6 characters"
                  value={pwdData.newPassword}
                  onChange={e => setPwdData(p => ({ ...p, newPassword: e.target.value }))} required />
              </div>
              <div className="form_field">
                <label className="form_label">Confirm New Password</label>
                <TextField size="small" fullWidth sx={fieldSx} type="password"
                  value={pwdData.confirmPassword}
                  onChange={e => setPwdData(p => ({ ...p, confirmPassword: e.target.value }))} required />
              </div>
              {pwdMsg && (
                <div className={`profile_msg ${pwdMsg.type}`}>
                  {pwdMsg.type === 'success' && <CheckCircleIcon style={{ fontSize: 16 }} />}
                  {pwdMsg.text}
                </div>
              )}
              <button type="submit" className="profile_save_btn" disabled={saving}>
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
