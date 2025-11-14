# Real-Time Fact-Checking Feature

## Overview
This feature provides real-time validation of legal arguments against submitted evidence documents, helping users catch factual errors, inconsistencies, and unsupported claims **as they type**.

## Why This Feature?

### Problem It Solves
1. **Factual Errors**: Users claim amounts/dates not in evidence
2. **Inconsistencies**: Arguments contradict submitted documents  
3. **Missing Evidence**: Claims lack supporting documentation
4. **Quality Issues**: Weak arguments reduce case strength

### Business Impact
- **User Experience**: Prevents submission of flawed arguments
- **AI Accuracy**: Better inputs → Better judgments
- **Legal Education**: Real-time feedback teaches users
- **Differentiation**: Unique feature (like Grammarly for legal claims)

## Architecture

### Backend Components

#### 1. **FactCheckService** (`backend/src/services/factCheckService.ts`)
```typescript
// Extract structured facts from documents
extractFactsFromDocument(documentText: string): Promise<DocumentFacts>

// Validate argument in real-time
validateArgumentRealTime(argument: string, documentFacts: DocumentFacts)

// Check individual claims
checkClaim(claim: string, documentFacts: DocumentFacts)
```

**How it works:**
- Uses Gemini LLM to extract dates, amounts, names, locations from documents
- Compares argument claims against extracted facts
- Returns validation with confidence scores (0-100)

#### 2. **API Routes** (`backend/src/routes/factCheckRoutes.ts`)
```
POST /api/fact-check/extract     - Extract facts from document
POST /api/fact-check/validate    - Validate argument
POST /api/fact-check/claim       - Check specific claim
```

### Frontend Components

#### 1. **FactCheckTextarea** (`frontend/src/components/FactCheckTextarea.tsx`)
Smart textarea with real-time validation:
- **Debounced validation**: Waits 1 second after user stops typing
- **Visual feedback**: Red/yellow/green borders based on score
- **Issue highlighting**: Shows specific problems with suggestions
- **Score bar**: Live accuracy score (0-100%)

#### 2. **API Client** (`frontend/src/api/factCheck.ts`)
```typescript
extractFacts(documentText: string)
validateArgument(argument: string, documentFacts: DocumentFacts)
checkClaim(claim: string, documentFacts: DocumentFacts)
```

## User Flow

### 1. **Case Submission**
```
User uploads documents → Backend extracts text → LLM extracts facts
{
  dates: ["01/01/2024", "15/03/2024"],
  amounts: ["₹50,000", "₹45,000"],
  names: ["ABC Corp", "John Doe"],
  locations: ["Mumbai", "Bangalore"]
}
```

### 2. **Argument Typing**
```
User types: "The contract was signed on 01/02/2024 for ₹60,000"
              ↓
After 1 second (debounce) → Send to fact-check API
              ↓
LLM checks: Date not in evidence, Amount mismatch
              ↓
Return issues with suggestions
```

### 3. **Real-Time Feedback**
```
⚠️ Factual Error (Confidence: 85%)
Claim: "contract was signed on 01/02/2024"
Issue: Document shows dates 01/01/2024 and 15/03/2024, not 01/02/2024
💡 Suggestion: "Verify the contract date from your documents"
```

## Technical Considerations

### 1. **Performance**
- **Debouncing**: 1-second delay prevents excessive API calls
- **Token limits**: Only first 3000 chars of document analyzed
- **Batch checks**: Max 5 claims per argument (speed vs accuracy)

### 2. **LLM Provider**
Currently **Gemini-only** for fact-checking:
```typescript
// Why Gemini?
- FREE tier (60 req/min)
- Fast responses (~2-3 seconds)
- Good JSON parsing
- Long context window (32K tokens)
```

**To add other providers:**
```typescript
// In factCheckService.ts, add cases:
case 'claude':
  const claudeModel = llmService['claudeClient']!.messages;
  // ... implement Claude logic
  break;
case 'openai':
  // ... implement OpenAI logic
  break;
```

