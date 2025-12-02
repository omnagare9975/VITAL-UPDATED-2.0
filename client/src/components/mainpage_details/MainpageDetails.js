import React, { useEffect, useState } from 'react';
import Navbar from '../navbar/Navbar';
import './mainpagedetails.css';
import { useParams } from 'react-router-dom';
import { getQuestionById } from '../../api/question';

function extractId(url) {
  return url.split('/').pop();
}

function buildProxyPdfUrl(originalUrl) {
  const id = extractId(originalUrl);
  return `http://localhost:3003/proxy/pdf/${id}`;
}

const MainpageDetails = () => {
  const { postId } = useParams();
  const [question, setQuestion] = useState(null);

  useEffect(() => {
    getQuestionById(postId)
      .then(res => res.json())
      .then(data => {
        console.log('getQuestionById data:', data);
        setQuestion(data);
      })
      .catch(err => console.error('Error loading question:', err));
  }, [postId]);

  const recs = question?.rec_list || [];

  return (
    <div className="mainpage_details">
      <Navbar />

      {!question && (
        <p style={{ padding: '20px' }}>Loading recommendations...</p>
      )}

      {question && (
        <>
          <div className="mainpage_details_top">
            <h1>Recommendations ({recs.length})</h1>
          </div>

          {recs.length === 0 ? (
            <p style={{ padding: '20px' }}>
              This question does not have any saved recommendations yet.
            </p>
          ) : (
            <div className="mainpage_details_container">
              {recs.map((d, idx) => (
                <div key={idx} className="mainpage_details_inner">
                  <div className="mainpage_details_object">
                    <embed
                      src={buildProxyPdfUrl(d[0])}
                      type="application/pdf"
                      width="100%"
                      height="100%"
                    />
                  </div>
                  <div className="mainpage_details_object_bottom">
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
  );
};

export default MainpageDetails;
