import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from "react-redux";
import Question from './Question';
import './question.css';
import { createQuestionAPIMethod } from "../../api/question";
import Lottie from "lottie-react";
import landingData1 from "../../assets/Lottie/ProcessIndicator.json";
import Loader from '../loader/Loader';
import Navbar from '../navbar/Navbar';

// Question definitions
// Indices: 0=Country, 1=Sex, 2=Age, 3=Allergies, 4=Description
const questions = [
    {
        question: 'Which country are you in?',
        questionType: 'country',
        hint: 'We\'ll tailor supplement recommendations to brands available in your region.',
    },
    {
        question: 'What is your biological sex?',
        questionType: 'options1',
        options: ['Male', 'Female', 'Other'],
        hint: 'This helps us factor in sex-specific nutritional needs.',
    },
    {
        question: 'Which age group describes you?',
        questionType: 'options2',
        options: [
            'I am older than 6 years old.',
            'I am filling this out for a child younger than 6 years old.'
        ],
    },
    {
        question: 'Do you have any allergies or dietary restrictions?',
        questionType: 'text',
        hint: 'E.g. dairy, gluten, peanuts, shellfish. We\'ll exclude products with these ingredients.',
    },
    {
        question: 'What are your health goals or concerns?',
        questionType: 'text',
        hint: 'Describe in your own words — e.g. "I want more energy", "joint pain", "better sleep", "build muscle".',
    },
];

const TOTAL = questions.length;

const Form = () => {
    const [currentPage, setCurrentPage] = useState(0);
    const [answers, setAnswers] = useState([]);
    const navigate = useNavigate();
    const [submitLoading, setSubmitLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [loadingAnimation, setLoadingAnimation] = useState(false);
    const { userId } = useParams();
    const authUserId = useSelector((state) => state.user.id);

    const lottieStyle = { height: 46, width: 46 };

    useEffect(() => {
        if (userId !== authUserId) navigate("/");
    }, []);

    const handleNextQuestion = (answer) => {
        setAnswers([...answers, answer]);
        setCurrentPage(currentPage + 1);
    };

    const handleSubmit = async () => {
        setSubmitLoading(true);
        setErrorMessage(null);

        // answers[0]=country, [1]=gender, [2]=age, [3]=allergies, [4]=description
        const country    = answers[0] || 'USA';
        const gender     = answers[1] || '';
        const ageAnswer  = answers[2];
        const allergies  = answers[3] || '';
        const description = answers[4] || '';

        const isAdult = ageAnswer === questions[2].options[0];

        const question = {
            country,
            gender,
            age: isAdult,
            allergies,
            description,
            user_id: authUserId,
        };

        try {
            const response = await createQuestionAPIMethod(question);
            const data = await response.json();
            setLoadingAnimation(true);
            navigate(`/recommendation/${data._id}/${isAdult}/${encodeURIComponent(description)}?country=${encodeURIComponent(country)}`);
        } catch (err) {
            console.error("Submission error:", err);
            setErrorMessage("Something went wrong. Please try again.");
            setSubmitLoading(false);
        }
    };

    const progress = Math.round((currentPage / TOTAL) * 100);

    const formatAnswer = (answer, idx) => {
        if (!answer) return '(not provided)';
        if (idx === 0) {
            const flags = { India: '🇮🇳', USA: '🇺🇸', Other: '🌐' };
            return `${flags[answer] || ''} ${answer}`;
        }
        return answer;
    };

    return (
        <div className="Form">
            <Navbar />

            {/* Progress bar */}
            {currentPage < TOTAL && (
                <div className="form_progress_wrapper">
                    <div className="form_progress_inner">
                        <div className="form_progress_text">
                            <span>Step {currentPage + 1} of {TOTAL}</span>
                            <span>{progress}% complete</span>
                        </div>
                        <div className="form_progress_bar_track">
                            <div
                                className="form_progress_bar_fill"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {loadingAnimation && <Loader />}

            {currentPage < TOTAL ? (
                <Question
                    question={questions[currentPage].question}
                    questionType={questions[currentPage].questionType}
                    options={questions[currentPage].options}
                    hint={questions[currentPage].hint}
                    onNextQuestion={handleNextQuestion}
                    answers={answers}
                    currentPage={currentPage}
                />
            ) : (
                <div className='review-container'>
                    <div className='review_card'>
                        {loadingAnimation ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <h1 className="loading_title">Finding your supplements...</h1>
                                <p className="loading_subtext">This may take up to 15 seconds</p>
                            </div>
                        ) : (
                            <>
                                <h1>Review your answers</h1>
                                <ul className='review_list'>
                                    {answers.map((answer, index) => (
                                        <li key={index} className='review_item'>
                                            <div className='review_item_q'>{questions[index].question}</div>
                                            <div className='review_item_a'>{formatAnswer(answer, index)}</div>
                                        </li>
                                    ))}
                                </ul>

                                {errorMessage && (
                                    <div className="pwd_err" style={{ marginBottom: '1rem' }}>
                                        {errorMessage}
                                    </div>
                                )}

                                <div className='review_actions'>
                                    {submitLoading ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                            <Lottie animationData={landingData1} style={lottieStyle} />
                                        </div>
                                    ) : (
                                        <>
                                            <button className='review_submit_btn' onClick={handleSubmit}>
                                                Get My Recommendations →
                                            </button>
                                            <button
                                                className='review_edit_btn'
                                                onClick={() => { setCurrentPage(0); setAnswers([]); }}
                                            >
                                                Start Over
                                            </button>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Form;
