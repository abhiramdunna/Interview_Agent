import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

function InterviewWindow() {
  const { domainId, adminId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userResponse, setUserResponse] = useState('');
  const [mediaStream, setMediaStream] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [testLog, setTestLog] = useState([]);
  const videoRef = useRef(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSavedResponse, setLastSavedResponse] = useState('');
  const [wasForcedTimeout, setWasForcedTimeout] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { domainName, adminName } = location.state || {};
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);
  const [userResponses, setUserResponses] = useState(Array(questions.length).fill(''));
  const [timeoutQuestionIndex, setTimeoutQuestionIndex] = useState(null);
  const [showBackModal, setShowBackModal] = useState(false);
  const [permissionsStatus, setPermissionsStatus] = useState({
    camera: false,
    microphone: false
  });
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [allPermissionsGranted, setAllPermissionsGranted] = useState(false);
  const textAreaRef = useRef(null);
  const [movementLog, setMovementLog] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const movementInterval = useRef(null);

  // Media permissions and stream handling
  // Media permissions and stream handling

  const styles = {
    '@keyframes pulseWarning': {
      '0%': { opacity: 1 },
      '50%': { opacity: 0.5 },
      '100%': { opacity: 1 }
    }
  };
  
  // Add after other useEffect hooks
// Update the auto-save useEffect

useEffect(() => {
  if (interviewStarted && mediaStream && videoRef.current) {
    const startMovementTracking = () => {
      setIsTracking(true);
      let previousPosition = null;
      
      movementInterval.current = setInterval(() => {
        if (videoRef.current) {
          const video = videoRef.current;
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Simple motion detection (can be enhanced)
          const currentPosition = {
            timestamp: new Date().toISOString(),
            motion: Math.random() > 0.7 ? 'significant' : 'minimal' // Placeholder - replace with real detection
          };
          
          if (previousPosition && currentPosition.motion !== previousPosition.motion) {
            setMovementLog(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              movement: currentPosition.motion,
              message: `User movement changed to ${currentPosition.motion}`
            }]);
          }
          previousPosition = currentPosition;
        }
      }, 5000); // Check every 5 seconds
    };

    startMovementTracking();
  }

  return () => {
    if (movementInterval.current) {
      clearInterval(movementInterval.current);
    }
  };
}, [interviewStarted, mediaStream]);


useEffect(() => {
  if (autoSaveEnabled && interviewStarted) {
    const autoSaveInterval = setInterval(() => {
      const currentResponse = userResponse.trim();
      if (currentResponse && currentResponse !== lastSavedResponse) {
        // Update responses array with current response
        const updatedResponses = [...userResponses];
        updatedResponses[currentQuestionIndex] = currentResponse;
        setUserResponses(updatedResponses);
        setLastSavedResponse(currentResponse);
        
        // Optional: Show temporary save indication
        setMessage({
          text: "Response auto-saved",
          type: "info"
        });
        
        // Clear the message after 2 seconds
        setTimeout(() => setMessage({ text: "", type: "" }), 2000);
      }
    }, 5000); // Changed to 5 seconds for more frequent saves

    // Also save immediately when typing stops
    const immediateAutoSave = setTimeout(() => {
      const currentResponse = userResponse.trim();
      if (currentResponse && currentResponse !== lastSavedResponse) {
        const updatedResponses = [...userResponses];
        updatedResponses[currentQuestionIndex] = currentResponse;
        setUserResponses(updatedResponses);
        setLastSavedResponse(currentResponse);
      }
    }, 1000);

    return () => {
      clearInterval(autoSaveInterval);
      clearTimeout(immediateAutoSave);
    };
  }
}, [userResponse, currentQuestionIndex, lastSavedResponse, autoSaveEnabled, interviewStarted]);



  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }, 
          audio: true 
        });
        
        setMediaStream(stream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          
          // Wait for metadata to be loaded before playing
          await new Promise((resolve) => {
            videoRef.current.onloadedmetadata = () => {
              resolve();
            };
          });
          
          // Explicitly play the video
          try {
            await videoRef.current.play();
            console.log("Video playing successfully");
          } catch (playError) {
            console.error("Error playing video:", playError);
          }
        }
        
        setPermissionsStatus({
          camera: true,
          microphone: true
        });
        setAllPermissionsGranted(true);
        
      } catch (err) {
        console.error("Error accessing media devices:", err);
        setMessage({ 
          text: `Permission denied: ${err.message}. Please allow camera and microphone access.`, 
          type: "error" 
        });
        setPermissionsStatus({
          camera: false,
          microphone: false
        });
      }
    };
  
    if (interviewStarted) {
      checkPermissions();
    }
  
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
          track.stop();
        });
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setMediaStream(null);
      }
    };
  }, [interviewStarted]);

  // Replace the existing navigation prevention useEffect hooks with this single one:
