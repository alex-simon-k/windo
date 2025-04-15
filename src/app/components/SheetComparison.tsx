'use client';

import { useState, useEffect, useRef } from 'react';
import { SheetData } from '@/app/lib/googleSheets';
import { format, subDays, parseISO } from 'date-fns';
import { profilesDB, SheetProfile, FilterConfig, FilterGroup } from '@/app/lib/firebase/profilesDB';
import { PencilIcon, PlayIcon } from '@heroicons/react/24/outline';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { useSettings } from '@/lib/contexts/SettingsContext';
import AdditionalColumnToggle from './AdditionalColumnToggle';
import { arrayToCSV, downloadCSV, formatDateForFilename } from '@/app/lib/csvExport';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import CustomDateComparison from './CustomDateComparison';

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

interface CurrentEntriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: string[];
  additionalEntries?: string[];
  profileName: string;
  columnIndex: number;
}

// Add this type definition near the top of the file
type SheetDataMapValue = SheetData[] | { error: boolean };

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
          <div className="text-sm text-gray-600 space-y-1">
            <div>Analyzing changes in column {changes.column}</div>
            <div className="text-xs">
              Comparing entries between:
              <div className="font-mono mt-1">
                {changes.date1}
                <br />
                {changes.date2}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600 flex items-center space-x-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>New Entries ({changes.added.length})</span>
              </h4>
              <div className="bg-green-50 p-3 rounded-lg">
                {changes.added.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {changes.added.map((entry, index) => (
                      <li key={index} className="text-green-800">{entry}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic">No new entries</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-red-600 flex items-center space-x-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                <span>Removed Entries ({changes.removed.length})</span>
              </h4>
              <div className="bg-red-50 p-3 rounded-lg">
                {changes.removed.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {changes.removed.map((entry, index) => (
                      <li key={index} className="text-red-800">{entry}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic">No removed entries</p>
                )}
              </div>
            </div>
          </div>
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

function CurrentEntriesModal({ isOpen, onClose, entries, additionalEntries = [], profileName, columnIndex }: CurrentEntriesModalProps) {
  const { showAdditionalColumn } = useSettings();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Current Entries for {profileName}</h3>
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
            Showing all current entries from column {columnIndex}
            <div className="text-xs mt-1">
              Total entries: {entries.length}
            </div>
          </div>
          
          <div className="mb-4">
            <AdditionalColumnToggle />
          </div>
          
          <div className="bg-white border rounded-lg">
            {entries.length > 0 ? (
              <div className="divide-y">
                {entries.map((entry, index) => (
                  <div key={index} className="p-2 hover:bg-gray-50 flex items-center">
                    <span className="text-gray-400 text-sm mr-2">{index + 1}.</span>
                    <div className="flex-1">
                      <span className="text-gray-800">{entry}</span>
                      
                      {/* Show additional column data if enabled and available */}
                      {showAdditionalColumn && additionalEntries[index] && (
                        <span className="ml-4 text-blue-600 border-l border-gray-300 pl-4">
                          {additionalEntries[index]}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic p-4">No entries found</p>
            )}
          </div>
        </div>
      </div>
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
  const [sheetDataMap, setSheetDataMap] = useState<Record<string, SheetDataMapValue>>({});
  const [selectedChanges, setSelectedChanges] = useState<{
    changes: ColumnChange | undefined;
    profileName: string;
  } | null>(null);
  const [currentEntries, setCurrentEntries] = useState<{
    entries: string[];
    additionalEntries?: string[];
    profileName: string;
    columnIndex: number;
  } | null>(null);
  const [customCompareDate, setCustomCompareDate] = useState<string | null>(null);

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
      const loadedProfiles = await profilesDB.getAll();
      console.log('Loaded profiles:', loadedProfiles);
      setProfiles(loadedProfiles);
    } catch (err) {
      console.error('Error loading profiles:', err);
      setError('Failed to load profiles');
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

  const handleEditChange = (field: string, value: any) => {
    if (!editingProfile) return;
    
    console.log('Editing field:', field, 'with value:', value);
    
    setEditingProfile({
      ...editingProfile,
      [field]: value
    });
  };

  const saveProfile = async (profile: SheetProfile) => {
    try {
      if (!editingProfile) return;
      
      // Make sure we're including the extraColumn in the update
      const updatedProfile = {
        ...editingProfile,
        // Make sure other fields are included
      };
      
      // Log what we're saving to help debug
      console.log('Saving profile with extraColumn:', updatedProfile.extraColumn);
      
      if (updatedProfile.docId) {
        await profilesDB.update(updatedProfile.docId, updatedProfile);
        console.log('Profile updated successfully');
      } else {
        // Handle new profile creation
      }
      
      // Update the local state
      const updatedProfiles = profiles.map(p => 
        p.id === updatedProfile.id ? updatedProfile : p
      );
      setProfiles(updatedProfiles);
      setIsEditing(null);
      setEditingProfile(null);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile');
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
    
    // Keep track of which profiles fail to load
    const failedProfiles: string[] = [];
    
    try {
      for (const sheet of sheetsToAnalyze) {
        try {
          setRefreshing(prev => [...prev, sheet.docId!]);
          
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
        } catch (sheetError) {
          console.error(`Error fetching data for ${sheet.name}:`, sheetError);
          // Mark this profile as failed but continue with others
          failedProfiles.push(sheet.docId!);
          
          // Set an error indicator for this profile in sheetDataMap
          setSheetDataMap(prev => ({
            ...prev,
            [sheet.name]: { error: true } as SheetDataMapValue
          }));
        } finally {
          // Remove from refreshing state either way
          setRefreshing(prev => prev.filter(id => id !== sheet.docId));
        }
      }
      
      // If any profiles failed, show a summary error
      if (failedProfiles.length > 0) {
        setError(`Failed to refresh data for ${failedProfiles.length} profile(s). Look for profiles marked with ❌.`);
      }
    } catch (error) {
      console.error('Error in fetch operation:', error);
      setError('An error occurred during refresh. Please try again.');
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
      const deltaA = calculateDelta(entryCounts, a.name);
      const deltaB = calculateDelta(entryCounts, b.name);
      
      // Get absolute values of changes
      const magnitudeA = Math.abs(deltaA?.change || 0);
      const magnitudeB = Math.abs(deltaB?.change || 0);
      
      if (sortBy === 'magnitude') {
        // If both have zero delta, sort by today's entry count
        if (magnitudeA === 0 && magnitudeB === 0) {
          const todayA = deltaA?.today || 0;
          const todayB = deltaB?.today || 0;
          // Sort by highest count first
          return todayB - todayA;
        }
        
        // Otherwise sort by delta magnitude
        return magnitudeB - magnitudeA;
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
          setProfiles(profiles);
        });
      }
    } catch (err) {
      console.error('Error updating number:', err);
      setError('Failed to update number: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const getCurrentEntries = (
    sheetData: SheetData[] | { error: boolean },
    columnIndex: number,
    additionalColumnIndex?: number
  ): { entries: string[], additionalEntries?: string[] } => {
    // Check if sheetData is an error object
    if (!Array.isArray(sheetData)) {
      return { entries: [] };
    }
    
    console.log('Getting entries with columnIndex:', columnIndex, 'additionalColumnIndex:', additionalColumnIndex);
    
    const today = new Date();
    const formattedDate = format(today, 'yyyy-MM-dd');

    const filteredRows = sheetData
      .filter(row => {
        const rowDate = row.date.split(' ')[0];
        return rowDate === formattedDate && row.matchesFilters;
      });
    
    console.log('Filtered rows count:', filteredRows.length);
    
    const entries = filteredRows
      .map(row => row.values[columnIndex - 1]?.trim())
      .filter(Boolean);
    
    // If additional column is specified, get that data too
    let additionalEntries: string[] | undefined;
    if (additionalColumnIndex) {
      additionalEntries = filteredRows
        .map(row => row.values[additionalColumnIndex - 1]?.trim())
        .filter(Boolean);
      
      console.log('Additional entries count:', additionalEntries.length);
    }
    
    return { entries, additionalEntries };
  };

  const analyzeColumnChanges = (
    sheetData: SheetData[], 
    columnIndex: number,
    date1: string,
    date2: string
  ): ColumnChange | undefined => {
    try {
      // Get entries for both days, ensuring we only look at filtered data
      const day1Entries = sheetData
        .filter(row => {
          const rowDate = row.date.split(' ')[0];
          return rowDate === date1 && row.matchesFilters;
        })
        .map(row => row.values[columnIndex - 1]?.trim())
        .filter(Boolean);

      const day2Entries = sheetData
        .filter(row => {
          const rowDate = row.date.split(' ')[0];
          return rowDate === date2 && row.matchesFilters;
        })
        .map(row => row.values[columnIndex - 1]?.trim())
        .filter(Boolean);

      console.log('Analyzing changes:', {
        date1, 
        date2,
        day1EntriesCount: day1Entries.length,
        day2EntriesCount: day2Entries.length,
        columnIndex
      });

      // Find added entries (in day2 but not in day1)
      const added = day2Entries.filter(entry => !day1Entries.includes(entry));
      
      // Find removed entries (in day1 but not in day2)
      const removed = day1Entries.filter(entry => !day2Entries.includes(entry));

      console.log('Changes found:', {
        addedCount: added.length,
        removedCount: removed.length
      });

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
    // First check if there was an error loading this profile's data
    if (hasProfileError(sheetName)) {
      return null;
    }

    const sortedEntries = entryCounts
      .filter(entry => entry.sheetName === sheetName)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (sortedEntries.length < 1) return null;
    
    // Today's date and entries
    const todayDate = sortedEntries[0].date;
    const todayCount = sortedEntries[0].count;
    
    // Determine compare date (custom date or yesterday)
    let compareDate = '';
    let compareCount = 0;
    
    if (customCompareDate) {
      // Try to find the custom date in entries
      const customEntry = entryCounts.find(
        entry => entry.sheetName === sheetName && entry.date === customCompareDate
      );
      
      if (customEntry) {
        compareDate = customEntry.date;
        compareCount = customEntry.count;
      }
    }
    
    // If custom date not found or not specified, fall back to yesterday
    if (!compareDate && sortedEntries.length >= 2) {
      compareDate = sortedEntries[1].date;
      compareCount = sortedEntries[1].count;
    }
    
    // If we still don't have a compare date, can't calculate delta
    if (!compareDate) return null;
    
    // Calculate delta
    const change = todayCount - compareCount;
    const percentageChange = compareCount === 0 ? 0 : (change / compareCount) * 100;
    
    const delta = {
      today: todayCount,
      yesterday: compareCount,  // This is either yesterday or custom date count
      change,
      percentageChange
    };
    
    // If no column to analyze or no change, just return the delta
    if (!columnToAnalyze) return { change: delta };
    
    // Get column changes
    const columnChanges = analyzeColumnChanges(
      sheetData,
      columnToAnalyze,
      compareDate,
      todayDate
    );
    
    return { 
      change: delta,
      columnChanges
    };
  };

  // Add this function to calculate delta with custom date
  const calculateDeltaWithCustomDate = (
    entryCounts: EntryCount[], 
    sheetName: string,
    customDate: string | null
  ): DeltaChange | null => {
    const sortedEntries = entryCounts
      .filter(entry => entry.sheetName === sheetName)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (sortedEntries.length < 1) return null;
    
    // Today's entries
    const today = sortedEntries[0].count;
    
    // Custom date or yesterday's entries
    let compareCount = 0;
    
    if (customDate) {
      // Find the custom date in the entries
      const customDateEntry = entryCounts.find(
        entry => entry.sheetName === sheetName && entry.date === customDate
      );
      
      if (customDateEntry) {
        compareCount = customDateEntry.count;
      } else {
        // If custom date not found, return null or default to yesterday
        return null; 
      }
    } else if (sortedEntries.length >= 2) {
      // Use yesterday if no custom date specified
      compareCount = sortedEntries[1].count;
    } else {
      return null; // Not enough data
    }

    const change = today - compareCount;
    const percentageChange = compareCount === 0 ? 0 : (change / compareCount) * 100;

    return {
      today,
      yesterday: compareCount, // This will be either yesterday or custom date count
      change,
      percentageChange
    };
  };

  // Update the exportToCSV function
  const exportToCSV = () => {
    if (Object.keys(sheetDataMap).length === 0) {
      alert('Please refresh the data for all profiles before exporting.');
      return;
    }

    try {
      // Prepare data for all three sheets with more descriptive headers
      const currentEntriesData: string[][] = [['Profile', 'Entry ID', 'Extra Data', 'Source Date']];
      const closedEntriesData: string[][] = [['Profile', 'Entry ID', 'Removed Since', 'Compare Date']];
      const newEntriesData: string[][] = [['Profile', 'Entry ID', 'Added Since', 'Compare Date']];
      
      const today = new Date();
      const formattedToday = format(today, 'yyyy-MM-dd');
      
      // Process each profile
      profiles.forEach(profile => {
        const data = sheetDataMap[profile.name];
        
        // Skip profiles with errors or no analysis column
        if (!data || !profile.analysisColumn || !Array.isArray(data)) {
          return;
        }
        
        const sheetData = data;
        const columnNum = parseInt(profile.analysisColumn);
        const extraColumnNum = parseInt(profile.extraColumn || '0');
        
        if (columnNum <= 0) return;
        
        // Get current entries (today's data)
        const currentRows = sheetData.filter(row => {
          const rowDate = row.date.split(' ')[0];
          return rowDate === formattedToday && row.matchesFilters;
        });
        
        // Add current entries to the first sheet
        currentRows.forEach(row => {
          const entryId = row.values[columnNum - 1]?.trim();
          if (entryId) {
            const extraData = extraColumnNum > 0 ? row.values[extraColumnNum - 1]?.trim() || '' : '';
            currentEntriesData.push([profile.name, entryId, extraData, formattedToday]);
          }
        });
        
        // Get closed and new entries based on comparison with custom or yesterday date
        const sortedEntries = entryCounts
          .filter(entry => entry.sheetName === profile.name)
          .sort((a, b) => b.date.localeCompare(a.date));
        
        if (sortedEntries.length >= 1) {
          // Determine the comparison date (custom date or yesterday)
          let compareDate = '';
          
          if (customCompareDate) {
            // Try to find the custom date in entry counts
            const customDateEntry = entryCounts.find(
              entry => entry.sheetName === profile.name && entry.date === customCompareDate
            );
            
            if (customDateEntry) {
              compareDate = customDateEntry.date;
            }
          } 
          
          // If no custom date or custom date not found, use yesterday
          if (!compareDate && sortedEntries.length >= 2) {
            compareDate = sortedEntries[1].date;
          }
          
          // Only proceed if we have a valid comparison date
          if (compareDate) {
            console.log(`Exporting comparison for ${profile.name} between ${compareDate} and ${formattedToday}`);
            
            // Get comparison day entries
            const compareRows = sheetData.filter(row => {
              const rowDate = row.date.split(' ')[0];
              return rowDate === compareDate && row.matchesFilters;
            });
            
            const compareEntries = compareRows
              .map(row => row.values[columnNum - 1]?.trim())
              .filter(Boolean);
              
            const currentEntries = currentRows
              .map(row => row.values[columnNum - 1]?.trim())
              .filter(Boolean);
            
            // Find closed entries (in compare day but not in today)
            const closedEntries = compareEntries.filter(entry => !currentEntries.includes(entry));
            
            // Find new entries (in today but not in compare day)
            const newEntries = currentEntries.filter(entry => !compareEntries.includes(entry));
            
            // Add closed entries to CSV
            closedEntries.forEach(entry => {
              closedEntriesData.push([profile.name, entry, formattedToday, compareDate]);
            });
            
            // Add new entries to CSV
            newEntries.forEach(entry => {
              newEntriesData.push([profile.name, entry, formattedToday, compareDate]);
            });
          }
        }
      });
      
      // Generate CSV content with all three sheets
      const csvContent = 
        "Current Entries\n" +
        arrayToCSV(currentEntriesData) +
        "\n\nClosed Entries\n" +
        arrayToCSV(closedEntriesData) +
        "\n\nNew Entries\n" +
        arrayToCSV(newEntriesData);
      
      // Download the CSV file with date information in the filename
      const compareInfo = customCompareDate ? `-vs-${customCompareDate}` : '';
      const filename = `profile-entries${compareInfo}-${formatDateForFilename()}.csv`;
      downloadCSV(csvContent, filename);
      
    } catch (err) {
      console.error('Error exporting to CSV:', err);
      alert('Failed to export data. See console for details.');
    }
  };

  // Update the hasProfileError function
  const hasProfileError = (profileName: string): boolean => {
    const data = sheetDataMap[profileName];
    return data ? !Array.isArray(data) && 'error' in data : false;
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
          <div className="flex space-x-4">
            <button
              onClick={exportToCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              title="Export all entries to CSV"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              <span>Export CSV</span>
            </button>
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
                <CustomDateComparison 
                  onCustomDateSelected={setCustomCompareDate}
                  currentCustomDate={customCompareDate}
                />
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'magnitude' | 'name')}
                    className="border rounded p-1 text-sm"
                  >
                    <option value="magnitude">Delta Magnitude (then Today&apos;s Count)</option>
                    <option value="name">Profile Name</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-100 rounded-t text-sm font-medium">
            <div className="col-span-3">Profile Name</div>
            <div className="col-span-2 text-center">Delta</div>
            <div className="col-span-3 text-center">
              {customCompareDate ? (
                <span className="font-medium text-blue-600">{customCompareDate}</span>
              ) : (
                "Yesterday"
              )}
            </div>
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
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-gray-700">Date Column</label>
                              <span className="text-xs text-gray-500">Used to group entries by date</span>
                            </div>
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
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-gray-700">Analysis Column</label>
                              <span className="text-xs text-gray-500">Used to track changes in specific entries</span>
                            </div>
                            {/* eslint-disable-next-line react/no-unescaped-entities */}
                            <div className="text-xs text-gray-500 mb-2">
                              This column will be used to analyze what entries have been added or removed between yesterday and today.
                              For example, if you&apos;re tracking opportunities, this would be the column containing opportunity IDs.
                            </div>
                            <input
                              type="number"
                              placeholder="Analysis Column Number"
                              className="w-full p-2 border rounded text-black"
                              value={editingProfile.analysisColumn || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                const numValue = parseInt(value);
                                if (numValue > 0) {
                                  handleEditChange('analysisColumn', value);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  const currentValue = parseInt(editingProfile.analysisColumn || '1') || 1;
                                  const newValue = e.key === 'ArrowUp' 
                                    ? currentValue + 1 
                                    : Math.max(1, currentValue - 1);
                                  handleEditChange('analysisColumn', newValue.toString());
                                }
                              }}
                              min="1"
                              step="1"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-gray-700">Extra Column</label>
                              <span className="text-xs text-gray-500">Optional column to display alongside analysis data</span>
                            </div>
                            <div className="text-xs text-gray-500 mb-2">
                              This column will be shown as additional information next to the analysis column data.
                              It doesn&apos;t affect analytics but provides extra context for each entry.
                            </div>
                            <input
                              type="number"
                              placeholder="Extra Column Number"
                              className="w-full p-2 border rounded text-black"
                              value={editingProfile.extraColumn || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                const numValue = parseInt(value);
                                if (numValue > 0) {
                                  handleEditChange('extraColumn', value);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  const currentValue = parseInt(editingProfile.extraColumn || '1') || 1;
                                  const newValue = e.key === 'ArrowUp' 
                                    ? currentValue + 1 
                                    : Math.max(1, currentValue - 1);
                                  handleEditChange('extraColumn', newValue.toString());
                                }
                              }}
                              min="1"
                              step="1"
                            />
                          </div>
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
                        {profile.analysisColumn ? (
                          <button
                            onClick={() => {
                              const columnNum = parseInt(profile.analysisColumn || '0');
                              if (columnNum > 0) {
                                const data = sheetDataMap[profile.name];
                                if (data) {
                                  // Use the extraColumn if specified, otherwise fall back to analysisColumn
                                  const extraColumnNum = parseInt(profile.extraColumn || '0');
                                  
                                  console.log('Profile:', profile);
                                  console.log('Extra column number:', extraColumnNum);
                                  
                                  const { entries, additionalEntries } = getCurrentEntries(
                                    data, 
                                    columnNum,
                                    extraColumnNum > 0 ? extraColumnNum : undefined
                                  );
                                  
                                  console.log('Entries:', entries.length, 'Additional entries:', additionalEntries?.length);
                                  
                                  setCurrentEntries({
                                    entries,
                                    additionalEntries,
                                    profileName: profile.name,
                                    columnIndex: columnNum
                                  });
                                } else {
                                  alert('Please refresh the data to view entries.');
                                }
                              } else {
                                alert('Please set an Analysis Column in the profile settings first.');
                              }
                            }}
                            className="hover:text-blue-600 text-left"
                          >
                            {profile.name}
                          </button>
                        ) : (
                          <span>{profile.name}</span>
                        )}
                      </div>
                      <div className="col-span-2 text-center">
                        {hasProfileError(profile.name) ? (
                          <span className="text-red-600 font-bold text-xl" title="Failed to load data">❌</span>
                        ) : delta ? (
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
                        ) : null}
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
        profileName={selectedChanges?.profileName ?? ''}
      />

      <CurrentEntriesModal
        isOpen={currentEntries !== null}
        onClose={() => setCurrentEntries(null)}
        entries={currentEntries?.entries ?? []}
        additionalEntries={currentEntries?.additionalEntries}
        profileName={currentEntries?.profileName ?? ''}
        columnIndex={currentEntries?.columnIndex ?? 0}
      />
    </div>
  );
} 