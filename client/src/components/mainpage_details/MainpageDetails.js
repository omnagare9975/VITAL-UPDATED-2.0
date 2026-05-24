import React, { useEffect, useState } from 'react';
import Navbar from '../navbar/Navbar';
import './mainpagedetails.css';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuestionById } from '../../api/question';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import BookmarkIcon from '@mui/icons-material/Bookmark';

function extractId(url) { return url.split('/').pop(); }
function buildProxyPdfUrl(originalUrl) {
  return `http://localhost:3003/proxy/pdf/${extractId(originalUrl)}`;
}

function isIndiaProduct(d) {
  return d && typeof d === 'object' && !Array.isArray(d) && d.brand && d.productName;
}

const SUPPLEMENT_ICONS = ['🌿', '💊', '🧪', '🌱', '⚡', '🦴', '❤️', '🧠', '👁️', '💪'];

const MainpageDetails = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);

  useEffect(() => {
    getQuestionById(postId)
      .then(res => res.json())
      .then(data => setQuestion(data))
      .catch(err => console.error('Error loading:', err));
  }, [postId]);

  const recs = question?.rec_list || [];
  const isIndia = recs.length > 0 && isIndiaProduct(recs[0]);

  return (
    <div className="mainpage_details">
      <Navbar />

      {/* Hero */}
      <div className="details_hero">
        <div className="details_hero_inner">
          <div>
            <h1 className="details_hero_title">
              <BookmarkIcon style={{ fontSize: 24, marginRight: 8, verticalAlign: 'middle' }} />
              Saved Recommendations
            </h1>
            {question?.description && (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginTop: '0.375rem' }}>
                Query: <em>{question.description}</em>
              </p>
            )}
          </div>
          <button
            className="details_back_btn"
            onClick={() => navigate('/mainpage')}
          >
            <KeyboardBackspaceIcon style={{ fontSize: 18 }} />
            Dashboard
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="details_body">
        {!question && (
          <div className="details_loading">Loading saved recommendations...</div>
        )}

        {question && (
          <>
            <div className="details_section_header">
              <span className="details_section_title">
                {isIndia ? '🇮🇳 Indian Supplements' : '🇺🇸 US Supplements'}
              </span>
              {recs.length > 0 && (
                <span className="details_count_badge">{recs.length} saved</span>
              )}
            </div>

            {recs.length === 0 ? (
              <div className="details_empty">
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <h3>No saved recommendations</h3>
                <p>This assessment doesn't have any saved supplement recommendations yet.</p>
              </div>
            ) : isIndia ? (
              /* India cards */
              <div className="details_container">
                {recs.map((supp, idx) => (
                  <div key={idx} className="india_details_card">
                    <div className="india_details_header">
                      <h3>{SUPPLEMENT_ICONS[idx % SUPPLEMENT_ICONS.length]} {supp.productName}</h3>
                      <div className="india_details_brand">🇮🇳 {supp.brand}</div>
                    </div>
                    <div className="india_details_body">
                      {supp.description && (
                        <p className="india_details_desc">{supp.description}</p>
                      )}
                      {supp.dosage && (
                        <div className="india_details_row">
                          <strong>Dosage: </strong>{supp.dosage}
                        </div>
                      )}
                      {supp.form && (
                        <div className="india_details_row">
                          <strong>Form: </strong>{supp.form}
                        </div>
                      )}
                      {supp.ingredients && (
                        <div className="india_details_row">
                          <strong>Ingredients: </strong>{supp.ingredients}
                        </div>
                      )}
                    </div>
                    <div className="india_details_footer">
                      <span className="india_details_price">{supp.price || '—'}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {supp.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* USA PDF cards */
              <div className="details_container">
                {recs.map((d, idx) => (
                  <div key={idx} className="details_card">
                    <div className="details_card_pdf">
                      <embed
                        src={buildProxyPdfUrl(d[0])}
                        type="application/pdf"
                        width="100%"
                        height="220px"
                      />
                    </div>
                    <div className="details_card_bottom">
                      <h3>{d[2]}</h3>
                      <p>By {d[3]}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MainpageDetails;
