import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';

import Navbar from '../navbar/Navbar';
import './recommendation.css';
import Loader from '../loader/Loader';

import { getRecommendationAPIMethod, updateQuestionAPIMethod } from '../../api/question';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Helper function to extract the ID from a URL like https://dsld.od.nih.gov/label/18351
function extractId(url) {
  return url.split('/').pop();
}

const Recommendation = () => {
  const [recommendation, setRecommendation] = useState(null);
  const [recList, setRecList] = useState([]); // Top 10 recommendations
  const { questionId, age, description } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    getRecommendationAPIMethod(age, description)
      .then((response) => response.json())
      .then((data) => {
        setRecommendation(data);
        if (data !== null && data.data !== undefined) {
          setRecList(data.data.slice(0, 10));
        }
      });
  }, []);

  const handleUpdateQuestion = () => {
    const rec_list = { rec_list: recList };
    updateQuestionAPIMethod(questionId, rec_list)
      .then((response) => {
        if (response.ok) {
          console.log('Recommendation record has been saved.');
        } else {
          console.log('Error saving recommendation.');
        }
      })
      .catch((err) => {
        console.error('Error when saving recommendation:', err);
      });
  };

  return (
    <div className='recommendation'>
      <Navbar />
      <div className='to_mainpage' onClick={() => { handleUpdateQuestion(); navigate('/mainpage'); }}>
        <KeyboardBackspaceIcon />
        <div>Save & Exit</div>
      </div>

      <div className='recommendation_outer'>
        {recList.length === 0 ? (
          <>
            <h1 className='loading_title'>Collecting results...</h1>
            <p className='loading_subtext'>(This may take up to 10 seconds)</p>
            <Loader />
          </>
        ) : (
          <>
            <h1>Recommendations ({recList.length})</h1>
            <div className='recommendation_container'>
              {recList.map((d, index) => (
                <div key={index} className='recommendation_inner'>
                  <div className='recommendation_object'>
                    <Document
                      file={`http://localhost:3003/proxy/pdf/${extractId(d[0])}`}
                      loading={<div>Loading PDF...</div>}
                      error={<div>Error loading PDF</div>}
                    >
                      <Page pageNumber={1} width={250} />
                    </Document>
                  </div>

                  <div className='recommendation_object_bottom'>
                    <h3>{d[2]}</h3>
                    <div className='recommendation_object_bottom_bottom'>
                      <p className='maker'>By {d[3]}</p>
                      <div className='hover_over'>Hover over me!</div>
                      <div className='hidden_div'>{d[13]}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Recommendation;
