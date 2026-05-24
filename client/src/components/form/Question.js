import React, { useState } from 'react';
import './question.css';
import TextField from '@mui/material/TextField';
import boy from "../../assets/images/boy.svg";
import man from "../../assets/images/man.svg";
import woman from "../../assets/images/woman.svg";
import girl from "../../assets/images/girl.svg";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const COUNTRY_OPTIONS = [
    { id: 'India', label: 'India', flag: '🇮🇳', sub: 'Ayurvedic & Indian brands' },
    { id: 'USA', label: 'United States', flag: '🇺🇸', sub: 'NIH-certified supplements' },
    { id: 'Other', label: 'Other', flag: '🌐', sub: 'Global recommendations' },
];

const Question = ({ question, questionType, options, onNextQuestion, answers, currentPage, hint }) => {
    const [answer, setAnswer] = useState('');
    const [selectedOption, setSelectedOption] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    const handleNextQuestion = () => {
        if (questionType === 'text') {
            setErrorMessage(null);
            onNextQuestion(answer);
            setAnswer('');
        } else {
            if (selectedOption == null) {
                setErrorMessage("Please select an option to continue.");
                return;
            }
            setErrorMessage(null);
            onNextQuestion(answer);
            setAnswer('');
            setSelectedOption(null);
        }
    };

    const clickOption = (option) => {
        setSelectedOption(option);
        setAnswer(option);
        setErrorMessage(null);
    };

    const handleSkip = () => {
        onNextQuestion('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && questionType === 'text') {
            handleNextQuestion();
        }
    };

    return (
        <div className="question-page">
            <h1>{question}</h1>

            {/* Hint */}
            {hint && (
                <div className="question_hint">
                    <InfoOutlinedIcon style={{ fontSize: 16, color: 'var(--primary)', flexShrink: 0, marginTop: 1 }} />
                    {hint}
                </div>
            )}

            {/* options1: Sex */}
            {questionType === 'options1' && (
                <div>
                    <div className="options-container">
                        <div
                            className={`option ${selectedOption === options[0] ? 'selected' : ''}`}
                            onClick={() => clickOption(options[0])}
                        >
                            <img id='man' src={man} alt="Male" />
                            {options[0]}
                        </div>
                        <div
                            className={`option ${selectedOption === options[1] ? 'selected' : ''}`}
                            onClick={() => clickOption(options[1])}
                        >
                            <img id='woman' src={woman} alt="Female" />
                            {options[1]}
                        </div>
                    </div>
                    <div
                        className={`other ${selectedOption === 'Other' ? 'selected' : ''}`}
                        onClick={() => clickOption("Other")}
                    >
                        Other / Prefer not to say
                    </div>
                </div>
            )}

            {/* options2: Age */}
            {questionType === 'options2' && (
                <div className="options-container">
                    <div
                        className={`option ${selectedOption === options[0] ? 'selected' : ''}`}
                        onClick={() => clickOption(options[0])}
                    >
                        <img id={answers[0] === "Male" ? "man" : "woman"} src={answers[0] === "Male" ? man : woman} alt="Adult" />
                        {options[0]}
                    </div>
                    <div
                        className={`option ${selectedOption === options[1] ? 'selected' : ''}`}
                        onClick={() => clickOption(options[1])}
                    >
                        <img id={answers[0] === "Male" ? "boy" : "girl"} src={answers[0] === "Male" ? boy : girl} alt="Child" />
                        {options[1]}
                    </div>
                </div>
            )}

            {/* country: Country selection */}
            {questionType === 'country' && (
                <div className="country-options">
                    {COUNTRY_OPTIONS.map((c) => (
                        <div
                            key={c.id}
                            className={`country-option ${selectedOption === c.id ? 'selected' : ''}`}
                            onClick={() => clickOption(c.id)}
                        >
                            <span className="country-option-flag">{c.flag}</span>
                            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{c.label}</span>
                            <span style={{ fontSize: '0.75rem', color: selectedOption === c.id ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: 500 }}>
                                {c.sub}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* text: Free text */}
            {questionType === 'text' && (
                <div className="question_text_input">
                    <TextField
                        multiline
                        rows={answer.length > 80 ? 4 : 2}
                        variant="outlined"
                        label="Your answer"
                        value={answer}
                        onChange={(e) => { setAnswer(e.target.value); setErrorMessage(null); }}
                        onKeyDown={handleKeyDown}
                        fullWidth
                        autoComplete='off'
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                fontSize: '0.9375rem',
                            }
                        }}
                    />
                </div>
            )}

            {/* Bottom controls */}
            <div className="questions-bottom">
                {errorMessage && (
                    <div className="pwd_err">{errorMessage}</div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                        className="question_next_btn"
                        onClick={handleNextQuestion}
                    >
                        Continue →
                    </button>

                    {questionType === 'text' && (
                        <button className="question_skip_btn" onClick={handleSkip}>
                            Skip this question
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Question;
