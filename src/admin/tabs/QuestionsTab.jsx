import { useState } from 'react';
import { useAdmin } from '../AdminContext';
import { Plus, Search, Pencil, Trash2, Filter, CheckCircle, X } from 'lucide-react';

const CATEGORIES = ['All', 'Geography', 'Science', 'Mathematics', 'History', 'Technology', 'Sports', 'General'];
const CORRECT_OPTIONS = ['A', 'B', 'C', 'D'];

function QuestionModal() {
  const { state, dispatch } = useAdmin();
  const { editingQuestion, isNewQuestion } = state;
  if (!editingQuestion) return null;

  const save = () => {
    const q = editingQuestion;
    if (!q.id.trim()) return alert('Question ID is required');
    if (!q.question.trim()) return alert('Question text is required');
    if (!q.options.A || !q.options.B || !q.options.C || !q.options.D) return alert('All 4 options are required');
    dispatch({ type: 'SAVE_QUESTION', payload: q });
  };

  const autoId = () => {
    const id = 'q' + Date.now();
    dispatch({ type: 'UPDATE_EDITING_QUESTION', payload: { id } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0f0f20] border border-indigo-500/30 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 0 60px rgba(99,102,241,0.2)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-white">
            {isNewQuestion ? '➕ Add Question' : '✏️ Edit Question'}
          </h2>
          <button onClick={() => dispatch({ type: 'CLOSE_QUESTION_MODAL' })}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* ID row */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-gray-400 text-xs mb-1 block">Question ID *</label>
              <input
                value={editingQuestion.id}
                onChange={e => dispatch({ type: 'UPDATE_EDITING_QUESTION', payload: { id: e.target.value } })}
                placeholder="e.g. q61"
                className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors"
              />
            </div>
            <div className="self-end">
              <button onClick={autoId}
                className="px-3 py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-xs font-medium hover:bg-indigo-500/30 transition-colors whitespace-nowrap">
                Auto ID
              </button>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Category</label>
            <select
              value={editingQuestion.category}
              onChange={e => dispatch({ type: 'UPDATE_EDITING_QUESTION', payload: { category: e.target.value } })}
              className="w-full bg-[#1a1a30] border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
            >
              {CATEGORIES.filter(c => c !== 'All').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Question text */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Question Text *</label>
            <textarea
              value={editingQuestion.question}
              onChange={e => dispatch({ type: 'UPDATE_EDITING_QUESTION', payload: { question: e.target.value } })}
              rows={3}
              placeholder="Type your question here..."
              className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none resize-none transition-colors"
            />
          </div>

          {/* Options */}
          <div>
            <label className="text-gray-400 text-xs mb-2 block">Answer Options *</label>
            <div className="space-y-2">
              {CORRECT_OPTIONS.map(opt => (
                <div key={opt} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0
                    ${editingQuestion.correct === opt
                      ? 'bg-green-500 text-white'
                      : 'bg-white/10 text-gray-400'}`}>
                    {opt}
                  </div>
                  <input
                    value={editingQuestion.options[opt]}
                    onChange={e => dispatch({ type: 'UPDATE_EDITING_OPTION', payload: { key: opt, value: e.target.value } })}
                    placeholder={`Option ${opt}`}
                    className="flex-1 bg-white/5 border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2 text-white text-sm outline-none transition-colors"
                  />
                  <button
                    onClick={() => dispatch({ type: 'UPDATE_EDITING_QUESTION', payload: { correct: opt } })}
                    className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all
                      ${editingQuestion.correct === opt
                        ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                        : 'bg-white/5 border border-white/10 text-gray-500 hover:text-white'}`}>
                    {editingQuestion.correct === opt ? '✓ Correct' : 'Set Correct'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => dispatch({ type: 'CLOSE_QUESTION_MODAL' })}
            className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-300 hover:text-white font-medium transition-all">
            Cancel
          </button>
          <button
            onClick={save}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold transition-all hover:opacity-90">
            {isNewQuestion ? '➕ Add Question' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuestionsTab() {
  const { state, dispatch } = useAdmin();
  const { questions, questionFilter, questionCategoryFilter } = state;
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = questions.filter(q => {
    const matchCat = questionCategoryFilter === 'All' || q.category === questionCategoryFilter;
    const matchSearch = !questionFilter || q.question.toLowerCase().includes(questionFilter.toLowerCase()) || q.id.toLowerCase().includes(questionFilter.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleDelete = (id) => {
    setConfirmDelete(null);
    dispatch({ type: 'DELETE_QUESTION', payload: id });
  };

  return (
    <div className="space-y-5">
      <QuestionModal />

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f0f20] border border-red-500/30 rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="text-white font-bold text-lg mb-2">Delete Question?</h3>
            <p className="text-gray-400 text-sm mb-5">ID: <span className="text-white font-mono">{confirmDelete}</span><br />This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-medium hover:bg-white/10">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-white font-black text-xl">Question Bank</h2>
          <p className="text-gray-500 text-sm">{filtered.length} of {questions.length} questions</p>
        </div>
        <button
          onClick={() => dispatch({ type: 'OPEN_NEW_QUESTION' })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:opacity-90 transition-all shrink-0"
          style={{ boxShadow: '0 0 15px rgba(99,102,241,0.4)' }}
        >
          <Plus className="w-4 h-4" /> Add Question
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={questionFilter}
            onChange={e => dispatch({ type: 'SET_Q_FILTER', payload: e.target.value })}
            placeholder="Search questions or IDs..."
            className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 rounded-xl pl-11 pr-4 py-2.5 text-white text-sm outline-none transition-colors"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <select
            value={questionCategoryFilter}
            onChange={e => dispatch({ type: 'SET_Q_CAT_FILTER', payload: e.target.value })}
            className="bg-[#1a1a30] border border-white/10 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm outline-none appearance-none"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Questions table */}
      <div className="glass rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">Question</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Correct</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-600 py-10">No questions found</td></tr>
              )}
              {filtered.map((q, i) => (
                <tr key={q.id} className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                  <td className="px-4 py-3">
                    <span className="font-mono text-indigo-400 text-xs bg-indigo-500/10 px-2 py-0.5 rounded-lg">{q.id}</span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-white text-sm truncate">{q.question}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-400">{q.category}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span className="text-green-400 font-bold text-xs">{q.correct}</span>
                      <span className="text-gray-500 text-xs truncate max-w-[120px]">— {q.options[q.correct]}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => dispatch({ type: 'OPEN_EDIT_QUESTION', payload: q })}
                        className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(q.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