useEffect(() => {
  if (!interviewStarted) return;

  // Block browser navigation
  const blockNavigation = (e) => {
    e.preventDefault();
    e.returnValue = 'Are you sure you want to leave? Your interview progress will be lost.';
    return e.returnValue;
  };

  // Add beforeunload listener
  window.addEventListener('beforeunload', blockNavigation);

  // Modify history to prevent back navigation
  window.history.pushState(null, '', window.location.pathname);
  
  const handlePopState = () => {
    setShowBackModal(true); // Show custom modal
    window.history.pushState(null, '', window.location.pathname); // Prevent back nav
  };
  

  // Add popstate listener
  window.addEventListener('popstate', handlePopState);

  return () => {
    window.removeEventListener('beforeunload', blockNavigation);
    window.removeEventListener('popstate', handlePopState);
  };
}, [interviewStarted, mediaStream, navigate]);

  // Prevent leaving during interview
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (interviewStarted) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your interview progress will be lost.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [interviewStarted]);

  // Track user activity
  useEffect(() => {
    if (interviewStarted) {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          setTestLog(prev => [...prev, `User left the window at ${new Date().toLocaleTimeString()}`]);
        }
      };

      const handleBlur = () => {
        setTestLog(prev => [...prev, `User switched tabs at ${new Date().toLocaleTimeString()}`]);
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleBlur);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleBlur);
      };
    }
  }, [interviewStarted]);

  // Timer effect
  // Timer effect (around line 93)
  useEffect(() => {
    if (interviewStarted && questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQuestion = questions[currentQuestionIndex];
      const questionTimeLimit = currentQuestion.timeLimit || 60;
      
      setTimeLeft(questionTimeLimit);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
  
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [currentQuestionIndex, questions, interviewStarted]);
  
  

  const handleBackButton = () => {
  if (!interviewStarted) {
    navigate('/user-dashboard', { replace: true });
    return;
  }

  if (window.confirm("Are you sure you want to leave the interview? Your progress will be lost.")) {
    // Stop media tracks before navigating
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    navigate('/user-dashboard', { replace: true });
  }
};

  const startInterview = () => {
    if (allPermissionsGranted) {
      setInterviewStarted(true);
      setMessage({ text: "", type: "" }); // Clear the message when starting
      setTestLog(prev => [...prev, `Interview started at ${new Date().toLocaleTimeString()}`]);
    } else {
      setMessage({ text: "Please grant all permissions before starting.", type: "error" });
    }
  };

  const endInterview = () => {
    if (window.confirm("Are you sure you want to end this interview? Your responses will be analyzed.")) {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }
      if (movementInterval.current) {
        clearInterval(movementInterval.current);
      }
  
      const allResponses = [...userResponses];
      if (currentQuestionIndex < questions.length) {
        allResponses[currentQuestionIndex] = userResponse.trim() || "No response provided";
      }
  
      const interviewData = {
        jobTitle: domainName,
        domainName,
        adminName,
        questions: questions.map(q => ({ 
          id: q.id, 
          text: q.text 
        })),
        responses: questions.map((q, index) => ({
          questionId: q.id,
          questionText: q.text,
          userResponse: allResponses[index] || "No response provided"
        })),
        movementAnalysis: movementLog // Add movement data
      };
  
      navigate('/interview-analysis', { 
        state: { interviewData },
        replace: true
      });
    }
  };
  

  // Replace the existing submitResponse function with this:
const submitResponse = async () => {
  // Prevent duplicate submissions
  if (wasForcedTimeout && currentQuestionIndex === timeoutQuestionIndex) {
    setMessage({
      text: "Response already submitted at timeout",
      type: "warning"
    });
    return;
  }

  const currentResponse = userResponse.trim();
  if (!currentResponse) {
    setMessage({ 
      text: "Please enter your response before submitting", 
      type: "error" 
    });
    return;
  }

  setIsLoading(true);
  
  try {
    const token = localStorage.getItem("access_token");
    if (!token) throw new Error("No authentication token found");

    await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/user/submit-response`,
      {
        question_id: questions[currentQuestionIndex].id,
        user_response: currentResponse,
        test_log: testLog,
        photo: null
      },
      { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    // Update state
    setUserResponses(prev => {
      const updated = [...prev];
      updated[currentQuestionIndex] = currentResponse;
      return updated;
    });

    setUserResponse('');
    setWasForcedTimeout(false);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      navigateToAnalysis();
    }
  } catch (error) {
    console.error("Submission error:", error);
    setMessage({
      text: error.response?.status === 401 
        ? "Session expired. Please login again."
        : "Failed to submit response",
      type: "error"
    });
  } finally {
    setIsLoading(false);
  }
};

// Add this helper function near your other functions:
const navigateToAnalysis = (finalResponses = null) => {
  // Use provided responses if available, otherwise use current state
  const responsesToUse = finalResponses || userResponses;
  
  const interviewData = {
    jobTitle: domainName,
    domainName,
    adminName,
    questions: questions.map(q => ({ id: q.id, text: q.text })),
    responses: questions.map((q, index) => ({
      questionId: q.id,
      questionText: q.text,
      userResponse: responsesToUse[index] || "No response provided"
    }))
  };

  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    setMediaStream(null);
  }

  navigate('/interview-analysis', { 
    state: { interviewData },
    replace: true
  });
};  


const handleTimeUp = async () => {
  setTestLog(prev => [...prev, `Time expired for question at ${new Date().toLocaleTimeString()}`]);
  
  // First check for current response in textarea
  let submissionText = textAreaRef.current?.value?.trim() || '';
  
  // If no current response, check auto-saved responses
  if (!submissionText) {
    submissionText = userResponses[currentQuestionIndex]?.trim();
  }
  
  // Only mark as "No response" if truly no content
  if (!submissionText || submissionText.length === 0) {
    submissionText = "Time expired - No response provided";
  }

  try {
    const token = localStorage.getItem("access_token");
    if (!token) throw new Error("No authentication token found");

    // Submit the response
    await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/user/submit-response`,
      {
        question_id: questions[currentQuestionIndex].id,
        user_response: submissionText,
        test_log: [...testLog, "SYSTEM: Timer expired - Auto-submitted response"],
        photo: null
      },
      { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    
    // Update the responses array
    const updatedResponses = [...userResponses];
    updatedResponses[currentQuestionIndex] = submissionText;
    setUserResponses(updatedResponses);
    
    // Set timeout flags
    setWasForcedTimeout(true);
    setTimeoutQuestionIndex(currentQuestionIndex);

    setMessage({
      text: "Time's up! Your response has been auto-submitted.",
      type: "info"
    });
    
    // Move to next question or finish
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setUserResponse(''); // Clear textarea for next question
    } else {
      // Prepare final data with all responses
      const finalData = {
        jobTitle: domainName,
        domainName,
        adminName,
        questions: questions.map(q => ({ id: q.id, text: q.text })),
        responses: updatedResponses.map((response, idx) => ({
          questionId: questions[idx].id,
          questionText: questions[idx].text,
          userResponse: response || "No response provided"
        }))
      };
      
      // Stop media streams
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }
      
      // Navigate to analysis
      navigate('/interview-analysis', { 
        state: { 
          interviewData: finalData,
        },
        replace: true 
      });
    }
  } catch (error) {
    console.error("Auto-submission error:", error);
    setMessage({
      text: error.response?.status === 401 
        ? "Session expired. Please login again."
        : "Error auto-submitting response",
      type: "error"
    });
  }
};

  // Add this near the useEffect hooks or before the return statement
