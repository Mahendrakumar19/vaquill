import React, { useState } from 'react';
import { FaBalanceScale, FaGavel, FaFileUpload, FaPlus, FaTimes } from 'react-icons/fa';
import { CaseData } from '../api';

interface Props {
  onSubmit: (data: CaseData) => Promise<void>;
  loading: boolean;
}

const jurisdictions = [
  'INDIA',
  'USA',
  'UK',
  'CANADA',
  'AUSTRALIA',
  'INTERNATIONAL',
];

const caseTypes = [
  'Civil',
  'Criminal',
  'Constitutional',
  'Commercial',
  'Family',
  'Property',
  'Contract',
  'Tort',
  'Labour',
  'Tax',
];

export const CaseForm: React.FC<Props> = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    caseType: '',
    jurisdiction: 'INDIA',
    sideASummary: '',
    sideBSummary: '',
  });

  const [sideAEvidence, setSideAEvidence] = useState<string[]>(['']);
  const [sideBEvidence, setSideBEvidence] = useState<string[]>(['']);
  const [sideADocs, setSideADocs] = useState<File[]>([]);
  const [sideBDocs, setSideBDocs] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const caseData: CaseData = {
      ...formData,
      sideAEvidence: sideAEvidence.filter(e => e.trim() !== ''),
      sideBEvidence: sideBEvidence.filter(e => e.trim() !== ''),
      sideADocs,
      sideBDocs,
    };

    await onSubmit(caseData);
  };

  const addEvidence = (side: 'A' | 'B') => {
    if (side === 'A') {
      setSideAEvidence([...sideAEvidence, '']);
    } else {
      setSideBEvidence([...sideBEvidence, '']);
    }
  };

  const removeEvidence = (side: 'A' | 'B', index: number) => {
    if (side === 'A') {
      setSideAEvidence(sideAEvidence.filter((_, i) => i !== index));
    } else {
      setSideBEvidence(sideBEvidence.filter((_, i) => i !== index));
    }
  };

  const updateEvidence = (side: 'A' | 'B', index: number, value: string) => {
    if (side === 'A') {
      const updated = [...sideAEvidence];
      updated[index] = value;
      setSideAEvidence(updated);
    } else {
      const updated = [...sideBEvidence];
      updated[index] = value;
      setSideBEvidence(updated);
    }
  };

  const handleFileChange = (side: 'A' | 'B', files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      if (side === 'A') {
        setSideADocs([...sideADocs, ...fileArray]);
      } else {
        setSideBDocs([...sideBDocs, ...fileArray]);
      }
    }
  };

  const removeFile = (side: 'A' | 'B', index: number) => {
    if (side === 'A') {
      setSideADocs(sideADocs.filter((_, i) => i !== index));
    } else {
      setSideBDocs(sideBDocs.filter((_, i) => i !== index));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <FaBalanceScale className="mx-auto mb-4 text-6xl text-courtroom-accent" />
        <h1 className="mb-2 text-4xl font-bold font-legal text-courtroom-accent">
          AI Judge System
        </h1>
        <p className="text-gray-400">Submit your case for AI-powered legal analysis</p>
      </div>

      {/* Case Details */}
      <div className="p-6 card">
        <h2 className="flex items-center gap-2 mb-4 text-2xl font-semibold">
          <FaGavel className="text-courtroom-accent" />
          Case Details
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block mb-2 font-medium">Jurisdiction</label>
            <select
              className="input-field"
              value={formData.jurisdiction}
              onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
              required
            >
              {jurisdictions.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Case Type</label>
            <select
              className="input-field"
              value={formData.caseType}
              onChange={(e) => setFormData({ ...formData, caseType: e.target.value })}
              required
            >
              <option value="">Select case type</option>
              {caseTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Side A */}
      <div className="p-6 border-l-4 card border-courtroom-plaintiff">
        <h2 className="mb-4 text-2xl font-semibold text-blue-400">
          Side A - Plaintiff/Prosecution
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block mb-2 font-medium">Case Summary</label>
            <textarea
              className="textarea-field"
              placeholder="Enter a detailed summary of Side A's position..."
              value={formData.sideASummary}
              onChange={(e) => setFormData({ ...formData, sideASummary: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">Evidence</label>
            {sideAEvidence.map((evidence, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="input-field"
                  placeholder={`Evidence ${index + 1}`}
                  value={evidence}
                  onChange={(e) => updateEvidence('A', index, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeEvidence('A', index)}
                  className="px-3 py-2 bg-red-600 rounded-lg hover:bg-red-700"
                >
                  <FaTimes />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addEvidence('A')}
              className="mt-2 text-sm btn-secondary"
            >
              <FaPlus className="inline mr-2" />
              Add Evidence
            </button>
          </div>

          <div>
            <label className="block mb-2 font-medium">Upload Documents</label>
            <div className="p-4 text-center border-2 border-gray-600 border-dashed rounded-lg">
              <input
                type="file"
                id="sideADocs"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => handleFileChange('A', e.target.files)}
                className="hidden"
              />
              <label htmlFor="sideADocs" className="cursor-pointer">
                <FaFileUpload className="mx-auto mb-2 text-4xl text-gray-400" />
                <p className="text-gray-400">Click to upload PDF, Word, or text files</p>
              </label>
            </div>
            {sideADocs.length > 0 && (
              <div className="mt-2 space-y-1">
                {sideADocs.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <span className="text-sm">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile('A', index)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side B */}
      <div className="p-6 border-l-4 card border-courtroom-defendant">
        <h2 className="mb-4 text-2xl font-semibold text-red-400">
          Side B - Defendant/Defense
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block mb-2 font-medium">Case Summary</label>
            <textarea
              className="textarea-field"
              placeholder="Enter a detailed summary of Side B's position..."
              value={formData.sideBSummary}
              onChange={(e) => setFormData({ ...formData, sideBSummary: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">Evidence</label>
            {sideBEvidence.map((evidence, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="input-field"
                  placeholder={`Evidence ${index + 1}`}
                  value={evidence}
                  onChange={(e) => updateEvidence('B', index, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeEvidence('B', index)}
                  className="px-3 py-2 bg-red-600 rounded-lg hover:bg-red-700"
                >
                  <FaTimes />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addEvidence('B')}
              className="mt-2 text-sm btn-secondary"
            >
              <FaPlus className="inline mr-2" />
              Add Evidence
            </button>
          </div>

          <div>
            <label className="block mb-2 font-medium">Upload Documents</label>
            <div className="p-4 text-center border-2 border-gray-600 border-dashed rounded-lg">
              <input
                type="file"
                id="sideBDocs"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => handleFileChange('B', e.target.files)}
                className="hidden"
              />
              <label htmlFor="sideBDocs" className="cursor-pointer">
                <FaFileUpload className="mx-auto mb-2 text-4xl text-gray-400" />
                <p className="text-gray-400">Click to upload PDF, Word, or text files</p>
              </label>
            </div>
            {sideBDocs.length > 0 && (
              <div className="mt-2 space-y-1">
                {sideBDocs.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <span className="text-sm">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile('B', index)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="text-center">
        <button
          type="submit"
          disabled={loading}
          className="px-12 py-4 text-lg btn-primary"
        >
          {loading ? (
            <>
              <span className="inline-block mr-2 animate-spin">⚖️</span>
              Processing Case...
            </>
          ) : (
            <>
              <FaGavel className="inline mr-2" />
              Submit for Judgment
            </>
          )}
        </button>
      </div>
    </form>
  );
};
