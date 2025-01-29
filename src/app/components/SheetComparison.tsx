'use client';

import { useState, useEffect, useRef } from 'react';
import { SheetData } from '@/app/lib/googleSheets';
import { format, subDays, parseISO } from 'date-fns';
import { profilesDB, SheetProfile, FilterConfig, FilterGroup } from '@/app/lib/firebase/profilesDB';
import { PencilIcon, PlayIcon } from '@heroicons/react/24/outline';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

interface SheetConfig {
  id: string;
  range: string;
  dateColumn: string;
  name: string;
  lastRun?: string;
  isEditing?: boolean;
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

interface EntryCount {
  date: string;
  count: number;
  sheetName: string;
}

interface DeltaChange {
  today: number;
  yesterday: number;
  change: number;
  percentageChange: number;
}

interface ColumnChange {
  added: string[];
  removed: string[];
  column: number;
  date1: string;
  date2: string;
}

interface DeltaDetails {
  change: DeltaChange;
  columnChanges?: ColumnChange;
}

interface ColumnChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  changes: ColumnChange | undefined;
  profileName: string;
}

interface FilterEditorProps {
  filterGroups: FilterGroup[];
  onChange: (filterGroups: FilterGroup[]) => void;
}

function ColumnChangesModal({ isOpen, onClose, changes, profileName }: ColumnChangesModalProps) {
  if (!isOpen || !changes) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Changes for {profileName}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Comparing changes in column {changes.column} between {changes.date1} and {changes.date2}
          </div>
          
          {changes.added.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">Added Entries ({changes.added.length})</h4>
              <div className="bg-green-50 p-3 rounded-lg">
                <ul className="list-disc list-inside space-y-1">
                  {changes.added.map((entry, index) => (
                    <li key={index} className="text-green-800">{entry}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {changes.removed.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-red-600">Removed Entries ({changes.removed.length})</h4>
              <div className="bg-red-50 p-3 rounded-lg">
                <ul className="list-disc list-inside space-y-1">
                  {changes.removed.map((entry, index) => (
                    <li key={index} className="text-red-800">{entry}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterEditor({ filterGroups, onChange }: FilterEditorProps) {
  const addFilterGroup = () => {
    onChange([...filterGroups, { filters: [], logicalOperator: 'AND' }]);
  };

  const addFilter = (groupIndex: number) => {
    const newGroups = [...filterGroups];
    newGroups[groupIndex].filters.push({
      column: 1,
      value: '',
      operator: 'equals'
    });
    onChange(newGroups);
  };

  const updateFilter = (groupIndex: number, filterIndex: number, updates: Partial<FilterConfig>) => {
    const newGroups = [...filterGroups];
    newGroups[groupIndex].filters[filterIndex] = {
      ...newGroups[groupIndex].filters[filterIndex],
      ...updates
    };
    onChange(newGroups);
  };

  const removeFilter = (groupIndex: number, filterIndex: number) => {
    const newGroups = [...filterGroups];
    newGroups[groupIndex].filters.splice(filterIndex, 1);
    if (newGroups[groupIndex].filters.length === 0) {
      newGroups.splice(groupIndex, 1);
    }
    onChange(newGroups);
  };

  const updateGroupOperator = (groupIndex: number, operator: 'AND' | 'OR') => {
    const newGroups = [...filterGroups];
    newGroups[groupIndex].logicalOperator = operator;
    onChange(newGroups);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Filters</h3>
        <button
          onClick={addFilterGroup}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          + Add Filter Group
        </button>
      </div>

      {filterGroups.map((group, groupIndex) => (
        <div key={groupIndex} className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <select
              value={group.logicalOperator}
              onChange={(e) => updateGroupOperator(groupIndex, e.target.value as 'AND' | 'OR')}
              className="text-sm border rounded p-1"
            >
              <option value="AND">Match ALL filters (AND)</option>
              <option value="OR">Match ANY filter (OR)</option>
            </select>
            <button
              onClick={() => addFilter(groupIndex)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add Filter
            </button>
          </div>

          <div className="space-y-2">
            {group.filters.map((filter, filterIndex) => (
              <div key={filterIndex} className="flex items-center space-x-2">
                <input
                  type="number"
                  value={filter.column}
                  onChange={(e) => updateFilter(groupIndex, filterIndex, { column: parseInt(e.target.value) || 1 })}
                  className="w-20 p-2 border rounded text-black"
                  min="1"
                  placeholder="Column"
                />
                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(groupIndex, filterIndex, { operator: e.target.value as FilterConfig['operator'] })}
                  className="p-2 border rounded text-black"
                >
                  <option value="equals">Equals</option>
                  <option value="contains">Contains</option>
                  <option value="startsWith">Starts with</option>
                  <option value="endsWith">Ends with</option>
                </select>
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => updateFilter(groupIndex, filterIndex, { value: e.target.value })}
                  className="flex-1 p-2 border rounded text-black"
                  placeholder="Value"
                />
                <button
                  onClick={() => removeFilter(groupIndex, filterIndex)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SheetComparison() {
  const [profiles, setProfiles] = useState<SheetProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const [entryCounts, setEntryCounts] = useState<EntryCount[]>([]);
  const [showAddNew, setShowAddNew] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string[]>([]);  // Track which profiles are refreshing
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'magnitude' | 'name'>('magnitude');
  const [editingProfile, setEditingProfile] = useState<SheetProfile | null>(null);
  const [sheetDataMap, setSheetDataMap] = useState<Record<string, SheetData[]>>({});
  const [selectedChanges, setSelectedChanges] = useState<{
    changes: ColumnChange | undefined;
    profileName: string;
  } | null>(null);

  // Load profiles and analytics on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await loadProfiles();
        const analytics = await profilesDB.getAnalytics();
        if (analytics) {
          setComparisons(analytics.comparisons);
          setEntryCounts(analytics.entryCounts);
          setLastUpdated(analytics.lastUpdated);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };

    loadInitialData();
  }, []);

  // Add this useEffect to test the connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        const testProfile = await profilesDB.add({
          id: 'test',
          range: 'test',
          dateColumn: '1',
          name: 'Test Connection'
        });
        console.log('Firebase connected successfully!');
        
        // Clean up test data
        if (testProfile.docId) {
          try {
            await profilesDB.delete(testProfile.docId);
          } catch (deleteError) {
            console.log('Note: Test profile cleanup skipped - this is expected behavior');
          }
        }
      } catch (error) {
        console.error('Firebase connection failed:', error);
        setError('Failed to connect to database. Please make sure Firestore is enabled.');
      }
    };

    // Remove the test connection in production
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    
    testConnection();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const fetchedProfiles = await profilesDB.getAll();
      // Sort alphabetically by name
      setProfiles(fetchedProfiles.sort((a, b) => 
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      ));
    } catch (err) {
      setError('Failed to load profiles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addProfile = async () => {
    try {
      const newProfile = await profilesDB.add({
        id: '',
        range: '',
        dateColumn: '1',
        name: `Sheet ${profiles.length + 1}`,
      });
      setProfiles([...profiles, newProfile]);
      setIsEditing(newProfile.docId ?? null);
      setShowAddNew(false);
    } catch (err) {
      setError('Failed to create profile');
      console.error(err);
    }
  };

  const startEditing = (profile: SheetProfile) => {
    setEditingProfile({ ...profile });
    setIsEditing(profile.docId ?? null);
  };

  const cancelEditing = () => {
    setEditingProfile(null);
    setIsEditing(null);
  };

  const handleEditChange = (
    field: keyof SheetProfile,
    value: string | FilterConfig[] | FilterGroup[]
  ) => {
    if (!editingProfile) return;

    console.log('Editing change:', { field, value });
    setEditingProfile(prev => prev ? {
      ...prev,
      [field]: value
    } : null);
  };

  const saveProfile = async (profile: SheetProfile) => {
    try {
      if (!editingProfile || !profile.docId) return;

      console.log('Saving profile:', editingProfile);

      await profilesDB.update(profile.docId, {
        id: editingProfile.id,
        range: editingProfile.range,
        dateColumn: editingProfile.dateColumn,
        name: editingProfile.name,
        filterGroups: editingProfile.filterGroups || []
      });

      // Update the profiles list
      setProfiles(prevProfiles => 
        prevProfiles.map(p => 
          p.docId === profile.docId ? editingProfile : p
        )
      );

      // Clear editing state
      setEditingProfile(null);
      setIsEditing(null);

      // Reload profiles to get fresh data
      await loadProfiles();
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError('Failed to save profile: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const removeProfile = async (docId: string) => {
    if (confirm('Are you sure you want to remove this profile?')) {
      try {
        await profilesDB.delete(docId);
        setProfiles(profiles.filter(p => p.docId !== docId));
      } catch (err) {
        setError('Failed to remove profile');
        console.error(err);
      }
    }
  };

  const runAnalysis = async (profile: SheetProfile) => {
    try {
      console.log('Running analysis with profile:', profile);
      await profilesDB.update(profile.docId!, {
        lastRun: new Date().toISOString()
      });
      await fetchData([profile]);
      await loadProfiles(); // Reload to get updated lastRun
    } catch (err) {
      setError('Failed to run analysis');
      console.error(err);
    }
  };

  const fetchData = async (sheetsToAnalyze: SheetProfile[]) => {
    setLoading(true);
    setError(null);
    
    try {
      for (const sheet of sheetsToAnalyze) {
        // Include filters in the API request
        const queryParams = new URLSearchParams({
          spreadsheetId: sheet.id,
          range: sheet.range,
          dateColumn: sheet.dateColumn
        });

        // Add filters if they exist
        if (sheet.filterGroups && sheet.filterGroups.length > 0) {
          queryParams.append('filterGroups', JSON.stringify(sheet.filterGroups));
        }

        const response = await fetch(`/api/sheets?${queryParams.toString()}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Error in ${sheet.name}: ${errorData.error}`);
        }
        
        const sheetData = await response.json();
        
        // Store the sheet data
        setSheetDataMap(prev => ({
          ...prev,
          [sheet.name]: sheetData
        }));

        const sheetComparisons = compareData(
          sheetData.filter((row: SheetData) => row.matchesFilters),
          sheet.name
        );
        const sheetEntryCounts = countEntriesPerDay(sheetData, sheet.name);
        
        // Update only the data for this specific sheet
        setComparisons(prev => {
          const filtered = prev.filter(c => c.sheetName !== sheet.name);
          const updated = [...filtered, ...sheetComparisons];
          // Save to Firebase after each update
          profilesDB.saveAnalytics({
            entryCounts,
            comparisons: updated,
            lastUpdated: new Date().toISOString()
          });
          return updated;
        });
        
        setEntryCounts(prev => {
          const filtered = prev.filter(c => c.sheetName !== sheet.name);
          const updated = [...filtered, ...sheetEntryCounts];
          // Save to Firebase after each update
          profilesDB.saveAnalytics({
            entryCounts: updated,
            comparisons,
            lastUpdated: new Date().toISOString()
          });
          return updated;
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const countEntriesPerDay = (sheetData: SheetData[], sheetName: string): EntryCount[] => {
    const today = new Date();
    const counts: EntryCount[] = [];

    // Create array for last 7 days
    for (let i = 0; i < 7; i++) {
      const date = subDays(today, i);
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      const dailyEntries = sheetData.filter(row => {
        try {
          // Only count entries that match filters
          if (!row.matchesFilters) return false;
          
          // Handle timestamp format: "2025-01-27 02:08:57"
          const rowDate = row.date.split(' ')[0]; // Take only the date part
          return rowDate === formattedDate;
        } catch (error) {
          console.error('Error parsing date:', row.date);
          return false;
        }
      });

      counts.push({
        date: formattedDate,
        count: dailyEntries.length,
        sheetName
      });
    }

    return counts;
  };

  const compareData = (sheetData: SheetData[], sheetName: string): ComparisonResult[] => {
    const results: ComparisonResult[] = [];
    
    for (let i = 1; i < sheetData.length; i++) {
      const previous = sheetData[i - 1];
      const current = sheetData[i];
      
      const differences = current.values.map((value, index) => {
        const previousValue = Number(previous.values[index]) || 0;
        const currentValue = Number(value) || 0;
        const percentageChange = previousValue === 0 
          ? 0 
          : ((currentValue - previousValue) / previousValue) * 100;
        
        return {
          column: index + 1,
          columnName: `Column ${index + 1}`,
          previous: previousValue,
          current: currentValue,
          percentageChange
        };
      }).filter(diff => diff.percentageChange !== 0);

      if (differences.length > 0) {
        results.push({
          sheetName,
          date1: previous.date,
          date2: current.date,
          differences
        });
      }
    }

    return results;
  };

  const calculateDelta = (entryCounts: EntryCount[], sheetName: string): DeltaChange | null => {
    const sortedEntries = entryCounts
      .filter(entry => entry.sheetName === sheetName)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (sortedEntries.length < 2) return null;

    const today = sortedEntries[0].count;
    const yesterday = sortedEntries[1].count;
    const change = today - yesterday;
    const percentageChange = yesterday === 0 ? 0 : (change / yesterday) * 100;

    return {
      today,
      yesterday,
      change,
      percentageChange
    };
  };

  // Add this function to refresh all profiles
  const refreshAllProfiles = async () => {
    setRefreshing(profiles.map(p => p.docId!));
    setError(null);
    setComparisons([]); // Clear all data before full refresh
    setEntryCounts([]);

    try {
      // Process profiles in batches of 3 to avoid rate limits
      const batchSize = 3;
      for (let i = 0; i < profiles.length; i += batchSize) {
        const batch = profiles.slice(i, i + batchSize);
        await Promise.all(batch.map(async profile => {
          await profilesDB.update(profile.docId!, {
            lastRun: new Date().toISOString()
          });
        }));
        await fetchData(batch);
      }
      await loadProfiles(); // Reload to get updated lastRun times
    } catch (err) {
      setError('Failed to refresh all profiles');
      console.error(err);
    } finally {
      setRefreshing([]);
    }
  };

  const handleBulkImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n');
      
      // Process in batches to avoid overwhelming Firebase
      const batchSize = 5;
      for (let i = 0; i < lines.length; i += batchSize) {
        const batch = lines.slice(i, i + batchSize);
        await Promise.all(batch.map(async line => {
          const [name, sheetId] = line.split(',').map(s => s.trim());
          if (name && sheetId) {
            await profilesDB.add({
              name,
              id: sheetId,
              range: 'Sheet1!A2:Z1000', // Default range
              dateColumn: '1', // Default date column
            });
          }
        }));
      }

      // Reload profiles after import
      await loadProfiles();
      setError(null);
    } catch (err) {
      setError('Failed to import profiles');
      console.error(err);
    }
  };

  // Update the sorting function
  const getSortedProfiles = (profiles: SheetProfile[]) => {
    return [...profiles].sort((a, b) => {
      if (sortBy === 'magnitude') {
        const deltaA = calculateDelta(entryCounts, a.name);
        const deltaB = calculateDelta(entryCounts, b.name);
        
        // Use absolute value of the change (not percentage)
        const magnitudeA = Math.abs(deltaA?.change || 0);
        const magnitudeB = Math.abs(deltaB?.change || 0);
        
        return magnitudeB - magnitudeA; // Sort by highest magnitude first
      } else {
        // Default to name sorting
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      }
    });
  };

  const handleNumberChange = (
    index: number,
    value: string,
    isArrowKey: boolean = false
  ) => {
    try {
      // Get the current profile
      const currentProfile = profiles[index];
      
      // Parse the numbers
      const newNum = parseInt(value);
      if (newNum < 1) return;

      console.log('Handling number change:', { 
        currentValue: currentProfile.dateColumn, 
        newValue: value,
        isArrowKey 
      });

      // Create the updated profile
      const updatedProfile = {
        ...currentProfile,
        dateColumn: value
      };

      // Update state immediately
      const updatedProfiles = [...profiles];
      updatedProfiles[index] = updatedProfile;
      setProfiles(updatedProfiles);

      // Save to Firebase
      if (updatedProfile.docId) {
        console.log('Saving to Firebase:', {
          docId: updatedProfile.docId,
          value
        });

        profilesDB.update(updatedProfile.docId, {
          dateColumn: value
        }).then(() => {
          console.log('Successfully saved to Firebase:', { value });
        }).catch(err => {
          console.error('Error saving to Firebase:', err);
          setError('Failed to save changes');
          setProfiles(profiles);
        });
      }
    } catch (err) {
      console.error('Error updating number:', err);
      setError('Failed to update number: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const analyzeColumnChanges = (
    sheetData: SheetData[], 
    columnIndex: number,
    date1: string,
    date2: string
  ): ColumnChange | undefined => {
    try {
      // Get entries for both days
      const day1Entries = sheetData
        .filter(row => row.date.split(' ')[0] === date1 && row.matchesFilters)
        .map(row => row.values[columnIndex - 1]?.trim())
        .filter(Boolean);

      const day2Entries = sheetData
        .filter(row => row.date.split(' ')[0] === date2 && row.matchesFilters)
        .map(row => row.values[columnIndex - 1]?.trim())
        .filter(Boolean);

      // Find added and removed entries
      const added = day2Entries.filter(entry => !day1Entries.includes(entry));
      const removed = day1Entries.filter(entry => !day2Entries.includes(entry));

      if (added.length === 0 && removed.length === 0) return undefined;

      return {
        added,
        removed,
        column: columnIndex,
        date1,
        date2
      };
    } catch (err) {
      console.error('Error analyzing column changes:', err);
      return undefined;
    }
  };

  const getDeltaDetails = (
    entryCounts: EntryCount[], 
    sheetName: string,
    sheetData: SheetData[],
    columnToAnalyze?: number
  ): DeltaDetails | null => {
    const delta = calculateDelta(entryCounts, sheetName);
    if (!delta) return null;

    // If there's no column to analyze or no change, just return the delta
    if (!columnToAnalyze || delta.change === 0) return { change: delta };

    // Get the dates we need to compare
    const sortedEntries = entryCounts
      .filter(entry => entry.sheetName === sheetName)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (sortedEntries.length < 2) return { change: delta };

    const columnChanges = analyzeColumnChanges(
      sheetData,
      columnToAnalyze,
      sortedEntries[1].date, // yesterday
      sortedEntries[0].date  // today
    );

    return {
      change: delta,
      columnChanges
    };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto text-black">
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-black">Sheet Profiles</h1>
            {lastUpdated && (
              <p className="text-sm text-gray-500">
                Last updated: {format(parseISO(lastUpdated), 'MMM dd, yyyy HH:mm:ss')}
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={refreshAllProfiles}
              disabled={refreshing.length > 0}
              className={`flex items-center space-x-2 px-3 py-1 text-sm rounded
                ${refreshing.length > 0 
                  ? 'bg-blue-400 cursor-wait' 
                  : 'bg-blue-600 hover:bg-blue-700'} text-white`}
            >
              {refreshing.length > 0 ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Refreshing {refreshing.length} remaining...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh All</span>
                </>
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv,.txt"
              onChange={handleBulkImport}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-purple-600 text-white px-3 py-1 text-sm rounded hover:bg-purple-700"
            >
              Import Profiles
            </button>
            <button
              onClick={() => setShowAddNew(true)}
              className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
            >
              Add Profile
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Sheet Profiles</h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'magnitude' | 'name')}
                    className="border rounded p-1 text-sm"
                  >
                    <option value="magnitude">Delta Magnitude</option>
                    <option value="name">Name</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-100 rounded-t text-sm font-medium">
            <div className="col-span-3">Profile Name</div>
            <div className="col-span-2 text-center">Delta</div>
            <div className="col-span-3 text-center">Yesterday</div>
            <div className="col-span-3 text-center">Today</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {/* Profile List - Use getSortedProfiles */}
          <div className="space-y-1">
            {getSortedProfiles(profiles).map((profile, index) => {
              const delta = calculateDelta(entryCounts, profile.name);
              const isRefreshing = refreshing.includes(profile.docId!);
              
              return (
                <div 
                  key={profile.docId}
                  className="grid grid-cols-12 gap-4 px-4 py-2 bg-white hover:bg-gray-50 border-b items-center text-sm"
                >
                  {profile.docId === isEditing && editingProfile ? (
                    // Edit Mode
                    <>
                      <div className="col-span-11">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">Edit Profile</span>
                            <button
                              onClick={() => removeProfile(profile.docId!)}
                              className="text-red-600 hover:text-red-800 flex items-center space-x-1 text-sm"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Delete Profile</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Profile Name"
                            className="w-full p-2 border rounded text-black"
                            value={editingProfile.name}
                            onChange={(e) => handleEditChange('name', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Spreadsheet ID"
                            className="w-full p-2 border rounded text-black"
                            value={editingProfile.id}
                            onChange={(e) => handleEditChange('id', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Sheet Range (e.g., Sheet1!A2:Z1000)"
                            className="w-full p-2 border rounded text-black"
                            value={editingProfile.range}
                            onChange={(e) => handleEditChange('range', e.target.value)}
                          />
                          <input
                            type="number"
                            placeholder="Date Column Number"
                            className="w-full p-2 border rounded text-black"
                            value={editingProfile.dateColumn}
                            onChange={(e) => {
                              const value = e.target.value;
                              const numValue = parseInt(value);
                              if (numValue > 0) {
                                handleEditChange('dateColumn', value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                e.preventDefault();
                                const currentValue = parseInt(editingProfile.dateColumn) || 1;
                                const newValue = e.key === 'ArrowUp' 
                                  ? currentValue + 1 
                                  : Math.max(1, currentValue - 1);
                                handleEditChange('dateColumn', newValue.toString());
                              }
                            }}
                            min="1"
                            step="1"
                          />
                          <div className="mt-4">
                            <FilterEditor
                              filterGroups={editingProfile.filterGroups || []}
                              onChange={(filterGroups) => handleEditChange('filterGroups', filterGroups)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-end space-x-2">
                        <button
                          onClick={() => saveProfile(profile)}
                          className="text-green-600 hover:text-green-800"
                          title="Save"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="text-gray-600 hover:text-gray-800"
                          title="Cancel"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </>
                  ) : (
                    // View Mode - existing code
                    <>
                      <div className="col-span-3 font-medium truncate">
                        {profile.name}
                      </div>
                      <div className="col-span-2 text-center">
                        {delta && (
                          <>
                            <div className={`flex items-center justify-center space-x-1
                              ${delta.change > 0 ? 'text-green-600' : delta.change < 0 ? 'text-red-600' : 'text-gray-600'}`}
                            >
                              {delta.change > 0 ? (
                                <ArrowTrendingUpIcon className="h-4 w-4" />
                              ) : delta.change < 0 ? (
                                <ArrowTrendingDownIcon className="h-4 w-4" />
                              ) : null}
                              <span>
                                {delta.change > 0 ? '+' : ''}{Math.abs(delta.change)}
                              </span>
                            </div>
                            {profile.dateColumn && delta.change !== 0 && (
                              <button
                                onClick={() => {
                                  const columnNum = parseInt(profile.dateColumn);
                                  if (columnNum > 0) {
                                    const sheetData = sheetDataMap[profile.name];
                                    if (sheetData) {
                                      console.log('Analyzing column changes for column:', columnNum);
                                      const details = getDeltaDetails(entryCounts, profile.name, sheetData, columnNum);
                                      if (details?.columnChanges) {
                                        console.log('Column changes:', details.columnChanges);
                                        setSelectedChanges({
                                          changes: details.columnChanges,
                                          profileName: profile.name
                                        });
                                      } else {
                                        alert('No specific changes found in the selected column.');
                                      }
                                    } else {
                                      alert('Please refresh the data to view changes.');
                                    }
                                  }
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                              >
                                View Changes
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <div className="col-span-3 text-center font-mono">
                        {delta?.yesterday || 0} entries
                      </div>
                      <div className="col-span-3 text-center font-mono">
                        {delta?.today || 0} entries
                      </div>
                      <div className="col-span-1 flex justify-end space-x-2">
                        <button
                          onClick={() => startEditing(profile)}
                          disabled={isRefreshing}
                          className={`text-blue-600 hover:text-blue-800 ${isRefreshing ? 'opacity-50' : ''}`}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => runAnalysis(profile)}
                          disabled={isRefreshing}
                          className={`text-green-600 hover:text-green-800 ${isRefreshing ? 'opacity-50' : ''}`}
                        >
                          {isRefreshing ? (
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <PlayIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {showAddNew && (
          <button
            onClick={addProfile}
            className="w-full p-2 border-2 border-dashed rounded hover:bg-gray-50 text-black font-medium text-sm"
          >
            Create New Profile
          </button>
        )}

        {error && (
          <div className="text-red-600 text-sm p-2 bg-red-50 rounded font-medium">
            Error: {error}
          </div>
        )}
      </div>

      <ColumnChangesModal
        isOpen={selectedChanges !== null}
        onClose={() => setSelectedChanges(null)}
        changes={selectedChanges?.changes}
        profileName={selectedChanges?.profileName || ''}
      />
    </div>
  );
} 