import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';

import Navbar from '../navbar/Navbar';
import './recommendation.css';
import Loader from '../loader/Loader';
import {
  getRecommendationAPIMethod,
  updateQuestionAPIMethod,
} from '../../api/question';

pdfjs.GlobalWorkerOptions.workerSrc =
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

function extractId(url) {
  return url.split('/').pop();
}

function buildProxyPdfUrl(dsldUrl) {
  const id = extractId(dsldUrl);
  return `http://localhost:3003/proxy/pdf/${id}`;
}

const Recommendation = () => {
  const [recList, setRecList]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);       // Grok fallback message
  const [meta, setMeta]             = useState(null);       // normalized query info
  const { questionId, age, description } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setError(null);

    getRecommendationAPIMethod(age, description)
      .then((response) => {
        // Handle no-match / error responses from backend
        if (!response.ok) {
          return response.json().then((errData) => {
            setError(errData.message || 'No supplements found for your search.');
            setLoading(false);
          });
        }
        return response.json();
      })
      .then((data) => {
        if (!data) return;

        // Save _meta info (normalized query, detected allergies)
        if (data._meta) setMeta(data._meta);

        // New backend returns { data: [...] } shape from Python split JSON
        // data.data is array of rows, data.columns is array of column names
        if (data.data && Array.isArray(data.data)) {
          setRecList(data.data.slice(0, 10));
        }
        // Legacy shape: { data: [...] } wrapped by your API method
        else if (data && Array.isArray(data)) {
          setRecList(data.slice(0, 10));
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch error:', err);
        setError('Something went wrong. Please try again.');
        setLoading(false);
      });
  }, [age, description]);

  const handleUpdateQuestion = () => {
    updateQuestionAPIMethod(questionId, { rec_list: recList })
      .then((response) => {
        if (!response.ok) console.log('Error saving recommendation.');
      })
      .catch((err) => console.error('Error saving recommendation:', err));
  };

  return (
    <div className="recommendation">
      <Navbar />

      <div
        className="to_mainpage"
        onClick={() => {
          handleUpdateQuestion();
          navigate('/mainpage');
        }}
      >
        <KeyboardBackspaceIcon />
        <div>Save & Exit</div>
      </div>

      <div className="recommendation_outer">

        {/* ── Loading state ─────────────────────────────────────────────── */}
        {loading && (
          <>
            <h1 className="loading_title">Collecting results...</h1>
            <p className="loading_subtext">(This may take up to 10 seconds)</p>
            <Loader />
          </>
        )}

        {/* ── Grok fallback: no match in dataset ───────────────────────── */}
        {!loading && error && (
          <div className="recommendation_fallback">
            <div className="fallback_icon">&#9432;</div>
            <h2>No exact matches found</h2>
            <p className="fallback_message">{error}</p>
            {meta?.normalizedQuery && (
              <p className="fallback_query">
                We searched for: <em>{meta.normalizedQuery}</em>
              </p>
            )}
            <button
              className="fallback_back_btn"
              onClick={() => navigate('/mainpage')}
            >
              Try a different search
            </button>
          </div>
        )}

        {/* ── Results ───────────────────────────────────────────────────── */}
        {!loading && !error && recList.length > 0 && (
          <>
            <h1>Recommendations ({recList.length})</h1>

            {/* Show what Grok translated the query to */}
            {meta?.normalizedQuery &&
              meta.normalizedQuery.toLowerCase() !== decodeURIComponent(description).toLowerCase() && (
              <p className="normalized_query_info">
                Showing results for: <em>{meta.normalizedQuery}</em>
              </p>
            )}

            {/* Show detected allergies */}
            {meta?.allergiesDetected?.length > 0 && (
              <p className="allergy_info">
                Allergy filters applied:{' '}
                {meta.allergiesDetected.map((a) => (
                  <span key={a} className="allergy_tag">{a}</span>
                ))}
              </p>
            )}

            <div className="recommendation_container">
              {recList.map((d, index) => (
                <div key={index} className="recommendation_inner">
                  <div className="recommendation_object">
                    <Document
                      file={buildProxyPdfUrl(d[0])}
                      loading={<div>Loading label...</div>}
                      error={<div>Unable to load label</div>}
                    >
                      <Page
                        pageNumber={1}
                        width={320}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </Document>
                  </div>

                  <div className="recommendation_object_bottom">
                    <h3>{d[2]}</h3>
                    <p className="maker">By {d[3]}</p>
                  </div>

                  <div className="recommendation_description">
                    {d[13]}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Empty result (no error, but empty array) ──────────────────── */}
        {!loading && !error && recList.length === 0 && (
          <div className="recommendation_fallback">
            <div className="fallback_icon">&#9432;</div>
            <h2>No supplements found</h2>
            <p className="fallback_message">
              We couldn't find any supplements matching your description in our database.
              Try rephrasing your health goal or consult a healthcare provider.
            </p>
            <button
              className="fallback_back_btn"
              onClick={() => navigate('/mainpage')}
            >
              Try a different search
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Recommendation;