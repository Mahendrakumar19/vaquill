# AI Judge - Intelligent Legal Judgment System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)

> **An AI-powered legal judgment system with FREE LLM options (Google Gemini, Groq) that provides mock trial outcomes and enables legal argumentation through advanced language models.**

📹 **[Demo Video](https://youtu.be/0CbbGfnhvjA)** - Watch a complete walkthrough and demo

> **🎬 Recording Your Demo Video**  
> Follow these steps to create your submission video:
> 1. **Screen Recording**: Use OBS Studio (free) or Windows Game Bar (Win+G)
> 2. **Duration**: Keep it under 5 minutes
> 3. **Content to Cover**:
>    - Quick code walkthrough (project structure, key files)
>    - Live demo: Submit a case, show AI judgment, demonstrate arguments
>    - Explain architecture, scaling strategy, and deployment approach
> 4. **Upload**: Upload to YouTube as **Unlisted**
> 5. **Add Link**: Replace the link above with your YouTube URL

![AI Judge Screenshot](https://via.placeholder.com/1200x600?text=AI+Judge+Interface)

## 🆓 FREE LLM Setup (No Credit Card Required!)

**This project now supports FREE AI providers!** Choose from:

### Option 1: Google Gemini (Recommended ⭐)
- ✅ **Completely FREE** - 60 requests/minute
- ✅ No credit card required
- ✅ Get key in 2 minutes: [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

### Option 2: Groq (Super Fast ⚡)
- ✅ **Completely FREE** - 30 requests/minute
- ✅ Fastest inference speed
- ✅ Get key: [console.groq.com](https://console.groq.com)

### Option 3: Ollama (100% Local 🏠)
- ✅ **Free forever** - No API needed
- ✅ Runs on your computer
- ✅ Download: [ollama.ai](https://ollama.ai)

📖 **See [FREE_LLM_SETUP.md](./FREE_LLM_SETUP.md) for detailed setup instructions**

---

## 🎯 Project Overview

AI Judge is a sophisticated legal-tech platform that simulates judicial proceedings using artificial intelligence. The system allows legal professionals, students, and researchers to:

1. **Submit cases** from both plaintiff and defendant perspectives
2. **Receive AI-generated judgments** based on jurisdiction-specific legal frameworks
3. **Engage in legal arguments** with up to 5 rounds of cross-examination
4. **Observe AI reconsideration** when compelling arguments are presented

### Key Features

- ⚖️ **Dual-Side Case Submission**: Both parties can submit evidence, documents, and legal arguments
- 🆓 **FREE AI Options**: Google Gemini, Groq, or local Ollama (no payment required!)
- 🤖 **AI-Powered Judgments**: Multi-provider support (Gemini/Claude/GPT/Groq)
- 📄 **Document Processing**: Supports PDF, Word, and text file uploads with automatic text extraction
- 💬 **Interactive Argumentation**: Post-judgment arguments with intelligent AI responses
- 🌍 **Multi-Jurisdiction Support**: Configurable for India, USA, UK, Canada, Australia, and International law
- 📊 **Confidence Scoring**: AI provides confidence levels for its decisions
- 🔄 **Caching System**: Redis-based caching for improved performance
- 📈 **Scalable Architecture**: Production-ready with Kubernetes support

---

## 🏗️ Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  • Vite + TypeScript + TailwindCSS                          │
│  • Responsive courtroom UI                                   │
│  • Real-time feedback with animations                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ REST API
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  Backend (Node.js + Express)                 │
│  • TypeScript                                                │
│  • Document Processing (PDF, Word, Text)                     │
│  • Multi-LLM Integration (Gemini/Claude/GPT/Groq)           │
│  • Rate Limiting & Security                                  │
└──────────┬─────────────┬────────────────────┬───────────────┘
           │             │                    │
           │             │                    │
    ┌──────▼────┐  ┌────▼─────┐       ┌─────▼──────────┐
    │  SQLite   │  │  Redis   │       │ Gemini/Claude  │
    │ (sql.js)  │  │  Cache   │       │   LLM APIs     │
    └───────────┘  └──────────┘       └────────────────┘
         (Optional - file-based)      (FREE Gemini/Groq)
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite (Build Tool)
- TailwindCSS (Styling)
- Framer Motion (Animations)
- Axios (HTTP Client)
- React Toastify (Notifications)

**Backend:**
- Node.js 20+ with Express
- TypeScript
- **Multi-Provider LLM Support**: Google Gemini (FREE), Groq (FREE), Claude, OpenAI
- **SQLite** via sql.js (Persistent Storage - zero setup!)
- Redis (Optional Caching Layer)
- Multer (File Uploads)
- PDF-Parse & Mammoth (Document Processing)
- Winston (Logging)
- Helmet & Rate Limiting (Security)

**Infrastructure:**
- Docker & Docker Compose
- Kubernetes (Production Deployment)
- Nginx (Reverse Proxy)
- GitHub Actions (CI/CD - optional)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** ([Download](https://nodejs.org/)) - Required
- **Google Gemini API Key** ([Get FREE key](https://makersuite.google.com/app/apikey)) ⭐ - **Recommended (FREE)**
  - OR Groq API Key ([Get FREE key](https://console.groq.com)) ⚡
  - OR Claude API Key (paid) ([console.anthropic.com](https://console.anthropic.com/))
  - OR OpenAI API Key (limited free credits) ([platform.openai.com](https://platform.openai.com/))
- **Redis 7+** ([Download](https://redis.io/download)) - Optional (for caching)

**No database installation required!** SQLite runs in-process via sql.js.

### Local Development Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-judge.git
cd ai-judge
```

#### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env and add your Gemini API key:
# GEMINI_API_KEY=your_key_here
# LLM_PROVIDER=gemini
```

**Optional: Start Redis** (for caching - skip if you don't have it):
```bash
# Windows
redis-server

# If Redis not installed, the app works fine without it!
```

**Run Backend:**
```bash
npm run dev
# Backend will start on http://localhost:3001
# SQLite database will be created automatically at backend/data/ai_judge.db
```

#### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables (optional)
cp .env.example .env

# Start development server
npm run dev
# Frontend will start on http://localhost:3000
```

#### 4. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

---

## 🐳 Docker Deployment

### Using Docker Compose (Recommended for Quick Testing)

```bash
# Create .env file in root
cp backend/.env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Build and start all services
docker-compose up --build

# Access:
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

**Stop services:**
```bash
docker-compose down

# To remove volumes (database data):
docker-compose down -v
```

---

## ☸️ Kubernetes Deployment (Production)

### Prerequisites
- Kubernetes cluster (EKS, GKE, AKS, or local Minikube)
- kubectl configured
- Docker images built and pushed to registry

### Deployment Steps

#### 1. Build and Push Images

```bash
# Build backend
cd backend
docker build -t your-registry/ai-judge-backend:latest .
docker push your-registry/ai-judge-backend:latest

# Build frontend
cd ../frontend
docker build -t your-registry/ai-judge-frontend:latest .
docker push your-registry/ai-judge-frontend:latest
```

#### 2. Configure Secrets

```bash
cd deployment/k8s

# Copy and edit secrets
cp secrets.yaml.example secrets.yaml
# Edit secrets.yaml with your actual credentials

# Apply secrets
kubectl apply -f secrets.yaml
```

#### 3. Deploy Infrastructure

```bash
# Deploy database and cache
kubectl apply -f database-deployment.yaml

# Wait for database to be ready
kubectl wait --for=condition=ready pod -l component=database --timeout=120s
```

#### 4. Deploy Application

```bash
# Deploy backend
kubectl apply -f backend-deployment.yaml

# Deploy frontend
kubectl apply -f frontend-deployment.yaml

# Deploy ingress (optional)
kubectl apply -f ingress.yaml
```

#### 5. Verify Deployment

```bash
# Check pods
kubectl get pods

# Check services
kubectl get svc

# Get frontend URL
kubectl get svc frontend-service
```

---

## 📖 Usage Guide

### 1. Create a New Case

1. Navigate to the home page
2. Fill in case details:
   - **Jurisdiction**: Select the legal system (India, USA, UK, etc.)
   - **Case Type**: Choose from Civil, Criminal, Constitutional, etc.

3. **Side A (Plaintiff/Prosecution)**:
   - Enter case summary
   - Add evidence points
   - Upload supporting documents (PDF, Word, Text)

4. **Side B (Defendant/Defense)**:
   - Enter case summary
   - Add evidence points
   - Upload supporting documents

5. Click "Submit for Judgment"

### 2. Review Judgment

The AI Judge will analyze the case and provide:
- **Verdict**: Clear decision statement
- **Legal Reasoning**: Detailed explanation
- **Legal Basis**: Relevant laws, acts, and precedents
- **Confidence Level**: AI's confidence in the decision (0-100%)

### 3. Submit Arguments

After receiving the judgment:
1. Click "Proceed to Arguments"
2. Use the dual-panel interface:
   - **Left Panel**: Side A arguments
   - **Center**: AI Judge
   - **Right Panel**: Side B arguments
3. Submit arguments (max 5 total across both sides)
4. Review AI responses and potential reconsiderations

---

## 🔧 Configuration

### Backend Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 3001 | No |
| `ANTHROPIC_API_KEY` | Claude API key | - | Yes |
| `DB_HOST` | PostgreSQL host | localhost | No |
| `DB_PORT` | PostgreSQL port | 5432 | No |
| `DB_NAME` | Database name | ai_judge | No |
| `DB_USER` | Database user | postgres | No |
| `DB_PASSWORD` | Database password | - | Yes |
| `REDIS_HOST` | Redis host | localhost | No |
| `REDIS_PORT` | Redis port | 6379 | No |
| `DEFAULT_JURISDICTION` | Default jurisdiction | INDIA | No |
| `MAX_FILE_SIZE` | Max upload size (bytes) | 10485760 | No |

### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | http://localhost:3001/api |

---

## 📊 Scalability Strategy

### Horizontal Scaling

**Backend Pods:**
- Configured with Horizontal Pod Autoscaler (HPA)
- Scales from 3 to 10 replicas based on CPU/memory
- Stateless design allows infinite horizontal scaling

**Database:**
- PostgreSQL with connection pooling (max 20 connections per instance)
- For 1000s of users: Implement read replicas
- Consider PostgreSQL partitioning for case history

**Caching:**
- Redis caching for repeated judgments
- TTL: 1 hour for judgment cache
- Can deploy Redis Cluster for high availability

### Performance Optimization

1. **API Level**:
   - Rate limiting: 100 requests per 15 minutes per IP
   - Response compression with gzip
   - Request validation to prevent unnecessary processing

2. **Database**:
   - Indexed queries on `case_id`, `status`
   - Connection pooling
   - Prepared statements to prevent SQL injection

3. **Caching Strategy**:
   - **L1 Cache**: In-memory (application level)
   - **L2 Cache**: Redis (distributed)
   - **Cache Keys**: SHA-256 hash of case data
   - **Invalidation**: On judgment updates/reconsideration

4. **Frontend**:
   - Code splitting with Vite
   - Lazy loading components
   - Asset optimization (1-year cache for static files)
   - CDN distribution (Cloudflare/AWS CloudFront)

### Load Testing

Expected capacity (per backend instance):
- **50 concurrent users**
- **10 judgments/minute** (LLM rate limit dependent)
- **100 API requests/second**

For 10,000 daily active users:
- 10-15 backend replicas (with bursting)
- PostgreSQL with 2 read replicas
- Redis cluster (3 nodes)

---

## 🛡️ Security

### Implemented Measures

1. **API Security**:
   - Helmet.js for security headers
   - Rate limiting per IP
   - Input validation and sanitization
   - CORS configuration

2. **Data Protection**:
   - Environment variable management
   - Kubernetes secrets for sensitive data
   - PostgreSQL SSL connections (production)

3. **File Uploads**:
   - File type validation
   - Size limits (10MB default)
   - Virus scanning recommended for production

4. **Secrets Management** (Production):
   - AWS Secrets Manager
   - Azure Key Vault
   - Google Cloud Secret Manager
   - HashiCorp Vault

---

## 🌐 Deployment Platforms

### AWS (Recommended)

**Services:**
- **EKS**: Kubernetes cluster
- **RDS PostgreSQL**: Managed database
- **ElastiCache Redis**: Managed cache
- **ALB**: Application Load Balancer
- **S3**: Document storage
- **CloudWatch**: Logging and monitoring
- **Secrets Manager**: Credentials management
- **CloudFront**: CDN for frontend

**Estimated Monthly Cost** (1000 users):
- EKS: $72 (cluster) + $150 (3 t3.medium nodes)
- RDS: $50 (db.t3.small)
- ElastiCache: $15 (cache.t3.micro)
- **Total: ~$290/month**

### Azure

- **AKS**: Kubernetes
- **Azure Database for PostgreSQL**
- **Azure Cache for Redis**
- **Azure Key Vault**
- **Application Insights**

### GCP

- **GKE**: Kubernetes
- **Cloud SQL**: PostgreSQL
- **Memorystore**: Redis
- **Cloud CDN**
- **Cloud Monitoring**

---

## 📈 Monitoring & Observability

### Logging
- **Winston** for structured logging
- Log levels: error, warn, info, debug
- Log rotation and retention policies

### Metrics (Recommended)
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **Key Metrics**:
  - Request latency (P50, P95, P99)
  - Error rates
  - LLM API response times
  - Database query performance
  - Cache hit rates

### Telemetry
- **OpenTelemetry**: Distributed tracing
- **Jaeger/Zipkin**: Trace visualization
- **Sentry**: Error tracking

---

##  💡 Product Innovations & Improvements

### Current Innovation Points

1. **Intelligent Reconsideration**: AI can change its verdict when presented with compelling arguments
2. **Multi-Jurisdiction Support**: Adapts legal reasoning to different legal systems
3. **Document Intelligence**: Automatic extraction from legal documents
4. **Confidence Scoring**: Transparent AI decision-making
5. **Argument History**: Complete audit trail of legal arguments

### Future Enhancements

#### Phase 1 (3 months)
- [ ] **Precedent Database**: Integration with real case law databases
- [ ] **Multi-Language Support**: Support for regional languages
- [ ] **Voice Input**: Speech-to-text for arguments
- [ ] **Case Templates**: Pre-built templates for common case types

#### Phase 2 (6 months)
- [ ] **AI Lawyer Assistance**: AI suggests counter-arguments
- [ ] **Case Similarity Search**: Find similar past cases
- [ ] **Legal Citation Generator**: Auto-generate proper citations
- [ ] **Expert Witness Simulation**: AI-powered expert testimonies

#### Phase 3 (12 months)
- [ ] **Multi-Judge Panel**: Simulate 3-judge benches
- [ ] **Jury Simulation**: Add jury deliberation (for applicable jurisdictions)
- [ ] **Real-Time Collaboration**: Multiple lawyers working on same case
- [ ] **Blockchain Evidence**: Immutable evidence storage
- [ ] **AI Mediation**: Suggest settlement options

### Product Monetization Strategy

1. **Freemium Model**:
   - Free: 5 cases/month
   - Pro: Unlimited cases ($29/month)
   - Enterprise: Custom pricing

2. **Target Markets**:
   - Law schools (educational licensing)
   - Law firms (training & mock trials)
   - Individual lawyers (case preparation)
   - Legal aid organizations

3. **B2B Opportunities**:
   - White-label solutions for legal tech companies
   - API access for legal research platforms
   - Integration with case management systems

---

## 🏛️ Impact on Judicial Systems

### For India

1. **Legal Education**: 
   - Democratizes access to legal learning
   - Helps law students understand judicial reasoning
   - Reduces dependency on expensive mock trial programs

2. **Access to Justice**:
   - Provides preliminary legal opinions for underserved populations
   - Helps individuals understand legal standing before filing
   - Reduces frivolous litigation

3. **Judicial Efficiency**:
   - Can assist judges with legal research
   - Provides baseline analysis for routine cases
   - Frees up judicial time for complex matters

4. **Legal Literacy**:
   - Educates citizens about legal processes
   - Increases understanding of rights and obligations
   - Promotes informed legal decision-making

### International Applications

- **Common Law Systems**: Easy adaptation for UK, USA, Canada, Australia
- **Civil Law Systems**: Can be trained on European legal codes
- **Hybrid Systems**: Supports jurisdictions mixing both approaches
- **Dispute Resolution**: Alternative to expensive arbitration

### Ethical Considerations

⚠️ **Important Disclaimers**:
- This system is for **educational and mock trial purposes only**
- Not a substitute for qualified legal counsel
- AI judgments should not be cited in real legal proceedings
- Human review and oversight are essential
- Bias detection and mitigation are ongoing priorities

---

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
npm test
```

### Run Frontend Tests
```bash
cd frontend
npm test
```

### Integration Testing
```bash
# Start all services
docker-compose up -d

# Run integration tests
npm run test:integration
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style
- Follow TypeScript best practices
- Use ESLint and Prettier
- Write meaningful commit messages
- Add tests for new features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/mahendrakumar19)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/mahendrakumar19)
- Email: mahendrakumaruohyd@gmail.com

---

## 🙏 Acknowledgments

- **Anthropic** for the Claude AI API
- **Open Source Community** for the amazing tools and libraries
- **Legal Professionals** who provided domain expertise
- **Vaquill** for the internship opportunity

**Made with ⚖️ for justice and ❤️ for technology**
