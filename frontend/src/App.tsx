import React, { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CaseForm } from './components/CaseForm';
import { JudgmentDisplay } from './components/JudgmentDisplay';
import { ArgumentPanel } from './components/ArgumentPanel';
import {
  createCase,
  generateJudgment,
  submitArgument,
  getArguments,
  generateFinalVerdict,
  CaseData,
  Judgment,
  ArgumentRecord,
  ArgumentResponse,
} from './api';

type AppState = 'form' | 'judgment' | 'arguments' | 'final-verdict';


function App() {
  const [state, setState] = useState<AppState>('form');
  const [caseId, setCaseId] = useState<string | null>(null);
  const [judgment, setJudgment] = useState<Judgment | null>(null);
  const [argumentList, setArgumentList] = useState<ArgumentRecord[]>([]);
  const [remainingArguments, setRemainingArguments] = useState(5);
  const [loading, setLoading] = useState(false);

  const handleCaseSubmit = async (data: CaseData) => {
    try {
      setLoading(true);
      toast.info('Creating case...');

      // Create the case
      const result = await createCase(data);
      setCaseId(result.caseId);
      toast.success('Case created successfully!');

      // Generate initial judgment
      toast.info('Generating judgment...');
      const judgmentResult = await generateJudgment(result.caseId);
      setJudgment(judgmentResult);
      toast.success('Judgment rendered!');

      setState('judgment');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to process case');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToArguments = async () => {
    if (!caseId) return;

    try {
      const args = await getArguments(caseId);
      setArgumentList(args.arguments);
      setRemainingArguments(args.remainingArguments);
      setState('arguments');
    } catch (error: any) {
      toast.error('Failed to load arguments');
      console.error('Error:', error);
    }
  };

  const handleSubmitArgument = async (
    side: 'A' | 'B',
    argument: string
  ): Promise<ArgumentResponse> => {
    if (!caseId) throw new Error('No case ID');

    try {
      toast.info(`Processing ${side === 'A' ? 'Side A' : 'Side B'} argument...`);
      const response = await submitArgument(caseId, side, argument);

      // Refresh argument list
      const args = await getArguments(caseId);
      setArgumentList(args.arguments);
      setRemainingArguments(args.remainingArguments);

      if (response.reconsidered) {
        toast.success('Judge has reconsidered the case!', {
          icon: '⚖️',
        });
      } else {
        toast.info('Argument recorded');
      }

      return response;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit argument');
      throw error;
    }
  };

  const handleNewCase = () => {
    setState('form');
    setCaseId(null);
    setJudgment(null);
    setArgumentList([]);
    setRemainingArguments(5);
  };

  const handleGenerateFinalVerdict = async () => {
    if (!caseId) return;

    try {
      setLoading(true);
      toast.info('Generating comprehensive final verdict...');
      
      const finalVerdict = await generateFinalVerdict(caseId);
      setJudgment(finalVerdict);
      setState('final-verdict');
      
      toast.success('Final verdict rendered!', { icon: '⚖️' });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate final verdict');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-courtroom-dark py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {state === 'form' && (
          <CaseForm onSubmit={handleCaseSubmit} loading={loading} />
        )}

        {state === 'judgment' && (
          <div className="space-y-8">
            <JudgmentDisplay judgment={judgment} loading={loading} isFinal={false} />
            
            {judgment && (
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleProceedToArguments}
                  className="btn-primary"
                >
                  Proceed to Arguments
                </button>
                <button
                  onClick={handleNewCase}
                  className="btn-secondary"
                >
                  New Case
                </button>
              </div>
            )}
          </div>
        )}

        {state === 'arguments' && caseId && (
          <div className="space-y-8">
            <ArgumentPanel
              caseId={caseId}
              arguments={argumentList}
              remainingArguments={remainingArguments}
              onSubmitArgument={handleSubmitArgument}
              loading={loading}
            />

            <div className="flex justify-center gap-4">
              {argumentList.length > 0 && (
                <button
                  onClick={handleGenerateFinalVerdict}
                  disabled={loading}
                  className="btn-primary"
                >
                  Generate Final Verdict
                </button>
              )}
              <button
                onClick={handleNewCase}
                className="btn-secondary"
              >
                New Case
              </button>
            </div>
          </div>
        )}

        {state === 'final-verdict' && (
          <div className="space-y-8">
            <div className="bg-courtroom-accent/10 border-2 border-courtroom-accent rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-courtroom-accent mb-2 text-center">
                ⚖️ FINAL COMPREHENSIVE VERDICT
              </h2>
              <p className="text-gray-400 text-center">
                After hearing all arguments from both sides
              </p>
            </div>

            <JudgmentDisplay judgment={judgment} loading={loading} isFinal={true} />
            
            <div className="flex justify-center">
              <button
                onClick={handleNewCase}
                className="btn-primary"
              >
                Start New Case
              </button>
            </div>
          </div>
        )}
      </div>

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

      {/* Footer */}
      <footer className="text-center text-gray-500 mt-12 pb-4">
        <p className="text-sm">
          AI Judge System - Powered by Advanced Legal AI
        </p>
        <p className="text-xs mt-2">
          This is a mock trial system for educational and demonstration purposes
        </p>
      </footer>
    </div>
  );
}

export default App;
