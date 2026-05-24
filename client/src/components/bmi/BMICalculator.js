import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../navbar/Navbar';
import './bmi.css';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalculateIcon from '@mui/icons-material/Calculate';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const BMI_CATEGORIES = [
  { range: [0, 18.5],   label: 'Underweight', color: '#3B82F6', tip: 'Consider calorie-dense supplements and protein support.' },
  { range: [18.5, 25],  label: 'Normal Weight', color: '#10B981', tip: 'Maintain your health with a balanced multivitamin and Omega-3.' },
  { range: [25, 30],    label: 'Overweight', color: '#F59E0B', tip: 'Metabolic support, green tea extract, and fiber supplements may help.' },
  { range: [30, 35],    label: 'Obese Class I', color: '#F97316', tip: 'Consult a healthcare provider. Chromium, CoQ10, and magnesium may support metabolism.' },
  { range: [35, 100],   label: 'Obese Class II+', color: '#EF4444', tip: 'Medical guidance recommended. Focus on vitamin D, B12, and iron levels.' },
];

const SUPPLEMENT_SUGGESTIONS = {
  'Underweight': {
    usa:   ['Build muscle', 'Protein supplement', 'Vitamin B12 deficiency', 'Zinc deficiency'],
    india: ['Build muscle', 'Improve energy', 'Weight gain protein'],
  },
  'Normal Weight': {
    usa:   ['Immune support', 'Omega-3 fatty acids', 'Multivitamin', 'Antioxidant'],
    india: ['Immune boost', 'General wellness', 'Energy boost'],
  },
  'Overweight': {
    usa:   ['Metabolic support', 'Weight management', 'Blood sugar support', 'Digestive health'],
    india: ['Weight management', 'Digestive health', 'Metabolism boost'],
  },
  'Obese Class I': {
    usa:   ['Blood sugar support', 'Cardiovascular health', 'Weight management'],
    india: ['Blood sugar control', 'Heart health', 'Weight management'],
  },
  'Obese Class II+': {
    usa:   ['Cardiovascular health', 'Vitamin D deficiency', 'Joint support'],
    india: ['Heart health', 'Vitamin D', 'Joint pain'],
  },
};

const getBMICategory = (bmi) =>
  BMI_CATEGORIES.find(c => bmi >= c.range[0] && bmi < c.range[1]) || BMI_CATEGORIES[4];

