import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    backgroundColor: '#ffffff',
    padding: '16px 0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    display: 'flex',
    alignItems: 'center'
  },
  logoImg: {
    height: '32px',
    width: '32px',
    marginRight: '12px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2563eb',
    margin: 0
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none'
  },
  mainContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 16px'
  },
  twoColumnLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 3fr)',
    gap: '24px'
  },
  sidebar: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '24px',
    position: 'sticky',
    top: '100px'
  },
  sidebarTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px'
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px'
  },
  infoLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: '4px'
  },
  infoValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '24px',
    overflow: 'hidden'
  },
  cardHeader: {
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#111827',
    margin: 0
  },
  cardBody: {
    padding: '24px'
  },
  assessmentBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px'
  },
  subTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '12px'
  },
  text: {
    fontSize: '16px',
    lineHeight: '1.5',
    color: '#374151',
    whiteSpace: 'pre-line'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px'
  },
  statBox: {
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  strengthsBox: {
    backgroundColor: '#ecfdf5',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '24px'
  },
  strengthsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#047857',
    marginBottom: '8px'
  },
  improvementsBox: {
    backgroundColor: '#fff7ed',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '24px'
  },
  improvementsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#b45309',
    marginBottom: '8px'
  },
  list: {
    paddingLeft: '24px',
    margin: '8px 0',
    color: '#374151'
  },
  scoreBadge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '14px',
    fontWeight: '500'
  },
  questionBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px'
  },
  boxLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: '8px'
  },
  feedbackBox: {
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px'
  },
  improvementBox: {
    backgroundColor: '#fff7ed',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px'
  },
  buttonsContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginTop: '32px'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    padding: '16px'
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    padding: '32px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center'
  },
  loadingCircle: {
    width: '96px',
    height: '96px',
    position: 'relative',
    margin: '0 auto 24px auto'
  }
};

