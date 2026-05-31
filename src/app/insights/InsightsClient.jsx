'use client';

import { useState, useRef, useEffect } from 'react';
import { FaLightbulb, FaRegLightbulb, FaSyncAlt } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';

// Client island for the Insights page. Initial insights are passed in as a
// prop (server-rendered from Mongo). The Generate button POSTs to the API
// and streams the response text in token-by-token.
export default function InsightsClient({ initialInsights }) {
  const { user } = useAuth();
  const [insights, setInsights] = useState(initialInsights);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [retryTime, setRetryTime] = useState(null);
  const cooldownIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, []);

  const startCooldownTimer = (seconds) => {
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
    }
    let remaining = seconds;
    setRetryTime({ remaining });
    cooldownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
        setRetryTime(null);
      } else {
        setRetryTime({ remaining });
      }
    }, 1000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const generateInsight = async () => {
    if (retryTime || generating) return;

    setGenerating(true);
    setMessage('');
    setError('');

    // Optimistic streaming-in-progress row at the top of the list.
    const tempId = `streaming-${Date.now()}`;
    setInsights((prev) => [
      {
        _id: tempId,
        content: '',
        createdAt: new Date().toISOString(),
        streaming: true,
      },
      ...prev,
    ]);

    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        // Error path is JSON, not a stream.
        const errData = await res.json().catch(() => ({}));
        setInsights((prev) => prev.filter((i) => i._id !== tempId));

        if (res.status === 429) {
          startCooldownTimer(errData.retryAfter || 60);
        } else if (res.status === 200) {
          // "No transactions" early-return path returns 200 + a message but
          // no stream — handled above by !res.ok; falls here only if we
          // got JSON content despite a 200, which shouldn't happen.
          setMessage(errData.message || '');
        } else {
          setError(
            errData.message ||
              'Could not generate new insight. Try again later.'
          );
        }
        return;
      }

      // Check whether this is the "no transactions" JSON 200 or a stream.
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/plain')) {
        const data = await res.json().catch(() => ({}));
        setInsights((prev) => prev.filter((i) => i._id !== tempId));
        if (data.message) setMessage(data.message);
        return;
      }

      // Stream the model tokens into the temp insight's content.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setInsights((prev) =>
          prev.map((i) =>
            i._id === tempId ? { ...i, content: accumulated } : i
          )
        );
      }

      setInsights((prev) =>
        prev.map((i) =>
          i._id === tempId ? { ...i, streaming: false } : i
        )
      );
      setMessage('New insight generated successfully!');
    } catch (err) {
      console.error('Error generating insight:', err);
      setInsights((prev) => prev.filter((i) => i._id !== tempId));
      setError('Network error while streaming.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className='container py-3'>
      <div className='d-flex flex-column flex-md-row justify-content-between align-items-center mb-4'>
        <div className='text-center text-md-start mb-3 mb-md-0'>
          <h2 className='fw-bold mb-1'>
            <FaLightbulb className='text-warning me-2' />
            Financial Insights
          </h2>
          {user?.name && (
            <p className='text-muted'>Personalized for {user.name}</p>
          )}
        </div>

        <button
          className={`btn ${
            retryTime ? 'btn-secondary' : 'btn-primary'
          } d-flex align-items-center`}
          onClick={generateInsight}
          disabled={generating || retryTime}
        >
          {generating ? (
            <>
              <FaSyncAlt className='me-2 spin' />
              Generating...
            </>
          ) : retryTime ? (
            `Try again in ${formatTime(retryTime.remaining)}`
          ) : (
            <>
              <FaRegLightbulb className='me-2' />
              Generate Insight
            </>
          )}
        </button>
      </div>

      {error && (
        <div className='alert alert-danger d-flex align-items-center mb-4'>
          <i className='bi bi-exclamation-triangle-fill me-2'></i>
          {error}
        </div>
      )}

      {message && (
        <div className='alert alert-info d-flex align-items-center mb-4'>
          <i className='bi bi-info-circle-fill me-2'></i>
          {message}
        </div>
      )}

      {insights.length === 0 ? (
        <div className='card shadow-sm'>
          <div className='card-body text-center py-5'>
            <FaLightbulb className='text-muted fs-1 mb-3' />
            <h4>No Insights Yet</h4>
            <p className='text-muted mb-4'>
              Generate your first insight to get personalized financial advice
            </p>
            <button
              className='btn btn-primary'
              onClick={generateInsight}
              disabled={generating || retryTime}
            >
              Generate First Insight
            </button>
          </div>
        </div>
      ) : (
        <div className='row g-4'>
          {insights.map((insight, idx) => (
            <div className='col-12' key={insight._id || idx}>
              <div className='card shadow-sm border-0'>
                <div className='card-body'>
                  <div className='d-flex justify-content-between align-items-start mb-3'>
                    <h5 className='card-title mb-0'>
                      <span className='badge bg-warning text-dark me-2'>
                        Insight #{insights.length - idx}
                      </span>
                      {insight.streaming && (
                        <span className='badge bg-info text-dark ms-1'>
                          <FaSyncAlt className='me-1 spin' />
                          Streaming…
                        </span>
                      )}
                    </h5>
                    <small className='text-muted'>
                      {insight.createdAt
                        ? new Date(insight.createdAt).toLocaleDateString(
                            'en-US',
                            {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )
                        : 'Recently'}
                    </small>
                  </div>

                  <div className='ms-3'>
                    {insight.content.split('\n').map((line, i) =>
                      line.startsWith('-') ? (
                        <div key={i} className='d-flex mb-2'>
                          <span className='me-2'>•</span>
                          <span>{line.replace(/^-\s*/, '')}</span>
                        </div>
                      ) : line.trim() ? (
                        <p key={i} className='mb-3'>
                          {line}
                        </p>
                      ) : null
                    )}
                    {insight.streaming && !insight.content && (
                      <p className='text-muted fst-italic mb-0'>
                        Asking Gemini for your insight…
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
