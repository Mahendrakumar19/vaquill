# 🚀 Production Deployment Guide

## Table of Contents
1. [Deployment Platforms](#deployment-platforms)
2. [Scaling for 1000s of Users](#scaling-strategy)
3. [Caching Strategy](#caching-strategy)
4. [Secrets Management](#secrets-management)
5. [Monitoring & Telemetry](#monitoring--telemetry)
6. [Kubernetes Deployment](#kubernetes-deployment)
7. [Cost Estimation](#cost-estimation)

---

## 🌐 Deployment Platforms

### Option 1: AWS (Recommended)

**Services Used:**
- **EKS (Elastic Kubernetes Service)**: Container orchestration
- **RDS PostgreSQL** (Optional - if scaling beyond SQLite): Managed database
- **ElastiCache Redis**: Caching layer
- **S3**: Document storage for uploaded files
- **ALB (Application Load Balancer)**: Traffic distribution
- **CloudWatch**: Logging and monitoring
- **Secrets Manager**: API keys and credentials
- **CloudFront**: CDN for frontend assets

**Why AWS?**
- Mature ecosystem with extensive documentation
- Strong compliance certifications (important for legal data)
- Good global presence for multi-region deployments
- Cost-effective for startups with free tier

### Option 2: Google Cloud Platform (GCP)

**Services Used:**
- **GKE (Google Kubernetes Engine)**: Container orchestration
- **Cloud SQL**: Managed PostgreSQL
- **Memorystore**: Redis caching
- **Cloud Storage**: Document storage
- **Cloud Load Balancing**: Traffic distribution
- **Cloud Logging & Monitoring**: Observability
- **Secret Manager**: Credentials management
- **Cloud CDN**: Content delivery

**Why GCP?**
- Excellent for AI/ML workloads (Gemini API integration)
- Competitive pricing with sustained use discounts
- Better integration with Google AI services

### Option 3: Azure

**Services Used:**
- **AKS (Azure Kubernetes Service)**
- **Azure Database for PostgreSQL**
- **Azure Cache for Redis**
- **Azure Blob Storage**
- **Application Gateway**
- **Azure Monitor**
- **Azure Key Vault**
- **Azure CDN**

**Why Azure?**
- Strong enterprise support
- Good compliance for legal tech
- Hybrid cloud capabilities

---

## 📈 Scaling Strategy

### Architecture for 1000s of Users

```
                         ┌─────────────────────┐
                         │   CloudFront CDN    │
                         │  (Frontend Assets)  │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │  Load Balancer (ALB)│
                         └──────────┬──────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
   ┌────▼─────┐              ┌─────▼──────┐            ┌──────▼────┐
   │ Backend  │              │  Backend   │            │  Backend  │
   │  Pod 1   │              │   Pod 2    │   ...      │  Pod N    │
   └────┬─────┘              └─────┬──────┘            └──────┬────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
             ┌──────▼──────┐  ┌────▼─────┐  ┌─────▼──────┐
             │   Redis     │  │ SQLite → │  │   LLM APIs │
             │   Cluster   │  │ Postgres │  │  (Gemini)  │
             │  (3 nodes)  │  │ (scaled) │  └────────────┘
             └─────────────┘  └──────────┘
```

### Horizontal Scaling Configuration

**Backend Pods:**
```yaml
# Kubernetes HPA (Horizontal Pod Autoscaler)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 60
```

### Capacity Planning

**For 10,000 Daily Active Users:**

| Component | Specification | Quantity | Reasoning |
|-----------|--------------|----------|-----------|
| Backend Pods | 2 vCPU, 4GB RAM | 10-15 pods | ~50 concurrent users per pod |
| Load Balancer | ALB/NLB | 1 | Auto-scales with traffic |
| Redis Cache | 8GB RAM | 3 nodes (cluster) | Cache judgments, 1hr TTL |
| Database | db.t3.medium | 1 primary + 2 read replicas | If using PostgreSQL |
| S3/Storage | Unlimited | N/A | Documents storage |
| CDN | Global | 1 distribution | Frontend assets |

**Expected Performance:**
- **Response Time**: < 2 seconds for cached judgments
- **Throughput**: 100-200 requests/second
- **LLM Latency**: 5-15 seconds (Gemini API dependent)
- **Availability**: 99.9% uptime (3-nines SLA)

---

## 💾 Caching Strategy

### Multi-Layer Caching

**Layer 1: Application Memory (In-Process)**
```typescript
// Simple in-memory LRU cache
const judgmentCache = new Map<string, Judgment>();
const CACHE_SIZE = 100;

function getCachedJudgment(caseHash: string): Judgment | null {
  return judgmentCache.get(caseHash) || null;
}
```
- **TTL**: 5 minutes
- **Size**: 100 most recent judgments per pod
- **Use Case**: Repeated identical queries

**Layer 2: Redis (Distributed)**
```typescript
// Current implementation
await cacheService.set(cacheKey, judgment, 3600); // 1 hour
```
- **TTL**: 1 hour for judgments
- **Eviction**: LRU (Least Recently Used)
- **Use Case**: Shared across all backend pods

**Layer 3: CDN (CloudFront/Cloud CDN)**
- **Assets**: Frontend JS/CSS bundles
- **TTL**: 1 year for hashed assets, 5 minutes for HTML
- **Use Case**: Static assets and API responses (if cacheable)

### Cache Invalidation Strategy

```typescript
// Invalidate on judgment update
async function updateJudgment(caseId: string, newReasoning: string) {
  // 1. Update database
  await databaseService.saveJudgment(...);
  
  // 2. Invalidate Redis cache
  const cacheKey = cacheService.generateCaseKey({ caseId });
  await cacheService.delete(cacheKey);
  
  // 3. Broadcast invalidation to all pods (if using in-memory cache)
  await pubsub.publish('cache-invalidate', { cacheKey });
}
```

### Cache Hit Rate Targets

| Cache Layer | Target Hit Rate | Current Implementation |
|-------------|----------------|------------------------|
| In-Memory | 60-70% | Not implemented (future) |
| Redis | 40-50% | ✅ Implemented |
| CDN | 90%+ | Ready for CloudFront |

---

## 🔐 Secrets Management

### AWS Secrets Manager

**Setup:**
```bash
# Create secret for Gemini API key
aws secretsmanager create-secret \
  --name ai-judge/gemini-api-key \
  --secret-string "AIzaSyCPTsmBnXHTYe9JUJGtG_di6u7spMOkti4"

# Create secret for database credentials (if using PostgreSQL)
aws secretsmanager create-secret \
  --name ai-judge/db-credentials \
  --secret-string '{"username":"postgres","password":"your_password"}'
```

**Kubernetes Integration:**
```yaml
# Use External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: backend-sa
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: ai-judge-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets
    kind: SecretStore
  target:
    name: ai-judge-secrets
  data:
  - secretKey: GEMINI_API_KEY
    remoteRef:
      key: ai-judge/gemini-api-key
```

### Google Cloud Secret Manager

```bash
# Create secret
gcloud secrets create gemini-api-key \
  --data-file=- <<< "AIzaSyCPTsmBnXHTYe9JUJGtG_di6u7spMOkti4"

# Grant access to service account
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:ai-judge@project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Environment-Specific Secrets

```yaml
# Production secrets
apiVersion: v1
kind: Secret
metadata:
  name: ai-judge-prod-secrets
  namespace: production
type: Opaque
data:
  GEMINI_API_KEY: <base64-encoded>
  JWT_SECRET: <base64-encoded>
  REDIS_PASSWORD: <base64-encoded>
---
# Staging secrets
apiVersion: v1
kind: Secret
metadata:
  name: ai-judge-staging-secrets
  namespace: staging
type: Opaque
data:
  GEMINI_API_KEY: <base64-encoded-different-key>
```

---

## 📊 Monitoring & Telemetry

### Logging with Winston + CloudWatch

**Current Implementation:**
```typescript
// backend/src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'ai-judge' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
```

**Production Enhancement:**
```typescript
import CloudWatchTransport from 'winston-cloudwatch';

if (process.env.NODE_ENV === 'production') {
  logger.add(new CloudWatchTransport({
    logGroupName: '/aws/ecs/ai-judge',
    logStreamName: `backend-${process.env.POD_NAME}`,
    awsRegion: 'us-east-1',
    jsonMessage: true,
  }));
}
```

### Metrics with Prometheus

**Add Prometheus Client:**
```bash
npm install prom-client
```

**Implement Metrics:**
```typescript
// backend/src/utils/metrics.ts
import client from 'prom-client';

const register = new client.Registry();

// Default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const llmApiCalls = new client.Counter({
  name: 'llm_api_calls_total',
  help: 'Total LLM API calls',
  labelNames: ['provider', 'status'],
  registers: [register],
});

export const cacheHitRate = new client.Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate percentage',
  registers: [register],
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Distributed Tracing with OpenTelemetry

```bash
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: 'http://jaeger:14268/api/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

### Dashboards

**Key Metrics to Monitor:**
1. **API Performance**:
   - Request latency (P50, P95, P99)
   - Error rate
   - Requests per second

2. **LLM Metrics**:
   - Gemini API response time
   - API error rate
   - Token usage (cost tracking)

3. **Database**:
   - Query latency
   - Connection pool usage
   - Slow queries

4. **Cache**:
   - Hit rate
   - Eviction rate
   - Memory usage

5. **System**:
   - CPU usage
   - Memory usage
   - Pod restart count

---

## ☸️ Kubernetes Deployment

### Complete K8s Manifests

**Namespace:**
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ai-judge
```

**ConfigMap:**
```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
  namespace: ai-judge
data:
  PORT: "3001"
  NODE_ENV: "production"
  LLM_PROVIDER: "gemini"
  DEFAULT_JURISDICTION: "INDIA"
  MAX_FILE_SIZE: "10485760"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  LOG_LEVEL: "info"
```

**Backend Deployment:**
```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: ai-judge
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      serviceAccountName: backend-sa
      containers:
      - name: backend
        image: your-registry/ai-judge-backend:latest
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: backend-config
        - secretRef:
            name: ai-judge-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: data
          mountPath: /app/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: backend-data-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: ai-judge
spec:
  selector:
    app: backend
  ports:
  - protocol: TCP
    port: 3001
    targetPort: 3001
  type: ClusterIP
```

**Frontend Deployment:**
```yaml
# frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: ai-judge
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/ai-judge-frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: ai-judge
spec:
  selector:
    app: frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: LoadBalancer
```

**Redis Deployment:**
```yaml
# redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: ai-judge
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: ai-judge
spec:
  selector:
    app: redis
  ports:
  - protocol: TCP
    port: 6379
    targetPort: 6379
  type: ClusterIP
```

**Ingress (with SSL):**
```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ai-judge-ingress
  namespace: ai-judge
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - ai-judge.example.com
    secretName: ai-judge-tls
  rules:
  - host: ai-judge.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 3001
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```

---

## 💰 Cost Estimation

### AWS Deployment (10,000 Daily Active Users)

| Service | Specification | Monthly Cost |
|---------|--------------|--------------|
| **EKS Cluster** | Control plane | $72 |
| **EC2 Instances** | 3x t3.medium (backend) | $90 |
| **ElastiCache Redis** | cache.t3.small | $25 |
| **S3** | 100GB storage + requests | $5 |
| **ALB** | Load balancer | $20 |
| **CloudWatch** | Logs + metrics | $15 |
| **Data Transfer** | 1TB/month | $90 |
| **Gemini API** | FREE (60 RPM) | $0 |
| **CloudFront CDN** | 1TB transfer | $85 |
| **Secrets Manager** | 5 secrets | $2 |
| **Total** | | **~$404/month** |

**Cost Optimization:**
- Use Spot Instances for non-critical workloads (-60% cost)
- Reserved Instances for predictable loads (-30% cost)
- S3 Intelligent Tiering for documents
- CloudFront caching to reduce origin requests

### Scaling Costs

| Users | Monthly Cost | Cost per User |
|-------|--------------|---------------|
| 1,000 | $150 | $0.15 |
| 10,000 | $404 | $0.04 |
| 100,000 | $1,800 | $0.018 |
| 1,000,000 | $12,000 | $0.012 |

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Set up CI/CD pipeline (GitHub Actions / GitLab CI)
- [ ] Configure secrets in AWS Secrets Manager
- [ ] Set up monitoring (CloudWatch + Prometheus)
- [ ] Configure DNS and SSL certificates
- [ ] Test database migrations
- [ ] Load test with expected traffic

### Deployment
- [ ] Build and push Docker images
- [ ] Apply Kubernetes manifests
- [ ] Verify pods are running
- [ ] Test health endpoints
- [ ] Smoke test critical flows
- [ ] Monitor error logs

### Post-Deployment
- [ ] Set up alerts (PagerDuty / Opsgenie)
- [ ] Document runbooks for common issues
- [ ] Schedule backup jobs
- [ ] Configure log retention policies
- [ ] Review and optimize costs

---

## 📞 Support Contacts

**DevOps Team**: devops@example.com  
**On-Call**: +1-XXX-XXX-XXXX  
**Incident Channel**: #ai-judge-incidents (Slack)

---

**Last Updated**: November 14, 2025