const BodyLanguageAnalysis = ({ analysis }) => {
  if (!analysis?.bodyLanguage) return null;

  const scorePercentage = Math.round((analysis.bodyLanguage.score || 0) * 10);
  
  return (
    <div style={{
      backgroundColor: '#f3e8ff',
      borderRadius: '8px',
      padding: '24px',
      marginTop: '24px'
    }}>
      <h3 style={{
        fontSize: '20px',
        fontWeight: '600',
        color: '#7e22ce',
        marginTop: 0,
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7e22ce" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        Body Language Analysis
      </h3>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 2fr',
        gap: '24px',
        alignItems: 'center'
      }}>
        <div style={{
          width: '150px',
          height: '150px',
          margin: '0 auto'
        }}>
          <CircularProgressbar
            value={scorePercentage}
            text={`${scorePercentage}%`}
            styles={buildStyles({
              pathColor: '#7e22ce',
              textColor: '#7e22ce',
              trailColor: '#e9d5ff',
              textSize: '24px'
            })}
          />
          <p style={{
            textAlign: 'center',
            marginTop: '8px',
            color: '#7e22ce',
            fontWeight: '500'
          }}>
            Body Language Score
          </p>
        </div>
        
        <div>
          <p style={styles.text}>
            {analysis.bodyLanguage.summary || "No body language analysis available"}
          </p>
          
          {analysis.bodyLanguage.strengths?.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#7e22ce',
                marginBottom: '8px'
              }}>
                Strengths:
              </h4>
              <ul style={styles.list}>
                {analysis.bodyLanguage.strengths.map((strength, i) => (
                  <li key={`body-strength-${i}`}>{strength}</li>
                ))}
              </ul>
            </div>
          )}
          
          {analysis.bodyLanguage.improvements?.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#7e22ce',
                marginBottom: '8px'
              }}>
                Suggested Improvements:
              </h4>
              <ul style={styles.list}>
                {analysis.bodyLanguage.improvements.map((improvement, i) => (
                  <li key={`body-improvement-${i}`}>{improvement}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function InterviewAnalysis() {
  const location = useLocation();
  const navigate = useNavigate();
  const { interviewData } = location.state || {};
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!interviewData) {
      navigate('/user-dashboard');
      return;
    }

    const analyzeInterview = async () => {
      try {
        setIsLoading(true);
        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/analyze-interview`,
          {
            jobTitle: interviewData.jobTitle || "professional",
            questions: interviewData.questions,
            responses: interviewData.responses.map(response => ({
              questionText: response.questionText,
              userResponse: response.userResponse === "Submitted" 
                ? "No detailed response provided" 
                : response.userResponse
            })),
            movementAnalysis: interviewData.movementAnalysis || []
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } }
        );
        
        const transformedAnalysis = transformAnalysisData(response.data);
        setAnalysis(transformedAnalysis);
      } catch (err) {
        console.error("Analysis error:", err);
        setError(err.response?.data?.detail || err.message || "Failed to analyze interview");
      } finally {
        setIsLoading(false);
      }
    };

    analyzeInterview();
  }, [interviewData, navigate]);

  const transformAnalysisData = (apiData) => {
    if (!apiData) return null;
  
    // First try to extract strengths and improvements from the overall feedback
    let strongPoints = [];
    let improvementAreas = [];
    
    // Try to parse strengths and improvements from the overall feedback text
    if (apiData.overallFeedback) {
      const feedbackLower = apiData.overallFeedback.toLowerCase();
      
      // Look for strengths section
      const strengthsMatch = apiData.overallFeedback.match(/strengths?[:]?\s*(.*?)(?=\b(areas for improvement|weaknesses?|suggestions)\b)/is);
      if (strengthsMatch) {
        const strengthsText = strengthsMatch[1].trim();
      
        // Only include strengths if there's actual content (not just whitespace or empty lines)
        strongPoints = strengthsText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !/^[-•*]?$/.test(line)) // ignore lines with just bullet markers
          .map(line => line.replace(/^[-•*]\s*/, '')); // remove existing bullets
      }
      
      // Look for improvements section
      const improvementsMatch = apiData.overallFeedback.match(/(areas for improvement|weaknesses?|suggestions)[:]?\s*(.*)/is);
      if (improvementsMatch) {
        const improvementsText = improvementsMatch[2].trim();
        improvementAreas = improvementsText.split('\n')
          .filter(line => line.trim())
          .map(line => line.trim().replace(/^[-•*]\s*/, '')); // remove existing bullets
      }
    }
  
    // Fallback to direct fields if parsing didn't work
    if (strongPoints.length === 0 && Array.isArray(apiData.strongPoints)) {
      strongPoints = apiData.strongPoints.map(item => item.replace(/^[-•*]\s*/, '')); // Remove existing bullets
    }
    if (improvementAreas.length === 0 && Array.isArray(apiData.improvementAreas)) {
      improvementAreas = apiData.improvementAreas.map(item => item.replace(/^[-•*]\s*/, '')); // Remove existing bullets
    }
  
    // Final fallback if still no points found
    if (strongPoints.length === 0 && Array.isArray(apiData.questionAnalysis)) {
      strongPoints = apiData.questionAnalysis
        .filter(q => q.score && q.score >= 6)
        .map(q => `Handled well: "${q.questionText}"`);
    }
    
    if (strongPoints.length === 0) {
      strongPoints = ["No specific strengths identified in the analysis"];
    }
    
    if (improvementAreas.length === 0) {
      improvementAreas = ["No specific improvement areas identified in the analysis"];
    }
  
    // Calculate overall score
    const overallScore = apiData.overallScore || 
      (apiData.questionAnalysis?.length > 0)
        ? (apiData.questionAnalysis.reduce((sum, q) => sum + (q.score || 0), 0) / apiData.questionAnalysis.length).toFixed(1)
        : null;
  
    // Handle body language data
    const bodyLanguageData = apiData.bodyLanguageFeedback ? {
      score: typeof apiData.bodyLanguageFeedback === 'string' ? 
        (apiData.bodyLanguageFeedback.match(/score[:]?\s*(\d+)/i)?.[1] || 5) : 
        apiData.bodyLanguageFeedback.score || 5,
      summary: typeof apiData.bodyLanguageFeedback === 'string' && apiData.bodyLanguageFeedback.includes("no") 
        ? "No body language analysis available"
        : apiData.bodyLanguageFeedback.summary || "Moderate body language detected with room for improvement.",
      strengths: typeof apiData.bodyLanguageFeedback === 'string' ? 
        [] : 
        apiData.bodyLanguageFeedback.strengths || [],
      improvements: typeof apiData.bodyLanguageFeedback === 'string' ? 
        [] : 
        apiData.bodyLanguageFeedback.improvements || []
    } : null;
  
    return {
      ...apiData,
      overallScore,
      strongPoints: [...new Set(strongPoints)],
      improvementAreas: [...new Set(improvementAreas)],
      bodyLanguage: bodyLanguageData
    };
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingCircle}>
            <CircularProgressbar
              value={66}
              strokeWidth={8}
              styles={buildStyles({
                pathColor: '#2563eb',
                trailColor: '#e2e8f0'
              })}
            />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
            Analyzing Interview
          </h2>
          <p style={{ color: '#6b7280' }}>Processing your responses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...styles.loadingContainer, backgroundColor: '#fef2f2' }}>
        <div style={styles.loadingCard}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            backgroundColor: '#fee2e2', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 24px auto'
          }}>
            <i className="fas fa-exclamation-triangle" style={{ color: '#dc2626', fontSize: '24px' }}></i>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
            Analysis Failed
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>{error}</p>
          <button 
            onClick={() => navigate('/user-dashboard')}
            style={{ 
              backgroundColor: '#dc2626',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Use actual data if available, otherwise fall back to mock data
  const displayData = interviewData || {
    domainName: "ML",
    responses: [
      { 
        questionId: 1, 
        questionText: "Explain the difference between supervised and unsupervised learning.",
        userResponse: "Supervised has labels, unsupervised doesn't."
      },
      { 
        questionId: 2, 
        questionText: "What are activation functions and why are they important in neural networks?",
        userResponse: "They add non-linearity. ReLU is popular."
      }
    ]
  };

  const displayAnalysis = analysis || {
    overallFeedback: "This interview performance is extremely weak and indicates a significant lack of foundational knowledge in machine learning. The candidate demonstrates no understanding of basic ML concepts and responses are nonsensical. Immediate and substantial preparation is required before attempting another ML interview. Focusing on fundamental concepts, practicing clear and concise explanations, and working through practical examples are crucial.",
    overallScore: 3.5,
    strongPoints: ["• No specific strengths identified"],
    improvementAreas: [
      "• Study fundamental ML concepts thoroughly",
      "• Practice articulating technical concepts clearly",
      "• Prepare with practical examples",
      "• Develop deeper technical knowledge"
    ],
    questionAnalysis: [
      {
        score: 4,
        feedback: "The response is extremely brief and lacks depth. While it correctly identifies that labels are the key difference, it fails to explain what these learning paradigms actually do, their applications, or specific algorithms associated with each.",
        improvements: "Expand on what supervised and unsupervised learning actually do. For supervised learning, explain the training process using labeled data and give examples of algorithms (regression, classification). For unsupervised learning, explain the goal of finding hidden patterns and mention clustering or dimensionality reduction. Provide real-world examples of each."
      },
      {
        score: 3,
        feedback: "This answer is technically correct but severely lacking in detail. It identifies one function of activation functions (non-linearity) and names one type (ReLU), but doesn't explain how activation functions work, why non-linearity is important, or compare different types of activation functions.",
        improvements: "Define what activation functions are mathematically. Explain why non-linearity is crucial for neural networks to learn complex patterns. Compare multiple activation functions (Sigmoid, Tanh, ReLU, Leaky ReLU) with their advantages and disadvantages. Describe how activation function choice impacts training dynamics."
      }
    ],
    bodyLanguage: {
      score: 6,
      summary: "Candidate showed moderate engagement but could improve eye contact and posture.",
      strengths: ["• Generally good posture", "• Appropriate hand gestures"],
      improvements: ["• More consistent eye contact", "• Less fidgeting"]
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <h1 style={styles.title}>Interview Analysis</h1>
          </div>
          <button 
            style={styles.button}
            onClick={() => navigate('/user-dashboard')}
          >
            <i className="fas fa-home" style={{ marginRight: '8px' }}></i>
            Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.mainContent}>
        <div style={{ display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row', gap: '24px' }}>
          {/* Sidebar */}
          <div style={{ width: window.innerWidth < 768 ? '100%' : '25%' }}>
            <div style={styles.sidebar}>
              <h2 style={styles.sidebarTitle}>Interview Details</h2>
              <div>
                <div style={styles.infoBox}>
                  <p style={styles.infoLabel}>Domain</p>
                  <p style={styles.infoValue}>
                    {displayData.domainName || 'ML'}
                  </p>
                </div>
                <div style={styles.infoBox}>
                  <p style={styles.infoLabel}>Questions</p>
                  <p style={styles.infoValue}>
                    {displayData.responses?.length || 2}
                  </p>
                </div>
                <div style={styles.infoBox}>
                  <p style={styles.infoLabel}>Date</p>
                  <p style={styles.infoValue}>
                    {new Date().toLocaleDateString() || '4/20/2025'}
                  </p>
                </div>
              </div>
            </div>
          </div>
  
          {/* Main Analysis Content */}
          <div style={{ width: window.innerWidth < 768 ? '100%' : '75%' }}>
            {/* Overall Feedback Card */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Performance Overview</h2>
              </div>
              
              <div style={styles.cardBody}>
                <div style={styles.assessmentBox}>
                  <h3 style={styles.subTitle}>Overall Assessment</h3>
                  <p style={styles.text}>
                    {displayAnalysis.overallFeedback}
                  </p>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr',
                    gap: '16px', 
                    marginTop: '24px' 
                  }}>
                    {displayAnalysis.strongPoints?.length > 0 && (
                      <div style={styles.strengthsBox}>
                        <h4 style={styles.strengthsTitle}>Strengths:</h4>
                        <ul style={styles.list}>
                  {displayAnalysis.strongPoints.map((point, i) => (
                    <li key={`strength-${i}`}>{point}</li> // Removed the manual bullet here
                  ))}
                </ul>
                      </div>
                    )}
                    
                    {displayAnalysis.improvementAreas?.length > 0 && (
                      <div style={styles.improvementsBox}>
                        <h4 style={styles.improvementsTitle}>Areas for Improvement:</h4>
                        <ul style={styles.list}>
                          {displayAnalysis.improvementAreas.map((area, i) => (
                            <li key={`improvement-${i}`}>{area}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                
                <BodyLanguageAnalysis analysis={displayAnalysis} />

                <div style={styles.statsGrid}>
                  <div style={styles.statBox}>
                    <div style={styles.statValue}>
                      {displayAnalysis.overallScore ? `${displayAnalysis.overallScore}/10` : 'N/A'}
                    </div>
                    <p style={styles.statLabel}>Overall Score</p>
                  </div>
                  <div style={{ ...styles.statBox, backgroundColor: '#ecfdf5' }}>
                    <div style={{ ...styles.statValue, color: '#047857' }}>
                      {displayAnalysis.strongPoints?.length || 0}
                    </div>
                    <p style={styles.statLabel}>Strong Points</p>
                  </div>
                  <div style={{ ...styles.statBox, backgroundColor: '#f3e8ff' }}>
                    <div style={{ ...styles.statValue, color: '#7e22ce' }}>
                      {displayAnalysis.bodyLanguage?.score ? `${displayAnalysis.bodyLanguage.score}/10` : 'N/A'}
                    </div>
                    <p style={styles.statLabel}>Body Language</p>
                  </div>
                </div>
              </div>
            </div>
  
            {/* Question Analysis */}
            {displayData.responses.map((response, index) => {
              const questionAnalysis = displayAnalysis.questionAnalysis?.[index] || {};
              
              return (
                <div key={`question-${response.questionId || index}`} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                      Question {index + 1}
                    </h3>
                    {questionAnalysis.score && (
                      <span style={styles.scoreBadge}>
                        Score: {questionAnalysis.score}/10
                      </span>
                    )}
                  </div>

                  <div style={styles.cardBody}>
                    <div style={styles.questionBox}>
                      <h4 style={styles.boxLabel}>Question</h4>
                      <p style={styles.text}>
                        {response.questionText || 'No question text available'}
                      </p>
                    </div>

                    <div style={styles.questionBox}>
                      <h4 style={styles.boxLabel}>Your Response</h4>
                      <p style={styles.text}>
                        {response.userResponse || "No response provided"}
                      </p>
                    </div>

                    <div style={styles.feedbackBox}>
                      <h4 style={styles.boxLabel}>Feedback</h4>
                      <p style={styles.text}>
                        {questionAnalysis.feedback || "No feedback available"}
                      </p>
                    </div>

                    {questionAnalysis.improvements && (
                      <div style={styles.improvementBox}>
                        <h4 style={styles.boxLabel}>
                          Improvement Suggestions
                        </h4>
                        <p style={styles.text}>
                          {questionAnalysis.improvements}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
  
            {/* Actions */}
            <div style={styles.buttonsContainer}>
              <button
                onClick={() => window.print()}
                style={{ 
                  ...styles.button, 
                  ...styles.primaryButton,
                  padding: '12px 24px',
                  fontSize: '16px'
                }}
              >
                <i className="fas fa-download" style={{ marginRight: '8px' }}></i>
                Download Report
              </button>
              <button
                onClick={() => navigate('/user-dashboard')}
                style={{ 
                  ...styles.button,
                  padding: '12px 24px',
                  fontSize: '16px'
                }}
              >
                <i className="fas fa-home" style={{ marginRight: '8px' }}></i>
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default InterviewAnalysis;