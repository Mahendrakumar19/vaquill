import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaExclamationTriangle, FaCheckCircle, FaLightbulb } from 'react-icons/fa';
import { DocumentFacts, ValidationResult, validateArgument } from '../api/factCheck';
import { debounce } from 'lodash-es';

interface Props {
  argument: string;
  documentFacts: DocumentFacts | null;
  onArgumentChange: (value: string) => void;
  disabled?: boolean;
}

export const FactCheckTextarea: React.FC<Props> = ({
  argument,
  documentFacts,
  onArgumentChange,
  disabled = false,
}) => {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Debounced validation (wait 1 second after user stops typing)
  const debouncedValidate = useCallback(
    debounce(async (text: string, facts: DocumentFacts) => {
      if (text.length < 50 || !facts) {
        setValidation(null);
        setIsChecking(false);
        return;
      }

      try {
        setIsChecking(true);
        const result = await validateArgument(text, facts);
        setValidation(result);
      } catch (error) {
        console.error('Fact check error:', error);
        setValidation(null);
      } finally {
        setIsChecking(false);
      }
    }, 1000),
    []
  );

  // Trigger validation when argument or facts change
  useEffect(() => {
    if (documentFacts && argument.length >= 50) {
      debouncedValidate(argument, documentFacts);
    } else {
      setValidation(null);
    }

    return () => {
      debouncedValidate.cancel();
    };
  }, [argument, documentFacts, debouncedValidate]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="relative">
      {/* Textarea */}
      <textarea
        className={`textarea-field mb-2 ${
          validation?.hasIssues ? 'border-yellow-500 border-2' : ''
        }`}
        placeholder="Enter your argument here... (AI will fact-check in real-time)"
        value={argument}
        onChange={(e) => onArgumentChange(e.target.value)}
        disabled={disabled}
        rows={6}
      />

      {/* Validation Status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isChecking && (
            <span className="text-gray-400 text-sm flex items-center gap-2">
              <span className="animate-spin">🔍</span>
              Fact-checking...
            </span>
          )}
          
          {!isChecking && validation && (
            <div className="flex items-center gap-2">
              {validation.hasIssues ? (
                <FaExclamationTriangle className="text-yellow-400" />
              ) : (
                <FaCheckCircle className="text-green-400" />
              )}
              <span className={`text-sm font-semibold ${getScoreColor(validation.overallScore)}`}>
                Accuracy Score: {validation.overallScore}%
              </span>
            </div>
          )}
        </div>

        {/* Score Bar */}
        {validation && !isChecking && (
          <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${getScoreBg(validation.overallScore)}`}
              initial={{ width: 0 }}
              animate={{ width: `${validation.overallScore}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}
      </div>

      {/* Issues List */}
      <AnimatePresence>
        {validation?.hasIssues && validation.issues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 mb-4"
          >
            {validation.issues.map((issue, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-lg border-l-4 ${
                  issue.category === 'factual_error'
                    ? 'bg-red-900 bg-opacity-20 border-red-500'
                    : issue.category === 'inconsistency'
                    ? 'bg-orange-900 bg-opacity-20 border-orange-500'
                    : 'bg-yellow-900 bg-opacity-20 border-yellow-500'
                }`}
              >
                <div className="flex items-start gap-2">
                  <FaExclamationTriangle className="text-yellow-400 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-200 mb-1">
                      {issue.category === 'factual_error' && 'Factual Error'}
                      {issue.category === 'inconsistency' && 'Inconsistency Detected'}
                      {issue.category === 'missing_evidence' && 'Missing Evidence'}
                    </p>
                    <p className="text-sm text-gray-400 mb-2">
                      <span className="font-medium">Claim:</span> "{issue.claim.substring(0, 100)}..."
                    </p>
                    {issue.evidence && (
                      <p className="text-sm text-gray-300 mb-2">
                        <span className="font-medium">Issue:</span> {issue.evidence}
                      </p>
                    )}
                    {issue.suggestion && (
                      <div className="flex items-start gap-2 mt-2 p-2 bg-gray-800 rounded">
                        <FaLightbulb className="text-yellow-300 mt-1 flex-shrink-0" />
                        <p className="text-sm text-gray-300">
                          <span className="font-medium">Suggestion:</span> {issue.suggestion}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Confidence: {issue.confidence}%
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper Text */}
      {!validation && argument.length > 0 && argument.length < 50 && (
        <p className="text-xs text-gray-500">
          Type at least 50 characters to enable real-time fact-checking...
        </p>
      )}
    </div>
  );
};