### 3. **Error Handling**
Fallback strategy:
```typescript
try {
  // Attempt fact check
} catch (error) {
  // Fallback: assume valid but low confidence
  return { isValid: true, confidence: 30, category: 'valid' };
}
```
**Why?** Better to let user proceed than block them on API errors.

### 4. **JSON Parsing**
Challenge: LLMs sometimes return markdown-wrapped JSON
```typescript
// Solution: Strip markdown
jsonText = response.trim()
  .replace(/```json\n?/g, '')
  .replace(/```\n?/g, '');
JSON.parse(jsonText);
```

### 5. **Confidence Scoring**
```typescript
overallScore = average(all_claim_confidences)

if (score >= 80) → Green (high quality)
if (score >= 60) → Yellow (needs review)  
if (score < 60)  → Red (major issues)
```

## Integration Guide

### Step 1: Update CaseForm to Extract Facts
```typescript
// In CaseForm.tsx
const [documentFacts, setDocumentFacts] = useState<DocumentFacts | null>(null);

// After document upload:
const text = await extractTextFromFile(file);
const facts = await extractFacts(text);
setDocumentFacts(facts);
```

### Step 2: Replace Textarea in ArgumentPanel
```typescript
// Before:
<textarea value={argument} onChange={...} />

// After:
<FactCheckTextarea 
  argument={argument}
  documentFacts={documentFacts}
  onArgumentChange={setArgument}
/>
```

### Step 3: Pass Facts Through State
```typescript
// App.tsx
const [documentFacts, setDocumentFacts] = useState<DocumentFacts | null>(null);

// Pass to CaseForm:
<CaseForm onFactsExtracted={setDocumentFacts} />

// Pass to ArgumentPanel:
<ArgumentPanel documentFacts={documentFacts} />
```

## Testing

### Manual Test Cases

#### Test 1: Date Mismatch
```
Document: "Agreement dated 01/01/2024"
Argument: "The contract was signed on 01/02/2024"
Expected: ❌ Factual Error - Date not in evidence
```

#### Test 2: Amount Mismatch
```
Document: "Total payment: ₹50,000"
Argument: "I paid ₹60,000 as per contract"
Expected: ❌ Inconsistency - Amount mismatch
```

#### Test 3: Missing Evidence
```
Document: [No mention of delivery date]
Argument: "Goods were delivered on 15/03/2024"
Expected: ⚠️ Missing Evidence - No delivery date in docs
```

#### Test 4: Valid Claim
```
Document: "Signed by John Doe on 01/01/2024 for ₹50,000"
Argument: "John Doe signed the contract on 01/01/2024 for ₹50,000"
Expected: ✅ Valid (Confidence: 95%)
```

### API Testing
```bash
# Extract facts
curl -X POST http://localhost:3001/api/fact-check/extract \
  -H "Content-Type: application/json" \
  -d '{"documentText": "Contract signed on 01/01/2024 for Rs 50,000 by John Doe"}'

# Validate argument
curl -X POST http://localhost:3001/api/fact-check/validate \
  -H "Content-Type: application/json" \
  -d '{
    "argument": "I claim the contract was for Rs 60,000",
    "documentFacts": {
      "dates": ["01/01/2024"],
      "amounts": ["Rs 50,000"],
      "names": ["John Doe"],
      "locations": [],
      "rawText": "Contract summary..."
    }
  }'
```

## Limitations & Future Enhancements

### Current Limitations
1. **Gemini-only**: Other LLM providers not yet supported
2. **Simple claim extraction**: Splits by sentences (can miss complex claims)
3. **No multi-language**: English only
4. **Basic entity extraction**: Doesn't handle complex legal terms

### Future Enhancements

#### 1. **Advanced NLP**
```typescript
// Use spaCy for Named Entity Recognition
import spacy from 'spacy-js';

const extractEntities = (text: string) => {
  const nlp = spacy.load('en_core_web_sm');
  const doc = nlp(text);
  
  return {
    dates: doc.ents.filter(e => e.label_ === 'DATE'),
    money: doc.ents.filter(e => e.label_ === 'MONEY'),
    persons: doc.ents.filter(e => e.label_ === 'PERSON'),
    orgs: doc.ents.filter(e => e.label_ === 'ORG')
  };
};
```

#### 2. **Contradiction Detection**
```typescript
// Use embeddings to find contradictions
import { GoogleGenerativeAI } from '@google/generative-ai';

const checkContradiction = async (claim1: string, claim2: string) => {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  
  const embedding1 = await model.embedContent(claim1);
  const embedding2 = await model.embedContent(claim2);
  
  const similarity = cosineSimilarity(embedding1, embedding2);
  
  if (similarity < 0.3) return 'CONTRADICTION';
  if (similarity > 0.7) return 'CONSISTENT';
  return 'UNCLEAR';
};
```

#### 3. **Legal Precedent Cross-Reference**
```typescript
// Check if claim aligns with case law
const checkAgainstPrecedents = async (claim: string) => {
  // Query Indian Kanoon API
  const relevantCases = await indianKanoonAPI.search(claim);
  
  // Check if claim is legally sound
  return {
    supported: true/false,
    precedents: ['Case A', 'Case B'],
    recommendation: 'Your claim is supported by XYZ v. ABC (2023)'
  };
};
```

#### 4. **Confidence Explanation**
```typescript
// Why is confidence 72%?
{
  "confidence": 72,
  "breakdown": {
    "date_match": 95,
    "amount_match": 50, // ← This lowered score
    "name_match": 100,
    "context_match": 60
  },
  "recommendation": "Review the amount - document shows ₹50K but claim says ₹60K"
}
```

## Performance Metrics

### Target Benchmarks
- **Response time**: < 3 seconds (95th percentile)
- **Accuracy**: > 85% precision on factual errors
- **API success rate**: > 99%
- **False positives**: < 10%

### Monitoring
```typescript
// Add to logger
logger.info('Fact check completed', {
  duration: endTime - startTime,
  claimCount: claims.length,
  issuesFound: issues.length,
  overallScore: score
});
```

## Cost Analysis

### Gemini API Costs (FREE tier)
- **Free quota**: 60 requests/minute
- **Token usage**: ~500 tokens per fact-check
- **Cost if paid**: $0.00025 per request (after free tier)

### Monthly Cost Estimate
```
1,000 users × 10 arguments/user × 1 fact-check/argument
= 10,000 fact-checks/month
= $2.50/month (negligible)
```

**Recommendation**: Start with Gemini FREE tier, switch to paid only if >60 req/min.

## Security & Privacy

### Data Handling
- ✅ **No PII storage**: Facts extracted, not stored
- ✅ **Ephemeral processing**: Validation happens in-memory
- ✅ **Encrypted transit**: HTTPS for all API calls

### DPDP Compliance
```typescript
// Anonymize before logging
logger.info('Fact check', {
  userId: hashUserId(userId), // Hashed, not raw
  claimLength: claim.length,  // Metadata only
  issueCount: issues.length
});
// ❌ Never log: claim text, document content, user identity
```

## Conclusion

Real-time fact-checking is a **killer feature** that:
1. ✅ Improves argument quality (better AI judgments)
2. ✅ Educates users (learn as they type)
3. ✅ Differentiates product (competitors don't have this)
4. ✅ Prevents errors (saves time + embarrassment)

**This turns AI Judge from a "judgment tool" into a "legal intelligence assistant".**

---

**Next Steps:**
1. ✅ Backend implemented (factCheckService + routes)
2. ✅ Frontend component built (FactCheckTextarea)
3. ⏳ Integration with CaseForm (extract facts on upload)
4. ⏳ User testing with real cases
5. ⏳ Add support for Claude/OpenAI providers
