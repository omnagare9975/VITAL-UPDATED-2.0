import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedIcon from '@mui/icons-material/Verified';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import PrintIcon from '@mui/icons-material/Print';
import CompareIcon from '@mui/icons-material/Compare';
import CloseIcon from '@mui/icons-material/Close';
import { PDF_PROXY_BASE } from '../../api/config';

import Navbar from '../navbar/Navbar';
import './recommendation.css';
import Loader from '../loader/Loader';
import { getRecommendationAPIMethod, updateQuestionAPIMethod } from '../../api/question';

pdfjs.GlobalWorkerOptions.workerSrc =
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

function extractId(url) { return url.split('/').pop(); }
function buildProxyPdfUrl(dsldUrl) {
  return `${PDF_PROXY_BASE}/proxy/pdf/${extractId(dsldUrl)}`;
}

const SUPPLEMENT_ICONS = ['🌿', '💊', '🧪', '🌱', '⚡', '🦴', '❤️', '🧠', '👁️', '💪'];

// ── India card ─────────────────────────────────────────────────────────────────
const IndiaCard = ({ supp, index, selected, onToggleCompare }) => {
  const icon = SUPPLEMENT_ICONS[index % SUPPLEMENT_ICONS.length];
  return (
    <div className={`india_rec_card ${selected ? 'compare_selected' : ''}`}>
      <div className="india_card_header">
        <div className="india_card_icon">{icon}</div>
        <div className="india_card_brand_name">
          <h3>{supp.productName}</h3>
          <span className="india_card_brand_tag">🇮🇳 {supp.brand}</span>
        </div>
        {onToggleCompare && (
          <button
            className={`compare_toggle_btn ${selected ? 'active' : ''}`}
            onClick={() => onToggleCompare(supp)}
            title={selected ? "Remove from comparison" : "Add to comparison"}
          >
            <CompareIcon style={{ fontSize: 16 }} />
            {selected ? 'Added' : 'Compare'}
          </button>
        )}
      </div>
      <div className="india_card_body">
        <p className="india_card_description">{supp.description}</p>
        <div className="india_card_details">
          {supp.ingredients && (
            <div className="india_card_detail_row">
              <span className="india_card_detail_label">Ingredients</span>
              <span className="india_card_detail_value">{supp.ingredients}</span>
            </div>
          )}
          {supp.dosage && (
            <div className="india_card_detail_row">
              <span className="india_card_detail_label">Dosage</span>
              <span className="india_card_detail_value">{supp.dosage}</span>
            </div>
          )}
          {supp.availableAt?.length > 0 && (
            <div className="india_card_detail_row">
              <span className="india_card_detail_label">Buy at</span>
              <span className="india_card_detail_value">{supp.availableAt.slice(0, 3).join(' · ')}</span>
            </div>
          )}
        </div>
        {supp.certifications?.length > 0 && (
          <div className="india_card_certs">
            {supp.certifications.map((c, i) => (
              <span key={i} className="india_card_cert">✓ {c}</span>
            ))}
          </div>
        )}
      </div>
      <div className="india_card_footer">
        <span className="india_card_price">{supp.price || '—'}</span>
        <span className="india_card_form_badge">{supp.form || supp.category}</span>
      </div>
    </div>
  );
};

