
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateQuestions } from '../../services/geminiService';
import { Question, Answer, QuestionType } from '../../types';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';

const Questionnaire: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string | number>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setError('');
        setIsLoading(true);
        const fetchedQuestions = await generateQuestions();
        if(fetchedQuestions.length > 0) {
            setQuestions(fetchedQuestions);
        } else {
            setError("Could not load questions. The AI returned an empty list. Please try again later.");
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchQuestions();
  }, []);

  const handleNext = () => {
    if (currentAnswer === '') return;

    const currentQuestion = questions[currentQuestionIndex];
    const newAnswer: Answer = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.questionText,
      answerValue: currentAnswer,
    };
    
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);
    setCurrentAnswer('');

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Finished questionnaire
      navigate('/report', { state: { answers: updatedAnswers } });
    }
  };

  const renderQuestion = () => {
    const q = questions[currentQuestionIndex];
    switch (q.type) {
      case QuestionType.MCQ:
        return (
          <div className="space-y-3">
            {(q.options || []).map((option, i) => (
              <button
                key={i}
                onClick={() => setCurrentAnswer(option)}
                className={`block w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  currentAnswer === option
                    ? 'bg-teal-500 border-teal-500 text-white'
                    : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        );
      case QuestionType.RATING:
        return (
          <div className="flex justify-center space-x-2">
            {Array.from({ length: q.max || 5 }, (_, i) => i + 1).map((val) => (
              <button
                key={val}
                onClick={() => setCurrentAnswer(val)}
                className={`w-12 h-12 flex items-center justify-center rounded-full border-2 transition-all transform hover:scale-110 ${
                  currentAnswer === val
                    ? 'bg-teal-500 border-teal-500 text-white'
                    : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        );
      case QuestionType.SLIDER:
        return (
          <div className="w-full">
            <input
              type="range"
              min={q.min || 1}
              max={q.max || 10}
              value={currentAnswer || q.min || 1}
              onChange={(e) => setCurrentAnswer(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-600"
            />
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400 mt-2">
              <span>{q.minLabel || 'Low'}</span>
              <span className="font-bold text-teal-600 dark:text-teal-400 text-lg">{currentAnswer || ''}</span>
              <span>{q.maxLabel || 'High'}</span>
            </div>
          </div>
        );
      default:
        return <p>Unsupported question type.</p>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Spinner size="lg" />
        <p className="mt-4 text-slate-500">Generating your assessment...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>;
  }

  if (questions.length === 0) {
    return <div className="text-center text-slate-500">No questions available.</div>;
  }

  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white dark:bg-slate-800 shadow-xl rounded-lg">
      <div className="mb-6">
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
          <div className="bg-teal-500 h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}></div>
        </div>
        <p className="text-center text-sm text-slate-500 mt-2">Question {currentQuestionIndex + 1} of {questions.length}</p>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">{questions[currentQuestionIndex].questionText}</h2>
      </div>

      <div className="mb-8 min-h-[100px] flex items-center justify-center">
        {renderQuestion()}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={currentAnswer === ''}>
          {currentQuestionIndex < questions.length - 1 ? 'Next' : 'Finish & See Report'}
        </Button>
      </div>
    </div>
  );
};

export default Questionnaire;
