import React from 'react';
import { motion } from 'framer-motion';
import { FaGavel, FaBalanceScale, FaCheckCircle } from 'react-icons/fa';
import { Judgment } from '../api';

interface Props {
  judgment: Judgment | null;
  loading: boolean;
  isFinal?: boolean;
}

export const JudgmentDisplay: React.FC<Props> = ({ judgment, loading, isFinal = false }) => {
  if (loading) {
    return (
      <div className="card p-12 text-center">
        <motion.div
          animate={{ rotate: [0, -15, 0, 15, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-block"
        >
          <FaGavel className="text-8xl text-courtroom-accent mx-auto mb-4" />
        </motion.div>
        <h3 className="text-2xl font-semibold mb-2">AI Judge is Deliberating...</h3>
        <p className="text-gray-400">Analyzing case law, precedents, and legal arguments</p>
        <div className="mt-6 flex justify-center gap-2">
          <motion.div
            className="w-3 h-3 bg-courtroom-accent rounded-full"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-3 h-3 bg-courtroom-accent rounded-full"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-3 h-3 bg-courtroom-accent rounded-full"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    );
  }

  if (!judgment) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="card p-8 text-center border-2 border-courtroom-accent pulse-glow">
        <FaBalanceScale className="text-6xl text-courtroom-accent mx-auto mb-4" />
        <h2 className="text-3xl font-legal font-bold text-courtroom-accent mb-2">
          {isFinal ? 'FINAL JUDGMENT' : 'INITIAL TENTATIVE ASSESSMENT'}
        </h2>
        {!isFinal && (
          <p className="text-sm text-yellow-400 italic mt-2">
            This is a provisional assessment. Arguments from both sides may lead to reconsideration.
          </p>
        )}
        {judgment.cached && (
          <p className="text-sm text-gray-400">(Retrieved from cache)</p>
        )}
      </div>

      {/* Verdict */}
      <div className="card p-6 border-l-4 border-courtroom-accent">
        <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <FaCheckCircle className="text-green-500" />
          Verdict
        </h3>
        <p className="text-lg font-legal leading-relaxed">{judgment.verdict}</p>
      </div>

      {/* Reasoning */}
      <div className="card p-6">
        <h3 className="text-xl font-semibold mb-3">Legal Reasoning</h3>
        <p className="text-gray-300 leading-relaxed whitespace-pre-line">
          {judgment.reasoning}
        </p>
      </div>

      {/* Legal Basis */}
      {judgment.legalBasis && judgment.legalBasis.length > 0 && (
        <div className="card p-6">
          <h3 className="text-xl font-semibold mb-3">Legal Basis & Precedents</h3>
          <ul className="space-y-2">
            {judgment.legalBasis.map((basis, index) => (
              <li key={index} className="flex gap-3">
                <span className="text-courtroom-accent font-bold">{index + 1}.</span>
                <span className="text-gray-300">{basis}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confidence */}
      <div className="card p-6">
        <h3 className="text-xl font-semibold mb-3">Confidence Level</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${judgment.confidence}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full ${
                judgment.confidence >= 80
                  ? 'bg-green-500'
                  : judgment.confidence >= 60
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
            />
          </div>
          <span className="text-2xl font-bold text-courtroom-accent">
            {judgment.confidence}%
          </span>
        </div>
      </div>
    </motion.div>
  );
};