// ── Comparison Panel ───────────────────────────────────────────────────────────
const ComparePanel = ({ items, onRemove, onClose }) => {
  if (items.length === 0) return null;
  const fields = [
    { label: 'Category', key: 'category' },
    { label: 'Form', key: 'form' },
    { label: 'Ingredients', key: 'ingredients' },
    { label: 'Dosage', key: 'dosage' },
    { label: 'Price', key: 'price' },
    { label: 'Certifications', key: 'certifications', isArray: true },
  ];
  return (
    <div className="compare_panel">
      <div className="compare_panel_header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CompareIcon style={{ fontSize: 20, color: 'var(--primary)' }} />
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>Comparison</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>({items.length}/3 selected)</span>
        </div>
        <button className="compare_close_btn" onClick={onClose}><CloseIcon style={{ fontSize: 18 }} /></button>
      </div>
      <div className="compare_grid" style={{ gridTemplateColumns: `180px repeat(${items.length}, 1fr)` }}>
        {/* Header row */}
        <div className="compare_cell header_cell"></div>
        {items.map((item, i) => (
          <div key={i} className="compare_cell header_cell">
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{item.productName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--primary-dark)', fontWeight: 600 }}>{item.brand}</div>
            <button className="compare_remove_btn" onClick={() => onRemove(item)}>✕ Remove</button>
          </div>
        ))}
        {/* Data rows */}
        {fields.map((f) => (
          <React.Fragment key={f.key}>
            <div className="compare_cell label_cell">{f.label}</div>
            {items.map((item, i) => (
              <div key={i} className="compare_cell">
                {f.isArray && Array.isArray(item[f.key])
                  ? item[f.key].join(', ') || '—'
                  : item[f.key] || '—'}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const Recommendation = () => {
  const [recList, setRecList]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [meta, setMeta]                 = useState(null);
  const [saveState, setSaveState]       = useState('idle'); // idle | saving | saved | error
  const [isIndia, setIsIndia]           = useState(false);
  const [compareList, setCompareList]   = useState([]);
  const [showCompare, setShowCompare]   = useState(false);
  const printRef = useRef(null);

  const { questionId, age, description } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const country = new URLSearchParams(location.search).get('country') || 'USA';

  useEffect(() => {
    setLoading(true);
    setError(null);
    const decodedDesc = decodeURIComponent(description);

    getRecommendationAPIMethod(age, decodedDesc, country)
      .then((res) => {
        if (!res.ok) return res.json().then(e => { setError(e.message || 'No results found.'); setLoading(false); });
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (data._meta) setMeta(data._meta);
        if (data.type === 'india' && Array.isArray(data.data)) {
          setIsIndia(true);
          setRecList(data.data.slice(0, 10));
        } else if (data.data && Array.isArray(data.data)) {
          setIsIndia(false);
          setRecList(data.data.slice(0, 10));
        } else if (Array.isArray(data)) {
          setIsIndia(false);
          setRecList(data.slice(0, 10));
        }
        setLoading(false);
      })
      .catch(() => { setError('Something went wrong. Please try again.'); setLoading(false); });
  }, [age, description, country]);

  // ── Save & Exit (properly awaited) ──────────────────────────────────────────
  const handleSaveAndExit = async () => {
    setSaveState('saving');
    if (questionId && questionId !== 'undefined') {
      try {
        const res = await updateQuestionAPIMethod(questionId, { rec_list: recList });
        if (!res.ok) throw new Error('Save failed');
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    } else {
      setSaveState('saved');
    }
    setTimeout(() => navigate('/mainpage'), 800);
  };

  // ── Print ────────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  // ── Compare ─────────────────────────────────────────────────────────────────
  const toggleCompare = (supp) => {
    setCompareList(prev => {
      const exists = prev.find(s => s.id === supp.id);
      if (exists) return prev.filter(s => s.id !== supp.id);
      if (prev.length >= 3) return prev;
      return [...prev, supp];
    });
    setShowCompare(true);
  };

  const decodedDesc = decodeURIComponent(description);
  const countryFlag = country === 'India' ? '🇮🇳' : country === 'USA' ? '🇺🇸' : '🌐';

  return (
    <div className="recommendation" ref={printRef}>
      <Navbar />

      {/* Top bar */}
      <div className="rec_topbar no-print">
        <div className="rec_topbar_left">
          <button className="rec_back_btn" onClick={() => navigate('/mainpage')}>
            <KeyboardBackspaceIcon style={{ fontSize: 18 }} /> Dashboard
          </button>
        </div>
        {!loading && !error && recList.length > 0 && (
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            {isIndia && compareList.length >= 2 && (
              <button className="rec_compare_btn" onClick={() => setShowCompare(v => !v)}>
                <CompareIcon style={{ fontSize: 16 }} />
                Compare ({compareList.length})
              </button>
            )}
            <button className="rec_print_btn" onClick={handlePrint}>
              <PrintIcon style={{ fontSize: 16 }} /> Print
            </button>
            <button
              className="rec_save_btn"
              onClick={handleSaveAndExit}
              disabled={saveState === 'saving'}
            >
              {saveState === 'saving' && '⏳ Saving...'}
              {saveState === 'saved'  && <><CheckCircleIcon style={{ fontSize: 16 }} /> Saved!</>}
              {saveState === 'error'  && '⚠ Retry'}
              {saveState === 'idle'   && <><SaveIcon style={{ fontSize: 16 }} /> Save & Exit</>}
            </button>
          </div>
        )}
      </div>

      {/* Comparison panel */}
      {showCompare && isIndia && (
        <div className="no-print">
          <ComparePanel
            items={compareList}
            onRemove={(s) => setCompareList(prev => prev.filter(x => x.id !== s.id))}
            onClose={() => setShowCompare(false)}
          />
        </div>
      )}

      {/* Hero */}
      {!loading && (
        <div className="rec_hero print-hero">
          <div className="rec_hero_inner">
            <h1 className="rec_hero_title">
              {error ? 'No exact matches found' : 'Your Recommendations'}
            </h1>
            {meta?.normalizedQuery && meta.normalizedQuery !== decodedDesc && (
              <p className="rec_hero_sub">Searched for: <em>{meta.normalizedQuery}</em></p>
            )}
            <div className="rec_meta_badges">
              <span className="rec_meta_badge">{countryFlag} {country}</span>
              {recList.length > 0 && (
                <span className="rec_meta_badge green">
                  <CheckCircleIcon style={{ fontSize: 13 }} /> {recList.length} matches
                </span>
              )}
              {meta?.allergiesDetected?.length > 0 && (
                <span className="rec_meta_badge">
                  🛡️ Filters: {meta.allergiesDetected.map(a => <span key={a} className="allergy_tag">{a}</span>)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="recommendation_outer">
        {loading && (
          <div className="rec_loading_state">
            <h1 className="loading_title">Finding your supplements...</h1>
            <p className="loading_subtext">This may take up to 15 seconds</p>
            <Loader />
          </div>
        )}

        {!loading && error && (
          <div className="recommendation_fallback">
            <div className="fallback_icon">🔍</div>
            <h2>No exact matches found</h2>
            <p className="fallback_message">{error}</p>
            {meta?.normalizedQuery && (
              <p className="fallback_query">Searched for: <em>{meta.normalizedQuery}</em></p>
            )}
            <button className="fallback_back_btn" onClick={() => navigate('/mainpage')}>
              Try a Different Search
            </button>
          </div>
        )}

        {/* India results */}
        {!loading && !error && isIndia && recList.length > 0 && (
          <>
            <div className="rec_section_header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <LocalPharmacyIcon style={{ color: 'var(--primary)', fontSize: 22 }} />
                <span className="rec_section_title">Indian Supplement Recommendations</span>
              </div>
              <span className="rec_count_badge">{recList.length} results</span>
            </div>
            <div className="rec_info_banner">
              <VerifiedIcon style={{ color: 'var(--primary)', fontSize: 17, flexShrink: 0 }} />
              Trusted Indian brands. Prices are approximate — always consult a healthcare provider before starting any supplement.
            </div>
            <div className="india_rec_container">
              {recList.map((supp, index) => (
                <IndiaCard
                  key={supp.id || index}
                  supp={supp}
                  index={index}
                  selected={compareList.some(s => s.id === supp.id)}
                  onToggleCompare={toggleCompare}
                />
              ))}
            </div>
          </>
        )}

        {/* USA results */}
        {!loading && !error && !isIndia && recList.length > 0 && (
          <>
            <div className="rec_section_header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <LocalPharmacyIcon style={{ color: 'var(--primary)', fontSize: 22 }} />
                <span className="rec_section_title">US Supplement Recommendations</span>
              </div>
              <span className="rec_count_badge">{recList.length} results</span>
            </div>
            <div className="rec_info_banner">
              <VerifiedIcon style={{ color: 'var(--primary)', fontSize: 17, flexShrink: 0 }} />
              Data sourced from the NIH Dietary Supplement Label Database (DSLD). Always consult a healthcare provider.
            </div>
            <div className="recommendation_container">
              {recList.map((d, index) => (
                <div key={index} className="recommendation_inner">
                  <div className="recommendation_object">
                    <Document
                      file={buildProxyPdfUrl(d[0])}
                      loading={<div style={{ padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading label...</div>}
                      error={<div style={{ padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Label unavailable</div>}
                    >
                      <Page pageNumber={1} width={280} renderTextLayer={false} renderAnnotationLayer={false} />
                    </Document>
                  </div>
                  <div className="recommendation_object_bottom">
                    <h3>{d[2]}</h3>
                    <p className="maker">By {d[3]}</p>
                  </div>
                  <div className="recommendation_description">{d[13]}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && !error && recList.length === 0 && (
          <div className="recommendation_fallback">
            <div className="fallback_icon">🌿</div>
            <h2>No supplements found</h2>
            <p className="fallback_message">Try rephrasing your health goal or consult a healthcare provider.</p>
            <button className="fallback_back_btn" onClick={() => navigate('/mainpage')}>
              Try a Different Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendation;
