import { KnowledgeDocument, KnowledgeCategory } from '../../types';
import { RAGEngine } from '../rag/ragEngine';

const STORAGE_KEY = 'nexora_knowledge_documents_v1';

const DEFAULT_SAMPLE_DOCS: KnowledgeDocument[] = [
  {
    id: 'sample-resume-senior-eng',
    title: 'Senior Software Engineer Resume (Sample)',
    category: 'resume',
    rawContent: `# Alex Vance - Senior Distributed Systems & Full-Stack Engineer
Email: alex.vance@example.com | GitHub: github.com/alexvance | Location: San Francisco, CA

## Summary
Senior Software Engineer with 6+ years of experience designing high-throughput distributed microservices, low-latency APIs, and real-time streaming architectures. Proven track record scaling systems from 10k to 10M+ daily active users, optimizing database indexing, and mentoring engineering teams.

## Experience

### Senior Backend Engineer | CloudScale Tech (2022 - Present)
- Architected a distributed real-time event processing pipeline using Apache Kafka, Go, and Redis Cluster, handling over 250,000 events/sec with sub-35ms p99 latency.
- Led migration of monolithic billing service into decoupled gRPC microservices on Kubernetes (EKS), reducing deployment failure rate by 65% and improving p95 response time from 420ms to 85ms.
- Designed automated database partitioning and caching strategies in PostgreSQL and Redis, saving $140,000/year in AWS RDS infrastructure costs.
- Championed zero-downtime database schema migrations and established end-to-end distributed tracing using OpenTelemetry and Jaeger.

### Software Engineer | NexaCorp Solutions (2019 - 2022)
- Built customer-facing dashboard and collaboration features using React, TypeScript, GraphQL, and Node.js serving 1.5M monthly active users.
- Designed a distributed rate-limiting middleware using Redis Token Bucket algorithm that prevented API DDoS attacks and reduced malicious bot traffic by 92%.
- Improved automated test coverage from 44% to 88% across core services using Jest and Cypress.

## Core Technical Skills
- Languages: Go, Python, TypeScript/JavaScript, Java, SQL, Rust (basic)
- Distributed Systems & Cloud: Apache Kafka, RabbitMQ, Docker, Kubernetes, AWS (S3, EKS, DynamoDB, SQS), gRPC, Redis
- Databases: PostgreSQL, MongoDB, Redis, Elasticsearch
- Practices: System Architecture, Microservices, CI/CD, Observability (Prometheus, Grafana), STAR Behavioral Leadership`,
    chunks: [],
    isActive: true,
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5,
    tags: ['Resume', 'Go', 'Distributed Systems', 'Kafka'],
    fileType: 'markdown',
    summary: 'Sample production resume highlighting Kafka, Go microservices, and Kubernetes scaling.'
  },
  {
    id: 'sample-star-behavioral-stories',
    title: 'STAR Behavioral Leadership & Crisis Stories (Sample)',
    category: 'behavioral',
    rawContent: `# STAR Interview Case Studies & Past Challenges

## Story 1: Production Outage & Zero-Downtime Incident Response
- Situation: During Black Friday peak traffic, our core checkout database hit 100% CPU utilization due to an un-indexed lock contention on the orders table.
- Task: As the on-call lead, I had to prevent cascading downtime across the payments cluster without losing in-flight customer orders.
- Action: I immediately engaged our incident commander protocol, isolated read-heavy queries to replica instances, throttled non-critical telemetry endpoints via dynamic feature flags, and deployed a hotfix database index concurrently with zero customer downtime.
- Result: Recovered full system health in under 18 minutes with 0 dropped financial transactions. Conducted a blame-free post-mortem and instituted mandatory query performance testing in CI.

## Story 2: Resolving Engineering Disagreements on Architecture
- Situation: Team was split 50/50 between rewriting a legacy pipeline in Rust vs continuing with optimized Go microservices for a new high-throughput telemetry service.
- Task: Needed to align the team quickly to meet a strict Q3 customer delivery deadline.
- Action: Organized a time-boxed 2-day proof-of-concept bakeoff measuring developer velocity, binary footprint, concurrency memory overhead, and maintainability across the whole team.
- Result: Data showed Go met our 20ms p99 SLA while reducing onboarding time for junior engineers. The team unanimously committed to the Go architecture and delivered 2 weeks ahead of schedule.`,
    chunks: [],
    isActive: true,
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
    tags: ['STAR', 'Leadership', 'Incident Management'],
    fileType: 'markdown',
    summary: 'Key behavioral STAR scenarios for conflict resolution and high-stakes production outages.'
  }
];