const BMICalculator = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ weight: '', height: '', age: '', gender: 'Male', unit: 'metric' });
  const [result, setResult] = useState(null);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const calculate = (e) => {
    e.preventDefault();
    let weightKg = parseFloat(form.weight);
    let heightM;

    if (form.unit === 'metric') {
      heightM = parseFloat(form.height) / 100;
    } else {
      // Imperial: weight in lbs, height in inches
      weightKg = weightKg * 0.453592;
      heightM = parseFloat(form.height) * 0.0254;
    }

    if (!weightKg || !heightM || heightM <= 0) return;
    const bmi = weightKg / (heightM * heightM);
    const category = getBMICategory(bmi);
    setResult({ bmi: bmi.toFixed(1), ...category });
  };

  const getBarWidth = (bmi) => {
    const clamped = Math.min(Math.max(parseFloat(bmi), 10), 45);
    return ((clamped - 10) / 35) * 100;
  };

  return (
    <div className="bmi_page">
      <Navbar />
      <div className="bmi_hero">
        <div className="bmi_hero_inner">
          <button className="bmi_back_btn" onClick={() => navigate('/mainpage')}>
            <ArrowBackIcon style={{ fontSize: 18 }} /> Dashboard
          </button>
          <div className="bmi_hero_badge">
            <CalculateIcon style={{ fontSize: 16 }} />
            Health Tool
          </div>
          <h1 className="bmi_hero_title">BMI Calculator</h1>
          <p className="bmi_hero_sub">
            Calculate your Body Mass Index and get personalized supplement suggestions tailored to your health needs.
          </p>
        </div>
      </div>

      <div className="bmi_body">
        <div className="bmi_layout">
          {/* Calculator form */}
          <div className="bmi_form_card">
            <h2 className="bmi_card_title">Enter Your Details</h2>

            {/* Unit toggle */}
            <div className="bmi_unit_toggle">
              <button
                className={`unit_btn ${form.unit === 'metric' ? 'active' : ''}`}
                onClick={() => setForm(p => ({ ...p, unit: 'metric' }))}
                type="button"
              >
                Metric (kg/cm)
              </button>
              <button
                className={`unit_btn ${form.unit === 'imperial' ? 'active' : ''}`}
                onClick={() => setForm(p => ({ ...p, unit: 'imperial' }))}
                type="button"
              >
                Imperial (lbs/in)
              </button>
            </div>

            <form onSubmit={calculate} className="bmi_form">
              <div className="bmi_form_row">
                <div className="bmi_field">
                  <label className="form_label">
                    Weight ({form.unit === 'metric' ? 'kg' : 'lbs'})
                  </label>
                  <input
                    className="bmi_input"
                    type="number"
                    name="weight"
                    value={form.weight}
                    onChange={handleChange}
                    placeholder={form.unit === 'metric' ? 'e.g. 70' : 'e.g. 154'}
                    min="1" step="0.1" required
                  />
                </div>
                <div className="bmi_field">
                  <label className="form_label">
                    Height ({form.unit === 'metric' ? 'cm' : 'inches'})
                  </label>
                  <input
                    className="bmi_input"
                    type="number"
                    name="height"
                    value={form.height}
                    onChange={handleChange}
                    placeholder={form.unit === 'metric' ? 'e.g. 170' : 'e.g. 67'}
                    min="1" step="0.1" required
                  />
                </div>
              </div>

              <div className="bmi_form_row">
                <div className="bmi_field">
                  <label className="form_label">Age</label>
                  <input
                    className="bmi_input"
                    type="number"
                    name="age"
                    value={form.age}
                    onChange={handleChange}
                    placeholder="e.g. 25"
                    min="5" max="120"
                  />
                </div>
                <div className="bmi_field">
                  <label className="form_label">Gender</label>
                  <div className="bmi_gender_toggle">
                    {['Male', 'Female'].map(g => (
                      <button
                        key={g}
                        type="button"
                        className={`gender_btn ${form.gender === g ? 'active' : ''}`}
                        onClick={() => setForm(p => ({ ...p, gender: g }))}
                      >
                        {g === 'Male' ? '♂' : '♀'} {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button type="submit" className="bmi_calculate_btn">
                Calculate BMI
                <CalculateIcon style={{ fontSize: 18 }} />
              </button>
            </form>
          </div>

          {/* Result panel */}
          {result && (
            <div className="bmi_result_card">
              <h2 className="bmi_card_title">Your BMI Result</h2>

              {/* Big BMI number */}
              <div className="bmi_number_wrap">
                <div className="bmi_big_number" style={{ color: result.color }}>{result.bmi}</div>
                <div className="bmi_category_label" style={{ background: result.color + '22', color: result.color }}>
                  {result.label}
                </div>
              </div>

              {/* Scale bar */}
              <div className="bmi_scale">
                <div className="bmi_scale_bar">
                  <div className="bmi_scale_fill" style={{
                    width: `${getBarWidth(result.bmi)}%`,
                    background: result.color
                  }} />
                </div>
                <div className="bmi_scale_labels">
                  <span>Underweight</span>
                  <span>Normal</span>
                  <span>Overweight</span>
                  <span>Obese</span>
                </div>
              </div>

              {/* Tip */}
              <div className="bmi_tip">
                <span style={{ fontSize: '1.25rem' }}>💡</span>
                {result.tip}
              </div>

              {/* Supplement suggestions */}
              <div className="bmi_suggestions">
                <h3>Try searching for:</h3>
                <div className="bmi_suggestion_tags">
                  {(SUPPLEMENT_SUGGESTIONS[result.label]?.india || []).map((s, i) => (
                    <button
                      key={i}
                      className="bmi_suggestion_tag"
                      onClick={() => navigate(`/form/${localStorage.getItem('userId')}`)}
                    >
                      {s} <ArrowForwardIcon style={{ fontSize: 14 }} />
                    </button>
                  ))}
                </div>
                <p className="bmi_disclaimer">
                  ⚕️ BMI is a screening tool, not a medical diagnosis. Always consult a healthcare provider for personalised advice.
                </p>
              </div>
            </div>
          )}

          {/* Reference table */}
          {!result && (
            <div className="bmi_reference_card">
              <h2 className="bmi_card_title">BMI Reference Chart</h2>
              <div className="bmi_ref_table">
                {BMI_CATEGORIES.map((c, i) => (
                  <div key={i} className="bmi_ref_row">
                    <div className="bmi_ref_dot" style={{ background: c.color }} />
                    <div className="bmi_ref_range">{c.range[0]} – {c.range[1] === 100 ? '40+' : c.range[1]}</div>
                    <div className="bmi_ref_label" style={{ color: c.color }}>{c.label}</div>
                  </div>
                ))}
              </div>
              <div className="bmi_health_tips">
                <h3>Quick Health Tips</h3>
                <ul>
                  <li>Stay hydrated — drink 8+ glasses of water daily</li>
                  <li>Aim for 150 min of moderate exercise per week</li>
                  <li>A balanced diet reduces supplement dependency</li>
                  <li>Vitamin D deficiency is common — get sun exposure</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BMICalculator;
