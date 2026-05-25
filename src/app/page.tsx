'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Settings,
  Play,
  Pause,
  Square,
  RefreshCw,
  Search,
  Lock,
  Unlock,
  Database,
  Terminal,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Info,
  Filter,
  Activity,
  Sun,
  Moon,
  LayoutList,
  Grid,
  BarChart2,
  MousePointer,
  ArrowUpDown,
  Type,
  Maximize2,
  Minimize2,
  Share2,
  Workflow,
  GitBranch
} from 'lucide-react';
import {
  loadConnections,
  saveConnections,
  isPasswordRequired,
  hasStoredConnections,
  KafkaConnection
} from '@/utils/storage';
import { useTheme } from 'next-themes';
import { isDesktopApp } from '@/utils/env';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface StreamedMessage {
  id: string;
  topic: string;
  partition: number;
  offset: string;
  timestamp: string;
  key: string | null;
  value: string | null;
  timestampDate: Date;
}

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && (!!(window as any).Electrobun || window.location.protocol === 'views:')) {
    return 'http://localhost:3005';
  }
  return process.env.NEXT_PUBLIC_API_URL || '';
};

const escapeRegExp = (str: string) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const highlightText = (text: string, search: string) => {
  if (!search || !search.trim()) return text;
  try {
    const escaped = escapeRegExp(search.trim());
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === search.trim().toLowerCase() ? (
        <mark key={i} className="bg-amber-500/35 text-foreground dark:text-stone-100 rounded-[2px] px-0.5 font-bold shadow-sm border border-amber-500/20">
          {part}
        </mark>
      ) : (
        part
      )
    );
  } catch (e) {
    return text;
  }
};