// Initialize chunks for default sample docs
DEFAULT_SAMPLE_DOCS.forEach(doc => {
  doc.chunks = RAGEngine.chunkDocument(doc.id, doc.rawContent, doc.category);
});

export class DocumentStore {
  public static getDocuments(): KnowledgeDocument[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // First time load: seed with default samples
        this.saveAllDocuments(DEFAULT_SAMPLE_DOCS);
        return DEFAULT_SAMPLE_DOCS;
      }
      const parsed: KnowledgeDocument[] = JSON.parse(stored);
      // Ensure chunks are properly populated
      return parsed.map(d => {
        if (!d.chunks || d.chunks.length === 0) {
          d.chunks = RAGEngine.chunkDocument(d.id, d.rawContent, d.category);
        }
        return d;
      });
    } catch (e) {
      console.error('[DocumentStore] Failed to load documents:', e);
      return DEFAULT_SAMPLE_DOCS;
    }
  }

  public static saveAllDocuments(docs: KnowledgeDocument[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    } catch (e) {
      console.error('[DocumentStore] Failed to save documents:', e);
    }
  }

  public static addDocument(
    title: string,
    category: KnowledgeCategory,
    content: string,
    tags: string[] = [],
    fileType: string = 'text'
  ): KnowledgeDocument {
    const id = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const chunks = RAGEngine.chunkDocument(id, content, category);
    
    const newDoc: KnowledgeDocument = {
      id,
      title: title.trim() || 'Untitled Knowledge Document',
      category,
      rawContent: content,
      chunks,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags,
      fileType,
      summary: content.slice(0, 160).replace(/\n/g, ' ') + '...'
    };

    const currentDocs = this.getDocuments();
    const updated = [newDoc, ...currentDocs];
    this.saveAllDocuments(updated);
    return newDoc;
  }

  public static updateDocument(id: string, updates: Partial<KnowledgeDocument>): KnowledgeDocument | null {
    const currentDocs = this.getDocuments();
    const index = currentDocs.findIndex(d => d.id === id);
    if (index === -1) return null;

    const existing = currentDocs[index];
    const newRawContent = updates.rawContent !== undefined ? updates.rawContent : existing.rawContent;
    const newCategory = updates.category !== undefined ? updates.category : existing.category;

    const updatedDoc: KnowledgeDocument = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
      chunks: updates.rawContent !== undefined 
        ? RAGEngine.chunkDocument(existing.id, newRawContent, newCategory) 
        : existing.chunks
    };

    currentDocs[index] = updatedDoc;
    this.saveAllDocuments(currentDocs);
    return updatedDoc;
  }

  public static toggleDocumentActive(id: string, activeState?: boolean): boolean {
    const currentDocs = this.getDocuments();
    const doc = currentDocs.find(d => d.id === id);
    if (!doc) return false;

    doc.isActive = activeState !== undefined ? activeState : !doc.isActive;
    doc.updatedAt = Date.now();
    this.saveAllDocuments(currentDocs);
    return doc.isActive;
  }

  public static deleteDocument(id: string): boolean {
    const currentDocs = this.getDocuments();
    const filtered = currentDocs.filter(d => d.id !== id);
    if (filtered.length === currentDocs.length) return false;
    this.saveAllDocuments(filtered);
    return true;
  }

  public static exportJSON(): string {
    const docs = this.getDocuments();
    return JSON.stringify(docs, null, 2);
  }

  public static importJSON(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        const validated: KnowledgeDocument[] = parsed.map((d: any, i: number) => {
          const id = d.id || `imported-${Date.now()}-${i}`;
          const category = d.category || 'custom';
          const content = d.rawContent || d.content || '';
          return {
            id,
            title: d.title || `Imported Document ${i + 1}`,
            category,
            rawContent: content,
            chunks: RAGEngine.chunkDocument(id, content, category),
            isActive: d.isActive !== undefined ? d.isActive : true,
            createdAt: d.createdAt || Date.now(),
            updatedAt: Date.now(),
            tags: d.tags || [],
            fileType: d.fileType || 'text',
            summary: d.summary || content.slice(0, 120)
          };
        });
        this.saveAllDocuments(validated);
        return true;
      }
    } catch (e) {
      console.error('[DocumentStore] Failed to import JSON:', e);
    }
    return false;
  }
}
