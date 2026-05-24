import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../navbar/Navbar';
import { getAdminStatsAPIMethod } from '../../api/user';
import './admin.css';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PublicIcon from '@mui/icons-material/Public';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStatsAPIMethod()
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="admin_page">
      <Navbar />
      <div className="admin_hero">
        <div className="admin_hero_inner">
          <button className="admin_back_btn" onClick={() => navigate('/mainpage')}>
            <ArrowBackIcon style={{ fontSize: 18 }} /> Dashboard
          </button>
          <h1 className="admin_hero_title">Admin Panel</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', marginTop: '0.375rem' }}>
            System overview and statistics
          </p>
        </div>
      </div>

      <div className="admin_body">
        {loading ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Loading stats...</p>
        ) : stats ? (
          <>
            <div className="admin_stats_grid">
              <div className="admin_stat_card blue">
                <PeopleIcon style={{ fontSize: 32, color: '#3B82F6' }} />
                <div><div className="admin_stat_num">{stats.totalUsers}</div><div className="admin_stat_lbl">Total Users</div></div>
              </div>
              <div className="admin_stat_card green">
                <AssignmentIcon style={{ fontSize: 32, color: 'var(--primary)' }} />
                <div><div className="admin_stat_num">{stats.totalAssessments}</div><div className="admin_stat_lbl">Total Assessments</div></div>
              </div>
              <div className="admin_stat_card orange">
                <PublicIcon style={{ fontSize: 32, color: '#F97316' }} />
                <div>
                  <div className="admin_stat_num">{stats.indiaAssessments}</div>
                  <div className="admin_stat_lbl">🇮🇳 India Assessments</div>
                </div>
              </div>
              <div className="admin_stat_card indigo">
                <PublicIcon style={{ fontSize: 32, color: '#6366F1' }} />
                <div>
                  <div className="admin_stat_num">{stats.usaAssessments}</div>
                  <div className="admin_stat_lbl">🇺🇸 USA Assessments</div>
                </div>
              </div>
            </div>

            <div className="admin_recent_card">
              <h2 className="admin_section_title">Recent Users</h2>
              <div className="admin_user_list">
                {(stats.recentUsers || []).map((u, i) => (
                  <div key={i} className="admin_user_row">
                    <div className="admin_user_avatar">{(u.firstName?.[0] || '?').toUpperCase()}</div>
                    <div className="admin_user_info">
                      <div className="admin_user_name">{u.firstName} {u.lastName}</div>
                      <div className="admin_user_email">{u.email}</div>
                    </div>
                    <div className="admin_user_date">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p style={{ color: 'var(--error)', textAlign: 'center', padding: '3rem' }}>Failed to load statistics.</p>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