// Collapsible JSON Tree Viewer adapted to read theme-based variables
function JsonNode({ value, name, depth = 0, isDark = false, searchTerm = '' }: { value: any; name?: string; depth?: number; isDark: boolean; searchTerm?: string }) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  const isObject = value !== null && typeof value === 'object';
  const indent = depth * 16;

  if (!isObject) {
    let valueStr = String(value);
    let valueColor = isDark ? 'text-stone-100 font-medium' : 'text-stone-800 font-medium';

    if (typeof value === 'string') {
      valueStr = `"${value}"`;
      valueColor = isDark ? 'text-emerald-300 font-semibold' : 'text-emerald-700 font-semibold';
    } else if (typeof value === 'number') {
      valueColor = isDark ? 'text-amber-300 font-bold' : 'text-indigo-600 font-bold';
    } else if (typeof value === 'boolean') {
      valueColor = isDark ? 'text-orange-300 font-extrabold' : 'text-orange-700 font-extrabold';
    } else if (value === null) {
      valueColor = isDark ? 'text-rose-300 font-extrabold' : 'text-rose-600 font-extrabold';
    }

    return (
      <div className="flex py-0.5 font-mono text-inherit" style={{ paddingLeft: `${indent}px` }}>
        {name && <span className={isDark ? "text-amber-200 font-bold mr-2 select-none" : "text-slate-800 font-bold mr-2 select-none"}>{highlightText(name, searchTerm)}:</span>}
        <span className={valueColor}>{highlightText(valueStr, searchTerm)}</span>
      </div>
    );
  }

  const keys = Object.keys(value);
  const isArray = Array.isArray(value);
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  return (
    <div className="font-mono text-inherit select-text">
      <div
        className={`flex items-center py-0.5 cursor-pointer rounded px-1 -ml-1 select-none transition-colors ${isDark ? 'hover:bg-slate-800/40 text-slate-200' : 'hover:bg-indigo-50/60 text-stone-800'
          }`}
        style={{ paddingLeft: `${indent}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-muted-foreground/80 dark:text-stone-400 mr-1">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        {name && <span className={isDark ? "text-amber-200 font-bold mr-2 select-none" : "text-slate-800 font-bold mr-2 select-none"}>{highlightText(name, searchTerm)}:</span>}
        <span className="text-primary font-bold dark:text-amber-400">{isArray ? `Array(${keys.length})` : 'Object'}</span>
        <span className="text-muted-foreground/80 dark:text-stone-300 ml-1">{openBracket}</span>
        {!isExpanded && <span className="text-muted-foreground/80 dark:text-stone-300 font-bold">...{closeBracket}</span>}
      </div>

      {isExpanded && (
        <div>
          {keys.map((key) => (
            <JsonNode key={key} name={key} value={value[key]} depth={depth + 1} isDark={isDark} searchTerm={searchTerm} />
          ))}
          <div className="py-0.5 text-muted-foreground/60 dark:text-stone-400" style={{ paddingLeft: `${indent + 8}px` }}>
            {closeBracket}
          </div>
        </div>
      )}
    </div>
  );
}

function PremiumJsonViewer({ rawValue, isDark, searchTerm = '' }: { rawValue: string; isDark: boolean; searchTerm?: string }) {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  const parsedData = useMemo(() => {
    try {
      return JSON.parse(rawValue);
    } catch (e) {
      return null;
    }
  }, [rawValue]);

  if (!parsedData) {
    return <pre className="whitespace-pre-wrap break-all text-inherit font-mono text-muted-foreground dark:text-stone-300">{highlightText(rawValue, searchTerm)}</pre>;
  }

  return (
    <div className="space-y-2 mt-1">
      <div className="flex space-x-2 text-[10px] select-none border-b border-border dark:border-stone-800 pb-1">
        <button
          onClick={() => setViewMode('formatted')}
          className={`px-2 py-0.5 rounded font-mono transition-all border ${viewMode === 'formatted'
              ? 'bg-primary/10 text-primary border-primary/30 dark:bg-amber-400/10 dark:text-amber-400 dark:border-amber-400/30 font-bold'
              : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
        >
          JSON TREE
        </button>
        <button
          onClick={() => setViewMode('raw')}
          className={`px-2 py-0.5 rounded font-mono transition-all border ${viewMode === 'raw'
              ? 'bg-primary/10 text-primary border-primary/30 dark:bg-amber-400/10 dark:text-amber-400 dark:border-amber-400/30 font-bold'
              : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
        >
          RAW TEXT
        </button>
      </div>

      <div className="p-3 bg-muted/20 dark:bg-black/50 border border-border/80 dark:border-stone-800/80 rounded overflow-x-auto max-h-[400px]">
        {viewMode === 'formatted' ? (
          <JsonNode value={parsedData} isDark={isDark} searchTerm={searchTerm} />
        ) : (
          <pre className="text-inherit text-foreground/90 dark:text-stone-200 font-mono whitespace-pre overflow-x-auto">{highlightText(JSON.stringify(parsedData, null, 2), searchTerm)}</pre>
        )}
      </div>
    </div>
  );
}

const formatTimeWithMs = (date: Date) => {
  const hrs = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  const secs = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${hrs}:${mins}:${secs}.${ms}`;
};

interface TopicColorConfig {
  tagClass: string;
  cardClass: string;
  leftBarClass: string;
}

// 6 beautiful warm minimalist colors: Amber, Orange, Emerald, Rose, Teal, Violet
const getTopicStyles = (topic: string, isDark: boolean): TopicColorConfig => {
  // Standard card base classes for clean log rows
  const cardClass = 'border-border bg-card hover:bg-muted/5 transition-all shadow-sm';

  // Stable hash function to map topic to 0-5 index
  let hash = 0;
  for (let i = 0; i < topic.length; i++) {
    hash = topic.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % 6;

  if (isDark) {
    switch (colorIndex) {
      case 0: // Amber / Gold
        return {
          tagClass: 'bg-amber-500/25 border-amber-500/50 text-amber-100 font-extrabold shadow-sm',
          cardClass: 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all shadow-sm',
          leftBarClass: 'border-l-4 border-r-4 border-l-amber-500 border-r-amber-500'
        };
      case 1: // Orange / Rust
        return {
          tagClass: 'bg-orange-500/25 border-orange-500/50 text-orange-100 font-extrabold shadow-sm',
          cardClass: 'border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-all shadow-sm',
          leftBarClass: 'border-l-4 border-r-4 border-l-orange-500 border-r-orange-500'
        };
      case 2: // Emerald / Sage
        return {
          tagClass: 'bg-emerald-500/25 border-emerald-500/50 text-emerald-100 font-extrabold shadow-sm',
          cardClass: 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all shadow-sm',
          leftBarClass: 'border-l-4 border-r-4 border-l-emerald-500 border-r-emerald-500'
        };
      case 3: // Rose / Terracotta
        return {
          tagClass: 'bg-rose-500/25 border-rose-500/50 text-rose-100 font-extrabold shadow-sm',
          cardClass: 'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-all shadow-sm',
          leftBarClass: 'border-l-4 border-r-4 border-l-rose-500 border-r-rose-500'
        };
      case 4: // Teal / Cyber Blue
        return {
          tagClass: 'bg-teal-500/25 border-teal-500/50 text-teal-100 font-extrabold shadow-sm',
          cardClass: 'border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/10 transition-all shadow-sm',
          leftBarClass: 'border-l-4 border-r-4 border-l-teal-500 border-r-teal-500'
        };
      case 5: // Violet / Plum
      default:
        return {
          tagClass: 'bg-violet-500/25 border-violet-500/50 text-violet-100 font-extrabold shadow-sm',
          cardClass: 'border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 transition-all shadow-sm',
          leftBarClass: 'border-l-4 border-r-4 border-l-violet-500 border-r-violet-500'
        };
    }
  } else {
    switch (colorIndex) {
      case 0: // Stone
        return {
          tagClass: 'bg-stone-200 border-stone-500 text-stone-900 font-extrabold shadow-sm',
          cardClass: 'border-stone-400/15 bg-stone-50 hover:bg-stone-100 transition-all shadow-sm',
          leftBarClass: 'border-l-4 border-r-4 border-l-stone-500 border-r-stone-500'
        };
      case 1: // Orange
        return {
          tagClass: 'bg-orange-100 border-orange-500 text-orange-950 font-extrabold shadow-sm',
          cardClass: 'border-orange-500/15 bg-orange-50/40 hover:bg-orange-50/65 transition-all shadow-sm',
          leftBarClass: 'border-l-4 border-r-4 border-l-orange-500 border-r-orange-500'
        };
      case 2: // Emerald
        return {
          tagClass: 'bg-emerald-100 border-emerald-500 text-emerald-950 font-extrabold shadow-sm',
          cardClass: 'border-emerald-500/15 bg-emerald-50/40 hover:bg-emerald-50/65 transition-all shadow-sm',
          leftBarClass: 'border-l-4 border-r-4 border-l-emerald-500 border-r-emerald-500'
        };
      case 3: // Rose
        return {
          tagClass: 'bg-rose-100 border-rose-500 text-rose-950 font-extrabold shadow-sm',
          cardClass: 'border-rose-500/15 bg-rose-50/40 hover:bg-rose-50/65 transition-all shadow-sm',
          leftBarClass: 'border-l-4 border-r-4 border-l-rose-500 border-r-rose-500'
        };
      case 4: // Teal
        return {
          tagClass: 'bg-teal-100 border-teal-500 text-teal-950 font-extrabold shadow-sm',
          cardClass: 'border-teal-500/15 bg-teal-50/40 hover:bg-teal-50/65 transition-all shadow-sm',
          leftBarClass: 'border-l-4 border-r-4 border-l-teal-500 border-r-teal-500'
        };
      case 5: // Slate
      default:
        return {
          tagClass: 'bg-slate-200 border-slate-500 text-slate-900 font-extrabold shadow-sm',
          cardClass: 'border-slate-500/15 bg-slate-50 hover:bg-slate-100 transition-all shadow-sm',
          leftBarClass: 'border-l-4 border-r-4 border-l-slate-500 border-r-slate-500'
        };
    }
  }
};
function extractTraceId(msg: StreamedMessage): string | null {
  if (!msg.value) return null;
  const valTrim = msg.value.trim();
  if (!(valTrim.startsWith('{') || valTrim.startsWith('['))) {
    try {
      const match = valTrim.match(/trace[_-]?id["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-\.\:\+]+)["']?/i);
      if (match && match[1]) {
        return match[1];
      }
    } catch (e) {}
    return null;
  }
  try {
    const parsed = JSON.parse(valTrim);
    const findTraceId = (obj: any): string | null => {
      if (!obj || typeof obj !== 'object') return null;
      const keys = ['traceId', 'trace_id', 'traceID', 'traceid', 'transactionId', 'transaction_id'];
      for (const k of keys) {
        if (typeof obj[k] === 'string' && obj[k].trim().length > 3) {
          return obj[k].trim();
        }
        if (typeof obj[k] === 'number') {
          return String(obj[k]);
        }
      }
      const subObjects = ['meta', 'metadata', 'headers', 'context', 'trace'];
      for (const s of subObjects) {
        if (obj[s] && typeof obj[s] === 'object') {
          const res = findTraceId(obj[s]);
          if (res) return res;
        }
      }
      for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
          for (const k of keys) {
            if (typeof obj[key][k] === 'string' && obj[key][k].trim().length > 3) {
              return obj[key][k].trim();
            }
            if (typeof obj[key][k] === 'number') {
              return String(obj[key][k]);
            }
          }
        }
      }
      return null;
    };
    return findTraceId(parsed);
  } catch (err) {
    return null;
  }
}

const MessageRow = React.memo(function MessageRow({
  msg,
  isDark,
  isMultiSelect,
  searchTerm = '',
  onTraceClick,
}: {
  msg: StreamedMessage;
  isDark: boolean;
  isMultiSelect: boolean;
  searchTerm?: string;
  onTraceClick?: (traceId: string) => void;
}) {
  const isJson = msg.value && (msg.value.trim().startsWith('{') || msg.value.trim().startsWith('['));
  const { tagClass: topicTagColor, cardClass: cardStyle, leftBarClass } = getTopicStyles(msg.topic, isDark);
  const traceId = extractTraceId(msg);

  return (
    <div className={`border rounded p-3.5 shadow-md transition-all hover:shadow-lg hover:border-muted-foreground/30 hover:bg-muted/10 ${cardStyle} ${leftBarClass}`}>

      {/* Message Metadata row */}
      <div className="flex flex-wrap items-center justify-between pb-2 border-b border-border gap-2 select-none text-[11px] text-muted-foreground font-medium">

        <div className="flex items-center space-x-2">
          {/* Event Tracing Indicator */}
          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary uppercase tracking-wider font-mono">
            MSG-TRACE
          </span>

          {traceId && (
            <button
              onClick={() => onTraceClick?.(traceId)}
              className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 text-cyan-600 dark:text-cyan-400 font-mono text-[9px] font-extrabold transition-all cursor-pointer shadow-sm select-none"
              title={`Trace entire transaction flow (ID: ${traceId})`}
            >
              <Share2 size={9} />
              <span>TRACE: {traceId.length > 12 ? `${traceId.slice(0, 12)}...` : traceId}</span>
            </button>
          )}

          {/* Topic Color Hash Tag */}
          <span
            className={`px-2.5 py-0.5 rounded text-[0.85em] font-extrabold border inline-block text-center whitespace-nowrap truncate max-w-[220px] shadow-sm ${topicTagColor}`}
            title={msg.topic}
          >
            {msg.topic}
          </span>

          <span className="bg-muted/60 dark:bg-black/50 px-2 py-0.5 rounded text-foreground/90 dark:text-stone-200 font-mono font-bold border border-border/85 dark:border-stone-800/85">
            PARTITION: {msg.partition}
          </span>

          <span className="bg-muted/60 dark:bg-black/50 px-2 py-0.5 rounded text-foreground/90 dark:text-stone-200 font-mono font-bold border border-border/85 dark:border-stone-800/85">
            OFFSET: {msg.offset}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Timestamp */}
          <span className="font-mono font-bold text-foreground/90 dark:text-stone-100">
            {msg.timestampDate.toLocaleDateString()} {msg.timestampDate.toLocaleTimeString()}
          </span>

          {/* Copy button */}
          <button
            onClick={() => {
              if (msg.value) {
                navigator.clipboard.writeText(msg.value);
                alert('Message payload copied to clipboard.');
              }
            }}
            className="p-1 hover:text-primary text-muted-foreground hover:bg-muted rounded transition-colors"
            title="Copy payload"
          >
            <Copy size={11} />
          </button>
        </div>
      </div>

      {/* Message Body Key & Value */}
      <div className="pt-2.5 space-y-1.5">
        {msg.key && (
          <div className="text-inherit opacity-90 text-muted-foreground">
            <span className="text-primary font-bold">KEY:</span> <code className="bg-muted/80 dark:bg-black/60 border border-border/85 dark:border-stone-800/85 px-1.5 py-0.5 rounded text-inherit select-all text-foreground dark:text-amber-300 font-bold">{msg.key}</code>
          </div>
        )}

        <div className="text-inherit">
          {isJson ? (
            <PremiumJsonViewer rawValue={msg.value || ''} isDark={isDark} searchTerm={searchTerm} />
          ) : (
            <pre className="bg-muted/25 dark:bg-black/50 p-2.5 rounded border border-border/85 dark:border-stone-800/85 overflow-x-auto text-inherit whitespace-pre-wrap select-all font-mono text-foreground dark:text-stone-100">
              {msg.value !== null ? highlightText(msg.value, searchTerm) : <span className="text-muted-foreground/60 dark:text-stone-400 italic">null</span>}
            </pre>
          )}
        </div>
      </div>

    </div>
  );
});

export default function KafkaStreamUI() {
  // Theme Switching state with next-themes
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [desktopActive, setDesktopActive] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const [isTelemetryCollapsed, setIsTelemetryCollapsed] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    setDesktopActive(isDesktopApp());
  }, []);

  // Escape key listener to close tracing modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveTraceId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Connections state
  const [connections, setConnections] = useState<KafkaConnection[]>([]);
  const [activeConnId, setActiveConnId] = useState<string>('');
  const [masterPassword, setMasterPassword] = useState<string>('');
  const [showPasswordDialog, setShowPasswordDialog] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string>('');
  const [isLoadingProfiles, setIsLoadingProfiles] = useState<boolean>(true);

  // New/Edit connection dialog states
  const [isEditingConn, setIsEditingConn] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string>('');
  const [connName, setConnName] = useState<string>('');
  const [connBootstrap, setConnBootstrap] = useState<string>('');
  const [connClientId, setConnClientId] = useState<string>('kafka-stream-ui');
  const [connSSL, setConnSSL] = useState<boolean>(false);
  const [connSASL, setConnSASL] = useState<boolean>(false);
  const [connSASLMech, setConnSASLMech] = useState<'plain' | 'scram-sha-256' | 'scram-sha-512'>('plain');
  const [connSASLUser, setConnSASLUser] = useState<string>('');
  const [connSASLPass, setConnSASLPass] = useState<string>('');
  const [connSASLPassShow, setConnSASLPassShow] = useState<boolean>(false);

  // Set master password lock state
  const [newMasterPassword, setNewMasterPassword] = useState<string>('');
  const [confirmMasterPassword, setConfirmMasterPassword] = useState<string>('');
  const [isSettingLock, setIsSettingLock] = useState<boolean>(false);

  // Topic listing
  const [topics, setTopics] = useState<{ name: string; partitionCount: number; isInternal: boolean }[]>([]);
  const [topicsLoading, setTopicsLoading] = useState<boolean>(false);
  const [topicSearch, setTopicSearch] = useState<string>('');
  const [showInternalTopics, setShowInternalTopics] = useState<boolean>(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [lastConnectionTest, setLastConnectionTest] = useState<{ success: boolean; msg: string } | null>(null);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);

  // Real-time messages & statistics
  const [messages, setMessages] = useState<StreamedMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string>('');
  const [fromBeginning, setFromBeginning] = useState<boolean>(false);
  const [consoleFontSize, setConsoleFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');

  // Search & Filter within console
  const [consoleSearch, setConsoleSearch] = useState<string>('');
  const [filterPartition, setFilterPartition] = useState<string>('');
  const [filterKey, setFilterKey] = useState<string>('');

  // View mode and row expansion state for console
  const [consoleViewMode, setConsoleViewMode] = useState<'detailed' | 'dense'>('dense');
  const [activeTraceId, setActiveTraceId] = useState<string | null>(null);
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});
  const [isTerminalFullScreen, setIsTerminalFullScreen] = useState<boolean>(false);

  // Timeline drag filter state
  const [selectedTimeRange, setSelectedTimeRange] = useState<{ start: Date; end: Date } | null>(null);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState<boolean>(false);
  const [dragStartPercent, setDragStartPercent] = useState<number | null>(null);
  const [dragCurrentPercent, setDragCurrentPercent] = useState<number | null>(null);

  // Performance / Stats tracking
  const [msgCountLastSec, setMsgCountLastSec] = useState<number>(0);
  const [msgRates, setMsgRates] = useState<number[]>(new Array(30).fill(0));
  const rateCounterRef = useRef<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const terminalTopRef = useRef<HTMLDivElement | null>(null);
  const terminalBottomRef = useRef<HTMLDivElement | null>(null);
  const messageBufferRef = useRef<StreamedMessage[]>([]);
  const bufferIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [logSortOrder, setLogSortOrder] = useState<'asc' | 'desc'>('asc');
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);

  // Initialize Theme and Profiles on mount
  useEffect(() => {
    // Setup Connection Profiles
    async function initProfiles() {
      setIsLoadingProfiles(true);
      if (isPasswordRequired()) {
        setShowPasswordDialog(true);
      } else {
        try {
          // If no stored connections exist, seed with a default localhost connection
          if (!hasStoredConnections()) {
            const defaultConnection: KafkaConnection = {
              id: 'conn-localhost-default',
              name: 'Localhost Broker',
              bootstrapServers: 'localhost:9092',
              clientId: 'kafka-stream-ui',
              ssl: false,
            };
            await saveConnections([defaultConnection]);
            setConnections([defaultConnection]);
            setActiveConnId(defaultConnection.id);
          } else {
            const profiles = await loadConnections();
            setConnections(profiles);
            if (profiles.length > 0) {
              setActiveConnId(profiles[0].id);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      setIsLoadingProfiles(false);
    }
    initProfiles();
  }, []);



  // Update rates every second
  useEffect(() => {
    const interval = setInterval(() => {
      const currentRate = rateCounterRef.current;
      setMsgCountLastSec(currentRate);
      rateCounterRef.current = 0;

      setMsgRates((prev) => {
        const next = [...prev.slice(1), currentRate];
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Global SSE Stream Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (bufferIntervalRef.current) {
        clearInterval(bufferIntervalRef.current);
      }
    };
  }, []);

  // Listen for Escape key to exit fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTerminalFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll) {
      if (logSortOrder === 'desc' && terminalTopRef.current) {
        terminalTopRef.current.scrollIntoView({ behavior: 'auto' });
      } else if (logSortOrder === 'asc' && terminalBottomRef.current) {
        terminalBottomRef.current.scrollIntoView({ behavior: 'auto' });
      }
    }
  }, [messages, autoScroll, logSortOrder]);

  // Selected Connection Profile details
  const activeConnection = useMemo(() => {
    return connections.find(c => c.id === activeConnId) || null;
  }, [connections, activeConnId]);

  // Load list of topics when active connection changes
  useEffect(() => {
    if (activeConnection) {
      fetchTopics();
      // Reset active consumer if switching connections
      stopStreaming();
      setSelectedTopics([]);
      setMessages([]);
    } else {
      setTopics([]);
    }
  }, [activeConnId]);

  // Verify Master Password
  const handlePasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    try {
      const profiles = await loadConnections(masterPassword);
      setConnections(profiles);
      if (profiles.length > 0) {
        setActiveConnId(profiles[0].id);
      }
      setShowPasswordDialog(false);
    } catch (e) {
      setPasswordError('Invalid Master Password. Please try again.');
    }
  };

  // Add / Edit Connection Profiles
  const openNewConnectionForm = () => {
    setEditingId('');
    setConnName('');
    setConnBootstrap('');
    setConnClientId('kafka-stream-ui');
    setConnSSL(false);
    setConnSASL(false);
    setConnSASLUser('');
    setConnSASLPass('');
    setConnSASLMech('plain');
    setLastConnectionTest(null);
    setIsEditingConn(true);
    setIsMobileSidebarOpen(false);
  };

  const openEditConnectionForm = (conn: KafkaConnection) => {
    setEditingId(conn.id);
    setConnName(conn.name);
    setConnBootstrap(conn.bootstrapServers);
    setConnClientId(conn.clientId || 'kafka-stream-ui');
    setConnSSL(conn.ssl);
    setConnSASL(!!conn.sasl);
    if (conn.sasl) {
      setConnSASLMech(conn.sasl.mechanism);
      setConnSASLUser(conn.sasl.username);
      setConnSASLPass(conn.sasl.password);
    } else {
      setConnSASLUser('');
      setConnSASLPass('');
      setConnSASLMech('plain');
    }
    setLastConnectionTest(null);
    setIsEditingConn(true);
    setIsMobileSidebarOpen(false);
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connName || !connBootstrap) return;

    const newProfile: KafkaConnection = {
      id: editingId || `conn-${Date.now()}`,
      name: connName,
      bootstrapServers: connBootstrap,
      clientId: connClientId || undefined,
      ssl: connSSL,
      sasl: connSASL ? {
        mechanism: connSASLMech,
        username: connSASLUser,
        password: connSASLPass
      } : undefined
    };

    let nextConnections = [...connections];
    if (editingId) {
      nextConnections = nextConnections.map(c => c.id === editingId ? newProfile : c);
    } else {
      nextConnections.push(newProfile);
    }

    try {
      await saveConnections(nextConnections, masterPassword || undefined);
      setConnections(nextConnections);
      setActiveConnId(newProfile.id);
      setIsEditingConn(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteConnection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this connection profile?')) return;

    const nextConnections = connections.filter(c => c.id !== id);
    try {
      await saveConnections(nextConnections, masterPassword || undefined);
      setConnections(nextConnections);
      if (activeConnId === id) {
        setActiveConnId(nextConnections.length > 0 ? nextConnections[0].id : '');
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Set / Remove Master Password lock
  const handleSetLock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMasterPassword !== confirmMasterPassword) {
      alert('Passwords do not match.');
      return;
    }

    try {
      await saveConnections(connections, newMasterPassword || undefined);
      setMasterPassword(newMasterPassword);
      setIsSettingLock(false);
      alert(newMasterPassword ? 'Database successfully encrypted with Master Password.' : 'Credentials storage unlocked (plain storage).');
    } catch (err) {
      alert('Failed to update storage lock settings.');
    }
  };

  // Test current connection dialog inputs
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setLastConnectionTest(null);

    const testPayload = {
      bootstrapServers: connBootstrap,
      clientId: connClientId,
      ssl: connSSL,
      sasl: connSASL ? {
        mechanism: connSASLMech,
        username: connSASLUser,
        password: connSASLPass
      } : undefined
    };

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/kafka/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });
      const data = await res.json();
      if (data.success) {
        setLastConnectionTest({
          success: true,
          msg: `Successfully connected! Active brokers detected: ${data.brokers}. Cluster ID: ${data.clusterId || 'N/A'}`
        });
      } else {
        setLastConnectionTest({
          success: false,
          msg: data.error || 'Connection failed.'
        });
      }
    } catch (error: any) {
      setLastConnectionTest({
        success: false,
        msg: error.message || 'Network error occurred while testing connection.'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Fetch topics list from stateless backend
  const fetchTopics = async () => {
    if (!activeConnection) return;
    setTopicsLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/kafka/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeConnection),
      });
      const data = await res.json();
      if (data.success) {
        setTopics(data.topics);
      } else {
        alert(`Failed to retrieve topics: ${data.error}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setTopicsLoading(false);
    }
  };

  // Streaming logs controls
  const startStreaming = (overrideFromBeginning?: boolean) => {
    if (!activeConnection || selectedTopics.length === 0) return;

    stopStreaming(); // Ensure any existing connection is cleared
    setIsStreaming(true);
    setStreamError('');

    // Setup periodic flushing of message buffer (every 150ms) to dramatically reduce UI thread render overload under high throughput
    bufferIntervalRef.current = setInterval(() => {
      if (messageBufferRef.current.length > 0) {
        const incoming = messageBufferRef.current;
        messageBufferRef.current = [];
        setMessages((prev) => {
          const next = [...prev, ...incoming];
          if (next.length > 1000) {
            return next.slice(next.length - 1000);
          }
          return next;
        });
      }
    }, 150);

    const encodedConfig = btoa(JSON.stringify(activeConnection));
    const topicsParam = selectedTopics.join(',');
    const useFromBeginning = overrideFromBeginning !== undefined ? overrideFromBeginning : fromBeginning;
    const url = `${getApiBaseUrl()}/api/kafka/stream?config=${encodeURIComponent(encodedConfig)}&topics=${encodeURIComponent(topicsParam)}&fromBeginning=${useFromBeginning}`;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        const newMsg: StreamedMessage = {
          id: `${payload.topic}-${payload.partition}-${payload.offset}-${Date.now()}-${Math.random()}`,
          topic: payload.topic,
          partition: payload.partition,
          offset: payload.offset,
          timestamp: payload.timestamp,
          key: payload.key,
          value: payload.value,
          timestampDate: new Date(Number(payload.timestamp))
        };

        rateCounterRef.current += 1;
        messageBufferRef.current.push(newMsg);
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    });

    eventSource.addEventListener('error', (event: any) => {
      console.error('SSE connection error:', event);
      setStreamError('Lost connection to stream proxy server. Reconnecting...');
    });
  };

  const stopStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (bufferIntervalRef.current) {
      clearInterval(bufferIntervalRef.current);
      bufferIntervalRef.current = null;
    }
    // Flush remaining buffer
    if (messageBufferRef.current.length > 0) {
      const incoming = messageBufferRef.current;
      messageBufferRef.current = [];
      setMessages((prev) => {
        const next = [...prev, ...incoming];
        if (next.length > 1000) {
          return next.slice(next.length - 1000);
        }
        return next;
      });
    }
    setIsStreaming(false);
  };

  const handleToggleFromBeginning = (checked: boolean) => {
    setFromBeginning(checked);
    setMessages([]);
    messageBufferRef.current = [];
    setSelectedTimeRange(null);
    setDragStartPercent(null);
    setDragCurrentPercent(null);

    if (isStreaming) {
      startStreaming(checked);
    }
  };

  const toggleTopicSelection = (topicName: string) => {
    setSelectedTopics(prev => {
      if (prev.includes(topicName)) {
        return prev.filter(t => t !== topicName);
      } else {
        return [...prev, topicName];
      }
    });
  };

  const selectAllTopics = () => {
    const visibleTopics = topics
      .filter(t => !t.isInternal || showInternalTopics)
      .filter(t => t.name.toLowerCase().includes(topicSearch.toLowerCase()))
      .map(t => t.name);

    setSelectedTopics(visibleTopics);
  };

  const clearTopicSelection = () => {
    setSelectedTopics([]);
  };

  // Timeline log count bucket calculation
  const timelineData = useMemo(() => {
    if (messages.length === 0) return { buckets: new Array(30).fill(0), minTime: 0, maxTime: 0 };

    const times = messages.map(m => m.timestampDate.getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    const bucketCount = 30;
    if (minTime === maxTime) {
      const buckets = new Array(bucketCount).fill(0);
      buckets[0] = messages.length;
      return { buckets, minTime, maxTime };
    }

    const bucketDuration = (maxTime - minTime) / bucketCount;
    const buckets = new Array(bucketCount).fill(0);

    messages.forEach(msg => {
      const msgTime = msg.timestampDate.getTime();
      const bucketIdx = Math.min(
        bucketCount - 1,
        Math.floor((msgTime - minTime) / bucketDuration)
      );
      if (bucketIdx >= 0 && bucketIdx < bucketCount) {
        buckets[bucketIdx] += 1;
      }
    });

    return { buckets, minTime, maxTime };
  }, [messages]);

  const selectionStartPercent = useMemo(() => {
    if (!selectedTimeRange || timelineData.minTime === timelineData.maxTime) return null;
    const delta = timelineData.maxTime - timelineData.minTime;
    return Math.max(0, Math.min(100, ((selectedTimeRange.start.getTime() - timelineData.minTime) / delta) * 100));
  }, [selectedTimeRange, timelineData]);

  const selectionEndPercent = useMemo(() => {
    if (!selectedTimeRange || timelineData.minTime === timelineData.maxTime) return null;
    const delta = timelineData.maxTime - timelineData.minTime;
    return Math.max(0, Math.min(100, ((selectedTimeRange.end.getTime() - timelineData.minTime) / delta) * 100));
  }, [selectedTimeRange, timelineData]);

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (messages.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    setDragStartPercent(pct);
    setDragCurrentPercent(pct);
    setIsDraggingTimeline(true);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (messages.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    setHoverPercent(pct);
    if (isDraggingTimeline) {
      setDragCurrentPercent(pct);
    }
  };

  const handleTimelineMouseUp = () => {
    if (!isDraggingTimeline) return;
    setIsDraggingTimeline(false);

    if (dragStartPercent !== null && dragCurrentPercent !== null) {
      const p1 = Math.min(dragStartPercent, dragCurrentPercent);
      const p2 = Math.max(dragStartPercent, dragCurrentPercent);

      if (p2 - p1 < 0.01) {
        setSelectedTimeRange(null);
        setDragStartPercent(null);
        setDragCurrentPercent(null);
        return;
      }

      const { minTime, maxTime } = timelineData;
      const delta = maxTime - minTime;
      const start = new Date(minTime + p1 * delta);
      const end = new Date(minTime + p2 * delta);
      setSelectedTimeRange({ start, end });
    }
  };

  // Filter messages displayed in console
  const filteredMessages = useMemo(() => {
    const filtered = messages.filter(msg => {
      // Partition filter
      if (filterPartition && msg.partition.toString() !== filterPartition) {
        return false;
      }
      // Key filter
      if (filterKey && (!msg.key || !msg.key.toLowerCase().includes(filterKey.toLowerCase()))) {
        return false;
      }
      // Timeline filter
      if (selectedTimeRange) {
        const msgTime = msg.timestampDate.getTime();
        if (msgTime < selectedTimeRange.start.getTime() || msgTime > selectedTimeRange.end.getTime()) {
          return false;
        }
      }
      // Console keyword search (Deep Full-Text Search)
      if (consoleSearch) {
        const term = consoleSearch.toLowerCase();
        const valueMatch = msg.value && msg.value.toLowerCase().includes(term);
        const keyMatch = msg.key && msg.key.toLowerCase().includes(term);
        const topicMatch = msg.topic.toLowerCase().includes(term);
        const partitionMatch = msg.partition.toString().includes(term);
        const offsetMatch = msg.offset.toString().includes(term);
        return valueMatch || keyMatch || topicMatch || partitionMatch || offsetMatch;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      const tA = Number(a.timestamp);
      const tB = Number(b.timestamp);
      if (logSortOrder === 'asc') {
        return tA - tB;
      } else {
        return tB - tA;
      }
    });
  }, [messages, consoleSearch, filterPartition, filterKey, selectedTimeRange, logSortOrder]);

  // Compute active log timeframe bounds inside console
  const messagesTimeRange = useMemo(() => {
    if (filteredMessages.length === 0) return null;
    let minT = filteredMessages[0].timestampDate;
    let maxT = filteredMessages[0].timestampDate;
    for (let i = 1; i < filteredMessages.length; i++) {
      const d = filteredMessages[i].timestampDate;
      if (d < minT) minT = d;
      if (d > maxT) maxT = d;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return {
      start: formatTime(minT),
      end: formatTime(maxT)
    };
  }, [filteredMessages]);

  // Memoized trace messages matching the selected Trace ID
  const traceMessages = useMemo(() => {
    if (!activeTraceId) return [];
    return messages
      .filter((m) => extractTraceId(m) === activeTraceId)
      .sort((a, b) => a.timestampDate.getTime() - b.timestampDate.getTime());
  }, [messages, activeTraceId]);

  // Max value in SVG chart to scale heights
  const maxMsgRate = useMemo(() => {
    const maxVal = Math.max(...msgRates);
    return maxVal > 10 ? maxVal : 10;
  }, [msgRates]);

  const isDark = mounted ? resolvedTheme === 'dark' : false;

  return (
    <div className="min-h-screen flex flex-col bg-background relative">

      {/* 1. Header Navigation */}
      <header className="border-b border-border bg-card/90 px-4 py-2 sm:px-6 sm:py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="lg:hidden p-1.5 rounded bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer shadow-xs select-none"
            title="Toggle Connection and Topic Sidebar"
          >
            <Filter size={16} className={isMobileSidebarOpen ? 'text-primary' : ''} />
          </button>

          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
            <Activity className="animate-pulse w-4.5 h-4.5 sm:w-5 sm:h-5" size={18} />
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-bold tracking-wide text-primary flex items-center font-mono">
              KAFKA STREAM CONSOLE
              {desktopActive && (
                <span className="ml-2 py-0.5 px-1.5 text-[8px] sm:text-[9px] font-extrabold uppercase bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded tracking-wider flex items-center space-x-1 shadow-sm select-none animate-pulse">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block"></span>
                  <span>DESKTOP</span>
                </span>
              )}
            </h1>
            <p className="text-[8px] sm:text-[10px] text-muted-foreground font-mono tracking-wider hidden sm:block">SECURE BROWSER-STATELESS CLIENT PROXY</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Theme Switcher Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="p-2 rounded-md border border-border bg-muted/40 text-muted-foreground hover:text-foreground transition-all shadow-sm flex items-center justify-center cursor-pointer"
              title="Toggle theme"
            >
              {isDark ? <Sun size={14} className="text-amber-400 animate-pulse" /> : <Moon size={14} className="text-stone-700" />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="font-mono text-xs select-none">
              <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
                <Sun size={12} className="mr-2 text-stone-600" /> Stone Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
                <Moon size={12} className="mr-2 text-cyan-400" /> Cyber Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
                <Settings size={12} className="mr-2" /> System Default
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Encryption status indicator */}
          {!desktopActive && (
            <button
              onClick={() => setIsSettingLock(true)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-md border border-border bg-card text-xs text-muted-foreground hover:text-foreground transition-all font-mono shadow-sm"
            >
              {masterPassword ? (
                <>
                  <Lock size={12} className="text-emerald-600 animate-pulse" />
                  <span className="text-emerald-600 font-bold hidden sm:inline">AES-GCM ENCRYPTED</span>
                </>
              ) : (
                <>
                  <Unlock size={12} className="text-orange-600" />
                  <span className="text-orange-600 hidden sm:inline">UNLOCKED STORAGE</span>
                </>
              )}
            </button>
          )}

          <span
            className="text-[10px] px-3 py-1.5 font-mono text-muted-foreground border border-border bg-card rounded-md shadow-sm select-none hidden sm:inline-block"
          >
            v1.0.0
          </span>
        </div>
      </header>

      {/* 2. Primary Layout Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[360px_1fr] overflow-hidden relative">

        {/* Mobile Backdrop Overlay */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-stone-950/40 backdrop-blur-xs transition-opacity lg:hidden cursor-pointer"
          />
        )}

        {/* Left Bar: Connection Profile list & Topics explorer */}
        <aside className={`p-6 flex flex-col space-y-6 overflow-hidden transition-all duration-300 ease-in-out z-50
          fixed bottom-0 left-0 right-0 w-full h-[90vh] rounded-t-2xl bg-card shadow-2xl border-t border-border
          lg:static lg:w-auto lg:h-[calc(100vh-73px)] lg:bg-muted/20 lg:shadow-none lg:border-t-0 lg:border-r lg:rounded-none lg:translate-y-0
          ${isMobileSidebarOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
        `}>
          {/* Mobile Drawer pull handle */}
          <div className="w-12 h-1.5 bg-muted-foreground/25 rounded-full mx-auto shrink-0 mb-1 lg:hidden" />

          {/* Connections Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold tracking-wider text-muted-foreground flex items-center">
                <Database size={13} className="mr-2 text-primary" />
                CONNECTION PROFILES ({connections.length})
              </label>
              <button
                onClick={openNewConnectionForm}
                className="w-6 h-6 rounded bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center border border-primary/20 hover:border-primary/45 transition-all"
              >
                <Plus size={14} />
              </button>
            </div>

            {connections.length === 0 ? (
              <div className="p-4 rounded-lg bg-card border border-dashed border-border text-center space-y-2">
                <p className="text-xs text-muted-foreground font-mono">No Kafka connections configured yet.</p>
                <button
                  onClick={openNewConnectionForm}
                  className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:border-primary/40 text-[10px] rounded font-mono transition-all font-bold"
                >
                  ADD CONNECTION
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    onClick={() => { setActiveConnId(conn.id); setIsMobileSidebarOpen(false); }}
                    className={`p-3 rounded border text-left cursor-pointer transition-all flex items-center justify-between ${activeConnId === conn.id
                        ? 'bg-primary/15 border-primary/40 text-foreground shadow-sm'
                        : 'bg-card hover:bg-muted/30 border-border text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${activeConnId === conn.id ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'}`} />
                        <span className="font-mono text-xs font-bold truncate block">{conn.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 font-mono truncate block mt-0.5">{conn.bootstrapServers}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 ml-2 select-none">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditConnectionForm(conn); }}
                        className="p-1 hover:text-primary text-muted-foreground hover:bg-muted/40 rounded transition-colors"
                      >
                        <Settings size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteConnection(conn.id, e)}
                        className="p-1 hover:text-destructive text-muted-foreground hover:bg-muted/40 rounded transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-border" />

          {/* Topics Explorer Section */}
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold tracking-wider text-muted-foreground flex items-center">
                <Terminal size={13} className="mr-2 text-primary" />
                TOPICS DIRECTORY
              </label>
              {activeConnection && (
                <button
                  onClick={fetchTopics}
                  disabled={topicsLoading}
                  className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded disabled:opacity-40 transition-all"
                  title="Reload topics"
                >
                  <RefreshCw size={12} className={topicsLoading ? 'animate-spin' : ''} />
                </button>
              )}
            </div>

            {!activeConnection ? (
              <div className="p-6 rounded-lg bg-card border border-border text-center flex-1 flex flex-col justify-center items-center">
                <Info size={24} className="text-muted-foreground/45 mb-2" />
                <p className="text-xs text-muted-foreground font-mono">Select a connection profile to browse Kafka topics.</p>
              </div>
            ) : topicsLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground font-mono flex flex-col items-center space-y-2">
                <RefreshCw className="animate-spin text-primary" size={18} />
                <span>Fetching metadata cluster topics...</span>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 space-y-2">
                {/* Topic Search & Toggles */}
                <div className="space-y-2 bg-muted/40 p-2.5 rounded border border-border shadow-inner">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 text-muted-foreground/60" size={12} />
                    <input
                      type="text"
                      placeholder="Search topics..."
                      value={topicSearch}
                      onChange={(e) => setTopicSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-card border border-border rounded text-xs font-mono placeholder-muted-foreground/50 focus:outline-none focus:border-primary/50"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <label className="flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showInternalTopics}
                        onChange={(e) => setShowInternalTopics(e.target.checked)}
                        className="mr-1.5 accent-primary rounded bg-card border-border"
                      />
                      Show internal ({topics.filter(t => t.isInternal).length})
                    </label>

                    <div className="flex space-x-2">
                      <button onClick={selectAllTopics} className="hover:text-primary">All</button>
                      <span>|</span>
                      <button onClick={clearTopicSelection} className="hover:text-primary">None</button>
                    </div>
                  </div>
                </div>

                {/* Topics List Checkbox */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-1 min-h-0">
                  {topics
                    .filter(t => !t.isInternal || showInternalTopics)
                    .filter(t => t.name.toLowerCase().includes(topicSearch.toLowerCase()))
                    .map((topic) => {
                      const isSelected = selectedTopics.includes(topic.name);
                      return (
                        <div
                          key={topic.name}
                          onClick={() => toggleTopicSelection(topic.name)}
                          className={`p-2 rounded cursor-pointer transition-all border flex items-center justify-between ${isSelected
                              ? 'bg-primary/10 border-primary/20 text-primary shadow-sm'
                              : 'bg-card hover:bg-muted/20 border-border text-muted-foreground'
                            }`}
                        >
                          <div className="flex items-center min-w-0 mr-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="mr-2 accent-primary rounded bg-card border-border cursor-pointer"
                            />
                            <span className="font-mono text-xs truncate select-all">{topic.name}</span>
                          </div>

                          <div className="flex items-center space-x-1.5 font-mono text-[9px] text-muted-foreground/60">
                            {topic.isInternal && <span className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded px-1 scale-90 font-bold">int</span>}
                            <span className="bg-muted text-muted-foreground px-1.5 rounded border border-border">{topic.partitionCount} P</span>
                          </div>
                        </div>
                      );
                    })}

                  {topics.filter(t => !t.isInternal || showInternalTopics).filter(t => t.name.toLowerCase().includes(topicSearch.toLowerCase())).length === 0 && (
                    <div className="py-6 text-center text-xs text-muted-foreground/40 font-mono">No matching topics found.</div>
                  )}
                </div>

                {/* Confirm/Trigger block */}
                {selectedTopics.length > 0 && (
                  <button
                    onClick={isStreaming ? stopStreaming : () => startStreaming()}
                    className={`w-full py-2.5 px-4 rounded font-mono text-xs font-bold tracking-wider flex items-center justify-center space-x-2 transition-all shadow ${isStreaming
                        ? 'bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30'
                        : 'bg-primary text-primary-foreground hover:brightness-95 border border-primary font-bold'
                      }`}
                  >
                    {isStreaming ? (
                      <>
                        <Square size={13} fill="currentColor" />
                        <span>DISCONNECT STREAM</span>
                      </>
                    ) : (
                      <>
                        <Play size={13} fill="currentColor" />
                        <span>STREAM ACTIVE ({selectedTopics.length}) TOPICS</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Right Section: Streaming Console Terminal Hub */}
        <main className={`flex flex-col min-h-0 overflow-hidden transition-all ${isTerminalFullScreen
            ? 'fixed inset-0 z-50 w-screen h-screen max-h-screen bg-background p-0 space-y-0'
            : 'p-6 space-y-4 max-h-[calc(100vh-73px)]'
          }`}>

          {/* Unified Stream Telemetry Panel (Combined Timeline + Throughput) */}
          {!isTelemetryCollapsed && (
            <div className={`bg-card border shadow-sm p-4 ${isTerminalFullScreen ? 'rounded-none border-x-0 border-t-0 border-b border-border animate-none' : 'border-border rounded-xl'
              }`}>
              {/* Bottom Row: Volumetric timeline chart (left) and Throughput chart (right) */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_190px] gap-4 items-stretch">

                {/* Volumetric timeline chart */}
                <div className="flex flex-col space-y-2 select-none relative min-w-0">
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <BarChart2 size={13} className="text-primary animate-pulse" />
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px]">Volumetric Stream Timeline</span>
                    </div>
                    {selectedTimeRange && (
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">
                          FILTERED: {new Date(selectedTimeRange.start).toLocaleTimeString()} - {new Date(selectedTimeRange.end).toLocaleTimeString()}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedTimeRange(null);
                            setDragStartPercent(null);
                            setDragCurrentPercent(null);
                          }}
                          className="text-[8px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 px-1.5 py-0.5 rounded transition-all font-bold font-mono"
                        >
                          RESET BRUSH
                        </button>
                      </div>
                    )}
                  </div>

                  <div
                    className="h-14 relative bg-muted/30 rounded border border-border overflow-hidden cursor-crosshair select-none"
                    onMouseDown={handleTimelineMouseDown}
                    onMouseMove={handleTimelineMouseMove}
                    onMouseUp={handleTimelineMouseUp}
                    onMouseLeave={() => {
                      setHoverPercent(null);
                      if (isDraggingTimeline) {
                        handleTimelineMouseUp();
                      }
                    }}
                  >
                    {/* Gridlines */}
                    <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="h-full border-r border-dashed border-muted-foreground/30 w-px" />
                      ))}
                    </div>

                    {/* Bars */}
                    <div className="absolute inset-0 flex items-end justify-between px-1 space-x-0.5 pt-2">
                      {timelineData.buckets.map((count, idx) => {
                        const maxVal = Math.max(...timelineData.buckets, 1);
                        const pct = (count / maxVal) * 100;
                        return (
                          <div key={idx} className="flex-1 flex flex-col justify-end h-full">
                            <div
                              style={{ height: `${Math.max(4, pct)}%` }}
                              className={`rounded-t-sm transition-all duration-200 ${count > 0
                                  ? 'bg-primary/45 hover:bg-primary/70 border border-primary/25 shadow-sm'
                                  : 'bg-muted/15 border border-transparent'
                                }`}
                              title={`${count} messages in bucket ${idx + 1}`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Drag Selection Overlay */}
                    {((isDraggingTimeline && dragStartPercent !== null && dragCurrentPercent !== null) ||
                      (selectionStartPercent !== null && selectionEndPercent !== null)) && (
                        <div
                          style={{
                            left: `${isDraggingTimeline && dragStartPercent !== null && dragCurrentPercent !== null
                                ? Math.min(dragStartPercent, dragCurrentPercent) * 100
                                : selectionStartPercent
                              }%`,
                            width: `${isDraggingTimeline && dragStartPercent !== null && dragCurrentPercent !== null
                                ? Math.abs(dragCurrentPercent - dragStartPercent) * 100
                                : (selectionStartPercent !== null && selectionEndPercent !== null
                                  ? selectionEndPercent - selectionStartPercent
                                  : 0)
                              }%`
                          }}
                          className="absolute top-0 bottom-0 bg-primary/20 border-l border-r border-primary/50 backdrop-blur-[1px] pointer-events-none transition-[left,width] duration-75 flex items-center justify-between"
                        >
                          <div className="w-0.5 h-full bg-primary/40" />
                          <div className="w-0.5 h-full bg-primary/40" />
                        </div>
                      )}

                    {/* Hover Timestamp Tooltip */}
                    {hoverPercent !== null && timelineData.minTime > 0 && (
                      <>
                        <div
                          style={{ left: `${hoverPercent * 100}%` }}
                          className="absolute top-0 bottom-0 w-px bg-primary pointer-events-none z-20"
                        />
                        <div
                          style={{
                            left: `${hoverPercent * 100}%`,
                            transform: `translateX(${hoverPercent > 0.82 ? '-100%' : hoverPercent < 0.18 ? '0%' : '-50%'})`
                          }}
                          className="absolute top-1 bg-stone-900/90 dark:bg-black/90 text-white border border-border text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none z-30 backdrop-blur-sm select-none"
                        >
                          {formatTimeWithMs(new Date(timelineData.minTime + hoverPercent * (timelineData.maxTime - timelineData.minTime)))}
                        </div>
                      </>
                    )}

                    {/* Hint when empty */}
                    {messages.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground/45 font-mono tracking-widest pointer-events-none select-none">
                        AWAITING LIVE DATA STREAM TO PLOT VOLUMETRIC TIMELINE
                      </div>
                    )}
                  </div>

                  {/* Time bounds */}
                  <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground/60 select-none">
                    <span>
                      {timelineData.minTime > 0
                        ? new Date(timelineData.minTime).toLocaleTimeString()
                        : '--:--:--'}
                    </span>
                    <span className="text-[8px] tracking-wider text-muted-foreground/45 flex items-center hidden sm:flex">
                      <MousePointer size={8} className="mr-1 animate-pulse" /> CLICK & DRAG TO BRUSH FILTER WINDOW
                    </span>
                    <span>
                      {timelineData.maxTime > 0
                        ? new Date(timelineData.maxTime).toLocaleTimeString()
                        : '--:--:--'}
                    </span>
                  </div>
                </div>

                {/* Throughput indicator */}
                <div className="bg-muted/35 border border-border rounded-xl px-3 py-2.5 flex items-center justify-between shadow-inner shrink-0">
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono text-muted-foreground/65 tracking-wider block font-bold">THROUGHPUT</span>
                    <span className="text-base font-mono font-bold text-primary block leading-tight">
                      {msgCountLastSec} <span className="text-[10px] text-muted-foreground font-normal">msg/s</span>
                    </span>
                  </div>

                  {/* SVG mini rates chart */}
                  <div className="w-[85px] h-[28px] overflow-hidden bg-muted/70 rounded border border-border relative">
                    <svg className="w-full h-full">
                      <polyline
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="1.5"
                        points={msgRates.map((val, idx) => {
                          const x = (idx / (msgRates.length - 1)) * 85;
                          const y = 28 - (val / maxMsgRate) * 22 - 2;
                          return `${x},${y}`;
                        }).join(' ')}
                      />
                    </svg>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Filtering bar backdrop overlay for mobile */}
          {isFilterDrawerOpen && (
            <div
              onClick={() => setIsFilterDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-stone-950/45 backdrop-blur-xs transition-opacity lg:hidden cursor-pointer"
            />
          )}

          <div className={`transition-all duration-300 ease-in-out z-50
            fixed bottom-0 left-0 right-0 w-full h-[65vh] md:h-[50vh] rounded-t-2xl bg-card shadow-2xl border-t border-border p-6 flex flex-col space-y-4 overflow-y-auto
            lg:static lg:w-auto lg:h-auto lg:bg-card lg:shadow-sm lg:border lg:rounded-xl lg:translate-y-0 lg:flex-row lg:space-y-0 lg:space-x-4 lg:items-center lg:p-3
            ${isFilterDrawerOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
            ${isTerminalFullScreen ? 'rounded-none border-0' : ''}
          `}>
            {/* Mobile Drawer Pull Handle */}
            <div className="w-12 h-1.5 bg-muted-foreground/25 rounded-full mx-auto shrink-0 mb-1 lg:hidden" />

            {/* Mobile Drawer Title Header */}
            <div className="flex items-center justify-between lg:hidden border-b border-border/60 pb-3 mb-1 shrink-0 select-none">
              <div className="flex items-center space-x-2 text-primary font-mono text-xs font-bold">
                <Filter size={13} className="animate-pulse" />
                <span>CONSOLE LOG FILTERS</span>
              </div>
              <button
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground font-mono text-xs flex items-center justify-center border border-border"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex items-center space-x-1.5 text-muted-foreground text-xs font-mono shrink-0 select-none lg:flex hidden">
              <Filter size={12} className="text-primary animate-pulse" />
              <span className="font-bold text-foreground/85">Filter logs:</span>
            </div>

            {/* Section 1: Search & Core Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 w-full lg:w-auto shrink-0">
              <label className="text-[9px] font-extrabold text-muted-foreground/75 tracking-wider font-mono lg:hidden select-none">SEARCH & IDENTIFIERS</label>

              <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 w-full lg:w-auto">
                {/* Keyword Search Field */}
                <div className="relative group w-full lg:w-[170px]">
                  <input
                    type="text"
                    placeholder="Search value payloads..."
                    value={consoleSearch}
                    onChange={(e) => setConsoleSearch(e.target.value)}
                    className="peer w-full pl-8 pr-3 py-1.5 bg-background/50 hover:bg-background/85 border border-border/70 rounded text-[11px] font-mono text-foreground placeholder-muted-foreground/75 hover:border-muted-foreground/50 focus:bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 peer-focus:text-primary transition-colors" size={11} />
                </div>

                {/* Partition and Key filters grouped horizontally */}
                <div className="flex space-x-2.5 w-full lg:w-auto">
                  <input
                    type="text"
                    placeholder="Partition"
                    value={filterPartition}
                    onChange={(e) => setFilterPartition(e.target.value)}
                    className="flex-1 lg:w-[75px] px-2.5 py-1.5 bg-background/50 hover:bg-background/85 border border-border/70 rounded text-[11px] font-mono text-foreground placeholder-muted-foreground/75 hover:border-muted-foreground/50 focus:bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                  />

                  <input
                    type="text"
                    placeholder="Filter by key"
                    value={filterKey}
                    onChange={(e) => setFilterKey(e.target.value)}
                    className="flex-1 lg:w-[110px] px-2.5 py-1.5 bg-background/50 hover:bg-background/85 border border-border/70 rounded text-[11px] font-mono text-foreground placeholder-muted-foreground/75 hover:border-muted-foreground/50 focus:bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* Divider between Section 1 and Section 2 */}
            <div className="w-px h-5 bg-border/60 hidden lg:block shrink-0" />

            {/* Section 2: Display & Telemetry options */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 w-full lg:w-auto shrink-0">
              <label className="text-[9px] font-extrabold text-muted-foreground/75 tracking-wider font-mono lg:hidden select-none">STREAMING OPTIONS</label>

              {/* Auto-Scroll and Read from beginning grouped */}
              <div className="flex flex-wrap lg:flex-nowrap gap-2.5 items-center w-full lg:w-auto">
                <label className="flex-1 sm:flex-initial flex items-center justify-center font-mono text-[10px] text-muted-foreground hover:text-foreground cursor-pointer select-none bg-background/50 hover:bg-background/85 px-2.5 py-1.5 rounded border border-border/70 shadow-inner hover:border-muted-foreground/50 transition-all">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="mr-1.5 accent-primary rounded bg-card border-border cursor-pointer"
                  />
                  Auto-Scroll
                </label>

                <label className="flex-1 sm:flex-initial flex items-center justify-center font-mono text-[10px] text-muted-foreground hover:text-foreground cursor-pointer select-none bg-background/50 hover:bg-background/85 px-2.5 py-1.5 rounded border border-border/70 shadow-inner hover:border-muted-foreground/50 transition-all">
                  <input
                    type="checkbox"
                    checked={fromBeginning}
                    onChange={(e) => handleToggleFromBeginning(e.target.checked)}
                    className="mr-1.5 accent-primary rounded bg-card border-border cursor-pointer"
                  />
                  Read from beginning
                </label>
              </div>
            </div>

            {/* Spacer to push preference toggles and actions to the right */}
            <div className="flex-grow lg:flex-1 hidden lg:block" />

            {/* Section 2B: Display Options (Show Metrics, Size) */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 w-full lg:w-auto shrink-0">
              <label className="text-[9px] font-extrabold text-muted-foreground/75 tracking-wider font-mono lg:hidden select-none">DISPLAY OPTIONS</label>

              <div className="flex flex-wrap lg:flex-nowrap gap-2.5 items-center w-full lg:w-auto">
                {/* Symmetrical metrics toggle button directly on filters container */}
                <button
                  onClick={() => setIsTelemetryCollapsed(!isTelemetryCollapsed)}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 bg-background/50 hover:bg-background/85 px-2.5 py-1.5 rounded border border-border/70 shadow-sm hover:border-muted-foreground/50 transition-all font-mono text-[10px] cursor-pointer font-bold select-none"
                  title={isTelemetryCollapsed ? "Show Telemetry Dashboard" : "Hide Telemetry Dashboard"}
                >
                  <BarChart2 size={11} className={isTelemetryCollapsed ? 'text-muted-foreground' : 'text-primary animate-pulse'} />
                  <span>{isTelemetryCollapsed ? 'SHOW METRICS' : 'HIDE METRICS'}</span>
                </button>

                <button
                  onClick={() => {
                    setConsoleFontSize((prev) => {
                      if (prev === 'sm') return 'md';
                      if (prev === 'md') return 'lg';
                      if (prev === 'lg') return 'xl';
                      return 'sm';
                    });
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 bg-background/50 hover:bg-background/85 px-2.5 py-1.5 rounded border border-border/70 shadow-sm hover:border-muted-foreground/50 transition-all font-mono text-[10px] cursor-pointer font-bold select-none"
                  title={`Cycle terminal font size (currently ${consoleFontSize.toUpperCase()})`}
                >
                  <Type size={11} className="text-primary" />
                  <span>SIZE: {consoleFontSize.toUpperCase()}</span>
                </button>
              </div>
            </div>

            {/* Divider between Section 2B and Section 3 */}
            <div className="w-px h-5 bg-border/60 hidden lg:block shrink-0" />

            {/* Section 3: Layout & Sorting preference selectors */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 w-full lg:w-auto shrink-0">
              <label className="text-[9px] font-extrabold text-muted-foreground/75 tracking-wider font-mono lg:hidden select-none">LAYOUT & CHRONOLOGY</label>

              {/* View Mode detailed/dense selector, Sort selector, and Clear button */}
              <div className="flex flex-wrap lg:flex-nowrap gap-2.5 items-center w-full lg:w-auto">
                <div className="flex items-center bg-muted/40 p-0.5 rounded border border-border shadow-sm font-mono text-[10px] w-full sm:w-auto">
                  <button
                    onClick={() => setConsoleViewMode('detailed')}
                    className={`flex-1 sm:flex-initial text-center px-2.5 py-1 rounded transition-all font-bold flex items-center justify-center space-x-1.5 cursor-pointer ${consoleViewMode === 'detailed'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                      }`}
                    title="Detailed cards view with parsed JSON tree viewer"
                  >
                    <LayoutList size={11} />
                    <span>DETAILED</span>
                  </button>
                  <button
                    onClick={() => setConsoleViewMode('dense')}
                    className={`flex-1 sm:flex-initial text-center px-2.5 py-1 rounded transition-all font-bold flex items-center justify-center space-x-1.5 cursor-pointer ${consoleViewMode === 'dense'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                      }`}
                    title="High-density spreadsheet grid table with single-line log items"
                  >
                    <Grid size={11} />
                    <span>GRID</span>
                  </button>
                </div>

                <div className="flex items-center bg-muted/40 p-0.5 rounded border border-border shadow-sm font-mono text-[10px] w-full sm:w-auto">
                  <button
                    onClick={() => setLogSortOrder('asc')}
                    className={`flex-1 sm:flex-initial text-center px-2.5 py-1 rounded transition-all font-bold flex items-center justify-center space-x-1 cursor-pointer ${logSortOrder === 'asc'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                      }`}
                    title="Sort logs chronologically (Oldest First)"
                  >
                    <ArrowUpDown size={11} className="mr-0.5" />
                    <span>OLDEST</span>
                  </button>
                  <button
                    onClick={() => setLogSortOrder('desc')}
                    className={`flex-1 text-center px-2.5 py-1 rounded transition-all font-bold flex items-center justify-center space-x-1 cursor-pointer ${logSortOrder === 'desc'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                      }`}
                    title="Sort logs reverse-chronologically (Latest First)"
                  >
                    <ArrowUpDown size={11} className="mr-0.5 rotate-180" />
                    <span>LATEST</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    setMessages([]);
                    setSelectedTimeRange(null);
                    setDragStartPercent(null);
                    setDragCurrentPercent(null);
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 hover:border-destructive/40 text-destructive px-2.5 py-1.5 rounded transition-all font-mono text-[10px] cursor-pointer font-bold select-none w-full sm:w-auto"
                  title="Clear all cached stream logs and active timeline filters"
                >
                  <Trash2 size={11} />
                  <span>CLEAR</span>
                </button>
              </div>
            </div>

          </div>

          {/* Terminal Console Log list */}
          <div className={`bg-card border flex flex-col overflow-hidden terminal-glow dot-matrix transition-all ${isTerminalFullScreen
              ? 'flex-1 rounded-none border-0'
              : 'flex-1 border-border rounded-xl'
            }`}>

            {/* Console Header */}
            <div className="px-4 py-1.5 border-b border-border bg-muted/30 flex items-center justify-between text-xs font-mono text-muted-foreground select-none">
              <div className="flex items-center space-x-1.5 min-w-0">
                <Terminal size={14} className="text-primary shrink-0" />
                <span className="font-bold hidden sm:inline truncate">TERMINAL LOG FEED (showing {filteredMessages.length} of {messages.length} cached)</span>
                <span className="font-bold sm:hidden text-[10px] truncate">FEED ({filteredMessages.length}/{messages.length})</span>
                {messagesTimeRange && (
                  <span className="text-[9px] sm:text-[10px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded font-bold font-mono animate-pulse shadow-sm truncate">
                    <span className="hidden sm:inline">TIME WINDOW: </span>{messagesTimeRange.start} - {messagesTimeRange.end}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0 ml-2">
                <span className="text-[10px] text-muted-foreground/55 font-bold font-mono hidden md:inline">
                  Max cache: 1000 logs
                </span>

                <span className="text-muted-foreground/30 hidden md:inline">|</span>

                {/* Telemetry Dashboard Toggle Button */}
                <button
                  onClick={() => setIsTelemetryCollapsed(!isTelemetryCollapsed)}
                  className="px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 text-[10px] transition-all shadow-sm font-bold flex items-center space-x-1.5 cursor-pointer select-none font-mono"
                  title={isTelemetryCollapsed ? "Show Telemetry Dashboard" : "Hide Telemetry Dashboard"}
                >
                  <BarChart2 size={11} className={isTelemetryCollapsed ? 'text-muted-foreground' : 'text-primary animate-pulse'} />
                  <span className="hidden sm:inline">{isTelemetryCollapsed ? 'SHOW METRICS' : 'HIDE METRICS'}</span>
                </button>

                <span className="text-muted-foreground/30">|</span>

                {/* Mobile Filter Drawer Toggle Button */}
                <button
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className="lg:hidden px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 text-[10px] transition-all shadow-sm font-bold flex items-center space-x-1.5 cursor-pointer font-mono"
                  title="Adjust Console Filters"
                >
                  <Filter size={11} className="text-primary" />
                  <span className="hidden sm:inline">FILTERS</span>
                </button>

                <span className="text-muted-foreground/30 lg:hidden">|</span>

                {/* Full Screen Toggle Button */}
                <button
                  onClick={() => setIsTerminalFullScreen(!isTerminalFullScreen)}
                  className="px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 text-[10px] transition-all shadow-sm font-bold flex items-center space-x-1.5 cursor-pointer select-none font-mono"
                  title={isTerminalFullScreen ? "Exit fullscreen mode (Esc)" : "Enter fullscreen mode"}
                >
                  {isTerminalFullScreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                  <span className="hidden sm:inline">{isTerminalFullScreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}</span>
                </button>

                <span className="text-muted-foreground/30">|</span>

                <button
                  onClick={() => {
                    setMessages([]);
                    setSelectedTimeRange(null);
                    setDragStartPercent(null);
                    setDragCurrentPercent(null);
                  }}
                  className="px-2.5 py-1 rounded bg-destructive/15 hover:bg-destructive/25 text-destructive border border-destructive/25 hover:border-destructive/40 text-[10px] transition-all shadow-sm font-bold flex items-center space-x-1.5 cursor-pointer"
                  title="Clear all cached stream logs and active timeline filters"
                >
                  <Trash2 size={11} />
                  <span className="hidden sm:inline">CLEAR FEED</span>
                </button>
              </div>
            </div>

            {/* Log list messages */}
            <div className={`flex-1 overflow-y-auto font-mono ${consoleViewMode === 'dense' ? 'p-0 overflow-x-auto' : 'p-4 space-y-3'
              } ${consoleFontSize === 'sm' ? 'text-[11px]' :
                consoleFontSize === 'md' ? 'text-[13px]' :
                  consoleFontSize === 'lg' ? 'text-[15px]' : 'text-[17px]'
              }`}>
              <div ref={terminalTopRef} />
              {streamError && (
                <div className="m-4 p-3 rounded-lg bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center space-x-2 animate-pulse">
                  <AlertCircle size={14} />
                  <span>{streamError}</span>
                </div>
              )}

              {consoleViewMode === 'dense' && filteredMessages.length > 0 && (
                /* Sticky Dense Table Header */
                <div className="flex items-center px-4 py-2 border-b border-border bg-muted/40 text-[0.8em] font-bold text-muted-foreground tracking-wider uppercase select-none font-mono sticky top-0 backdrop-blur-md z-10 min-w-[750px] lg:min-w-0">
                  <div className="w-[100px] shrink-0">Timestamp</div>
                  <div className="w-[170px] shrink-0 pl-1">Topic</div>
                  <div className="w-[140px] shrink-0 text-center">Partition / Offset</div>
                  <div className="w-[120px] shrink-0 pl-3">Key</div>
                  <div className="flex-1 min-w-0 pl-2">Payload Preview</div>
                </div>
              )}

              {/* Live Boundary Status Row - TOP */}
              {filteredMessages.length > 0 && (
                <div className={`py-2.5 flex items-center justify-center space-x-2 text-[10px] tracking-wider font-mono text-muted-foreground/60 select-none border-b border-dashed border-border/50 bg-muted/5 ${consoleViewMode === 'dense' ? 'px-4' : 'mx-4 my-2 rounded-xl border'
                  }`}>
                  {isStreaming ? (
                    logSortOrder === 'desc' ? (
                      <>
                        <Check size={12} className="text-emerald-500 animate-pulse" />
                        <span className="font-bold uppercase">CAUGHT UP WITH LIVE BROKER FEED — NO NEW RECORDS AT LATEST OFFSET</span>
                      </>
                    ) : (
                      <>
                        <Info size={12} className="text-primary animate-pulse" />
                        <span className="font-bold uppercase">REACHED THE OLDEST CACHED RECORD IN BUFFER FEED</span>
                      </>
                    )
                  ) : (
                    <>
                      <Pause size={10} className="text-muted-foreground animate-pulse" fill="currentColor" />
                      <span className="font-bold uppercase">STREAM INACTIVE — FEED VIEW PAUSED</span>
                    </>
                  )}
                </div>
              )}

              {consoleViewMode === 'dense' ? (
                /* Dense Grid List */
                filteredMessages.map((msg) => {
                  const isExpanded = expandedLogIds[msg.id] || false;
                  const isJson = msg.value && (msg.value.trim().startsWith('{') || msg.value.trim().startsWith('['));
                  const { tagClass: topicTagColor, cardClass: _, leftBarClass } = getTopicStyles(msg.topic, isDark);
                  const traceId = extractTraceId(msg);

                  // Truncated single-line preview of the value
                  let valuePreview = msg.value || '';
                  if (valuePreview) {
                    if (isJson) {
                      try {
                        const parsed = JSON.parse(valuePreview);
                        const str = JSON.stringify(parsed);
                        valuePreview = str.length > 140 ? str.slice(0, 140) + '...' : str;
                      } catch (e) {
                        valuePreview = valuePreview.length > 140 ? valuePreview.slice(0, 140) + '...' : valuePreview;
                      }
                    } else {
                      valuePreview = valuePreview.length > 140 ? valuePreview.slice(0, 140) + '...' : valuePreview;
                    }
                  } else {
                    valuePreview = 'null';
                  }

                  return (
                    <div key={msg.id} className="flex flex-col hover:bg-muted/15 transition-colors border-b border-border/40 select-text min-w-[750px] lg:min-w-0">
                      {/* Main Row */}
                      <div
                        onClick={() => setExpandedLogIds(prev => ({ ...prev, [msg.id]: !isExpanded }))}
                        className={`flex items-center px-4 py-2.5 cursor-pointer text-inherit select-none hover:bg-muted/30 transition-colors ${selectedTopics.length > 1
                            ? leftBarClass
                            : 'border-l-4 border-r-4 border-l-primary/40 border-r-primary/40'
                          }`}
                      >
                        {/* Timestamp Column */}
                        <div className="w-[100px] shrink-0 font-medium text-foreground/80">
                          {msg.timestampDate.toLocaleTimeString()}
                        </div>

                        {/* Topic Column */}
                        <div className="w-[170px] shrink-0 pr-4 flex items-center">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[0.85em] font-extrabold border block text-center truncate whitespace-nowrap max-w-full shadow-sm ${topicTagColor}`}
                            title={msg.topic}
                          >
                            {msg.topic}
                          </span>
                        </div>

                        {/* Partition / Offset Column */}
                        <div className="w-[140px] shrink-0 font-bold text-muted-foreground flex items-center justify-center space-x-1.5 text-[0.8em]">
                          <span className="bg-muted px-1.5 py-0.5 rounded border border-border text-foreground/90 font-mono font-bold">{msg.partition}</span>
                          <span className="text-muted-foreground/45">/</span>
                          <span className="bg-muted px-1.5 py-0.5 rounded border border-border text-foreground/90 font-mono font-bold">{msg.offset}</span>
                        </div>

                        {/* Key Column with compact Trace trigger */}
                        <div className="w-[120px] shrink-0 px-3 flex items-center justify-center space-x-1.5 min-w-0">
                          {msg.key && (
                            <span
                              className="bg-primary/5 dark:bg-amber-400/5 px-1.5 py-0.5 border border-primary/20 dark:border-amber-400/20 text-primary dark:text-amber-400 text-[0.8em] font-bold rounded truncate block text-center select-all flex-1"
                              title={msg.key}
                            >
                              {msg.key}
                            </span>
                          )}
                          {traceId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTraceId(traceId);
                              }}
                              className="p-1 rounded bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/25 text-cyan-500 transition-colors cursor-pointer shrink-0"
                              title={`Trace event transaction hops (ID: ${traceId})`}
                            >
                              <Share2 size={10} />
                            </button>
                          )}
                          {!msg.key && !traceId && (
                            <span className="text-muted-foreground/30 italic block text-center">-</span>
                          )}
                        </div>

                        {/* Payload Preview Column */}
                        <div
                          className="flex-1 min-w-0 truncate text-foreground/75 dark:text-stone-300 pl-2"
                          title={msg.value || ''}
                        >
                          {highlightText(valuePreview, consoleSearch)}
                        </div>

                        {/* Chevron toggle */}
                        <div className="ml-2 text-muted-foreground/60 shrink-0">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                      </div>

                      {/* Expanded Panel */}
                      {isExpanded && (
                        <div className="px-8 py-4 border-t border-border bg-muted/10 space-y-3 select-text">
                          <div className="flex flex-wrap items-center justify-between pb-2 border-b border-border gap-2 text-[10px] text-muted-foreground font-medium select-none">
                            <div className="flex items-center space-x-2">
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary uppercase tracking-wider font-mono">
                                MSG-TRACE
                              </span>
                              <span className="font-mono text-muted-foreground/60">
                                ID: {msg.id}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 font-mono">
                              {traceId && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTraceId(traceId);
                                  }}
                                  className="flex items-center space-x-1 hover:text-cyan-400 text-cyan-500 font-bold border border-cyan-500/20 hover:border-cyan-500/40 bg-cyan-500/5 hover:bg-cyan-500/10 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                                  title="Trace distributed transaction timeline flow"
                                >
                                  <Share2 size={9} />
                                  <span>TRACE FLOW</span>
                                </button>
                              )}
                              <span>Full ISO: {msg.timestamp}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (msg.value) {
                                    navigator.clipboard.writeText(msg.value);
                                    alert('Message payload copied to clipboard.');
                                  }
                                }}
                                className="p-1 hover:text-primary text-muted-foreground hover:bg-muted rounded transition-colors flex items-center space-x-1"
                                title="Copy payload"
                              >
                                <Copy size={11} />
                                <span>Copy</span>
                              </button>
                            </div>
                          </div>

                          <div className="pt-2 space-y-2">
                            {msg.key && (
                              <div className="text-inherit opacity-90 text-muted-foreground text-xs">
                                <span className="text-primary font-bold">KEY:</span> <code className="bg-muted/80 dark:bg-black/60 border border-border px-1.5 py-0.5 rounded text-inherit text-foreground dark:text-amber-300 font-bold select-all font-mono">{msg.key}</code>
                              </div>
                            )}
                            <div className="text-inherit">
                              {isJson ? (
                                <PremiumJsonViewer rawValue={msg.value || ''} isDark={isDark} searchTerm={consoleSearch} />
                              ) : (
                                <pre className="bg-muted/25 dark:bg-black/50 p-2.5 rounded border border-border overflow-x-auto text-inherit whitespace-pre-wrap select-all font-mono text-foreground dark:text-stone-100">
                                  {msg.value !== null ? highlightText(msg.value, consoleSearch) : <span className="text-muted-foreground/60 italic">null</span>}
                                </pre>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                /* Detailed Card List */
                filteredMessages.map((msg) => (
                  <MessageRow
                    key={msg.id}
                    msg={msg}
                    isDark={isDark}
                    isMultiSelect={selectedTopics.length > 1}
                    searchTerm={consoleSearch}
                    onTraceClick={setActiveTraceId}
                  />
                ))
              )}

              {/* Empty Stream Welcome or Idle state */}
              {filteredMessages.length === 0 && (
                <div className="py-24 text-center select-none flex flex-col justify-center items-center text-muted-foreground/50 space-y-3">
                  {isStreaming && fromBeginning ? (
                    <RefreshCw size={36} className="text-primary animate-spin" />
                  ) : (
                    <Terminal size={36} className="text-muted-foreground/30 animate-pulse" />
                  )}
                  <div>
                    <h3 className="font-mono text-xs font-bold text-muted-foreground flex flex-col items-center space-y-1.5">
                      {isStreaming ? (
                        fromBeginning ? (
                          <>
                            <span className="text-primary font-bold tracking-wide animate-pulse">REINDEXING & RETRIEVING ALL LOGS FROM KAFKA BROKER...</span>
                          </>
                        ) : (
                          <>
                            <span>AWAITING INCOMING LIVE RECORD LOGS...</span>
                          </>
                        )
                      ) : (
                        'LOGS CONSOLE INACTIVE'
                      )}
                    </h3>
                    <p className="text-[10px] text-muted-foreground/40 font-mono mt-1 text-center">
                      {isStreaming
                        ? (fromBeginning
                          ? 'Reading from earliest offset bounds. This might take a few moments.'
                          : 'Listening live on Kafka topic cluster. Produce test events to stream!')
                        : 'Select a connection profile and subscribe to topics to start live stream.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Live Boundary Status Row */}
              {filteredMessages.length > 0 && (
                <div className={`py-3.5 flex items-center justify-center space-x-2 text-[10px] tracking-wider font-mono text-muted-foreground/60 select-none border-t border-dashed border-border/50 bg-muted/5 ${consoleViewMode === 'dense' ? 'px-4 border-b border-border/20' : 'mx-4 my-2 rounded-xl border'
                  }`}>
                  {isStreaming ? (
                    logSortOrder === 'asc' ? (
                      <>
                        <Check size={12} className="text-emerald-500 animate-pulse" />
                        <span className="font-bold uppercase">CAUGHT UP WITH LIVE BROKER FEED — NO NEW RECORDS AT LATEST OFFSET</span>
                      </>
                    ) : (
                      <>
                        <Info size={12} className="text-primary animate-pulse" />
                        <span className="font-bold uppercase">REACHED THE OLDEST CACHED RECORD IN BUFFER FEED</span>
                      </>
                    )
                  ) : (
                    <>
                      <Pause size={10} className="text-muted-foreground animate-pulse" fill="currentColor" />
                      <span className="font-bold uppercase">STREAM INACTIVE — FEED VIEW PAUSED</span>
                    </>
                  )}
                </div>
              )}

              <div ref={terminalBottomRef} />
            </div>

          </div>

        </main>
      </div>

      {/* 3. Dialog Modal: Add / Edit Connection Profiles */}
      {isEditingConn && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl relative select-none font-mono text-foreground">
            <button
              onClick={() => setIsEditingConn(false)}
              className="absolute right-4 top-4 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X size={16} />
            </button>

            <div className="flex items-center space-x-2 pb-4 border-b border-border mb-4">
              <Database className="text-primary" size={16} />
              <h2 className="text-sm font-bold tracking-wider text-foreground">
                {editingId ? 'EDIT CONNECTION PROFILE' : 'NEW CONNECTION PROFILE'}
              </h2>
            </div>

            <form onSubmit={handleSaveConnection} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground">FRIENDLY PROFILE NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Local Docker Kafka"
                  value={connName}
                  onChange={(e) => setConnName(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded px-3 py-2 text-xs text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/50"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground">BOOTSTRAP BROKER SERVERS</label>
                <input
                  type="text"
                  placeholder="localhost:9092,localhost:9093"
                  value={connBootstrap}
                  onChange={(e) => setConnBootstrap(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded px-3 py-2 text-xs text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/50"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground">CLIENT ID</label>
                <input
                  type="text"
                  placeholder="kafka-stream-ui"
                  value={connClientId}
                  onChange={(e) => setConnClientId(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded px-3 py-2 text-xs text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary/50"
                />
              </div>

              <div className="flex items-center space-x-6 py-1">
                <label className="flex items-center text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={connSSL}
                    onChange={(e) => setConnSSL(e.target.checked)}
                    className="mr-2 accent-primary rounded bg-card border-border"
                  />
                  Enable SSL/TLS
                </label>

                <label className="flex items-center text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={connSASL}
                    onChange={(e) => setConnSASL(e.target.checked)}
                    className="mr-2 accent-primary rounded bg-card border-border"
                  />
                  Enable SASL Auth
                </label>
              </div>

              {connSASL && (
                <div className="p-3 bg-muted/40 border border-border rounded space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-muted-foreground block">SASL MECHANISM</label>
                    <select
                      value={connSASLMech}
                      onChange={(e: any) => setConnSASLMech(e.target.value)}
                      className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                    >
                      <option value="plain">PLAIN</option>
                      <option value="scram-sha-256">SCRAM-SHA-256</option>
                      <option value="scram-sha-512">SCRAM-SHA-512</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-muted-foreground block">SASL USERNAME</label>
                    <input
                      type="text"
                      placeholder="Username"
                      value={connSASLUser}
                      onChange={(e) => setConnSASLUser(e.target.value)}
                      className="w-full bg-card border border-border rounded px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground/35 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-muted-foreground block">SASL PASSWORD</label>
                    <div className="relative">
                      <input
                        type={connSASLPassShow ? 'text' : 'password'}
                        placeholder="Password"
                        value={connSASLPass}
                        onChange={(e) => setConnSASLPass(e.target.value)}
                        className="w-full bg-card border border-border rounded pl-3 pr-9 py-1.5 text-xs text-foreground placeholder-muted-foreground/35 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setConnSASLPassShow(!connSASLPassShow)}
                        className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                      >
                        {connSASLPassShow ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {lastConnectionTest && (
                <div className={`p-3 rounded border text-xs flex items-start space-x-2 ${lastConnectionTest.success
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}>
                  <Info className="flex-shrink-0 mt-0.5" size={13} />
                  <span>{lastConnectionTest.msg}</span>
                </div>
              )}

              {!desktopActive && (
                <div className="p-3 bg-amber-500/5 dark:bg-amber-950/10 border border-amber-500/20 dark:border-amber-500/30 rounded-lg text-[10px] space-y-1.5 font-mono select-text text-stone-700 dark:text-stone-300">
                  <div className="flex items-center space-x-1.5 font-bold tracking-wide text-amber-600 dark:text-amber-400">
                    <AlertCircle size={13} className="flex-shrink-0" />
                    <span>SECURITY & STORAGE DISCLAIMER</span>
                  </div>
                  <p className="leading-relaxed text-muted-foreground/90">
                    Credentials are encrypted client-side using <strong className="text-foreground">AES-GCM-256</strong> (PBKDF2, 100k iterations) with your master password (or a persistent device-specific key) and stored strictly in your browser&apos;s <strong className="text-foreground">LocalStorage</strong>.
                  </p>
                  <p className="leading-relaxed text-muted-foreground/90 font-semibold border-t border-amber-500/10 pt-1.5">
                    Decrypted credentials are only held ephemerally in-memory on the backend proxy during active streaming sessions. Use this tool <strong className="text-destructive font-bold">AT YOUR OWN RISK</strong>. Ensure your browser extensions are trusted when connecting to sensitive production clusters.
                  </p>
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !connBootstrap}
                  className="flex-1 py-2 bg-muted hover:bg-muted/70 border border-border text-xs font-bold text-muted-foreground hover:text-foreground rounded transition-all flex items-center justify-center space-x-1.5 disabled:opacity-40"
                >
                  <RefreshCw size={11} className={testingConnection ? 'animate-spin' : ''} />
                  <span>TEST CONNECTION</span>
                </button>

                <button
                  type="submit"
                  disabled={!connName || !connBootstrap}
                  className="flex-1 py-2 bg-primary hover:brightness-95 text-xs font-bold text-primary-foreground rounded transition-all disabled:opacity-40 shadow-sm"
                >
                  SAVE PROFILE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Dialog Modal: Master Password Encryption Config */}
      {isSettingLock && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-sm w-full p-6 shadow-xl relative select-none font-mono text-foreground">
            <button
              onClick={() => setIsSettingLock(false)}
              className="absolute right-4 top-4 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X size={16} />
            </button>

            <div className="flex items-center space-x-2 pb-4 border-b border-border mb-4">
              <Lock className="text-primary" size={16} />
              <h2 className="text-sm font-bold tracking-wider text-foreground">
                STORAGE LOCK OPTIONS
              </h2>
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed mb-4 font-sans">
              Encrypt your Kafka connection credentials. Locked profiles are secured using standard <b>AES-GCM</b>. If you don't use a Master Password, credentials are still encoded locally, but anyone with access to your computer can read them.
            </p>

            <form onSubmit={handleSetLock} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground block">NEW MASTER PASSWORD</label>
                <input
                  type="password"
                  placeholder="Enter master password (leave blank to unlock)"
                  value={newMasterPassword}
                  onChange={(e) => setNewMasterPassword(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded px-3 py-2 text-xs text-foreground placeholder-muted-foreground/45 focus:outline-none focus:border-primary/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground block">CONFIRM PASSWORD</label>
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmMasterPassword}
                  onChange={(e) => setConfirmMasterPassword(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded px-3 py-2 text-xs text-foreground placeholder-muted-foreground/45 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-primary hover:brightness-95 text-xs font-bold text-primary-foreground rounded transition-colors shadow-sm"
              >
                APPLY SECURITY PREFERENCES
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. Dialog Modal: Prompt Password Unlock on Load */}
      {showPasswordDialog && (
        <div className="fixed inset-0 z-50 bg-stone-900/90 dark:bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-sm w-full p-6 shadow-xl text-center select-none font-mono space-y-4 text-foreground">

            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary mx-auto">
              <Lock size={20} className="animate-pulse" />
            </div>

            <div className="space-y-1">
              <h2 className="text-sm font-bold tracking-wider text-foreground">STORAGE ENCRYPTED</h2>
              <p className="text-[10px] text-muted-foreground font-sans">Enter your Master Password to decrypt and load your Kafka connection profiles.</p>
            </div>

            <form onSubmit={handlePasswordUnlock} className="space-y-3">
              <input
                type="password"
                placeholder="Master Password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                className="w-full bg-muted/40 border border-border rounded px-3 py-2 text-xs text-foreground placeholder-muted-foreground/45 text-center focus:outline-none focus:border-primary/50"
                required
                autoFocus
              />

              {passwordError && (
                <div className="text-[10px] text-rose-500 font-bold">{passwordError}</div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-primary hover:brightness-95 text-xs font-bold text-primary-foreground rounded transition-colors shadow-sm"
              >
                UNLOCK PROFILES
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. Tracing Observability Deck Overlay Modal */}
      {activeTraceId && (
        <div className="fixed inset-0 z-50 bg-stone-955/80 dark:bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none font-mono">
          <div className="bg-card border border-border rounded-2xl w-full max-w-4xl h-[85vh] max-h-[85vh] shadow-2xl flex flex-col overflow-hidden text-foreground">
            
            {/* Modal Header HUD */}
            <div className="px-6 py-4 border-b border-border/85 bg-muted/40 flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-cyan-500">
                  <Workflow size={16} className="animate-pulse" />
                  <span className="font-extrabold tracking-wider text-xs sm:text-sm">DISTRIBUTED TRACE OBSERVABILITY DECK</span>
                </div>
                <div className="text-[10px] text-muted-foreground/80 font-sans leading-normal">
                  Visualizing transactional message hops and latency propagation across multiple Kafka topics.
                </div>
              </div>
              <button
                onClick={() => setActiveTraceId(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground border border-border hover:border-muted-foreground/45 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Trace Observability HUD Panel */}
            <div className="px-6 py-4 bg-muted/15 border-b border-border/40 grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0 text-xs">
              <div className="space-y-1">
                <span className="text-[9px] text-muted-foreground/65 block font-bold">ACTIVE TRACE ID</span>
                <div className="flex items-center space-x-1.5 font-bold text-cyan-500">
                  <span className="truncate select-all max-w-[140px] md:max-w-none">{activeTraceId}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeTraceId);
                      alert('Trace ID copied.');
                    }}
                    className="p-1 hover:bg-muted hover:text-foreground rounded transition-colors text-muted-foreground/60"
                  >
                    <Copy size={11} />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-muted-foreground/65 block font-bold">TOTAL HOPS</span>
                <span className="font-extrabold text-foreground text-sm block">
                  {traceMessages.length} <span className="text-[9px] text-muted-foreground font-normal font-sans">events</span>
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-muted-foreground/65 block font-bold">SPAN DURATION</span>
                <span className="font-extrabold text-emerald-500 text-sm block">
                  {traceMessages.length > 1
                    ? `${traceMessages[traceMessages.length - 1].timestampDate.getTime() - traceMessages[0].timestampDate.getTime()} ms`
                    : '0 ms'}
                </span>
              </div>
              <div className="space-y-1 col-span-1">
                <span className="text-[9px] text-muted-foreground/65 block font-bold">BROKER SPAN WINDOW</span>
                <span className="text-[10px] text-muted-foreground block leading-tight font-medium">
                  {traceMessages.length > 0
                    ? `${traceMessages[0].timestampDate.toLocaleTimeString()} - ${traceMessages[traceMessages.length - 1].timestampDate.toLocaleTimeString()}`
                    : '--:--:--'}
                </span>
              </div>
            </div>

            {/* Horizontal Microservice/Topic Flow Map */}
            {traceMessages.length > 0 && (
              <div className="px-6 py-3.5 border-b border-border/40 bg-muted/5 flex items-center space-x-3 overflow-x-auto shrink-0 select-none no-scrollbar">
                <div className="flex items-center space-x-1.5 text-[10px] text-muted-foreground shrink-0 font-bold">
                  <GitBranch size={11} className="text-primary" />
                  <span>FLOW MAP:</span>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  {traceMessages.map((m, idx) => {
                    const { tagClass: topicTagColor } = getTopicStyles(m.topic, isDark);
                    const delayFromPrev = idx > 0
                      ? m.timestampDate.getTime() - traceMessages[idx - 1].timestampDate.getTime()
                      : null;
                    return (
                      <React.Fragment key={m.id}>
                        {idx > 0 && (
                          <div className="flex flex-col items-center justify-center shrink-0">
                            <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-bold scale-90">
                              +{delayFromPrev}ms
                            </span>
                            <span className="text-muted-foreground/45 text-[10px] font-sans">──&gt;</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1 shrink-0 bg-background/50 border border-border/80 px-2 py-1 rounded shadow-sm">
                          <span className="text-[9px] bg-muted-foreground/10 text-muted-foreground font-mono rounded px-1 scale-90 font-bold shrink-0">
                            #{idx + 1}
                          </span>
                          <span className={`text-[10px] font-extrabold truncate max-w-[130px] ${topicTagColor.split(' border ')[0]} bg-transparent border-0 px-0`}>
                            {m.topic}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Scrollable Trace Hops Timeline List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 select-text min-h-0 bg-stone-950/5">
              {traceMessages.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground/50">
                  No distributed events found in current console cache matching this Trace ID.
                </div>
              ) : (
                <div className="relative border-l border-dashed border-border/60 pl-6 ml-3 space-y-6">
                  {traceMessages.map((m, idx) => {
                    const isJson = m.value && (m.value.trim().startsWith('{') || m.value.trim().startsWith('['));
                    const { tagClass: topicTagColor, leftBarClass } = getTopicStyles(m.topic, isDark);
                    const delayFromStart = m.timestampDate.getTime() - traceMessages[0].timestampDate.getTime();
                    const delayFromPrev = idx > 0
                      ? m.timestampDate.getTime() - traceMessages[idx - 1].timestampDate.getTime()
                      : 0;

                    return (
                      <div key={m.id} className="relative group select-text">
                        {/* Timeline Node dot */}
                        <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border border-cyan-500/50 bg-card flex items-center justify-center shadow z-10">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                        </div>

                        {/* Hop Card */}
                        <div className={`p-4 bg-card border border-border/85 rounded-xl transition-all hover:shadow shadow-sm space-y-3 ${leftBarClass}`}>
                          {/* Hop metadata row */}
                          <div className="flex items-center justify-between pb-2 border-b border-border gap-2 text-[10px] text-muted-foreground select-none font-bold">
                            <div className="flex items-center space-x-2">
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 uppercase tracking-wider font-mono text-[9px]">
                                HOP #{idx + 1}
                              </span>
                              <span className={`px-2 py-0.5 rounded border ${topicTagColor}`}>
                                {m.topic}
                              </span>
                              <span className="bg-muted px-1.5 py-0.5 rounded border border-border">
                                P: {m.partition} / O: {m.offset}
                              </span>
                            </div>

                            <div className="flex items-center space-x-3 font-mono">
                              <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/10 px-1.5 py-0.5 rounded">
                                OFFSET: +{delayFromStart}ms {idx > 0 && `(prev: +${delayFromPrev}ms)`}
                              </span>
                              <span>{m.timestampDate.toLocaleTimeString()}:{m.timestampDate.getMilliseconds()}ms</span>
                            </div>
                          </div>

                          {/* Payload Block */}
                          <div className="space-y-2">
                            {m.key && (
                              <div className="text-[11px] text-muted-foreground">
                                <span className="text-primary font-bold">KEY:</span> <code className="bg-muted/80 border border-border px-1.5 py-0.5 rounded text-foreground dark:text-amber-300 font-bold select-all font-mono">{m.key}</code>
                              </div>
                            )}
                            <div className="text-xs">
                              {isJson ? (
                                <PremiumJsonViewer rawValue={m.value || ''} isDark={isDark} searchTerm="" />
                              ) : (
                                <pre className="bg-muted/25 dark:bg-black/50 p-2.5 rounded border border-border overflow-x-auto whitespace-pre-wrap select-all font-mono text-foreground dark:text-stone-100">
                                  {m.value !== null ? m.value : <span className="text-muted-foreground/60 italic">null</span>}
                                </pre>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer HUD */}
            <div className="px-6 py-3 border-t border-border/85 bg-muted/40 flex items-center justify-between shrink-0 text-[10px] text-muted-foreground/75 font-mono select-none">
              <span>Distributed observability deck // trace_events = {traceMessages.length}</span>
              <span>PRESS ESC OR CLICK X TO CLOSE</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
