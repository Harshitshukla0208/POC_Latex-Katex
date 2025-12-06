'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Question {
    question_no: number;
    question: string;
    option_a: string | null;
    option_b: string | null;
    option_c: string | null;
    option_d: string | null;
    question_type: string;
    module: string | null;
}

interface ExtractionData {
    id: number;
    filename: string;
    total_questions: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    questions: Question[];
    created_at: string;
    updated_at: string | null;
}

type InputMode = 'api' | 'direct';

// Helper function to escape dollar signs that are not LaTeX delimiters
const escapeCurrencyInText = (text: string): string => {
    // This function escapes single $ that are used for currency (e.g., $100, $1,000)
    // but preserves $$ for LaTeX block math and $$...$$ for inline math
    
    // First, protect existing $$ delimiters by temporarily replacing them
    const protectedText = text.replace(/\$\$/g, '<<<DOUBLEDOLLAR>>>');
    
    // Now escape single $ that appear before numbers (currency)
    const escaped = protectedText.replace(/\$(?=[\d])/g, '\\$');
    
    // Restore the $$ delimiters
    return escaped.replace(/<<<DOUBLEDOLLAR>>>/g, '$$');
};

// Helper function to detect and parse table-like data
const parseTableData = (text: string): { isTable: boolean; data?: { headers: string[]; rows: string[][] } } => {
    // Trim the text first
    const trimmedText = text.trim();
    
    // Check for semicolon-separated key-value pairs pattern: "X: val1, val2, val3; Y: val4, val5, val6"
    const hasSemicolons = trimmedText.includes(';') && trimmedText.includes(':');
    
    if (hasSemicolons) {
        try {
            const parts = trimmedText.split(';').map(p => p.trim()).filter(p => p.length > 0);
            const headers: string[] = [];
            const values: string[][] = [];
            
            // Parse each part
            for (const part of parts) {
                const colonIndex = part.indexOf(':');
                if (colonIndex === -1) continue;
                
                const header = part.substring(0, colonIndex).trim();
                const valueString = part.substring(colonIndex + 1).trim();
                
                // Split values by comma
                const vals = valueString.split(',').map(v => v.trim()).filter(v => v.length > 0);
                
                if (vals.length > 0) {
                    headers.push(header);
                    vals.forEach((val, idx) => {
                        if (!values[idx]) values[idx] = [];
                        values[idx].push(val);
                    });
                }
            }
            
            // Check if we have valid table data
            if (headers.length > 0 && values.length > 0) {
                // Ensure all rows have the same number of columns
                const maxCols = headers.length;
                const normalizedRows = values.map(row => {
                    while (row.length < maxCols) row.push('');
                    return row.slice(0, maxCols);
                });
                
                return { isTable: true, data: { headers, rows: normalizedRows } };
            }
        } catch (error) {
            console.error('Error parsing table data:', error);
        }
    }
    
    return { isTable: false };
};

