import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '../navbar/Navbar';
import './mainpage.css';
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getMyQuestionsAPIMethod, deleteQuestionAPIMethod } from "../../api/question";
import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HistoryIcon from '@mui/icons-material/History';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import CalculateIcon from '@mui/icons-material/Calculate';

const healthTips = [
    "Always consult your healthcare provider before starting a new supplement regimen.",
    "Store supplements in a cool, dry place away from direct sunlight.",
    "Some supplements work best when taken with food — check product labels.",
    "Consistency is key — most supplements take 4–8 weeks to show noticeable effects.",
];

const MainPage = () => {
    const navigate = useNavigate();
    const userId = useSelector((state) => state.user.id);
    const user = useSelector((state) => state.user.user);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCountry, setFilterCountry] = useState('all');

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        getMyQuestionsAPIMethod(userId)
            .then(r => r.json())
            .then(data => {
                setRecords(Array.isArray(data) ? data : []);
            })
            .catch(() => setRecords([]))
            .finally(() => setLoading(false));
    }, [userId]);

    const totalAssessments = records.length;
    const savedRecs = records.filter(r => r.rec_list && r.rec_list.length > 0).length;

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Delete this assessment?')) return;
        try {
            await deleteQuestionAPIMethod(id);
            setRecords(prev => prev.filter(r => r._id !== id));
        } catch {}
    };

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const matchSearch = !searchQuery ||
                r.description?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchCountry = filterCountry === 'all' ||
                r.country?.toLowerCase() === filterCountry.toLowerCase();
            return matchSearch && matchCountry;
        });
    }, [records, searchQuery, filterCountry]);
    const firstName = user?.firstName || localStorage.getItem('firstName') || 'there';
    const initials = firstName ? firstName[0].toUpperCase() : '?';

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
        } catch { return ''; }
    };

    const getCountryFlag = (country) => {
        if (!country) return '🌐';
        if (country.toLowerCase() === 'india') return '🇮🇳';
        if (country.toLowerCase() === 'usa') return '🇺🇸';
        return '🌐';
    };

    const randomTip = healthTips[Math.floor(Date.now() / 86400000) % healthTips.length];

    return (
        <div className='mainpage'>
            <Navbar />

            {/* Hero Welcome Section */}
            <div className='mainpage_hero'>
                <div className='mainpage_hero_inner'>
                    <div className='mainpage_hero_text'>
                        <div className='mainpage_welcome_tag'>
                            <span className='mainpage_welcome_dot'></span>
                            Your Health Dashboard
                        </div>
                        <h1 className='mainpage_hero_title'>
                            Welcome back, <span>{firstName}</span> 👋
                        </h1>
                        <p className='mainpage_hero_sub'>
                            Track your supplement journey and discover new recommendations.
                        </p>
                    </div>
                    <button
                        className='mainpage_new_btn'
                        onClick={() => navigate(`/form/${userId}`)}
                    >
                        <AddIcon style={{ fontSize: 20 }} />
                        New Assessment
                    </button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className='mainpage_stats_bar'>
                <div className='mainpage_stat_card'>
                    <div className='mainpage_stat_icon green'>
                        <AssignmentIcon style={{ color: 'var(--primary)', fontSize: 22 }} />
                    </div>
                    <div className='mainpage_stat_info'>
                        <h3>{totalAssessments}</h3>
                        <p>Assessments</p>
                    </div>
                </div>
                <div className='mainpage_stat_card'>
                    <div className='mainpage_stat_icon blue'>
                        <FavoriteIcon style={{ color: 'var(--secondary)', fontSize: 22 }} />
                    </div>
                    <div className='mainpage_stat_info'>
                        <h3>{savedRecs}</h3>
                        <p>Saved Results</p>
                    </div>
                </div>
                <div className='mainpage_stat_card'>
                    <div className='mainpage_stat_icon amber'>
                        <HistoryIcon style={{ color: 'var(--accent)', fontSize: 22 }} />
                    </div>
                    <div className='mainpage_stat_info'>
                        <h3>{records[0] ? formatDate(records[0].createdAt).split(' ')[1] || '—' : '—'}</h3>
                        <p>Last Active</p>
                    </div>
                </div>
            </div>

            {/* Main body */}
            <div className='mainpage_body'>
                {/* History Section */}
                <div className='mainpage_main_col'>
                    <div className='section_header'>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <HistoryIcon style={{ color: 'var(--text-muted)', fontSize: 20 }} />
                            <span className='section_title'>Assessment History</span>
                        </div>
                        {totalAssessments > 0 && (
                            <span className='section_badge'>{filteredRecords.length} / {totalAssessments}</span>
                        )}
                    </div>

                    {/* Search & Filter */}
                    {records.length > 0 && (
                        <div className='mainpage_search_row'>
                            <div className='mainpage_search_wrap'>
                                <SearchIcon style={{ color: 'var(--text-muted)', fontSize: 18, flexShrink: 0 }} />
                                <input
                                    className='mainpage_search_input'
                                    type="text"
                                    placeholder="Search by health goal..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className='mainpage_filter_wrap'>
                                {['all', 'India', 'USA'].map(c => (
                                    <button
                                        key={c}
                                        className={`mainpage_filter_btn ${filterCountry === c ? 'active' : ''}`}
                                        onClick={() => setFilterCountry(c)}
                                    >
                                        {c === 'all' ? '🌐 All' : c === 'India' ? '🇮🇳 India' : '🇺🇸 USA'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className='mainpage_empty' style={{ border: '1px solid var(--border)' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading your history...</div>
                        </div>
                    ) : records.length === 0 ? (
                        <div className='mainpage_empty'>
                            <span className='mainpage_empty_icon'>🌿</span>
                            <h3>No assessments yet</h3>
                            <p>Take your first health assessment to receive personalized supplement recommendations.</p>
                            <button
                                className='mainpage_empty_btn'
                                onClick={() => navigate(`/form/${userId}`)}
                            >
                                Start Your Assessment
                            </button>
                        </div>
                    ) : (
                        filteredRecords.length === 0 ? (
                            <div className='mainpage_empty' style={{ border: '1px solid var(--border)', padding: '2rem' }}>
                                <span style={{ fontSize: '2rem' }}>🔍</span>
                                <p style={{ color: 'var(--text-muted)' }}>No results match your search.</p>
                            </div>
                        ) : (
                        <div className='mainpage_history_list'>
                            {filteredRecords.map((d) => (
                                <div
                                    key={d._id}
                                    className='mainpage_history_card'
                                    onClick={() => navigate(`/mainpagedetails/${d._id}`)}
                                >
                                    <div className='mainpage_history_icon'>
                                        <AssignmentIcon style={{ color: 'var(--primary)', fontSize: 22 }} />
                                    </div>
                                    <div className='mainpage_history_info'>
                                        <div className='mainpage_history_desc'>
                                            {d.description || 'Health Assessment'}
                                        </div>
                                        <div className='mainpage_history_meta'>
                                            {d.country && (
                                                <span className={`mainpage_history_tag country_${d.country?.toLowerCase()}`}>
                                                    {getCountryFlag(d.country)} {d.country}
                                                </span>
                                            )}
                                            {d.gender && <span className='mainpage_history_tag'>{d.gender}</span>}
                                            {d.rec_list?.length > 0 && (
                                                <span className='mainpage_history_tag saved'>
                                                    {d.rec_list.length} saved
                                                </span>
                                            )}
                                            {d.createdAt && (
                                                <span className='mainpage_history_tag'>{formatDate(d.createdAt)}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                                        <button
                                            className='mainpage_delete_btn'
                                            onClick={(e) => handleDelete(e, d._id)}
                                            title="Delete assessment"
                                        >
                                            <DeleteIcon style={{ fontSize: 17 }} />
                                        </button>
                                        <ChevronRightIcon className='mainpage_history_arrow' />
                                    </div>
                                </div>
                            ))}
                        </div>
                        )
                    )}
                </div>

                {/* Sidebar */}
                <div className='mainpage_sidebar'>
                    {/* Profile Card */}
                    <div className='profile_card'>
                        <div className='profile_card_top'>
                            <div className='profile_avatar'>{initials}</div>
                            <div className='profile_card_info'>
                                <h3>{user?.firstName || 'User'} {user?.lastName || ''}</h3>
                                <p>{user?.email || ''}</p>
                            </div>
                        </div>
                        <div>
                            <div className='profile_card_row'>
                                <span className='profile_card_label'>Assessments</span>
                                <span className='profile_card_value'>{totalAssessments}</span>
                            </div>
                            <div className='profile_card_row'>
                                <span className='profile_card_label'>Saved Results</span>
                                <span className='profile_card_value'>{savedRecs}</span>
                            </div>
                            <div className='profile_card_row'>
                                <span className='profile_card_label'>Member Since</span>
                                <span className='profile_card_value'>
                                    {records[records.length - 1]?.createdAt
                                        ? formatDate(records[records.length - 1].createdAt)
                                        : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Health Goals Summary */}
                    {records.length > 0 && records[0].description && (
                        <div className='health_goals_card'>
                            <div className='section_header' style={{ marginBottom: '0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FavoriteIcon style={{ color: 'var(--primary)', fontSize: 18 }} />
                                    <span className='section_title' style={{ fontSize: '0.9375rem' }}>Recent Health Goals</span>
                                </div>
                            </div>
                            <div className='health_goals_list'>
                                {records.slice(0, 3).map((r, i) => (
                                    r.description && (
                                        <div key={i} className='health_goal_item'>
                                            <span className='health_goal_dot'></span>
                                            <span style={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                maxWidth: '260px'
                                            }}>
                                                {r.description}
                                            </span>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick actions */}
                    <div className='profile_card' style={{ padding: '1.25rem' }}>
                        <div className='section_title' style={{ marginBottom: '0.875rem', fontSize: '0.9375rem' }}>Quick Tools</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <button
                                onClick={() => navigate('/bmi')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                                    background: 'var(--bg-muted)', border: '1.5px solid var(--border)',
                                    borderRadius: 'var(--border-radius)', padding: '0.75rem 1rem',
                                    fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)',
                                    cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.2s', textAlign: 'left'
                                }}
                                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary-dark)'; }}
                                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                            >
                                <CalculateIcon style={{ fontSize: 18, color: 'var(--primary)' }} />
                                BMI Calculator
                            </button>
                            <button
                                onClick={() => navigate(`/form/${userId}`)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                                    background: 'var(--bg-muted)', border: '1.5px solid var(--border)',
                                    borderRadius: 'var(--border-radius)', padding: '0.75rem 1rem',
                                    fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)',
                                    cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.2s', textAlign: 'left'
                                }}
                                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary-dark)'; }}
                                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                            >
                                <AssignmentIcon style={{ fontSize: 18, color: 'var(--primary)' }} />
                                New Assessment
                            </button>
                        </div>
                    </div>

                    {/* Wellness Tip */}
                    <div className='tips_card'>
                        <div className='tips_card_header'>
                            <LightbulbIcon style={{ color: 'var(--primary)', fontSize: 20 }} />
                            <h3>Wellness Tip</h3>
                        </div>
                        <div className='tips_list'>
                            <div className='tips_item'>{randomTip}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MainPage;