useEffect(() => {
  // Safety check to ensure currentQuestionIndex is valid
  if (questions.length > 0 && currentQuestionIndex >= questions.length) {
    setCurrentQuestionIndex(questions.length - 1);
  }
}, [questions, currentQuestionIndex]);

  // Fetch questions
  useEffect(() => {
    if (!location.state?.questions) {
      const fetchQuestions = async () => {
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL}/questions/${domainId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                'Content-Type': 'application/json'
              }
            }
          );
          setQuestions(response.data.map(q => ({
            ...q,
            timeLimit: q.time_limit || 60
          })));
        } catch (error) {
          console.error("Error fetching questions:", error);
          setMessage({
            text: "Failed to load interview questions. Please try again.",
            type: "error"
          });
        }
      };
      fetchQuestions();
    } else {
      setQuestions(location.state.questions.map(q => ({
        ...q,
        timeLimit: q.timeLimit || q.time_limit || 60
      })));
    }
  }, [domainId, location.state]);

  const formatTime = (seconds) => {
    if (seconds === null) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!interviewStarted) {
    return (
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f0f8ff',
        padding: '2rem'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '2rem',
          maxWidth: '600px',
          width: '100%'
        }}>
          <h2 style={{ 
            color: '#0277bd',
            textAlign: 'center',
            marginTop: '0',
            fontSize: '1.75rem'
          }}>
            {domainName} Interview Setup
          </h2>
          
          <p style={{
            color: '#546e7a',
            textAlign: 'center',
            marginBottom: '1.5rem'
          }}>
            Before starting your interview with {adminName}, we need to access your camera and microphone.
          </p>
          
          <div style={{
            width: '100%',
            height: '240px',
            backgroundColor: allPermissionsGranted ? 'transparent' : '#e0e0e0',
            borderRadius: '8px',
            overflow: 'hidden',
            position: 'relative',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {allPermissionsGranted ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                style={{ 
                  width: '100%', 
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  backgroundColor: '#000'
                }}
              />
            ) : (
              <div style={{ color: '#757575', fontSize: '1rem' }}>
                Camera preview will appear here
              </div>
            )}
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            margin: '1.5rem 0'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: permissionsStatus.camera ? '#4caf50' : '#f44336',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                fontSize: '1.5rem'
              }}>
                📷
              </div>
              <p style={{ 
                margin: '0.5rem 0 0 0', 
                color: permissionsStatus.camera ? '#2e7d32' : '#c62828' 
              }}>
                {permissionsStatus.camera ? 'Camera Allowed' : 'Camera Required'}
              </p>
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: permissionsStatus.microphone ? '#4caf50' : '#f44336',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                fontSize: '1.5rem'
              }}>
                🎤
              </div>
              <p style={{ 
                margin: '0.5rem 0 0 0', 
                color: permissionsStatus.microphone ? '#2e7d32' : '#c62828' 
              }}>
                {permissionsStatus.microphone ? 'Microphone Allowed' : 'Microphone Required'}
              </p>
            </div>
          </div>
          
          {message.text && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: message.type === 'error' ? '#ffebee' : 
                              message.type === 'warning' ? '#fff8e1' : '#e8f5e9',
              color: message.type === 'error' ? '#d32f2f' : 
                     message.type === 'warning' ? '#ff8f00' : '#2e7d32',
              borderRadius: '6px',
              textAlign: 'center',
              fontSize: '0.9rem',
              marginTop: '1rem'
            }}>
              {message.text}
            </div>
          )}
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '1.5rem',
            gap: '1rem'
          }}>
            <button
              onClick={handleBackButton}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#ffffff',
                color: '#f44336',
                border: '1px solid #f44336',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                flex: '1'
              }}
            >
              Cancel
            </button>
            
            {!allPermissionsGranted ? (
              <button
              onClick={() => navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then(stream => {
                  // Save the stream directly when permissions are granted
                  setMediaStream(stream);
                  
                  // Immediately set the video source
                  if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.muted = true;
                    videoRef.current.play().catch(e => console.error("Video play error:", e));
                  }
                  
                  setPermissionsStatus({ camera: true, microphone: true });
                  setAllPermissionsGranted(true);
                })
                .catch(err => {
                  console.error("Error accessing media:", err);
                  setMessage({ text: `Permission denied: ${err.message}`, type: "error" });
                })}
              style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#0277bd',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  flex: '1'
                }}
              >
                Request Permissions
              </button>
            ) : (
              <button
                onClick={startInterview}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  flex: '1'
                }}
              >
                Start Interview
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  {showBackModal && (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 9999
    }}>
      <div style={{
        backgroundColor: '#fff', padding: '2rem', borderRadius: '10px',
        width: '90%', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <h3 style={{ marginBottom: '1rem' }}>Leave Interview?</h3>
        <p style={{ marginBottom: '1.5rem' }}>
          Your progress will be lost. Are you sure you want to exit?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button
            onClick={() => setShowBackModal(false)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #999',
              borderRadius: '6px',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleBackButton}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#d32f2f',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Leave Interview
          </button>
        </div>
      </div>
    </div>
  )}
  

  return (
    
    <div style={{ 
      display: 'flex',
      height: '100vh',
      backgroundColor: '#f0f8ff'
    }}>
      {/* Left Panel - Questions and Timer */}
      <div style={{ 
        width: '35%',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflowY: 'auto'
      }}>
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#0277bd',
          color: 'white'
        }}>
          <h3 style={{ 
            margin: 0,
            fontSize: '1.25rem'
          }}>
            {domainName} Interview
          </h3>
          <p style={{ 
            margin: '0.5rem 0 0 0',
            fontSize: '0.9rem',
            opacity: 0.9
          }}>
            With: {adminName}
          </p>
          
          <div style={{
              marginTop: '1rem',
              backgroundColor: timeLeft <= 10 ? 'rgba(255,87,34,0.2)' : 'rgba(255,255,255,0.2)',
              color: timeLeft <= 10 ? '#ffcdd2' : 'white',
              padding: '0.75rem',
              borderRadius: '6px',
              textAlign: 'center',
              fontSize: '1.5rem',
              fontWeight: '600',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              animation: timeLeft <= 10 ? 'pulseWarning 1s infinite' : 'none'
            }}>
              <span>{formatTime(timeLeft)}</span>
              {timeLeft <= 10 && (
                <span style={{ 
                  fontSize: '0.8rem', 
                  marginLeft: '0.5rem',
                  color: '#ffcdd2'
                }}>
                  Auto-submit in {timeLeft}s!
                </span>
              )}
            </div>
        </div>

        {/* Current Question */}
        <div style={{
          padding: '1.5rem',
          flex: 1,
          overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '1.5rem',
            fontSize: '1rem',
            lineHeight: '1.6',
            color: '#2c3e50'
          }}>
            <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#0277bd' }}>
            Question {Math.min(currentQuestionIndex + 1, questions.length)} of {questions.length}:
          </h4>
          {questions[Math.min(currentQuestionIndex, questions.length - 1)]?.text || "Loading question..."}
          </div>
        </div>

        {/* Progress indicator */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid #e0e0e0',
          backgroundColor: '#ffffff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            {questions.map((_, index) => (
              <div 
                key={index}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: index === currentQuestionIndex ? '#0277bd' : 
                                  index < currentQuestionIndex ? '#4caf50' : '#e0e0e0'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Answer Section and Video */}
      <div style={{ 
        flex: 1,
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8f9fa'
      }}>
        {/* Top section - Video */}
        <div style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <div style={{
              width: '240px',
              height: '180px',
              backgroundColor: '#000',
              borderRadius: '8px',
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              display: 'flex',  // Add this
              justifyContent: 'center',  // Add this
              alignItems: 'center'  // Add this
            }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                style={{ 
                  width: '100%', 
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                  display: 'block',  // Add this
                  backgroundColor: '#000'
                }}
              />
              {/* Recording indicator dot */}
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#ff4444',
                boxShadow: '0 0 0 rgba(255, 68, 68, 0.4)',
                animation: 'pulse 2s infinite'
              }} />
            </div>
        </div>

        {/* Answer Section */}
        <div style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e0e0e0',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#0277bd',
            color: 'white'
          }}>
            <h4 style={{ 
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: '500'
            }}>
              Your Answer
            </h4>
          </div>
          
          
