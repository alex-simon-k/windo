import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  doc,
  getDoc,
  setDoc 
} from 'firebase/firestore';

export interface FilterConfig {
  column: number;
  value: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith';
}

export interface FilterGroup {
  filters: FilterConfig[];
  logicalOperator: 'AND' | 'OR';
}

export interface SheetProfile {
  docId?: string;
  id: string;
  range: string;
  dateColumn: string;
  name: string;
  lastRun?: string;
  filterGroups?: FilterGroup[];
  createdAt: string;
  updatedAt: string;
}

interface AnalyticsData {
  entryCounts: EntryCount[];
  comparisons: ComparisonResult[];
  lastUpdated: string;
}

interface EntryCount {
  date: string;
  count: number;
  sheetName: string;
}

interface ComparisonResult {
  sheetName: string;
  date1: string;
  date2: string;
  differences: {
    column: number;
    columnName: string;
    previous: any;
    current: any;
    percentageChange: number;
  }[];
}

const COLLECTION_NAME = 'sheetProfiles';
const ANALYTICS_COLLECTION = 'analytics';

export const profilesDB = {
  async getAll(): Promise<SheetProfile[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    return querySnapshot.docs.map(doc => ({
      ...(doc.data() as SheetProfile),
      docId: doc.id
    }));
  },

  async add(profile: Omit<SheetProfile, 'docId' | 'createdAt' | 'updatedAt'>): Promise<SheetProfile> {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...profile,
      createdAt: now,
      updatedAt: now
    });
    
    return {
      ...profile,
      docId: docRef.id,
      createdAt: now,
      updatedAt: now
    };
  },

  async update(docId: string, updates: Partial<SheetProfile>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, docId);
    // Check if document exists first
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Profile not found');
    }
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  },

  async delete(docId: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, docId);
    // Check if document exists first
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Profile not found');
    }
    await deleteDoc(docRef);
  },

  async saveAnalytics(data: AnalyticsData) {
    const docRef = doc(db, ANALYTICS_COLLECTION, 'latest');
    await setDoc(docRef, {
      ...data,
      lastUpdated: new Date().toISOString()
    });
  },

  async getAnalytics(): Promise<AnalyticsData | null> {
    const docRef = doc(db, ANALYTICS_COLLECTION, 'latest');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as AnalyticsData;
    }
    return null;
  }
}; 