// Helper function to render option content (either as table or markdown)
const OptionContent = ({ text }: { text: string }) => {
    const tableInfo = parseTableData(text);
    
    if (tableInfo.isTable && tableInfo.data) {
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300 my-2">
                    <thead className="bg-gray-100">
                        <tr>
                            {tableInfo.data.headers.map((header, idx) => (
                                <th key={idx} className="border border-gray-300 px-4 py-2 text-left font-semibold">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {header}
                                    </ReactMarkdown>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tableInfo.data.rows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-gray-50">
                                {row.map((cell, cellIdx) => (
                                    <td key={cellIdx} className="border border-gray-300 px-4 py-2">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                        >
                                            {cell}
                                        </ReactMarkdown>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
    
    return (
        <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
                p: ({node, ...props}) => <span {...props} />,
                code: ({node, ...props}) => {
                    const isInline = !props.className;
                    return isInline ? (
                        <code className="bg-gray-100 px-1 py-0.5 rounded text-xs" {...props} />
                    ) : (
                        <code className="block bg-gray-100 p-2 rounded text-xs overflow-x-auto" {...props} />
                    );
                },
            }}
        >
            {text}
        </ReactMarkdown>
    );
};

export default function QuestionPaperUI() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [extractionId, setExtractionId] = useState('');
    const [showInput, setShowInput] = useState(true);
    const [extractionData, setExtractionData] = useState<ExtractionData | null>(null);
    const [inputMode, setInputMode] = useState<InputMode>('api');
    const [directInput, setDirectInput] = useState('');

    const fetchQuestions = async (id: string) => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`http://localhost:8000/api/user/extractions/${id}`, {
                headers: {
                    'accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch extraction data');
            }

            const data = await response.json();
            if (data.status && data.data) {
                setExtractionData(data.data);
                setQuestions(data.data.questions || []);
                setShowInput(false);
            } else {
                throw new Error(data.message || 'Failed to retrieve data');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = () => {
        if (extractionId.trim()) {
            fetchQuestions(extractionId.trim());
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    const handleReset = () => {
        setShowInput(true);
        setQuestions([]);
        setExtractionData(null);
        setExtractionId('');
        setDirectInput('');
        setError(null);
    };

    const handleDirectInput = () => {
        try {
            setLoading(true);
            setError(null);
            
            if (!directInput.trim()) {
                throw new Error('Please enter JSON data');
            }

            let inputText = directInput.trim();
            let parsed: any;
            let lastError: Error | null = null;

            const cleanJson = (text: string): string => {
                return text
                    .replace(/,(\s*[}\]])/g, '$1')
                    .replace(/,\s*$/, '');
            };

            const fixJsonStructure = (text: string): string => {
                let fixed = text.trim();
                fixed = cleanJson(fixed);
                
                const openBraces = (fixed.match(/\{/g) || []).length;
                const closeBraces = (fixed.match(/\}/g) || []).length;
                
                if (!fixed.startsWith('{') && !fixed.startsWith('[')) {
                    fixed = '{ ' + fixed;
                    if (!fixed.trim().endsWith('}')) {
                        fixed = fixed + ' }';
                    }
                } else if (fixed.startsWith('{')) {
                    if (openBraces > closeBraces) {
                        fixed = fixed + ' }';
                    }
                }
                
                return fixed;
            };

            const parseStrategies = [
                () => JSON.parse(inputText),
                () => JSON.parse(cleanJson(inputText)),
                () => JSON.parse(fixJsonStructure(inputText)),
                () => JSON.parse(cleanJson(fixJsonStructure(inputText)))
            ];

            for (let i = 0; i < parseStrategies.length; i++) {
                try {
                    parsed = parseStrategies[i]();
                    break;
                } catch (err) {
                    lastError = err instanceof Error ? err : new Error(String(err));
                    if (i === parseStrategies.length - 1) {
                        const errorMsg = lastError.message || 'Invalid JSON format';
                        throw new Error(`JSON Parse Error: ${errorMsg}. Please check your JSON syntax.`);
                    }
                }
            }
            
            let questionsData: any[] = [];
            
            if (parsed.data && parsed.data.questions) {
                questionsData = parsed.data.questions;
            } else if (parsed.questions) {
                questionsData = parsed.questions;
            } else if (Array.isArray(parsed)) {
                questionsData = parsed;
            } else {
                throw new Error('Invalid JSON structure. Expected format: { "data": { "questions": [...] } } or { "questions": [...] }');
            }

            const mappedQuestions: Question[] = questionsData.map((q: any) => {
                // Parse module - handle both "Module 1" and "Module Module 1" formats
                let moduleValue: string | null = null;
                if (q.module) {
                    if (typeof q.module === 'string') {
                        moduleValue = q.module;
                    } else if (typeof q.module === 'number') {
                        moduleValue = `Module ${q.module}`;
                    }
                }
                
                return {
                    question_no: q.question_no || 0,
                    question: q.question_text || q.question || '',
                    option_a: q.option_a || null,
                    option_b: q.option_b || null,
                    option_c: q.option_c || null,
                    option_d: q.option_d || null,
                    question_type: q.question_type || 'multiple_choice',
                    module: moduleValue,
                };
            });

            if (mappedQuestions.length === 0) {
                throw new Error('No questions found in the provided data');
            }

            setQuestions(mappedQuestions);
            
            setExtractionData({
                id: 0,
                filename: 'Direct Input',
                total_questions: mappedQuestions.length,
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
                questions: mappedQuestions,
                created_at: new Date().toISOString(),
                updated_at: null,
            });
            
            setShowInput(false);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            console.error('JSON Parse Error:', err);
            console.error('Input text:', directInput.substring(0, 200) + '...');
        } finally {
            setLoading(false);
        }
    };

    if (showInput) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
                <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 max-w-2xl w-full">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Question Paper Viewer</h1>
                        <p className="text-gray-600">Choose how you want to load questions</p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                Data Source
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="inputMode"
                                        value="api"
                                        checked={inputMode === 'api'}
                                        onChange={(e) => setInputMode(e.target.value as InputMode)}
                                        className="mr-2 w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-gray-700">From API</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="inputMode"
                                        value="direct"
                                        checked={inputMode === 'direct'}
                                        onChange={(e) => setInputMode(e.target.value as InputMode)}
                                        className="mr-2 w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-gray-700">Direct Input (JSON)</span>
                                </label>
                            </div>
                        </div>

                        {inputMode === 'api' && (
                            <div>
                                <label htmlFor="extractionId" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Extraction ID
                                </label>
                                <input
                                    id="extractionId"
                                    type="text"
                                    value={extractionId}
                                    onChange={(e) => setExtractionId(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Enter extraction ID (e.g., 1)"
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-800"
                                />
                            </div>
                        )}

                        {inputMode === 'direct' && (
                            <div>
                                <label htmlFor="directInput" className="block text-sm font-semibold text-gray-700 mb-2">
                                    JSON Data
                                </label>
                                <textarea
                                    id="directInput"
                                    value={directInput}
                                    onChange={(e) => setDirectInput(e.target.value)}
                                    placeholder='Paste your JSON data here, e.g., { "data": { "questions": [...] } }'
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-800 font-mono text-sm"
                                    rows={12}
                                />
                                <p className="mt-2 text-xs text-gray-500">
                                    Supports formats: {"{ \"data\": { \"questions\": [...] } }"} or {"{ \"questions\": [...] }"}<br />
                                    You can paste data starting with "data": and it will be automatically wrapped.
                                </p>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-start">
                                    <div className="text-red-600 text-xl mr-3">⚠</div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-red-800 mb-1">Error</h3>
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={inputMode === 'api' ? handleSubmit : handleDirectInput}
                            disabled={loading || (inputMode === 'api' ? !extractionId.trim() : !directInput.trim())}
                            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-lg hover:shadow-xl"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Loading...
                                </span>
                            ) : (
                                inputMode === 'api' ? 'Load Questions from API' : 'Load Questions from JSON'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white py-16 sm:py-8 px-3 sm:px-4">
            <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-20">
                <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                            <h2 className="text-sm sm:text-base font-semibold text-gray-800 truncate">
                                {extractionData?.filename}
                            </h2>
                            <div className="flex flex-wrap gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-gray-600">
                                <span className="flex items-center">
                                    <span className="font-semibold mr-1">Questions:</span> {questions.length}
                                </span>
                                <span className="hidden sm:inline">•</span>
                                <span className="flex items-center">
                                    <span className="font-semibold mr-1">ID:</span> {extractionData?.id}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handleReset}
                            className="self-start sm:self-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition font-medium"
                        >
                            ← Change ID
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto mt-24 sm:mt-20">
                <div className="space-y-4 sm:space-y-6">
                    {questions.map((question, index) => (
                        <div key={index} className="border rounded-lg border-blue-500 p-4 sm:p-6 bg-white hover:shadow-lg transition">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                        <span className="bg-blue-500 text-white px-3 py-1 rounded font-bold text-sm sm:text-base">
                                            Q.{question.question_no}
                                        </span>
                                        {question.module !== null && (
                                            <span className="text-xs sm:text-sm px-3 py-1 bg-purple-100 text-purple-800 rounded font-semibold">
                                                {question.module}
                                            </span>
                                        )}
                                        <span className={`text-xs px-3 py-1 rounded font-semibold ${
                                            question.question_type === 'multiple_choice' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-orange-100 text-orange-800'
                                        }`}>
                                            {question.question_type === 'multiple_choice' ? 'MCQ' : 'Student Response'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-gray-800 text-sm sm:text-base mb-4 leading-relaxed prose prose-sm sm:prose max-w-none markdown-content">
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={{
                                        p: ({node, ...props}) => <p className="mb-3" {...props} />,
                                        table: ({node, ...props}) => (
                                            <div className="overflow-x-auto my-4">
                                                <table className="min-w-full border-collapse border border-gray-300" {...props} />
                                            </div>
                                        ),
                                        thead: ({node, ...props}) => (
                                            <thead className="bg-gray-100" {...props} />
                                        ),
                                        th: ({node, ...props}) => (
                                            <th className="border border-gray-300 px-4 py-2 text-left font-semibold" {...props} />
                                        ),
                                        td: ({node, ...props}) => (
                                            <td className="border border-gray-300 px-4 py-2" {...props} />
                                        ),
                                        tr: ({node, ...props}) => (
                                            <tr className="hover:bg-gray-50" {...props} />
                                        ),
                                        tbody: ({node, ...props}) => (
                                            <tbody {...props} />
                                        ),
                                        ul: ({node, ...props}) => (
                                            <ul className="list-disc pl-6 my-2" {...props} />
                                        ),
                                        ol: ({node, ...props}) => (
                                            <ol className="list-decimal pl-6 my-2" {...props} />
                                        ),
                                        li: ({node, ...props}) => (
                                            <li className="mb-1" {...props} />
                                        ),
                                        code: ({node, ...props}) => {
                                            const isInline = !props.className;
                                            return isInline ? (
                                                <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props} />
                                            ) : (
                                                <code className="block bg-gray-100 p-2 rounded text-sm overflow-x-auto" {...props} />
                                            );
                                        },
                                        strong: ({node, ...props}) => (
                                            <strong className="font-bold" {...props} />
                                        ),
                                        em: ({node, ...props}) => (
                                            <em className="italic" {...props} />
                                        ),
                                    }}
                                >
                                    {escapeCurrencyInText(question.question)}
                                </ReactMarkdown>
                            </div>

                            {question.question_type === 'multiple_choice' && (
                                <div className="space-y-2 sm:space-y-3 ml-0 sm:ml-4">
                                    {question.option_a && (
                                        <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 border border-gray-300 rounded hover:bg-blue-50 transition">
                                            <span className="font-bold text-blue-500 min-w-6 text-sm sm:text-base">A.</span>
                                            <div className="text-gray-800 text-sm leading-relaxed prose prose-sm max-w-none flex-1 markdown-content">
                                                <OptionContent text={question.option_a} />
                                            </div>
                                        </div>
                                    )}
                                    {question.option_b && (
                                        <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 border border-gray-300 rounded hover:bg-blue-50 transition">
                                            <span className="font-bold text-blue-500 min-w-6 text-sm sm:text-base">B.</span>
                                            <div className="text-gray-800 text-sm leading-relaxed prose prose-sm max-w-none flex-1 markdown-content">
                                                <OptionContent text={question.option_b} />
                                            </div>
                                        </div>
                                    )}
                                    {question.option_c && (
                                        <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 border border-gray-300 rounded hover:bg-blue-50 transition">
                                            <span className="font-bold text-blue-500 min-w-6 text-sm sm:text-base">C.</span>
                                            <div className="text-gray-800 text-sm leading-relaxed prose prose-sm max-w-none flex-1 markdown-content">
                                                <OptionContent text={question.option_c} />
                                            </div>
                                        </div>
                                    )}
                                    {question.option_d && (
                                        <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 border border-gray-300 rounded hover:bg-blue-50 transition">
                                            <span className="font-bold text-blue-500 min-w-6 text-sm sm:text-base">D.</span>
                                            <div className="text-gray-800 text-sm leading-relaxed prose prose-sm max-w-none flex-1 markdown-content">
                                                <OptionContent text={question.option_d} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {question.question_type === 'student_response' && (
                                <div className="mt-3 sm:mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
                                    <p className="text-xs sm:text-sm text-orange-800 font-medium">
                                        ✍️ This is a student response question - write your answer in the provided space
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <style jsx global>{`
                .markdown-content {
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    word-break: break-word;
                }
                .markdown-content .katex {
                    font-size: 1.1em;
                }
                .markdown-content .katex-display {
                    margin: 1em 0;
                    overflow-x: auto;
                    overflow-y: hidden;
                }
                .markdown-content p {
                    line-height: 1.8;
                    white-space: pre-wrap;
                }
                .markdown-content p:last-child {
                    margin-bottom: 0;
                }
                .markdown-content table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 1em 0;
                }
                .markdown-content table th,
                .markdown-content table td {
                    border: 1px solid #d1d5db;
                    padding: 0.5rem 1rem;
                    text-align: left;
                }
                .markdown-content table th {
                    background-color: #f3f4f6;
                    font-weight: 600;
                }
                .markdown-content table tr:hover {
                    background-color: #f9fafb;
                }
                .markdown-content ul,
                .markdown-content ol {
                    margin-left: 1.5rem;
                    margin-top: 0.5rem;
                    margin-bottom: 0.5rem;
                }
                .markdown-content li {
                    margin-bottom: 0.25rem;
                }
            `}</style>
        </div>
    );
}