<textarea
  ref={textAreaRef} 
  value={userResponse}
  onChange={(e) => {
    const newResponse = e.target.value;
    setUserResponse(newResponse);
    
    // Update responses array immediately
    const updatedResponses = [...userResponses];
    updatedResponses[currentQuestionIndex] = newResponse;
    setUserResponses(updatedResponses);
  }}
  onPaste={(e) => {
    // Prevent paste operation
    e.preventDefault();
    setMessage({
      text: "Pasting is not allowed. Please type your answer.",
      type: "warning"
    });
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 3000);
  }}
  placeholder="Type your answer here..."
  style={{
    flex: 1,
    padding: '1.25rem',
    border: 'none',
    fontSize: '1rem',
    lineHeight: '1.6',
    resize: 'none',
    fontFamily: 'inherit'
  }}
/>
<div style={{
  position: 'absolute',
  bottom: '80px', // Adjusted to be above the button section
  right: '20px',
  fontSize: '0.8rem',
  color: '#666',
  padding: '4px 8px',
  borderRadius: '4px',
  backgroundColor: '#f0f0f0',
  display: 'flex',
  alignItems: 'center',
  gap: '4px'
}}>
  <span style={{ 
    width: '8px', 
    height: '8px', 
    borderRadius: '50%', 
    backgroundColor: '#4caf50',
    display: 'inline-block'
  }}></span>
  Auto-saving enabled
</div>
          
          {message.text && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: message.type === 'error' ? '#ffebee' : 
                              message.type === 'warning' ? '#fff8e1' : '#e8f5e9',
              color: message.type === 'error' ? '#d32f2f' : 
                     message.type === 'warning' ? '#ff8f00' : '#2e7d32',
              textAlign: 'center',
              fontSize: '0.9rem'
            }}>
              {message.text}
            </div>
          )}
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '1rem',
            borderTop: '1px solid #e0e0e0',
            backgroundColor: '#f8f9fa'
          }}>
            <button
              onClick={endInterview}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#ffffff',
                color: '#dc3545',
                border: '1px solid #dc3545',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              End Interview
            </button>
            
            <button
              onClick={submitResponse}
              disabled={isLoading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: isLoading ? '#85b79d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              {isLoading ? 'Submitting...' : 
                currentQuestionIndex < questions.length - 1 ? 'Submit & Next' : 'Submit & Finish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InterviewWindow;