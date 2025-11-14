import initSqlJs, { Database } from 'sql.js';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export interface Case {
  id: string;
  caseType: string;
  jurisdiction: string;
  status: 'pending' | 'judged' | 'in_argument';
  createdAt: Date;
  updatedAt: Date;
}

export interface CaseDetail {
  id: string;
  caseId: string;
  side: 'A' | 'B';
  summary: string;
  documents: string[];
  evidence: string[];
}

export interface JudgmentRecord {
  id: string;
  caseId: string;
  verdict: string;
  reasoning: string;
  legalBasis: string[];
  confidence: number;
  version: number;
  createdAt: Date;
}

export interface ArgumentRecord {
  id: string;
  caseId: string;
  side: 'A' | 'B';
  argument: string;
  response: string;
  reconsidered: boolean;
  sequenceNumber: number;
  createdAt: Date;
}

class DatabaseService {
  private db: Database | null = null;
  private dbPath: string;
  private initialized: boolean = false;

  constructor() {
    // Database file path
    this.dbPath = path.join(__dirname, '..', '..', 'data', 'ai_judge.db');
    
    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized && this.db) return;

    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
      logger.info('✅ SQLite database loaded', { path: this.dbPath });
    } else {
      this.db = new SQL.Database();
      logger.info('✅ SQLite database created', { path: this.dbPath });
    }
    
    this.initialized = true;

    // Ensure any migrations (like new columns) are applied immediately
    try {
      await this.migrateArgumentsTable();
      // Persist any schema changes back to disk
      this.saveDatabase();
    } catch (err) {
      logger.warn('Migration during initialization failed', { error: err });
    }
  }

  private saveDatabase(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Cases table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS cases (
          id TEXT PRIMARY KEY,
          case_type TEXT NOT NULL,
          jurisdiction TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);

      // Case details table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS case_details (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          side TEXT NOT NULL CHECK (side IN ('A', 'B')),
          summary TEXT NOT NULL,
          documents TEXT DEFAULT '[]',
          evidence TEXT DEFAULT '[]',
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
        )
      `);

      // Judgments table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS judgments (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          verdict TEXT NOT NULL,
          reasoning TEXT NOT NULL,
          legal_basis TEXT DEFAULT '[]',
          confidence INTEGER NOT NULL,
          version INTEGER NOT NULL DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
        )
      `);

      // Arguments table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS arguments (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          side TEXT NOT NULL CHECK (side IN ('A', 'B')),
          argument TEXT NOT NULL,
          response TEXT NOT NULL,
          strengthens TEXT,
          weakens TEXT,
          uncertainty_remains TEXT,
          provisional_note TEXT,
          reconsidered INTEGER DEFAULT 0,
          sequence_number INTEGER NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
        )
      `);

      // Indexes
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_case_details_case_id ON case_details(case_id)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_judgments_case_id ON judgments(case_id)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_arguments_case_id ON arguments(case_id)`);

      // Migration: Add new columns to arguments table if they don't exist
      await this.migrateArgumentsTable();

      this.saveDatabase();
      logger.info('✅ SQLite database schema initialized successfully');
    } catch (error) {
      logger.error('Error initializing database schema', error);
      throw error;
    }
  }

  /**
   * Migrate arguments table to add evaluation metadata columns
   */
  private async migrateArgumentsTable(): Promise<void> {
    try {
      // Check if columns exist by querying table info
      const tableInfo = this.db!.exec("PRAGMA table_info(arguments)");
      
      if (tableInfo.length === 0) {
        // Table doesn't exist yet, will be created by schema initialization
        return;
      }

      const columns = tableInfo[0].values.map((row: any) => row[1] as string);
      
      // Add missing columns one by one
      const columnsToAdd = [
        { name: 'strengthens', type: 'TEXT' },
        { name: 'weakens', type: 'TEXT' },
        { name: 'uncertainty_remains', type: 'TEXT' },
        { name: 'provisional_note', type: 'TEXT' }
      ];

      for (const col of columnsToAdd) {
        if (!columns.includes(col.name)) {
          logger.info(`Adding column ${col.name} to arguments table`);
          this.db!.run(`ALTER TABLE arguments ADD COLUMN ${col.name} ${col.type}`);
        }
      }
    } catch (error) {
      logger.warn('Migration check completed', { error });
    }
  }

  /**
   * Create a new case
   */
  async createCase(
    caseType: string,
    jurisdiction: string,
    sideA: { summary: string; documents: string[]; evidence: string[] },
    sideB: { summary: string; documents: string[]; evidence: string[] }
  ): Promise<string> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const caseId = uuidv4();
    
    try {
      this.db.run(
        'INSERT INTO cases (id, case_type, jurisdiction, status) VALUES (?, ?, ?, ?)',
        [caseId, caseType, jurisdiction, 'pending']
      );

      this.db.run(
        `INSERT INTO case_details (id, case_id, side, summary, documents, evidence) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), caseId, 'A', sideA.summary, JSON.stringify(sideA.documents), JSON.stringify(sideA.evidence)]
      );

      this.db.run(
        `INSERT INTO case_details (id, case_id, side, summary, documents, evidence) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), caseId, 'B', sideB.summary, JSON.stringify(sideB.documents), JSON.stringify(sideB.evidence)]
      );

      this.saveDatabase();
      logger.info('Case created', { caseId });
      return caseId;
    } catch (error) {
      logger.error('Error creating case', error);
      throw error;
    }
  }

  /**
   * Get case by ID with details
   */
  async getCaseById(caseId: string): Promise<any> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const caseResult = this.db.exec('SELECT * FROM cases WHERE id = ?', [caseId]);

    if (caseResult.length === 0 || caseResult[0].values.length === 0) {
      return null;
    }

    const caseRow = caseResult[0].values[0];
    const caseData = {
      id: caseRow[0],
      case_type: caseRow[1],
      jurisdiction: caseRow[2],
      status: caseRow[3],
      created_at: caseRow[4],
      updated_at: caseRow[5],
    };

    const detailsResult = this.db.exec('SELECT * FROM case_details WHERE case_id = ? ORDER BY side', [caseId]);

    let sideA = null, sideB = null;
    
    if (detailsResult.length > 0) {
      detailsResult[0].values.forEach((row: any) => {
        const detail = {
          summary: row[3],
          documents: JSON.parse(row[4] as string),
          evidence: JSON.parse(row[5] as string),
        };
        
        if (row[2] === 'A') sideA = detail;
        if (row[2] === 'B') sideB = detail;
      });
    }

    return {
      id: caseData.id,
      caseType: caseData.case_type,
      jurisdiction: caseData.jurisdiction,
      status: caseData.status,
      sideA,
      sideB,
      createdAt: new Date(caseData.created_at as string),
      updatedAt: new Date(caseData.updated_at as string),
    };
  }

  /**
   * Save judgment
   */
  async saveJudgment(
    caseId: string,
    verdict: string,
    reasoning: string,
    legalBasis: string[],
    confidence: number,
    version: number = 1
  ): Promise<string> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const judgmentId = uuidv4();
    
    this.db.run(
      `INSERT INTO judgments (id, case_id, verdict, reasoning, legal_basis, confidence, version) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [judgmentId, caseId, verdict, reasoning, JSON.stringify(legalBasis), confidence, version]
    );

    this.db.run(
      'UPDATE cases SET status = ?, updated_at = datetime(\'now\') WHERE id = ?',
      ['judged', caseId]
    );

    this.saveDatabase();
    logger.info('Judgment saved', { caseId, judgmentId });
    return judgmentId;
  }

  /**
   * Get latest judgment for a case
   */
  async getLatestJudgment(caseId: string): Promise<any> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(
      'SELECT * FROM judgments WHERE case_id = ? ORDER BY version DESC LIMIT 1',
      [caseId]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const row = result[0].values[0];
    return {
      id: row[0],
      caseId: row[1],
      verdict: row[2],
      reasoning: row[3],
      legalBasis: JSON.parse(row[4] as string),
      confidence: row[5],
      version: row[6],
      createdAt: new Date(row[7] as string),
    };
  }

  /**
   * Get all judgments for a case
   */
  async getJudgments(caseId: string): Promise<any[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(
      'SELECT * FROM judgments WHERE case_id = ? ORDER BY version ASC',
      [caseId]
    );

    if (result.length === 0) {
      return [];
    }

    return result[0].values.map((row: any) => ({
      id: row[0],
      caseId: row[1],
      verdict: row[2],
      reasoning: row[3],
      legalBasis: JSON.parse(row[4] as string),
      confidence: row[5],
      version: row[6],
      createdAt: new Date(row[7] as string),
    }));
  }

  /**
   * Get case by ID (alias for getCaseById)
   */
  async getCase(caseId: string): Promise<any> {
    return this.getCaseById(caseId);
  }

  /**
   * Save argument
   */
  async saveArgument(
    caseId: string,
    side: 'A' | 'B',
    argument: string,
    response: string,
    reconsidered: boolean,
    sequenceNumber: number,
    strengthens?: string,
    weakens?: string,
    uncertaintyRemains?: string,
    provisionalNote?: string
  ): Promise<string> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const argumentId = uuidv4();
    
    this.db.run(
      `INSERT INTO arguments (id, case_id, side, argument, response, reconsidered, sequence_number, 
        strengthens, weakens, uncertainty_remains, provisional_note) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [argumentId, caseId, side, argument, response, reconsidered ? 1 : 0, sequenceNumber,
       strengthens || null, weakens || null, uncertaintyRemains || null, provisionalNote || null]
    );

    this.db.run(
      'UPDATE cases SET status = ?, updated_at = datetime(\'now\') WHERE id = ?',
      ['in_argument', caseId]
    );

    this.saveDatabase();
    logger.info('Argument saved', { caseId, argumentId, side });
    return argumentId;
  }

  /**
   * Get all arguments for a case
   */
  async getArguments(caseId: string): Promise<ArgumentRecord[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(
      'SELECT * FROM arguments WHERE case_id = ? ORDER BY sequence_number',
      [caseId]
    );

    if (result.length === 0) {
      return [];
    }

    return result[0].values.map((row: any) => ({
      id: row[0] as string,
      caseId: row[1] as string,
      side: row[2] as 'A' | 'B',
      argument: row[3] as string,
      response: row[4] as string,
      strengthens: row[5] as 'Side A' | 'Side B' | 'Neither' | undefined,
      weakens: row[6] as 'Side A' | 'Side B' | 'Neither' | undefined,
      uncertaintyRemains: row[7] as string | undefined,
      provisionalNote: row[8] as string | undefined,
      reconsidered: row[9] === 1,
      sequenceNumber: row[10] as number,
      createdAt: new Date(row[11] as string),
    }));
  }

  /**
   * Get argument count for a case
   */
  async getArgumentCount(caseId: string): Promise<number> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(
      'SELECT COUNT(*) as count FROM arguments WHERE case_id = ?',
      [caseId]
    );
    
    if (result.length === 0 || result[0].values.length === 0) {
      return 0;
    }
    
    return result[0].values[0][0] as number;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.saveDatabase();
      this.db.close();
      this.db = null;
      logger.info('Database connection closed');
    }
  }
}

export const databaseService = new DatabaseService();
