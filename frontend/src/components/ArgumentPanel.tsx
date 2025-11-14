import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserTie, FaPaperPlane } from 'react-icons/fa';
import { ArgumentRecord, ArgumentResponse } from '../api';

interface Props {
  caseId: string;
  arguments: ArgumentRecord[];
  remainingArguments: number;
  onSubmitArgument: (side: 'A' | 'B', argument: string) => Promise<ArgumentResponse>;
  loading: boolean;
}

export const ArgumentPanel: React.FC<Props> = ({
  caseId,
  arguments: argumentList,
  remainingArguments,
  onSubmitArgument,
  loading,
}) => {
  const [sideAArgument, setSideAArgument] = useState('');
  const [sideBArgument, setSideBArgument] = useState('');
  const [activeSide, setActiveSide] = useState<'A' | 'B' | null>(null);

  const handleSubmit = async (side: 'A' | 'B') => {
    const argument = side === 'A' ? sideAArgument : sideBArgument;
    if (!argument.trim()) return;

    setActiveSide(side);
    await onSubmitArgument(side, argument);
    
    if (side === 'A') {
      setSideAArgument('');
    } else {
      setSideBArgument('');
    }
    setActiveSide(null);
  };

  const canSubmit = remainingArguments > 0 && !loading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center card p-6">
        <h2 className="text-3xl font-legal font-bold text-courtroom-accent mb-2">
          Courtroom Arguments
        </h2>
        <p className="text-gray-400">
          {remainingArguments > 0 ? (
            <>Arguments remaining: <span className="text-courtroom-accent font-bold">{remainingArguments}/5</span></>
          ) : (
            <span className="text-red-400 font-bold">Maximum arguments reached</span>
          )}
        </p>
      </div>

      {/* Argument Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Side A Panel */}
        <div className="card p-6 border-t-4 border-courtroom-plaintiff">
          <div className="flex items-center gap-3 mb-4">
            <FaUserTie className="text-3xl text-blue-400" />
            <h3 className="text-xl font-semibold text-blue-400">Side A</h3>
          </div>
          <textarea
            className="textarea-field mb-4"
            placeholder="Enter your argument here..."
            value={sideAArgument}
            onChange={(e) => setSideAArgument(e.target.value)}
            disabled={!canSubmit || activeSide === 'B'}
          />
          <button
            onClick={() => handleSubmit('A')}
            disabled={!canSubmit || !sideAArgument.trim() || activeSide !== null}
            className="btn-primary w-full"
          >
            {activeSide === 'A' ? (
              <>
                <span className="animate-spin inline-block mr-2">⏳</span>
                Processing...
              </>
            ) : (
              <>
                <FaPaperPlane className="inline mr-2" />
                Submit Argument
              </>
            )}
          </button>
        </div>

        {/* Judge/Center */}
        <div className="card p-6 bg-gradient-to-b from-gray-800 to-courtroom-judge flex flex-col items-center justify-center">
          <motion.div
            animate={{
              scale: loading ? [1, 1.1, 1] : 1,
            }}
            transition={{
              duration: 2,
              repeat: loading ? Infinity : 0,
            }}
            className="text-8xl mb-4"
          >
            ⚖️
          </motion.div>
          <h3 className="text-2xl font-legal font-bold text-courtroom-accent text-center">
            AI Judge
          </h3>
          <p className="text-gray-400 text-center mt-2">
            Reviewing arguments with impartiality
          </p>
        </div>

        {/* Side B Panel */}
        <div className="card p-6 border-t-4 border-courtroom-defendant">
          <div className="flex items-center gap-3 mb-4">
            <FaUserTie className="text-3xl text-red-400" />
            <h3 className="text-xl font-semibold text-red-400">Side B</h3>
          </div>
          <textarea
            className="textarea-field mb-4"
            placeholder="Enter your argument here..."
            value={sideBArgument}
            onChange={(e) => setSideBArgument(e.target.value)}
            disabled={!canSubmit || activeSide === 'A'}
          />
          <button
            onClick={() => handleSubmit('B')}
            disabled={!canSubmit || !sideBArgument.trim() || activeSide !== null}
            className="btn-primary w-full"
          >
            {activeSide === 'B' ? (
              <>
                <span className="animate-spin inline-block mr-2">⏳</span>
                Processing...
              </>
            ) : (
              <>
                <FaPaperPlane className="inline mr-2" />
                Submit Argument
              </>
            )}
          </button>
        </div>
      </div>

      {/* Argument History */}
      {argumentList.length > 0 && (
        <div className="card p-6">
          <h3 className="text-2xl font-semibold mb-4">Argument History</h3>
          <div className="space-y-4">
            <AnimatePresence>
              {argumentList.map((arg, index) => (
                <motion.div
                  key={arg.id}
                  initial={{ opacity: 0, x: arg.side === 'A' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`p-4 rounded-lg border-l-4 ${
                    arg.side === 'A'
                      ? 'bg-blue-900 bg-opacity-20 border-courtroom-plaintiff'
                      : 'bg-red-900 bg-opacity-20 border-courtroom-defendant'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-bold ${arg.side === 'A' ? 'text-blue-400' : 'text-red-400'}`}>
                      Side {arg.side} - Argument #{arg.sequenceNumber}
                    </span>
                    {arg.reconsidered && (
                      <span className="px-2 py-1 bg-yellow-600 text-xs rounded-full">
                        ⚠️ Judge Reconsidered
                      </span>
                    )}
                  </div>
                  <p className="text-gray-300 mb-3 italic">"{arg.argument}"</p>
                  <div className="pl-4 border-l-2 border-courtroom-accent">
                    <p className="text-sm font-semibold text-courtroom-accent mb-1">
                      Judge's Response:
                    </p>
                    <p className="text-gray-400 text-sm mb-2">{arg.response}</p>
                    
                    {/* Show evaluation indicators */}
                    {(arg.strengthens || arg.weakens) && (
                      <div className="flex gap-3 mb-2 text-xs">
                        {arg.strengthens && arg.strengthens !== 'Neither' && (
                          <span className="px-2 py-1 bg-green-900 bg-opacity-40 text-green-300 rounded">
                            ↑ Strengthens {arg.strengthens}
                          </span>
                        )}
                        {arg.weakens && arg.weakens !== 'Neither' && (
                          <span className="px-2 py-1 bg-red-900 bg-opacity-40 text-red-300 rounded">
                            ↓ Weakens {arg.weakens}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {arg.uncertaintyRemains && (
                      <p className="text-xs text-yellow-400 mb-2">
                        ❓ Uncertainty: {arg.uncertaintyRemains}
                      </p>
                    )}
                    
                    {arg.provisionalNote && (
                      <p className="text-xs text-gray-500 italic mt-2">
                        {arg.provisionalNote}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};
